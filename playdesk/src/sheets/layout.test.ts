import { describe, expect, it } from 'vitest';
import { DEFAULT_WRISTBAND } from './types';
import {
  PAGE_MARGIN,
  cellRects,
  gridFor,
  moveItem,
  numberPlays,
  pageSize,
  paginate,
  parseNumberList,
  wristbandPanels,
} from './layout';

describe('numbering', () => {
  it('numbers from the start number', () => {
    expect(numberPlays(4, 1)).toEqual([1, 2, 3, 4]);
    expect(numberPlays(3, 20)).toEqual([20, 21, 22]);
  });

  it('skips numbers', () => {
    expect(numberPlays(5, 10, [13, 11])).toEqual([10, 12, 14, 15, 16]);
  });

  it('parses skip lists with ranges', () => {
    expect(parseNumberList('13, 20-22 5')).toEqual([5, 13, 20, 21, 22]);
    expect(parseNumberList('abc, -3')).toEqual([]);
  });
});

describe('page layout', () => {
  it.each([1, 2, 4, 8] as const)('gives %i cells that fit on a Letter page', (n) => {
    for (const o of ['landscape', 'portrait'] as const) {
      const page = pageSize(o);
      const rects = cellRects(n, o);
      expect(rects).toHaveLength(n);
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(PAGE_MARGIN - 1e-9);
        expect(r.y).toBeGreaterThanOrEqual(PAGE_MARGIN);
        expect(r.x + r.w).toBeLessThanOrEqual(page.w - PAGE_MARGIN + 1e-9);
        expect(r.y + r.h).toBeLessThanOrEqual(page.h - PAGE_MARGIN + 1e-9);
      }
    }
  });

  it('keeps cells wider than tall so diagrams stay large', () => {
    for (const n of [1, 2, 4, 8] as const) {
      for (const o of ['landscape', 'portrait'] as const) {
        if (n === 1 && o === 'portrait') continue; // a full portrait page is tall by nature
        for (const r of cellRects(n, o)) expect(r.w / r.h).toBeGreaterThan(1);
      }
    }
    expect(gridFor(8, 'landscape')).toEqual({ rows: 4, cols: 2 });
    expect(gridFor(4, 'portrait')).toEqual({ rows: 4, cols: 1 });
  });

  it('lays cells out in reading order', () => {
    const [a, b, c] = cellRects(4, 'landscape');
    expect(b!.x).toBeGreaterThan(a!.x);
    expect(b!.y).toBe(a!.y);
    expect(c!.y).toBeGreaterThan(a!.y);
  });

  it('paginates', () => {
    expect(paginate([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(paginate([], 4)).toEqual([[]]);
  });

  it('reorders items', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
});

describe('wristbands', () => {
  it('fits the default 3-panel wristband on one page at its real size', () => {
    const { pages } = wristbandPanels(DEFAULT_WRISTBAND);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(3);
    expect(pages[0]![0]!.w).toBe(DEFAULT_WRISTBAND.panelWidthIn);
    expect(pages[0]![0]!.h).toBe(DEFAULT_WRISTBAND.panelHeightIn);
  });

  it('spills extra panels onto more pages', () => {
    const { pages } = wristbandPanels({ ...DEFAULT_WRISTBAND, panels: 6, panelHeightIn: 3 });
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flat()).toHaveLength(6);
  });
});
