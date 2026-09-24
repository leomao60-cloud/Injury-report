/** Pure undo/redo history. The store in playStore.ts wraps this. */
export const HISTORY_LIMIT = 100;

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** Key of the last committed change, used to merge rapid edits (e.g. typing a label) into one step. */
  lastKey?: string;
}

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/** Record a new present. Changes with the same `key` in a row merge into one undo step. */
export function commit<T>(h: History<T>, next: T, key?: string): History<T> {
  if (next === h.present) return h;
  if (key !== undefined && key === h.lastKey) {
    return { ...h, present: next, future: [] };
  }
  const past = [...h.past, h.present];
  if (past.length > HISTORY_LIMIT) past.splice(0, past.length - HISTORY_LIMIT);
  return { past, present: next, future: [], lastKey: key };
}

/** Replace the present without recording a step (used while dragging). */
export function replace<T>(h: History<T>, next: T): History<T> {
  return { ...h, present: next };
}

/** Record `base` as the step before the current present (end of a drag). */
export function commitFrom<T>(h: History<T>, base: T): History<T> {
  if (base === h.present) return h;
  const past = [...h.past, base];
  if (past.length > HISTORY_LIMIT) past.splice(0, past.length - HISTORY_LIMIT);
  return { past, present: h.present, future: [], lastKey: undefined };
}

export function undo<T>(h: History<T>): History<T> {
  const prev = h.past[h.past.length - 1];
  if (prev === undefined) return h;
  return {
    past: h.past.slice(0, -1),
    present: prev,
    future: [h.present, ...h.future],
    lastKey: undefined,
  };
}

export function redo<T>(h: History<T>): History<T> {
  const next = h.future[0];
  if (next === undefined) return h;
  return {
    past: [...h.past, h.present],
    present: next,
    future: h.future.slice(1),
    lastKey: undefined,
  };
}

export const canUndo = <T>(h: History<T>) => h.past.length > 0;
export const canRedo = <T>(h: History<T>) => h.future.length > 0;
