import React, { useEffect } from 'react';
import { Trash2, FileText } from 'lucide-react';
import RemoteCursor from './RemoteCursor';
import DocumentPreview from './DocumentPreview';
import type { Note } from '../../services/socket';

interface RemoteCursorData {
  note_id: string;
  start: number;
  end: number;
  x: number;
  y: number;
  color: string;
}

interface NoteEditorProps {
  selectedNote: Note | null;
  title: string;
  handleUpdateTitle: (title: string) => void;
  handleDeleteNote: () => void;
  mirrorRef: React.RefObject<HTMLDivElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  handleUpdateContent: (value: string, e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleCursorMove: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
  remoteCursors: Record<string, RemoteCursorData>;
  apiUrl: string;
  token: string;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  selectedNote,
  title,
  handleUpdateTitle,
  handleDeleteNote,
  mirrorRef,
  textareaRef,
  content,
  handleUpdateContent,
  handleCursorMove,
  remoteCursors,
  apiUrl,
  token,
}) => {
  // Check if the selected note is a document
  const isDocument = selectedNote?.is_document && selectedNote?.file_name && selectedNote?.file_type;

  // Auto-resize textarea to fit content (like Google Docs)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !isDocument) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight to expand with content
      textarea.style.height = `${Math.max(textarea.scrollHeight, 500)}px`;
    }
  }, [content, isDocument, textareaRef]);

  return (
    <main className="flex-1 overflow-y-auto bg-gray-900">
      {selectedNote ? (
        isDocument ? (
          /* Document Preview Mode */
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#313244]">
              <h1 className="text-2xl font-semibold text-white truncate">{selectedNote.file_name}</h1>
              <button
                onClick={handleDeleteNote}
                className="ml-4 flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 transition"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
            <div className="flex-1">
              <DocumentPreview
                noteId={selectedNote.id}
                fileName={selectedNote.file_name!}
                fileType={selectedNote.file_type!}
                fileSize={selectedNote.file_size || 0}
                apiUrl={apiUrl}
                token={token}
              />
            </div>
          </div>
        ) : (
          /* Normal Text Editor Mode */
        <div className="mx-auto flex max-w-4xl flex-col px-10 py-12">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={title}
              onChange={(e) => handleUpdateTitle(e.target.value)}
              className="w-full bg-transparent text-4xl font-semibold tracking-tight outline-none text-white placeholder-gray-600"
              placeholder="Untitled"
            />
            <button
              onClick={handleDeleteNote}
              className="ml-4 flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 transition"
            >
              <Trash2 size={14} />
              Delete
            </button>
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
              className="min-h-[500px] w-full resize-none bg-transparent text-[17px] leading-7 outline-none text-gray-200 placeholder-gray-600 overflow-hidden"
              placeholder="Start writing your notes here..."
              style={{ height: 'auto' }}
            />
            {Object.entries(remoteCursors).map(([sid, cur]) => {
              if (cur.note_id !== selectedNote?.id) return null;
              return (
                <RemoteCursor
                  key={sid}
                  sid={sid}
                  x={cur.x ?? 0}
                  y={cur.y ?? 0}
                  color={cur.color}
                />
              );
            })}
          </div>
        </div>
        )
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-gray-500">
          <FileText size={48} className="mb-4 opacity-50" />
          <p>Select or create a page to get started.</p>
        </div>
      )}
    </main>
  );
};

export default NoteEditor;
