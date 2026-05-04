export interface TextOverlay {
  id: string;
  text: string;
  richText?: string; 
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width?: number; // percentage
  height?: number; // percentage
  fontSize: number;
  isBold: boolean;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  opacity?: number;
  pageIndex: number;
  imageData?: string;
}

export interface PDFFile {
  id: string;
  name: string;
  blob: Blob;
  thumbnailUrl?: string;
  numPages: number;
}

export const BENGALI_FONTS = [
  { name: 'Hind Siliguri', family: '"Hind Siliguri", sans-serif' },
  { name: 'Noto Sans Bengali', family: '"Noto Sans Bengali", sans-serif' },
  { name: 'Atma', family: '"Atma", cursive' }
];

export const BENGALI_FONT_URL = 'https://fonts.gstatic.com/s/hindsiliguri/v12/ijwaNR_neleXhm7m8r8hSdhia0p6_vWv.ttf';
export const BENGALI_BOLD_FONT_URL = 'https://fonts.gstatic.com/s/hindsiliguri/v12/ijwXNR_neleXhm7m8r8hSdhpcE96_vWv.ttf';
