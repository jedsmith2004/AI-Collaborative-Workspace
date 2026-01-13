import { io, Socket } from 'socket.io-client';

interface Note {
  id: string;
  title: string;
  content: string;
  workspace_id?: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  sid: string | null;
  content: string;
  timestamp?: string | null;
  user_name?: string;
  user_id?: number;
}

interface CursorPayload {
  start: number;
  end: number;
}

class SocketService {
  private socket: Socket | null = null;
  private workspaceId: string | null = null;
  private token: string | null = null;

  connect(url?: string, token?: string) {
    if (this.socket) {
      // If reconnecting with a new token, disconnect first
      if (token && this.token !== token) {
        this.disconnect();
      } else {
        return this.socket;
      }
    }

    this.token = token || null;
    const backendUrl = url || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

    this.socket = io(backendUrl, {
      transports: ['websocket'],
      autoConnect: true,
      auth: token ? { token } : undefined,
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('auth_error', (data) => {
      console.error('Socket authentication error:', data.message);
    });

    return this.socket;
  }

  joinWorkspace(workspaceId: string) {
    this.workspaceId = workspaceId;
    this.socket?.emit('join_room', { workspace_id: workspaceId });
  }

  createNote(title: string, content: string) {
    if (!this.workspaceId) return;
    this.socket?.emit('create_note', {
      workspace_id: this.workspaceId,
      title,
      content
    });
  }

  updateNote(noteId: string, title?: string, content?: string) {
    if (!this.workspaceId) return;
    this.socket?.emit('update_note', {
      workspace_id: this.workspaceId,
      note_id: noteId,
      title,
      content
    });
  }

  deleteNote(noteId: string) {
    if (!this.workspaceId) return;
    this.socket?.emit('delete_note', {
      workspace_id: this.workspaceId,
      note_id: noteId
    });
  }

  liveUpdate(noteId: string, content: string, title?: string) {
    if (!this.workspaceId) return;
    this.socket?.emit("note_live_update", {
      note_id: noteId,
      workspace_id: this.workspaceId,
      content,
      title
    });
  }

  sendCursorUpdate(noteId: string, cursor: CursorPayload, selection?: any) {
    if (!this.workspaceId) return;
    this.socket?.emit("cursor_update", {
      note_id: noteId,
      workspace_id: this.workspaceId,
      cursor,
      selection
    });
  }

  onNotesList(callback: (notes: Note[]) => void) {
    const handler = (data: { notes: Note[] }) => callback(data.notes);
    this.socket?.on('notes_list', handler);
    return () => this.socket?.off('notes_list', handler);
  }

  onNoteCreated(callback: (note: Note) => void) {
    this.socket?.on('note_created', callback);
    return () => this.socket?.off('note_created', callback);
  }

  onNoteLiveUpdate(callback: (data: { note_id: string; content: string; title?: string; sid?: string }) => void) {
    this.socket?.on("note_live_update", callback);
  }

  onNoteUpdated(callback: (note: Note) => void) {
    this.socket?.on('note_updated', callback);
    return () => this.socket?.off('note_updated', callback);
  }

  onCursorUpdate(cb: (data: { sid: string; note_id: string; cursor: CursorPayload; selection?: any }) => void) {
    this.socket?.on("cursor_update", cb);
  }

  onUserDisconnected(callback: (data: { sid: string }) => void) {
    this.socket?.on("user_disconnected", callback);
    return () => this.socket?.off("user_disconnected", callback);
  }

  onNoteDeleted(callback: (data: { id: string }) => void) {
    this.socket?.on('note_deleted', callback);
    return () => this.socket?.off('note_deleted', callback);
  }

  onChatHistory(callback: (messages: ChatMessage[]) => void) {
    const handler = (data: { messages: ChatMessage[] }) => callback(data.messages);
    this.socket?.on('chat_history', handler);
    return () => this.socket?.off('chat_history', handler);
  }

  onNewMessage(callback: (message: ChatMessage) => void) {
    this.socket?.on('new_message', callback);
    return () => this.socket?.off('new_message', callback);
  }

  sendMessage(content: string) {
    if (!this.workspaceId || !content.trim()) return;
    this.socket?.emit('message', {
      workspace_id: this.workspaceId,
      content: content.trim(),
    });
  }

  getSocketId() {
    return this.socket?.id ?? null;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.workspaceId = null;
      this.token = null;
    }
  }

  setToken(token: string | null) {
    this.token = token;
  }
}

export const socketService = new SocketService();
export type { Note, ChatMessage };