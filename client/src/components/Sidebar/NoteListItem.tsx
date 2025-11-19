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
      className={`group mb-2 w-full rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-[#c1c0bc] hover:bg-[#f3f2ef] ${
        isSelected ? 'border-[#a8d1ff] bg-[#e8f5ff]' : ''
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
  );
}
