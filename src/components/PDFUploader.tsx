import { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export default function PDFUploader({ onFileSelect, isLoading }: PDFUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setSelectedFile(files[0]);
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer
        ${isDragOver 
          ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
          : selectedFile 
            ? 'border-green-400 bg-green-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }
        ${isLoading ? 'opacity-60 pointer-events-none' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !selectedFile && document.getElementById('pdf-input')?.click()}
    >
      <input
        id="pdf-input"
        type="file"
        accept=".pdf"
        onChange={handleFileInput}
        className="hidden"
      />
      
      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium text-blue-600">Analiziram PDF dokument...</p>
          <p className="text-sm text-gray-500">Ekstrakcija transakcija u toku</p>
        </div>
      ) : selectedFile ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 bg-white rounded-xl px-5 py-3 shadow-sm border border-green-200">
            <FileText className="w-8 h-8 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-800">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeFile(); }}
              className="ml-3 p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-green-600 font-medium">✓ Fajl učitan uspešno</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              Prevucite PDF fajl ovde
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ili kliknite za izbor fajla
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Podržani format: PDF (bankovni izvodi)
          </p>
        </div>
      )}
    </div>
  );
}
