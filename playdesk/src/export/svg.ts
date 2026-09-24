import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FieldStyle, Play } from '../model';
import { PlayDiagram, viewBoxFor, type ViewWindow } from '../render';

/** Standalone SVG markup for a play, drawn by the same component the app uses. */
export function playSvgMarkup(
  play: Play,
  style: FieldStyle,
  window: ViewWindow,
  numbers = true,
): string {
  return renderToStaticMarkup(createElement(PlayDiagram, { play, style, window, numbers }));
}

export function playSvgElement(
  play: Play,
  style: FieldStyle,
  window: ViewWindow,
  numbers = true,
): SVGSVGElement {
  const doc = new DOMParser().parseFromString(
    playSvgMarkup(play, style, window, numbers),
    'image/svg+xml',
  );
  return doc.documentElement as unknown as SVGSVGElement;
}

export function aspect(window: ViewWindow): number {
  const vb = viewBoxFor(window);
  return vb.width / vb.height;
}
