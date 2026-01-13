import { FileText, File, FileSpreadsheet, Presentation } from 'lucide-react';
import type { Note } from '../../services/socket';

interface NoteListItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: (note: Note) => void;
}

const getDocumentIcon = (fileType: string | null | undefined, isSelected: boolean) => {
  const className = isSelected ? 'text-indigo-400' : 'text-gray-500';
  if (!fileType) return <FileText size={16} className={className} />;
  if (fileType.includes('pdf')) return <FileText size={16} className={isSelected ? 'text-red-400' : 'text-red-500'} />;
  if (fileType.includes('word') || fileType.includes('document')) return <File size={16} className={isSelected ? 'text-blue-400' : 'text-blue-500'} />;
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return <Presentation size={16} className={isSelected ? 'text-orange-400' : 'text-orange-500'} />;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet size={16} className={isSelected ? 'text-green-400' : 'text-green-500'} />;
  return <FileText size={16} className={className} />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function NoteListItem({ note, isSelected, onSelect }: NoteListItemProps) {
  const isDocument = note.is_document && note.file_name;
  
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
        {isDocument ? getDocumentIcon(note.file_type, isSelected) : (
          <FileText size={16} className={isSelected ? 'text-indigo-400' : 'text-gray-500'} />
        )}
        <div className="flex-1 truncate">
          <h3 className={`text-sm font-medium leading-snug truncate ${isSelected ? 'text-white' : ''}`}>
            {isDocument ? note.file_name : (note.title || 'Untitled page')}
          </h3>
          <p className="text-xs text-gray-500 max-h-10 overflow-hidden text-ellipsis mt-0.5">
            {isDocument 
              ? formatFileSize(note.file_size || 0)
              : (note.content?.slice(0, 50) || 'Click to start writing')
            }
          </p>
        </div>
      </div>
    </button>
  );
}
