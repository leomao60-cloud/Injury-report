import { clampX, round } from './field';
import { OL_SPLIT, ON_LINE_THRESHOLD } from './formations';
import type { DefenseId, Play, Player } from './types';

export interface DefenseFront {
  id: DefenseId;
  name: string;
}

export const DEFENSES: DefenseFront[] = [
  { id: '43-cover2', name: '4-3, two-deep (Cover 2)' },
  { id: '34-cover3', name: '3-4, three-deep (Cover 3)' },
  { id: '425-cover1', name: '4-2-5, man free (Cover 1)' },
];

export function isOnLine(p: Player): boolean {
  return p.side === 'offense' && p.y > ON_LINE_THRESHOLD;
}

/** Facts about the offense that every front aligns to. */
function readOffense(play: Play) {
  const b = play.ballX;
  const offense = play.players.filter((p) => p.side === 'offense');
  const left = offense.filter((p) => p.x < b - 0.25);
  const right = offense.filter((p) => p.x > b + 0.25);
  const strongRight = right.length >= left.length;
  const s = strongRight ? 1 : -1;

  const widestLeft = Math.min(...left.map((p) => p.x), b);
  const widestRight = Math.max(...right.map((p) => p.x), b);
  const cornerL = widestLeft < b - 6 ? widestLeft : b - 10;
  const cornerR = widestRight > b + 6 ? widestRight : b + 10;

  // Edge players line up outside the widest player on the line within 7 yards of the ball.
  const lineLeft = offense.filter((p) => isOnLine(p) && p.x < b && p.x > b - 7);
  const lineRight = offense.filter((p) => isOnLine(p) && p.x > b && p.x < b + 7);
  const edgeL = Math.min(...lineLeft.map((p) => p.x), b - 2 * OL_SPLIT) - 1.5;
  const edgeR = Math.max(...lineRight.map((p) => p.x), b + 2 * OL_SPLIT) + 1.5;

  // Second-widest receiver on the strong side (the slot), for the nickel.
  const strongSide = (strongRight ? right : left)
    .filter((p) => Math.abs(p.x - b) > 2 * OL_SPLIT + 0.5)
    .sort((a, c) => Math.abs(c.x - b) - Math.abs(a.x - b));
  const slot = strongSide[1]?.x ?? b + s * 8;

  return { b, offense, s, strongRight, cornerL, cornerR, edgeL, edgeR, slot };
}

const d = (id: string, label: string, x: number, y: number): Player => ({
  id,
  side: 'defense',
  label,
  shape: 'letter',
  x: round(clampX(x)),
  y,
});

function defenders(front: DefenseId, play: Play): Player[] {
  const o = readOffense(play);
  const { b, s, strongRight } = o;
  // Nose on the weak shade of the center, 3-technique outside the strong guard.
  const fourDown = [
    d('de-l', 'E', o.edgeL, 1),
    d('dt-l', strongRight ? 'N' : 'T', strongRight ? b - 0.6 : b - OL_SPLIT - 0.6, 1),
    d('dt-r', strongRight ? 'T' : 'N', strongRight ? b + OL_SPLIT + 0.6 : b + 0.6, 1),
    d('de-r', 'E', o.edgeR, 1),
  ];
  switch (front) {
    case '43-cover2':
      return [
        ...fourDown,
        d('lb-w', 'W', b - 4 * s, 5),
        d('lb-m', 'M', b, 5),
        d('lb-s', 'S', b + 4 * s, 5),
        d('cb-l', 'C', o.cornerL, 7),
        d('cb-r', 'C', o.cornerR, 7),
        d('ss', 'SS', b + 9 * s, 12),
        d('fs', 'FS', b - 9 * s, 12),
      ];
    case '34-cover3': {
      // Nose over the center, ends in 5-techniques outside the tackles, outside backers on the edge.
      const fiveTech = 2 * OL_SPLIT + 0.6;
      return [
        d('de-l', 'E', b - fiveTech, 1),
        d('nt', 'N', b, 1),
        d('de-r', 'E', b + fiveTech, 1),
        d('olb-l', strongRight ? 'W' : 'S', o.edgeL, 1.5),
        d('olb-r', strongRight ? 'S' : 'W', o.edgeR, 1.5),
        d('ilb-l', strongRight ? 'M' : 'B', b - 2.5, 5),
        d('ilb-r', strongRight ? 'B' : 'M', b + 2.5, 5),
        d('cb-l', 'C', o.cornerL, 8),
        d('cb-r', 'C', o.cornerR, 8),
        d('ss', 'SS', b + 8 * s, 7),
        d('fs', 'FS', b, 13),
      ];
    }
    case '425-cover1':
      return [
        ...fourDown,
        d('lb-w', 'W', b - 2.5 * s, 5),
        d('lb-m', 'M', b + 2.5 * s, 5),
        d('nb', 'NB', o.slot, 3),
        d('cb-l', 'C', o.cornerL, 2),
        d('cb-r', 'C', o.cornerR, 2),
        d('ss', 'SS', b - 5 * s, 8),
        d('fs', 'FS', b, 13),
      ];
  }
}

/**
 * Line up a defense against the offense. Corners go over the widest receiver on each side;
 * the strong-side players go to the side with more receivers.
 */
export function placeDefense(play: Play, front: DefenseId = play.defense ?? '43-cover2'): Play {
  const offense = play.players.filter((p) => p.side === 'offense');
  const oldDefenseIds = new Set(play.players.filter((p) => p.side === 'defense').map((p) => p.id));
  return {
    ...play,
    showDefense: true,
    defense: front,
    players: [...offense, ...defenders(front, play)],
    lines: play.lines.filter((l) => !oldDefenseIds.has(l.playerId)),
  };
}

export function removeDefense(play: Play): Play {
  const ids = new Set(play.players.filter((p) => p.side === 'defense').map((p) => p.id));
  return {
    ...play,
    showDefense: false,
    players: play.players.filter((p) => p.side !== 'defense'),
    lines: play.lines.filter((l) => !ids.has(l.playerId)),
  };
}

export function setShowDefense(play: Play, show: boolean): Play {
  return show ? placeDefense(play) : removeDefense(play);
}
