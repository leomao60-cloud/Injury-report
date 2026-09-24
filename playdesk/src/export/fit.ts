import type { Rect } from '../sheets/layout';

/** Largest box with the given aspect ratio centered inside `r`. */
export function fitAspect(r: Rect, aspectRatio: number): Rect {
  let w = r.w;
  let h = w / aspectRatio;
  if (h > r.h) {
    h = r.h;
    w = h * aspectRatio;
  }
  return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w, h };
}
