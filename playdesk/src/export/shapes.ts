import { FIELD_WIDTH, hashXs, drawnPath, type FieldStyle, type Play, type Point } from '../model';
import {
  BAR_HALF,
  DIAGRAM_COLORS,
  LOS_YARD_LINE,
  PLAYER_RADIUS,
  viewBoxFor,
  type ViewWindow,
} from '../render';
import type { Rect } from '../sheets/layout';

/**
 * A play described as simple shapes in inches, so it can be rebuilt as native,
 * editable PowerPoint shapes. Pure: no pptxgenjs here.
 */
export type Shape =
  | {
      kind: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      fill?: string;
      stroke?: string;
      strokeW?: number;
      text?: string;
      textColor?: string;
      fontSize?: number;
      name?: string;
    }
  | {
      kind: 'ellipse';
      x: number;
      y: number;
      w: number;
      h: number;
      fill: string;
      stroke: string;
      strokeW: number;
      text?: string;
      textColor?: string;
      fontSize?: number;
      name?: string;
    }
  | {
      kind: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      width: number;
      dash?: boolean;
      arrow?: boolean;
      name?: string;
    }
  | {
      kind: 'text';
      x: number;
      y: number;
      w: number;
      h: number;
      text: string;
      color: string;
      fontSize: number;
      bold?: boolean;
      name?: string;
    };

const PT_PER_IN = 72;

/** Convert a hex color with optional alpha channel to 6-digit hex (no #), blended on white. */
export function solidHex(color: string): string {
  const rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(color);
  if (rgba) {
    const a = rgba[4] === undefined ? 1 : Number(rgba[4]);
    return [rgba[1], rgba[2], rgba[3]]
      .map((c) =>
        Math.round(Number(c) * a + 255 * (1 - a))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  }
  const hex = color.replace('#', '');
  if (hex.length === 3)
    return hex
      .split('')
      .map((c) => c + c)
      .join('');
  return hex.slice(0, 6);
}

export function diagramShapes(
  play: Play,
  style: FieldStyle,
  window: ViewWindow,
  box: Rect,
): Shape[] {
  const c = DIAGRAM_COLORS[style];
  const vb = viewBoxFor(window);
  const s = Math.min(box.w / vb.width, box.h / vb.height);
  const ox = box.x + (box.w - vb.width * s) / 2 - vb.x * s;
  const oy = box.y + (box.h - vb.height * s) / 2 - vb.y * s;
  const X = (x: number) => ox + x * s;
  const Y = (y: number) => oy - y * s; // yards → svg y is -y
  const ptW = (yards: number) => Math.max(0.5, yards * s * PT_PER_IN);

  const shapes: Shape[] = [];
  shapes.push({
    kind: 'rect',
    x: X(vb.x),
    y: oy + vb.y * s,
    w: vb.width * s,
    h: vb.height * s,
    fill: c.background,
    stroke: 'bbbbbb',
    strokeW: 0.5,
    name: 'Field',
  });

  const fieldLine = solidHex(c.fieldLine);
  for (let y = Math.ceil(-window.backfield); y <= Math.floor(window.downfield); y++) {
    if ((LOS_YARD_LINE + y) % 5 === 0) {
      shapes.push({
        kind: 'line',
        x1: X(0),
        y1: Y(y),
        x2: X(FIELD_WIDTH),
        y2: Y(y),
        color: fieldLine,
        width: ptW(0.12),
        name: 'Yard line',
      });
    }
  }
  const { left, right } = hashXs(play.level);
  for (const hx of [left, right]) {
    for (let y = Math.ceil(-window.backfield); y <= Math.floor(window.downfield); y++) {
      if ((LOS_YARD_LINE + y) % 5 === 0) continue;
      shapes.push({
        kind: 'line',
        x1: X(hx - 0.33),
        y1: Y(y),
        x2: X(hx + 0.33),
        y2: Y(y),
        color: fieldLine,
        width: ptW(0.08),
        name: 'Hash',
      });
    }
  }
  shapes.push({
    kind: 'line',
    x1: X(0),
    y1: Y(-window.backfield),
    x2: X(0),
    y2: Y(window.downfield),
    color: fieldLine,
    width: ptW(0.3),
    name: 'Sideline',
  });
  shapes.push({
    kind: 'line',
    x1: X(FIELD_WIDTH),
    y1: Y(-window.backfield),
    x2: X(FIELD_WIDTH),
    y2: Y(window.downfield),
    color: fieldLine,
    width: ptW(0.3),
    name: 'Sideline',
  });
  shapes.push({
    kind: 'line',
    x1: X(0),
    y1: Y(0),
    x2: X(FIELD_WIDTH),
    y2: Y(0),
    color: solidHex(c.los),
    width: ptW(0.22),
    name: 'Line of scrimmage',
  });

  for (const line of play.lines) {
    const pts = drawnPath(play, line);
    const color = solidHex(line.color ?? c.line);
    const w = ptW(0.22);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const last = i === pts.length - 1;
      shapes.push({
        kind: 'line',
        x1: X(a.x),
        y1: Y(a.y),
        x2: X(b.x),
        y2: Y(b.y),
        color,
        width: w,
        dash: line.type === 'motion',
        arrow: last && line.type !== 'block',
        name: `${line.type} segment`,
      });
    }
    if (line.type === 'block' && pts.length > 1) {
      const [p1, p2] = blockBar(pts[pts.length - 2]!, pts[pts.length - 1]!);
      shapes.push({
        kind: 'line',
        x1: X(p1.x),
        y1: Y(p1.y),
        x2: X(p2.x),
        y2: Y(p2.y),
        color,
        width: w * 1.4,
        name: 'block end',
      });
    }
  }

  const r = PLAYER_RADIUS * s;
  for (const p of play.players) {
    const label = p.label;
    if (p.side === 'defense') {
      shapes.push({
        kind: 'text',
        x: X(p.x) - r * 1.5,
        y: Y(p.y) - r * 1.2,
        w: r * 3,
        h: r * 2.4,
        text: label,
        color: solidHex(p.color ?? c.defense),
        fontSize: Math.max(5, (label.length > 1 ? 1.25 : 1.6) * s * PT_PER_IN * 0.9),
        bold: true,
        name: `Defender ${label}`,
      });
      continue;
    }
    const fill = solidHex(p.color ?? c.playerFill);
    const common = {
      x: X(p.x) - r,
      y: Y(p.y) - r,
      w: 2 * r,
      h: 2 * r,
      fill,
      stroke: solidHex(c.playerStroke),
      strokeW: ptW(0.12),
      text: label,
      textColor: isDark(fill) ? 'FFFFFF' : solidHex(c.playerText),
      fontSize: Math.max(
        4,
        (label.length > 2 ? 0.6 : label.length > 1 ? 0.75 : 0.95) * s * PT_PER_IN * 0.9,
      ),
      name: `Player ${label || p.id}`,
    };
    shapes.push(
      p.shape === 'square' ? { kind: 'rect', ...common } : { kind: 'ellipse', ...common },
    );
  }
  return shapes;
}

function blockBar(a: Point, b: Point): [Point, Point] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * BAR_HALF;
  const py = (dx / len) * BAR_HALF;
  return [
    { x: b.x + px, y: b.y + py },
    { x: b.x - px, y: b.y - py },
  ];
}

function isDark(hex: string): boolean {
  const n = parseInt(hex, 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 140;
}
