import { getFormation } from '../model';
import type { SavedPlay } from './types';

export interface PlayFilter {
  folder?: string | null;
  query?: string;
}

/** Match by name, tag or formation name. Every word in the query must match something. */
export function matchesQuery(item: SavedPlay, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  let formationName = '';
  try {
    formationName = getFormation(item.play.formation).name;
  } catch {
    // unknown formation id from an old backup
  }
  const haystack = [item.play.name, formationName, ...item.tags].join(' ').toLowerCase();
  return words.every((w) => haystack.includes(w));
}

export function filterPlays(plays: SavedPlay[], filter: PlayFilter): SavedPlay[] {
  return plays
    .filter((p) => !filter.folder || p.folder === filter.folder)
    .filter((p) => matchesQuery(p, filter.query ?? ''))
    .sort((a, b) => a.play.name.localeCompare(b.play.name, undefined, { numeric: true }));
}

export function allTags(plays: SavedPlay[]): string[] {
  return [...new Set(plays.flatMap((p) => p.tags))].sort();
}

export function parseTags(text: string): string[] {
  return [
    ...new Set(
      text
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 20);
}
