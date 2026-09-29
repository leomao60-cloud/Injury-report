import { ballXFor, clamp, clampX, fieldWidth, gameFor, round } from './field';
import { smoothPath } from './curve';
import { placeDefense } from './defense';
import { DEFAULT_FORMATION, findFormation, getFormation } from './formations';
import { newId } from './ids';
import type {
  BallOn,
  FormationId,
  Level,
  LineType,
  Play,
  Player,
  PlayLine,
  Point,
  Side,
} from './types';

/** How far backfield/downfield a player can be placed (a punter sits ~15 yards deep, kick returners 25 downfield). */
export const MIN_Y = -16;
export const MAX_Y = 26;

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
  const formation = opts.formation ?? DEFAULT_FORMATION[gameFor(level)];
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

/** Keep a point on the field of the given level (inside the sidelines, within the playable depth). */
export function clampPoint(p: Point, level: Level = 'hs'): Point {
  return { x: round(clampX(p.x, fieldWidth(level))), y: round(clamp(p.y, MIN_Y, MAX_Y)) };
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

/** The path as drawn: smoothed when the line is curved. */
export function drawnPath(play: Play, line: PlayLine): Point[] {
  const path = linePath(play, line);
  return line.curved ? smoothPath(path) : path;
}

// ---------- player operations ----------

/** Move a player; his lines move by the same amount. */
export function movePlayer(play: Play, playerId: string, to: Point): Play {
  const player = getPlayer(play, playerId);
  if (!player) return play;
  const target = clampPoint(to, play.level);
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
    points: line.points.map((p) => clampPoint(p, play.level)),
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
  patch: Partial<Pick<PlayLine, 'type' | 'color' | 'points' | 'curved'>>,
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

/**
 * Change the level; hash width (and field width) changes, so the ball and everything shifts.
 * Switching to a different game (11-man, 12-man, flag) resets the offense to that game's
 * default formation and re-aligns the defense for it.
 */
export function setLevel(play: Play, level: Level): Play {
  const game = gameFor(level);
  if (game === gameFor(play.level)) {
    return moveBall({ ...play, level }, ballXFor(level, play.ballOn));
  }
  const ballX = ballXFor(level, play.ballOn);
  const moved: Play = {
    ...play,
    level,
    ballX,
    defense: undefined,
    players: play.players.map((p) => ({ ...p, x: round(p.x - play.ballX + ballX) })),
    lines: play.lines.map((l) => ({
      ...l,
      points: l.points.map((pt) => shiftPoint(pt, ballX - play.ballX, 0)),
    })),
  };
  return applyFormation(moved, DEFAULT_FORMATION[game], { strict: true });
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
  const width = fieldWidth(play.level);
  let next = play;
  for (const p of play.players) {
    const cx = round(clampX(p.x, width));
    if (cx !== p.x) next = shiftPlayer(next, p.id, round(cx - p.x), 0);
  }
  const lines = next.lines.map((l) => {
    if (l.points.every((pt) => pt.x >= 0 && pt.x <= width)) return l;
    return {
      ...l,
      points: l.points.map((pt) => ({ ...pt, x: round(clamp(pt.x, 0, width)) })),
    };
  });
  return lines === next.lines ? next : { ...next, lines };
}

/**
 * Reset the offense to a formation. Players who were renamed or recolored keep their label and
 * color; players still showing the old formation's label take the new one. Lines move with their
 * players. Defense is re-aligned if shown.
 *
 * With `strict` (used when switching game type), offensive players the formation doesn't use are
 * removed along with their lines.
 */
export function applyFormation(
  play: Play,
  formationId: FormationId,
  opts: { strict?: boolean } = {},
): Play {
  const f = getFormation(formationId);
  const previous = findFormation(play.formation);
  let next: Play = { ...play, formation: formationId };
  if (opts.strict || !previous || previous.game !== f.game) {
    const keep = new Set(f.spots.map((sp) => sp.id));
    const dropped = new Set(
      next.players.filter((p) => p.side === 'offense' && !keep.has(p.id)).map((p) => p.id),
    );
    next = {
      ...next,
      players: next.players.filter((p) => !dropped.has(p.id)),
      lines: next.lines.filter((l) => !dropped.has(l.playerId)),
    };
  }
  for (const spot of f.spots) {
    const target = { x: round(play.ballX + spot.dx), y: spot.y };
    const existing = getPlayer(next, spot.id);
    if (existing) {
      next = shiftPlayer(next, spot.id, round(target.x - existing.x), round(target.y - existing.y));
      const oldLabel = previous?.spots.find((sp) => sp.id === spot.id)?.label;
      const shape = spot.shape ?? 'circle';
      if ((oldLabel !== undefined && existing.label === oldLabel) || existing.shape !== shape) {
        next = {
          ...next,
          players: next.players.map((p) =>
            p.id === spot.id
              ? {
                  ...p,
                  shape,
                  label: oldLabel !== undefined && p.label === oldLabel ? spot.label : p.label,
                }
              : p,
          ),
        };
      }
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

// ---------- players ----------

/** Add an extra player a few yards from the ball. Returns the play and the new player's id. */
export function addPlayer(play: Play, side: Side): { play: Play; id: string } {
  const id = newId(side === 'offense' ? 'o' : 'd');
  const taken = (x: number, y: number) =>
    play.players.some((p) => Math.abs(p.x - x) < 1.2 && Math.abs(p.y - y) < 1.2);
  const y = side === 'offense' ? -3 : 4;
  let x = play.ballX + 3;
  for (let i = 0; i < 20 && taken(x, y); i++) x += 1.5;
  const player: Player = {
    id,
    side,
    label: side === 'offense' ? 'A' : 'D',
    shape: side === 'offense' ? 'circle' : 'letter',
    x: round(clampX(x, fieldWidth(play.level))),
    y,
  };
  return { play: { ...play, players: [...play.players, player] }, id };
}

/** Remove a player and all of his lines. */
export function removePlayer(play: Play, playerId: string): Play {
  return {
    ...play,
    players: play.players.filter((p) => p.id !== playerId),
    lines: play.lines.filter((l) => l.playerId !== playerId),
  };
}

/** Move one break point of a line. */
export function moveLinePoint(play: Play, lineId: string, index: number, to: Point): Play {
  const target = clampPoint(to, play.level);
  return {
    ...play,
    lines: play.lines.map((l) =>
      l.id === lineId && index >= 0 && index < l.points.length
        ? { ...l, points: l.points.map((pt, i) => (i === index ? target : pt)) }
        : l,
    ),
  };
}

/** Remove one break point; a line with no points left is removed. */
export function removeLinePoint(play: Play, lineId: string, index: number): Play {
  const line = play.lines.find((l) => l.id === lineId);
  if (!line) return play;
  if (line.points.length <= 1) return removeLine(play, lineId);
  return updateLine(play, lineId, { points: line.points.filter((_, i) => i !== index) });
}
