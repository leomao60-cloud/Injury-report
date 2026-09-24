import { memo, type PointerEvent } from 'react';
import type { FieldStyle, LineType, PlayLine, Point } from '../model';
import { lineEnd, pathD } from './geometry';
import { DIAGRAM_COLORS, LINE_WIDTH } from './theme';

export interface PlayLineViewProps {
  /** Full path including the start point. */
  points: Point[];
  type: LineType;
  style: FieldStyle;
  color?: string;
  selected?: boolean;
  line?: PlayLine;
  preview?: boolean;
  onPointerDown?: (e: PointerEvent<SVGGElement>, line: PlayLine) => void;
}

/** Route: arrowhead. Block: T-bar. Motion: dashed with arrowhead. */
export const PlayLineView = memo(function PlayLineView({
  points,
  type,
  style,
  color,
  selected,
  line,
  preview,
  onPointerDown,
}: PlayLineViewProps) {
  const c = DIAGRAM_COLORS[style];
  const stroke = color ?? c.line;
  const end = lineEnd(points, type === 'block' ? 'bar' : 'arrow');
  const dash = type === 'motion' ? '0.6 0.45' : preview ? '0.4 0.3' : undefined;
  const handlers =
    onPointerDown && line
      ? { onPointerDown: (e: PointerEvent<SVGGElement>) => onPointerDown(e, line) }
      : {};

  return (
    <g
      className="pd-line"
      data-line-id={line?.id}
      data-line-type={type}
      opacity={preview ? 0.7 : 1}
      pointerEvents={preview ? 'none' : undefined}
      {...handlers}
    >
      {onPointerDown && (
        <path
          d={pathD(points)}
          fill="none"
          stroke="transparent"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      )}
      {selected && (
        <path
          d={pathD(points)}
          fill="none"
          stroke={c.selected}
          strokeWidth={LINE_WIDTH + 0.45}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.85}
        />
      )}
      <path
        d={pathD(end.shaft)}
        fill="none"
        stroke={stroke}
        strokeWidth={LINE_WIDTH}
        strokeLinejoin="round"
        strokeLinecap={type === 'motion' ? 'butt' : 'round'}
        strokeDasharray={dash}
      />
      {end.arrow && <polygon points={end.arrow.map((p) => p.join(',')).join(' ')} fill={stroke} />}
      {end.bar && (
        <line
          x1={end.bar[0][0]}
          y1={end.bar[0][1]}
          x2={end.bar[1][0]}
          y2={end.bar[1][1]}
          stroke={stroke}
          strokeWidth={LINE_WIDTH * 1.4}
          strokeLinecap="round"
        />
      )}
    </g>
  );
});
