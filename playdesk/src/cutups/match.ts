import { findFormation, type Play } from '../model';
import type { SavedPlay } from '../library/types';
import type { Tendencies } from './cutups';

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Find a library play to show next to a cutup: first one whose name contains the most-called play
 * ("Smash" → "Doubles Rt Smash"), then one whose name or base formation matches the top formation.
 */
export function matchDiagram(stats: Tendencies, library: SavedPlay[]): Play | null {
  const plays = library.map((s) => s.play);
  for (const p of stats.topPlays) {
    const want = norm(p.label);
    if (want.length < 3) continue;
    const hit = plays.find((pl) => ` ${norm(pl.name)} `.includes(` ${want} `));
    if (hit) return hit;
  }
  for (const f of stats.topFormations) {
    const want = norm(f.label);
    if (want.length < 3) continue;
    const hit = plays.find(
      (pl) =>
        norm(pl.name).startsWith(want) || norm(findFormation(pl.formation)?.name ?? '') === want,
    );
    if (hit) return hit;
  }
  return null;
}
