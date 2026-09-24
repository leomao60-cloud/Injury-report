import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useLibraryStore } from '../library/libraryStore';
import { filterPlays } from '../library/search';
import {
  formatNumberList,
  moveItem,
  newSheet,
  parseNumberList,
  pageSize,
  callsPerPanel,
} from './layout';
import { resolveSheet, wristbandCalls } from './resolve';
import { SheetPages } from './SheetPages';
import type { Orientation, PerPage, SheetDoc, SheetKind } from './types';
import styles from './SheetsScreen.module.css';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className={styles.group}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function Seg<T extends string | number>({
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
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SheetsScreen() {
  const { plays, folders, sheets, saveSheet, removeSheet } = useLibraryStore();
  const [sheet, setSheet] = useState<SheetDoc>(() => newSheet());
  const [folder, setFolder] = useState<string>('');
  const [query, setQuery] = useState('');
  // Text being typed in the skip box; null shows the saved list.
  const [skipText, setSkipText] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.6);

  const calls = useMemo(() => resolveSheet(sheet, plays), [sheet, plays]);
  const picker = useMemo(
    () => filterPlays(plays, { folder: folder || null, query }),
    [plays, folder, query],
  );
  const selected = new Set(sheet.playIds);
  const byId = new Map(plays.map((p) => [p.id, p]));
  const savedVersion = sheets.find((s) => s.id === sheet.id);
  const isSaved = Boolean(savedVersion);
  const dirty =
    !savedVersion ||
    JSON.stringify({ ...savedVersion, updatedAt: 0 }) !==
      JSON.stringify({ ...sheet, updatedAt: 0 });

  const patch = (p: Partial<SheetDoc>) => setSheet((s) => ({ ...s, ...p }));
  const togglePlay = (id: string) =>
    patch({
      playIds: selected.has(id) ? sheet.playIds.filter((x) => x !== id) : [...sheet.playIds, id],
    });

  const overflow = sheet.kind === 'wristband' ? wristbandCalls(sheet, calls).overflow : 0;

  useEffect(() => {
    // Page size for printing follows the sheet's orientation.
    const style = document.createElement('style');
    const o = sheet.kind === 'wristband' ? 'portrait' : sheet.orientation;
    style.textContent = `@page { size: letter ${o}; margin: 0; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [sheet.kind, sheet.orientation]);

  async function runExport(kind: 'pdf' | 'pptx' | 'slides') {
    setBusy(kind === 'pdf' ? 'Making PDF…' : 'Making PowerPoint…');
    try {
      if (kind === 'pdf') {
        const { exportSheetPdf } = await import('../export/pdf');
        await exportSheetPdf(sheet, calls);
      } else {
        const { exportSheetPptx } = await import('../export/pptx');
        await exportSheetPptx(sheet, calls, kind === 'slides' ? 'slides' : 'sheet');
      }
    } catch (e) {
      console.error(e);
      window.alert('Sorry, the export failed. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const page = pageSize(sheet.kind === 'wristband' ? 'portrait' : sheet.orientation);

  return (
    <div className={styles.screen}>
      <aside className={styles.controls} aria-label="Sheet settings" data-print-hide>
        <Group title="Sheet">
          <div className={styles.row}>
            <select
              className="select"
              aria-label="Open a saved sheet"
              value={isSaved ? sheet.id : ''}
              onChange={(e) => {
                const s = sheets.find((x) => x.id === e.target.value);
                if (s) setSheet(s);
              }}
            >
              <option value="" disabled>
                {sheets.length ? 'Open saved sheet…' : 'No saved sheets'}
              </option>
              {sheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setSheet(newSheet(sheet.kind))}
            >
              New
            </button>
          </div>
          <label className={styles.label}>
            Name
            <input
              className="input"
              value={sheet.name}
              maxLength={80}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          <Seg<SheetKind>
            label="Sheet type"
            value={sheet.kind}
            options={[
              { value: 'sheet', label: 'Call sheet' },
              { value: 'wristband', label: 'Wristband' },
            ]}
            onChange={(kind) => patch({ kind })}
          />
          <div className={styles.row}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!dirty}
              onClick={() => void saveSheet(sheet)}
            >
              {isSaved ? 'Save changes' : 'Save sheet'}
            </button>
            {isSaved && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete the sheet "${sheet.name}"? The plays stay in your library.`,
                    )
                  ) {
                    void removeSheet(sheet.id);
                    setSheet(newSheet());
                  }
                }}
              >
                Delete
              </button>
            )}
          </div>
        </Group>

        {sheet.kind === 'sheet' ? (
          <Group title="Layout">
            <Seg<PerPage>
              label="Plays per page"
              value={sheet.perPage}
              options={[1, 2, 4, 8].map((n) => ({ value: n as PerPage, label: `${n} per page` }))}
              onChange={(perPage) => patch({ perPage })}
            />
            <Seg<Orientation>
              label="Orientation"
              value={sheet.orientation}
              options={[
                { value: 'landscape', label: 'Landscape' },
                { value: 'portrait', label: 'Portrait' },
              ]}
              onChange={(orientation) => patch({ orientation })}
            />
          </Group>
        ) : (
          <Group title="Wristband (inches)">
            <div className={styles.grid2}>
              {(
                [
                  ['panelWidthIn', 'Panel width', 1, 10, 0.25],
                  ['panelHeightIn', 'Panel height', 1, 8, 0.25],
                  ['panels', 'Panels', 1, 6, 1],
                  ['rows', 'Rows', 1, 20, 1],
                  ['cols', 'Columns', 1, 6, 1],
                ] as const
              ).map(([key, label, min, max, step]) => (
                <label key={key} className={styles.label}>
                  {label}
                  <input
                    className="input"
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={sheet.wristband[key]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= min && v <= max)
                        patch({ wristband: { ...sheet.wristband, [key]: v } });
                    }}
                  />
                </label>
              ))}
            </div>
            <p className="small muted">
              {callsPerPanel(sheet.wristband)} calls per panel,{' '}
              {callsPerPanel(sheet.wristband) * sheet.wristband.panels} in total. Text only.
            </p>
            {overflow > 0 && (
              <p className={styles.warn} role="status">
                {overflow} play{overflow === 1 ? '' : 's'} don’t fit. Add panels, rows or columns.
              </p>
            )}
          </Group>
        )}

        <Group title="Numbering">
          <div className={styles.grid2}>
            <label className={styles.label}>
              Start at
              <input
                className="input"
                type="number"
                min={0}
                max={9999}
                value={sheet.startNumber}
                onChange={(e) => {
                  const v = Math.floor(Number(e.target.value));
                  if (Number.isFinite(v) && v >= 0 && v <= 9999) patch({ startNumber: v });
                }}
              />
            </label>
            <label className={styles.label}>
              Skip numbers
              <input
                className="input"
                placeholder="e.g. 13, 20-22"
                value={skipText ?? formatNumberList(sheet.skip)}
                onChange={(e) => setSkipText(e.target.value)}
                onBlur={() => {
                  if (skipText !== null) patch({ skip: parseNumberList(skipText) });
                  setSkipText(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && skipText !== null) {
                    patch({ skip: parseNumberList(skipText) });
                    setSkipText(null);
                  }
                }}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => patch({ skip: [] })}
            title="Remove skipped numbers so plays are numbered in a row"
          >
            Renumber
          </button>
        </Group>

        <Group title={`Plays on this sheet (${calls.length})`}>
          {calls.length === 0 ? (
            <p className="small muted">Tick plays below to add them.</p>
          ) : (
            <ol className={styles.order} aria-label="Play order">
              {sheet.playIds.map((id, i) => {
                const item = byId.get(id);
                if (!item) return null;
                const call = calls.find((c) => c.play.id === id);
                return (
                  <li
                    key={id}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null)
                        patch({ playIds: moveItem(sheet.playIds, dragIndex, i) });
                      setDragIndex(null);
                    }}
                    className={styles.orderItem}
                    data-dragging={dragIndex === i || undefined}
                  >
                    <span className={styles.handle} aria-hidden>
                      ⋮⋮
                    </span>
                    <b className={styles.num}>{call?.number}</b>
                    <span className={styles.orderName}>{item.play.name}</span>
                    <button
                      type="button"
                      className={styles.mini}
                      aria-label={`Move ${item.play.name} up`}
                      disabled={i === 0}
                      onClick={() => patch({ playIds: moveItem(sheet.playIds, i, i - 1) })}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.mini}
                      aria-label={`Move ${item.play.name} down`}
                      disabled={i === sheet.playIds.length - 1}
                      onClick={() => patch({ playIds: moveItem(sheet.playIds, i, i + 1) })}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={styles.mini}
                      aria-label={`Remove ${item.play.name}`}
                      onClick={() => togglePlay(id)}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </Group>

        <Group title="Choose plays">
          <div className={styles.row}>
            <select
              className="select"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              aria-label="Folder"
            >
              <option value="">All folders</option>
              {folders.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                patch({
                  playIds: [
                    ...sheet.playIds,
                    ...picker.map((p) => p.id).filter((id) => !selected.has(id)),
                  ],
                })
              }
            >
              Add all
            </button>
          </div>
          <input
            className="input"
            type="search"
            placeholder="Search plays"
            aria-label="Search plays"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className={styles.picker}>
            {picker.map((p) => (
              <li key={p.id}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => togglePlay(p.id)}
                  />
                  {p.play.name}
                  <span className="small muted">{p.folder}</span>
                </label>
              </li>
            ))}
            {picker.length === 0 && (
              <li className="small muted">No plays found. Save plays from the editor first.</li>
            )}
          </ul>
        </Group>
      </aside>

      <main className={styles.preview}>
        <div className={styles.previewBar} data-print-hide>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
            disabled={calls.length === 0}
          >
            Print
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void runExport('pdf')}
            disabled={calls.length === 0 || busy !== null}
          >
            Download PDF
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void runExport('pptx')}
            disabled={calls.length === 0 || busy !== null}
          >
            PowerPoint (this layout)
          </button>
          {sheet.kind === 'sheet' && (
            <button
              type="button"
              className="btn"
              onClick={() => void runExport('slides')}
              disabled={calls.length === 0 || busy !== null}
            >
              PowerPoint (one play per slide)
            </button>
          )}
          {busy && <span className="small muted">{busy}</span>}
          <label className={styles.zoom}>
            <span className="small muted">Zoom</span>
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Preview zoom"
            />
          </label>
        </div>
        <p className="small muted" data-print-hide>
          US Letter, {sheet.kind === 'wristband' ? 'portrait' : sheet.orientation}. In the print
          dialog, set scale to 100% and margins to none.
        </p>
        <div
          className={`${styles.pages} print-root`}
          style={{ '--zoom': zoom, '--page-w': `${page.w}in` } as CSSProperties}
        >
          <SheetPages sheet={sheet} calls={calls} />
        </div>
      </main>
    </div>
  );
}
