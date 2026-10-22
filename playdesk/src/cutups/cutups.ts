import type { BreakdownRow, Hash, Odk, PlayKind } from './fields';

// ---------- situation buckets ----------

export interface Bucket {
  id: string;
  label: string;
}

/** Field position, by yards from the goal line being attacked. */
export const FIELD_ZONES: (Bucket & { min: number; max: number })[] = [
  { id: 'coming-out', label: 'Coming out (own 1–20)', min: 80, max: 99 },
  { id: 'open-field', label: 'Open field (own 21 – opp 40)', min: 40, max: 79 },
  { id: 'plus', label: 'Plus territory (opp 39–21)', min: 21, max: 39 },
  { id: 'red-zone', label: 'Red zone (opp 20–11)', min: 11, max: 20 },
  { id: 'goal-line', label: 'Goal line (opp 10–1)', min: 1, max: 10 },
];

export function fieldZone(row: BreakdownRow): Bucket | null {
  if (row.toGoal === null) return null;
  return FIELD_ZONES.find((z) => row.toGoal! >= z.min && row.toGoal! <= z.max) ?? null;
}

export const DOWN_DISTANCES: Bucket[] = [
  { id: '1-long', label: '1st & 10+' },
  { id: '1-short', label: '1st & <10' },
  { id: '2-long', label: '2nd & 7+' },
  { id: '2-med', label: '2nd & 4–6' },
  { id: '2-short', label: '2nd & 1–3' },
  { id: '3-long', label: '3rd & 7+' },
  { id: '3-med', label: '3rd & 4–6' },
  { id: '3-short', label: '3rd & 1–3' },
  { id: '4', label: '4th down' },
];

export function downDistance(row: BreakdownRow): Bucket | null {
  const { down, distance } = row;
  if (down === null) return null;
  const id =
    down === 4
      ? '4'
      : down === 1
        ? distance !== null && distance < 10
          ? '1-short'
          : '1-long'
        : distance === null
          ? `${down}-med`
          : distance >= 7
            ? `${down}-long`
            : distance >= 4
              ? `${down}-med`
              : `${down}-short`;
  return DOWN_DISTANCES.find((b) => b.id === id) ?? null;
}

/** An efficient (successful) play: 40% of the distance on 1st down, 60% on 2nd, all of it on 3rd/4th. */
export function isEfficient(row: BreakdownRow): boolean | null {
  if (row.down === null || row.distance === null || row.gain === null || row.distance <= 0)
    return null;
  const need = row.down === 1 ? 0.4 : row.down === 2 ? 0.6 : 1;
  return row.gain >= row.distance * need;
}

// ---------- grouping rules ----------

export type RuleKind =
  | 'fieldPosition'
  | 'downDistance'
  | 'down'
  | 'hash'
  | 'quarter'
  | 'personnel'
  | 'formation'
  | 'kind'
  | 'playType'
  | 'play'
  | 'motion'
  | 'defFront'
  | 'coverage'
  | 'blitz'
  | 'result';

export const RULES: { kind: RuleKind; label: string }[] = [
  { kind: 'fieldPosition', label: 'Field position' },
  { kind: 'downDistance', label: 'Down & distance' },
  { kind: 'down', label: 'Down' },
  { kind: 'hash', label: 'Hash' },
  { kind: 'quarter', label: 'Quarter' },
  { kind: 'personnel', label: 'Personnel' },
  { kind: 'formation', label: 'Formation' },
  { kind: 'kind', label: 'Run / pass' },
  { kind: 'playType', label: 'Play type (as tagged)' },
  { kind: 'play', label: 'Play' },
  { kind: 'motion', label: 'Motion' },
  { kind: 'defFront', label: 'Defensive front' },
  { kind: 'coverage', label: 'Coverage' },
  { kind: 'blitz', label: 'Blitz' },
  { kind: 'result', label: 'Result' },
];

export const ruleLabel = (k: RuleKind) => RULES.find((r) => r.kind === k)?.label ?? k;

const HASH_NAMES: Record<Exclude<Hash, ''>, string> = {
  L: 'Left hash',
  M: 'Middle',
  R: 'Right hash',
};
const ORDINAL = ['', '1st down', '2nd down', '3rd down', '4th down'];
const BLANK = '(not tagged)';

/** Rules with a fixed list of groups: their folder numbers stay the same every week. */
const FIXED_NUMBERS: RuleKind[] = [
  'fieldPosition',
  'downDistance',
  'down',
  'hash',
  'quarter',
  'kind',
];

/** The group a row falls into for a rule. `order` keeps situation groups in football order. */
function groupOf(row: BreakdownRow, kind: RuleKind): { key: string; label: string; order: number } {
  const text = (v: string) => ({
    key: v.toLowerCase() || '~',
    label: v || BLANK,
    order: v ? 0 : 999,
  });
  switch (kind) {
    case 'fieldPosition': {
      const z = fieldZone(row);
      return z
        ? { key: z.id, label: z.label, order: FIELD_ZONES.findIndex((b) => b.id === z.id) }
        : text('');
    }
    case 'downDistance': {
      const b = downDistance(row);
      return b
        ? { key: b.id, label: b.label, order: DOWN_DISTANCES.findIndex((x) => x.id === b.id) }
        : text('');
    }
    case 'down':
      return row.down
        ? { key: String(row.down), label: ORDINAL[row.down]!, order: row.down }
        : text('');
    case 'hash':
      return row.hash
        ? { key: row.hash, label: HASH_NAMES[row.hash], order: 'LMR'.indexOf(row.hash) }
        : text('');
    case 'quarter':
      return row.quarter
        ? { key: String(row.quarter), label: `Quarter ${row.quarter}`, order: row.quarter }
        : text('');
    case 'kind':
      return { key: row.kind, label: row.kind, order: ['Run', 'Pass', 'Other'].indexOf(row.kind) };
    default:
      return text(row[kind]);
  }
}

// ---------- filters ----------

export interface CutupFilters {
  odk: Exclude<Odk, ''>[];
  kinds: PlayKind[];
  downs: number[];
  zones: string[];
  /** Free text matched against formation, play, personnel and play type. */
  search: string;
}

export const NO_FILTERS: CutupFilters = { odk: [], kinds: [], downs: [], zones: [], search: '' };

export function applyFilters(rows: BreakdownRow[], f: CutupFilters): BreakdownRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (f.odk.length === 0 || (r.odk !== '' && f.odk.includes(r.odk))) &&
      (f.kinds.length === 0 || f.kinds.includes(r.kind)) &&
      (f.downs.length === 0 || (r.down !== null && f.downs.includes(r.down))) &&
      (f.zones.length === 0 || f.zones.includes(fieldZone(r)?.id ?? '')) &&
      (!q ||
        [r.formation, r.play, r.personnel, r.playType].some((v) => v.toLowerCase().includes(q))),
  );
}

// ---------- tendencies ----------

export interface Share {
  label: string;
  count: number;
  pct: number;
}

export interface Tendencies {
  count: number;
  run: number;
  pass: number;
  other: number;
  runPct: number;
  passPct: number;
  avgRun: number | null;
  avgPass: number | null;
  /** Share of plays that were efficient, out of plays with down, distance and gain tagged. */
  efficiency: number | null;
  topFormations: Share[];
  topPlays: Share[];
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const avg = (xs: number[]) =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;

export function top(values: string[], n = 3): Share[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([label, count]) => ({ label, count, pct: pct(count, values.length) }));
}

export function tendencies(rows: BreakdownRow[]): Tendencies {
  const runs = rows.filter((r) => r.kind === 'Run');
  const passes = rows.filter((r) => r.kind === 'Pass');
  const scored = rows.map(isEfficient).filter((v): v is boolean => v !== null);
  const rp = runs.length + passes.length;
  return {
    count: rows.length,
    run: runs.length,
    pass: passes.length,
    other: rows.length - rp,
    runPct: pct(runs.length, rp),
    passPct: pct(passes.length, rp),
    avgRun: avg(runs.map((r) => r.gain).filter((g): g is number => g !== null)),
    avgPass: avg(passes.map((r) => r.gain).filter((g): g is number => g !== null)),
    efficiency: scored.length ? pct(scored.filter(Boolean).length, scored.length) : null,
    topFormations: top(rows.map((r) => r.formation)),
    topPlays: top(rows.map((r) => r.play)),
  };
}

/** One-line summary for title slides and the tree, e.g. "12 plays · 67% run · 5.2 avg run". */
export function summary(t: Tendencies): string {
  const parts = [`${t.count} play${t.count === 1 ? '' : 's'}`];
  if (t.run + t.pass > 0) parts.push(`${t.runPct}% run / ${t.passPct}% pass`);
  if (t.avgRun !== null) parts.push(`${t.avgRun} avg run`);
  if (t.avgPass !== null) parts.push(`${t.avgPass} avg pass`);
  if (t.efficiency !== null) parts.push(`${t.efficiency}% efficient`);
  return parts.join(' · ');
}

// ---------- the cutup tree ----------

export interface CutupTemplate {
  id: string;
  name: string;
  filters: CutupFilters;
  /** Grouping order, outermost first: e.g. field position → down & distance → formation. */
  rules: RuleKind[];
  /** Prefix folder names with numbers ("01 - Coming out") so they sort in order in any tool. */
  numbered: boolean;
  /** Drop groups with fewer plays than this (0 keeps everything). */
  minPlays: number;
  builtIn?: boolean;
}

export interface CutupNode {
  /** Stable path id, e.g. "red-zone/3-long". */
  id: string;
  label: string;
  /** Label with its number prefix when the template is numbered. */
  title: string;
  depth: number;
  rows: BreakdownRow[];
  stats: Tendencies;
  children: CutupNode[];
}

export function buildTree(rows: BreakdownRow[], template: CutupTemplate): CutupNode {
  const filtered = applyFilters(rows, template.filters);
  const build = (
    items: BreakdownRow[],
    depth: number,
    path: string,
    label: string,
    title: string,
  ): CutupNode => {
    const kind = template.rules[depth];
    const node: CutupNode = {
      id: path || 'all',
      label,
      title,
      depth,
      rows: items,
      stats: tendencies(items),
      children: [],
    };
    if (!kind) return node;
    const groups = new Map<string, { label: string; order: number; rows: BreakdownRow[] }>();
    for (const r of items) {
      const g = groupOf(r, kind);
      const entry = groups.get(g.key) ?? { label: g.label, order: g.order, rows: [] };
      entry.rows.push(r);
      groups.set(g.key, entry);
    }
    const sorted = [...groups.entries()]
      .filter(([, g]) => g.rows.length >= Math.max(1, template.minPlays))
      .sort(
        ([, a], [, b]) =>
          a.order - b.order || b.rows.length - a.rows.length || a.label.localeCompare(b.label),
      );
    const fixed = FIXED_NUMBERS.includes(kind);
    node.children = sorted.map(([key, g], i) => {
      // Situations keep their number (Red zone is always 04) so reports line up week to week;
      // other groups are numbered in the order shown. "Not tagged" folders get 99.
      const n =
        g.order === 999
          ? 99
          : fixed
            ? g.order + (kind === 'down' || kind === 'quarter' ? 0 : 1)
            : i + 1;
      const prefix = template.numbered ? `${String(n).padStart(2, '0')} - ` : '';
      return build(
        g.rows,
        depth + 1,
        path ? `${path}/${key}` : key,
        g.label,
        `${prefix}${g.label}`,
      );
    });
    return node;
  };
  return build(filtered, 0, '', template.name, template.name);
}

/** Every node, parents before children (the order of a cutup report). */
export function flatten(node: CutupNode): CutupNode[] {
  return [node, ...node.children.flatMap(flatten)];
}

// ---------- starter templates ----------

export const BUILT_IN_TEMPLATES: CutupTemplate[] = [
  {
    id: 'tpl-offensive-scout',
    name: 'Offensive scout',
    filters: { ...NO_FILTERS, odk: ['O'] },
    rules: ['fieldPosition', 'downDistance', 'formation'],
    numbered: true,
    minPlays: 1,
    builtIn: true,
  },
  {
    id: 'tpl-formation-tendencies',
    name: 'Formation tendencies',
    filters: { ...NO_FILTERS, odk: ['O'] },
    rules: ['formation', 'kind', 'play'],
    numbered: true,
    minPlays: 1,
    builtIn: true,
  },
  {
    id: 'tpl-third-down',
    name: 'Third down',
    filters: { ...NO_FILTERS, odk: ['O'], downs: [3] },
    rules: ['downDistance', 'formation', 'play'],
    numbered: true,
    minPlays: 1,
    builtIn: true,
  },
  {
    id: 'tpl-red-zone',
    name: 'Red zone & goal line',
    filters: { ...NO_FILTERS, odk: ['O'], zones: ['red-zone', 'goal-line'] },
    rules: ['fieldPosition', 'personnel', 'formation'],
    numbered: true,
    minPlays: 1,
    builtIn: true,
  },
  {
    id: 'tpl-defensive-scout',
    name: 'Defensive scout',
    filters: { ...NO_FILTERS, odk: ['D'] },
    rules: ['downDistance', 'defFront', 'coverage'],
    numbered: true,
    minPlays: 1,
    builtIn: true,
  },
];
