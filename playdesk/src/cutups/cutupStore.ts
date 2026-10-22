import { create } from 'zustand';
import * as db from '../library/db';
import { breakdownFromCsv, type Breakdown } from './breakdown';
import { BUILT_IN_TEMPLATES, type CutupTemplate } from './cutups';
import type { ColumnMapping } from './fields';

interface CutupState {
  loaded: boolean;
  breakdowns: Breakdown[];
  /** Saved custom templates (built-in ones are added in `allTemplates`). */
  templates: CutupTemplate[];
  error: string | null;
  refresh: () => Promise<void>;
  importCsv: (text: string, name: string) => Promise<Breakdown>;
  saveBreakdown: (b: Breakdown) => Promise<void>;
  setMapping: (id: string, mapping: ColumnMapping) => Promise<void>;
  removeBreakdown: (id: string) => Promise<void>;
  saveTemplate: (t: CutupTemplate) => Promise<void>;
  removeTemplate: (id: string) => Promise<void>;
}

async function guard(set: (s: Partial<CutupState>) => void, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.error(e);
    set({ error: 'The browser would not let Playdesk save. Check that site storage is allowed.' });
  }
}

export const useCutupStore = create<CutupState>((set, get) => ({
  loaded: false,
  breakdowns: [],
  templates: [],
  error: null,
  refresh: async () => {
    await guard(set, async () => {
      const [breakdowns, templates] = await Promise.all([
        db.listBreakdowns(),
        db.listCutupTemplates(),
      ]);
      breakdowns.sort((a, b) => b.importedAt - a.importedAt);
      templates.sort((a, b) => a.name.localeCompare(b.name));
      set({ breakdowns, templates, loaded: true, error: null });
    });
  },
  importCsv: async (text, name) => {
    const b = breakdownFromCsv(text, name); // throws BreakdownError for bad files
    await get().saveBreakdown(b);
    return b;
  },
  saveBreakdown: async (b) => {
    await guard(set, async () => {
      await db.putBreakdown(b);
      await get().refresh();
    });
  },
  setMapping: async (id, mapping) => {
    const b = get().breakdowns.find((x) => x.id === id);
    if (b) await get().saveBreakdown({ ...b, mapping });
  },
  removeBreakdown: async (id) => {
    await guard(set, async () => {
      await db.deleteBreakdown(id);
      await get().refresh();
    });
  },
  saveTemplate: async (t) => {
    await guard(set, async () => {
      await db.putCutupTemplate({ ...t, builtIn: undefined });
      await get().refresh();
    });
  },
  removeTemplate: async (id) => {
    await guard(set, async () => {
      await db.deleteCutupTemplate(id);
      await get().refresh();
    });
  },
}));

export function allTemplates(saved: CutupTemplate[]): CutupTemplate[] {
  return [...BUILT_IN_TEMPLATES, ...saved];
}
