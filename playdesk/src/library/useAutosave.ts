import { useEffect, useState } from 'react';
import type { Play } from '../model';
import { usePlayStore } from '../store/playStore';
import { validatePlay } from './validate';

/**
 * The play open in the editor is written to localStorage on every change.
 * localStorage is synchronous, so the last edit is kept even if the page is
 * refreshed or closed a moment later. Saved plays live in IndexedDB (db.ts).
 */
const KEY = 'playdesk:autosave';

export function readAutosave(): Play | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? validatePlay(JSON.parse(raw)) : null;
  } catch {
    return null; // storage blocked, or a damaged autosave: start fresh
  }
}

export function writeAutosave(play: Play) {
  try {
    localStorage.setItem(KEY, JSON.stringify(play));
  } catch {
    // storage full or blocked; nothing else we can do here
  }
}

/** Restore the last open play on start, then save it after every change. */
export function useAutosave() {
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const saved = readAutosave();
    if (saved) usePlayStore.getState().load(saved);
    // One-time restore on mount; the editor waits for it so it never flashes the default play.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRestored(true);
    return usePlayStore.subscribe((s, prev) => {
      if (s.history.present !== prev.history.present) writeAutosave(s.history.present);
    });
  }, []);

  return restored;
}
