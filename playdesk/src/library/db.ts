import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { EXAMPLE_PLAYS } from '../model';
import type { SheetDoc } from '../sheets/types';
import { sanitizeBranding, type Branding } from './branding';
import { DEFAULT_FOLDERS, type LibraryBackup, type SavedPlay } from './types';
import { validateBackup } from './validate';

interface PlaydeskDB extends DBSchema {
  plays: { key: string; value: SavedPlay };
  sheets: { key: string; value: SheetDoc };
  meta: { key: string; value: unknown };
}

const DB_NAME = 'playdesk';
let dbPromise: Promise<IDBPDatabase<PlaydeskDB>> | null = null;

function db() {
  dbPromise ??= openDB<PlaydeskDB>(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore('plays', { keyPath: 'id' });
      d.createObjectStore('sheets', { keyPath: 'id' });
      d.createObjectStore('meta');
    },
  });
  return dbPromise;
}

/** For tests: forget the open connection. */
export function resetConnection() {
  dbPromise = null;
}

export async function listPlays(): Promise<SavedPlay[]> {
  return (await db()).getAll('plays');
}
export async function putPlay(p: SavedPlay) {
  await (await db()).put('plays', p);
}
export async function deletePlay(id: string) {
  await (await db()).delete('plays', id);
}

export async function listSheets(): Promise<SheetDoc[]> {
  return (await db()).getAll('sheets');
}
export async function putSheet(s: SheetDoc) {
  await (await db()).put('sheets', s);
}
export async function deleteSheet(id: string) {
  await (await db()).delete('sheets', id);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('meta', key)) as T | undefined;
}
export async function setMeta(key: string, value: unknown) {
  await (await db()).put('meta', value, key);
}

export async function getFolders(): Promise<string[]> {
  return (await getMeta<string[]>('folders')) ?? [...DEFAULT_FOLDERS];
}
export async function setFolders(folders: string[]) {
  await setMeta('folders', folders);
}

export async function getBranding(): Promise<Branding> {
  return sanitizeBranding(await getMeta('branding'));
}
export async function setBranding(b: Branding) {
  await setMeta('branding', sanitizeBranding(b));
}

/** Add the starter plays the first time the library opens. */
export async function seedExamples(): Promise<boolean> {
  if (await getMeta<boolean>('seeded')) return false;
  const now = Date.now();
  const d = await db();
  const tx = d.transaction(['plays', 'meta'], 'readwrite');
  for (const make of EXAMPLE_PLAYS) {
    const play = make();
    await tx.objectStore('plays').put({
      id: play.id,
      play,
      folder: 'Offense',
      tags: ['example'],
      example: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  await tx.objectStore('meta').put(true, 'seeded');
  await tx.done;
  return true;
}

export async function exportBackup(): Promise<LibraryBackup> {
  return {
    app: 'playdesk',
    version: 1,
    exportedAt: new Date().toISOString(),
    plays: await listPlays(),
    folders: await getFolders(),
    sheets: await listSheets(),
    branding: await getBranding(),
  };
}

/** Merge a backup into the library. Plays and sheets with the same id are replaced. */
export async function importBackup(raw: unknown): Promise<{ plays: number; sheets: number }> {
  const backup = validateBackup(raw);
  const d = await db();
  const tx = d.transaction(['plays', 'sheets', 'meta'], 'readwrite');
  for (const p of backup.plays) await tx.objectStore('plays').put(p);
  for (const s of backup.sheets) await tx.objectStore('sheets').put(s);
  const folders = ((await tx.objectStore('meta').get('folders')) as string[] | undefined) ?? [
    ...DEFAULT_FOLDERS,
  ];
  const merged = [
    ...new Set([...folders, ...backup.folders, ...backup.plays.map((p) => p.folder)]),
  ];
  await tx.objectStore('meta').put(merged, 'folders');
  await tx.objectStore('meta').put(true, 'seeded');
  if (backup.branding) await tx.objectStore('meta').put(backup.branding, 'branding');
  await tx.done;
  return { plays: backup.plays.length, sheets: backup.sheets.length };
}

export async function clearAll() {
  const d = await db();
  await Promise.all([d.clear('plays'), d.clear('sheets'), d.clear('meta')]);
}
