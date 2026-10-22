import { describe, expect, it } from 'vitest';
import { breakdownFromCsv, rowsOf, sanitizeBreakdown, sanitizeTemplate } from './breakdown';
import { parseCsv, toCsv } from './csv';
import {
  BUILT_IN_TEMPLATES,
  NO_FILTERS,
  applyFilters,
  buildTree,
  downDistance,
  fieldZone,
  flatten,
  isEfficient,
  summary,
  tendencies,
  type CutupTemplate,
} from './cutups';
import { autoMap, parseHash, parseKind, parseOdk, parseYardLine, readRows } from './fields';
import { sampleCsv } from './sample';

describe('CSV', () => {
  it('reads quotes, commas and line breaks inside fields, CRLF and a BOM', () => {
    const text = '﻿A,B,C\r\n1,"two, 2","say ""hi"""\r\n3,"multi\nline",x\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ['A', 'B', 'C'],
      ['1', 'two, 2', 'say "hi"'],
      ['3', 'multi\nline', 'x'],
    ]);
  });

  it('reads tab-separated text pasted from a spreadsheet', () => {
    expect(parseCsv('DN\tDIST\n3\t7\n')).toEqual([
      ['DN', 'DIST'],
      ['3', '7'],
    ]);
  });

  it('round-trips through toCsv', () => {
    const rows = [
      ['a', 'b,c'],
      ['"q"', 'line\nbreak'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe('column matching', () => {
  it('matches Hudl-style headers', () => {
    const m = autoMap([
      'PLAY #',
      'ODK',
      'DN',
      'DIST',
      'YARD LN',
      'HASH',
      'PLAY TYPE',
      'GN/LS',
      'OFF FORM',
      'OFF PLAY',
      'DEF FRONT',
      'COVERAGE',
    ]);
    expect(m).toMatchObject({
      playNo: 0,
      odk: 1,
      down: 2,
      distance: 3,
      yardLine: 4,
      hash: 5,
      playType: 6,
      gain: 7,
      formation: 8,
      play: 9,
      defFront: 10,
      coverage: 11,
    });
  });

  it('matches Qwikcut-style and spelled-out headers', () => {
    const m = autoMap([
      'Down',
      'Distance',
      'Yard Line',
      'Formation',
      'Play Type',
      'Gain',
      'Personnel',
    ]);
    expect(m).toMatchObject({
      down: 0,
      distance: 1,
      yardLine: 2,
      formation: 3,
      playType: 4,
      gain: 5,
      personnel: 6,
    });
    expect(m.coverage).toBe(-1);
  });
});

describe('reading values', () => {
  it('reads yard lines in Hudl and spelled-out styles', () => {
    expect(parseYardLine('-25')).toBe(75); // own 25
    expect(parseYardLine('25')).toBe(25); // opponent 25
    expect(parseYardLine('Own 10')).toBe(90);
    expect(parseYardLine('opp 3')).toBe(3);
    expect(parseYardLine('50')).toBe(50);
    expect(parseYardLine('')).toBeNull();
    expect(parseYardLine('banana')).toBeNull();
  });

  it('reads ODK, hash and run/pass', () => {
    expect([parseOdk('O'), parseOdk('def'), parseOdk('K'), parseOdk('')]).toEqual([
      'O',
      'D',
      'K',
      '',
    ]);
    expect([parseHash('Left'), parseHash('M'), parseHash('r'), parseHash('?')]).toEqual([
      'L',
      'M',
      'R',
      '',
    ]);
    expect(parseKind('Run', 'O')).toBe('Run');
    expect(parseKind('Pass', 'O')).toBe('Pass');
    expect(parseKind('RPO', 'O')).toBe('Pass');
    expect(parseKind('Punt', 'K')).toBe('Other');
  });
});

const row = (cells: Record<string, string>) => {
  const headers = Object.keys(cells);
  return readRows(headers, [Object.values(cells)], autoMap(headers))[0]!;
};

describe('situations', () => {
  it('buckets down and distance', () => {
    expect(downDistance(row({ DN: '1', DIST: '10' }))!.label).toBe('1st & 10+');
    expect(downDistance(row({ DN: '1', DIST: '5' }))!.label).toBe('1st & <10');
    expect(downDistance(row({ DN: '3', DIST: '8' }))!.label).toBe('3rd & 7+');
    expect(downDistance(row({ DN: '3', DIST: '2' }))!.label).toBe('3rd & 1–3');
    expect(downDistance(row({ DN: '4', DIST: '1' }))!.label).toBe('4th down');
    expect(downDistance(row({ DN: '', DIST: '' }))).toBeNull();
  });

  it('buckets field position', () => {
    expect(fieldZone(row({ 'YARD LN': '-5' }))!.id).toBe('coming-out');
    expect(fieldZone(row({ 'YARD LN': '45' }))!.id).toBe('open-field');
    expect(fieldZone(row({ 'YARD LN': '30' }))!.id).toBe('plus');
    expect(fieldZone(row({ 'YARD LN': '15' }))!.id).toBe('red-zone');
    expect(fieldZone(row({ 'YARD LN': '4' }))!.id).toBe('goal-line');
  });

  it('scores efficient plays (40% / 60% / 100%)', () => {
    expect(isEfficient(row({ DN: '1', DIST: '10', 'GN/LS': '4' }))).toBe(true);
    expect(isEfficient(row({ DN: '1', DIST: '10', 'GN/LS': '3' }))).toBe(false);
    expect(isEfficient(row({ DN: '2', DIST: '5', 'GN/LS': '3' }))).toBe(true);
    expect(isEfficient(row({ DN: '3', DIST: '5', 'GN/LS': '4' }))).toBe(false);
    expect(isEfficient(row({ DN: '3', DIST: '', 'GN/LS': '4' }))).toBeNull();
  });
});

describe('cutups', () => {
  const b = breakdownFromCsv(sampleCsv(), 'Sample');
  const rows = rowsOf(b);

  it('reads the sample game', () => {
    expect(rows).toHaveLength(72);
    expect(rows.every((r) => r.odk === 'O' && r.down !== null && r.toGoal !== null)).toBe(true);
  });

  it('builds a nested tree whose leaves add up to the filtered plays', () => {
    const tpl = BUILT_IN_TEMPLATES[0]!; // field position → down & distance → formation
    const tree = buildTree(rows, tpl);
    expect(tree.rows).toHaveLength(applyFilters(rows, tpl.filters).length);
    for (const n of flatten(tree)) {
      if (n.children.length)
        expect(n.children.reduce((s, c) => s + c.rows.length, 0)).toBe(n.rows.length);
    }
    const leaves = flatten(tree).filter((n) => n.children.length === 0);
    expect(leaves.every((l) => l.depth === 3)).toBe(true);
  });

  it('keeps situations in football order and numbers the folders', () => {
    const tree = buildTree(rows, BUILT_IN_TEMPLATES[0]!);
    const order = ['coming-out', 'open-field', 'plus', 'red-zone', 'goal-line'];
    const ids = tree.children.map((c) => c.id);
    expect(ids).toEqual(order.filter((id) => ids.includes(id)));
    // Situation folders keep fixed numbers: Open field is always 02, Red zone always 04.
    for (const c of tree.children) {
      expect(c.title.slice(0, 2)).toBe(String(order.indexOf(c.id) + 1).padStart(2, '0'));
    }
    // Text groups (formations) are numbered in the order shown.
    const formations = tree.children[0]!.children[0]!.children;
    formations.forEach((f, i) =>
      expect(f.title.startsWith(String(i + 1).padStart(2, '0'))).toBe(true),
    );
  });

  it('filters by down, zone, run/pass and text', () => {
    expect(applyFilters(rows, { ...NO_FILTERS, downs: [3] }).every((r) => r.down === 3)).toBe(true);
    expect(
      applyFilters(rows, { ...NO_FILTERS, kinds: ['Pass'] }).every((r) => r.kind === 'Pass'),
    ).toBe(true);
    const rz = applyFilters(rows, { ...NO_FILTERS, zones: ['red-zone', 'goal-line'] });
    expect(rz.every((r) => r.toGoal! <= 20)).toBe(true);
    expect(
      applyFilters(rows, { ...NO_FILTERS, search: 'trips' }).every((r) =>
        r.formation.toLowerCase().includes('trips'),
      ),
    ).toBe(true);
  });

  it('drops small groups when asked', () => {
    const tpl: CutupTemplate = { ...BUILT_IN_TEMPLATES[1]!, minPlays: 5 };
    const tree = buildTree(rows, tpl);
    expect(tree.children.every((c) => c.rows.length >= 5)).toBe(true);
  });

  it('computes tendencies', () => {
    const t = tendencies(rows);
    expect(t.run + t.pass + t.other).toBe(72);
    expect(t.runPct + t.passPct).toBeGreaterThanOrEqual(99);
    expect(t.topFormations).toHaveLength(3);
    expect(t.topFormations[0]!.count).toBeGreaterThanOrEqual(t.topFormations[1]!.count);
    expect(summary(t)).toMatch(/^72 plays · \d+% run \/ \d+% pass/);
  });
});

describe('validation', () => {
  it('cleans stored breakdowns and drops bad mappings', () => {
    const b = sanitizeBreakdown({
      id: 'x',
      name: 'G',
      headers: ['DN', 'DIST'],
      data: [['3', '7', 'extra'], 'junk'],
      mapping: { down: 0, distance: 9, odk: 'a' },
    })!;
    expect(b.data).toEqual([['3', '7']]);
    expect(b.mapping.down).toBe(0);
    expect(b.mapping.distance).toBe(-1);
    expect(b.mapping.odk).toBe(-1);
    expect(sanitizeBreakdown('nope')).toBeNull();
  });

  it('cleans templates', () => {
    const t = sanitizeTemplate({
      name: 'Mine',
      rules: ['formation', 'bogus', 'down'],
      filters: { downs: [3, 9], odk: ['O', 'Z'] },
      minPlays: 500,
    })!;
    expect(t.rules).toEqual(['formation', 'down']);
    expect(t.filters.downs).toEqual([3]);
    expect(t.filters.odk).toEqual(['O']);
    expect(t.minPlays).toBe(1);
  });

  it('rejects files without plays', () => {
    expect(() => breakdownFromCsv('DN,DIST\n', 'x')).toThrow(/no plays/);
  });
});
