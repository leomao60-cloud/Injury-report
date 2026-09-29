import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FieldStyle, Play } from '../model';
import { PlayDiagram, playView, type ViewWindow } from '../render';

/** Standalone SVG markup for a play, drawn by the same component the app uses. */
export function playSvgMarkup(
  play: Play,
  style: FieldStyle,
  window: ViewWindow,
  numbers = true,
  offenseFill?: string,
): string {
  return renderToStaticMarkup(
    createElement(PlayDiagram, { play, style, window, numbers, offenseFill }),
  );
}

export function playSvgElement(
  play: Play,
  style: FieldStyle,
  window: ViewWindow,
  numbers = true,
  offenseFill?: string,
): SVGSVGElement {
  const doc = new DOMParser().parseFromString(
    playSvgMarkup(play, style, window, numbers, offenseFill),
    'image/svg+xml',
  );
  return doc.documentElement as unknown as SVGSVGElement;
}

/** Width / height of a play's drawing (depends on its field and on how deep it goes). */
export function aspect(play: Play, window: ViewWindow): number {
  const { vb } = playView(play, window);
  return vb.width / vb.height;
}
