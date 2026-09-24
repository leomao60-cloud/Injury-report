import { beforeEach, describe, expect, it } from 'vitest';
import { createPlay, flipPlay, getPlayer, movePlayer, updatePlayer } from '../model';
import * as H from './history';
import { usePlayStore } from './playStore';

describe('history', () => {
  it('undoes and redoes', () => {
    let h = H.initHistory(1);
    h = H.commit(h, 2);
    h = H.commit(h, 3);
    h = H.undo(h);
    expect(h.present).toBe(2);
    h = H.undo(h);
    expect(h.present).toBe(1);
    expect(H.canUndo(h)).toBe(false);
    h = H.redo(h);
    expect(h.present).toBe(2);
  });

  it('a new change clears redo', () => {
    let h = H.commit(H.initHistory(1), 2);
    h = H.undo(h);
    h = H.commit(h, 5);
    expect(H.canRedo(h)).toBe(false);
    expect(h.past).toEqual([1]);
  });

  it(`keeps at most ${H.HISTORY_LIMIT} steps`, () => {
    let h = H.initHistory(0);
    for (let i = 1; i <= 150; i++) h = H.commit(h, i);
    expect(h.past).toHaveLength(H.HISTORY_LIMIT);
    expect(h.past[0]).toBe(50);
  });

  it('merges changes with the same key into one step', () => {
    let h = H.initHistory('');
    h = H.commit(h, 'A', 'label');
    h = H.commit(h, 'AB', 'label');
    h = H.commit(h, 'ABC', 'label');
    expect(h.past).toEqual(['']);
    h = H.commit(h, 'x', 'other');
    expect(h.past).toEqual(['', 'ABC']);
  });

  it('undo breaks a merge run', () => {
    let h = H.initHistory('');
    h = H.commit(h, 'A', 'label');
    h = H.undo(h);
    h = H.commit(h, 'B', 'label');
    expect(h.past).toEqual(['']);
    expect(h.present).toBe('B');
  });

  it('ignores no-op commits', () => {
    const h = H.initHistory(1);
    expect(H.commit(h, 1)).toBe(h);
  });
});

describe('play store', () => {
  beforeEach(() => usePlayStore.getState().load(createPlay()));

  it('counts a whole drag as one undo step', () => {
    const s = usePlayStore.getState;
    const start = getPlayer(s().history.present, 'z')!;
    s().beginDrag();
    for (let i = 1; i <= 20; i++)
      s().dragTo((p) => movePlayer(p, 'z', { x: start.x - i * 0.5, y: start.y }));
    s().endDrag();
    expect(getPlayer(s().history.present, 'z')!.x).toBe(start.x - 10);
    expect(s().history.past).toHaveLength(1);
    s().undo();
    expect(getPlayer(s().history.present, 'z')!.x).toBe(start.x);
  });

  it('a click without movement adds no step', () => {
    const s = usePlayStore.getState;
    s().beginDrag();
    s().endDrag();
    expect(s().history.past).toHaveLength(0);
  });

  it('undoes a flip', () => {
    const s = usePlayStore.getState;
    const original = s().history.present;
    s().apply(flipPlay);
    expect(s().history.present).not.toEqual(original);
    s().undo();
    expect(s().history.present).toBe(original);
    s().redo();
    s().apply(flipPlay);
    expect(s().history.present).toEqual(original);
  });

  it('typing a label is one step', () => {
    const s = usePlayStore.getState;
    for (const label of ['A', 'AB', 'ABC'])
      s().apply((p) => updatePlayer(p, 'x', { label }), 'label:x');
    expect(s().history.past).toHaveLength(1);
    s().undo();
    expect(getPlayer(s().history.present, 'x')!.label).toBe('X');
  });
});
