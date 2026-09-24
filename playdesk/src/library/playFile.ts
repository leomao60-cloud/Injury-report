import type { Play } from '../model';
import { BackupError, validatePlay } from './validate';

/** A single play saved as its own file (".playdesk"), so coaches keep copies on their own drives. */
export const PLAY_FILE_EXT = 'playdesk';

export interface PlayFile {
  app: 'playdesk';
  version: 1;
  kind: 'play';
  play: Play;
}

export function serializePlayFile(play: Play): string {
  const file: PlayFile = { app: 'playdesk', version: 1, kind: 'play', play };
  return JSON.stringify(file, null, 2);
}

export function isPlayFile(v: unknown): boolean {
  return typeof v === 'object' && v !== null && (v as Record<string, unknown>).kind === 'play';
}

export function parsePlayFile(v: unknown): Play {
  if (!isPlayFile(v) || (v as Record<string, unknown>).app !== 'playdesk') {
    throw new BackupError('This is not a Playdesk play file.');
  }
  try {
    return validatePlay((v as Record<string, unknown>).play);
  } catch (e) {
    if (e instanceof BackupError) throw new BackupError(`The play file is damaged (${e.message}).`);
    throw e;
  }
}

/** Read a file the coach picked and parse it as JSON, with a size limit. */
export async function readJsonFile(file: File, maxBytes = 20 * 1024 * 1024): Promise<unknown> {
  if (file.size > maxBytes) throw new BackupError('That file is too large to be a Playdesk file.');
  try {
    return JSON.parse(await file.text());
  } catch {
    throw new BackupError('That file could not be read as a Playdesk file.');
  }
}
