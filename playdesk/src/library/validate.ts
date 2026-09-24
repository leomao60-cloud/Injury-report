import { DEFENSES, FORMATIONS, type Play, type Player, type PlayLine, type Point } from '../model';
import { DEFAULT_WRISTBAND, type SheetDoc } from '../sheets/types';
import type { LibraryBackup, SavedPlay } from './types';

/**
 * Backups come from files the user picks, so treat them as untrusted:
 * check every field, cap sizes, and rebuild clean objects (no extra properties).
 */
export class BackupError extends Error {}

const MAX_PLAYS = 5000;
const MAX_PLAYERS = 30;
const MAX_LINES = 200;
const MAX_POINTS = 50;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, min: number, max: number): number => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
    throw new BackupError('Bad number');
  return v;
};
const str = (v: unknown, max: number): string => {
  if (typeof v !== 'string') throw new BackupError('Bad text');
  return v.slice(0, max);
};
const oneOf = <T extends string>(v: unknown, options: readonly T[]): T => {
  if (!options.includes(v as T)) throw new BackupError(`Unexpected value ${String(v)}`);
  return v as T;
};
const color = (v: unknown): string | undefined => {
  if (v === undefined) return undefined;
  const s = str(v, 20);
  if (!/^#[0-9a-f]{3,8}$/i.test(s)) throw new BackupError('Bad color');
  return s;
};
const arr = (v: unknown, max: number): unknown[] => {
  if (!Array.isArray(v) || v.length > max) throw new BackupError('Bad list');
  return v;
};

function point(v: unknown): Point {
  if (!isObj(v)) throw new BackupError('Bad point');
  return { x: num(v.x, -20, 80), y: num(v.y, -60, 120) };
}

function player(v: unknown): Player {
  if (!isObj(v)) throw new BackupError('Bad player');
  const p: Player = {
    id: str(v.id, 40),
    side: oneOf(v.side, ['offense', 'defense'] as const),
    label: str(v.label ?? '', 3),
    shape: oneOf(v.shape, ['circle', 'square', 'letter'] as const),
    ...point(v),
  };
  const c = color(v.color);
  if (c) p.color = c;
  return p;
}

function line(v: unknown): PlayLine {
  if (!isObj(v)) throw new BackupError('Bad line');
  const l: PlayLine = {
    id: str(v.id, 40),
    playerId: str(v.playerId, 40),
    type: oneOf(v.type, ['route', 'block', 'motion'] as const),
    points: arr(v.points, MAX_POINTS).map(point),
  };
  const c = color(v.color);
  if (c) l.color = c;
  if (v.curved === true) l.curved = true;
  return l;
}

export function validatePlay(v: unknown): Play {
  if (!isObj(v)) throw new BackupError('Bad play');
  const players = arr(v.players, MAX_PLAYERS).map(player);
  const ids = new Set(players.map((p) => p.id));
  return {
    id: str(v.id, 60),
    name: str(v.name, 80),
    level: oneOf(v.level, ['hs', 'college', 'nfl'] as const),
    ballOn: oneOf(v.ballOn, ['left', 'middle', 'right'] as const),
    ballX: num(v.ballX, 0, 60),
    formation: oneOf(
      v.formation,
      FORMATIONS.map((f) => f.id),
    ),
    showDefense: Boolean(v.showDefense),
    ...(v.defense === undefined
      ? {}
      : {
          defense: oneOf(
            v.defense,
            DEFENSES.map((f) => f.id),
          ),
        }),
    players,
    lines: arr(v.lines, MAX_LINES)
      .map(line)
      .filter((l) => ids.has(l.playerId)),
  };
}

function savedPlay(v: unknown): SavedPlay {
  if (!isObj(v)) throw new BackupError('Bad saved play');
  const play = validatePlay(v.play);
  const s: SavedPlay = {
    id: play.id,
    play,
    folder: str(v.folder, 40) || 'Offense',
    tags: arr(v.tags ?? [], 20).map((t) => str(t, 30)),
    createdAt: num(v.createdAt, 0, 1e14),
    updatedAt: num(v.updatedAt, 0, 1e14),
  };
  if (v.example === true) s.example = true;
  return s;
}

function sheet(v: unknown): SheetDoc {
  if (!isObj(v)) throw new BackupError('Bad sheet');
  const w = isObj(v.wristband) ? v.wristband : {};
  return {
    id: str(v.id, 60),
    name: str(v.name, 80),
    kind: oneOf(v.kind, ['sheet', 'wristband'] as const),
    playIds: arr(v.playIds, MAX_PLAYS).map((id) => str(id, 60)),
    perPage: num(v.perPage, 1, 8) as SheetDoc['perPage'],
    orientation: oneOf(v.orientation, ['landscape', 'portrait'] as const),
    startNumber: num(v.startNumber, 0, 9999),
    skip: arr(v.skip ?? [], 500).map((n) => num(n, 0, 99999)),
    wristband: {
      panelWidthIn: num(w.panelWidthIn ?? DEFAULT_WRISTBAND.panelWidthIn, 1, 11),
      panelHeightIn: num(w.panelHeightIn ?? DEFAULT_WRISTBAND.panelHeightIn, 1, 8.5),
      panels: num(w.panels ?? DEFAULT_WRISTBAND.panels, 1, 6),
      rows: num(w.rows ?? DEFAULT_WRISTBAND.rows, 1, 20),
      cols: num(w.cols ?? DEFAULT_WRISTBAND.cols, 1, 6),
    },
    updatedAt: num(v.updatedAt, 0, 1e14),
  };
}

export function validateBackup(v: unknown): LibraryBackup {
  if (!isObj(v) || v.app !== 'playdesk')
    throw new BackupError('This is not a Playdesk backup file.');
  if (v.version !== 1)
    throw new BackupError('This backup was made by a newer version of Playdesk.');
  try {
    return {
      app: 'playdesk',
      version: 1,
      exportedAt: str(v.exportedAt ?? '', 40),
      plays: arr(v.plays, MAX_PLAYS).map(savedPlay),
      folders: arr(v.folders ?? [], 100)
        .map((f) => str(f, 40))
        .filter(Boolean),
      sheets: arr(v.sheets ?? [], 1000).map(sheet),
    };
  } catch (e) {
    if (e instanceof BackupError)
      throw new BackupError(`The backup file is damaged (${e.message}).`);
    throw e;
  }
}
