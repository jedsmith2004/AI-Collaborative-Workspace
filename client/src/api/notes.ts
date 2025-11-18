import axios from "axios";

const API_URL = "http://localhost:8000";

export async function getNotes() {
  const res = await axios.get(`${API_URL}/notes/`);
  return res.data;
}

export async function createNote(title: string, content: string) {
  const res = await axios.post(`${API_URL}/notes/`, null, {
    params: { title, content },
  });
  return res.data;
}

export async function deleteNote(id: number) {
    const res = await axios.delete(`${API_URL}/notes`, {
        params: { id }
    });
    return res.data;
}