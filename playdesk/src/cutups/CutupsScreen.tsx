import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { newId } from '../model';
import { useLibraryStore } from '../library/libraryStore';
import { mappedCount, rowsOf, BreakdownError, type Breakdown } from './breakdown';
import {
  FIELD_ZONES,
  RULES,
  buildTree,
  ruleLabel,
  summary,
  type CutupNode,
  type CutupTemplate,
  type RuleKind,
} from './cutups';
import { allTemplates, useCutupStore } from './cutupStore';
import {
  FIELDS,
  type BreakdownRow,
  type ColumnMapping,
  type FieldKey,
  type PlayKind,
} from './fields';
import { sampleCsv } from './sample';
import { readXlsx, XlsxError } from './xlsx';
import styles from './CutupsScreen.module.css';

function Group({
  title,
  children,
  open = true,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className={styles.group} open={open}>
      <summary>{title}</summary>
      <div className={styles.groupBody}>{children}</div>
    </details>
  );
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function CutupsScreen() {
  const {
    breakdowns,
    templates,
    loaded,
    error,
    refresh,
    importCsv,
    importRows,
    setMapping,
    removeBreakdown,
    saveTemplate,
    removeTemplate,
  } = useCutupStore();
  const library = useLibraryStore((s) => s.plays);
  const branding = useLibraryStore((s) => s.branding);
  const [breakdownId, setBreakdownId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CutupTemplate>(() => allTemplates([])[0]!);
  const [selected, setSelected] = useState<string>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [depth, setDepth] = useState(2);
  const [playLists, setPlayLists] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const breakdown = breakdowns.find((b) => b.id === breakdownId) ?? breakdowns[0] ?? null;
  const rows = useMemo(() => (breakdown ? rowsOf(breakdown) : []), [breakdown]);
  const tree = useMemo(() => buildTree(rows, draft), [rows, draft]);
  const templatesAll = allTemplates(templates);
  const savedVersion = templates.find((t) => t.id === draft.id);
  const isBuiltIn = Boolean(draft.builtIn);

  const findNode = (n: CutupNode): CutupNode | null =>
    n.id === selected ? n : (n.children.map(findNode).find(Boolean) ?? null);
  const current = findNode(tree) ?? tree;

  async function onFiles(files: File[]) {
    setMessage(null);
    for (const f of files) {
      try {
        if (f.size > 10 * 1024 * 1024)
          throw new BreakdownError('That file is too large (over 10 MB).');
        const name = f.name.replace(/\.[^.]+$/, '');
        if (/\.xls$/i.test(f.name)) {
          throw new BreakdownError(
            'Old .xls files aren’t supported. Save it as .xlsx or CSV and import that.',
          );
        }
        const b = /\.xlsx$/i.test(f.name)
          ? await importRows(await readXlsx(await f.arrayBuffer()), name)
          : await importCsv(await f.text(), name);
        setBreakdownId(b.id);
        setSelected('all');
        setMessage(
          `Imported ${b.data.length} plays from ${f.name}. Matched ${mappedCount(b.mapping)} of ${FIELDS.length} columns; check them under Columns.`,
        );
      } catch (e) {
        setMessage(
          e instanceof BreakdownError || e instanceof XlsxError
            ? e.message
            : `${f.name} could not be read as a breakdown (CSV or Excel).`,
        );
      }
    }
  }

  async function runExport(kind: 'pptx' | 'csv') {
    if (!breakdown) return;
    setBusy(true);
    try {
      const report = await import('./report');
      if (kind === 'csv') report.downloadCutupList(tree, breakdown.name);
      else
        await report.exportCutupReport(
          tree,
          library,
          { maxDepth: depth, playLists, breakdownName: breakdown.name },
          branding,
        );
    } catch (e) {
      console.error(e);
      setMessage('Sorry, the export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const patch = (p: Partial<CutupTemplate>) => setDraft((d) => ({ ...d, ...p }));
  const patchFilters = (p: Partial<CutupTemplate['filters']>) =>
    setDraft((d) => ({ ...d, filters: { ...d.filters, ...p } }));
  const dirty = !savedVersion || JSON.stringify(savedVersion) !== JSON.stringify(draft);

  return (
    <div className={styles.screen}>
      <aside className={styles.side} aria-label="Cutup setup">
        <Group title="Breakdown">
          {breakdowns.length > 0 ? (
            <select
              className="select"
              aria-label="Breakdown"
              value={breakdown?.id ?? ''}
              onChange={(e) => {
                setBreakdownId(e.target.value);
                setSelected('all');
              }}
            >
              {breakdowns.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.data.length} plays)
                </option>
              ))}
            </select>
          ) : (
            <p className="small muted">{loaded ? 'No breakdowns yet.' : 'Loading…'}</p>
          )}
          <div className={styles.row}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => fileRef.current?.click()}
            >
              Import CSV or Excel…
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={async () => {
                const b = await importCsv(sampleCsv(), 'Sample game (made-up data)');
                setBreakdownId(b.id);
                setSelected('all');
              }}
            >
              Try a sample game
            </button>
            {breakdown && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => {
                  if (window.confirm(`Delete the breakdown "${breakdown.name}"?`)) {
                    void removeBreakdown(breakdown.id);
                    setBreakdownId(null);
                  }
                }}
              >
                Delete
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,.xlsx,.xls"
            multiple
            hidden
            data-testid="breakdown-file"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = '';
              if (files.length) void onFiles(files);
            }}
          />
          <p className="small muted">
            Export your tagged breakdown from Hudl, Qwikcut or a spreadsheet as CSV. It stays in
            this browser.
          </p>
        </Group>

        {breakdown && (
          <ColumnsGroup
            key={breakdown.id}
            breakdown={breakdown}
            onChange={(m) => void setMapping(breakdown.id, m)}
          />
        )}

        <Group title="Cutup template">
          <select
            className="select"
            aria-label="Cutup template"
            value={draft.id}
            onChange={(e) => {
              const t = templatesAll.find((x) => x.id === e.target.value);
              if (t) {
                setDraft(t);
                setSelected('all');
              }
            }}
          >
            <optgroup label="Starter templates">
              {templatesAll
                .filter((t) => t.builtIn)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </optgroup>
            {templates.length > 0 && (
              <optgroup label="My templates">
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
            {!templatesAll.some((t) => t.id === draft.id) && (
              <option value={draft.id}>{draft.name} (unsaved)</option>
            )}
          </select>
          <label className={styles.label}>
            Name
            <input
              className="input"
              value={draft.name}
              maxLength={80}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>

          <div className={styles.label}>
            Sort plays into folders by
            <ol className={styles.rules} aria-label="Folder order">
              {draft.rules.map((r, i) => (
                <li key={`${r}-${i}`} className={styles.rule}>
                  <span className={styles.ruleNo}>{i + 1}</span>
                  <span className={styles.ruleName}>{ruleLabel(r)}</span>
                  <button
                    type="button"
                    className={styles.mini}
                    aria-label={`Move ${ruleLabel(r)} up`}
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...draft.rules];
                      [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                      patch({ rules: next });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.mini}
                    aria-label={`Move ${ruleLabel(r)} down`}
                    disabled={i === draft.rules.length - 1}
                    onClick={() => {
                      const next = [...draft.rules];
                      [next[i + 1], next[i]] = [next[i]!, next[i + 1]!];
                      patch({ rules: next });
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.mini}
                    aria-label={`Remove ${ruleLabel(r)}`}
                    onClick={() => patch({ rules: draft.rules.filter((_, j) => j !== i) })}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
            {draft.rules.length < 5 && (
              <select
                className="select"
                aria-label="Add a folder level"
                value=""
                onChange={(e) =>
                  e.target.value && patch({ rules: [...draft.rules, e.target.value as RuleKind] })
                }
              >
                <option value="">+ Add a folder level…</option>
                {RULES.filter((r) => !draft.rules.includes(r.kind)).map((r) => (
                  <option key={r.kind} value={r.kind}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <fieldset className={styles.filters}>
            <legend>Only include</legend>
            <div className={styles.chips} role="group" aria-label="Side of the ball">
              {(['O', 'D', 'K'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={draft.filters.odk.includes(o)}
                  onClick={() => patchFilters({ odk: toggle(draft.filters.odk, o) })}
                >
                  {o === 'O' ? 'Offense' : o === 'D' ? 'Defense' : 'Kicking'}
                </button>
              ))}
            </div>
            <div className={styles.chips} role="group" aria-label="Run or pass">
              {(['Run', 'Pass', 'Other'] as PlayKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={draft.filters.kinds.includes(k)}
                  onClick={() => patchFilters({ kinds: toggle(draft.filters.kinds, k) })}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className={styles.chips} role="group" aria-label="Downs">
              {[1, 2, 3, 4].map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={draft.filters.downs.includes(d)}
                  onClick={() => patchFilters({ downs: toggle(draft.filters.downs, d) })}
                >
                  {['1st', '2nd', '3rd', '4th'][d - 1]}
                </button>
              ))}
            </div>
            <div className={styles.chips} role="group" aria-label="Field position">
              {FIELD_ZONES.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  aria-pressed={draft.filters.zones.includes(z.id)}
                  title={z.label}
                  onClick={() => patchFilters({ zones: toggle(draft.filters.zones, z.id) })}
                >
                  {z.label.split(' (')[0]}
                </button>
              ))}
            </div>
            <input
              className="input"
              type="search"
              placeholder="Formation, play or personnel contains…"
              aria-label="Text filter"
              value={draft.filters.search}
              onChange={(e) => patchFilters({ search: e.target.value })}
            />
            <p className="small muted">Nothing selected in a row means everything.</p>
          </fieldset>

          <label className="check">
            <input
              type="checkbox"
              checked={draft.numbered}
              onChange={(e) => patch({ numbered: e.target.checked })}
            />
            Number folders (01 - …)
          </label>
          <label className={styles.inline}>
            Hide folders with fewer than
            <input
              className="input"
              type="number"
              min={1}
              max={50}
              value={draft.minPlays}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value));
                if (n >= 1 && n <= 50) patch({ minPlays: n });
              }}
              aria-label="Minimum plays per folder"
            />
            plays
          </label>

          <div className={styles.row}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!dirty || isBuiltIn}
              onClick={() =>
                void saveTemplate(draft).then(() =>
                  setMessage(
                    `Saved the template “${draft.name}”. It’s ready for next week’s breakdown.`,
                  ),
                )
              }
            >
              Save template
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                const copy = {
                  ...draft,
                  id: newId('cut'),
                  name: isBuiltIn ? draft.name : `${draft.name} (copy)`,
                  builtIn: undefined,
                };
                setDraft(copy);
                void saveTemplate(copy).then(() =>
                  setMessage(`Saved “${copy.name}” to My templates.`),
                );
              }}
            >
              Save as new
            </button>
            {savedVersion && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => {
                  if (window.confirm(`Delete the template "${draft.name}"?`)) {
                    void removeTemplate(draft.id);
                    setDraft(allTemplates([])[0]!);
                  }
                }}
              >
                Delete
              </button>
            )}
          </div>
          {isBuiltIn && (
            <p className="small muted">
              Starter templates can’t be changed; “Save as new” keeps your version.
            </p>
          )}
        </Group>
      </aside>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <h1>Cutups</h1>
          <div className={styles.row}>
            <label className={styles.inline}>
              Title slides for
              <select
                className="select"
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                aria-label="Title slide depth"
              >
                {Array.from({ length: Math.max(1, draft.rules.length) }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i === 0
                      ? 'top-level folders'
                      : i === draft.rules.length - 1
                        ? 'every folder'
                        : `${i + 1} levels`}
                  </option>
                ))}
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={playLists}
                onChange={(e) => setPlayLists(e.target.checked)}
              />
              Play lists
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!breakdown || busy || tree.rows.length === 0}
              onClick={() => void runExport('pptx')}
            >
              Download PowerPoint
            </button>
            <button
              type="button"
              className="btn"
              disabled={!breakdown || busy || tree.rows.length === 0}
              onClick={() => void runExport('csv')}
            >
              Folder list (.csv)
            </button>
          </div>
        </div>
        {(message || error) && (
          <p className={styles.message} role="status">
            {error ?? message}
          </p>
        )}

        {!breakdown ? (
          <div className={styles.empty}>
            <h2>Build organized cutups from your breakdown</h2>
            <ol>
              <li>
                Export a game’s tagged plays from Hudl, Qwikcut or a spreadsheet as CSV or Excel.
              </li>
              <li>Import it here and check the columns were matched.</li>
              <li>
                Pick a template (or build one: field position → down & distance → formation…).
              </li>
              <li>Download a PowerPoint with a title slide and tendencies for every folder.</li>
            </ol>
            <p className="muted">No file handy? Use “Try a sample game” on the left.</p>
          </div>
        ) : (
          <div className={styles.split}>
            <section className={styles.tree} aria-label="Cutup folders">
              <p className="small muted">{summary(tree.stats)}</p>
              {tree.rows.length === 0 ? (
                <p className="muted">No plays match these filters.</p>
              ) : (
                <ul role="tree" aria-label={tree.title}>
                  <TreeNode node={tree} selected={selected} onSelect={setSelected} />
                </ul>
              )}
            </section>
            <Detail node={current} />
          </div>
        )}
      </main>
    </div>
  );
}

function TreeNode({
  node,
  selected,
  onSelect,
}: {
  node: CutupNode;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(node.depth < 1);
  const hasKids = node.children.length > 0;
  return (
    <li
      role="treeitem"
      aria-expanded={hasKids ? open : undefined}
      aria-selected={selected === node.id}
      className={styles.node}
    >
      <div className={styles.nodeRow} style={{ paddingLeft: node.depth * 16 }}>
        {hasKids ? (
          <button
            type="button"
            className={styles.twisty}
            aria-label={open ? `Collapse ${node.title}` : `Expand ${node.title}`}
            onClick={() => setOpen(!open)}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className={styles.twisty} aria-hidden />
        )}
        <button
          type="button"
          className={styles.nodeBtn}
          data-selected={selected === node.id || undefined}
          onClick={() => onSelect(node.id)}
          data-testid="cutup-node"
        >
          <span className={styles.nodeTitle}>{node.depth === 0 ? 'All plays' : node.title}</span>
          <span className={styles.count}>{node.rows.length}</span>
        </button>
      </div>
      {hasKids && open && (
        <ul role="group">
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} selected={selected} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Detail({ node }: { node: CutupNode }) {
  const s = node.stats;
  const tiles: [string, string][] = [
    [String(s.count), 'plays'],
    [s.run + s.pass ? `${s.runPct}%` : '–', 'run'],
    [s.run + s.pass ? `${s.passPct}%` : '–', 'pass'],
    [s.avgRun === null ? '–' : String(s.avgRun), 'avg run'],
    [s.avgPass === null ? '–' : String(s.avgPass), 'avg pass'],
    [s.efficiency === null ? '–' : `${s.efficiency}%`, 'efficient'],
  ];
  return (
    <section className={styles.detail} aria-label="Folder details" data-testid="cutup-detail">
      <h2>{node.depth === 0 ? 'All plays' : node.title}</h2>
      <div className={styles.tiles}>
        {tiles.map(([v, l]) => (
          <div key={l} className={styles.tile}>
            <b>{v}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <div className={styles.lists}>
        <ShareList title="Top formations" items={s.topFormations} />
        <ShareList title="Top plays" items={s.topPlays} />
      </div>
      <PlayTable rows={node.rows} />
    </section>
  );
}

function ShareList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number; pct: number }[];
}) {
  return (
    <div>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="small muted">Not tagged</p>
      ) : (
        <ul className={styles.shares}>
          {items.map((i) => (
            <li key={i.label}>
              <span>{i.label}</span>
              <i style={{ width: `${Math.max(4, i.pct)}%` }} aria-hidden />
              <small>
                {i.count} ({i.pct}%)
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function yard(r: BreakdownRow) {
  if (r.toGoal === null) return '';
  return r.toGoal > 50 ? `Own ${100 - r.toGoal}` : r.toGoal === 50 ? '50' : `Opp ${r.toGoal}`;
}

function PlayTable({ rows }: { rows: BreakdownRow[] }) {
  const shown = rows.slice(0, 200);
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Down</th>
            <th>Yard ln</th>
            <th>Hash</th>
            <th>Formation</th>
            <th>Play</th>
            <th>Result</th>
            <th>Gain</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.index}>
              <td>{r.playNo}</td>
              <td>{r.down ? `${r.down} & ${r.distance ?? '?'}` : ''}</td>
              <td>{yard(r)}</td>
              <td>{r.hash}</td>
              <td>{r.formation}</td>
              <td>{r.play}</td>
              <td>{r.result || r.playType}</td>
              <td>{r.gain ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > shown.length && (
        <p className="small muted">
          Showing the first {shown.length} of {rows.length} plays.
        </p>
      )}
    </div>
  );
}

const KEY_FIELDS: FieldKey[] = ['down', 'distance', 'yardLine', 'playType', 'formation'];

function ColumnsGroup({
  breakdown,
  onChange,
}: {
  breakdown: Breakdown;
  onChange: (m: ColumnMapping) => void;
}) {
  const m = breakdown.mapping;
  // The columns cutups depend on most: keep this section open until they're all matched.
  const missing = FIELDS.filter((f) => KEY_FIELDS.includes(f.key) && m[f.key] < 0);
  return (
    <Group
      title={`Columns (${mappedCount(m)} of ${FIELDS.length} matched)`}
      open={missing.length > 0}
    >
      {missing.length > 0 && (
        <p className={styles.warn}>Not found yet: {missing.map((f) => f.label).join(', ')}.</p>
      )}
      <p className="small muted">Pick which column in your file holds each piece of information.</p>
      <div className={styles.mapping}>
        {FIELDS.map((f) => (
          <label key={f.key} className={styles.mapRow}>
            <span>{f.label}</span>
            <select
              className="select"
              value={m[f.key]}
              aria-label={`Column for ${f.label}`}
              onChange={(e) => onChange({ ...m, [f.key]: Number(e.target.value) })}
            >
              <option value={-1}>(not in this file)</option>
              {breakdown.headers.map((h, i) => (
                <option key={i} value={i}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </Group>
  );
}
