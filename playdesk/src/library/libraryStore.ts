import { create } from 'zustand';
import { newId, type Play } from '../model';
import type { SheetDoc } from '../sheets/types';
import { DEFAULT_BRANDING, type Branding } from './branding';
import * as db from './db';
import type { SavedPlay } from './types';

interface LibraryState {
  loaded: boolean;
  plays: SavedPlay[];
  folders: string[];
  sheets: SheetDoc[];
  branding: Branding;
  /** Branding is read from storage once; after that the store is the source of truth. */
  brandingLoaded: boolean;
  error: string | null;
  setBranding: (b: Branding) => Promise<void>;
  refresh: () => Promise<void>;
  /** Save (insert or update) the play under its own id. */
  save: (play: Play, folder?: string) => Promise<void>;
  /** Save under a new id; returns the copy. */
  saveCopy: (play: Play, folder?: string) => Promise<Play>;
  rename: (id: string, name: string) => Promise<void>;
  update: (id: string, patch: Partial<Pick<SavedPlay, 'folder' | 'tags'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  addFolder: (name: string) => Promise<void>;
  removeFolder: (name: string) => Promise<void>;
  saveSheet: (sheet: SheetDoc) => Promise<void>;
  removeSheet: (id: string) => Promise<void>;
}

async function guard(set: (s: Partial<LibraryState>) => void, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.error(e);
    set({ error: 'The browser would not let Playdesk save. Check that site storage is allowed.' });
  }
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  loaded: false,
  plays: [],
  folders: [],
  sheets: [],
  branding: DEFAULT_BRANDING,
  brandingLoaded: false,
  error: null,
  setBranding: async (b) => {
    set({ branding: b, brandingLoaded: true });
    await guard(set, () => db.setBranding(b));
  },
  refresh: async () => {
    await guard(set, async () => {
      await db.seedExamples();
      const [plays, folders, sheets, branding] = await Promise.all([
        db.listPlays(),
        db.getFolders(),
        db.listSheets(),
        db.getBranding(),
      ]);
      set({ plays, folders, sheets, loaded: true, error: null });
      // Never replace branding the coach has already started editing with an older stored copy.
      if (!get().brandingLoaded) set({ branding, brandingLoaded: true });
    });
  },
  save: async (play, folder) => {
    await guard(set, async () => {
      const existing = get().plays.find((p) => p.id === play.id);
      const now = Date.now();
      const saved: SavedPlay = existing
        ? { ...existing, play, updatedAt: now, example: undefined }
        : {
            id: play.id,
            play,
            folder: folder ?? 'Offense',
            tags: [],
            createdAt: now,
            updatedAt: now,
          };
      if (!saved.example) delete saved.example;
      await db.putPlay(saved);
      await get().refresh();
    });
  },
  saveCopy: async (play, folder) => {
    const existing = get().plays.find((p) => p.id === play.id);
    const copy: Play = { ...play, id: newId('play'), name: `${play.name} (copy)` };
    await guard(set, async () => {
      const now = Date.now();
      await db.putPlay({
        id: copy.id,
        play: copy,
        folder: folder ?? existing?.folder ?? 'Offense',
        tags: existing?.tags ?? [],
        createdAt: now,
        updatedAt: now,
      });
      await get().refresh();
    });
    return copy;
  },
  rename: async (id, name) => {
    const item = get().plays.find((p) => p.id === id);
    if (!item) return;
    await guard(set, async () => {
      await db.putPlay({ ...item, play: { ...item.play, name }, updatedAt: Date.now() });
      await get().refresh();
    });
  },
  update: async (id, patch) => {
    const item = get().plays.find((p) => p.id === id);
    if (!item) return;
    await guard(set, async () => {
      await db.putPlay({ ...item, ...patch, updatedAt: Date.now() });
      await get().refresh();
    });
  },
  remove: async (id) => {
    await guard(set, async () => {
      await db.deletePlay(id);
      await get().refresh();
    });
  },
  addFolder: async (name) => {
    const clean = name.trim().slice(0, 40);
    if (!clean || get().folders.includes(clean)) return;
    await guard(set, async () => {
      await db.setFolders([...get().folders, clean]);
      await get().refresh();
    });
  },
  removeFolder: async (name) => {
    await guard(set, async () => {
      // Plays in a deleted folder move to Offense rather than disappearing.
      for (const p of get().plays.filter((p) => p.folder === name))
        await db.putPlay({ ...p, folder: 'Offense' });
      await db.setFolders(get().folders.filter((f) => f !== name));
      await get().refresh();
    });
  },
  saveSheet: async (sheet) => {
    await guard(set, async () => {
      await db.putSheet({ ...sheet, updatedAt: Date.now() });
      await get().refresh();
    });
  },
  removeSheet: async (id) => {
    await guard(set, async () => {
      await db.deleteSheet(id);
      await get().refresh();
    });
  },
}));
