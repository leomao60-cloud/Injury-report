import type { Play } from '../model';
import type { SavedPlay } from '../library/types';
import { callsPerPanel, numberPlays } from './layout';
import type { SheetDoc } from './types';

export interface NumberedPlay {
  number: number;
  play: Play;
}

/** The sheet's plays in order with their call numbers. Plays deleted from the library are dropped. */
export function resolveSheet(sheet: SheetDoc, library: SavedPlay[]): NumberedPlay[] {
  const byId = new Map(library.map((p) => [p.id, p.play]));
  const plays = sheet.playIds.map((id) => byId.get(id)).filter((p): p is Play => Boolean(p));
  const numbers = numberPlays(plays.length, sheet.startNumber, sheet.skip);
  return plays.map((play, i) => ({ number: numbers[i]!, play }));
}

/** Split calls into wristband panels. Calls beyond the last panel are returned as overflow. */
export function wristbandCalls(sheet: SheetDoc, calls: NumberedPlay[]) {
  const per = callsPerPanel(sheet.wristband);
  const panels: NumberedPlay[][] = [];
  for (let i = 0; i < sheet.wristband.panels; i++) panels.push(calls.slice(i * per, (i + 1) * per));
  return { panels, overflow: Math.max(0, calls.length - per * sheet.wristband.panels) };
}
