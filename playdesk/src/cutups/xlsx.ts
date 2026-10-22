import JSZip from 'jszip';

/**
 * Reads the first worksheet of an Excel .xlsx file into rows of text, without a spreadsheet library:
 * an .xlsx is a zip of XML parts, and jszip is already part of the app. Handles shared strings,
 * inline and rich text, numbers, booleans, formula results and empty cells. Old binary .xls files
 * are not supported.
 */
export class XlsxError extends Error {}

/** Refuse parts that would unpack to more than this (protects against "zip bombs"). */
const MAX_PART_BYTES = 60 * 1024 * 1024;
const MAX_ROWS = 20000;
const MAX_COLS = 200;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeXml(s: string): string {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code =
          e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000
          ? String.fromCodePoint(code)
          : '';
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/_x([0-9a-f]{4})_/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

/** All text in <t> elements of a fragment (handles rich-text runs). */
function textOf(fragment: string): string {
  let out = '';
  for (const m of fragment.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1];
  return decodeXml(out);
}

/** "B12" → column index 1. */
export function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? '';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

async function part(zip: JSZip, path: string): Promise<string | null> {
  const f = zip.file(path);
  if (!f) return null;
  const size = (f as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
  if (typeof size === 'number' && size > MAX_PART_BYTES)
    throw new XlsxError('That spreadsheet is too large to open.');
  return f.async('string');
}

/** Path of the first worksheet, following workbook.xml and its relationships. */
async function firstSheetPath(zip: JSZip): Promise<string> {
  const workbook = await part(zip, 'xl/workbook.xml');
  const rels = await part(zip, 'xl/_rels/workbook.xml.rels');
  if (workbook && rels) {
    const sheet =
      /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook) ??
      /<sheet\b[^>]*\bid="([^"]+)"/.exec(workbook);
    if (sheet) {
      const rel = new RegExp(`<Relationship\\b[^>]*\\bId="${sheet[1]}"[^>]*>`).exec(rels)?.[0];
      const target = rel && /Target="([^"]+)"/.exec(rel)?.[1];
      if (target)
        return target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    }
  }
  const fallback = Object.keys(zip.files)
    .filter((n) => /^xl\/worksheets\/[^/]+\.xml$/.test(n))
    .sort()[0];
  if (!fallback) throw new XlsxError('That Excel file has no worksheets.');
  return fallback;
}

export async function readXlsx(data: ArrayBuffer | Uint8Array): Promise<string[][]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new XlsxError(
      'That file is not a valid .xlsx workbook. Older .xls files need to be saved as .xlsx or CSV.',
    );
  }
  const shared: string[] = [];
  const sst = await part(zip, 'xl/sharedStrings.xml');
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]!));

  const sheet = await part(zip, await firstSheetPath(zip));
  if (!sheet) throw new XlsxError('That Excel file has no worksheets.');

  const rows: string[][] = [];
  let width = 0;
  for (const rm of sheet.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    if (rows.length >= MAX_ROWS) throw new XlsxError(`That sheet has more than ${MAX_ROWS} rows.`);
    const rowNum = Number(/\br="(\d+)"/.exec(rm[1]!)?.[1] ?? rows.length + 1);
    while (rows.length < rowNum - 1) rows.push([]); // skipped (empty) rows
    const row: string[] = [];
    let next = 0;
    for (const cm of (rm[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1]!;
      const body = cm[2] ?? '';
      const ref = /\br="([A-Z]+\d+)"/i.exec(attrs)?.[1];
      const col = ref ? columnIndex(ref) : next;
      next = col + 1;
      if (col >= MAX_COLS) continue;
      const type = /\bt="(\w+)"/.exec(attrs)?.[1] ?? 'n';
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value = '';
      if (type === 's') value = v !== undefined ? (shared[Number(v)] ?? '') : '';
      else if (type === 'inlineStr') value = textOf(body);
      else if (type === 'b') value = v === '1' ? 'TRUE' : v === '0' ? 'FALSE' : '';
      else if (type === 'e') value = '';
      else value = v !== undefined ? decodeXml(v) : '';
      while (row.length < col) row.push('');
      row[col] = value;
    }
    width = Math.max(width, row.length);
    rows.push(row);
  }
  // Square the grid and drop empty rows (blank lines, the gap before the header in some exports).
  return rows
    .map((r) => [...r, ...Array<string>(width - r.length).fill('')])
    .filter((r) => r.some((c) => c.trim() !== ''));
}
