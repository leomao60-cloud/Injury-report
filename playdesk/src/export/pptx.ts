import PptxGenJS from 'pptxgenjs';
import type { FieldStyle, Play } from '../model';
import { DEFAULT_WINDOW, SHEET_WINDOW, type ViewWindow } from '../render';
import {
  cellRects,
  pageSize,
  paginate,
  PAGE_MARGIN,
  wristbandPanels,
  type Rect,
} from '../sheets/layout';
import { wristbandCalls, type NumberedPlay } from '../sheets/resolve';
import type { SheetDoc } from '../sheets/types';
import { downloadBlob, safeFilename } from './download';
import { diagramShapes, type Shape } from './shapes';

type Slide = PptxGenJS.Slide;

/** Add one play as native PowerPoint shapes, so coaches can edit it in PowerPoint. */
function addDiagram(
  pptx: PptxGenJS,
  slide: Slide,
  play: Play,
  style: FieldStyle,
  window: ViewWindow,
  box: Rect,
) {
  for (const s of diagramShapes(play, style, window, box)) addShape(pptx, slide, s);
}

function addShape(pptx: PptxGenJS, slide: Slide, s: Shape) {
  switch (s.kind) {
    case 'line': {
      slide.addShape(pptx.ShapeType.line, {
        x: Math.min(s.x1, s.x2),
        y: Math.min(s.y1, s.y2),
        w: Math.max(Math.abs(s.x2 - s.x1), 0.0001),
        h: Math.max(Math.abs(s.y2 - s.y1), 0.0001),
        flipH: s.x2 < s.x1,
        flipV: s.y2 < s.y1,
        line: {
          color: s.color,
          width: s.width,
          dashType: s.dash ? 'dash' : 'solid',
          endArrowType: s.arrow ? 'triangle' : undefined,
        },
        objectName: s.name,
      });
      return;
    }
    case 'rect':
    case 'ellipse': {
      const opts = {
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h,
        fill: s.fill ? { color: s.fill } : { type: 'none' as const },
        line: s.stroke ? { color: s.stroke, width: s.strokeW ?? 0.75 } : { type: 'none' as const },
        objectName: s.name,
      };
      const shape = s.kind === 'rect' ? pptx.ShapeType.rect : pptx.ShapeType.ellipse;
      if (s.text) {
        slide.addText(s.text, {
          ...opts,
          shape,
          color: s.textColor,
          fontSize: s.fontSize,
          bold: true,
          align: 'center',
          valign: 'middle',
          margin: 0,
          fontFace: 'Arial',
        });
      } else {
        slide.addShape(shape, opts);
      }
      return;
    }
    case 'text':
      slide.addText(s.text, {
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h,
        color: s.color,
        fontSize: s.fontSize,
        bold: s.bold,
        align: 'center',
        valign: 'middle',
        margin: 0,
        fontFace: 'Arial',
        objectName: s.name,
      });
  }
}

function newDeck(orientation: 'landscape' | 'portrait' | 'wide') {
  const pptx = new PptxGenJS();
  if (orientation === 'wide') {
    pptx.layout = 'LAYOUT_WIDE';
  } else {
    const page = pageSize(orientation);
    pptx.defineLayout({ name: `LETTER_${orientation}`, width: page.w, height: page.h });
    pptx.layout = `LETTER_${orientation}`;
  }
  pptx.author = 'Playdesk';
  return pptx;
}

async function save(pptx: PptxGenJS, name: string) {
  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  downloadBlob(blob, safeFilename(name, 'pptx'));
}

function titleText(slide: Slide, text: string, r: Rect, fontSize: number) {
  slide.addText(text, {
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
    fontSize,
    bold: true,
    fontFace: 'Arial',
    color: '111111',
    valign: 'middle',
    margin: 0.04,
  });
}

/** One play per slide (16:9). */
export function buildPlaysPptx(calls: NumberedPlay[], style: FieldStyle = 'whiteboard') {
  const pptx = newDeck('wide');
  for (const { number, play } of calls) {
    const slide = pptx.addSlide();
    titleText(
      slide,
      number ? `${number}  ${play.name}` : play.name,
      { x: 0.4, y: 0.2, w: 12.5, h: 0.6 },
      24,
    );
    addDiagram(pptx, slide, play, style, DEFAULT_WINDOW, { x: 0.4, y: 0.9, w: 12.53, h: 6.4 });
  }
  return pptx;
}

/** The sheet's own layout: 1, 2, 4 or 8 plays per slide, or wristband panels. */
export function buildSheetPptx(sheet: SheetDoc, calls: NumberedPlay[]) {
  if (sheet.kind === 'wristband') return buildWristbandPptx(sheet, calls);
  const pptx = newDeck(sheet.orientation);
  const rects = cellRects(sheet.perPage, sheet.orientation);
  const pages = paginate(calls, sheet.perPage);
  pages.forEach((items, pi) => {
    const slide = pptx.addSlide();
    slide.addText(`${sheet.name}    Page ${pi + 1} of ${pages.length}`, {
      x: PAGE_MARGIN,
      y: PAGE_MARGIN - 0.1,
      w: 6,
      h: 0.3,
      fontSize: 10,
      color: '444444',
      fontFace: 'Arial',
      margin: 0,
    });
    items.forEach((item, i) => {
      const r = rects[i]!;
      const titleH = 0.3;
      slide.addShape(pptx.ShapeType.rect, {
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        fill: { type: 'none' },
        line: { color: '999999', width: 0.75 },
      });
      titleText(
        slide,
        `${item.number}   ${item.play.name}`,
        { x: r.x, y: r.y, w: r.w, h: titleH },
        Math.min(13, r.h * 7, r.w * 4.5),
      );
      addDiagram(pptx, slide, item.play, 'whiteboard', SHEET_WINDOW, {
        x: r.x + 0.02,
        y: r.y + titleH,
        w: r.w - 0.04,
        h: r.h - titleH - 0.02,
      });
    });
  });
  return pptx;
}

function buildWristbandPptx(sheet: SheetDoc, calls: NumberedPlay[]) {
  const pptx = newDeck('portrait');
  const { pages } = wristbandPanels(sheet.wristband);
  const { panels } = wristbandCalls(sheet, calls);
  const { rows, cols } = sheet.wristband;
  let idx = 0;
  for (const rects of pages) {
    const slide = pptx.addSlide();
    slide.addText(`${sheet.name}: cut along the dashed lines`, {
      x: PAGE_MARGIN,
      y: PAGE_MARGIN - 0.1,
      w: 7,
      h: 0.3,
      fontSize: 10,
      color: '444444',
      fontFace: 'Arial',
      margin: 0,
    });
    for (const r of rects) {
      const items = panels[idx++] ?? [];
      const rowsData: PptxGenJS.TableRow[] = [];
      for (let row = 0; row < rows; row++) {
        const cells: PptxGenJS.TableCell[] = [];
        for (let c = 0; c < cols; c++) {
          const call = items[c * rows + row];
          cells.push({
            text: call ? String(call.number) : '',
            options: { bold: true, align: 'right' },
          });
          cells.push({ text: call ? call.play.name : '' });
        }
        rowsData.push(cells);
      }
      const numW = 0.4;
      const nameW = r.w / cols - numW;
      slide.addTable(rowsData, {
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        colW: Array.from({ length: cols }, () => [numW, nameW]).flat(),
        rowH: r.h / rows,
        fontSize: Math.min(14, (r.h / rows) * 72 * 0.5),
        fontFace: 'Arial',
        valign: 'middle',
        margin: 0.02,
        border: { type: 'dash', pt: 0.75, color: '555555' },
      });
    }
  }
  return pptx;
}

export async function exportSheetPptx(
  sheet: SheetDoc,
  calls: NumberedPlay[],
  mode: 'sheet' | 'slides' = 'sheet',
) {
  const pptx = mode === 'slides' ? buildPlaysPptx(calls) : buildSheetPptx(sheet, calls);
  await save(pptx, sheet.name);
}

export async function exportPlayPptx(play: Play, style: FieldStyle) {
  await save(buildPlaysPptx([{ number: 0, play }], style), play.name);
}
