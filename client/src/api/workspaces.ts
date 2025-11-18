import axios from "axios";

const API_URL = "http://localhost:8000";

export interface Workspace {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const res = await axios.get(`${API_URL}/workspaces/`);
  return res.data;
}

export async function createWorkspace(name: string, description = ""): Promise<Workspace> {
  const res = await axios.post(`${API_URL}/workspaces/`, { name, description });
  return res.data;
}

export async function getWorkspace(workspaceId: number): Promise<Workspace> {
  const res = await axios.get(`${API_URL}/workspaces/${workspaceId}`);
  return res.data;
}
