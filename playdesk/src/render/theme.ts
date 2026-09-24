import type { FieldStyle } from '../model';

/**
 * Field drawings use fixed colors (not CSS variables) so they look the same on screen,
 * in print and in exported files.
 */
export interface DiagramColors {
  background: string;
  fieldLine: string;
  yardNumber: string;
  los: string;
  playerFill: string;
  playerStroke: string;
  playerText: string;
  defense: string;
  line: string;
  selected: string;
}

export const DIAGRAM_COLORS: Record<FieldStyle, DiagramColors> = {
  turf: {
    background: '#2e7d45',
    fieldLine: 'rgba(255,255,255,0.75)',
    yardNumber: 'rgba(255,255,255,0.35)',
    los: '#2f6fed',
    playerFill: '#ffffff',
    playerStroke: '#0d1b2a',
    playerText: '#0d1b2a',
    defense: '#ffd7d4',
    line: '#ffffff',
    selected: '#ff8a00',
  },
  whiteboard: {
    background: '#ffffff',
    fieldLine: '#c9d1da',
    yardNumber: '#b5bfca',
    los: '#2f6fed',
    playerFill: '#ffffff',
    playerStroke: '#111111',
    playerText: '#111111',
    defense: '#d62828',
    line: '#111111',
    selected: '#ff8a00',
  },
};

export const PLAYER_RADIUS = 0.75;
/** Fonts every PDF and PowerPoint reader has, so exported drawings match the screen. */
// Lowercase 'helvetica' first: it is the name the PDF converter (svg2pdf/jsPDF) recognises.
export const DIAGRAM_FONT = 'helvetica, Arial, sans-serif';
export const LINE_WIDTH = 0.22;

/** Pick black or white label text for a fill color. */
export function readableText(fill: string, dark: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(fill);
  if (!m) return dark;
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140 ? '#ffffff' : dark;
}
