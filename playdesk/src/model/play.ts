import { FIELD_WIDTH, ballXFor, clamp, clampX, round } from './field';
import { getFormation, OL_SPLIT, ON_LINE_THRESHOLD } from './formations';
import { newId } from './ids';
import type { BallOn, FormationId, Level, LineType, Play, Player, PlayLine, Point } from './types';

/** How far downfield/backfield a player can be placed. */
export const MIN_Y = -15;
export const MAX_Y = 25;

export interface CreatePlayOptions {
  id?: string;
  name?: string;
  level?: Level;
  ballOn?: BallOn;
  formation?: FormationId;
  showDefense?: boolean;
}

export function createPlay(opts: CreatePlayOptions = {}): Play {
  const level = opts.level ?? 'hs';
  const ballOn = opts.ballOn ?? 'middle';
  const formation = opts.formation ?? 'doubles';
  const ballX = ballXFor(level, ballOn);
  const f = getFormation(formation);
  const players: Player[] = f.spots.map((s) => ({
    id: s.id,
    side: 'offense',
    label: s.label,
    shape: s.shape ?? 'circle',
    x: round(ballX + s.dx),
    y: s.y,
  }));
  let play: Play = {
    id: opts.id ?? newId('play'),
    name: opts.name ?? 'New play',
    level,
    ballOn,
    ballX,
    formation,
    showDefense: false,
    players,
    lines: [],
  };
  play = keepInBounds(play);
  return opts.showDefense ? placeDefense(play) : play;
}

// ---------- geometry helpers ----------

export function snapToGrid(p: Point, step = 0.5): Point {
  return { x: round(Math.round(p.x / step) * step), y: round(Math.round(p.y / step) * step) };
}

export function clampPoint(p: Point): Point {
  return { x: round(clampX(p.x)), y: round(clamp(p.y, MIN_Y, MAX_Y)) };
}

function shiftPoint(p: Point, dx: number, dy: number): Point {
  return { x: round(p.x + dx), y: round(p.y + dy) };
}

export function getPlayer(play: Play, id: string): Player | undefined {
  return play.players.find((p) => p.id === id);
}

export function linesFor(play: Play, playerId: string): PlayLine[] {
  return play.lines.filter((l) => l.playerId === playerId);
}

/**
 * Where a line starts. Routes and blocks start where the player's motion ends;
 * motion (and everything for a player without motion) starts at the player.
 */
export function lineStart(play: Play, line: Pick<PlayLine, 'playerId' | 'type'>): Point {
  const player = getPlayer(play, line.playerId);
  if (!player) return { x: 0, y: 0 };
  if (line.type !== 'motion') {
    const motion = play.lines.find((l) => l.playerId === line.playerId && l.type === 'motion');
    const end = motion?.points[motion.points.length - 1];
    if (end) return { x: end.x, y: end.y };
  }
  return { x: player.x, y: player.y };
}

/** Full list of points for drawing, start included. */
export function linePath(play: Play, line: PlayLine): Point[] {
  return [lineStart(play, line), ...line.points];
}

// ---------- player operations ----------

/** Move a player; his lines move by the same amount. */
export function movePlayer(play: Play, playerId: string, to: Point): Play {
  const player = getPlayer(play, playerId);
  if (!player) return play;
  const target = clampPoint(to);
  const dx = round(target.x - player.x);
  const dy = round(target.y - player.y);
  if (dx === 0 && dy === 0) return play;
  return shiftPlayer(play, playerId, dx, dy);
}

function shiftPlayer(play: Play, playerId: string, dx: number, dy: number): Play {
  return {
    ...play,
    players: play.players.map((p) =>
      p.id === playerId ? { ...p, x: round(p.x + dx), y: round(p.y + dy) } : p,
    ),
    lines: play.lines.map((l) =>
      l.playerId === playerId ? { ...l, points: l.points.map((pt) => shiftPoint(pt, dx, dy)) } : l,
    ),
  };
}

export function updatePlayer(
  play: Play,
  playerId: string,
  patch: Partial<Pick<Player, 'label' | 'color'>>,
): Play {
  const clean = { ...patch };
  if (clean.label !== undefined) clean.label = clean.label.slice(0, 3);
  return {
    ...play,
    players: play.players.map((p) => (p.id === playerId ? { ...p, ...clean } : p)),
  };
}

// ---------- line operations ----------

export function addLine(
  play: Play,
  line: { playerId: string; type: LineType; points: Point[]; color?: string; id?: string },
): Play {
  if (!getPlayer(play, line.playerId) || line.points.length === 0) return play;
  const created: PlayLine = {
    id: line.id ?? newId('line'),
    playerId: line.playerId,
    type: line.type,
    points: line.points.map(clampPoint),
    ...(line.color ? { color: line.color } : {}),
  };
  // A player has at most one motion.
  const others =
    line.type === 'motion'
      ? play.lines.filter((l) => !(l.playerId === line.playerId && l.type === 'motion'))
      : play.lines;
  return { ...play, lines: [...others, created] };
}

export function updateLine(
  play: Play,
  lineId: string,
  patch: Partial<Pick<PlayLine, 'type' | 'color' | 'points'>>,
): Play {
  const line = play.lines.find((l) => l.id === lineId);
  if (!line) return play;
  let lines = play.lines;
  if (patch.type === 'motion' && line.type !== 'motion') {
    lines = lines.filter((l) => !(l.playerId === line.playerId && l.type === 'motion'));
  }
  return { ...play, lines: lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) };
}

export function removeLine(play: Play, lineId: string): Play {
  return { ...play, lines: play.lines.filter((l) => l.id !== lineId) };
}

export function removeLinesFor(play: Play, playerId: string): Play {
  return { ...play, lines: play.lines.filter((l) => l.playerId !== playerId) };
}

export function clearLines(play: Play): Play {
  return { ...play, lines: [] };
}

// ---------- whole-play operations ----------

/** Mirror the play left-to-right around the ball. Players who would leave the field are pulled back in. */
export function flipPlay(play: Play): Play {
  const m = (x: number) => round(2 * play.ballX - x);
  const flipped: Play = {
    ...play,
    players: play.players.map((p) => ({ ...p, x: m(p.x) })),
    lines: play.lines.map((l) => ({ ...l, points: l.points.map((pt) => ({ ...pt, x: m(pt.x) })) })),
  };
  return keepInBounds(flipped);
}

/** Put the ball on a hash (or the middle). Everything shifts with it and stays inside the sidelines. */
export function setBallSpot(play: Play, ballOn: BallOn): Play {
  return moveBall({ ...play, ballOn }, ballXFor(play.level, ballOn));
}

/** Change the level; hash width changes, so the ball (and everything) shifts. */
export function setLevel(play: Play, level: Level): Play {
  return moveBall({ ...play, level }, ballXFor(level, play.ballOn));
}

function moveBall(play: Play, newBallX: number): Play {
  const dx = round(newBallX - play.ballX);
  const shifted: Play = {
    ...play,
    ballX: newBallX,
    players: play.players.map((p) => ({ ...p, x: round(p.x + dx) })),
    lines: play.lines.map((l) => ({ ...l, points: l.points.map((pt) => shiftPoint(pt, dx, 0)) })),
  };
  return keepInBounds(shifted);
}

/** Pull any player outside the sidelines back in; his lines move with him. Line points are clamped too. */
export function keepInBounds(play: Play): Play {
  let next = play;
  for (const p of play.players) {
    const cx = round(clampX(p.x));
    if (cx !== p.x) next = shiftPlayer(next, p.id, round(cx - p.x), 0);
  }
  const lines = next.lines.map((l) => {
    if (l.points.every((pt) => pt.x >= 0 && pt.x <= FIELD_WIDTH)) return l;
    return {
      ...l,
      points: l.points.map((pt) => ({ ...pt, x: round(clamp(pt.x, 0, FIELD_WIDTH)) })),
    };
  });
  return lines === next.lines ? next : { ...next, lines };
}

/**
 * Reset the offense to a formation. Players keep their label and color;
 * their lines move with them. Defense is re-aligned if shown.
 */
export function applyFormation(play: Play, formationId: FormationId): Play {
  const f = getFormation(formationId);
  let next: Play = { ...play, formation: formationId };
  for (const spot of f.spots) {
    const target = { x: round(play.ballX + spot.dx), y: spot.y };
    const existing = getPlayer(next, spot.id);
    if (existing) {
      next = shiftPlayer(next, spot.id, round(target.x - existing.x), round(target.y - existing.y));
    } else {
      next = {
        ...next,
        players: [
          ...next.players,
          {
            id: spot.id,
            side: 'offense',
            label: spot.label,
            shape: spot.shape ?? 'circle',
            ...target,
          },
        ],
      };
    }
  }
  next = keepInBounds(next);
  return next.showDefense ? placeDefense(next) : next;
}

// ---------- defense ----------

export const DEFENSE_IDS = [
  'de-l',
  'dt-l',
  'dt-r',
  'de-r',
  'lb-w',
  'lb-m',
  'lb-s',
  'cb-l',
  'cb-r',
  'ss',
  'fs',
];

export function isOnLine(p: Player): boolean {
  return p.side === 'offense' && p.y > ON_LINE_THRESHOLD;
}

/**
 * A 4-3 with two deep safeties. Corners line up over the widest receiver on each side;
 * the Sam linebacker and strong safety go to the side with more receivers.
 */
export function placeDefense(play: Play): Play {
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

  // Defensive ends outside the widest player on the line within 6 yards of the ball.
  const lineLeft = offense.filter((p) => isOnLine(p) && p.x < b && p.x > b - 7);
  const lineRight = offense.filter((p) => isOnLine(p) && p.x > b && p.x < b + 7);
  const endL = Math.min(...lineLeft.map((p) => p.x), b - 2 * OL_SPLIT) - 1.5;
  const endR = Math.max(...lineRight.map((p) => p.x), b + 2 * OL_SPLIT) + 1.5;

  const d = (id: string, label: string, x: number, y: number): Player => ({
    id,
    side: 'defense',
    label,
    shape: 'letter',
    x: round(clampX(x)),
    y,
  });

  const defenders: Player[] = [
    d('de-l', 'E', endL, 1),
    // Nose on the weak shade of the center, 3-technique outside the strong guard.
    d('dt-l', strongRight ? 'N' : 'T', strongRight ? b - 0.6 : b - OL_SPLIT - 0.6, 1),
    d('dt-r', strongRight ? 'T' : 'N', strongRight ? b + OL_SPLIT + 0.6 : b + 0.6, 1),
    d('de-r', 'E', endR, 1),
    d('lb-w', 'W', b - 4 * s, 5),
    d('lb-m', 'M', b, 5),
    d('lb-s', 'S', b + 4 * s, 5),
    d('cb-l', 'C', cornerL, 7),
    d('cb-r', 'C', cornerR, 7),
    d('ss', 'SS', b + 9 * s, 12),
    d('fs', 'FS', b - 9 * s, 12),
  ];

  const oldDefenseIds = new Set(play.players.filter((p) => p.side === 'defense').map((p) => p.id));
  return {
    ...play,
    showDefense: true,
    players: [...offense, ...defenders],
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
