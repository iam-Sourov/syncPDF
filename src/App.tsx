import React, { useState, useCallback } from 'react';
import { Layout, FileText, Download, CheckCircle2, AlertCircle, Loader2, Trash2, Archive, Zap } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FileUploader } from './components/FileUploader';
import { ThumbnailDashboard } from './components/ThumbnailDashboard';
import { EditorModal } from './components/EditorModal';
import { PDFFile, TextOverlay } from './types';
import { generateThumbnail, getNumPages, applyOverlaysToPDF } from './lib/pdf-utils';
import { generateId } from './lib/id-utils';
import { cn } from './lib/utils';

export default function App() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [editingFile, setEditingFile] = useState<PDFFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<{ id: string; blob: Blob; name: string }[]>([]);

  const handleFilesSelect = async (selectedFiles: FileList) => {
    const fileArray = Array.from(selectedFiles).filter(file => file.type === 'application/pdf');
    if (fileArray.length === 0) return;

    setIsUploading(true);
    setProcessedFiles([]); // Clear previous results when new files are added
    
    try {
      const processed = await Promise.all(fileArray.map(async (file): Promise<PDFFile | null> => {
        try {
          const id = generateId();
          const numPages = await getNumPages(file);
          const thumbnailDataUrl = await generateThumbnail(file);
          
          return {
            id,
            name: file.name,
            blob: file as Blob,
            thumbnailUrl: thumbnailDataUrl,
            numPages
          };
        } catch (err) {
          console.error(`Failed to process ${file.name}:`, err);
          return null;
        }
      }));

      const validFiles = processed.filter((f): f is PDFFile => f !== null);
      setFiles(prev => [...prev, ...validFiles]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Some files could not be processed. Please make sure they are valid PDFs.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyAll = async (newOverlays: TextOverlay[], shouldClose = true) => {
    setOverlays(newOverlays);
    if (shouldClose) {
      setEditingFile(null);
    }
    setIsProcessing(true);
    setProcessedFiles([]);

    try {
      const results = [];
      for (const file of files) {
        const processedBlob = await applyOverlaysToPDF(file.blob, newOverlays);
        results.push({
          id: file.id,
          blob: processedBlob,
          name: file.name // Preservation of original filename
        });
      }
      
      setProcessedFiles(results);
    } catch (error) {
      console.error('Processing failed:', error);
      alert('Failed to process some files. Please check the text content or font availability.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAllAsZip = async () => {
    if (processedFiles.length === 0) return;
    
    const zip = new JSZip();
    processedFiles.forEach(file => {
      zip.file(file.name, file.blob);
    });
    
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'processed_pdfs.zip');
  };

  const clearWorkspace = () => {
    if (window.confirm('Are you sure you want to clear all files and work?')) {
      setFiles([]);
      setOverlays([]);
      setProcessedFiles([]);
      setEditingFile(null);
    }
  };

  const downloadIndividual = (file: { blob: Blob, name: string }) => {
    saveAs(file.blob, file.name);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navigation */}
      <nav className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight text-white">BatchPDF <span className="text-accent">Overlay</span></h1>
              <p className="text-[10px] text-text-muted mt-1 uppercase tracking-widest font-semibold font-bengali">বাংলা সাপোর্ট ইন্টিগ্রেটেড</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {processedFiles.length > 0 && (
               <button 
                 onClick={downloadAllAsZip}
                 className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-black text-[10px] hover:bg-red-700 transition-all uppercase tracking-[0.2em] shadow-xl shadow-red-900/40 border border-red-500/50 group"
               >
                 <Archive className="w-4 h-4 group-hover:scale-110 transition-transform" />
                 Export All (ZIP)
               </button>
             )}
             {files.length > 0 && !isProcessing && (
               <button 
                 onClick={clearWorkspace}
                 className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg font-bold text-[10px] hover:bg-red-500/10 hover:text-red-400 transition-all uppercase tracking-widest border border-slate-700 hover:border-red-500/20"
               >
                 <Trash2 className="w-3 h-3" />
                 Clear Workspace
               </button>
             )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12">
        <div className="max-w-3xl mb-12">
           <div className="text-left">
             <h2 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
               PDF Overlay <span className="text-indigo-400">Pro</span>
             </h2>
             <p className="mt-4 text-slate-400 max-w-lg leading-relaxed">
               Professional tool for batch PDF processing with <span className="text-indigo-300">Bengali Unicode</span> support, featuring real-time thumbnails and precise positioning.
             </p>
           </div>
        </div>

        {/* Upload Section */}
        <section className="mb-16">
          <FileUploader onFilesSelect={handleFilesSelect} />
          {isUploading && (
            <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              <span className="text-sm font-bold text-indigo-300 uppercase tracking-widest">Uploading and analyzing files...</span>
            </div>
          )}
        </section>

        {/* Dashboard Section */}
        <ThumbnailDashboard 
          files={files} 
          onEdit={setEditingFile} 
          isProcessing={isProcessing}
        />

        {/* Results Section */}
        {processedFiles.length > 0 && !isProcessing && (
          <div className="mt-12 bg-slate-900/60 rounded-3xl p-8 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur">
             <div className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">Processing Complete!</h3>
                      <p className="text-sm text-slate-400">All {processedFiles.length} files have been updated with your Bengali text overlay.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {processedFiles.map((file) => (
                    <div key={file.id} className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-slate-300 truncate" title={file.name}>{file.name}</span>
                      </div>
                      <button 
                        onClick={() => downloadIndividual(file)}
                        className="p-2 bg-slate-900 text-slate-400 rounded-lg hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="mt-12 flex flex-col items-center justify-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800 shadow-inner">
             <Loader2 className="w-10 h-10 text-accent animate-spin" />
             <h3 className="mt-4 font-bold text-lg text-white">Generating Your PDFs...</h3>
             <p className="text-xs text-slate-500 uppercase tracking-widest font-black font-bengali mt-1">অনুগ্রহ করে অপেক্ষা করুন, প্রসেসিং চলছে</p>
          </div>
        )}
        
        {files.length === 0 && !isProcessing && (
          <div className="mt-12 py-20 bg-slate-900/10 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-center px-4">
             <div className="p-4 bg-slate-900 border border-slate-800 rounded-full shadow-sm text-slate-700">
                <FileText className="w-8 h-8" />
             </div>
             <p className="mt-4 text-[10px] text-slate-500 max-w-[240px] uppercase font-bold tracking-[0.2em] leading-relaxed">
               No documents uploaded. Select or drag-and-drop PDF files above to start processing.
             </p>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-slate-800 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 opacity-50 grayscale">
             <div className="w-6 h-6 bg-slate-500 rounded"></div>
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">PDFOverlay Enterprise</span>
          </div>
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-black text-center leading-relaxed">
            Advanced Bengali Rendering System • PDF-Lib Integration • Secure Unicode Processing
          </p>
        </div>
      </footer>

      {editingFile && (
        <EditorModal 
          file={editingFile} 
          overlays={overlays}
          onClose={() => setEditingFile(null)}
          onSave={(newOverlays, shouldClose) => handleApplyAll(newOverlays, shouldClose)}
        />
      )}
    </div>
  );
}
