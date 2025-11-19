import React from 'react';
import NoteListItem from './NoteListItem';
import type { Note } from '../../services/socket';

interface WorkspaceSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  workspaceTitle: string;
  handleCreateNote: () => void;
  isLoadingNotes: boolean;
  notes: Note[];
  selectedNote: Note | null;
  handleSelectNote: (note: Note) => void;
}

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  workspaceTitle,
  handleCreateNote,
  isLoadingNotes,
  notes,
  selectedNote,
  handleSelectNote,
}) => {
  return (
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
            <NoteListItem
              key={note.id}
              note={note}
              isSelected={selectedNote?.id === note.id}
              onSelect={handleSelectNote}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-[#d9d8d3] bg-white/70 px-4 py-10 text-center text-sm text-[#9b9a97]">
            No pages yet. Create your first note to get started.
          </div>
        )}
      </nav>
    </aside>
  );
};

export default WorkspaceSidebar;
