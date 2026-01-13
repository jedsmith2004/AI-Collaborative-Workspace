import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export interface Note {
  id: number;
  title: string;
  content: string;
  workspace_id: string;
  author_id?: string;
  created_at: string;
  updated_at: string;
  // File attachment fields
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  is_document?: boolean;
}

function authHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export async function getWorkspaceNotes(workspaceId: string, token: string): Promise<Note[]> {
  const res = await axios.get(`${API_URL}/workspaces/${workspaceId}/notes/`, authHeaders(token));
  return res.data;
}

export async function createNote(workspaceId: string, title: string, content: string, token: string): Promise<Note> {
  const res = await axios.post(
    `${API_URL}/workspaces/${workspaceId}/notes/`,
    { title, content },
    authHeaders(token)
  );
  return res.data;
}

export async function getNote(noteId: string, token: string): Promise<Note> {
  const res = await axios.get(`${API_URL}/notes/${noteId}`, authHeaders(token));
  return res.data;
}

export async function updateNote(noteId: string, title: string, content: string, token: string): Promise<Note> {
  const res = await axios.put(
    `${API_URL}/notes/${noteId}`,
    { title, content },
    authHeaders(token)
  );
  return res.data;
}

export async function deleteNote(noteId: string, token: string): Promise<void> {
  await axios.delete(`${API_URL}/notes/${noteId}`, authHeaders(token));
}

export interface UploadResult {
  id: string;
  title: string;
  content: string;
  filename: string;
  message: string;
}

export interface MultiUploadResult {
  uploaded: Array<{ id: string; title: string; filename: string }>;
  errors: Array<{ filename: string; error: string }>;
  message: string;
}

export async function uploadFile(workspaceId: string, file: File, token: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await axios.post(
    `${API_URL}/workspaces/${workspaceId}/upload`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return res.data;
}

export async function uploadMultipleFiles(workspaceId: string, files: File[], token: string): Promise<MultiUploadResult> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  
  const res = await axios.post(
    `${API_URL}/workspaces/${workspaceId}/upload-multiple`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return res.data;
}