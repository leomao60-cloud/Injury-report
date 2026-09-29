import { FIELD_WIDTH, drawnPath, fieldWidth, type Play, type Point } from '../model';

/** Visible window, in yards from the LOS. */
export interface ViewWindow {
  /** Yards downfield shown above the LOS. */
  downfield: number;
  /** Yards of backfield shown below the LOS. */
  backfield: number;
  /** Extra yards shown outside each sideline. */
  margin: number;
}

export const DEFAULT_WINDOW: ViewWindow = { downfield: 20, backfield: 10, margin: 1 };
/** Tighter window for library thumbnails. */
export const THUMB_WINDOW: ViewWindow = { downfield: 16, backfield: 8, margin: 0.5 };
/** Window for plays on call sheets and in exports of sheets. */
export const SHEET_WINDOW: ViewWindow = { downfield: 16, backfield: 8, margin: 0.5 };

/** The field is drawn in yard units: svg x = x, svg y = -y (downfield is up). */
export function viewBoxFor(w: ViewWindow = DEFAULT_WINDOW, fieldW: number = FIELD_WIDTH) {
  const x = -w.margin;
  const y = -w.downfield;
  const width = fieldW + 2 * w.margin;
  const height = w.downfield + w.backfield;
  return { x, y, width, height, attr: `${x} ${y} ${width} ${height}` };
}

export function toSvg(p: Point): { x: number; y: number } {
  return { x: p.x, y: -p.y };
}

/** Yard line (on a real American field) of the line of scrimmage, used for yard labels. */
export const LOS_YARD_LINE = 33;

/**
 * Grow a window so everything in the play is visible (a punter 15 yards deep, kick returners
 * 25 yards downfield). It only grows, in whole `step`s, so the view doesn't jump while dragging.
 */
export function fitWindow(play: Play, base: ViewWindow, step = 2): ViewWindow {
  let maxY = 0;
  let minY = 0;
  for (const p of play.players) {
    maxY = Math.max(maxY, p.y);
    minY = Math.min(minY, p.y);
  }
  for (const l of play.lines) {
    for (const p of drawnPath(play, l)) {
      maxY = Math.max(maxY, p.y);
      minY = Math.min(minY, p.y);
    }
  }
  const pad = 1.5;
  const grow = (need: number, have: number) =>
    need <= have ? have : have + Math.ceil((need - have) / step) * step;
  return {
    ...base,
    downfield: grow(maxY + pad, base.downfield),
    backfield: grow(-minY + pad, base.backfield),
  };
}

/** The window a play is drawn in, and its view box on that play's field. */
export function playView(play: Play, base: ViewWindow, step = 2) {
  const window = fitWindow(play, base, step);
  return { window, vb: viewBoxFor(window, fieldWidth(play.level)) };
}

export function pathD(points: Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(3)} ${(-p.y).toFixed(3)}`)
    .join(' ');
}

/** Unit vector of the last segment, in svg coordinates. */
export function endDirection(points: Point[]): { dx: number; dy: number } {
  for (let i = points.length - 1; i > 0; i--) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const dx = b.x - a.x;
    const dy = -(b.y - a.y);
    const len = Math.hypot(dx, dy);
    if (len > 1e-6) return { dx: dx / len, dy: dy / len };
  }
  return { dx: 0, dy: -1 };
}

export interface LineEnd {
  /** Path points with the tip pulled back so the stroke doesn't poke through the arrowhead. */
  shaft: Point[];
  /** Arrowhead triangle (svg coords) or T-bar segment (svg coords). */
  arrow?: [number, number][];
  bar?: [[number, number], [number, number]];
}

export const ARROW_LENGTH = 0.9;
export const ARROW_HALF_WIDTH = 0.45;
export const BAR_HALF = 0.8;

export function lineEnd(points: Point[], kind: 'arrow' | 'bar'): LineEnd {
  const tip = points[points.length - 1];
  if (!tip || points.length < 2) return { shaft: points };
  const { dx, dy } = endDirection(points);
  const tx = tip.x;
  const ty = -tip.y;
  const px = -dy;
  const py = dx;
  if (kind === 'bar') {
    return {
      shaft: points,
      bar: [
        [tx + px * BAR_HALF, ty + py * BAR_HALF],
        [tx - px * BAR_HALF, ty - py * BAR_HALF],
      ],
    };
  }
  const bx = tx - dx * ARROW_LENGTH;
  const by = ty - dy * ARROW_LENGTH;
  const shaftEnd = { x: tx - dx * ARROW_LENGTH * 0.6, y: -(ty - dy * ARROW_LENGTH * 0.6) };
  return {
    shaft: [...points.slice(0, -1), shaftEnd],
    arrow: [
      [tx, ty],
      [bx + px * ARROW_HALF_WIDTH, by + py * ARROW_HALF_WIDTH],
      [bx - px * ARROW_HALF_WIDTH, by - py * ARROW_HALF_WIDTH],
    ],
  };
}
