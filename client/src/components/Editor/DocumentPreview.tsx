import React, { useState } from 'react';
import { FileText, Download, ExternalLink, File, FileSpreadsheet, Presentation, ChevronDown, ChevronUp } from 'lucide-react';

interface DocumentPreviewProps {
  noteId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  apiUrl: string;
  token: string;
  extractedText?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) return <FileText className="w-16 h-16 text-red-400" />;
  if (fileType.includes('word') || fileType.includes('document')) return <File className="w-16 h-16 text-blue-400" />;
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return <Presentation className="w-16 h-16 text-orange-400" />;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="w-16 h-16 text-green-400" />;
  return <FileText className="w-16 h-16 text-gray-400" />;
};

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  noteId,
  fileName,
  fileType,
  fileSize,
  apiUrl,
  token,
  extractedText,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExtractedText, setShowExtractedText] = useState(false);
  
  const fileUrl = `${apiUrl}/notes/${noteId}/file?token=${encodeURIComponent(token)}`;
  const isPdf = fileType.includes('pdf');

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Failed to download file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e2e]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#313244]">
        <div className="flex items-center gap-3">
          {getFileIcon(fileType)}
          <div>
            <h3 className="text-white font-medium truncate max-w-[300px]">{fileName}</h3>
            <p className="text-gray-400 text-sm">{formatFileSize(fileSize)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 bg-[#313244] hover:bg-[#45475a] text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="flex items-center gap-2 px-3 py-2 bg-[#89b4fa] hover:bg-[#74a8f7] text-[#1e1e2e] rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open</span>
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden">
        {isPdf ? (
          <div className="h-full w-full relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e2e]">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#89b4fa] border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-400">Loading PDF...</span>
                </div>
              </div>
            )}
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e2e]">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Unable to preview PDF</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-[#89b4fa] hover:bg-[#74a8f7] text-[#1e1e2e] rounded-lg transition-colors"
                  >
                    Download Instead
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                src={fileUrl}
                className="w-full h-full border-0"
                title={fileName}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setError('Failed to load PDF preview');
                }}
              />
            )}
          </div>
        ) : (
          /* Non-PDF Document Preview */
          <div className="h-full overflow-y-auto">
            <div className="text-center p-8 max-w-md mx-auto">
              {getFileIcon(fileType)}
              <h3 className="text-white text-xl font-medium mt-4 mb-2">{fileName}</h3>
              <p className="text-gray-400 mb-6">
                Preview is not available for this file type. You can download or open the file to view it.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-[#313244] hover:bg-[#45475a] text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-2 px-4 py-2 bg-[#89b4fa] hover:bg-[#74a8f7] text-[#1e1e2e] rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in New Tab</span>
                </button>
              </div>
            </div>
            
            {/* Extracted Text Content */}
            {extractedText && !extractedText.startsWith('[Document:') && (
              <div className="border-t border-[#313244] p-6">
                <button
                  onClick={() => setShowExtractedText(!showExtractedText)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                >
                  {showExtractedText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>Extracted Text Content (searchable by AI)</span>
                </button>
                {showExtractedText && (
                  <div className="bg-[#181825] rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-gray-300 whitespace-pre-wrap text-sm font-mono">{extractedText}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;
