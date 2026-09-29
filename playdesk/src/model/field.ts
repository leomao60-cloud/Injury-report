import type { BallOn, GameType, Level } from './types';

/** Standard American field: 160 feet. */
export const FIELD_WIDTH = 160 / 3;
export const CENTER_X = FIELD_WIDTH / 2;
/** Players are kept at least this far inside the sidelines. */
export const SIDELINE_MARGIN = 1;

export interface FieldSpec {
  name: string;
  /** Width in yards. */
  width: number;
  /** Distance between the hash lines in yards; 0 means no hashes (the ball is always in the middle). */
  hashWidth: number;
  /** Line of scrimmage as a yard line on a real field, for the yard numbers. */
  losYardLine: number;
  /** Yard line at midfield (50 in American football, 55 in Canadian). */
  midfield: number;
  game: GameType;
  note: string;
}

export const FIELD_SPECS: Record<Level, FieldSpec> = {
  hs: {
    name: 'High school',
    width: FIELD_WIDTH,
    hashWidth: 160 / 9, // 53'4" — field divided into thirds
    losYardLine: 33,
    midfield: 50,
    game: 'eleven',
    note: 'Hashes 53′4″ apart (field split in thirds)',
  },
  college: {
    name: 'College',
    width: FIELD_WIDTH,
    hashWidth: 40 / 3, // 40'0"
    losYardLine: 33,
    midfield: 50,
    game: 'eleven',
    note: 'Hashes 40′ apart (60′ from each sideline)',
  },
  nfl: {
    name: 'NFL',
    width: FIELD_WIDTH,
    hashWidth: 18.5 / 3, // 18'6"
    losYardLine: 33,
    midfield: 50,
    game: 'eleven',
    note: 'Hashes 18′6″ apart (in line with the goal posts)',
  },
  cfl: {
    name: '12-man',
    width: 65,
    hashWidth: 17, // 24 yards in from each sideline
    losYardLine: 35,
    midfield: 55,
    game: 'twelve',
    note: 'Canadian field: 65 yards wide, hashes 24 yards in from each sideline, 12 players a side',
  },
  flag: {
    name: 'Flag (5v5)',
    width: 30,
    hashWidth: 0,
    losYardLine: 33,
    midfield: 50,
    game: 'flag5',
    note: 'Flag field: 30 yards wide, no hashes, 5 players a side',
  },
};

export const LEVELS = Object.keys(FIELD_SPECS) as Level[];

/** @deprecated use FIELD_SPECS[level].hashWidth */
export const HASH_WIDTH: Record<Level, number> = Object.fromEntries(
  LEVELS.map((l) => [l, FIELD_SPECS[l].hashWidth]),
) as Record<Level, number>;

export const HASH_WIDTH_NOTE: Record<Level, string> = Object.fromEntries(
  LEVELS.map((l) => [l, FIELD_SPECS[l].note]),
) as Record<Level, string>;

export const LEVEL_NAMES: Record<Level, string> = Object.fromEntries(
  LEVELS.map((l) => [l, FIELD_SPECS[l].name]),
) as Record<Level, string>;

export function fieldWidth(level: Level): number {
  return FIELD_SPECS[level].width;
}

export function gameFor(level: Level): GameType {
  return FIELD_SPECS[level].game;
}

export function hasHashes(level: Level): boolean {
  return FIELD_SPECS[level].hashWidth > 0;
}

export function hashXs(level: Level): { left: number; right: number } {
  const center = fieldWidth(level) / 2;
  const half = FIELD_SPECS[level].hashWidth / 2;
  return { left: center - half, right: center + half };
}

export function ballXFor(level: Level, ballOn: BallOn): number {
  const h = hashXs(level);
  const center = fieldWidth(level) / 2;
  return round(ballOn === 'left' ? h.left : ballOn === 'right' ? h.right : center);
}

/** Stored coordinates are rounded to 1/1000 yd so mirror/shift operations are exactly reversible. */
export function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function clampX(x: number, width: number = FIELD_WIDTH): number {
  return clamp(x, SIDELINE_MARGIN, width - SIDELINE_MARGIN);
}
