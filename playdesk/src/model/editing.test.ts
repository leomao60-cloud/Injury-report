import { describe, expect, it } from 'vitest';
import {
  DEFENSES,
  addLine,
  addPlayer,
  applyFormation,
  createPlay,
  drawnPath,
  getPlayer,
  linePath,
  moveLinePoint,
  placeDefense,
  removeLinePoint,
  removePlayer,
  setShowDefense,
  smoothPath,
  FORMATIONS,
} from './index';

describe('adding and removing players', () => {
  it('adds an offensive player near the ball without stacking on anyone', () => {
    const { play, id } = addPlayer(createPlay(), 'offense');
    const p = getPlayer(play, id)!;
    expect(play.players.filter((x) => x.side === 'offense')).toHaveLength(12);
    expect(p.shape).toBe('circle');
    const second = addPlayer(play, 'offense');
    const q = getPlayer(second.play, second.id)!;
    expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(1);
  });

  it('adds a defender', () => {
    const { play, id } = addPlayer(createPlay(), 'defense');
    expect(getPlayer(play, id)).toMatchObject({ side: 'defense', shape: 'letter' });
    expect(getPlayer(play, id)!.y).toBeGreaterThan(0);
  });

  it('removes a player and his lines', () => {
    let play = addLine(createPlay(), { playerId: 'z', type: 'route', points: [{ x: 40, y: 10 }] });
    play = removePlayer(play, 'z');
    expect(getPlayer(play, 'z')).toBeUndefined();
    expect(play.lines).toHaveLength(0);
  });

  it('reset to formation keeps extra players', () => {
    const { play, id } = addPlayer(createPlay(), 'offense');
    expect(getPlayer(applyFormation(play, 'trips-rt'), id)).toBeDefined();
  });
});

describe('editing break points', () => {
  const base = addLine(createPlay(), {
    playerId: 'z',
    type: 'route',
    points: [
      { x: 40, y: 10 },
      { x: 35, y: 15 },
    ],
  });
  const lineId = base.lines[0]!.id;

  it('moves one point and leaves the others', () => {
    const play = moveLinePoint(base, lineId, 0, { x: 42, y: 12 });
    expect(play.lines[0]!.points).toEqual([
      { x: 42, y: 12 },
      { x: 35, y: 15 },
    ]);
  });

  it('keeps moved points on the field', () => {
    const play = moveLinePoint(base, lineId, 1, { x: 90, y: 10 });
    expect(play.lines[0]!.points[1]!.x).toBeLessThan(160 / 3);
  });

  it('removes a point, and the line when none are left', () => {
    let play = removeLinePoint(base, lineId, 0);
    expect(play.lines[0]!.points).toEqual([{ x: 35, y: 15 }]);
    play = removeLinePoint(play, lineId, 0);
    expect(play.lines).toHaveLength(0);
  });
});

describe('curved lines', () => {
  it('passes through every break point and ends at the last one', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ];
    const curve = smoothPath(pts);
    expect(curve.length).toBeGreaterThan(pts.length);
    for (const p of pts)
      expect(curve.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 1e-9)).toBe(true);
    expect(curve[curve.length - 1]).toEqual(pts[2]);
  });

  it('only smooths lines marked curved', () => {
    let play = addLine(createPlay(), {
      playerId: 'f',
      type: 'route',
      points: [
        { x: 30, y: -3 },
        { x: 34, y: 4 },
      ],
    });
    const line = play.lines[0]!;
    expect(drawnPath(play, line)).toEqual(linePath(play, line));
    play = { ...play, lines: [{ ...line, curved: true }] };
    expect(drawnPath(play, play.lines[0]!).length).toBeGreaterThan(3);
  });
});

describe('defensive fronts', () => {
  it.each(DEFENSES.map((d) => d.id))(
    '%s puts 11 defenders on the field with unique ids',
    (front) => {
      for (const f of FORMATIONS) {
        const play = placeDefense(createPlay({ formation: f.id }), front);
        const d = play.players.filter((p) => p.side === 'defense');
        expect(d).toHaveLength(11);
        expect(new Set(d.map((p) => p.id)).size).toBe(11);
        expect(d.every((p) => p.y > 0)).toBe(true);
        const offense = play.players.filter((p) => p.side === 'offense');
        expect(getPlayer(play, 'cb-l')!.x).toBeCloseTo(Math.min(...offense.map((p) => p.x)), 3);
        expect(getPlayer(play, 'cb-r')!.x).toBeCloseTo(Math.max(...offense.map((p) => p.x)), 3);
      }
    },
  );

  it('remembers the front when the defense is hidden and shown again', () => {
    let play = placeDefense(createPlay(), '34-cover3');
    play = setShowDefense(setShowDefense(play, false), true);
    expect(play.defense).toBe('34-cover3');
    expect(getPlayer(play, 'nt')).toBeDefined();
  });

  it('the 3-4 plays a single high safety and the 4-2-5 has a nickel over the slot', () => {
    const three = placeDefense(createPlay({ formation: 'trips-rt' }), '34-cover3');
    expect(three.players.filter((p) => p.side === 'defense' && p.y >= 12)).toHaveLength(1);
    const nickel = placeDefense(createPlay({ formation: 'trips-rt' }), '425-cover1');
    const h = getPlayer(nickel, 'h')!;
    expect(getPlayer(nickel, 'nb')!.x).toBeCloseTo(h.x, 3);
  });
});
