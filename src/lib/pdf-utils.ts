import * as pdfjs from 'pdfjs-dist';
import './pdf-init';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { TextOverlay, BENGALI_FONT_URL, BENGALI_BOLD_FONT_URL } from '../types';

export async function generateThumbnail(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.5 });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL();
}

export async function getNumPages(blob: Blob): Promise<number> {
  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

let cachedFont: Uint8Array | null = null;
let cachedBoldFont: Uint8Array | null = null;

async function fetchFont(url: string, isBold: boolean) {
  if (isBold && cachedBoldFont) return cachedBoldFont;
  if (!isBold && cachedFont) return cachedFont;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
       if (isBold) {
         console.warn(`Bold font fetch failed (${url}), falling back to normal font`);
         return fetchFont(BENGALI_FONT_URL, false);
       }
       throw new Error(`Font fetch failed: ${response.statusText}`);
    }
    const fontBytes = await response.arrayBuffer();
    const bytes = new Uint8Array(fontBytes);
    if (isBold) cachedBoldFont = bytes;
    else cachedFont = bytes;
    return bytes;
  } catch (err) {
    console.error('Failed to fetch font:', err);
    if (isBold) {
      console.warn('Falling back to normal font due to error');
      return fetchFont(BENGALI_FONT_URL, false);
    }
    throw err;
  }
}

export async function applyOverlaysToPDF(
  blob: Blob,
  overlays: (TextOverlay & { imageData?: string })[]
 ): Promise<Blob> {
  try {
    const pdfBytes = await blob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const pages = pdfDoc.getPages();

    for (const overlay of overlays) {
      if (overlay.pageIndex >= pages.length) continue;
      
      const page = pages[overlay.pageIndex];
      const { width, height } = page.getSize();
      
      // Convert percentage to points
      const x = (overlay.x / 100) * width;
      const y = (overlay.y / 100) * height;

      if (overlay.imageData) {
        const imageBytes = await fetch(overlay.imageData).then(res => res.arrayBuffer());
        const image = await pdfDoc.embedPng(imageBytes);
        
        // Exact percentage-to-point mapping for every page
        const drawWidth = ((overlay.width || 20) / 100) * width;
        const drawHeight = ((overlay.height || 8) / 100) * height;

        page.drawImage(image, {
          x, // x is (overlay.x / 100) * width
          y: height - y - drawHeight, // Adjust for bottom-left origin
          width: drawWidth,
          height: drawHeight,
        });
      } else {
        // Fallback to basic text if no image provided (though we aim for image always now)
        page.drawText(overlay.text, {
          x,
          y: height - y,
          size: overlay.fontSize,
          color: rgb(0, 0, 0),
        });
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();
    return new Blob([modifiedPdfBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error('PDF modification failed:', error);
    throw error;
  }
}
