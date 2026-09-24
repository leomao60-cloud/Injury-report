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
import {
  BRAND_FONTS,
  DEFAULT_BRANDING,
  offenseFill,
  textOn,
  type Branding,
} from '../library/branding';
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
  fill?: string,
) {
  for (const s of diagramShapes(play, style, window, box, fill)) addShape(pptx, slide, s);
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

function newDeck(orientation: 'landscape' | 'portrait' | 'wide', branding: Branding) {
  const pptx = new PptxGenJS();
  if (orientation === 'wide') {
    pptx.layout = 'LAYOUT_WIDE';
  } else {
    const page = pageSize(orientation);
    pptx.defineLayout({ name: `LETTER_${orientation}`, width: page.w, height: page.h });
    pptx.layout = `LETTER_${orientation}`;
  }
  pptx.author = branding.teamName || 'Playdesk';
  if (branding.teamName) pptx.company = branding.teamName;
  pptx.theme = {
    headFontFace: BRAND_FONTS[branding.font].office,
    bodyFontFace: BRAND_FONTS[branding.font].office,
  };
  return pptx;
}

async function save(pptx: PptxGenJS, name: string) {
  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  downloadBlob(blob, safeFilename(name, 'pptx'));
}

const hex = (c: string) => c.replace('#', '');

/** Logo, team name and title across the top of a slide, over a team-colored rule. */
function slideHeader(
  pptx: PptxGenJS,
  slide: Slide,
  branding: Branding,
  title: string,
  right: string,
  width: number,
) {
  const face = BRAND_FONTS[branding.font].office;
  const top = 0.3;
  const h = 0.38;
  let x = PAGE_MARGIN;
  if (branding.logo) {
    slide.addImage({
      data: branding.logo,
      x,
      y: top + 0.03,
      h: 0.32,
      w: 0.32,
      sizing: { type: 'contain', w: 0.32, h: 0.32 },
    });
    x += 0.42;
  }
  const text: PptxGenJS.TextProps[] = [];
  if (branding.teamName) {
    text.push({
      text: `${branding.teamName}   `,
      options: { bold: true, color: hex(branding.primary), fontSize: 12 },
    });
  }
  text.push({ text: title, options: { color: '444444', fontSize: 10 } });
  slide.addText(text, {
    x,
    y: top,
    w: width - x - PAGE_MARGIN - 1.6,
    h,
    fontFace: face,
    margin: 0,
    valign: 'middle',
  });
  slide.addText(right, {
    x: width - PAGE_MARGIN - 1.6,
    y: top,
    w: 1.6,
    h,
    fontSize: 10,
    color: '444444',
    fontFace: face,
    margin: 0,
    align: 'right',
    valign: 'middle',
  });
  slide.addShape(pptx.ShapeType.line, {
    x: PAGE_MARGIN,
    y: top + h,
    w: width - 2 * PAGE_MARGIN,
    h: 0,
    line: { color: hex(branding.primary), width: 1.5 },
  });
}

/** "12  Play name" with the number on a team-colored tab. */
function callTitle(
  pptx: PptxGenJS,
  slide: Slide,
  branding: Branding,
  number: number,
  name: string,
  r: Rect,
  fontSize: number,
) {
  const face = BRAND_FONTS[branding.font].office;
  let x = r.x;
  if (number) {
    const numW = Math.max(0.36, (String(number).length * fontSize * 0.62) / 72 + 0.14);
    slide.addText(String(number), {
      shape: pptx.ShapeType.rect,
      x: r.x + 0.04,
      y: r.y + 0.04,
      w: numW,
      h: r.h - 0.08,
      fill: { color: hex(branding.primary) },
      color: hex(textOn(branding.primary)),
      fontSize,
      bold: true,
      fontFace: face,
      align: 'center',
      valign: 'middle',
      margin: 0,
    });
    x += numW + 0.1;
  }
  slide.addText(name, {
    x,
    y: r.y,
    w: r.x + r.w - x,
    h: r.h,
    fontSize,
    bold: true,
    fontFace: face,
    color: '111111',
    valign: 'middle',
    margin: 0.04,
  });
}

/** One play per slide (16:9). */
export function buildPlaysPptx(
  calls: NumberedPlay[],
  style: FieldStyle = 'whiteboard',
  branding: Branding = DEFAULT_BRANDING,
) {
  const pptx = newDeck('wide', branding);
  for (const { number, play } of calls) {
    const slide = pptx.addSlide();
    if (branding.logo) {
      slide.addImage({
        data: branding.logo,
        x: 12.2,
        y: 0.2,
        w: 0.7,
        h: 0.6,
        sizing: { type: 'contain', w: 0.7, h: 0.6 },
      });
    }
    callTitle(pptx, slide, branding, number, play.name, { x: 0.4, y: 0.2, w: 11.6, h: 0.6 }, 24);
    addDiagram(
      pptx,
      slide,
      play,
      style,
      DEFAULT_WINDOW,
      { x: 0.4, y: 0.9, w: 12.53, h: 6.4 },
      offenseFill(branding),
    );
  }
  return pptx;
}

/** The sheet's own layout: 1, 2, 4 or 8 plays per slide, or wristband panels. */
export function buildSheetPptx(
  sheet: SheetDoc,
  calls: NumberedPlay[],
  branding: Branding = DEFAULT_BRANDING,
) {
  if (sheet.kind === 'wristband') return buildWristbandPptx(sheet, calls, branding);
  const pptx = newDeck(sheet.orientation, branding);
  const page = pageSize(sheet.orientation);
  const rects = cellRects(sheet.perPage, sheet.orientation);
  const pages = paginate(calls, sheet.perPage);
  pages.forEach((items, pi) => {
    const slide = pptx.addSlide();
    slideHeader(pptx, slide, branding, sheet.name, `Page ${pi + 1} of ${pages.length}`, page.w);
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
      callTitle(
        pptx,
        slide,
        branding,
        item.number,
        item.play.name,
        { x: r.x, y: r.y, w: r.w, h: titleH },
        Math.min(13, r.h * 7, r.w * 4.5),
      );
      addDiagram(
        pptx,
        slide,
        item.play,
        'whiteboard',
        SHEET_WINDOW,
        { x: r.x + 0.02, y: r.y + titleH, w: r.w - 0.04, h: r.h - titleH - 0.02 },
        offenseFill(branding),
      );
    });
  });
  return pptx;
}

function buildWristbandPptx(sheet: SheetDoc, calls: NumberedPlay[], branding: Branding) {
  const pptx = newDeck('portrait', branding);
  const face = BRAND_FONTS[branding.font].office;
  const page = pageSize('portrait');
  const { pages } = wristbandPanels(sheet.wristband);
  const { panels } = wristbandCalls(sheet, calls);
  const { rows, cols } = sheet.wristband;
  let idx = 0;
  for (const rects of pages) {
    const slide = pptx.addSlide();
    slideHeader(
      pptx,
      slide,
      branding,
      `${sheet.name}: cut along the dashed lines`,
      `${sheet.wristband.panelWidthIn}" x ${sheet.wristband.panelHeightIn}"`,
      page.w,
    );
    for (const r of rects) {
      const items = panels[idx++] ?? [];
      const rowsData: PptxGenJS.TableRow[] = [];
      for (let row = 0; row < rows; row++) {
        const cells: PptxGenJS.TableCell[] = [];
        for (let c = 0; c < cols; c++) {
          const call = items[c * rows + row];
          cells.push({
            text: call ? String(call.number) : '',
            options: { bold: true, align: 'right', color: hex(branding.primary) },
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
        fontFace: face,
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
  mode: 'sheet' | 'slides',
  branding: Branding,
) {
  const pptx =
    mode === 'slides'
      ? buildPlaysPptx(calls, 'whiteboard', branding)
      : buildSheetPptx(sheet, calls, branding);
  await save(pptx, sheet.name);
}

export async function exportPlayPptx(play: Play, style: FieldStyle, branding: Branding) {
  await save(buildPlaysPptx([{ number: 0, play }], style, branding), play.name);
}

/** A whole playbook, one play per slide, in the order given. */
export async function exportPlaybookPptx(name: string, plays: Play[], branding: Branding) {
  await save(
    buildPlaysPptx(
      plays.map((play) => ({ number: 0, play })),
      'whiteboard',
      branding,
    ),
    name,
  );
}

/** The deck as base64, for inserting slides straight into an open PowerPoint presentation. */
export async function pptxBase64(pptx: PptxGenJS): Promise<string> {
  return (await pptx.write({ outputType: 'base64' })) as string;
}
