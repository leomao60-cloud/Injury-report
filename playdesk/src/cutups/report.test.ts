import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { createPlay, newId } from '../model';
import type { SavedPlay } from '../library/types';
import { breakdownFromCsv, rowsOf } from './breakdown';
import { parseCsv } from './csv';
import { BUILT_IN_TEMPLATES, buildTree, flatten, tendencies } from './cutups';
import { matchDiagram } from './match';
import { buildCutupReport, cutupListCsv } from './report';
import { sampleCsv } from './sample';

const rows = rowsOf(breakdownFromCsv(sampleCsv(), 'Sample'));
const tree = buildTree(rows, BUILT_IN_TEMPLATES[0]!);

async function slideCount(maxDepth: number, playLists: boolean) {
  const pptx = buildCutupReport(tree, [], { maxDepth, playLists, breakdownName: 'Sample' });
  const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  const zip = await JSZip.loadAsync(buf);
  return Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length;
}

describe('cutup report', () => {
  it('has a cover and one title slide per folder down to the chosen depth', async () => {
    const top = tree.children.length;
    const two = flatten(tree).filter((n) => n.depth >= 1 && n.depth <= 2).length;
    expect(await slideCount(1, false)).toBe(1 + top);
    expect(await slideCount(2, false)).toBe(1 + two);
  });

  it('adds play-list slides for the bottom folders', async () => {
    const leaves = flatten(tree).filter((n) => n.depth === 1);
    const listSlides = leaves.reduce((s, n) => s + Math.ceil(n.rows.length / 14), 0);
    expect(await slideCount(1, true)).toBe(1 + tree.children.length + listSlides);
  });

  it('writes the folder list with play numbers', () => {
    const csv = parseCsv(cutupListCsv(tree));
    expect(csv[0]).toEqual(['Folder', 'Plays', 'Summary', 'Play numbers']);
    expect(csv).toHaveLength(flatten(tree).length); // header + every folder except the root
    const first = csv[1]!;
    expect(first[0]).toMatch(/^\d\d - /);
    expect(first[3]!.split(' ')).toHaveLength(Number(first[1]));
  });
});

describe('matching library plays', () => {
  const saved = (name: string, formation = 'doubles'): SavedPlay => {
    const play = { ...createPlay({ formation }), id: newId('play'), name };
    return { id: play.id, play, folder: 'Offense', tags: [], createdAt: 0, updatedAt: 0 };
  };

  it('prefers the most-called play, then the formation', () => {
    const stats = {
      ...tendencies([]),
      topPlays: [{ label: 'Smash', count: 3, pct: 60 }],
      topFormations: [{ label: 'Doubles', count: 4, pct: 80 }],
    };
    const lib = [saved('Doubles Rt Smash'), saved('Doubles Mesh')];
    expect(matchDiagram(stats, lib)?.name).toBe('Doubles Rt Smash');
    expect(matchDiagram({ ...stats, topPlays: [] }, lib)?.name).toBe('Doubles Rt Smash'); // name starts with "Doubles"
    expect(matchDiagram(stats, [])).toBeNull();
  });
});
