import { memo } from 'react';
import { FIELD_WIDTH, hashXs, type FieldStyle, type Level } from '../model';
import { DEFAULT_WINDOW, LOS_YARD_LINE, viewBoxFor, type ViewWindow } from './geometry';
import { DIAGRAM_COLORS, DIAGRAM_FONT } from './theme';

export interface FieldProps {
  level: Level;
  style: FieldStyle;
  window?: ViewWindow;
  /** Hide yard numbers (e.g. small thumbnails). */
  numbers?: boolean;
}

const TICK = 2 / 3; // hash marks are 2 feet long

/** The field background: sidelines, yard lines every 5, hash ticks every yard, LOS and yard numbers. */
export const Field = memo(function Field({
  level,
  style,
  window = DEFAULT_WINDOW,
  numbers = true,
}: FieldProps) {
  const c = DIAGRAM_COLORS[style];
  const vb = viewBoxFor(window);
  const { left, right } = hashXs(level);
  const yards: number[] = [];
  for (let y = Math.ceil(-window.backfield); y <= Math.floor(window.downfield); y++) yards.push(y);

  const fieldYard = (y: number) => LOS_YARD_LINE + y;
  const label = (y: number) => {
    const yl = fieldYard(y);
    return yl <= 50 ? yl : 100 - yl;
  };

  return (
    <g data-testid="field">
      <rect x={vb.x} y={vb.y} width={vb.width} height={vb.height} fill={c.background} />
      {/* sidelines */}
      <line x1={0} x2={0} y1={vb.y} y2={vb.y + vb.height} stroke={c.fieldLine} strokeWidth={0.35} />
      <line
        x1={FIELD_WIDTH}
        x2={FIELD_WIDTH}
        y1={vb.y}
        y2={vb.y + vb.height}
        stroke={c.fieldLine}
        strokeWidth={0.35}
      />
      {yards.map((y) => {
        const sy = -y;
        if (fieldYard(y) % 5 === 0) {
          return (
            <line
              key={y}
              x1={0}
              x2={FIELD_WIDTH}
              y1={sy}
              y2={sy}
              stroke={c.fieldLine}
              strokeWidth={0.15}
            />
          );
        }
        return (
          <g key={y} stroke={c.fieldLine} strokeWidth={0.1}>
            <line x1={0} x2={TICK} y1={sy} y2={sy} />
            <line x1={FIELD_WIDTH - TICK} x2={FIELD_WIDTH} y1={sy} y2={sy} />
            <line x1={left - TICK / 2} x2={left + TICK / 2} y1={sy} y2={sy} />
            <line x1={right - TICK / 2} x2={right + TICK / 2} y1={sy} y2={sy} />
          </g>
        );
      })}
      {numbers &&
        yards
          .filter((y) => fieldYard(y) % 10 === 0 && fieldYard(y) > 0 && fieldYard(y) < 100)
          .map((y) => (
            <g
              key={`n${y}`}
              fill={c.yardNumber}
              fontSize={2}
              fontWeight={700}
              fontFamily={DIAGRAM_FONT}
              textAnchor="middle"
              dominantBaseline="central"
            >
              <text transform={`translate(9 ${-y}) rotate(90)`}>{label(y)}</text>
              <text transform={`translate(${FIELD_WIDTH - 9} ${-y}) rotate(-90)`}>{label(y)}</text>
            </g>
          ))}
      {/* line of scrimmage */}
      <line
        x1={0}
        x2={FIELD_WIDTH}
        y1={0}
        y2={0}
        stroke={c.los}
        strokeWidth={0.25}
        data-testid="los"
      />
    </g>
  );
});
