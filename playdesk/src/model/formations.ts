import type { FormationId, PlayerShape } from './types';

export interface FormationSpot {
  id: string;
  label: string;
  /** Yards from the ball, + is to the offense's right. */
  dx: number;
  /** Yards from the LOS (negative = backfield). */
  y: number;
  shape?: PlayerShape;
}

export interface Formation {
  id: FormationId;
  name: string;
  spots: FormationSpot[];
}

/** y for a player on the line of scrimmage. */
export const ON_LINE_Y = -1;
/** y for a receiver "off" the line (a step back). */
export const OFF_LINE_Y = -2;
/** Anything shallower than this counts as on the line. */
export const ON_LINE_THRESHOLD = -1.5;

/** Center-to-center spacing of the offensive line, in yards. */
export const OL_SPLIT = 2;

const OL: FormationSpot[] = [
  { id: 'lt', label: '', dx: -2 * OL_SPLIT, y: ON_LINE_Y },
  { id: 'lg', label: '', dx: -OL_SPLIT, y: ON_LINE_Y },
  { id: 'c', label: '', dx: 0, y: ON_LINE_Y, shape: 'square' },
  { id: 'rg', label: '', dx: OL_SPLIT, y: ON_LINE_Y },
  { id: 'rt', label: '', dx: 2 * OL_SPLIT, y: ON_LINE_Y },
];

export const FORMATIONS: Formation[] = [
  {
    id: 'doubles',
    name: 'Doubles',
    spots: [
      ...OL,
      { id: 'x', label: 'X', dx: -17, y: ON_LINE_Y },
      { id: 'h', label: 'H', dx: -10, y: OFF_LINE_Y },
      { id: 'y', label: 'Y', dx: 10, y: ON_LINE_Y },
      { id: 'z', label: 'Z', dx: 17, y: OFF_LINE_Y },
      { id: 'q', label: 'Q', dx: 0, y: -5 },
      { id: 'f', label: 'F', dx: 2, y: -5 },
    ],
  },
  {
    id: 'trips-rt',
    name: 'Trips Right',
    spots: [
      ...OL,
      { id: 'x', label: 'X', dx: -17, y: ON_LINE_Y },
      { id: 'y', label: 'Y', dx: 8.5, y: ON_LINE_Y },
      { id: 'h', label: 'H', dx: 12.5, y: OFF_LINE_Y },
      { id: 'z', label: 'Z', dx: 17, y: OFF_LINE_Y },
      { id: 'q', label: 'Q', dx: 0, y: -5 },
      { id: 'f', label: 'F', dx: -2, y: -5 },
    ],
  },
  {
    id: 'bunch-rt',
    name: 'Bunch Right',
    spots: [
      ...OL,
      { id: 'x', label: 'X', dx: -17, y: ON_LINE_Y },
      { id: 'y', label: 'Y', dx: 9, y: ON_LINE_Y },
      { id: 'h', label: 'H', dx: 7.5, y: -2.5 },
      { id: 'z', label: 'Z', dx: 10.5, y: -2.5 },
      { id: 'q', label: 'Q', dx: 0, y: -5 },
      { id: 'f', label: 'F', dx: -2, y: -5 },
    ],
  },
  {
    id: 'i-rt',
    name: 'I-Right',
    spots: [
      ...OL,
      { id: 'x', label: 'X', dx: -16, y: ON_LINE_Y },
      { id: 'y', label: 'Y', dx: 6, y: ON_LINE_Y },
      { id: 'z', label: 'Z', dx: 14, y: OFF_LINE_Y },
      { id: 'q', label: 'Q', dx: 0, y: -2.5 },
      { id: 'h', label: 'F', dx: 0, y: -5 },
      { id: 'f', label: 'T', dx: 0, y: -7.5 },
    ],
  },
  {
    id: 'empty-3x2',
    name: 'Empty 3x2',
    spots: [
      ...OL,
      { id: 'x', label: 'X', dx: -17, y: ON_LINE_Y },
      { id: 'f', label: 'F', dx: -10, y: OFF_LINE_Y },
      { id: 'y', label: 'Y', dx: 8.5, y: ON_LINE_Y },
      { id: 'h', label: 'H', dx: 12.5, y: OFF_LINE_Y },
      { id: 'z', label: 'Z', dx: 17, y: OFF_LINE_Y },
      { id: 'q', label: 'Q', dx: 0, y: -5 },
    ],
  },
];

export function getFormation(id: FormationId): Formation {
  const f = FORMATIONS.find((f) => f.id === id);
  if (!f) throw new Error(`Unknown formation: ${id}`);
  return f;
}
