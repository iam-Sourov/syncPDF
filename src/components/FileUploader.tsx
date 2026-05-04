import React, { useCallback } from 'react';
import { Upload, FilePlus, Files } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileUploaderProps {
  onFilesSelect: (files: FileList) => void;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelect, className }) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelect(e.dataTransfer.files);
    }
  }, [onFilesSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelect(e.target.files);
    }
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      <label 
        className="group relative flex flex-col items-center justify-center p-8 border border-slate-800 rounded-2xl bg-slate-900/40 hover:border-accent hover:bg-accent/5 transition-all cursor-pointer shadow-lg"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="p-4 bg-slate-800 rounded-full group-hover:bg-accent/20 transition-colors">
          <FilePlus className="w-8 h-8 text-slate-500 group-hover:text-accent" />
        </div>
        <div className="mt-4 text-center">
          <span className="text-sm font-semibold text-white">Choose PDF File</span>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Standard Upload</p>
        </div>
        <input type="file" className="hidden" accept=".pdf" onChange={handleChange} />
      </label>

      <label 
        className="group relative flex flex-col items-center justify-center p-8 border border-slate-800 rounded-2xl bg-slate-900/40 hover:border-accent hover:bg-accent/5 transition-all cursor-pointer shadow-lg"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="p-4 bg-slate-800 rounded-full group-hover:bg-accent/20 transition-colors">
          <Files className="w-8 h-8 text-slate-500 group-hover:text-accent" />
        </div>
        <div className="mt-4 text-center">
          <span className="text-sm font-semibold text-white">Choose Multiple Files</span>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Bulk Processing</p>
        </div>
        <input type="file" className="hidden" accept=".pdf" multiple onChange={handleChange} />
      </label>
    </div>
  );
};
