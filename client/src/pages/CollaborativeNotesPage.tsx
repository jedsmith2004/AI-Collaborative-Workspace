import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socketService } from '../services/socket';
import type { ChatMessage, Note } from '../services/socket';
import { getWorkspace, type Workspace } from '../api/workspaces';
import { sendAIMessage } from '../api/ai';

export default function CollaborativeNotesPage() {
  const { workspaceId: workspaceParam } = useParams();
  const navigate = useNavigate();

  const workspaceId = useMemo(() => {
    if (!workspaceParam) return null;
    const parsed = Number(workspaceParam);
    return Number.isFinite(parsed) ? parsed : null;
  }, [workspaceParam]);

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
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const typingRef = useRef(false);
  const selectedNoteIdRef = useRef<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);

  const [remoteCursors, setRemoteCursors] = useState<Record<string, {
    note_id: number;
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
    const socket = socketService.connect();
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
  }, []);

  const handleSendAiMessage = async () => {
    if (!aiInput.trim() || !workspaceId) return;
    
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
      });

      // Add AI response to messages
      setAiMessages([...newMessages, { role: 'assistant', content: response.message }]);
    } catch (error) {
      console.error('AI chat error:', error);
      setAiMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  function handleUpdateContent(newContent: string, e?: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(newContent);
    typingRef.current = true;
    if (selectedNote) {
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
      socketService.liveUpdate(selectedNote.id, content, newTitle);
    }
  }

  // Get metadata
  useEffect(() => {
    if (workspaceId === null) {
      navigate('/');
      return;
    }

    let cancelled = false;
    setWorkspace(null);
    setIsLoadingNotes(true);

    getWorkspace(workspaceId)
      .then((data) => {
        if (!cancelled) {
          setWorkspace(data);
        }
      })
      .catch((error) => {
        console.error('Failed to load workspace', error);
        if (!cancelled) {
          navigate('/');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, navigate]);

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

  

  const workspaceTitle = workspace?.name ?? 'Workspace';

  return (
    <div className="flex h-screen bg-[#f7f6f3] text-[#2f3437]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Collapsible sidebar */}
      <aside
        className={`relative z-30 flex flex-col border-r border-[#e6e6e6] bg-[#fefcfb] transition-all duration-200 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen
            ? 'w-72 translate-x-0'
            : 'w-0 -translate-x-full overflow-hidden md:w-0 md:translate-x-0'
        }`}
      >
        <div className="px-6 py-5 border-b border-[#e6e6e6] bg-white/80 backdrop-blur">
          <div className="text-xs uppercase tracking-[0.3em] text-[#9b9a97]">Workspace</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold truncate">{workspaceTitle}</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-[#9b9a97] hover:bg-[#f3f2ef] md:hidden"
            >
              Close
            </button>
          </div>
          <button
            onClick={handleCreateNote}
            className="mt-4 w-full rounded-lg border border-[#e3e2e0] bg-white py-2 text-sm transition hover:bg-[#f3f2ef]"
          >
            + New Page
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="text-xs uppercase tracking-wide text-[#b8b6af] mb-3">All pages</div>
          {isLoadingNotes ? (
            <div className="py-10 text-center text-sm text-[#9b9a97]">Loading notes…</div>
          ) : notes.length ? (
            notes.map((note) => (
              <button
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`group mb-2 w-full rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-[#c1c0bc] hover:bg-[#f3f2ef] ${
                  selectedNote?.id === note.id ? 'border-[#a8d1ff] bg-[#e8f5ff]' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <div className="flex-1 truncate">
                    <h3 className="font-medium leading-snug truncate">{note.title || 'Untitled page'}</h3>
                    <p className="text-xs text-[#9b9a97] max-h-10 overflow-hidden text-ellipsis">
                      {note.content || 'Click to start writing'}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-[#d9d8d3] bg-white/70 px-4 py-10 text-center text-sm text-[#9b9a97]">
              No pages yet. Create your first note to get started.
            </div>
          )}
        </nav>
      </aside>

      {/* Main editor and chat */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#e6e6e6] bg-white/70 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="rounded-md border border-[#d9d8d3] bg-white px-3 py-1.5 text-sm font-medium hover:bg-[#f3f2ef]"
            >
              {sidebarOpen ? 'Hide pages' : 'Show pages'}
            </button>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#9b9a97]">Workspace</p>
              <h1 className="text-lg font-semibold">{workspaceTitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#9b9a97]">
            <span className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${socketId ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              {socketId ? 'Connected' : 'Offline'}
            </span>
            {selectedNote && (
              <span>Updated {new Date(selectedNote.updated_at).toLocaleTimeString()}</span>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            {selectedNote ? (
              <div className="mx-auto flex max-w-4xl flex-col px-10 py-12">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleUpdateTitle(e.target.value)}
                    className="w-full bg-transparent text-4xl font-semibold tracking-tight outline-none"
                    placeholder="Untitled"
                  />
                  <button
                    onClick={handleDeleteNote}
                    className="ml-4 rounded-md border border-transparent bg-[#fee4e2] px-3 py-1.5 text-sm text-[#b42318] hover:bg-[#fdd1ce]"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm text-[#9b9a97]">
                  <button className="rounded-md border border-transparent px-2 py-1 hover:bg-[#f3f2ef]">Add icon</button>
                  <button className="rounded-md border border-transparent px-2 py-1 hover:bg-[#f3f2ef]">Add cover</button>
                </div>
                <div className="relative mt-8">
                  <div
                    ref={mirrorRef}
                    aria-hidden
                    style={{
                      position: 'absolute',
                      visibility: 'hidden',
                      pointerEvents: 'none',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      top: 0,
                      left: 0,
                    }}
                  />
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => handleUpdateContent(e.target.value, e)}
                    onSelect={handleCursorMove}
                    onClick={handleCursorMove}
                    onKeyUp={handleCursorMove}
                    className="min-h-[500px] w-full resize-none bg-transparent text-[17px] leading-7 outline-none"
                    placeholder="Type '/' for commands"
                  />
                  {Object.entries(remoteCursors).map(([sid, cur]) => {
                    if (cur.note_id !== selectedNote?.id) return null;
                    const left = cur.x ?? 0;
                    const top = cur.y ?? 0;
                    return (
                      <div
                        key={sid}
                        style={{
                          position: 'absolute',
                          left: `${left}px`,
                          top: `${top}px`,
                          pointerEvents: 'none',
                          zIndex: 10,
                        }}
                      >
                        <div
                          style={{
                            height: '18px',
                            width: '2px',
                            background: cur.color,
                            boxShadow: `0 0 4px ${cur.color}`,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '-20px',
                            left: '4px',
                            fontSize: '10px',
                            background: cur.color,
                            color: 'white',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {sid.slice(0, 6)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[#9b9a97]">
                Select or create a page to get started.
              </div>
            )}
          </main>

          {/* Chat / AI panel */}
          <aside className="flex w-80 flex-col border-l border-[#e6e6e6] bg-white/95 backdrop-blur-sm">
            <div className="relative flex border-b border-[#e6e6e6] bg-[#f7f7f5]">
              <div
                className={`absolute inset-y-1 w-[50%] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                  activeTab === 'chat' ? 'translate-x-1' : 'translate-x-[100%]'
                }`}
              />
              <button
                onClick={() => setActiveTab('chat')}
                className={`relative z-10 flex-1 bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 outline-none focus:outline-none focus-visible:outline-none active:outline-none hover:outline-none border-none focus:ring-0 ${
                  activeTab === 'chat' ? 'text-[#111827]' : 'text-[#9b9a97]'
                }`}
              >
                <span className="mr-1">💬</span>
                Live Chat
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`relative z-10 flex-1 bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 outline-none focus:outline-none focus-visible:outline-none active:outline-none hover:outline-none border-none focus:ring-0 ${
                  activeTab === 'ai' ? 'text-[#111827]' : 'text-[#9b9a97]'
                }`}
              >
                <span className="mr-1">🤖</span>
                AI Assistant
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <div
                className={`absolute inset-0 flex flex-col transition-all duration-200 ease-out ${
                  activeTab === 'chat'
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-4 opacity-0 pointer-events-none'
                }`}
                aria-hidden={activeTab !== 'chat'}
              >
            {/* Live Chat */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {messages.map((msg, idx) => {
                  const isOwn = msg.sid === socketId;
                  return (
                    <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          isOwn ? 'bg-blue-500 text-white' : 'bg-[#f3f2ef] text-[#2f3437]'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs opacity-70">
                          <span className="font-medium">
                            {isOwn ? 'You' : msg.sid?.slice(0, 6)}
                          </span>
                          <span>•</span>
                          <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>
            </div>
            <div className="border-t border-[#e6e6e6] p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-[#e3e2e0] bg-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
                <button
                  onClick={handleSendMessage}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
                >
                  Send
                </button>
              </div>
            </div>
              </div>

              {/* AI Assistant */}
              <div
                className={`absolute inset-0 flex flex-col transition-all duration-200 ease-out ${
                  activeTab === 'ai'
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-4 opacity-0 pointer-events-none'
                }`}
                aria-hidden={activeTab !== 'ai'}
              >
                <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {aiMessages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          isUser ? 'bg-purple-500 text-white' : 'bg-[#f3f2ef] text-[#2f3437]'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-[#f3f2ef] px-3 py-2 text-sm text-[#2f3437]">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-[#e6e6e6] p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendAiMessage()}
                  placeholder="Ask AI anything..."
                  disabled={isAiLoading}
                  className="flex-1 rounded-lg border border-[#e3e2e0] px-3 py-2 text-sm outline-none bg-slate-100 focus:border-purple-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSendAiMessage}
                  disabled={isAiLoading}
                  className="rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function colorForSid(sid: string) {
  // deterministic pastel color by hashing sid
  let h = 0;
  for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 70% 55%)`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>').replace(/ /g, '&nbsp;');
}

function computeCaretCoordinates(textarea: HTMLTextAreaElement, mirror: HTMLDivElement, position: number) {
  // copy computed styles
  const style = window.getComputedStyle(textarea);
  const props = [
    'boxSizing','width','paddingTop','paddingRight','paddingBottom','paddingLeft',
    'fontSize','fontFamily','lineHeight','whiteSpace','wordWrap','letterSpacing','textTransform'
  ];
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.pointerEvents = 'none';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  props.forEach((p) => (mirror.style as any)[p] = (style as any)[p]);
  mirror.style.width = style.width;

  const content = textarea.value.slice(0, position);
  mirror.innerHTML = escapeHtml(content) + '<span id="caret-marker">|</span>';
  const marker = mirror.querySelector('#caret-marker') as HTMLElement | null;
  const taRect = textarea.getBoundingClientRect();
  if (!marker) return { left: 0, top: 0 };
  const markerRect = marker.getBoundingClientRect();
  // compute coordinates relative to textarea content box (account for scroll)
  const left = markerRect.left - taRect.left + textarea.scrollLeft - parseFloat(style.paddingLeft || '0');
  const top = markerRect.top - taRect.top + textarea.scrollTop - parseFloat(style.paddingTop || '0');
  return { left, top };
}