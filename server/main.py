from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from services.db import get_db, engine, Base
from services.rag_service import retrieve_relevant_notes, build_rag_context
from models.note import Note
from models.workspace import Workspace
from models import user, workspace, note
from routers.websocket_events import sio

import socketio
from pydantic import BaseModel

from openai import OpenAI
import os
from dotenv import load_dotenv
from re import finditer

load_dotenv()

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Could not create database tables on startup: {e}")

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
    use_rag: bool = True

def extract_citations(message, relevant_notes):
    citation_pattern = r'\[Doc:\s*"([^"]+)"\]'
    matches = finditer(citation_pattern, message)

    title_to_note = {note["title"]: note["note_id"] for note in relevant_notes}

    citations = []
    for match in matches:
        cited_title = match.group(1)
        note_id = None
        for note_title, nid in title_to_note.items():
            if cited_title.lower() in note_title.lower() or note_title.lower() in cited_title.lower():
                note_id = nid
                break
        if note_id:
            citations.append({
                "note_id": note_id,
                "title": cited_title,
                "position": match.start(),
                "match_text": match.group(0)
            })

    return citations

@app.post("/ai/chat")
def ai_chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        relevant_notes = []
        rag_context = ""
        use_documents = False

        if request.use_rag:
            relevant_notes = retrieve_relevant_notes(
                query=request.message,
                workspace_id=request.workspace_id,
                db=db,
                top_n=3
            )
            if relevant_notes and relevant_notes[0]["similarity"] > 0.15:
                rag_context = build_rag_context(relevant_notes)
                use_documents = True
        
        system_prompt = """
        You are an assistant that helps users work with their notes and documents in this workspace.

        You should:
        - Answer general questions using your own knowledge.
        - When a question is about the user’s documents, use the provided document context.
        - Keep answers concise, clear, and helpful.

        Formatting (Markdown):
        - Use **bold** for important terms or headings.
        - Use *italics* for subtle emphasis or titles.
        - Use `code` for inline code, variables, or technical identifiers.
        - Use bullet lists (- item) for unordered lists.
        - Use numbered lists (1. item) when order matters.
        - Use > for short callouts or quotes.
        """

        if use_documents and rag_context:
            system_prompt += f"""

            The following documents may be relevant to the user’s question:

            {rag_context}

            When you use information from these documents, follow these rules for citations:

            1. Citation format
            - Whenever you rely on a specific document, include a citation in this exact format:
                [Doc: "Document Title"]

            2. What requires a citation
            You must add a citation whenever you:
            - Quote text from a document.
            - Paraphrase or summarize its content.
            - List data taken from it (numbers, bullet points, etc.).
            - Analyse data that comes from it (e.g. means, ranges, trends).
            - Refer to the document by name (e.g. “Big Numbers”, “Who am I?”).
            - Describe what the document contains or shows.

            3. Where to place the citation
            - Prefer to introduce the document first, then describe its content.
            - Good pattern: [Doc: "Who am I?"] includes the statement "Hello, I am Shakespeare, that is a big name."
            - Good pattern: According to [Doc: "Meeting Notes"], the meeting is on Tuesday.
            - Good pattern: [Doc: "Big Numbers"] contains the numbers 2, 9, 1, 7, 5, ...
            - Avoid putting the citation as an afterthought at the very end of a sentence.

            4. Multiple citations
            - You can and should cite the same document more than once if you refer to it multiple times.
            - If you are describing data or analysis that clearly comes from one document, keep citing that document as needed so the source is obvious.

            5. General vs. document‑based answers
            - If the user’s question is general knowledge (not about their documents), answer normally and do not mention the documents.
            - If the question is clearly about the contents of the workspace (e.g. “Do I have any documents that mention Shakespeare?”, “What numbers appear in my files?”), base your answer on the documents above and use citations.

            Examples:

            - User: Do I have any documents that mention Shakespeare?
            Assistant: Yes, you do. [Doc: "Who am I?"] includes the statement "Hello, I am Shakespeare, that is a big name."

            - User: I have two files with numbers in them, find the files, list the numbers and then do statistical analysis.
            Assistant:
            - You have two documents with numbers:
                - [Doc: "Big Numbers"] contains 2, 9, 1, 7, 5, 10, 9, 7, 8, 9, 10, 9.
                - [Doc: "Really big numbers"] contains 18, 19, 36, 124, 9, 9, 4, 5, 4, 6.
            - [Doc: "Big Numbers"] has a mean of …
            - [Doc: "Really big numbers"] has a mean of …

            If you are unsure whether something comes from a document or not, either check the context carefully or say you are not certain, rather than guessing.
            """
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        messages.extend(request.conversation_history)
        
        messages.append({"role": "user", "content": request.message})
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=1000,
            temperature=0.3
        )
        
        assistant_message = response.choices[0].message.content
        print(assistant_message)

        citations = extract_citations(assistant_message, relevant_notes)
        print(citations)
        
        source_data = [
            {
                "note_id": note["note_id"],
                "title": note["title"],
                "content": note["content"][:200],
                "similarity": note["similarity"],
                "created_at": note.get("created_at")
            }
            for note in relevant_notes
        ] if relevant_notes else []
        
        return {
            "message": assistant_message,
            "model": "gpt-4o-mini",
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            "sources": source_data,
            "citations": citations
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

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)