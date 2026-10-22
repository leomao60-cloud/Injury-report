/**
 * The breakdown columns Playdesk understands, the names Hudl, Qwikcut and coaches commonly use for
 * them, and how each value is read. Staffs name tags differently, so the import screen lets the
 * coach correct the automatic match; the mapping is saved with the breakdown.
 */
export type FieldKey =
  | 'playNo'
  | 'odk'
  | 'quarter'
  | 'down'
  | 'distance'
  | 'yardLine'
  | 'hash'
  | 'playType'
  | 'result'
  | 'gain'
  | 'personnel'
  | 'formation'
  | 'play'
  | 'motion'
  | 'defFront'
  | 'coverage'
  | 'blitz';

export interface FieldDef {
  key: FieldKey;
  label: string;
  /** Header names, compared after lowercasing and removing spaces and punctuation. */
  aliases: string[];
}

export const FIELDS: FieldDef[] = [
  {
    key: 'playNo',
    label: 'Play #',
    aliases: ['play#', 'playno', 'playnumber', 'clip', 'clip#', 'playid'],
  },
  { key: 'odk', label: 'O / D / K', aliases: ['odk', 'side', 'unit', 'phase'] },
  { key: 'quarter', label: 'Quarter', aliases: ['qtr', 'quarter', 'q', 'period'] },
  { key: 'down', label: 'Down', aliases: ['dn', 'down'] },
  { key: 'distance', label: 'Distance', aliases: ['dist', 'distance', 'togo', 'ytg', 'yardstogo'] },
  {
    key: 'yardLine',
    label: 'Yard line',
    aliases: ['yardln', 'yardline', 'yl', 'ydln', 'ballon', 'fieldposition', 'spot'],
  },
  { key: 'hash', label: 'Hash', aliases: ['hash', 'hashmark', 'ballposition'] },
  {
    key: 'playType',
    label: 'Play type (run / pass)',
    aliases: ['playtype', 'type', 'runpass', 'rp'],
  },
  { key: 'result', label: 'Result', aliases: ['result', 'outcome'] },
  {
    key: 'gain',
    label: 'Gain / loss',
    aliases: ['gnls', 'gainloss', 'gain', 'yards', 'yds', 'gn'],
  },
  {
    key: 'personnel',
    label: 'Personnel',
    aliases: ['personnel', 'pers', 'offpersonnel', 'offpers'],
  },
  {
    key: 'formation',
    label: 'Offensive formation',
    aliases: ['offform', 'formation', 'form', 'offformation'],
  },
  {
    key: 'play',
    label: 'Offensive play',
    aliases: ['offplay', 'playcall', 'playname', 'concept', 'call'],
  },
  { key: 'motion', label: 'Motion', aliases: ['motion', 'offmotion', 'shift'] },
  {
    key: 'defFront',
    label: 'Defensive front',
    aliases: ['deffront', 'front', 'defformation', 'defform'],
  },
  { key: 'coverage', label: 'Coverage', aliases: ['coverage', 'cov', 'defcoverage'] },
  { key: 'blitz', label: 'Blitz', aliases: ['blitz', 'pressure', 'defblitz'] },
];

/** Column index for each field, or -1 when the breakdown doesn't have it. */
export type ColumnMapping = Record<FieldKey, number>;

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9#]/g, '');

/** Match headers to fields by name. Exact alias matches win; each column is used once. */
export function autoMap(headers: string[]): ColumnMapping {
  const mapping = Object.fromEntries(FIELDS.map((f) => [f.key, -1])) as ColumnMapping;
  const used = new Set<number>();
  const normalized = headers.map(norm);
  for (const f of FIELDS) {
    for (const alias of f.aliases) {
      const i = normalized.findIndex(
        (h, idx) => !used.has(idx) && h === alias.replace(/[^a-z0-9#]/g, ''),
      );
      if (i >= 0) {
        mapping[f.key] = i;
        used.add(i);
        break;
      }
    }
  }
  return mapping;
}

// ---------- reading values ----------

export type Odk = 'O' | 'D' | 'K' | '';
export type PlayKind = 'Run' | 'Pass' | 'Other';
export type Hash = 'L' | 'M' | 'R' | '';

export interface BreakdownRow {
  /** Row number in the file, 1-based (after the header). */
  index: number;
  playNo: string;
  odk: Odk;
  quarter: number | null;
  down: number | null;
  distance: number | null;
  /** Yards to the goal line being attacked (1–99), or null if unknown. */
  toGoal: number | null;
  hash: Hash;
  /** The play type as tagged ("Run", "Pass", "Punt", "RPO" …). */
  playType: string;
  kind: PlayKind;
  result: string;
  gain: number | null;
  personnel: string;
  formation: string;
  play: string;
  motion: string;
  defFront: string;
  coverage: string;
  blitz: string;
  /** Every column, by header, for custom groupings. */
  raw: Record<string, string>;
}

const int = (s: string): number | null => {
  const m = /-?\d+/.exec(s.replace(/\s+/g, ''));
  return m ? Number(m[0]) : null;
};

export function parseOdk(s: string): Odk {
  const v = s.trim().toUpperCase();
  if (v.startsWith('O')) return 'O';
  if (v.startsWith('D')) return 'D';
  if (v.startsWith('K') || v.startsWith('S')) return 'K'; // kicking / special teams
  return '';
}

export function parseHash(s: string): Hash {
  const v = s.trim().toUpperCase();
  if (v.startsWith('L')) return 'L';
  if (v.startsWith('R')) return 'R';
  if (v.startsWith('M') || v.startsWith('C')) return 'M';
  return '';
}

/**
 * Yard line to yards-from-goal. Hudl style: negative = own territory ("-25" is your own 25),
 * positive = opponent's. Also reads "Own 25", "Opp 25", "O25", "+25" and "50".
 */
export function parseYardLine(s: string): number | null {
  const v = s.trim().toLowerCase();
  if (!v) return null;
  let m = /^(own|o|our|-)\s*(\d{1,2})$/.exec(v);
  if (m) return clampYard(100 - Number(m[2]));
  m = /^(opp|their|\+|x)\s*(\d{1,2})$/.exec(v);
  if (m) return clampYard(Number(m[2]));
  m = /^(\d{1,2})$/.exec(v);
  if (m) return clampYard(Number(m[1]));
  return null;
}
const clampYard = (n: number) => (n >= 1 && n <= 99 ? n : null);

export function parseKind(playType: string, odk: Odk): PlayKind {
  const v = playType.toLowerCase();
  if (odk === 'K') return 'Other';
  if (/\b(run|rush|draw|option|qb\s*keep|sweep)\b/.test(v)) return 'Run';
  if (/\b(pass|screen|rpo|sack|scramble|spike|throw)\b/.test(v)) return 'Pass';
  return 'Other';
}

export function readRows(
  headers: string[],
  data: string[][],
  mapping: ColumnMapping,
): BreakdownRow[] {
  const get = (r: string[], k: FieldKey) => (mapping[k] >= 0 ? (r[mapping[k]] ?? '').trim() : '');
  return data.map((r, i) => {
    const odk = parseOdk(get(r, 'odk'));
    const playType = get(r, 'playType');
    const down = int(get(r, 'down'));
    const raw: Record<string, string> = {};
    headers.forEach((h, c) => (raw[h] = (r[c] ?? '').trim()));
    return {
      index: i + 1,
      playNo: get(r, 'playNo') || String(i + 1),
      odk,
      quarter: int(get(r, 'quarter')),
      down: down !== null && down >= 1 && down <= 4 ? down : null,
      distance: int(get(r, 'distance')),
      toGoal: parseYardLine(get(r, 'yardLine')),
      hash: parseHash(get(r, 'hash')),
      playType,
      kind: parseKind(playType, odk),
      result: get(r, 'result'),
      gain: int(get(r, 'gain')),
      personnel: get(r, 'personnel'),
      formation: get(r, 'formation'),
      play: get(r, 'play'),
      motion: get(r, 'motion'),
      defFront: get(r, 'defFront'),
      coverage: get(r, 'coverage'),
      blitz: get(r, 'blitz'),
      raw,
    };
  });
}
