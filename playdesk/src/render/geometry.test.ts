import { describe, expect, it } from 'vitest';
import { endDirection, lineEnd, pathD, viewBoxFor } from './geometry';

describe('render geometry', () => {
  it('flips y so downfield is up', () => {
    expect(
      pathD([
        { x: 1, y: 0 },
        { x: 1, y: 5 },
      ]),
    ).toBe('M1.000 0.000 L1.000 -5.000');
  });

  it('computes the viewBox in yards', () => {
    const vb = viewBoxFor({ downfield: 20, backfield: 10, margin: 1 });
    expect(vb.height).toBe(30);
    expect(vb.y).toBe(-20);
  });

  it('points arrowheads along the last segment', () => {
    expect(
      endDirection([
        { x: 0, y: 0 },
        { x: 0, y: 10 },
      ]),
    ).toEqual({ dx: 0, dy: -1 });
    const end = lineEnd(
      [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
      ],
      'arrow',
    );
    expect(end.arrow![0]).toEqual([0, -10]);
    expect(end.shaft[1]!.y).toBeLessThan(10);
  });

  it('draws the block bar perpendicular to the line', () => {
    const end = lineEnd(
      [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ],
      'bar',
    );
    expect(end.bar![0][0]).toBeCloseTo(5);
    expect(end.bar![1][0]).toBeCloseTo(5);
    expect(end.bar![0][1]).not.toBeCloseTo(end.bar![1][1]);
  });
});
