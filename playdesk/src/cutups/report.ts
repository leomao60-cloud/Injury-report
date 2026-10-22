import type PptxGenJS from 'pptxgenjs';
import {
  BRAND_FONTS,
  DEFAULT_BRANDING,
  offenseFill,
  textOn,
  type Branding,
} from '../library/branding';
import type { SavedPlay } from '../library/types';
import { addDiagram, newDeck, save } from '../export/pptx';
import { downloadBlob, safeFilename } from '../export/download';
import { SHEET_WINDOW } from '../render';
import { toCsv } from './csv';
import { flatten, summary, type CutupNode, type Share } from './cutups';
import { matchDiagram } from './match';

export interface ReportOptions {
  /** Deepest folder level that gets a title slide (1 = top level only). */
  maxDepth: number;
  /** Add a slide listing the plays in each bottom-level folder. */
  playLists: boolean;
  breakdownName: string;
}

const W = 13.333;
const H = 7.5;
const hex = (c: string) => c.replace('#', '');

/** "Red zone › 3rd & 7+ › Trips Rt" for a node, from the root's children down. */
function breadcrumbs(root: CutupNode): Map<CutupNode, string[]> {
  const out = new Map<CutupNode, string[]>();
  const walk = (n: CutupNode, trail: string[]) => {
    out.set(n, trail);
    for (const c of n.children) walk(c, [...trail, c.title]);
  };
  walk(root, []);
  return out;
}

function header(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  b: Branding,
  kicker: string,
  title: string,
) {
  const face = BRAND_FONTS[b.font].office;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: W,
    h: 0.12,
    fill: { color: hex(b.primary) },
    line: { type: 'none' },
  });
  if (b.logo)
    slide.addImage({
      data: b.logo,
      x: W - 1.1,
      y: 0.3,
      w: 0.7,
      h: 0.7,
      sizing: { type: 'contain', w: 0.7, h: 0.7 },
    });
  slide.addText(kicker, {
    x: 0.5,
    y: 0.3,
    w: W - 2,
    h: 0.35,
    fontFace: face,
    fontSize: 12,
    color: '666666',
    margin: 0,
  });
  slide.addText(title, {
    x: 0.5,
    y: 0.62,
    w: W - 2,
    h: 0.7,
    fontFace: face,
    fontSize: 30,
    bold: true,
    color: '111111',
    margin: 0,
    fit: 'shrink',
  });
}

function tile(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  b: Branding,
  x: number,
  y: number,
  value: string,
  label: string,
) {
  const face = BRAND_FONTS[b.font].office;
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w: 1.85,
    h: 1.05,
    fill: { color: 'F3F5F7' },
    line: { color: 'DDE2E7', width: 0.75 },
  });
  slide.addText(value, {
    x,
    y: y + 0.08,
    w: 1.85,
    h: 0.6,
    fontFace: face,
    fontSize: 26,
    bold: true,
    color: hex(b.primary),
    align: 'center',
    margin: 0,
  });
  slide.addText(label, {
    x,
    y: y + 0.66,
    w: 1.85,
    h: 0.3,
    fontFace: face,
    fontSize: 11,
    color: '555555',
    align: 'center',
    margin: 0,
  });
}

/** A ranked list with bars: "Trips Rt  9 (38%)". */
function shareList(
  slide: PptxGenJS.Slide,
  pptx: PptxGenJS,
  b: Branding,
  x: number,
  y: number,
  title: string,
  items: Share[],
) {
  const face = BRAND_FONTS[b.font].office;
  slide.addText(title, {
    x,
    y,
    w: 5.8,
    h: 0.35,
    fontFace: face,
    fontSize: 13,
    bold: true,
    color: '333333',
    margin: 0,
  });
  if (items.length === 0) {
    slide.addText('Not tagged', {
      x,
      y: y + 0.4,
      w: 5.8,
      h: 0.3,
      fontFace: face,
      fontSize: 11,
      color: '888888',
      margin: 0,
    });
    return;
  }
  items.forEach((it, i) => {
    const yy = y + 0.42 + i * 0.42;
    slide.addText(it.label, {
      x,
      y: yy,
      w: 2.6,
      h: 0.32,
      fontFace: face,
      fontSize: 12,
      color: '111111',
      margin: 0,
      fit: 'shrink',
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: x + 2.7,
      y: yy + 0.06,
      w: Math.max(0.05, (it.pct / 100) * 2.2),
      h: 0.2,
      fill: { color: hex(b.primary) },
      line: { type: 'none' },
    });
    slide.addText(`${it.count} (${it.pct}%)`, {
      x: x + 5.0,
      y: yy,
      w: 0.9,
      h: 0.32,
      fontFace: face,
      fontSize: 11,
      color: '444444',
      margin: 0,
    });
  });
}

export function buildCutupReport(
  root: CutupNode,
  library: SavedPlay[],
  opts: ReportOptions,
  branding: Branding = DEFAULT_BRANDING,
) {
  const pptx = newDeck('wide', branding);
  const face = BRAND_FONTS[branding.font].office;
  const crumbs = breadcrumbs(root);

  // Cover
  const cover = pptx.addSlide();
  cover.background = { color: hex(branding.primary) };
  const on = hex(textOn(branding.primary));
  if (branding.logo)
    cover.addImage({
      data: branding.logo,
      x: 0.7,
      y: 0.7,
      w: 1.4,
      h: 1.4,
      sizing: { type: 'contain', w: 1.4, h: 1.4 },
    });
  cover.addText(root.title, {
    x: 0.7,
    y: 2.6,
    w: W - 1.4,
    h: 1.2,
    fontFace: face,
    fontSize: 44,
    bold: true,
    color: on,
    margin: 0,
  });
  cover.addText(opts.breakdownName, {
    x: 0.7,
    y: 3.8,
    w: W - 1.4,
    h: 0.6,
    fontFace: face,
    fontSize: 22,
    color: on,
    margin: 0,
  });
  cover.addText(summary(root.stats), {
    x: 0.7,
    y: 4.5,
    w: W - 1.4,
    h: 0.5,
    fontFace: face,
    fontSize: 16,
    color: on,
    margin: 0,
  });
  if (branding.teamName)
    cover.addText(branding.teamName, {
      x: 0.7,
      y: H - 1,
      w: W - 1.4,
      h: 0.4,
      fontFace: face,
      fontSize: 14,
      color: on,
      margin: 0,
    });

  for (const node of flatten(root)) {
    if (node.depth === 0 || node.depth > opts.maxDepth) continue;
    const trail = crumbs.get(node) ?? [node.title];
    const slide = pptx.addSlide();
    header(slide, pptx, branding, trail.slice(0, -1).join('  ›  ') || root.title, node.title);
    const s = node.stats;
    const tiles: [string, string][] = [
      [String(s.count), s.count === 1 ? 'play' : 'plays'],
      [s.run + s.pass ? `${s.runPct}%` : '–', 'run'],
      [s.run + s.pass ? `${s.passPct}%` : '–', 'pass'],
      [s.avgRun === null ? '–' : String(s.avgRun), 'avg run'],
      [s.avgPass === null ? '–' : String(s.avgPass), 'avg pass'],
      [s.efficiency === null ? '–' : `${s.efficiency}%`, 'efficient'],
    ];
    tiles.forEach(([v, l], i) =>
      tile(slide, pptx, branding, 0.5 + (i % 3) * 2.0, 1.6 + Math.floor(i / 3) * 1.2, v, l),
    );
    shareList(slide, pptx, branding, 0.5, 4.15, 'Top formations', s.topFormations);
    shareList(slide, pptx, branding, 0.5, 5.75, 'Top plays', s.topPlays);

    const diagram = matchDiagram(s, library);
    if (diagram) {
      addDiagram(
        pptx,
        slide,
        diagram,
        'whiteboard',
        SHEET_WINDOW,
        { x: 6.9, y: 1.6, w: 5.9, h: 4.6 },
        offenseFill(branding),
      );
      slide.addText(`From your library: ${diagram.name}`, {
        x: 6.9,
        y: 6.3,
        w: 5.9,
        h: 0.35,
        fontFace: face,
        fontSize: 11,
        color: '666666',
        align: 'center',
        margin: 0,
      });
    }

    const isLeaf = node.children.length === 0 || node.depth === opts.maxDepth;
    if (opts.playLists && isLeaf) playListSlides(pptx, branding, node, trail);
  }
  return pptx;
}

const PER_SLIDE = 14;

function playListSlides(pptx: PptxGenJS, b: Branding, node: CutupNode, trail: string[]) {
  const face = BRAND_FONTS[b.font].office;
  for (let i = 0; i < node.rows.length; i += PER_SLIDE) {
    const slide = pptx.addSlide();
    const part =
      node.rows.length > PER_SLIDE
        ? ` (${i / PER_SLIDE + 1} of ${Math.ceil(node.rows.length / PER_SLIDE)})`
        : '';
    header(slide, pptx, b, trail.join('  ›  '), `Plays${part}`);
    const head = [
      'Play #',
      'Qtr',
      'Down & dist',
      'Yard ln',
      'Hash',
      'Formation',
      'Play',
      'Result',
      'Gain',
    ];
    const rows: PptxGenJS.TableRow[] = [
      head.map((h) => ({
        text: h,
        options: { bold: true, color: hex(textOn(b.primary)), fill: { color: hex(b.primary) } },
      })),
      ...node.rows
        .slice(i, i + PER_SLIDE)
        .map((r) =>
          [
            r.playNo,
            r.quarter ?? '',
            r.down ? `${r.down} & ${r.distance ?? '?'}` : '',
            r.toGoal === null
              ? ''
              : r.toGoal > 50
                ? `Own ${100 - r.toGoal}`
                : r.toGoal === 50
                  ? '50'
                  : `Opp ${r.toGoal}`,
            r.hash,
            r.formation,
            r.play,
            r.result || r.playType,
            r.gain ?? '',
          ].map((v) => ({ text: String(v) })),
        ),
    ];
    slide.addTable(rows, {
      x: 0.5,
      y: 1.55,
      w: W - 1,
      colW: [0.8, 0.55, 1.35, 1.0, 0.65, 2.6, 2.6, 1.95, 0.83],
      fontFace: face,
      fontSize: 11,
      rowH: 0.36,
      border: { type: 'solid', pt: 0.5, color: 'DDE2E7' },
      valign: 'middle',
    });
  }
}

export async function exportCutupReport(
  root: CutupNode,
  library: SavedPlay[],
  opts: ReportOptions,
  branding: Branding,
) {
  await save(
    buildCutupReport(root, library, opts, branding),
    `${root.title} - ${opts.breakdownName}`,
  );
}

/** The folder list with play numbers, to rebuild the same cutups in a video tool. */
export function cutupListCsv(root: CutupNode): string {
  const crumbs = breadcrumbs(root);
  const rows: (string | number)[][] = [['Folder', 'Plays', 'Summary', 'Play numbers']];
  for (const n of flatten(root)) {
    if (n.depth === 0) continue;
    rows.push([
      (crumbs.get(n) ?? [n.title]).join(' / '),
      n.rows.length,
      summary(n.stats),
      n.rows.map((r) => r.playNo).join(' '),
    ]);
  }
  return toCsv(rows);
}

export function downloadCutupList(root: CutupNode, breakdownName: string) {
  const blob = new Blob([cutupListCsv(root)], { type: 'text/csv' });
  downloadBlob(blob, safeFilename(`${root.title} - ${breakdownName}`, 'csv'));
}
