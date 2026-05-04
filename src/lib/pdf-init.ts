// Workaround for "Cannot set property fetch of #<Window> which has only a getter"
if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch;
    const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
    
    // Only try to redefine if it's configurable
    if (descriptor && descriptor.configurable) {
      let currentFetch = originalFetch;
      Object.defineProperty(window, 'fetch', {
        get() { return currentFetch; },
        set(v) { 
          console.warn('Something tried to overwrite window.fetch. Allowing it to prevent crash.');
          currentFetch = v; 
        },
        configurable: true,
        enumerable: true
      });
    } else if (!descriptor || descriptor.writable) {
      // If it doesn't exist or is already writable, we're likely fine.
    } else {
      console.warn('window.fetch is not configurable. Overwrite attempts may still crash.');
    }
  } catch (e) {
    console.warn('Could not patch window.fetch:', e);
  }
}

import * as pdfjs from 'pdfjs-dist';

// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use a very stable version
const PDFJS_VERSION = '4.10.38'; 

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  // Prefer the Vite-resolved URL, fallback to unpkg which is often better than cdnjs for .mjs if it supports it
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl || `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;
}
