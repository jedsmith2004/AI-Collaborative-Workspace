import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface Invitation {
  id: number;
  workspace_id: string;
  workspace_name: string;
  invited_by: string;
  permission_level: number;
  invited_at: string;
}

export interface DashboardStats {
  workspace_count: number;
  note_count: number;
  collaborator_count: number;
  pending_invitations: number;
}

export interface Collaborator {
  id: number;
  user_id: string;
  user_name: string;
  user_email: string;
  profile_picture_url: string | null;
  permission_level: number;
  is_owner: boolean;
  invited_at: string | null;
  accepted_at: string | null;
}

function authHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

// Dashboard
export async function getDashboardStats(token: string): Promise<DashboardStats> {
  const res = await axios.get(`${API_URL}/dashboard/stats`, authHeaders(token));
  return res.data;
}

// Invitations
export async function getInvitations(token: string): Promise<Invitation[]> {
  const res = await axios.get(`${API_URL}/auth/invitations`, authHeaders(token));
  return res.data;
}

export async function acceptInvitation(invitationId: number, token: string): Promise<void> {
  await axios.post(`${API_URL}/auth/invitations/${invitationId}/accept`, {}, authHeaders(token));
}

export async function declineInvitation(invitationId: number, token: string): Promise<void> {
  await axios.post(`${API_URL}/auth/invitations/${invitationId}/decline`, {}, authHeaders(token));
}

// Collaborators
export async function getCollaborators(workspaceId: string, token: string): Promise<Collaborator[]> {
  const res = await axios.get(`${API_URL}/workspaces/${workspaceId}/collaborators`, authHeaders(token));
  return res.data;
}

export async function inviteCollaborator(
  workspaceId: string, 
  email: string, 
  permissionLevel: number,
  token: string
): Promise<void> {
  await axios.post(
    `${API_URL}/workspaces/${workspaceId}/collaborators/invite`,
    { email, permission_level: permissionLevel },
    authHeaders(token)
  );
}

export async function updateCollaboratorPermission(
  workspaceId: string,
  userId: string,
  permissionLevel: number,
  token: string
): Promise<void> {
  await axios.put(
    `${API_URL}/workspaces/${workspaceId}/collaborators/${userId}`,
    { permission_level: permissionLevel },
    authHeaders(token)
  );
}

export async function removeCollaborator(
  workspaceId: string,
  userId: string,
  token: string
): Promise<void> {
  await axios.delete(
    `${API_URL}/workspaces/${workspaceId}/collaborators/${userId}`,
    authHeaders(token)
  );
}
