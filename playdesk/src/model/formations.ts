import type { FormationId, GameType, PlayerShape } from './types';

export interface FormationSpot {
  id: string;
  label: string;
  /** Yards from the ball, + is to the offense's right. */
  dx: number;
  /** Yards from the LOS (negative = backfield). */
  y: number;
  shape?: PlayerShape;
}

export type FormationGroup = 'Shotgun' | 'Under center' | 'Pistol' | 'Empty' | '12-man' | 'Flag';

export interface Formation {
  id: FormationId;
  name: string;
  game: GameType;
  group: FormationGroup;
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

/** Formation id used by plays that don't come from a base formation (special teams, custom looks). */
export const CUSTOM_FORMATION = 'custom';

const on = ON_LINE_Y;
const off = OFF_LINE_Y;
const s = (
  id: string,
  label: string,
  dx: number,
  y: number,
  shape?: PlayerShape,
): FormationSpot => ({
  id,
  label,
  dx,
  y,
  ...(shape ? { shape } : {}),
});

const OL: FormationSpot[] = [
  s('lt', '', -2 * OL_SPLIT, on),
  s('lg', '', -OL_SPLIT, on),
  s('c', '', 0, on, 'square'),
  s('rg', '', OL_SPLIT, on),
  s('rt', '', 2 * OL_SPLIT, on),
];

/** Every 11-man formation uses the same player ids (5 OL + q, x, y, z, h, f), so switching keeps lines attached. */
const ELEVEN: Formation[] = [
  {
    id: 'doubles',
    name: 'Doubles',
    game: 'eleven',
    group: 'Shotgun',
    spots: [
      ...OL,
      s('x', 'X', -17, on),
      s('h', 'H', -10, off),
      s('y', 'Y', 10, on),
      s('z', 'Z', 17, off),
      s('q', 'Q', 0, -5),
      s('f', 'F', 2, -5),
    ],
  },
  {
    id: 'trips-rt',
    name: 'Trips Right',
    game: 'eleven',
    group: 'Shotgun',
    spots: [
      ...OL,
      s('x', 'X', -17, on),
      s('y', 'Y', 8.5, on),
      s('h', 'H', 12.5, off),
      s('z', 'Z', 17, off),
      s('q', 'Q', 0, -5),
      s('f', 'F', -2, -5),
    ],
  },
  {
    id: 'bunch-rt',
    name: 'Bunch Right',
    game: 'eleven',
    group: 'Shotgun',
    spots: [
      ...OL,
      s('x', 'X', -17, on),
      s('y', 'Y', 9, on),
      s('h', 'H', 7.5, -2.5),
      s('z', 'Z', 10.5, -2.5),
      s('q', 'Q', 0, -5),
      s('f', 'F', -2, -5),
    ],
  },
  {
    id: 'trey-rt',
    name: 'Trey Right',
    game: 'eleven',
    group: 'Shotgun',
    spots: [
      ...OL,
      s('x', 'X', -17, on),
      s('y', 'Y', 6, on),
      s('h', 'H', 11, off),
      s('z', 'Z', 17, off),
      s('q', 'Q', 0, -5),
      s('f', 'F', -2, -5),
    ],
  },
  {
    id: 'twins-rt',
    name: 'Twins Right (split backs)',
    game: 'eleven',
    group: 'Shotgun',
    spots: [
      ...OL,
      s('y', 'Y', -6, on),
      s('x', 'X', 11, off),
      s('z', 'Z', 17, on),
      s('q', 'Q', 0, -5),
      s('h', 'H', -2, -5),
      s('f', 'F', 2, -5),
    ],
  },
  {
    id: 'empty-3x2',
    name: 'Empty 3x2',
    game: 'eleven',
    group: 'Empty',
    spots: [
      ...OL,
      s('x', 'X', -17, on),
      s('f', 'F', -10, off),
      s('y', 'Y', 8.5, on),
      s('h', 'H', 12.5, off),
      s('z', 'Z', 17, off),
      s('q', 'Q', 0, -5),
    ],
  },
  {
    id: 'quads-rt',
    name: 'Empty Quads Right',
    game: 'eleven',
    group: 'Empty',
    spots: [
      ...OL,
      s('x', 'X', -17, on),
      s('y', 'Y', 6, off),
      s('h', 'H', 10, off),
      s('f', 'F', 14, off),
      s('z', 'Z', 18, on),
      s('q', 'Q', 0, -5),
    ],
  },
  {
    id: 'pistol',
    name: 'Pistol Doubles',
    game: 'eleven',
    group: 'Pistol',
    spots: [
      ...OL,
      s('x', 'X', -17, on),
      s('h', 'H', -10, off),
      s('y', 'Y', 6, on),
      s('z', 'Z', 16, off),
      s('q', 'Q', 0, -4),
      s('f', 'F', 0, -7),
    ],
  },
  {
    id: 'i-rt',
    name: 'I-Right',
    game: 'eleven',
    group: 'Under center',
    spots: [
      ...OL,
      s('x', 'X', -16, on),
      s('y', 'Y', 6, on),
      s('z', 'Z', 14, off),
      s('q', 'Q', 0, -2.5),
      s('h', 'F', 0, -5),
      s('f', 'T', 0, -7.5),
    ],
  },
  {
    id: 'pro-rt',
    name: 'Pro Right (split backs)',
    game: 'eleven',
    group: 'Under center',
    spots: [
      ...OL,
      s('x', 'X', -16, on),
      s('y', 'Y', 6, on),
      s('z', 'Z', 15, off),
      s('q', 'Q', 0, -2.5),
      s('h', 'H', -2.5, -5.5),
      s('f', 'F', 2.5, -5.5),
    ],
  },
  {
    id: 'ace',
    name: 'Ace (2 TE, singleback)',
    game: 'eleven',
    group: 'Under center',
    spots: [
      ...OL,
      s('x', 'X', -17, off),
      s('h', 'H', -6, on),
      s('y', 'Y', 6, on),
      s('z', 'Z', 16, off),
      s('q', 'Q', 0, -2.5),
      s('f', 'T', 0, -7),
    ],
  },
  {
    id: 'power-i',
    name: 'Power I Right',
    game: 'eleven',
    group: 'Under center',
    spots: [
      ...OL,
      s('x', 'X', -14, on),
      s('y', 'Y', 6, on),
      s('q', 'Q', 0, -2.5),
      s('h', 'F', 0, -5),
      s('z', 'B', 2.5, -5),
      s('f', 'T', 0, -7.5),
    ],
  },
  {
    id: 'wishbone',
    name: 'Wishbone',
    game: 'eleven',
    group: 'Under center',
    spots: [
      ...OL,
      s('x', 'X', -14, on),
      s('y', 'Y', 6, on),
      s('q', 'Q', 0, -2.5),
      s('h', 'F', 0, -5),
      s('f', 'L', -2.5, -7),
      s('z', 'R', 2.5, -7),
    ],
  },
  {
    id: 'wing-t',
    name: 'Wing-T Right',
    game: 'eleven',
    group: 'Under center',
    spots: [
      ...OL,
      s('x', 'X', -12, on),
      s('y', 'Y', 6, on),
      s('z', 'W', 7.5, off),
      s('q', 'Q', 0, -2.5),
      s('h', 'F', 0, -5),
      s('f', 'H', -4, -5),
    ],
  },
];

/** 12-man (Canadian): 5 OL + q and six skill players (a is the extra slotback). */
const TWELVE: Formation[] = [
  {
    id: 'cfl-spread',
    name: 'Spread (12-man)',
    game: 'twelve',
    group: '12-man',
    spots: [
      ...OL,
      s('x', 'X', -24, on),
      s('a', 'A', -16, off),
      s('h', 'H', -8, off),
      s('y', 'Y', 8, off),
      s('z', 'Z', 24, on),
      s('q', 'Q', 0, -5),
      s('f', 'F', 2, -5),
    ],
  },
  {
    id: 'cfl-trips',
    name: 'Trips Right (12-man)',
    game: 'twelve',
    group: '12-man',
    spots: [
      ...OL,
      s('x', 'X', -24, on),
      s('a', 'A', -12, off),
      s('y', 'Y', 10, off),
      s('h', 'H', 17, off),
      s('z', 'Z', 24, on),
      s('q', 'Q', 0, -5),
      s('f', 'F', -2, -5),
    ],
  },
  {
    id: 'cfl-pro',
    name: 'Pro (12-man, TE)',
    game: 'twelve',
    group: '12-man',
    spots: [
      ...OL,
      s('x', 'X', -24, on),
      s('a', 'A', -15, off),
      s('h', 'H', -8, off),
      s('y', 'Y', 6, on),
      s('z', 'Z', 22, off),
      s('q', 'Q', 0, -2.5),
      s('f', 'F', 0, -6),
    ],
  },
];

/** 5v5 flag: center (snaps and is eligible), quarterback and three receivers. */
const FLAG: Formation[] = [
  {
    id: 'flag-2x1',
    name: 'Spread 2x1',
    game: 'flag5',
    group: 'Flag',
    spots: [
      s('c', 'C', 0, on, 'square'),
      s('x', 'X', -11, on),
      s('y', 'Y', 6, on),
      s('z', 'Z', 11, on),
      s('q', 'Q', 0, -5),
    ],
  },
  {
    id: 'flag-trips',
    name: 'Trips Right',
    game: 'flag5',
    group: 'Flag',
    spots: [
      s('c', 'C', 0, on, 'square'),
      s('y', 'Y', 4, -1.5),
      s('x', 'X', 8, on),
      s('z', 'Z', 12, on),
      s('q', 'Q', 0, -5),
    ],
  },
  {
    id: 'flag-stack',
    name: 'Stack Right',
    game: 'flag5',
    group: 'Flag',
    spots: [
      s('c', 'C', 0, on, 'square'),
      s('x', 'X', -11, on),
      s('y', 'Y', 7, on),
      s('z', 'Z', 7.5, -3),
      s('q', 'Q', 0, -5),
    ],
  },
  {
    id: 'flag-bunch',
    name: 'Bunch Right',
    game: 'flag5',
    group: 'Flag',
    spots: [
      s('c', 'C', 0, on, 'square'),
      s('y', 'Y', 6, on),
      s('x', 'X', 4.5, -2.5),
      s('z', 'Z', 7.5, -2.5),
      s('q', 'Q', 0, -5),
    ],
  },
  {
    id: 'flag-rb',
    name: 'Gun with a back',
    game: 'flag5',
    group: 'Flag',
    spots: [
      s('c', 'C', 0, on, 'square'),
      s('x', 'X', -11, on),
      s('z', 'Z', 11, on),
      s('q', 'Q', 0, -5),
      s('y', 'Y', 2, -5),
    ],
  },
];

export const FORMATIONS: Formation[] = [...ELEVEN, ...TWELVE, ...FLAG];

/** The formation a new play starts in for each game. */
export const DEFAULT_FORMATION: Record<GameType, FormationId> = {
  eleven: 'doubles',
  twelve: 'cfl-spread',
  flag5: 'flag-2x1',
};

export const PLAYERS_PER_SIDE: Record<GameType, number> = { eleven: 11, twelve: 12, flag5: 5 };

export function findFormation(id: FormationId): Formation | undefined {
  return FORMATIONS.find((f) => f.id === id);
}

export function getFormation(id: FormationId): Formation {
  const f = findFormation(id);
  if (!f) throw new Error(`Unknown formation: ${id}`);
  return f;
}

export function formationsFor(game: GameType): Formation[] {
  return FORMATIONS.filter((f) => f.game === game);
}
