import React, { useState, useEffect, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Rnd } from 'react-rnd';
import { toPng } from 'html-to-image';
import { PDFFile, TextOverlay, BENGALI_FONTS } from '../types';
import { X, ChevronLeft, ChevronRight, Save, Trash2, Type as TypeIcon, MousePointer2, Loader2, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateId } from '../lib/id-utils';

interface EditorModalProps {
  file: PDFFile;
  overlays: TextOverlay[];
  onClose: () => void;
  onSave: (overlays: TextOverlay[], shouldClose?: boolean) => void;
}

export const EditorModal: React.FC<EditorModalProps> = ({ file, overlays: initialOverlays, onClose, onSave }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [overlays, setOverlays] = useState<TextOverlay[]>(initialOverlays);
  const [history, setHistory] = useState<TextOverlay[][]>([initialOverlays]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [forceShowAll, setForceShowAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

  const pushToHistory = (newOverlays: TextOverlay[]) => {
    setHistory(prev => [...prev.slice(-19), newOverlays]);
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop();
    const previousState = newHistory[newHistory.length - 1];
    setOverlays(previousState);
    setHistory(newHistory);
  };

  useEffect(() => {
    const initPdf = async () => {
      const arrayBuffer = await file.blob.arrayBuffer();
      pdfDocRef.current = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      renderPage();
    };
    initPdf();
    return () => { pdfDocRef.current?.destroy(); };
  }, [file]);

  useEffect(() => {
    if (pdfDocRef.current) renderPage();
  }, [currentPage]);

  const renderPage = async () => {
    if (!canvasRef.current || !pdfDocRef.current) return;
    const page = await pdfDocRef.current.getPage(currentPage);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const width = unscaledViewport.width;
    const height = unscaledViewport.height;
    
    setPageSize({ width, height });

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d')!;
    
    // Render at high DPI for sharpness
    const renderViewport = page.getViewport({ scale: 2.0 });
    canvas.height = renderViewport.height;
    canvas.width = renderViewport.width;
    
    if (containerRef.current) {
      // Canva style: center canvas with some padding
      const containerWidth = containerRef.current.clientWidth - 96;
      const initialScale = containerWidth / width;
      setScale(Math.min(initialScale, 1.5)); // Don't scale up too much initially
    }
    await page.render({ canvasContext: context, viewport: renderViewport }).promise;
  };

  const handleAddText = () => {
    if (!pageSize) return;
    
    const newOverlay: TextOverlay = {
      id: generateId(),
      text: 'নতুন টেক্সট',
      x: 20,
      y: 30, // Default position somewhere near top-center
      width: 40,
      height: 10,
      fontSize: 24,
      isBold: false,
      fontFamily: BENGALI_FONTS[0].family,
      textAlign: 'center',
      pageIndex: currentPage - 1
    };

    const nextState = [...overlays, newOverlay];
    setOverlays(nextState);
    pushToHistory(nextState);
    setSelectedId(newOverlay.id);
  };

  const processAndSave = async (shouldClose = true) => {
    setIsSaving(true);
    const prevSelectedId = selectedId;
    setSelectedId(null); 
    setForceShowAll(true);
    
    try {
      await new Promise(r => setTimeout(r, 400));

      const finalOverlays = await Promise.all(overlays.map(async (overlay) => {
        const element = document.getElementById(`overlay-inner-${overlay.id}`);
        if (!element) return overlay;

        const dataUrl = await toPng(element, {
          pixelRatio: 5,
          skipAutoScale: true,
          cacheBust: true,
          style: {
            transform: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            boxShadow: 'none'
          }
        });

        return { ...overlay, imageData: dataUrl };
      }));

      onSave(finalOverlays, shouldClose);
      if (!shouldClose) {
        setOverlays(finalOverlays);
        setSelectedId(prevSelectedId);
      }
    } catch (err) {
      console.error('Capture failed:', err);
      setSelectedId(prevSelectedId);
      alert('Efficiency Error: High-resolution sync failed. Try again.');
    } finally {
      setIsSaving(false);
      setForceShowAll(false);
    }
  };

  const handleSave = () => processAndSave(true);
  
  const handleSyncAll = () => {
    if (!pageSize) return;
    
    const currentPageOverlays = overlays.filter(o => o.pageIndex === currentPage - 1);
    
    if (currentPageOverlays.length === 0) {
      alert("No text boxes on the current page to apply.");
      return;
    }

    const newOverlays: TextOverlay[] = [];
    
    for (let i = 0; i < file.numPages; i++) {
      if (i === currentPage - 1) {
        newOverlays.push(...currentPageOverlays);
      } else {
        const copies = currentPageOverlays.map(o => ({
          ...o,
          id: generateId(),
          pageIndex: i
        }));
        newOverlays.push(...copies);
      }
    }

    setOverlays(newOverlays);
    pushToHistory(newOverlays);
  };

  const removeOverlay = (id: string) => {
    const nextState = overlays.filter(o => o.id !== id);
    setOverlays(nextState);
    pushToHistory(nextState);
    if (selectedId === id) setSelectedId(null);
  };

  const updateOverlay = (id: string, updates: Partial<TextOverlay>, isFinal = true) => {
    const nextState = overlays.map(o => o.id === id ? { ...o, ...updates } : o);
    setOverlays(nextState);
    if (isFinal) pushToHistory(nextState);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F3F4F6] text-gray-900 font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30 shadow-sm relative">
        <div className="flex items-center gap-4">
           <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors">
             <ChevronLeft className="w-5 h-5" />
           </button>
           <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
             <div className="p-1.5 bg-gradient-to-br from-[#8B3DFF] to-[#00C4CC] rounded shadow-sm">
               <FileText className="w-3.5 h-3.5 text-white" />
             </div>
             {file.name}
           </h3>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={undo} disabled={history.length <= 1} className="p-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-30 transition-colors" title="Undo">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
           </button>
           <div className="w-px h-5 bg-gray-200 mx-1" />
           <button disabled={isSaving} onClick={handleSyncAll} className="px-4 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md hover:bg-indigo-100 transition-colors">
              Apply to All Pages
           </button>
           <button disabled={isSaving} onClick={handleSave} className="px-5 py-1.5 text-xs font-semibold bg-[#8B3DFF] text-white rounded-md hover:bg-[#7B2BEF] transition-colors flex items-center gap-2 shadow-sm">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isSaving ? 'Processing...' : 'Export PDF'}
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Tools) */}
        <div className="w-[72px] bg-[#18191B] flex flex-col items-center py-4 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.1)] relative">
           <button 
             onClick={handleAddText}
             className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-white group w-full py-3"
           >
             <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <TypeIcon className="w-6 h-6" />
             </div>
             <span className="text-[10px] font-medium tracking-wide">Text</span>
           </button>
        </div>

        {/* Main Canvas Area */}
        <div 
          className="flex-1 overflow-auto bg-[#F3F4F6] relative p-8 flex justify-center pb-24"
          ref={containerRef}
          onClick={(e) => { 
            if (e.target === e.currentTarget || e.target === containerRef.current) {
              setSelectedId(null); 
            }
          }}
        >
          <div 
            className="relative shadow-[0_2px_12px_rgba(0,0,0,0.08)] bg-white origin-top"
            style={{ 
              transform: `scale(${scale})`,
              width: pageSize?.width,
              height: pageSize?.height 
            }}
          >
            <canvas ref={canvasRef} className="block w-full h-full" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {pageSize && overlays.map(overlay => (
                 <div 
                    key={overlay.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: (forceShowAll || overlay.pageIndex === currentPage - 1) ? 0 : -99999,
                      width: '100%',
                      height: '100%',
                      opacity: (!forceShowAll && overlay.pageIndex !== currentPage - 1) ? 0 : 1
                    }}
                 >
                   <RndOverlay 
                      overlay={overlay}
                      isSelected={selectedId === overlay.id}
                      containerSize={pageSize}
                      scale={scale}
                      onSelect={() => setSelectedId(overlay.id)}
                      onChange={(updates, isFinal) => updateOverlay(overlay.id, updates, isFinal)}
                      onRemove={() => removeOverlay(overlay.id)}
                   />
                 </div>
              ))}
            </div>
          </div>
          
          {/* Bottom Zoom & Page Controls */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-white shadow-lg rounded-full px-2 py-1.5 border border-gray-200 z-30">
            <div className="flex items-center px-2 border-r border-gray-200">
               <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600"><ChevronLeft className="w-4 h-4" /></button>
               <span className="px-2 text-xs font-semibold text-gray-700 w-12 text-center">{Math.round(scale * 100)}%</span>
               <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center px-2">
               <button disabled={currentPage === 1} onClick={() => setCurrentPage(p=>p-1)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 disabled:opacity-30"><ChevronLeft className="w-4 h-4"/></button>
               <span className="text-xs font-semibold mx-3 text-gray-700">Page {currentPage} of {file.numPages}</span>
               <button disabled={currentPage === file.numPages} onClick={() => setCurrentPage(p=>p+1)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 disabled:opacity-30"><ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        </div>

        {/* Right Sidebar (Properties) */}
        {selectedId ? (
           <div className="w-80 bg-white border-l border-gray-200 flex flex-col z-20 shadow-sm overflow-y-auto">
             {(() => {
                const o = overlays.find(x => x.id === selectedId);
                if (!o) return null;
                return (
                  <div className="p-5 space-y-6">
                     <div>
                       <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Content</h4>
                       <textarea 
                         value={o.text}
                         onChange={(e) => updateOverlay(o.id, { text: e.target.value })}
                         className="w-full bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-800 font-bengali min-h-[100px] outline-none focus:ring-2 focus:ring-[#8B3DFF]/20 focus:border-[#8B3DFF] transition-all resize-none"
                         placeholder="Enter text here..."
                       />
                     </div>

                     <div className="space-y-4">
                       <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Typography</h4>
                       
                       <div className="space-y-2">
                         <select 
                           value={o.fontFamily}
                           onChange={(e) => updateOverlay(o.id, { fontFamily: e.target.value })}
                           className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 text-sm text-gray-800 outline-none focus:border-[#8B3DFF]"
                         >
                           {BENGALI_FONTS.map(f => (
                             <option key={f.family} value={f.family}>{f.name}</option>
                           ))}
                         </select>
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                          <div className="flex bg-gray-50 border border-gray-200 rounded-md p-1 items-center">
                            <button onClick={() => updateOverlay(o.id, { fontSize: Math.max(8, o.fontSize - 1) })} className="p-1 text-gray-500 hover:text-gray-800">-</button>
                            <input 
                              type="number" value={o.fontSize} 
                              onChange={(e) => updateOverlay(o.id, { fontSize: parseInt(e.target.value) || 12 })}
                              className="w-full bg-transparent text-center text-sm font-semibold text-gray-800 outline-none" 
                            />
                            <button onClick={() => updateOverlay(o.id, { fontSize: Math.min(144, o.fontSize + 1) })} className="p-1 text-gray-500 hover:text-gray-800">+</button>
                          </div>
                          
                          <div className="flex bg-gray-50 border border-gray-200 rounded-md p-1">
                             <button onClick={() => updateOverlay(o.id, { isBold: !o.isBold })} className={cn("flex-1 py-1 rounded text-sm font-serif", o.isBold ? "bg-white shadow-sm text-gray-800 font-bold" : "text-gray-500 hover:text-gray-700")}>B</button>
                             <div className="w-px h-4 bg-gray-200 my-auto mx-1" />
                             {(['left', 'center', 'right'] as const).map(align => (
                               <button 
                                 key={align} onClick={() => updateOverlay(o.id, { textAlign: align })}
                                 className={cn("flex-1 py-1 rounded", o.textAlign === align ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700")}
                               >
                                 <div className={cn("w-3 h-0.5 bg-current mx-auto mb-0.5", align === 'left' && "ml-1", align === 'right' && "mr-1")} />
                                 <div className="w-2 h-0.5 bg-current mx-auto" />
                               </button>
                             ))}
                          </div>
                       </div>
                     </div>

                     <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Spacing</h4>
                        <div>
                          <div className="flex justify-between mb-2">
                            <label className="text-[11px] font-semibold text-gray-600">Line Height</label>
                            <span className="text-[11px] text-gray-400">{o.lineHeight ?? 1.2}</span>
                          </div>
                          <input type="range" min="0.8" max="2" step="0.1" value={o.lineHeight ?? 1.2} onChange={(e) => updateOverlay(o.id, { lineHeight: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8B3DFF]" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <label className="text-[11px] font-semibold text-gray-600">Letter Spacing</label>
                            <span className="text-[11px] text-gray-400">{o.letterSpacing ?? 0}</span>
                          </div>
                          <input type="range" min="-2" max="10" step="0.5" value={o.letterSpacing ?? 0} onChange={(e) => updateOverlay(o.id, { letterSpacing: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8B3DFF]" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <label className="text-[11px] font-semibold text-gray-600">Opacity</label>
                            <span className="text-[11px] text-gray-400">{Math.round((o.opacity ?? 1) * 100)}%</span>
                          </div>
                          <input type="range" min="0.1" max="1" step="0.1" value={o.opacity ?? 1} onChange={(e) => updateOverlay(o.id, { opacity: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#8B3DFF]" />
                        </div>
                     </div>

                     <div className="pt-6 border-t border-gray-100">
                        <button onClick={() => removeOverlay(o.id)} className="w-full py-2.5 flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors text-xs font-bold tracking-wide">
                           <Trash2 className="w-4 h-4" /> DELETE ITEM
                        </button>
                     </div>
                  </div>
                );
             })()}
           </div>
        ) : (
           <div className="w-80 bg-white border-l border-gray-200 flex flex-col items-center justify-center text-center p-6 z-20 shadow-sm text-gray-400">
              <MousePointer2 className="w-8 h-8 mb-4 opacity-20" />
              <p className="text-sm font-medium">Select a text box to edit its properties.</p>
           </div>
        )}
      </div>
    </div>
  );
};

interface RndOverlayProps {
  overlay: TextOverlay;
  isSelected: boolean;
  containerSize: { width: number, height: number };
  scale: number;
  onSelect: () => void;
  onChange: (updates: Partial<TextOverlay>, isFinal?: boolean) => void;
  onRemove: () => void;
}

const RndOverlay: React.FC<RndOverlayProps> = ({ overlay, isSelected, containerSize, scale, onSelect, onChange, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = overlay.richText || overlay.text;
    }
  }, [overlay.richText, overlay.text]);

  const pxWidth = (overlay.width || 20) / 100 * containerSize.width;
  const pxHeight = (overlay.height || 8) / 100 * containerSize.height;
  const pxX = (overlay.x / 100) * containerSize.width;
  const pxY = (overlay.y / 100) * containerSize.height;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    onSelect();
    setTimeout(() => {
      editorRef.current?.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current!);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, 50);
  };

  return (
    <Rnd
      size={{ width: pxWidth, height: pxHeight }}
      position={{ x: pxX, y: pxY }}
      scale={scale}
      bounds="parent"
      enableResizing={isSelected && !isEditing}
      disableDragging={isEditing}
      onDragStart={() => {
        setIsDragging(true);
        if (!isSelected) onSelect();
      }}
      onDragStop={(e, d) => {
        setIsDragging(false);
        onChange({ 
          x: (d.x / containerSize.width) * 100, 
          y: (d.y / containerSize.height) * 100 
        });
      }}
      onResizeStart={() => setIsDragging(true)}
      onResizeStop={(e, dir, ref, delta, pos) => {
        setIsDragging(false);
        onChange({
          width: (ref.offsetWidth / containerSize.width) * 100,
          height: (ref.offsetHeight / containerSize.height) * 100,
          x: (pos.x / containerSize.width) * 100,
          y: (pos.y / containerSize.height) * 100
        });
      }}
      className={cn(
        "pointer-events-auto group",
        isSelected 
          ? "z-50" 
          : "hover:ring-1 hover:ring-[#8B3DFF]/50 transition-shadow"
      )}
      onMouseDown={() => { if (!isSelected) onSelect(); }}
      onDoubleClick={handleDoubleClick}
    >
      <div 
        id={`overlay-inner-${overlay.id}`}
        className="w-full h-full relative bg-transparent flex items-center justify-center overflow-visible"
        style={{ opacity: overlay.opacity ?? 1 }}
      >
        <div
          ref={editorRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          className={cn(
            "w-full h-full font-bengali p-2 focus:outline-none flex items-center justify-center break-words overflow-visible whitespace-pre-wrap",
            isEditing ? "cursor-text" : "cursor-default",
            isDragging ? "cursor-move" : ""
          )}
          style={{ 
            fontSize: `${overlay.fontSize}px`,
            fontFamily: overlay.fontFamily,
            color: 'black',
            textAlign: overlay.textAlign || 'center',
            lineHeight: overlay.lineHeight || 1.2,
            letterSpacing: `${overlay.letterSpacing || 0}px`,
            fontWeight: overlay.isBold ? 'bold' : 'normal'
          }}
          onInput={(e) => {
            const html = e.currentTarget.innerHTML;
            const text = e.currentTarget.innerText;
            onChange({ richText: html, text: text }, false);
          }}
          onBlur={() => {
            setIsEditing(false);
            onChange({}, true);
          }}
        />

        {/* Canva-style selected borders and handles */}
        {isSelected && !isEditing && (
           <>
              <div className="absolute inset-0 pointer-events-none border-2 border-[#8B3DFF] rounded-[1px]" />
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white rounded-full border border-[#8B3DFF] shadow-sm" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white rounded-full border border-[#8B3DFF] shadow-sm" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white rounded-full border border-[#8B3DFF] shadow-sm" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white rounded-full border border-[#8B3DFF] shadow-sm" />
              
              {/* Canva side handles */}
              <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-4 bg-white rounded-sm border border-[#8B3DFF] shadow-sm" />
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-4 bg-white rounded-sm border border-[#8B3DFF] shadow-sm" />
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-white rounded-sm border border-[#8B3DFF] shadow-sm" />
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-white rounded-sm border border-[#8B3DFF] shadow-sm" />
           </>
        )}
      </div>
    </Rnd>
  );
};
