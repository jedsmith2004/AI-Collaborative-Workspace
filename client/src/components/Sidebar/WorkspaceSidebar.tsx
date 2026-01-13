import React, { useRef, useState } from 'react';
import { Plus, X, FileText, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import NoteListItem from './NoteListItem';
import type { Note } from '../../services/socket';
import { uploadMultipleFiles, type MultiUploadResult } from '../../api/notes';

interface WorkspaceSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  workspaceId: string;
  workspaceTitle: string;
  handleCreateNote: () => void;
  isLoadingNotes: boolean;
  notes: Note[];
  selectedNote: Note | null;
  handleSelectNote: (note: Note) => void;
  token: string | null;
}

// Supported file types
const ACCEPTED_EXTENSIONS = '.txt,.md,.markdown,.json,.csv,.xml,.html,.htm,.py,.js,.ts,.jsx,.tsx,.css,.yaml,.yml,.toml,.ini,.cfg,.log,.sql,.sh,.bat,.ps1';

const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  workspaceId,
  workspaceTitle,
  handleCreateNote,
  isLoadingNotes,
  notes,
  selectedNote,
  handleSelectNote,
  token,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<MultiUploadResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !token || !workspaceId) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await uploadMultipleFiles(workspaceId, Array.from(files), token);
      setUploadResult(result);
      
      // Clear result after 5 seconds
      setTimeout(() => setUploadResult(null), 5000);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadResult({
        uploaded: [],
        errors: [{ filename: 'Upload', error: 'Failed to upload files. Please try again.' }],
        message: 'Upload failed'
      });
      setTimeout(() => setUploadResult(null), 5000);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    await handleFileSelect(files);
  };

  return (
    <aside
      className={`relative z-30 flex flex-col border-r border-gray-700 bg-gray-800 transition-all duration-200 ease-in-out md:static md:translate-x-0 ${
        sidebarOpen
          ? 'w-72 translate-x-0'
          : 'w-0 -translate-x-full overflow-hidden md:w-0 md:translate-x-0'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-indigo-600/20 border-2 border-dashed border-indigo-500 rounded-lg flex items-center justify-center">
          <div className="text-center text-indigo-300">
            <Upload size={32} className="mx-auto mb-2" />
            <p className="text-sm font-medium">Drop files here</p>
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-b border-gray-700 bg-gray-800/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500">Workspace</div>
            <h2 className="mt-1 text-base font-semibold text-white truncate">{workspaceTitle}</h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition md:hidden"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleCreateNote}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 py-2 text-sm font-medium text-white transition"
          >
            <Plus size={16} />
            New Page
          </button>
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="flex items-center justify-center gap-1 rounded-lg bg-gray-700 hover:bg-gray-600 px-3 py-2 text-sm font-medium text-white transition disabled:opacity-50"
            title="Upload files"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload size={16} />
            )}
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {/* Upload result toast */}
        {uploadResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${
            uploadResult.errors.length > 0 && uploadResult.uploaded.length === 0
              ? 'bg-red-900/30 border border-red-700 text-red-300'
              : uploadResult.errors.length > 0
              ? 'bg-yellow-900/30 border border-yellow-700 text-yellow-300'
              : 'bg-green-900/30 border border-green-700 text-green-300'
          }`}>
            <div className="flex items-start gap-2">
              {uploadResult.errors.length > 0 && uploadResult.uploaded.length === 0 ? (
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">{uploadResult.message}</p>
                {uploadResult.errors.length > 0 && (
                  <ul className="mt-1 text-xs opacity-80">
                    {uploadResult.errors.slice(0, 3).map((err, i) => (
                      <li key={i}>{err.filename}: {err.error}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="text-xs uppercase tracking-wider text-gray-500 mb-3 px-2">All pages</div>
        {isLoadingNotes ? (
          <div className="py-10 text-center text-sm text-gray-500">
            <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
            Loading notes…
          </div>
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
          <div className="rounded-lg border border-dashed border-gray-700 bg-gray-800/50 px-4 py-10 text-center text-sm text-gray-500">
            <FileText size={24} className="mx-auto mb-2 opacity-50" />
            No pages yet. Create your first note or upload a file.
          </div>
        )}
      </nav>
    </aside>
  );
};

export default WorkspaceSidebar;
