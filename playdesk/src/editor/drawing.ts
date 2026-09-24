import {
  getPlayer,
  lineStart,
  type LineType,
  type Play,
  type Player,
  type PlayLine,
  type Point,
} from '../model';
import type { Draft } from '../store/editorStore';

export type ClickTarget =
  { kind: 'player'; player: Player } | { kind: 'line'; line: PlayLine } | { kind: 'field' };

export interface NewLine {
  playerId: string;
  type: LineType;
  points: Point[];
}

export interface DrawStep {
  draft: Draft | null;
  /** A finished line to add to the play. */
  commit?: NewLine;
}

/** Clicking within this distance of the last point finishes the line. */
export const FINISH_RADIUS = 0.75;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function finishDraft(draft: Draft | null): DrawStep {
  if (!draft || draft.points.length === 0) return { draft: null };
  return {
    draft: null,
    commit: { playerId: draft.playerId, type: draft.type, points: draft.points },
  };
}

/** Where the draft line starts (after the player's motion for routes and blocks). */
export function draftStart(play: Play, draft: Pick<Draft, 'playerId' | 'type'>): Point {
  return lineStart(play, draft);
}

/**
 * One click while a drawing tool (route/block/motion) is active.
 * `point` is the click position in yards (already snapped if snapping is on).
 */
export function drawClick(
  play: Play,
  draft: Draft | null,
  type: LineType,
  target: ClickTarget,
  point: Point,
): DrawStep {
  if (!draft) {
    if (target.kind === 'player')
      return { draft: { playerId: target.player.id, type, points: [] } };
    return { draft: null };
  }

  const drawer = getPlayer(play, draft.playerId);
  if (!drawer) return { draft: null };

  if (target.kind === 'player') {
    const p = target.player;
    if (p.id === draft.playerId) {
      return draft.points.length > 0 ? finishDraft(draft) : { draft };
    }
    if (draft.type === 'block' && p.side !== drawer.side) {
      return finishDraft({ ...draft, points: [...draft.points, { x: p.x, y: p.y }] });
    }
    if (p.side === drawer.side) {
      const done = finishDraft(draft);
      return { draft: { playerId: p.id, type, points: [] }, commit: done.commit };
    }
  }

  const last = draft.points[draft.points.length - 1];
  if (last && dist(last, point) < FINISH_RADIUS) return finishDraft(draft);
  if (!last && dist(draftStart(play, draft), point) < FINISH_RADIUS) return { draft };
  return { draft: { ...draft, points: [...draft.points, point] } };
}

export function undoDraftPoint(draft: Draft | null): Draft | null {
  if (!draft) return null;
  if (draft.points.length === 0) return null;
  return { ...draft, points: draft.points.slice(0, -1) };
}

/** "6 yd right of ball · +9 yd past LOS" */
export function describeSpot(play: Play, p: Point): string {
  const dx = Math.round((p.x - play.ballX) * 2) / 2;
  const dy = Math.round(p.y * 2) / 2;
  const horiz =
    dx === 0 ? 'on the ball' : `${Math.abs(dx)} yd ${dx > 0 ? 'right' : 'left'} of ball`;
  const vert = dy === 0 ? 'on the LOS' : dy > 0 ? `+${dy} yd past LOS` : `${-dy} yd behind LOS`;
  return `${horiz} · ${vert}`;
}
