from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from services.db import get_db, engine, Base
from models.note import Note
from models.workspace import Workspace
from models import user, workspace, note
from routers.websocket_events import sio

import socketio
from pydantic import BaseModel

from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ChatRequest(BaseModel):
    message: str
    workspace_id: int
    conversation_history: list[dict] = []

@app.post("/ai/chat")
def ai_chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant helping users collaborate on notes and documents."}
        ]
        
        messages.extend(request.conversation_history)
        
        messages.append({"role": "user", "content": request.message})
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=1000,
            temperature=0.7
        )
        
        assistant_message = response.choices[0].message.content
        
        return {
            "message": assistant_message,
            "model": "gpt-4o-mini",
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI chat error: {str(e)}")


@app.get("/ping")
def ping():
    return {"message": "pong"}


def serialize_workspace(item: Workspace):
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_note(item: Note):
    return {
        "id": item.id,
        "title": item.title,
        "content": item.content,
        "workspace_id": item.workspace_id,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@app.get("/workspaces/")
def list_workspaces(db: Session = Depends(get_db)):
    workspaces = db.query(Workspace).order_by(Workspace.created_at.desc()).all()
    return [serialize_workspace(ws) for ws in workspaces]


class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = ""


@app.post("/workspaces/")
def create_workspace(payload: WorkspaceCreate, db: Session = Depends(get_db)):
    workspace = Workspace(name=payload.name, description=payload.description or "")
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return serialize_workspace(workspace)


@app.get("/workspaces/{workspace_id}")
def get_workspace_detail(workspace_id: int, db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return serialize_workspace(workspace)


@app.get("/workspaces/{workspace_id}/notes/")
def list_workspace_notes(workspace_id: int, db: Session = Depends(get_db)):
    notes = (
        db.query(Note)
        .filter(Note.workspace_id == workspace_id)
        .order_by(Note.updated_at.desc())
        .all()
    )
    return [serialize_note(note) for note in notes]

@app.post("/notes/")
def create_note(title: str, content: str, db: Session = Depends(get_db)):
    note = Note(title=title, content=content)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@app.delete("/notes/")
def delete_note(id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == id).first()
    db.delete(note)
    db.commit()

@app.get("/notes/")
def list_notes(db: Session = Depends(get_db)):
    return db.query(Note).all()

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)