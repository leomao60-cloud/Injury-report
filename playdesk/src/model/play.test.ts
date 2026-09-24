import { describe, expect, it } from 'vitest';
import {
  CENTER_X,
  FIELD_WIDTH,
  FORMATIONS,
  HASH_WIDTH,
  SIDELINE_MARGIN,
  addLine,
  applyFormation,
  ballXFor,
  clearLines,
  createPlay,
  exampleSmash,
  flipPlay,
  getPlayer,
  hashXs,
  isOnLine,
  lineStart,
  movePlayer,
  placeDefense,
  removeDefense,
  removeLinesFor,
  setBallSpot,
  setLevel,
  snapToGrid,
  updateLine,
  updatePlayer,
  type Level,
  type Play,
} from './index';

const LEVELS: Level[] = ['hs', 'college', 'nfl'];

function allInBounds(play: Play) {
  return play.players.every((p) => p.x >= SIDELINE_MARGIN && p.x <= FIELD_WIDTH - SIDELINE_MARGIN);
}

describe('field geometry', () => {
  it('uses the real hash widths', () => {
    expect(HASH_WIDTH.hs * 3).toBeCloseTo(160 / 3); // hashes split the field in thirds
    expect(HASH_WIDTH.college * 3).toBeCloseTo(40); // 40 feet
    expect(HASH_WIDTH.nfl * 3).toBeCloseTo(18.5); // 18'6"
  });

  it.each(LEVELS)('puts the ball on the correct hash for %s', (level) => {
    const { left, right } = hashXs(level);
    expect(ballXFor(level, 'left')).toBeCloseTo(left, 2);
    expect(ballXFor(level, 'middle')).toBeCloseTo(CENTER_X, 2);
    expect(ballXFor(level, 'right')).toBeCloseTo(right, 2);
    expect(right - left).toBeCloseTo(HASH_WIDTH[level], 2);
  });

  it('left-hash ball sits 17.78 yd from the sideline in high school, 20 in college, 23.58 in the NFL', () => {
    expect(ballXFor('hs', 'left')).toBeCloseTo(17.78, 2);
    expect(ballXFor('college', 'left')).toBeCloseTo(20, 2);
    expect(ballXFor('nfl', 'left')).toBeCloseTo(23.58, 2);
  });
});

describe('createPlay', () => {
  it('builds 11 offensive players with the ball in the middle by default', () => {
    const play = createPlay();
    expect(play.players.filter((p) => p.side === 'offense')).toHaveLength(11);
    expect(play.ballX).toBeCloseTo(CENTER_X, 2);
    expect(getPlayer(play, 'c')!.x).toBe(play.ballX);
    expect(getPlayer(play, 'c')!.shape).toBe('square');
  });

  it('can include the defense', () => {
    const play = createPlay({ showDefense: true });
    expect(play.players.filter((p) => p.side === 'defense')).toHaveLength(11);
  });
});

describe('formations', () => {
  it.each(FORMATIONS.map((f) => [f.name, f.id] as const))(
    '%s has 11 players and exactly 7 on the line of scrimmage',
    (_name, id) => {
      const play = createPlay({ formation: id });
      const offense = play.players.filter((p) => p.side === 'offense');
      expect(offense).toHaveLength(11);
      expect(offense.filter(isOnLine)).toHaveLength(7);
      expect(new Set(offense.map((p) => p.id)).size).toBe(11);
    },
  );

  it.each(FORMATIONS.map((f) => [f.name, f.id] as const))(
    '%s stays inside the sidelines on every hash at every level',
    (_name, id) => {
      for (const level of LEVELS) {
        for (const ballOn of ['left', 'middle', 'right'] as const) {
          expect(allInBounds(createPlay({ formation: id, level, ballOn }))).toBe(true);
        }
      }
    },
  );

  it('applyFormation moves players and keeps their lines attached', () => {
    let play = createPlay({ formation: 'doubles' });
    play = addLine(play, { playerId: 'z', type: 'route', points: [{ x: 45, y: 10 }] });
    const zBefore = getPlayer(play, 'z')!;
    const after = applyFormation(play, 'bunch-rt');
    const zAfter = getPlayer(after, 'z')!;
    const dx = zAfter.x - zBefore.x;
    const dy = zAfter.y - zBefore.y;
    expect(after.formation).toBe('bunch-rt');
    expect(after.lines[0]!.points[0]!.x).toBeCloseTo(45 + dx, 3);
    expect(after.lines[0]!.points[0]!.y).toBeCloseTo(10 + dy, 3);
  });

  it('applyFormation keeps custom labels', () => {
    let play = updatePlayer(createPlay(), 'z', { label: 'ZZ' });
    play = applyFormation(play, 'trips-rt');
    expect(getPlayer(play, 'z')!.label).toBe('ZZ');
  });
});

describe('movePlayer', () => {
  it('moves the player and every one of his lines by the same amount', () => {
    let play = createPlay();
    const y = getPlayer(play, 'y')!;
    play = addLine(play, { playerId: 'y', type: 'motion', points: [{ x: y.x - 3, y: y.y - 1 }] });
    play = addLine(play, {
      playerId: 'y',
      type: 'route',
      points: [
        { x: y.x - 3, y: 10 },
        { x: y.x + 3, y: 15 },
      ],
    });
    const moved = movePlayer(play, 'y', { x: y.x + 2, y: y.y - 0.5 });
    expect(getPlayer(moved, 'y')).toMatchObject({ x: y.x + 2, y: y.y - 0.5 });
    moved.lines.forEach((line, i) => {
      line.points.forEach((pt, j) => {
        expect(pt.x).toBeCloseTo(play.lines[i]!.points[j]!.x + 2, 3);
        expect(pt.y).toBeCloseTo(play.lines[i]!.points[j]!.y - 0.5, 3);
      });
    });
  });

  it("does not move other players' lines", () => {
    let play = createPlay();
    play = addLine(play, { playerId: 'x', type: 'route', points: [{ x: 10, y: 10 }] });
    const moved = movePlayer(play, 'z', { x: 40, y: -1 });
    expect(moved.lines[0]!.points[0]).toEqual({ x: 10, y: 10 });
  });

  it('keeps players inside the sidelines', () => {
    const moved = movePlayer(createPlay(), 'x', { x: -10, y: 0 });
    expect(getPlayer(moved, 'x')!.x).toBe(SIDELINE_MARGIN);
  });
});

describe('flipPlay', () => {
  it('flipping twice returns the original play', () => {
    const play = exampleSmash();
    expect(flipPlay(flipPlay(play))).toEqual(play);
  });

  it('flipping twice returns the original on a hash when everyone fits', () => {
    const play = setBallSpot(exampleSmash(), 'left');
    const narrow = createPlay({ formation: 'i-rt', ballOn: 'right', level: 'nfl' });
    expect(flipPlay(flipPlay(narrow))).toEqual(narrow);
    expect(allInBounds(flipPlay(play))).toBe(true);
  });

  it('mirrors players around the ball', () => {
    const play = createPlay({ formation: 'trips-rt' });
    const flipped = flipPlay(play);
    const z = getPlayer(play, 'z')!;
    expect(getPlayer(flipped, 'z')!.x).toBeCloseTo(2 * play.ballX - z.x, 3);
    expect(getPlayer(flipped, 'c')!.x).toBe(play.ballX);
  });
});

describe('setBallSpot', () => {
  it.each(LEVELS)(
    'shifts everything with the ball and stays inside the sidelines (%s)',
    (level) => {
      const play = createPlay({ level, formation: 'empty-3x2' });
      for (const ballOn of ['left', 'right', 'middle'] as const) {
        const moved = setBallSpot(play, ballOn);
        expect(moved.ballX).toBeCloseTo(ballXFor(level, ballOn), 3);
        expect(getPlayer(moved, 'c')!.x).toBeCloseTo(moved.ballX, 3);
        expect(allInBounds(moved)).toBe(true);
      }
    },
  );

  it('pulls wide receivers in when the ball is on the hash and moves their lines too', () => {
    let play = createPlay({ level: 'hs', formation: 'doubles' });
    const x = getPlayer(play, 'x')!;
    play = addLine(play, { playerId: 'x', type: 'route', points: [{ x: x.x, y: 10 }] });
    const moved = setBallSpot(play, 'left');
    const xAfter = getPlayer(moved, 'x')!;
    expect(xAfter.x).toBe(SIDELINE_MARGIN);
    expect(moved.lines[0]!.points[0]!.x).toBeCloseTo(xAfter.x, 3);
  });

  it('round-trips middle → hash → middle when nobody hits the sideline', () => {
    const play = createPlay({ level: 'nfl', formation: 'i-rt' });
    expect(setBallSpot(setBallSpot(play, 'left'), 'middle')).toEqual(play);
  });
});

describe('setLevel', () => {
  it('moves the ball to the new hash width', () => {
    const play = createPlay({ level: 'hs', ballOn: 'left' });
    const nfl = setLevel(play, 'nfl');
    expect(nfl.level).toBe('nfl');
    expect(nfl.ballX).toBeCloseTo(ballXFor('nfl', 'left'), 3);
    expect(getPlayer(nfl, 'c')!.x).toBeCloseTo(nfl.ballX, 3);
    expect(allInBounds(nfl)).toBe(true);
  });
});

describe('lineStart', () => {
  it('starts at the player when there is no motion', () => {
    let play = createPlay();
    play = addLine(play, { playerId: 'z', type: 'route', points: [{ x: 40, y: 10 }] });
    const z = getPlayer(play, 'z')!;
    expect(lineStart(play, play.lines[0]!)).toEqual({ x: z.x, y: z.y });
  });

  it('starts routes and blocks where the motion ends', () => {
    let play = createPlay();
    play = addLine(play, { playerId: 'z', type: 'motion', points: [{ x: 30, y: -3 }] });
    play = addLine(play, { playerId: 'z', type: 'route', points: [{ x: 35, y: 10 }] });
    const route = play.lines.find((l) => l.type === 'route')!;
    const motion = play.lines.find((l) => l.type === 'motion')!;
    expect(lineStart(play, route)).toEqual({ x: 30, y: -3 });
    expect(lineStart(play, motion)).toEqual({
      x: getPlayer(play, 'z')!.x,
      y: getPlayer(play, 'z')!.y,
    });
  });

  it('keeps only one motion per player', () => {
    let play = createPlay();
    play = addLine(play, { playerId: 'z', type: 'motion', points: [{ x: 30, y: -3 }] });
    play = addLine(play, { playerId: 'z', type: 'motion', points: [{ x: 28, y: -3 }] });
    expect(play.lines.filter((l) => l.type === 'motion')).toHaveLength(1);
    expect(play.lines[0]!.points[0]!.x).toBe(28);
  });
});

describe('snapToGrid', () => {
  it('snaps to the half yard', () => {
    expect(snapToGrid({ x: 10.26, y: -1.74 })).toEqual({ x: 10.5, y: -1.5 });
    expect(snapToGrid({ x: 10.24, y: 3.1 })).toEqual({ x: 10, y: 3 });
  });

  it('supports other steps', () => {
    expect(snapToGrid({ x: 10.6, y: 2.4 }, 1)).toEqual({ x: 11, y: 2 });
  });
});

describe('placeDefense', () => {
  it('puts 11 defenders on the defensive side of the ball', () => {
    const play = placeDefense(createPlay());
    const d = play.players.filter((p) => p.side === 'defense');
    expect(d).toHaveLength(11);
    expect(d.every((p) => p.y > 0)).toBe(true);
    expect(d.filter((p) => p.y === 1)).toHaveLength(4); // four down linemen
    expect(d.filter((p) => p.y >= 10)).toHaveLength(2); // two deep
  });

  it.each(FORMATIONS.map((f) => f.id))(
    'lines the corners up over the widest receivers (%s)',
    (id) => {
      const play = placeDefense(createPlay({ formation: id }));
      const offense = play.players.filter((p) => p.side === 'offense');
      const widestL = Math.min(...offense.map((p) => p.x));
      const widestR = Math.max(...offense.map((p) => p.x));
      expect(getPlayer(play, 'cb-l')!.x).toBeCloseTo(widestL, 3);
      expect(getPlayer(play, 'cb-r')!.x).toBeCloseTo(widestR, 3);
    },
  );

  it('sends the Sam linebacker to the strong side', () => {
    const right = placeDefense(createPlay({ formation: 'trips-rt' }));
    expect(getPlayer(right, 'lb-s')!.x).toBeGreaterThan(right.ballX);
    const left = placeDefense(flipPlay(createPlay({ formation: 'trips-rt' })));
    expect(getPlayer(left, 'lb-s')!.x).toBeLessThan(left.ballX);
  });

  it('replaces the defense and its lines instead of stacking them', () => {
    let play = placeDefense(createPlay());
    play = addLine(play, { playerId: 'lb-m', type: 'route', points: [{ x: 26, y: 0 }] });
    play = placeDefense(play);
    expect(play.players.filter((p) => p.side === 'defense')).toHaveLength(11);
    expect(play.lines).toHaveLength(0);
    const removed = removeDefense(play);
    expect(removed.players.filter((p) => p.side === 'defense')).toHaveLength(0);
    expect(removed.showDefense).toBe(false);
  });
});

describe('editing helpers', () => {
  it('limits labels to 3 characters', () => {
    expect(getPlayer(updatePlayer(createPlay(), 'x', { label: 'ABCD' }), 'x')!.label).toBe('ABC');
  });

  it('changing a line to motion removes the other motion', () => {
    let play = createPlay();
    play = addLine(play, { playerId: 'z', type: 'motion', points: [{ x: 30, y: -3 }] });
    play = addLine(play, { playerId: 'z', type: 'route', points: [{ x: 30, y: 5 }] });
    const route = play.lines.find((l) => l.type === 'route')!;
    play = updateLine(play, route.id, { type: 'motion' });
    expect(play.lines).toHaveLength(1);
    expect(play.lines[0]!.id).toBe(route.id);
  });

  it('removes all lines for a player, or all lines', () => {
    let play = exampleSmash();
    const before = play.lines.length;
    play = removeLinesFor(play, 'z');
    expect(play.lines.length).toBe(before - 1);
    expect(clearLines(play).lines).toHaveLength(0);
  });
});
