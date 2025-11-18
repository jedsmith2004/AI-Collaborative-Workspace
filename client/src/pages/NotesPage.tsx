import { useEffect, useState } from "react";
import { getNotes, createNote, deleteNote } from "../api/notes";

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    const data = await getNotes();
    setNotes(data);
  }

  function getDate(date:string) {
    const formattedDate = new Date(date);
    return formattedDate;
  }

  async function handleAddNote() {
    if (!title || !content) return;
    await createNote(title, content);
    setTitle("");
    setContent("");
    loadNotes();
  }

  async function handleDeleteNote(id:number) {
    if (!id) return;
    await deleteNote(id);
    setNotes(notes.filter((a) => a.id != id));
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Notes</h1>

      <div className="mb-6 space-y-2">
        <input
          className="w-full border p-2 rounded"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border p-2 rounded"
          placeholder="Write your note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleAddNote}
        >
          Add Note
        </button>
      </div>

      <ul className="space-y-4">
        {notes.sort((a, b) => (getDate(a.created_at) > getDate(b.created_at)) ? -1 : 1).map((n) => (
          <li
            key={n.id}
            className="flex justify-between border rounded p-4 bg-white shadow-sm hover:shadow-md transition"
          >
            <div>
                <h2 className="text-gray-700 font-semibold text-lg">{n.title}</h2>
                <p className="text-gray-700 mt-2">{n.content}</p>
                <p className="text-gray-700 mt-2">{getDate(n.created_at).toLocaleDateString()}</p>
            </div>
            <div>
                <button 
                    className="text-black bg-transparent text-xl font-semibold p-1"
                    onClick={() => handleDeleteNote(n.id)}
                >
                    ✕
                </button>
            </div>            
            
          </li>
        ))}
      </ul>
    </div>
  );
}
