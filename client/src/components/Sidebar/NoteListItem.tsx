import { FileText } from 'lucide-react';
import type { Note } from '../../services/socket';

interface NoteListItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: (note: Note) => void;
}

export default function NoteListItem({ note, isSelected, onSelect }: NoteListItemProps) {
  return (
    <button
      onClick={() => onSelect(note)}
      className={`group mb-1.5 w-full rounded-lg px-3 py-2.5 text-left transition ${
        isSelected 
          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
          : 'text-gray-300 hover:bg-gray-700/50 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <FileText size={16} className={isSelected ? 'text-indigo-400' : 'text-gray-500'} />
        <div className="flex-1 truncate">
          <h3 className={`text-sm font-medium leading-snug truncate ${isSelected ? 'text-white' : ''}`}>
            {note.title || 'Untitled page'}
          </h3>
          <p className="text-xs text-gray-500 max-h-10 overflow-hidden text-ellipsis mt-0.5">
            {note.content?.slice(0, 50) || 'Click to start writing'}
          </p>
        </div>
      </div>
    </button>
  );
}
