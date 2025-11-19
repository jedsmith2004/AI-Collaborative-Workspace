import React from 'react';
import RemoteCursor from './RemoteCursor';
import type { Note } from '../../services/socket';

interface RemoteCursorData {
  note_id: number;
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
}) => {
  return (
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
      ) : (
        <div className="flex h-full items-center justify-center text-[#9b9a97]">
          Select or create a page to get started.
        </div>
      )}
    </main>
  );
};

export default NoteEditor;
