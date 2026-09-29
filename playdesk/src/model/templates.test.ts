import { describe, expect, it } from 'vitest';
import { validatePlay } from '../library/validate';
import {
  PLAYERS_PER_SIDE,
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  addLine,
  applyFormation,
  createPlay,
  fieldWidth,
  flipPlay,
  gameFor,
  getPlayer,
  playFromTemplate,
  setLevel,
  templatesIn,
  updatePlayer,
} from './index';

describe('template library', () => {
  it('has something in every category', () => {
    for (const c of TEMPLATE_CATEGORIES)
      expect(templatesIn(c.id).length, c.label).toBeGreaterThanOrEqual(4);
  });

  it('has unique template ids', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });

  it.each(TEMPLATES.map((t) => [t.name, t] as const))('%s builds a valid play', (_name, t) => {
    const play = playFromTemplate(t);
    const n = PLAYERS_PER_SIDE[gameFor(play.level)];
    const offense = play.players.filter((p) => p.side === 'offense');
    const defense = play.players.filter((p) => p.side === 'defense');
    expect(offense.length).toBeLessThanOrEqual(n);
    expect(defense.length).toBeLessThanOrEqual(n);
    expect(offense.length + defense.length).toBeGreaterThan(0);
    if (t.category === 'special' || t.category === 'personnel') {
      // special teams units and personnel groupings are always full
      expect(offense.length === n || defense.length === n).toBe(true);
    }
    expect(new Set(play.players.map((p) => p.id)).size).toBe(play.players.length);
    const width = fieldWidth(play.level);
    for (const p of play.players) {
      expect(p.x, p.id).toBeGreaterThanOrEqual(1);
      expect(p.x, p.id).toBeLessThanOrEqual(width - 1);
    }
    for (const l of play.lines) {
      expect(getPlayer(play, l.playerId), l.playerId).toBeDefined();
      for (const pt of l.points) {
        expect(pt.x).toBeGreaterThanOrEqual(0);
        expect(pt.x).toBeLessThanOrEqual(width);
      }
    }
    // Survives a round trip through backup/autosave validation unchanged.
    expect(validatePlay(JSON.parse(JSON.stringify(play)))).toEqual(play);
    // Flipping works on every template.
    expect(flipPlay(play).players).toHaveLength(play.players.length);
  });

  it('opening a template twice gives two different plays', () => {
    const t = TEMPLATES[0]!;
    expect(playFromTemplate(t).id).not.toBe(playFromTemplate(t).id);
  });
});

describe('switching games', () => {
  it('11-man to 12-man adds the extra slotback and keeps existing routes', () => {
    let play = createPlay({ level: 'hs' });
    play = addLine(play, { playerId: 'z', type: 'route', points: [{ x: 45, y: 10 }] });
    const next = setLevel(play, 'cfl');
    expect(next.players.filter((p) => p.side === 'offense')).toHaveLength(12);
    expect(getPlayer(next, 'a')).toBeDefined();
    expect(next.lines).toHaveLength(1);
    expect(next.ballX).toBeCloseTo(32.5, 3);
  });

  it('to flag drops the linemen and their lines, and centers the ball', () => {
    let play = createPlay({ level: 'hs', ballOn: 'left', showDefense: true });
    play = addLine(play, { playerId: 'lt', type: 'block', points: [{ x: 10, y: 1 }] });
    const next = setLevel(play, 'flag');
    expect(next.players.filter((p) => p.side === 'offense')).toHaveLength(5);
    expect(next.players.filter((p) => p.side === 'defense')).toHaveLength(5);
    expect(next.lines).toHaveLength(0);
    expect(next.ballX).toBe(15);
    expect(next.formation).toBe('flag-2x1');
  });

  it('back to 11-man restores a full offense', () => {
    const next = setLevel(setLevel(createPlay(), 'flag'), 'nfl');
    expect(next.players.filter((p) => p.side === 'offense')).toHaveLength(11);
  });
});

describe('formation labels', () => {
  it('players take the new formation’s labels unless the coach renamed them', () => {
    let play = createPlay({ formation: 'doubles' });
    play = updatePlayer(play, 'x', { label: 'WR' });
    play = applyFormation(play, 'i-rt');
    expect(getPlayer(play, 'h')!.label).toBe('F'); // was H in Doubles, is F in I-Right
    expect(getPlayer(play, 'x')!.label).toBe('WR'); // renamed by the coach
  });
});
