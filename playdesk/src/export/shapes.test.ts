import { describe, expect, it } from 'vitest';
import { exampleInsideZone, exampleJetSweep, exampleSmash } from '../model';
import { DEFAULT_WINDOW } from '../render';
import { fitAspect } from './fit';
import { diagramShapes, solidHex } from './shapes';

const box = { x: 1, y: 1, w: 10, h: 5 };

describe('PowerPoint shapes', () => {
  it('draws every player as its own shape', () => {
    const play = exampleInsideZone();
    const shapes = diagramShapes(play, 'whiteboard', DEFAULT_WINDOW, box);
    const players = shapes.filter(
      (s) => s.name?.startsWith('Player') || s.name?.startsWith('Defender'),
    );
    expect(players).toHaveLength(play.players.length);
    expect(shapes.filter((s) => s.kind === 'rect' && s.name?.startsWith('Player'))).toHaveLength(1); // the center
  });

  it('puts an arrow on the last segment of routes only', () => {
    const shapes = diagramShapes(exampleSmash(), 'whiteboard', DEFAULT_WINDOW, box);
    const arrows = shapes.filter((s) => s.kind === 'line' && s.arrow);
    expect(arrows).toHaveLength(5); // five routes; blocks get a T-bar instead
    expect(shapes.filter((s) => s.name === 'block end')).toHaveLength(5);
  });

  it('dashes motion', () => {
    const shapes = diagramShapes(exampleJetSweep(), 'whiteboard', DEFAULT_WINDOW, box);
    expect(shapes.some((s) => s.kind === 'line' && s.dash)).toBe(true);
  });

  it('keeps everything inside the box', () => {
    for (const s of diagramShapes(exampleSmash(), 'turf', DEFAULT_WINDOW, box)) {
      const xs = s.kind === 'line' ? [s.x1, s.x2] : [s.x, s.x + s.w];
      const ys = s.kind === 'line' ? [s.y1, s.y2] : [s.y, s.y + s.h];
      for (const x of xs) expect(x).toBeGreaterThanOrEqual(box.x - 1e-6);
      for (const x of xs) expect(x).toBeLessThanOrEqual(box.x + box.w + 1e-6);
      for (const y of ys) expect(y).toBeGreaterThanOrEqual(box.y - 1e-6);
      for (const y of ys) expect(y).toBeLessThanOrEqual(box.y + box.h + 1e-6);
    }
  });

  it('converts colors for PowerPoint', () => {
    expect(solidHex('#ffffff')).toBe('ffffff');
    expect(solidHex('#abc')).toBe('aabbcc');
    expect(solidHex('rgba(0,0,0,0.5)')).toBe('808080');
  });

  it('fits a diagram into a box keeping its shape', () => {
    const r = fitAspect({ x: 0, y: 0, w: 10, h: 2 }, 2);
    expect(r).toEqual({ x: 3, y: 0, w: 4, h: 2 });
  });
});
