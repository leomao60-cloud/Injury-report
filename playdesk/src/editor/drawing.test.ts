import { describe, expect, it } from 'vitest';
import { createPlay, getPlayer, placeDefense } from '../model';
import { describeSpot, drawClick, finishDraft, undoDraftPoint } from './drawing';

const play = placeDefense(createPlay());
const z = getPlayer(play, 'z')!;
const y = getPlayer(play, 'y')!;
const lbM = getPlayer(play, 'lb-m')!;

describe('drawClick', () => {
  it('starts a line by clicking a player', () => {
    const step = drawClick(play, null, 'route', { kind: 'player', player: z }, z);
    expect(step.draft).toEqual({ playerId: 'z', type: 'route', points: [] });
  });

  it('ignores field clicks with no line started', () => {
    expect(drawClick(play, null, 'route', { kind: 'field' }, { x: 5, y: 5 }).draft).toBeNull();
  });

  it('adds a break for each field click and finishes on a second click of the last point', () => {
    let step = drawClick(play, null, 'route', { kind: 'player', player: z }, z);
    step = drawClick(play, step.draft, 'route', { kind: 'field' }, { x: z.x, y: 10 });
    step = drawClick(play, step.draft, 'route', { kind: 'field' }, { x: z.x - 4, y: 14 });
    expect(step.draft!.points).toHaveLength(2);
    step = drawClick(play, step.draft, 'route', { kind: 'field' }, { x: z.x - 4, y: 14 });
    expect(step.draft).toBeNull();
    expect(step.commit).toEqual({
      playerId: 'z',
      type: 'route',
      points: [
        { x: z.x, y: 10 },
        { x: z.x - 4, y: 14 },
      ],
    });
  });

  it('clicking a teammate finishes the current line and starts his', () => {
    let step = drawClick(play, null, 'route', { kind: 'player', player: z }, z);
    step = drawClick(play, step.draft, 'route', { kind: 'field' }, { x: z.x, y: 10 });
    step = drawClick(play, step.draft, 'route', { kind: 'player', player: y }, y);
    expect(step.commit?.playerId).toBe('z');
    expect(step.draft).toEqual({ playerId: 'y', type: 'route', points: [] });
  });

  it('clicking a teammate with no points just switches players', () => {
    let step = drawClick(play, null, 'route', { kind: 'player', player: z }, z);
    step = drawClick(play, step.draft, 'route', { kind: 'player', player: y }, y);
    expect(step.commit).toBeUndefined();
    expect(step.draft?.playerId).toBe('y');
  });

  it('a block ends on the defender that was clicked', () => {
    let step = drawClick(play, null, 'block', { kind: 'player', player: y }, y);
    step = drawClick(play, step.draft, 'block', { kind: 'player', player: lbM }, lbM);
    expect(step.draft).toBeNull();
    expect(step.commit?.points).toEqual([{ x: lbM.x, y: lbM.y }]);
  });

  it('a route treats a defender like the field', () => {
    let step = drawClick(play, null, 'route', { kind: 'player', player: y }, y);
    step = drawClick(
      play,
      step.draft,
      'route',
      { kind: 'player', player: lbM },
      { x: lbM.x, y: lbM.y },
    );
    expect(step.draft?.points).toHaveLength(1);
  });

  it('ignores a click right on the start point', () => {
    let step = drawClick(play, null, 'route', { kind: 'player', player: z }, z);
    step = drawClick(play, step.draft, 'route', { kind: 'field' }, { x: z.x + 0.2, y: z.y });
    expect(step.draft?.points).toHaveLength(0);
  });
});

describe('draft helpers', () => {
  it('Backspace removes the last point, then cancels', () => {
    let d = undoDraftPoint({ playerId: 'z', type: 'route', points: [{ x: 1, y: 1 }] });
    expect(d?.points).toHaveLength(0);
    d = undoDraftPoint(d);
    expect(d).toBeNull();
  });

  it('finishing with no points adds nothing', () => {
    expect(finishDraft({ playerId: 'z', type: 'route', points: [] })).toEqual({ draft: null });
  });
});

describe('describeSpot', () => {
  it('describes a spot relative to the ball and LOS', () => {
    expect(describeSpot(play, { x: play.ballX + 6, y: 9 })).toBe(
      '6 yd right of ball · +9 yd past LOS',
    );
    expect(describeSpot(play, { x: play.ballX - 2.5, y: -5 })).toBe(
      '2.5 yd left of ball · 5 yd behind LOS',
    );
    expect(describeSpot(play, { x: play.ballX, y: 0 })).toBe('on the ball · on the LOS');
  });
});
