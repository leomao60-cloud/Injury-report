import type { ReactNode, SVGProps } from 'react';
import { drawnPath, type FieldStyle, type Play } from '../model';
import { Field } from './Field';
import { DEFAULT_WINDOW, viewBoxFor, type ViewWindow } from './geometry';
import { PlayLineView } from './PlayLineView';
import { PlayerMarker } from './PlayerMarker';

export interface PlayDiagramOptions {
  style?: FieldStyle;
  window?: ViewWindow;
  numbers?: boolean;
  /** Fill for offensive players without their own color, e.g. the team color. */
  offenseFill?: string;
}

export interface PlayDiagramProps extends PlayDiagramOptions {
  play: Play;
  title?: string;
  className?: string;
  svgProps?: SVGProps<SVGSVGElement>;
  /** Render custom content (editor layers) between the lines and the players. */
  children?: ReactNode;
}

/**
 * A complete, static play drawing. Used for thumbnails, sheets and exports.
 * The editor uses the same building blocks with interaction added.
 */
export function PlayDiagram({
  play,
  style = 'whiteboard',
  window = DEFAULT_WINDOW,
  numbers = true,
  offenseFill,
  title,
  className,
  svgProps,
  children,
}: PlayDiagramProps) {
  const vb = viewBoxFor(window);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={vb.attr}
      className={className}
      role="img"
      aria-label={title ?? play.name}
      preserveAspectRatio="xMidYMid meet"
      {...svgProps}
    >
      {title && <title>{title}</title>}
      <Field level={play.level} style={style} window={window} numbers={numbers} />
      <g>
        {play.lines.map((line) => (
          <PlayLineView
            key={line.id}
            line={line}
            points={drawnPath(play, line)}
            type={line.type}
            color={line.color}
            style={style}
          />
        ))}
      </g>
      {children}
      <g>
        {play.players.map((p) => (
          <PlayerMarker key={p.id} player={p} style={style} defaultFill={offenseFill} />
        ))}
      </g>
    </svg>
  );
}
