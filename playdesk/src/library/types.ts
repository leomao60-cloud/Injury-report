import type { Play } from '../model';
import type { SheetDoc } from '../sheets/types';
import type { Branding } from './branding';
import type { Breakdown } from '../cutups/breakdown';
import type { CutupTemplate } from '../cutups/cutups';

export const DEFAULT_FOLDERS = ['Offense', 'Defense', 'Special teams'] as const;

export interface SavedPlay {
  id: string;
  play: Play;
  folder: string;
  tags: string[];
  /** Starter plays that ship with the app. */
  example?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LibraryBackup {
  app: 'playdesk';
  version: 1;
  exportedAt: string;
  plays: SavedPlay[];
  folders: string[];
  sheets: SheetDoc[];
  branding?: Branding;
  breakdowns?: Breakdown[];
  cutupTemplates?: CutupTemplate[];
}
