import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  owner_id?: string;
  is_shared?: boolean;
  created_at: string;
  updated_at?: string;
  note_count?: number;
  member_count?: number;
  role?: 'owner' | 'editor' | 'viewer' | 'none';
}

function authHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export async function getWorkspaces(token: string, includeStats: boolean = false): Promise<Workspace[]> {
  const params = includeStats ? '?include_stats=true' : '';
  const res = await axios.get(`${API_URL}/workspaces/${params}`, authHeaders(token));
  return res.data;
}

export async function createWorkspace(name: string, description = "", token: string): Promise<Workspace> {
  const res = await axios.post(`${API_URL}/workspaces/`, { name, description }, authHeaders(token));
  return res.data;
}

export async function getWorkspace(workspaceId: string, token: string): Promise<Workspace> {
  const res = await axios.get(`${API_URL}/workspaces/${workspaceId}`, authHeaders(token));
  return res.data;
}

export async function deleteWorkspace(workspaceId: string, token: string): Promise<void> {
  await axios.delete(`${API_URL}/workspaces/${workspaceId}`, authHeaders(token));
}
