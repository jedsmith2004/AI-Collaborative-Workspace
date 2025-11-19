import React from 'react';
import type { Note } from '../../services/socket';

interface WorkspaceHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  workspaceTitle: string;
  socketId: string | null;
  selectedNote: Note | null;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  workspaceTitle,
  socketId,
  selectedNote,
}) => {
  return (
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
  );
};

export default WorkspaceHeader;
