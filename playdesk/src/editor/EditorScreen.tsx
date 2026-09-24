import { useEditorStore } from '../store/editorStore';
import { cancelLine, finishLine, removeLastPoint } from './actions';
import { FieldEditor } from './FieldEditor';
import { QuickStart } from './QuickStart';
import { SidePanel } from './SidePanel';
import { ToolRail } from './ToolRail';
import { useShortcuts } from './useShortcuts';
import styles from './EditorScreen.module.css';

export function EditorScreen() {
  useShortcuts();
  const draft = useEditorStore((s) => s.draft);
  return (
    <div className={styles.layout}>
      <ToolRail />
      <main className={styles.main}>
        <QuickStart />
        {draft && (
          <div className={styles.drawBar} role="toolbar" aria-label="Line being drawn">
            <span className="small">
              Drawing a {draft.type} · {draft.points.length} point
              {draft.points.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={finishLine}
              disabled={draft.points.length === 0}
              data-testid="finish-line"
            >
              Finish line
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={removeLastPoint}
              aria-keyshortcuts="Backspace"
            >
              Undo point
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={cancelLine}
              aria-keyshortcuts="Escape"
            >
              Cancel
            </button>
          </div>
        )}
        <FieldEditor />
      </main>
      <SidePanel />
    </div>
  );
}
