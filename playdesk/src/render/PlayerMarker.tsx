import { memo, type PointerEvent } from 'react';
import type { FieldStyle, Player } from '../model';
import { DIAGRAM_COLORS, DIAGRAM_FONT, PLAYER_RADIUS, readableText } from './theme';

export interface PlayerMarkerProps {
  player: Player;
  style: FieldStyle;
  selected?: boolean;
  /** Adds a larger invisible touch target (editor only). */
  interactive?: boolean;
  /** Offense fill when the player has no color of his own (team color). */
  defaultFill?: string;
  onPointerDown?: (e: PointerEvent<SVGGElement>, player: Player) => void;
}

/** Offense: circle (center: square) with label. Defense: a colored letter. */
export const PlayerMarker = memo(function PlayerMarker({
  player,
  style,
  selected,
  interactive,
  defaultFill,
  onPointerDown,
}: PlayerMarkerProps) {
  const c = DIAGRAM_COLORS[style];
  const x = player.x;
  const y = -player.y;
  const r = PLAYER_RADIUS;
  const handlers = onPointerDown
    ? { onPointerDown: (e: PointerEvent<SVGGElement>) => onPointerDown(e, player) }
    : {};
  const common = {
    'data-player-id': player.id,
    'data-side': player.side,
    className: 'pd-player',
    ...handlers,
  };

  if (player.side === 'defense') {
    return (
      <g {...common}>
        {/* invisible hit area */}
        <circle cx={x} cy={y} r={r * 1.2} fill="transparent" />
        {selected && (
          <circle cx={x} cy={y} r={r * 1.35} fill="none" stroke={c.selected} strokeWidth={0.3} />
        )}
        <text
          x={x}
          y={y}
          fill={player.color ?? c.defense}
          fontSize={player.label.length > 1 ? 1.25 : 1.6}
          fontWeight={700}
          fontFamily={DIAGRAM_FONT}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {player.label}
        </text>
      </g>
    );
  }

  const fill = player.color ?? defaultFill ?? c.playerFill;
  const text = readableText(fill, c.playerText);
  return (
    <g {...common}>
      {interactive && <circle cx={x} cy={y} r={r * 1.6} fill="transparent" />}
      {selected &&
        (player.shape === 'square' ? (
          <rect
            x={x - r - 0.35}
            y={y - r - 0.35}
            width={2 * r + 0.7}
            height={2 * r + 0.7}
            fill="none"
            stroke={c.selected}
            strokeWidth={0.35}
          />
        ) : (
          <circle cx={x} cy={y} r={r + 0.35} fill="none" stroke={c.selected} strokeWidth={0.35} />
        ))}
      {player.shape === 'square' ? (
        <rect
          x={x - r}
          y={y - r}
          width={2 * r}
          height={2 * r}
          fill={fill}
          stroke={c.playerStroke}
          strokeWidth={0.15}
        />
      ) : (
        <circle cx={x} cy={y} r={r} fill={fill} stroke={c.playerStroke} strokeWidth={0.15} />
      )}
      {player.label && (
        <text
          x={x}
          y={y}
          fill={text}
          fontSize={player.label.length > 2 ? 0.6 : player.label.length > 1 ? 0.75 : 0.95}
          fontWeight={700}
          fontFamily={DIAGRAM_FONT}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {player.label}
        </text>
      )}
    </g>
  );
});
