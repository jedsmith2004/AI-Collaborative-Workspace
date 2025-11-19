from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict
from sqlalchemy.orm import Session
from models.note import Note

embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

def get_note_embedding(text):
    return embedding_model.encode(text, convert_to_numpy=True)

def cosine_sim(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# using a vsm IR model w/ neural embeddings
def retrieve_relevant_notes(
    query,
    workspace_id,
    db,
    top_n = 3
):
    notes = db.query(Note).filter(Note.workspace_id == workspace_id).all()

    if not notes:
        return []
    
    query_embedding = get_note_embedding(query)

    results = []
    for note in notes:
        note_text = f"{note.title}\n\n{note.content}"

        if not note_text.strip():
            continue

        note_embedding = get_note_embedding(note_text)

        similarity = cosine_sim(query_embedding, note_embedding)

        results.append({
            "note_id": note.id,
            "title": note.title,
            "content": note.content,
            "similarity": float(similarity),
            "created_at": note.created_at.isoformat() if note.created_at else None
        })

    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:top_n]

def build_rag_context(relevant_notes):
    if not relevant_notes:
        return ""
    context_parts = ["Here are the most relevant documents from the workspace:\n"]

    for i, note in enumerate(relevant_notes, 1):
        context_parts.append(f"\n--- Title: \"{note['title']}\" (ID: {note['note_id']}, relevance: {note['similarity']:.2f}) ---")

        content = note['content'][:500]
        context_parts.append(content)
        if len(note['content']) > 500:
            context_parts.append("...[truncated]")

    return "\n".join(context_parts)