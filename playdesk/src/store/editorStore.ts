import { create } from 'zustand';
import type { FieldStyle, LineType, Point } from '../model';

export type Tool = 'move' | 'route' | 'block' | 'motion' | 'erase';

export const TOOL_LINE_TYPE: Partial<Record<Tool, LineType>> = {
  route: 'route',
  block: 'block',
  motion: 'motion',
};

export type Selection = { kind: 'player'; id: string } | { kind: 'line'; id: string } | null;

export interface Draft {
  playerId: string;
  type: LineType;
  points: Point[];
}

interface EditorState {
  tool: Tool;
  selection: Selection;
  draft: Draft | null;
  cursor: Point | null;
  snap: boolean;
  fieldStyle: FieldStyle;
  setTool: (tool: Tool) => void;
  select: (s: Selection) => void;
  setDraft: (d: Draft | null) => void;
  setCursor: (p: Point | null) => void;
  setSnap: (v: boolean) => void;
  setFieldStyle: (s: FieldStyle) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  tool: 'move',
  selection: null,
  draft: null,
  cursor: null,
  snap: true,
  fieldStyle: 'turf',
  setTool: (tool) => set({ tool }),
  select: (selection) => set({ selection }),
  setDraft: (draft) => set({ draft }),
  setCursor: (cursor) => set({ cursor }),
  setSnap: (snap) => set({ snap }),
  setFieldStyle: (fieldStyle) => set({ fieldStyle }),
}));
