import React from 'react';
import { Trash2, FileText } from 'lucide-react';
import RemoteCursor from './RemoteCursor';
import DocumentPreview from './DocumentPreview';
import RichTextEditor from './RichTextEditor';
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
  handleUpdateContent: (value: string, e?: React.ChangeEvent<HTMLTextAreaElement>) => void;
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
  mirrorRef: _mirrorRef,
  textareaRef: _textareaRef,
  content,
  handleUpdateContent,
  handleCursorMove: _handleCursorMove,
  remoteCursors,
  apiUrl,
  token,
}) => {
  // Note: mirrorRef, textareaRef, handleCursorMove are kept for API compatibility
  // but not used with the rich text editor
  void _mirrorRef;
  void _textareaRef;
  void _handleCursorMove;
  // Check if the selected note is a document
  const isDocument = selectedNote?.is_document && selectedNote?.file_name && selectedNote?.file_type;

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
                extractedText={content}
              />
            </div>
          </div>
        ) : (
          /* Rich Text Editor Mode */
        <div className="mx-auto flex max-w-4xl flex-col px-10 py-12">
          <div className="flex items-center justify-between mb-6">
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
          <div className="relative">
            <RichTextEditor
              content={content}
              onChange={(newContent) => handleUpdateContent(newContent)}
              placeholder="Start writing your notes here..."
            />
            {/* Remote cursors - note: these won't work perfectly with rich text yet */}
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
