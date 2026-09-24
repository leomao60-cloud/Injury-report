import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPlay } from '../model';
import * as db from './db';
import { filterPlays, parseTags } from './search';
import type { SavedPlay } from './types';
import { BackupError, validateBackup } from './validate';

const saved = (name: string, extra: Partial<SavedPlay> = {}): SavedPlay => {
  const play = { ...createPlay({ formation: 'trips-rt' }), name };
  return { id: play.id, play, folder: 'Offense', tags: [], createdAt: 1, updatedAt: 1, ...extra };
};

describe('search', () => {
  const plays = [
    saved('Smash', { tags: ['red zone'] }),
    saved('Mesh', { folder: 'Defense' }),
    saved('Four Verts', { tags: ['2-minute'] }),
  ];

  it('finds by name, tag and formation', () => {
    expect(filterPlays(plays, { query: 'smash' }).map((p) => p.play.name)).toEqual(['Smash']);
    expect(filterPlays(plays, { query: 'red' }).map((p) => p.play.name)).toEqual(['Smash']);
    expect(filterPlays(plays, { query: 'trips' })).toHaveLength(3);
  });

  it('filters by folder and sorts by name', () => {
    expect(filterPlays(plays, { folder: 'Offense' }).map((p) => p.play.name)).toEqual([
      'Four Verts',
      'Smash',
    ]);
  });

  it('parses comma-separated tags', () => {
    expect(parseTags(' Red Zone, 3rd down,, red zone ')).toEqual(['red zone', '3rd down']);
  });
});

describe('backup validation', () => {
  const good = () => ({
    app: 'playdesk',
    version: 1,
    exportedAt: '',
    plays: [saved('A')],
    folders: ['Mine'],
    sheets: [],
  });

  it('accepts a good backup', () => {
    expect(validateBackup(good()).plays).toHaveLength(1);
  });

  it('rejects files that are not Playdesk backups', () => {
    expect(() => validateBackup({ hello: 1 })).toThrow(BackupError);
    expect(() => validateBackup([])).toThrow(BackupError);
  });

  it('rejects damaged plays', () => {
    const b = good();
    (b.plays[0]!.play as unknown as Record<string, unknown>).level = 'arena';
    expect(() => validateBackup(b)).toThrow(/damaged/);
  });

  it('rejects script-like colors and strips unknown fields', () => {
    const b = good();
    (b.plays[0]!.play.players[0] as unknown as Record<string, unknown>).color =
      'url(javascript:alert(1))';
    expect(() => validateBackup(b)).toThrow(BackupError);
    const c = good();
    (c.plays[0] as unknown as Record<string, unknown>).evil = '<script>';
    expect(validateBackup(c).plays[0]).not.toHaveProperty('evil');
  });

  it('caps label length', () => {
    const b = good();
    b.plays[0]!.play.players[0]!.label = 'LONGLABEL';
    expect(validateBackup(b).plays[0]!.play.players[0]!.label).toBe('LON');
  });
});

describe('IndexedDB library', () => {
  beforeEach(async () => {
    await db.clearAll();
  });

  it('seeds three example plays once', async () => {
    expect(await db.seedExamples()).toBe(true);
    expect(await db.seedExamples()).toBe(false);
    const plays = await db.listPlays();
    expect(plays).toHaveLength(3);
    expect(plays.every((p) => p.example)).toBe(true);
  });

  it('saves, lists and deletes plays', async () => {
    const p = saved('Smash');
    await db.putPlay(p);
    expect((await db.listPlays()).map((x) => x.play.name)).toEqual(['Smash']);
    await db.deletePlay(p.id);
    expect(await db.listPlays()).toHaveLength(0);
  });

  it('round-trips a backup through export, clear and import', async () => {
    for (let i = 0; i < 10; i++) await db.putPlay(saved(`Play ${i}`));
    await db.setFolders(['Offense', 'Defense', 'Special teams', 'Red zone']);
    const backup = JSON.parse(JSON.stringify(await db.exportBackup()));
    await db.clearAll();
    expect(await db.listPlays()).toHaveLength(0);
    const result = await db.importBackup(backup);
    expect(result.plays).toBe(10);
    expect(await db.listPlays()).toHaveLength(10);
    expect(await db.getFolders()).toContain('Red zone');
  });
});
