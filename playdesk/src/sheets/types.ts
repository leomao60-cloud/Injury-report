export type SheetKind = 'sheet' | 'wristband';
export type PerPage = 1 | 2 | 4 | 8;
export type Orientation = 'landscape' | 'portrait';

export interface WristbandSettings {
  /** Size of one panel, in inches. */
  panelWidthIn: number;
  panelHeightIn: number;
  panels: number;
  rows: number;
  cols: number;
}

export interface SheetDoc {
  id: string;
  name: string;
  kind: SheetKind;
  playIds: string[];
  perPage: PerPage;
  orientation: Orientation;
  startNumber: number;
  /** Numbers that are never used (e.g. 13, or numbers reserved for another sheet). */
  skip: number[];
  wristband: WristbandSettings;
  updatedAt: number;
}

export const DEFAULT_WRISTBAND: WristbandSettings = {
  panelWidthIn: 4.5,
  panelHeightIn: 2.75,
  panels: 3,
  rows: 6,
  cols: 2,
};
