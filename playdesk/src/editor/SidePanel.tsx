import { useState, type ReactNode } from 'react';
import {
  FORMATIONS,
  HASH_WIDTH_NOTE,
  LEVEL_NAMES,
  applyFormation,
  clearLines,
  flipPlay,
  getPlayer,
  removeLine,
  removeLinesFor,
  setBallSpot,
  setLevel,
  setShowDefense,
  updateLine,
  updatePlayer,
  type BallOn,
  type FormationId,
  type Level,
  type LineType,
} from '../model';
import { SaveControls } from '../library/SaveControls';
import { useEditorStore } from '../store/editorStore';
import { usePlay, usePlayStore } from '../store/playStore';
import { canRedo, canUndo } from '../store/history';
import { dropStaleSelection, finishLine, redo, undo } from './actions';
import styles from './SidePanel.module.css';

const COLOR_SWATCHES = [
  '#ffffff',
  '#111111',
  '#d62828',
  '#f77f00',
  '#fcbf49',
  '#2a9d8f',
  '#1d4ed8',
  '#7b2cbf',
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `sec-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.heading}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Swatches({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (c: string | undefined) => void;
}) {
  return (
    <div className={styles.swatches} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.swatch}
        data-default
        aria-label="Default color"
        aria-pressed={!value}
        onClick={() => onChange(undefined)}
      >
        ∅
      </button>
      {COLOR_SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          className={styles.swatch}
          style={{ background: c }}
          aria-label={`Color ${c}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
        />
      ))}
      <input
        type="color"
        className={styles.colorInput}
        aria-label="Custom color"
        value={value ?? '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectionSection() {
  const play = usePlay();
  const selection = useEditorStore((s) => s.selection);
  const apply = usePlayStore((s) => s.apply);

  if (!selection) {
    return (
      <Section title="Selection">
        <p className="muted small">
          Nothing selected. With the Move tool, click a player or a line.
        </p>
      </Section>
    );
  }

  if (selection.kind === 'player') {
    const p = getPlayer(play, selection.id);
    if (!p) return null;
    const lineCount = play.lines.filter((l) => l.playerId === p.id).length;
    return (
      <Section title="Selection">
        <p className="small muted">{p.side === 'offense' ? 'Offensive player' : 'Defender'}</p>
        <label className={styles.field}>
          <span>Label</span>
          <input
            className="input"
            value={p.label}
            maxLength={3}
            onChange={(e) =>
              apply((pl) => updatePlayer(pl, p.id, { label: e.target.value }), `label:${p.id}`)
            }
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            data-testid="player-label"
          />
        </label>
        <div className={styles.field}>
          <span>{p.side === 'offense' ? 'Fill color' : 'Color'}</span>
          <Swatches
            label="Player color"
            value={p.color}
            onChange={(color) => apply((pl) => updatePlayer(pl, p.id, { color }), `color:${p.id}`)}
          />
        </div>
        <button
          type="button"
          className="btn btn-sm btn-danger"
          disabled={lineCount === 0}
          onClick={() => apply((pl) => removeLinesFor(pl, p.id))}
        >
          Erase his lines ({lineCount})
        </button>
      </Section>
    );
  }

  const line = play.lines.find((l) => l.id === selection.id);
  if (!line) return null;
  const owner = getPlayer(play, line.playerId);
  return (
    <Section title="Selection">
      <p className="small muted">
        {line.type[0]!.toUpperCase() + line.type.slice(1)} for {owner?.label || 'player'}
      </p>
      <div className={styles.field}>
        <span>Type</span>
        <Segmented<LineType>
          label="Line type"
          value={line.type}
          options={[
            { value: 'route', label: 'Route' },
            { value: 'block', label: 'Block' },
            { value: 'motion', label: 'Motion' },
          ]}
          onChange={(type) => apply((pl) => updateLine(pl, line.id, { type }))}
        />
      </div>
      <div className={styles.field}>
        <span>Color</span>
        <Swatches
          label="Line color"
          value={line.color}
          onChange={(color) =>
            apply((pl) => updateLine(pl, line.id, { color }), `lcolor:${line.id}`)
          }
        />
      </div>
      <button
        type="button"
        className="btn btn-sm btn-danger"
        onClick={() => {
          apply((pl) => removeLine(pl, line.id));
          useEditorStore.getState().select(null);
        }}
      >
        Delete line
      </button>
    </Section>
  );
}

function ExportSection() {
  const play = usePlay();
  const fieldStyle = useEditorStore((s) => s.fieldStyle);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      window.alert('Sorry, the export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title="Export">
      <div className={styles.row}>
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() =>
            void run(async () => (await import('../export/png')).exportPlayPng(play, fieldStyle))
          }
        >
          PNG image
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() =>
            void run(async () => (await import('../export/pptx')).exportPlayPptx(play, fieldStyle))
          }
        >
          PowerPoint
        </button>
      </div>
      <p className="small muted">
        Uses the current field style. For PDFs of several plays, use Sheets.
      </p>
    </Section>
  );
}

export function SidePanel() {
  const play = usePlay();
  const history = usePlayStore((s) => s.history);
  const apply = usePlayStore((s) => s.apply);
  const { snap, setSnap, fieldStyle, setFieldStyle, draft } = useEditorStore();

  const act = (fn: Parameters<typeof apply>[0], key?: string) => {
    finishLine();
    apply(fn, key);
    dropStaleSelection();
  };

  return (
    <aside className={styles.panel} aria-label="Play settings">
      <Section title="Play">
        <label className={styles.field}>
          <span>Name</span>
          <input
            className="input"
            value={play.name}
            onChange={(e) => apply((p) => ({ ...p, name: e.target.value }), 'name')}
            data-testid="play-name"
          />
        </label>
        <SaveControls />
        <div className={styles.row}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={undo}
            disabled={!canUndo(history)}
            aria-keyshortcuts="Control+Z Meta+Z"
          >
            Undo
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={redo}
            disabled={!canRedo(history)}
            aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
          >
            Redo
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => act(flipPlay)}
            aria-keyshortcuts="F"
            title="Flip play (F)"
          >
            Flip play
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => act(clearLines)}
            disabled={play.lines.length === 0 && !draft}
          >
            Clear lines
          </button>
        </div>
      </Section>

      <SelectionSection />

      <Section title="Formation">
        <label className={styles.field}>
          <span className="visually-hidden">Formation</span>
          <select
            className="select"
            value={play.formation}
            aria-label="Formation"
            onChange={(e) => act((p) => applyFormation(p, e.target.value as FormationId))}
          >
            {FORMATIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => act((p) => applyFormation(p, p.formation))}
        >
          Reset to formation
        </button>
      </Section>

      <Section title="Ball on">
        <Segmented<BallOn>
          label="Ball on"
          value={play.ballOn}
          options={[
            { value: 'left', label: 'Left hash' },
            { value: 'middle', label: 'Middle' },
            { value: 'right', label: 'Right hash' },
          ]}
          onChange={(b) => act((p) => setBallSpot(p, b))}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={play.showDefense}
            onChange={(e) => act((p) => setShowDefense(p, e.target.checked))}
            data-testid="show-defense"
          />
          Show defense (4-3, two-deep)
        </label>
      </Section>

      <Section title="Field">
        <Segmented<Level>
          label="Level"
          value={play.level}
          options={(Object.keys(LEVEL_NAMES) as Level[]).map((l) => ({
            value: l,
            label: LEVEL_NAMES[l],
          }))}
          onChange={(l) => act((p) => setLevel(p, l))}
        />
        <p className="small muted">{HASH_WIDTH_NOTE[play.level]}</p>
        <Segmented
          label="Field style"
          value={fieldStyle}
          options={[
            { value: 'turf', label: 'Turf' },
            { value: 'whiteboard', label: 'Whiteboard' },
          ]}
          onChange={setFieldStyle}
        />
        <label className="check">
          <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
          Snap to half-yard grid
        </label>
      </Section>

      <ExportSection />
    </aside>
  );
}
