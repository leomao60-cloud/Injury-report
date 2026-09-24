import { useRef, useState, type ReactNode } from 'react';
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
  DEFENSES,
  addPlayer,
  placeDefense,
  removePlayer,
  type DefenseId,
} from '../model';
import { SaveControls } from '../library/SaveControls';
import { offenseFill } from '../library/branding';
import { useLibraryStore } from '../library/libraryStore';
import { PLAY_FILE_EXT, parsePlayFile, readJsonFile, serializePlayFile } from '../library/playFile';
import { downloadBlob, safeFilename } from '../export/download';
import { useOfficeHost } from '../office/office';
import { useEditorStore } from '../store/editorStore';
import { usePlay, usePlayStore } from '../store/playStore';
import { canRedo, canUndo } from '../store/history';
import { cancelLine, dropStaleSelection, finishLine, redo, undo } from './actions';
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

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const id = `sec-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section className={`${styles.section} ${className ?? ''}`} aria-labelledby={id}>
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
      <Section title="Selection" className={styles.selection}>
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
      <Section title="Selection" className={styles.selection}>
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
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => {
            apply((pl) => removePlayer(pl, p.id));
            useEditorStore.getState().select(null);
          }}
        >
          Delete player
        </button>
      </Section>
    );
  }

  const line = play.lines.find((l) => l.id === selection.id);
  if (!line) return null;
  const owner = getPlayer(play, line.playerId);
  return (
    <Section title="Selection" className={styles.selection}>
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
      <label className="check">
        <input
          type="checkbox"
          checked={Boolean(line.curved)}
          onChange={(e) => apply((pl) => updateLine(pl, line.id, { curved: e.target.checked }))}
          data-testid="line-curved"
        />
        Curved (smooth through the breaks)
      </label>
      <p className="small muted">Drag the orange dots on the field to move a break.</p>
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
  const branding = useLibraryStore((s) => s.branding);
  const inPowerPoint = useOfficeHost() === 'PowerPoint';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const run = async (fn: () => Promise<void>, done?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      if (done) setMessage(done);
    } catch (e) {
      console.error(e);
      setMessage(
        e instanceof Error && e.message ? e.message : 'Sorry, that did not work. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title="Files & export">
      {inPowerPoint && (
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={busy}
          onClick={() =>
            void run(
              async () =>
                (await import('../office/insert')).insertPlayIntoPowerPoint(
                  play,
                  fieldStyle,
                  branding,
                ),
              'Inserted as a new slide.',
            )
          }
          data-testid="insert-powerpoint"
        >
          Insert into PowerPoint
        </button>
      )}
      <div className={styles.row}>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() =>
            downloadBlob(
              new Blob([serializePlayFile(play)], { type: 'application/json' }),
              safeFilename(play.name, PLAY_FILE_EXT),
            )
          }
          data-testid="save-play-file"
        >
          Save to file
        </button>
        <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
          Open file…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".playdesk,application/json,.json"
          hidden
          data-testid="open-play-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            void run(async () => {
              const opened = parsePlayFile(await readJsonFile(f));
              cancelLine();
              useEditorStore.getState().select(null);
              usePlayStore.getState().load(opened);
            }, 'Play opened.');
          }}
        />
      </div>
      <div className={styles.row}>
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() =>
            void run(async () =>
              (await import('../export/pptx')).exportPlayPptx(play, fieldStyle, branding),
            )
          }
        >
          PowerPoint
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() =>
            void run(async () =>
              (await import('../export/vsdx')).exportVsdx(
                play.name,
                [{ name: play.name, play }],
                fieldStyle,
                branding,
              ),
            )
          }
          data-testid="export-visio"
        >
          Visio
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() =>
            void run(async () =>
              (await import('../export/png')).exportPlayPng(
                play,
                fieldStyle,
                offenseFill(branding),
              ),
            )
          }
        >
          PNG image
        </button>
      </div>
      {message && (
        <p className="small" role="status">
          {message}
        </p>
      )}
      <p className="small muted">
        Files are saved to your own computer: .playdesk files open again in Playdesk; PowerPoint
        (.pptx) and Visio (.vsdx) files have players and routes as shapes you can edit.
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

  const addAndSelect = (side: 'offense' | 'defense') => {
    finishLine();
    let id = '';
    apply((p) => {
      const r = addPlayer(p, side);
      id = r.id;
      return r.play;
    });
    useEditorStore.getState().setTool('move');
    useEditorStore.getState().select({ kind: 'player', id });
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
        <div className={styles.row}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => addAndSelect('offense')}
            data-testid="add-offense"
          >
            Add player
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => addAndSelect('defense')}
            data-testid="add-defense"
          >
            Add defender
          </button>
        </div>
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
          Show defense
        </label>
        <select
          className="select"
          aria-label="Defense"
          value={play.defense ?? '43-cover2'}
          disabled={!play.showDefense}
          onChange={(e) => act((p) => placeDefense(p, e.target.value as DefenseId))}
        >
          {DEFENSES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {play.showDefense && (
          <button type="button" className="btn btn-sm" onClick={() => act((p) => placeDefense(p))}>
            Re-align defense
          </button>
        )}
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
