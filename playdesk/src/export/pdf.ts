import { jsPDF } from 'jspdf';
import { SHEET_WINDOW } from '../render';
import { svg2pdf } from 'svg2pdf.js';
import { cellRects, pageSize, paginate, wristbandPanels, PAGE_MARGIN } from '../sheets/layout';
import { wristbandCalls, type NumberedPlay } from '../sheets/resolve';
import type { SheetDoc } from '../sheets/types';
import {
  BRAND_FONTS,
  DEFAULT_BRANDING,
  logoFormat,
  offenseFill,
  textOn,
  type Branding,
} from '../library/branding';
import { downloadBlob, safeFilename } from './download';
import { fitAspect } from './fit';
import { aspect, playSvgElement } from './svg';

const TITLE_H = 0.3;

/** A vector PDF of the sheet, laid out exactly like the print preview. */
export async function buildSheetPdf(
  sheet: SheetDoc,
  calls: NumberedPlay[],
  branding: Branding = DEFAULT_BRANDING,
): Promise<jsPDF> {
  const font = BRAND_FONTS[branding.font].pdf;
  const orientation = sheet.kind === 'wristband' ? 'portrait' : sheet.orientation;
  const page = pageSize(orientation);
  const doc = new jsPDF({ orientation, unit: 'in', format: 'letter' });
  doc.setFont(font);

  // svg2pdf measures text, so the SVG has to be in the document while it converts.
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:400px;';
  document.body.appendChild(host);

  try {
    if (sheet.kind === 'wristband') {
      drawWristband(doc, sheet, calls, page, branding);
      return doc;
    }
    const rects = cellRects(sheet.perPage, sheet.orientation);
    const pages = paginate(calls, sheet.perPage);
    for (let pi = 0; pi < pages.length; pi++) {
      if (pi > 0) doc.addPage('letter', orientation);
      header(doc, branding, sheet.name, `Page ${pi + 1} of ${pages.length}`, page.w);
      const items = pages[pi]!;
      for (let i = 0; i < items.length; i++) {
        const r = rects[i]!;
        const item = items[i]!;
        doc.setDrawColor(150);
        doc.setLineWidth(0.01);
        doc.rect(r.x, r.y, r.w, r.h);
        doc.line(r.x, r.y + TITLE_H, r.x + r.w, r.y + TITLE_H);
        const fontSize = Math.min(13, r.h * 7, r.w * 4.5);
        doc.setFontSize(fontSize);
        doc.setFont(font, 'bold');
        // Call number on a team-colored tab.
        const numW = Math.max(0.34, doc.getTextWidth(String(item.number)) + 0.12);
        doc.setFillColor(branding.primary);
        doc.rect(r.x + 0.04, r.y + 0.04, numW, TITLE_H - 0.08, 'F');
        doc.setTextColor(textOn(branding.primary));
        doc.text(String(item.number), r.x + 0.04 + numW / 2, r.y + TITLE_H / 2, {
          align: 'center',
          baseline: 'middle',
        });
        doc.setTextColor(17);
        doc.text(
          truncate(doc, item.play.name, r.w - numW - 0.2),
          r.x + numW + 0.12,
          r.y + TITLE_H / 2,
          {
            baseline: 'middle',
          },
        );
        const box = fitAspect(
          { x: r.x + 0.02, y: r.y + TITLE_H + 0.02, w: r.w - 0.04, h: r.h - TITLE_H - 0.04 },
          aspect(SHEET_WINDOW),
        );
        const svg = playSvgElement(
          item.play,
          'whiteboard',
          SHEET_WINDOW,
          false,
          offenseFill(branding),
        );
        host.replaceChildren(svg);
        await svg2pdf(svg, doc, { x: box.x, y: box.y, width: box.w, height: box.h });
      }
    }
    return doc;
  } finally {
    host.remove();
  }
}

/** Logo, team name, title and page info, over a team-colored rule (matches SheetHeader). */
function header(doc: jsPDF, branding: Branding, title: string, right: string, pageW: number) {
  const font = BRAND_FONTS[branding.font].pdf;
  const top = 0.3;
  const h = 0.38;
  const mid = top + h / 2;
  let x = PAGE_MARGIN;
  if (branding.logo) {
    const props = doc.getImageProperties(branding.logo);
    const lh = 0.32;
    const lw = Math.min(1.2, (props.width / props.height) * lh);
    doc.addImage(branding.logo, logoFormat(branding.logo), x, mid - lh / 2, lw, lh);
    x += lw + 0.1;
  }
  if (branding.teamName) {
    doc.setFont(font, 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(branding.primary);
    doc.text(branding.teamName, x, mid, { baseline: 'middle' });
    x += doc.getTextWidth(branding.teamName) + 0.12;
  }
  doc.setFont(font, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(70);
  doc.text(title, x, mid, { baseline: 'middle' });
  doc.text(right, pageW - PAGE_MARGIN, mid, { align: 'right', baseline: 'middle' });
  doc.setDrawColor(branding.primary);
  doc.setLineWidth(0.02);
  doc.line(PAGE_MARGIN, top + h, pageW - PAGE_MARGIN, top + h);
  doc.setTextColor(17);
}

function truncate(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function drawWristband(
  doc: jsPDF,
  sheet: SheetDoc,
  calls: NumberedPlay[],
  page: { w: number; h: number },
  branding: Branding,
) {
  const font = BRAND_FONTS[branding.font].pdf;
  const { pages } = wristbandPanels(sheet.wristband);
  const { panels } = wristbandCalls(sheet, calls);
  const { rows, cols } = sheet.wristband;
  let idx = 0;
  pages.forEach((rects, pi) => {
    if (pi > 0) doc.addPage('letter', 'portrait');
    header(
      doc,
      branding,
      `${sheet.name}: cut along the dashed lines`,
      `${sheet.wristband.panelWidthIn}" x ${sheet.wristband.panelHeightIn}"`,
      page.w,
    );
    for (const r of rects) {
      const items = panels[idx++] ?? [];
      doc.setLineDashPattern([0.06, 0.04], 0);
      doc.setDrawColor(80);
      doc.setLineWidth(0.015);
      doc.rect(r.x, r.y, r.w, r.h);
      doc.setLineDashPattern([], 0);
      const cw = (r.w - 0.08) / cols;
      const rh = (r.h - 0.08) / rows;
      const fontSize = Math.min(14, rh * 72 * 0.5);
      doc.setFontSize(fontSize);
      for (let i = 0; i < rows * cols; i++) {
        const c = Math.floor(i / rows);
        const row = i % rows;
        const x = r.x + 0.04 + c * cw;
        const y = r.y + 0.04 + row * rh;
        doc.setDrawColor(205);
        doc.setLineWidth(0.008);
        doc.line(x, y + rh, x + cw - 0.04, y + rh);
        const call = items[i];
        if (!call) continue;
        doc.setFont(font, 'bold');
        doc.setTextColor(branding.primary);
        doc.text(String(call.number), x + 0.35, y + rh / 2, { align: 'right', baseline: 'middle' });
        doc.setTextColor(17);
        doc.setFont(font, 'normal');
        doc.text(truncate(doc, call.play.name, cw - 0.5), x + 0.42, y + rh / 2, {
          baseline: 'middle',
        });
      }
    }
  });
}

export async function exportSheetPdf(sheet: SheetDoc, calls: NumberedPlay[], branding: Branding) {
  const doc = await buildSheetPdf(sheet, calls, branding);
  downloadBlob(doc.output('blob'), safeFilename(sheet.name, 'pdf'));
}
