import { newId } from '../model';
import {
  DEFAULT_WRISTBAND,
  type Orientation,
  type PerPage,
  type SheetDoc,
  type WristbandSettings,
} from './types';

/** US Letter, in inches. */
export const LETTER = { short: 8.5, long: 11 };
export const PAGE_MARGIN = 0.4;
export const HEADER_HEIGHT = 0.35;
export const CELL_GAP = 0.15;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function pageSize(orientation: Orientation) {
  return orientation === 'landscape'
    ? { w: LETTER.long, h: LETTER.short }
    : { w: LETTER.short, h: LETTER.long };
}

/**
 * Rows and columns for a page. Play diagrams are wide (about 2.3 : 1), so
 * grids stack plays vertically to keep each cell wider than it is tall.
 */
export function gridFor(
  perPage: PerPage,
  orientation: Orientation,
): { rows: number; cols: number } {
  switch (perPage) {
    case 1:
      return { rows: 1, cols: 1 };
    case 2:
      return { rows: 2, cols: 1 };
    case 4:
      return orientation === 'landscape' ? { rows: 2, cols: 2 } : { rows: 4, cols: 1 };
    case 8:
      return { rows: 4, cols: 2 };
  }
}

/** Cell rectangles (in inches, from the page's top-left) in reading order. */
export function cellRects(perPage: PerPage, orientation: Orientation): Rect[] {
  const page = pageSize(orientation);
  const { rows, cols } = gridFor(perPage, orientation);
  const top = PAGE_MARGIN + HEADER_HEIGHT;
  const w = (page.w - 2 * PAGE_MARGIN - (cols - 1) * CELL_GAP) / cols;
  const h = (page.h - top - PAGE_MARGIN - (rows - 1) * CELL_GAP) / rows;
  const rects: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({ x: PAGE_MARGIN + c * (w + CELL_GAP), y: top + r * (h + CELL_GAP), w, h });
    }
  }
  return rects;
}

/** Call numbers for `count` plays, starting at `start` and never using a skipped number. */
export function numberPlays(count: number, start: number, skip: number[] = []): number[] {
  const skipped = new Set(skip);
  const out: number[] = [];
  let n = start;
  while (out.length < count) {
    if (!skipped.has(n)) out.push(n);
    n++;
  }
  return out;
}

export function paginate<T>(items: T[], perPage: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage));
  return pages.length ? pages : [[]];
}

/** "13, 20-22" → [13, 20, 21, 22] */
export function parseNumberList(text: string): number[] {
  const out = new Set<number>();
  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const range = /^(\d+)-(\d+)$/.exec(part);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (let n = Math.min(a, b); n <= Math.max(a, b) && n - Math.min(a, b) < 500; n++) out.add(n);
    } else if (/^\d+$/.test(part)) out.add(Number(part));
  }
  return [...out].sort((a, b) => a - b);
}

export function formatNumberList(nums: number[]): string {
  return nums.join(', ');
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item as T);
  return next;
}

// ---------- wristbands ----------

export const WRISTBAND_GAP = 0.25;

/** Panels stacked down a Letter portrait page, as many as fit per page. */
export function wristbandPanels(w: WristbandSettings): { pages: Rect[][]; perPage: number } {
  const page = pageSize('portrait');
  const fit = Math.max(
    1,
    Math.floor(
      (page.h - 2 * PAGE_MARGIN - HEADER_HEIGHT + WRISTBAND_GAP) /
        (w.panelHeightIn + WRISTBAND_GAP),
    ),
  );
  const rects: Rect[] = [];
  for (let i = 0; i < w.panels; i++) {
    const slot = i % fit;
    rects.push({
      x: (page.w - w.panelWidthIn) / 2,
      y: PAGE_MARGIN + HEADER_HEIGHT + slot * (w.panelHeightIn + WRISTBAND_GAP),
      w: w.panelWidthIn,
      h: w.panelHeightIn,
    });
  }
  return { pages: paginate(rects, fit), perPage: fit };
}

export function callsPerPanel(w: WristbandSettings) {
  return w.rows * w.cols;
}

export function newSheet(kind: SheetDoc['kind'] = 'sheet'): SheetDoc {
  return {
    id: newId('sheet'),
    name: kind === 'sheet' ? 'Call sheet' : 'QB wristband',
    kind,
    playIds: [],
    perPage: 4,
    orientation: 'landscape',
    startNumber: 1,
    skip: [],
    wristband: { ...DEFAULT_WRISTBAND },
    updatedAt: Date.now(),
  };
}
