import React from 'react';
import { PDFFile } from '../types';
import { Edit2, FileText, CheckCircle2 } from 'lucide-react';

interface ThumbnailDashboardProps {
  files: PDFFile[];
  onEdit: (file: PDFFile) => void;
  isProcessing?: boolean;
}

export const ThumbnailDashboard: React.FC<ThumbnailDashboardProps> = ({ files, onEdit, isProcessing }) => {
  if (files.length === 0) return null;

  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          Batch Dashboard
          <span className="text-xs font-bold text-slate-500 bg-slate-900 border border-slate-800 px-3 py-0.5 rounded-full">
            {files.length} {files.length === 1 ? 'file' : 'files'}
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {files.map((file) => (
          <div key={file.id} className="group relative">
            <div className="aspect-[3/4] bg-white rounded-xl pdf-canvas-container overflow-hidden relative group-hover:ring-4 ring-accent/30 transition-all border border-slate-800">
              {file.thumbnailUrl ? (
                <img 
                  src={file.thumbnailUrl} 
                  alt={file.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
                  <FileText className="w-10 h-10 text-slate-800" />
                  <span className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-widest">Rendering</span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <button
                  onClick={() => onEdit(file)}
                  className="px-4 py-2 bg-accent text-white rounded-lg shadow-lg hover:bg-indigo-500 transition-all font-bold text-xs uppercase tracking-widest"
                >
                  Edit PDF
                </button>
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center backdrop-blur-[1px]">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            <div className="mt-3 text-center">
              <p className="text-xs font-semibold text-slate-300 truncate px-2" title={file.name}>
                {file.name}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">
                {file.numPages} Pages
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
