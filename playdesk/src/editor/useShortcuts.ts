import { useEffect } from 'react';
import { flipPlay } from '../model';
import { useEditorStore, type Tool } from '../store/editorStore';
import { usePlayStore } from '../store/playStore';
import { cancelLine, chooseTool, finishLine, redo, removeLastPoint, undo } from './actions';

const TOOL_KEYS: Record<string, Tool> = {
  v: 'move',
  r: 'route',
  b: 'block',
  m: 'motion',
  e: 'erase',
};

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function useShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        if (isTyping(e.target)) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === 'y') {
        if (isTyping(e.target)) return;
        e.preventDefault();
        redo();
        return;
      }
      if (mod || e.altKey || isTyping(e.target)) return;

      const draft = useEditorStore.getState().draft;
      if (draft) {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishLine();
          return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          removeLastPoint();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelLine();
          return;
        }
      } else if (e.key === 'Escape') {
        useEditorStore.getState().select(null);
        return;
      }

      const tool = TOOL_KEYS[key];
      if (tool) {
        e.preventDefault();
        chooseTool(tool);
        return;
      }
      if (key === 'f') {
        e.preventDefault();
        finishLine();
        usePlayStore.getState().apply(flipPlay);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
