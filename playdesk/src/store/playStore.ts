import { create } from 'zustand';
import { createPlay, type Play } from '../model';
import * as H from './history';

interface PlayState {
  history: H.History<Play>;
  /** Snapshot taken when a drag starts; the whole drag becomes one undo step. */
  dragBase: Play | null;
  /** Apply a model function as one undoable step. */
  apply: (fn: (play: Play) => Play, key?: string) => void;
  beginDrag: () => void;
  dragTo: (fn: (play: Play) => Play) => void;
  endDrag: () => void;
  undo: () => void;
  redo: () => void;
  /** Open a different play, starting a fresh history. */
  load: (play: Play) => void;
}

export const usePlayStore = create<PlayState>((set, get) => ({
  history: H.initHistory(createPlay({ name: 'New play' })),
  dragBase: null,
  apply: (fn, key) => {
    const { history } = get();
    set({ history: H.commit(history, fn(history.present), key) });
  },
  beginDrag: () => set({ dragBase: get().history.present }),
  dragTo: (fn) => {
    const { history } = get();
    set({ history: H.replace(history, fn(history.present)) });
  },
  endDrag: () => {
    const { history, dragBase } = get();
    if (!dragBase) return;
    set({ history: H.commitFrom(history, dragBase), dragBase: null });
  },
  undo: () => set({ history: H.undo(get().history), dragBase: null }),
  redo: () => set({ history: H.redo(get().history), dragBase: null }),
  load: (play) => set({ history: H.initHistory(play), dragBase: null }),
}));

export const usePlay = () => usePlayStore((s) => s.history.present);
