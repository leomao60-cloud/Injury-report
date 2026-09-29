/**
 * Coordinates are in yards.
 *  x: distance from the LEFT sideline (0 … FIELD_WIDTH), as seen from behind the offense.
 *  y: distance from the line of scrimmage; positive is downfield (toward the defense).
 */
export interface Point {
  x: number;
  y: number;
}

export type Level = 'hs' | 'college' | 'nfl' | 'cfl' | 'flag';
/** How many players a side: 11-man, 12-man (Canadian) or 5v5 flag. */
export type GameType = 'eleven' | 'twelve' | 'flag5';
export type FieldStyle = 'turf' | 'whiteboard';
export type BallOn = 'left' | 'middle' | 'right';
export type Side = 'offense' | 'defense';
export type PlayerShape = 'circle' | 'square' | 'letter';
export type LineType = 'route' | 'block' | 'motion';

export interface Player extends Point {
  id: string;
  side: Side;
  /** Up to 3 characters. */
  label: string;
  shape: PlayerShape;
  /** Fill color; undefined uses the theme default. */
  color?: string;
}

export interface PlayLine {
  id: string;
  playerId: string;
  type: LineType;
  /** Break points after the start. The start is derived with lineStart(). */
  points: Point[];
  color?: string;
  /** Draw a smooth curve through the points instead of straight breaks. */
  curved?: boolean;
}

export type DefenseId =
  | '43-cover2'
  | '34-cover3'
  | '425-cover1'
  | '416-cover4'
  | '62-goalline'
  | 'cfl-43'
  | 'flag-zone'
  | 'flag-man';

/** An id from FORMATIONS, or 'custom' for plays that don't come from a base formation (e.g. special teams). */
export type FormationId = string;

export interface Play {
  id: string;
  name: string;
  level: Level;
  ballOn: BallOn;
  /** Ball x position in yards from the left sideline. Always the spot implied by level + ballOn. */
  ballX: number;
  formation: FormationId;
  showDefense: boolean;
  /** Defensive front used when the defense is shown. Defaults to 4-3 Cover 2. */
  defense?: DefenseId;
  players: Player[];
  lines: PlayLine[];
}
