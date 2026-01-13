import json
import uuid
from datetime import datetime
from typing import Optional, Union

import asyncio
import socketio
from services.redis_manager import get_redis_connection
from services.db import SessionLocal
from models.note import Note

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

redis = get_redis_connection()

pending_saves = {}
unsaved_changes = {}
_user_rooms: dict[str, str] = {}

def _serialise_note_db(note: Note):
    return {
        "id": str(note.id) if note.id else None,
        "title": note.title,
        "content": note.content,
        "workspace_id": str(note.workspace_id) if note.workspace_id else None,
        "created_at": note.created_at.isoformat() if note.created_at else None,
        "updated_at": note.updated_at.isoformat() if note.updated_at else None,
    }

def _coerce_note_id(raw_id) -> Optional[uuid.UUID]:
    """Convert note_id to UUID. Note IDs are now UUIDs, not integers."""
    if raw_id is None:
        return None
    if isinstance(raw_id, uuid.UUID):
        return raw_id
    try:
        return uuid.UUID(str(raw_id))
    except (TypeError, ValueError):
        return None

async def _debounced_save(note_id: uuid.UUID, workspace_room: str, delay: float = 1.0, initiating_sid: Optional[str] = None):
    note_id_str = str(note_id)
    print(f"_debounced_save started for note {note_id_str[:8]}..., delay={delay}s")
    was_cancelled = False
    try:
        await asyncio.sleep(delay)
        payload = unsaved_changes.get(note_id_str)
        if not payload:
            print(f"  No unsaved changes found for {note_id_str[:8]}...")
            return

        print(f"  Saving note {note_id_str[:8]}... content_len={len(payload.get('content', ''))}")
        with SessionLocal() as db:
            note = db.query(Note).filter(
                Note.id == note_id,
                Note.workspace_id == _coerce_workspace_id(payload.get("workspace_id"))
            ).first()

            if not note:
                print(f"  Note not found in database!")
                return

            if "content" in payload and payload["content"] is not None:
                note.content = payload["content"]
            if "title" in payload and payload["title"] is not None:
                note.title = payload["title"]

            db.commit()
            db.refresh(note)
            print(f"  Note saved successfully!")
            await sio.emit("note_updated", _serialise_note_db(note), room=workspace_room, skip_sid=initiating_sid)

    except asyncio.CancelledError:
        print(f"  Save cancelled for note {note_id_str[:8]}...")
        was_cancelled = True
        raise  # Re-raise to properly handle cancellation
    finally:
        # Only clean up if NOT cancelled - cancelled tasks should leave data for the next save
        if not was_cancelled:
            pending_saves.pop(note_id_str, None)
            unsaved_changes.pop(note_id_str, None)


def _coerce_workspace_id(raw_id) -> Optional[uuid.UUID]:
    """Convert workspace_id to UUID. Workspace IDs are now UUIDs, not integers."""
    if raw_id is None:
        return None
    if isinstance(raw_id, uuid.UUID):
        return raw_id
    try:
        return uuid.UUID(str(raw_id))
    except (TypeError, ValueError):
        return None

# EVENTS

@sio.event
async def connect(sid, environ, auth=None):
    print(f"Client connected: {sid}")
    if auth:
        print(f"  Auth token provided: {bool(auth.get('token'))}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    workspace_room = _user_rooms.pop(sid, None)
    if workspace_room:
        await sio.emit("user_disconnected", {"sid": sid}, room=workspace_room, skip_sid=sid)
        print(f"Notified workspace {workspace_room} about {sid} disconnection")

@sio.event
async def join_room(sid, data):
    workspace_id = data.get("workspace_id")
    if workspace_id is None:
        return

    uuid_workspace_id = _coerce_workspace_id(workspace_id)
    if uuid_workspace_id is None:
        print(f"Invalid workspace_id format: {workspace_id}")
        return

    workspace_room = str(workspace_id)
    await sio.enter_room(sid, workspace_room)
    _user_rooms[sid] = workspace_room
    print(f"User {sid} joined workspace {workspace_room}")

    # send workspace notes to the new user
    with SessionLocal() as db:
        notes = (
            db.query(Note)
            .filter(Note.workspace_id == uuid_workspace_id)
            .order_by(Note.updated_at.desc())
            .all()
        )
        note_list = [_serialise_note_db(note) for note in notes]

    await sio.emit("notes_list", {"notes": note_list}, to=sid)

    # send recent chat history
    history = []
    if redis:
        history_key = f"workspace:{workspace_room}:messages"
        raw_history = redis.lrange(history_key, 0, 49)
        for entry in reversed(raw_history):  # oldest first
            try:
                history.append(json.loads(entry))
            except (TypeError, json.JSONDecodeError):
                history.append({"sid": None, "content": entry, "timestamp": None})

    if history:
        await sio.emit("chat_history", {"messages": history}, to=sid)

    await sio.emit("user_joined", {"sid": sid}, to=workspace_room)

@sio.event
async def create_note(sid, data):
    workspace_id = data.get("workspace_id")
    title = data.get("title", "Untitled")
    content = data.get("content", "")

    uuid_workspace_id = _coerce_workspace_id(workspace_id)
    if uuid_workspace_id is None:
        return
    workspace_room = str(workspace_id)

    # save to db
    with SessionLocal() as db:
        note = Note(title=title, content=content, workspace_id=uuid_workspace_id)
        db.add(note)
        db.commit()
        db.refresh(note)
    
    note_data = _serialise_note_db(note)
    
    # broadcast to all users in workspace
    await sio.emit("note_created", note_data, to=workspace_room)

@sio.event
async def update_note(sid, data):
    workspace_id = data.get("workspace_id")
    note_id = data.get("note_id")
    title = data.get("title")
    content = data.get("content")

    uuid_workspace_id = _coerce_workspace_id(workspace_id)
    uuid_note_id = _coerce_note_id(note_id)
    if uuid_workspace_id is None or uuid_note_id is None:
        return
    workspace_room = str(workspace_id)

    # update db
    with SessionLocal() as db:
        note = db.query(Note).filter(Note.id == uuid_note_id, Note.workspace_id == uuid_workspace_id).first()
        if note:
            if title is not None:
                note.title = title
            if content is not None:
                note.content = content
            db.commit()
            db.refresh(note)

            note_data = _serialise_note_db(note)

            # broadcast to all users in workspace
            await sio.emit("note_updated", note_data, to=workspace_room)

@sio.event
async def delete_note(sid, data):
    workspace_id = data.get("workspace_id")
    note_id = data.get("note_id")

    uuid_workspace_id = _coerce_workspace_id(workspace_id)
    uuid_note_id = _coerce_note_id(note_id)
    if uuid_workspace_id is None or uuid_note_id is None:
        return
    workspace_room = str(workspace_id)

    # Delete from db
    with SessionLocal() as db:
        note = db.query(Note).filter(Note.id == uuid_note_id, Note.workspace_id == uuid_workspace_id).first()
        if note:
            db.delete(note)
            db.commit()

            # broadcast to all users in workspace
            await sio.emit("note_deleted", {"id": str(uuid_note_id)}, to=workspace_room)

@sio.event
async def message(sid, data):
    workspace_id = data.get("workspace_id")
    content = data.get("content")

    if workspace_id is None or content is None:
        return

    workspace_room = str(workspace_id)
    payload = {
        "sid": sid,
        "content": content,
        "timestamp": datetime.utcnow().isoformat()
    }

    # temporary store
    if redis:
        history_key = f"workspace:{workspace_room}:messages"
        redis.lpush(history_key, json.dumps(payload))
        redis.ltrim(history_key, 0, 99)

    await sio.emit(
        "new_message",
        payload,
        to=workspace_room,
    )

@sio.event
async def note_live_update(sid, data):
    note_id = data.get("note_id")
    workspace_id_raw = data.get("workspace_id")
    content = data.get("content")
    title = data.get("title", None)

    print(f"note_live_update received: note_id={note_id}, workspace_id={workspace_id_raw}, content_len={len(content) if content else 0}")

    uuid_workspace_id = _coerce_workspace_id(workspace_id_raw)
    uuid_note_id = _coerce_note_id(note_id)
    if uuid_note_id is None or uuid_workspace_id is None:
        print(f"  Invalid IDs: uuid_workspace_id={uuid_workspace_id}, uuid_note_id={uuid_note_id}")
        return

    workspace_room = str(workspace_id_raw)

    # broadcast live update to everyone else
    await sio.emit(
        "note_live_update",
        {"note_id": str(uuid_note_id), "content": content, "title": title, "sid": sid},
        room=workspace_room,
        skip_sid=sid,
    )

    # store latest content
    unsaved_changes[str(uuid_note_id)] = {
        "content": content,
        "title": title,
        "workspace_id": workspace_id_raw,
    }

    # cancel existing pending save and schedule a new one
    task = pending_saves.get(str(uuid_note_id))
    if task and not task.done():
        task.cancel()
    pending_saves[str(uuid_note_id)] = asyncio.create_task(_debounced_save(uuid_note_id, workspace_room, delay=1.0, initiating_sid=sid))

@sio.event
async def cursor_update(sid, data):
    note_id = data.get("note_id")
    workspace_id_raw = data.get("workspace_id")
    cursor = data.get("cursor")
    selection = data.get("selection", None)

    uuid_workspace_id = _coerce_workspace_id(workspace_id_raw)
    if note_id is None or uuid_workspace_id is None:
        return

    workspace_room = str(workspace_id_raw)

    await sio.emit(
        "cursor_update",
        {"sid": sid, "note_id": note_id, "cursor": cursor, "selection": selection},
        room=workspace_room,
        skip_sid=sid,
    )