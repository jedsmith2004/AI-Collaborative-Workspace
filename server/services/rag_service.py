import numpy as np
import threading
from typing import List, Dict
from sqlalchemy.orm import Session
from models.note import Note

# Lazy loading for the embedding model AND imports
_embedding_model = None
_SentenceTransformer = None
_model_loading = False
_model_lock = threading.Lock()

def get_embedding_model():
    """Lazily load the embedding model (and heavy imports)"""
    global _embedding_model, _SentenceTransformer, _model_loading
    
    # Fast path - model already loaded
    if _embedding_model is not None:
        return _embedding_model
    
    with _model_lock:
        # Double-check after acquiring lock
        if _embedding_model is None:
            print("Loading sentence-transformers model... (this may take a moment)", flush=True)
            # Lazy import to avoid slow startup
            from sentence_transformers import SentenceTransformer
            _SentenceTransformer = SentenceTransformer
            _embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            print("Model loaded successfully!", flush=True)
    return _embedding_model


def preload_model_async():
    """Start loading the model in a background thread.
    Call this after server startup for faster first AI query."""
    def _load():
        try:
            get_embedding_model()
        except Exception as e:
            print(f"Background model loading failed: {e}", flush=True)
    
    thread = threading.Thread(target=_load, daemon=True)
    thread.start()
    print("Started background model preloading...", flush=True)

def get_note_embedding(text):
    model = get_embedding_model()
    return model.encode(text, convert_to_numpy=True)

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