import { useMemo, useState } from 'react';
import {
  LEVEL_NAMES,
  POSITION_COLORS,
  TEMPLATE_CATEGORIES,
  playFromTemplate,
  templatesIn,
  type PlayTemplate,
  type TemplateCategory,
} from '../model';
import { navigate } from '../app/router';
import { cancelLine } from '../editor/actions';
import { useLibraryStore } from '../library/libraryStore';
import { PlayThumb } from '../library/PlayThumb';
import { useEditorStore } from '../store/editorStore';
import { usePlayStore } from '../store/playStore';
import styles from './FormationsScreen.module.css';

const LEGEND: [string, string][] = [
  ['WR', POSITION_COLORS.WR],
  ['TE', POSITION_COLORS.TE],
  ['RB', POSITION_COLORS.RB],
  ['FB', POSITION_COLORS.FB],
];
const DEFENSE_LEGEND: [string, string][] = [
  ['DL', POSITION_COLORS.DL],
  ['LB', POSITION_COLORS.LB],
  ['DB', POSITION_COLORS.DB],
];

/** Ready-made formations and concepts, the building blocks for a playbook. */
export function FormationsScreen() {
  const [category, setCategory] = useState<TemplateCategory>('personnel');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const info = TEMPLATE_CATEGORIES.find((c) => c.id === category)!;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templatesIn(category).filter(
      (t) => !q || `${t.name} ${t.description}`.toLowerCase().includes(q),
    );
  }, [category, query]);

  return (
    <div className={styles.screen}>
      <header className={styles.intro}>
        <h1>Formations</h1>
        <p className="muted">
          High school, college, 12-man and flag formations to build on. Open one in the editor to
          change it, or add it straight to your library.
        </p>
      </header>

      <div className={styles.chips} role="tablist" aria-label="Categories">
        {TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            className={styles.chip}
            onClick={() => {
              setCategory(c.id);
              setMessage(null);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <p className={styles.blurb}>{info.blurb}</p>
        <input
          type="search"
          className="input"
          placeholder="Search this category"
          aria-label="Search formations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {category === 'personnel' && (
        <div className={styles.legend} aria-label="Position colors">
          {[...LEGEND, ...DEFENSE_LEGEND].map(([label, color]) => (
            <span key={label}>
              <i style={{ background: color }} aria-hidden /> {label}
            </span>
          ))}
        </div>
      )}

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}

      <ul className={styles.grid} data-testid="template-grid">
        {shown.map((t) => (
          <TemplateCard key={t.id} template={t} onSaved={setMessage} />
        ))}
        {shown.length === 0 && <li className="muted">Nothing matches.</li>}
      </ul>
    </div>
  );
}

function TemplateCard({
  template,
  onSaved,
}: {
  template: PlayTemplate;
  onSaved: (m: string) => void;
}) {
  const preview = useMemo(() => template.build(), [template]);
  const save = useLibraryStore((s) => s.save);
  const addFolder = useLibraryStore((s) => s.addFolder);

  const open = () => {
    cancelLine();
    useEditorStore.getState().select(null);
    usePlayStore.getState().load(playFromTemplate(template));
    navigate('editor');
  };

  const addToLibrary = async () => {
    await addFolder(template.folder); // no-op when it already exists
    await save(playFromTemplate(template), template.folder);
    onSaved(`Added “${template.name}” to ${template.folder}.`);
  };

  return (
    <li className={styles.card} data-testid="template-card">
      <button
        type="button"
        className={styles.thumbBtn}
        onClick={open}
        aria-label={`Open ${template.name} in the editor`}
      >
        <PlayThumb play={preview} className={styles.thumb} />
      </button>
      <div className={styles.body}>
        <h2 className={styles.name}>{template.name}</h2>
        <p className="small muted">{template.description}</p>
        <p className={styles.meta}>
          {LEVEL_NAMES[preview.level]} · {template.folder}
        </p>
        <div className={styles.actions}>
          <button type="button" className="btn btn-sm btn-primary" onClick={open}>
            Open in editor
          </button>
          <button type="button" className="btn btn-sm" onClick={() => void addToLibrary()}>
            Add to library
          </button>
        </div>
      </div>
    </li>
  );
}
