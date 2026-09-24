import { addLine } from '../model';
import { useEditorStore, type Tool } from '../store/editorStore';
import { usePlayStore } from '../store/playStore';
import { finishDraft, undoDraftPoint } from './drawing';

/** Commit the line being drawn (if it has at least one point). */
export function finishLine() {
  const ed = useEditorStore.getState();
  const step = finishDraft(ed.draft);
  if (step.commit) {
    const c = step.commit;
    usePlayStore.getState().apply((p) => addLine(p, c));
  }
  ed.setDraft(null);
  ed.setCursor(null);
}

export function cancelLine() {
  const ed = useEditorStore.getState();
  ed.setDraft(null);
  ed.setCursor(null);
}

export function removeLastPoint() {
  const ed = useEditorStore.getState();
  ed.setDraft(undoDraftPoint(ed.draft));
}

export function chooseTool(tool: Tool) {
  finishLine();
  useEditorStore.getState().setTool(tool);
}

export function undo() {
  cancelLine();
  usePlayStore.getState().undo();
  dropStaleSelection();
}

export function redo() {
  cancelLine();
  usePlayStore.getState().redo();
  dropStaleSelection();
}

/** Clear the selection if the selected item no longer exists. */
export function dropStaleSelection() {
  const ed = useEditorStore.getState();
  const play = usePlayStore.getState().history.present;
  const s = ed.selection;
  if (!s) return;
  const exists =
    s.kind === 'player'
      ? play.players.some((p) => p.id === s.id)
      : play.lines.some((l) => l.id === s.id);
  if (!exists) ed.select(null);
}
