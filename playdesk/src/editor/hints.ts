import type { Tool } from '../store/editorStore';

export const HINTS: Record<Tool | 'drawing' | 'lineSelected', string> = {
  lineSelected: 'Drag an orange dot to move a break. Click empty field to deselect.',
  move: 'Drag a player to move him. Click a player or a line to select it.',
  route: 'Click a player to start a route.',
  block: 'Click a player to start a block. Click a defender to block him.',
  motion: 'Click a player to draw his motion. His route will start where the motion ends.',
  erase: 'Click a line to delete it, or a player to delete all his lines.',
  drawing:
    'Click the field to add each break. Click the last point again or press Enter to finish. Backspace removes a point, Esc cancels.',
};
