import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { socketService } from '../services/socket';
import type { ChatMessage, Note } from '../services/socket';
import type { Citation } from '../api/ai';
import { getWorkspace, type Workspace } from '../api/workspaces';
import { getCollaborators, type Collaborator } from '../api/auth';
import { sendAIMessage } from '../api/ai';
import { colorForSid, computeCaretCoordinates } from '../utils/cursorHelpers.ts';
import WorkspaceSidebar from '../components/Sidebar/WorkspaceSidebar';
import WorkspaceHeader from '../components/Layout/WorkspaceHeader';
import ChatPanel from '../components/Chat/ChatPanel';
import NoteEditor from '../components/Editor/NoteEditor';


export default function CollaborativeNotesPage() {
  const { workspaceId: workspaceParam } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  // Workspace IDs are now UUIDs (strings), not numbers
  const workspaceId = workspaceParam || null;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [socketId, setSocketId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'chat' | 'ai'>('chat');
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sources?: any[]; citations?: Citation[]; }>>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const typingRef = useRef(false);
  const selectedNoteIdRef = useRef<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);

  const [remoteCursors, setRemoteCursors] = useState<Record<string, {
    note_id: string;
    start: number;
    end: number;
    x: number;
    y: number;
    color: string;
  }>>({});

  useEffect(() => {
    selectedNoteIdRef.current = selectedNote?.id ?? null;
  }, [selectedNote]);

  // Connect
  useEffect(() => {
    if (!token) return;
    
    const socket = socketService.connect(undefined, token);
    const handleConnect = () => setSocketId(socketService.getSocketId());
    const handleDisconnect = () => setSocketId(null);

    socket?.on('connect', handleConnect);
    socket?.on('disconnect', handleDisconnect);

    if (socket?.connected) {
      handleConnect();
    }

    socketService.onNoteLiveUpdate((payload) => {
    const { note_id, content: liveContent, title: liveTitle, sid } = payload as any;
    if (sid === socketService.getSocketId()) return;
    setNotes((prev) => prev.map(n => n.id === note_id ? { ...n, content: liveContent, title: liveTitle ?? n.title } : n));
    if (selectedNoteIdRef.current === note_id && !typingRef.current) {
      setContent(liveContent);
      if (liveTitle !== undefined) setTitle(liveTitle);
    }
  });

  socketService.onCursorUpdate((payload) => {
    const { sid, note_id, cursor } = payload as any;
    if (!sid || note_id == null || !cursor) return;
    if (selectedNoteIdRef.current !== note_id) {
      setRemoteCursors(prev => ({ ...prev, [sid]: { ...(prev[sid] ?? { x:0,y:0,color:colorForSid(sid)}), note_id, start: cursor.start, end: cursor.end } }));
      return;
    }
    // compute caret position using mirror
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror) {
      setRemoteCursors(prev => ({ ...prev, [sid]: { ...(prev[sid] ?? { x:0,y:0,color:colorForSid(sid)}), note_id, start: cursor.start, end: cursor.end } }));
      return;
    }
    const coords = computeCaretCoordinates(textarea, mirror, cursor.start);
    console.log('Remote cursor update:', { sid: sid.slice(0, 6), note_id, cursor, coords });
    setRemoteCursors(prev => ({ ...prev, [sid]: { note_id, start: cursor.start, end: cursor.end, x: coords.left, y: coords.top, color: colorForSid(sid) } }));
  });

  socketService.onUserDisconnected((payload) => {
    const { sid } = payload;
    console.log('User disconnected:', sid);
    setRemoteCursors(prev => {
      const updated = { ...prev };
      delete updated[sid];
      return updated;
    });
  });

  return () => {
      socket?.off('connect', handleConnect);
      socket?.off('disconnect', handleDisconnect);
      socketService.disconnect();
    };
  }, [token]);

  const handleSendAiMessage = async () => {
    if (!aiInput.trim() || !workspaceId || !token) return;
    
    const userMessage = aiInput.trim();
    setAiInput('');
    
    // Add user message to UI immediately
    const newMessages = [...aiMessages, { role: 'user' as const, content: userMessage }];
    setAiMessages(newMessages);
    setIsAiLoading(true);

    try {
      const response = await sendAIMessage({
        message: userMessage,
        workspace_id: workspaceId,
        conversation_history: aiMessages.map(m => ({ role: m.role, content: m.content }))
      }, token);

      // Add AI response to messages
      setAiMessages([...newMessages, { role: 'assistant', content: response.message, sources: response.sources, citations: response.citations }]);
    } catch (error) {
      console.error('AI chat error:', error);
      setAiMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSourceClick = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      handleSelectNote(note);
    }
  }

  function handleUpdateContent(newContent: string, e?: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(newContent);
    typingRef.current = true;
    if (selectedNote) {
      // Update the notes array and selectedNote locally for immediate feedback
      const updatedNote = { ...selectedNote, content: newContent };
      setNotes((prev) => prev.map((n) => (n.id === selectedNote.id ? updatedNote : n)));
      setSelectedNote(updatedNote);
      
      socketService.liveUpdate(selectedNote.id, newContent, title);
      if (e) {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        socketService.sendCursorUpdate(selectedNote.id, { start, end });
      }
    }
    window.clearTimeout((handleUpdateContent as any)._typingTimer);
    (handleUpdateContent as any)._typingTimer = window.setTimeout(() => {
      typingRef.current = false;
    }, 300);
  }

  function handleCursorMove(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    if (!selectedNote) return;
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    socketService.sendCursorUpdate(selectedNote.id, { start, end });
  }

  function handleUpdateTitle(newTitle: string) {
    setTitle(newTitle);
    if (selectedNote) {
      // Update the notes array and selectedNote locally for immediate feedback
      const updatedNote = { ...selectedNote, title: newTitle };
      setNotes((prev) => prev.map((n) => (n.id === selectedNote.id ? updatedNote : n)));
      setSelectedNote(updatedNote);
      
      socketService.liveUpdate(selectedNote.id, content, newTitle);
    }
  }

  // Get metadata
  useEffect(() => {
    if (workspaceId === null) {
      navigate('/workspaces');
      return;
    }
    if (!token) return;

    let cancelled = false;
    setWorkspace(null);
    setIsLoadingNotes(true);

    getWorkspace(workspaceId, token)
      .then((data) => {
        if (!cancelled) {
          setWorkspace(data);
          // Check if current user is the owner
          setIsOwner(data.owner_id === user?.id);
        }
      })
      .catch((error) => {
        console.error('Failed to load workspace', error);
        if (!cancelled) {
          navigate('/workspaces');
        }
      });

    // Load collaborators
    getCollaborators(workspaceId, token)
      .then((data) => {
        if (!cancelled) {
          setCollaborators(data);
        }
      })
      .catch((error) => {
        console.error('Failed to load collaborators', error);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, navigate, token, user?.id]);

  // Join workspace and listen
  useEffect(() => {
    if (workspaceId === null) return;

    setNotes([]);
    setSelectedNote(null);
    setMessages([]);
    setIsLoadingNotes(true);

    socketService.joinWorkspace(String(workspaceId));

    const unsubscribes = [
      socketService.onNotesList((notesList) => {
        setNotes(notesList);
        setIsLoadingNotes(false);
        setSelectedNote((prev) => {
          if (prev) {
            const updated = notesList.find((note) => note.id === prev.id);
            if (updated) {
              return updated;
            }
          }
          return notesList[0] ?? null;
        });
      }),
      socketService.onNoteCreated((note) => {
        setNotes((prev) => {
          const exists = prev.some((n) => n.id === note.id);
          if (exists) {
            return prev.map((n) => (n.id === note.id ? note : n));
          }
          return [note, ...prev];
        });
        setSelectedNote((prev) => prev ?? note);
      }),
      socketService.onNoteUpdated((note) => {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
        setSelectedNote((prev) => (prev && prev.id === note.id ? note : prev));
      }),
      socketService.onNoteDeleted(({ id }) => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setSelectedNote((prev) => (prev && prev.id === id ? null : prev));
      }),
      socketService.onChatHistory((history) => {
        setMessages(history);
      }),
      socketService.onNewMessage((message) => {
        setMessages((prev) => [...prev, message]);
      }),
    ];

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe && unsubscribe());
    };
  }, [workspaceId]);

  // Sync when note changes
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [selectedNote]);

  // Auto select first note if none
  useEffect(() => {
    if (!selectedNote && notes.length) {
      setSelectedNote(notes[0]);
    }
  }, [notes, selectedNote]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleCreateNote = () => {
    socketService.createNote('New page', '');
    setSidebarOpen(true);
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteNote = () => {
    if (selectedNote) {
      socketService.deleteNote(selectedNote.id);
    }
  };

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim()) return;
    socketService.sendMessage(messageInput);
    setMessageInput('');
  }, [messageInput]);

  const handleRefreshCollaborators = useCallback(() => {
    if (!workspaceId || !token) return;
    getCollaborators(workspaceId, token)
      .then(setCollaborators)
      .catch((error) => console.error('Failed to refresh collaborators', error));
  }, [workspaceId, token]);

  const workspaceTitle = workspace?.name ?? 'Workspace';

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Collapsible sidebar */}
      <WorkspaceSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        workspaceId={workspaceId || ''}
        workspaceTitle={workspaceTitle}
        handleCreateNote={handleCreateNote}
        isLoadingNotes={isLoadingNotes}
        notes={notes}
        selectedNote={selectedNote}
        handleSelectNote={handleSelectNote}
        token={token}
      />

      {/* Main editor and chat */}
      <div className="flex flex-1 flex-col">
        <WorkspaceHeader
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          workspaceId={workspaceId || ''}
          workspaceTitle={workspaceTitle}
          socketId={socketId}
          collaborators={collaborators}
          isOwner={isOwner}
          onCollaboratorsChange={handleRefreshCollaborators}
        />

        <div className="flex flex-1 overflow-hidden">
          <NoteEditor
            selectedNote={selectedNote}
            title={title}
            handleUpdateTitle={handleUpdateTitle}
            handleDeleteNote={handleDeleteNote}
            mirrorRef={mirrorRef}
            textareaRef={textareaRef}
            content={content}
            handleUpdateContent={handleUpdateContent}
            handleCursorMove={handleCursorMove}
            remoteCursors={remoteCursors}
          />

          {/* Chat / AI panel */}
          <ChatPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            messages={messages}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            handleSendMessage={handleSendMessage}
            socketId={socketId}
            chatBottomRef={chatBottomRef}
            aiMessages={aiMessages}
            aiInput={aiInput}
            setAiInput={setAiInput}
            handleSendAiMessage={handleSendAiMessage}
            isAiLoading={isAiLoading}
            onSourceClick={handleSourceClick}
          />
        </div>
      </div>
    </div>
  );
}

