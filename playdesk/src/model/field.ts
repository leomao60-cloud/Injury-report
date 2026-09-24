import type { BallOn, Level } from './types';

/** 160 feet. */
export const FIELD_WIDTH = 160 / 3;
export const CENTER_X = FIELD_WIDTH / 2;
/** Players are kept at least this far inside the sidelines. */
export const SIDELINE_MARGIN = 1;

/** Distance between the two hash lines, in yards. */
export const HASH_WIDTH: Record<Level, number> = {
  hs: 160 / 9, // 53'4" — field divided into thirds
  college: 40 / 3, // 40'0"
  nfl: 18.5 / 3, // 18'6"
};

export const HASH_WIDTH_NOTE: Record<Level, string> = {
  hs: 'Hashes 53′4″ apart (field split in thirds)',
  college: 'Hashes 40′ apart (60′ from each sideline)',
  nfl: 'Hashes 18′6″ apart (in line with the goal posts)',
};

export const LEVEL_NAMES: Record<Level, string> = {
  hs: 'High school',
  college: 'College',
  nfl: 'NFL',
};

export function hashXs(level: Level): { left: number; right: number } {
  const half = HASH_WIDTH[level] / 2;
  return { left: CENTER_X - half, right: CENTER_X + half };
}

export function ballXFor(level: Level, ballOn: BallOn): number {
  const h = hashXs(level);
  return round(ballOn === 'left' ? h.left : ballOn === 'right' ? h.right : CENTER_X);
}

/** Stored coordinates are rounded to 1/1000 yd so mirror/shift operations are exactly reversible. */
export function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function clampX(x: number): number {
  return clamp(x, SIDELINE_MARGIN, FIELD_WIDTH - SIDELINE_MARGIN);
}
