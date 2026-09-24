import { jsPDF } from 'jspdf';
import { SHEET_WINDOW } from '../render';
import { svg2pdf } from 'svg2pdf.js';
import { cellRects, pageSize, paginate, wristbandPanels, PAGE_MARGIN } from '../sheets/layout';
import { wristbandCalls, type NumberedPlay } from '../sheets/resolve';
import type { SheetDoc } from '../sheets/types';
import { downloadBlob, safeFilename } from './download';
import { fitAspect } from './fit';
import { aspect, playSvgElement } from './svg';

const TITLE_H = 0.3;

/** A vector PDF of the sheet, laid out exactly like the print preview. */
export async function buildSheetPdf(sheet: SheetDoc, calls: NumberedPlay[]): Promise<jsPDF> {
  const orientation = sheet.kind === 'wristband' ? 'portrait' : sheet.orientation;
  const page = pageSize(orientation);
  const doc = new jsPDF({ orientation, unit: 'in', format: 'letter' });
  doc.setFont('helvetica');

  // svg2pdf measures text, so the SVG has to be in the document while it converts.
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:400px;';
  document.body.appendChild(host);

  try {
    if (sheet.kind === 'wristband') {
      drawWristband(doc, sheet, calls, page);
      return doc;
    }
    const rects = cellRects(sheet.perPage, sheet.orientation);
    const pages = paginate(calls, sheet.perPage);
    for (let pi = 0; pi < pages.length; pi++) {
      if (pi > 0) doc.addPage('letter', orientation);
      header(doc, sheet.name, `Page ${pi + 1} of ${pages.length}`, page.w);
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
        doc.setFont('helvetica', 'bold');
        doc.text(String(item.number), r.x + 0.08, r.y + TITLE_H / 2, { baseline: 'middle' });
        doc.text(truncate(doc, item.play.name, r.w - 0.6), r.x + 0.45, r.y + TITLE_H / 2, {
          baseline: 'middle',
        });
        const box = fitAspect(
          { x: r.x + 0.02, y: r.y + TITLE_H + 0.02, w: r.w - 0.04, h: r.h - TITLE_H - 0.04 },
          aspect(SHEET_WINDOW),
        );
        const svg = playSvgElement(item.play, 'whiteboard', SHEET_WINDOW, false);
        host.replaceChildren(svg);
        await svg2pdf(svg, doc, { x: box.x, y: box.y, width: box.w, height: box.h });
      }
    }
    return doc;
  } finally {
    host.remove();
  }
}

function header(doc: jsPDF, left: string, right: string, pageW: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(left, PAGE_MARGIN, PAGE_MARGIN + 0.12);
  doc.text(right, pageW - PAGE_MARGIN, PAGE_MARGIN + 0.12, { align: 'right' });
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
) {
  const { pages } = wristbandPanels(sheet.wristband);
  const { panels } = wristbandCalls(sheet, calls);
  const { rows, cols } = sheet.wristband;
  let idx = 0;
  pages.forEach((rects, pi) => {
    if (pi > 0) doc.addPage('letter', 'portrait');
    header(
      doc,
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
        doc.setFont('helvetica', 'bold');
        doc.text(String(call.number), x + 0.35, y + rh / 2, { align: 'right', baseline: 'middle' });
        doc.setFont('helvetica', 'normal');
        doc.text(truncate(doc, call.play.name, cw - 0.5), x + 0.42, y + rh / 2, {
          baseline: 'middle',
        });
      }
    }
  });
}

export async function exportSheetPdf(sheet: SheetDoc, calls: NumberedPlay[]) {
  const doc = await buildSheetPdf(sheet, calls);
  downloadBlob(doc.output('blob'), safeFilename(sheet.name, 'pdf'));
}
