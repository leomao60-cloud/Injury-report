import type { FieldStyle, Play } from '../model';
import { DEFAULT_WINDOW } from '../render';
import { downloadBlob, safeFilename } from './download';
import { aspect, playSvgMarkup } from './svg';

/** PNG of a single play, 2400 px wide. */
export async function exportPlayPng(play: Play, style: FieldStyle, width = 2400): Promise<void> {
  const height = Math.round(width / aspect(DEFAULT_WINDOW));
  const markup = playSvgMarkup(play, style, DEFAULT_WINDOW).replace(
    '<svg ',
    `<svg width="${width}" height="${height}" `,
  );
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not draw the play'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('PNG encoding failed');
    downloadBlob(blob, safeFilename(play.name, 'png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
