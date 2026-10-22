import { newId } from '../model';
import { parseCsv } from './csv';
import {
  autoMap,
  FIELDS,
  readRows,
  type BreakdownRow,
  type ColumnMapping,
  type FieldKey,
} from './fields';
import { NO_FILTERS, RULES, type CutupTemplate, type RuleKind } from './cutups';

/** One imported game (or season) of tagged plays, kept as the file had it plus a column mapping. */
export interface Breakdown {
  id: string;
  name: string;
  importedAt: number;
  headers: string[];
  data: string[][];
  mapping: ColumnMapping;
}

export const MAX_ROWS = 5000;
export const MAX_COLUMNS = 80;
const MAX_CELL = 200;

export class BreakdownError extends Error {}

/** Turn CSV text into a breakdown. The first row must be the column headers. */
export function breakdownFromCsv(text: string, name: string): Breakdown {
  return breakdownFromRows(parseCsv(text), name);
}

/** Turn rows (from CSV or an Excel sheet) into a breakdown. The first row must be the column headers. */
export function breakdownFromRows(rows: string[][], name: string): Breakdown {
  if (rows.length < 2)
    throw new BreakdownError(
      'That file has no plays in it. The first row should be the column names.',
    );
  const headers = rows[0]!
    .slice(0, MAX_COLUMNS)
    .map((h, i) => h.trim().slice(0, 60) || `Column ${i + 1}`);
  if (rows.length - 1 > MAX_ROWS)
    throw new BreakdownError(`That file has more than ${MAX_ROWS} plays.`);
  const data = rows.slice(1).map((r) => headers.map((_, i) => (r[i] ?? '').slice(0, MAX_CELL)));
  const mapping = autoMap(headers);
  return {
    id: newId('bd'),
    name: name.slice(0, 80) || 'Breakdown',
    importedAt: Date.now(),
    headers,
    data,
    mapping,
  };
}

export function rowsOf(b: Breakdown): BreakdownRow[] {
  return readRows(b.headers, b.data, b.mapping);
}

/** How many of the important columns were found, for the import screen. */
export function mappedCount(m: ColumnMapping): number {
  return FIELDS.filter((f) => m[f.key] >= 0).length;
}

// ---------- validation of stored / imported data ----------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

export function sanitizeBreakdown(v: unknown): Breakdown | null {
  if (!isObj(v) || !Array.isArray(v.headers) || !Array.isArray(v.data)) return null;
  const headers = v.headers.slice(0, MAX_COLUMNS).map((h) => str(h, 60));
  const data = v.data
    .slice(0, MAX_ROWS)
    .filter(Array.isArray)
    .map((r) => headers.map((_, i) => str((r as unknown[])[i], MAX_CELL)));
  const m = isObj(v.mapping) ? v.mapping : {};
  const mapping = Object.fromEntries(
    FIELDS.map((f) => {
      const n = m[f.key];
      return [
        f.key,
        typeof n === 'number' && Number.isInteger(n) && n >= -1 && n < headers.length ? n : -1,
      ];
    }),
  ) as Record<FieldKey, number>;
  return {
    id: str(v.id, 60) || newId('bd'),
    name: str(v.name, 80) || 'Breakdown',
    importedAt:
      typeof v.importedAt === 'number' && Number.isFinite(v.importedAt) ? v.importedAt : Date.now(),
    headers,
    data,
    mapping,
  };
}

const ODK = ['O', 'D', 'K'] as const;
const KINDS = ['Run', 'Pass', 'Other'] as const;

export function sanitizeTemplate(v: unknown): CutupTemplate | null {
  if (!isObj(v)) return null;
  const f = isObj(v.filters) ? v.filters : {};
  const list = <T>(x: unknown, ok: (y: unknown) => y is T): T[] =>
    Array.isArray(x) ? x.filter(ok).slice(0, 20) : [];
  const ruleKinds = RULES.map((r) => r.kind) as string[];
  return {
    id: str(v.id, 60) || newId('cut'),
    name: str(v.name, 80) || 'Cutup',
    filters: {
      ...NO_FILTERS,
      odk: list(f.odk, (y): y is (typeof ODK)[number] => ODK.includes(y as never)),
      kinds: list(f.kinds, (y): y is (typeof KINDS)[number] => KINDS.includes(y as never)),
      downs: list(f.downs, (y): y is number => typeof y === 'number' && [1, 2, 3, 4].includes(y)),
      zones: list(f.zones, (y): y is string => typeof y === 'string').map((z) => z.slice(0, 30)),
      search: str(f.search, 60),
    },
    rules: list(
      v.rules,
      (y): y is RuleKind => typeof y === 'string' && ruleKinds.includes(y),
    ).slice(0, 5),
    numbered: v.numbered !== false,
    minPlays:
      typeof v.minPlays === 'number' && v.minPlays >= 0 && v.minPlays <= 50
        ? Math.floor(v.minPlays)
        : 1,
  };
}
