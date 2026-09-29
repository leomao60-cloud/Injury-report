import { clampX, fieldWidth, gameFor, round } from './field';
import { OL_SPLIT, ON_LINE_THRESHOLD } from './formations';
import type { DefenseId, GameType, Play, Player } from './types';

export interface DefenseFront {
  id: DefenseId;
  name: string;
  game: GameType;
}

export const DEFENSES: DefenseFront[] = [
  { id: '43-cover2', name: '4-3, two-deep (Cover 2)', game: 'eleven' },
  { id: '34-cover3', name: '3-4, three-deep (Cover 3)', game: 'eleven' },
  { id: '425-cover1', name: '4-2-5 nickel, man free (Cover 1)', game: 'eleven' },
  { id: '416-cover4', name: '4-1-6 dime, quarters (Cover 4)', game: 'eleven' },
  { id: '62-goalline', name: '6-2 goal line', game: 'eleven' },
  { id: 'cfl-43', name: '4-3 with halfbacks (12-man)', game: 'twelve' },
  { id: 'flag-zone', name: '1 rusher, 2-2 zone', game: 'flag5' },
  { id: 'flag-man', name: '1 rusher, man', game: 'flag5' },
];

export const DEFAULT_DEFENSE: Record<GameType, DefenseId> = {
  eleven: '43-cover2',
  twelve: 'cfl-43',
  flag5: 'flag-zone',
};

export function defensesFor(game: GameType): DefenseFront[] {
  return DEFENSES.filter((d) => d.game === game);
}

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
  const wide = play.level === 'flag' ? 4 : 6;

  const widestLeft = Math.min(...left.map((p) => p.x), b);
  const widestRight = Math.max(...right.map((p) => p.x), b);
  const cornerL = widestLeft < b - wide ? widestLeft : b - wide - 4;
  const cornerR = widestRight > b + wide ? widestRight : b + wide + 4;

  // Edge players line up outside the widest player on the line within 7 yards of the ball.
  const lineLeft = offense.filter((p) => isOnLine(p) && p.x < b && p.x > b - 7);
  const lineRight = offense.filter((p) => isOnLine(p) && p.x > b && p.x < b + 7);
  const edgeL = Math.min(...lineLeft.map((p) => p.x), b - 2 * OL_SPLIT) - 1.5;
  const edgeR = Math.max(...lineRight.map((p) => p.x), b + 2 * OL_SPLIT) + 1.5;

  // Second-widest receiver on each side (the slots), for nickel/dime/halfbacks.
  const slotOn = (side: Player[], sign: number) =>
    side
      .filter((p) => Math.abs(p.x - b) > 2 * OL_SPLIT + 0.5)
      .sort((a, c) => Math.abs(c.x - b) - Math.abs(a.x - b))[1]?.x ?? b + sign * 8;
  const slotL = slotOn(left, -1);
  const slotR = slotOn(right, 1);
  const slot = strongRight ? slotR : slotL;
  const weakSlot = strongRight ? slotL : slotR;

  return {
    b,
    offense,
    s,
    strongRight,
    cornerL,
    cornerR,
    edgeL,
    edgeR,
    slot,
    weakSlot,
    slotL,
    slotR,
  };
}

function defenders(front: DefenseId, play: Play): Player[] {
  const width = fieldWidth(play.level);
  const d = (id: string, label: string, x: number, y: number): Player => ({
    id,
    side: 'defense',
    label,
    shape: 'letter',
    x: round(clampX(x, width)),
    y,
  });
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
    case '416-cover4':
      return [
        ...fourDown,
        d('lb-m', 'M', b, 5),
        d('nb', 'NB', o.slot, 5),
        d('db', 'DB', o.weakSlot, 5),
        d('cb-l', 'C', o.cornerL, 7),
        d('cb-r', 'C', o.cornerR, 7),
        d('ss', 'SS', b + 7 * s, 10),
        d('fs', 'FS', b - 7 * s, 10),
      ];
    case '62-goalline':
      return [
        d('de-l', 'E', o.edgeL, 1),
        d('dt-l2', 'T', b - OL_SPLIT - 0.6, 1),
        d('dt-l', 'N', b - 0.6, 1),
        d('dt-r', 'N', b + 0.6, 1),
        d('dt-r2', 'T', b + OL_SPLIT + 0.6, 1),
        d('de-r', 'E', o.edgeR, 1),
        d('lb-w', 'W', b - 3 * s, 3),
        d('lb-s', 'S', b + 3 * s, 3),
        d('cb-l', 'C', o.cornerL, 3),
        d('cb-r', 'C', o.cornerR, 3),
        d('fs', 'FS', b, 7),
      ];
    case 'cfl-43':
      // 12-man: four down, three backers, two corners, two halfbacks over the slots, one safety.
      return [
        ...fourDown,
        d('lb-w', 'W', b - 4 * s, 5),
        d('lb-m', 'M', b, 5),
        d('lb-s', 'S', b + 4 * s, 5),
        d('cb-l', 'C', o.cornerL, 8),
        d('cb-r', 'C', o.cornerR, 8),
        d('hb-l', 'HB', o.slotL, 7),
        d('hb-r', 'HB', o.slotR, 7),
        d('fs', 'FS', b, 14),
      ];
    case 'flag-zone':
      // The rusher must start 7 yards off the ball in 5v5 flag.
      return [
        d('r', 'R', b, 7),
        d('lb-l', 'L', b - 5, 5),
        d('lb-r', 'L', b + 5, 5),
        d('s-l', 'S', b - 6, 12),
        d('s-r', 'S', b + 6, 12),
      ];
    case 'flag-man': {
      // One defender over each eligible receiver (not the quarterback), 3 yards off.
      const targets = o.offense
        .filter((p) => p.id !== 'q' && p.label !== 'Q')
        .sort((a, c) => a.x - c.x)
        .slice(0, 4);
      return [
        d('r', 'R', b, 7),
        ...targets.map((t, i) => d(`m${i + 1}`, 'D', t.x, t.id === 'c' ? 4 : 3)),
      ];
    }
  }
}

/**
 * Line up a defense against the offense. Corners go over the widest receiver on each side;
 * the strong-side players go to the side with more receivers. A front from another game
 * (e.g. a 4-3 on a flag field) is swapped for that game's default.
 */
export function placeDefense(play: Play, front?: DefenseId): Play {
  const game = gameFor(play.level);
  const wanted = front ?? play.defense;
  const chosen =
    wanted && DEFENSES.some((f) => f.id === wanted && f.game === game)
      ? wanted
      : DEFAULT_DEFENSE[game];
  const offense = play.players.filter((p) => p.side === 'offense');
  const oldDefenseIds = new Set(play.players.filter((p) => p.side === 'defense').map((p) => p.id));
  return {
    ...play,
    showDefense: true,
    defense: chosen,
    players: [...offense, ...defenders(chosen, play)],
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
