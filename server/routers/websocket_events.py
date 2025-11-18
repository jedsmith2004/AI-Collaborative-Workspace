import json
from datetime import datetime

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

_pending_save_tasks: dict[int, asyncio.Task] = {}
_latest_note_contents: dict[int, dict] = {}
_save_lock = asyncio.Lock()
_user_rooms: dict[str, str] = {}

def _serialise_note_db(note:Note):
    return {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "workspace_id": note.workspace_id,
        "created_at": note.created_at.isoformat() if note.created_at else None,
        "updated_at": note.updated_at.isoformat() if note.updated_at else None,
    }

async def _debounced_save(note_id: int, workspace_room: str, delay: float = 1.0):
    try:
        await asyncio.sleep(delay)
        async with asyncio.Lock():
            payload = _latest_note_contents.get(note_id)
            if not payload:
                return
            with SessionLocal() as db:
                note = db.query(Note).filter(Note.id == note_id, Note.workspace_id == _coerce_workspace_id(payload.get("workspace_id"))).first()
                if not note:
                    return
                if "content" in payload and payload["content"] is not None:
                    note.content = payload["content"]
                if "title" in payload and payload["title"] is not None:
                    note.title = payload["title"]
                db.commit()
                db.refresh(note)

                await sio.emit("note_updated", _serialise_note_db(note), room=workspace_room)
    except asyncio.CancelledError:
        return
    finally:
        _pending_save_tasks.pop(note_id, None)
        _latest_note_contents.pop(note_id, None)


def _coerce_workspace_id(raw_id):
    if raw_id is None:
        return None
    try:
        return int(raw_id)
    except (TypeError, ValueError):
        return None

# EVENTS

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

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

    numeric_workspace_id = _coerce_workspace_id(workspace_id)
    if numeric_workspace_id is None:
        return

    workspace_room = str(workspace_id)
    await sio.enter_room(sid, workspace_room)
    _user_rooms[sid] = workspace_room
    print(f"User {sid} joined workspace {workspace_room}")

    # send workspace notes to the new user
    with SessionLocal() as db:
        notes = (
            db.query(Note)
            .filter(Note.workspace_id == numeric_workspace_id)
            .order_by(Note.updated_at.desc())
            .all()
        )
        note_list = [
            {
                "id": note.id,
                "title": note.title,
                "content": note.content,
                "workspace_id": note.workspace_id,
                "created_at": note.created_at.isoformat(),
                "updated_at": note.updated_at.isoformat()
            }
            for note in notes
        ]

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

    numeric_workspace_id = _coerce_workspace_id(workspace_id)
    if numeric_workspace_id is None:
        return
    workspace_room = str(workspace_id)

    # save to db
    with SessionLocal() as db:
        note = Note(title=title, content=content, workspace_id=numeric_workspace_id)
        db.add(note)
        db.commit()
        db.refresh(note)
    
    note_data = {
        "id": note.id,
        "title": note.title,
        "content": note.content,
        "workspace_id": note.workspace_id,
        "created_at": note.created_at.isoformat(),
        "updated_at": note.updated_at.isoformat()
    }
    
    # broadcast to all users in workspace
    await sio.emit("note_created", note_data, to=workspace_room)

@sio.event
async def update_note(sid, data):
    workspace_id = data.get("workspace_id")
    note_id = data.get("note_id")
    title = data.get("title")
    content = data.get("content")

    numeric_workspace_id = _coerce_workspace_id(workspace_id)
    if numeric_workspace_id is None or not note_id:
        return
    workspace_room = str(workspace_id)

    # update db
    with SessionLocal() as db:
        note = db.query(Note).filter(Note.id == note_id, Note.workspace_id == numeric_workspace_id).first()
        if note:
            if title is not None:
                note.title = title
            if content is not None:
                note.content = content
            db.commit()
            db.refresh(note)

            note_data = {
                "id": note.id,
                "title": note.title,
                "content": note.content,
                "workspace_id": note.workspace_id,
                "updated_at": note.updated_at.isoformat()
            }

            # broadcast to all users in workspace
            await sio.emit("note_updated", note_data, to=workspace_room)

@sio.event
async def delete_note(sid, data):
    workspace_id = data.get("workspace_id")
    note_id = data.get("note_id")

    numeric_workspace_id = _coerce_workspace_id(workspace_id)
    if numeric_workspace_id is None or not note_id:
        return
    workspace_room = str(workspace_id)

    # Delete from db
    with SessionLocal() as db:
        note = db.query(Note).filter(Note.id == note_id, Note.workspace_id == numeric_workspace_id).first()
        if note:
            db.delete(note)
            db.commit()

            # broadcast to all users in workspace
            await sio.emit("note_deleted", {"id": note_id}, to=workspace_room)

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

    numeric_workspace_id = _coerce_workspace_id(workspace_id_raw)
    if note_id is None or numeric_workspace_id is None:
        return

    workspace_room = str(workspace_id_raw)

    # broadcast live update to everyone else
    await sio.emit(
        "note_live_update",
        {"note_id": note_id, "content": content, "title": title, "sid": sid},
        room=workspace_room,
        skip_sid=sid,
    )

    # store latest content
    _latest_note_contents[note_id] = {
        "content": content,
        "title": title,
        "workspace_id": workspace_id_raw,
    }

    # cancel existing pending save and schedule a new one
    task = _pending_save_tasks.get(note_id)
    if task and not task.done():
        task.cancel()
    _pending_save_tasks[note_id] = asyncio.create_task(_debounced_save(note_id, workspace_room, delay=1.0))

@sio.event
async def cursor_update(sid, data):
    note_id = data.get("note_id")
    workspace_id_raw = data.get("workspace_id")
    cursor = data.get("cursor")
    selection = data.get("selection", None)

    numeric_workspace_id = _coerce_workspace_id(workspace_id_raw)
    if note_id is None or numeric_workspace_id is None:
        return

    workspace_room = str(workspace_id_raw)

    await sio.emit(
        "cursor_update",
        {"sid": sid, "note_id": note_id, "cursor": cursor, "selection": selection},
        room=workspace_room,
        skip_sid=sid,
    )