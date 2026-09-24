import { useMemo, useRef, useState } from 'react';
import { getFormation } from '../model';
import { navigate } from '../app/router';
import { cancelLine } from '../editor/actions';
import { useEditorStore } from '../store/editorStore';
import { usePlayStore } from '../store/playStore';
import { exportBackup, importBackup } from './db';
import { useLibraryStore } from './libraryStore';
import { PlayThumb } from './PlayThumb';
import { allTags, filterPlays, parseTags } from './search';
import { DEFAULT_FOLDERS, type SavedPlay } from './types';
import { BackupError } from './validate';
import styles from './LibraryScreen.module.css';

export function LibraryScreen() {
  const { plays, folders, loaded, error, addFolder, removeFolder, refresh } = useLibraryStore();
  const [folder, setFolder] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const shown = useMemo(() => filterPlays(plays, { folder, query }), [plays, folder, query]);
  const tags = useMemo(() => allTags(plays), [plays]);

  async function onExport() {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playdesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`Exported ${backup.plays.length} plays and ${backup.sheets.length} sheets.`);
  }

  async function onImport(file: File) {
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new BackupError('That file is too large to be a Playdesk backup.');
      const data: unknown = JSON.parse(await file.text());
      const n = await importBackup(data);
      await refresh();
      setMessage(`Imported ${n.plays} plays and ${n.sheets} sheets.`);
    } catch (e) {
      setMessage(
        e instanceof BackupError ? e.message : 'That file could not be read as a Playdesk backup.',
      );
    }
  }

  return (
    <div className={styles.screen}>
      <aside className={styles.sidebar} aria-label="Folders">
        <h2 className={styles.heading}>Folders</h2>
        <ul className={styles.folders}>
          <li>
            <button type="button" aria-pressed={folder === null} onClick={() => setFolder(null)}>
              All plays <span className={styles.count}>{plays.length}</span>
            </button>
          </li>
          {folders.map((f) => (
            <li key={f} className={styles.folderRow}>
              <button type="button" aria-pressed={folder === f} onClick={() => setFolder(f)}>
                {f}{' '}
                <span className={styles.count}>{plays.filter((p) => p.folder === f).length}</span>
              </button>
              {!(DEFAULT_FOLDERS as readonly string[]).includes(f) && (
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={`Delete folder ${f}`}
                  onClick={() => {
                    if (window.confirm(`Delete the folder "${f}"? Its plays move to Offense.`)) {
                      void removeFolder(f);
                      if (folder === f) setFolder(null);
                    }
                  }}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
        <form
          className={styles.newFolder}
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('folder') as HTMLInputElement;
            void addFolder(input.value);
            input.value = '';
          }}
        >
          <input
            name="folder"
            className="input"
            placeholder="New folder"
            aria-label="New folder name"
            maxLength={40}
          />
          <button className="btn btn-sm" type="submit">
            Add
          </button>
        </form>

        <h2 className={styles.heading}>Backup</h2>
        <div className={styles.backup}>
          <button type="button" className="btn btn-sm" onClick={() => void onExport()}>
            Export library (.json)
          </button>
          <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
            Import backup…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="import-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = '';
            }}
          />
        </div>
        <p className="small muted">
          Your plays are stored in this browser only. Export a backup now and then.
        </p>
      </aside>

      <main className={styles.main}>
        <div className={styles.toolbar}>
          <input
            type="search"
            className="input"
            placeholder="Search by name, tag or formation"
            aria-label="Search plays"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              navigate('editor');
            }}
          >
            Back to editor
          </button>
        </div>
        {tags.length > 0 && (
          <div className={styles.tags} aria-label="Tags">
            {tags.map((t) => (
              <button key={t} type="button" className={styles.tag} onClick={() => setQuery(t)}>
                #{t}
              </button>
            ))}
          </div>
        )}
        {(message || error) && (
          <p className={styles.message} role="status">
            {error ?? message}
          </p>
        )}
        {!loaded ? (
          <p className="muted">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="muted">
            {plays.length === 0 ? 'No plays yet. Save one from the editor.' : 'No plays match.'}
          </p>
        ) : (
          <ul className={styles.grid} data-testid="library-grid">
            {shown.map((item) => (
              <PlayCard key={item.id} item={item} folders={folders} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function PlayCard({ item, folders }: { item: SavedPlay; folders: string[] }) {
  const { rename, update, remove } = useLibraryStore();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  let formation = item.play.formation as string;
  try {
    formation = getFormation(item.play.formation).name;
  } catch {
    /* keep id */
  }

  const open = () => {
    cancelLine();
    useEditorStore.getState().select(null);
    usePlayStore.getState().load(item.play);
    navigate('editor');
  };

  return (
    <li className={styles.card} data-testid="play-card">
      <button
        type="button"
        className={styles.thumbBtn}
        onClick={open}
        aria-label={`Open ${item.play.name}`}
      >
        <PlayThumb play={item.play} className={styles.thumb} />
      </button>
      <div className={styles.cardBody}>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = (
                e.currentTarget.elements.namedItem('name') as HTMLInputElement
              ).value.trim();
              const tags = parseTags(
                (e.currentTarget.elements.namedItem('tags') as HTMLInputElement).value,
              );
              const folder = (e.currentTarget.elements.namedItem('folder') as HTMLSelectElement)
                .value;
              void (async () => {
                if (name && name !== item.play.name) await rename(item.id, name);
                await update(item.id, { tags, folder });
                setEditing(false);
              })();
            }}
            className={styles.editForm}
          >
            <input
              name="name"
              className="input"
              defaultValue={item.play.name}
              aria-label="Play name"
              maxLength={80}
              autoFocus
            />
            <input
              name="tags"
              className="input"
              defaultValue={item.tags.join(', ')}
              aria-label="Tags, separated by commas"
              placeholder="tags, comma separated"
            />
            <select name="folder" className="select" defaultValue={item.folder} aria-label="Folder">
              {folders.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <div className={styles.cardActions}>
              <button className="btn btn-sm btn-primary" type="submit">
                Done
              </button>
              <button className="btn btn-sm" type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <h3 className={styles.name}>
              {item.play.name}
              {item.example && <span className={styles.badge}>Example</span>}
            </h3>
            <p className="small muted">
              {formation} · {item.folder}
              {item.tags.length > 0 && ` · ${item.tags.map((t) => `#${t}`).join(' ')}`}
            </p>
            {confirming ? (
              <div className={styles.cardActions} role="alert">
                <span className="small">Delete this play?</span>
                <button
                  className="btn btn-sm btn-danger"
                  type="button"
                  onClick={() => void remove(item.id)}
                >
                  Delete
                </button>
                <button className="btn btn-sm" type="button" onClick={() => setConfirming(false)}>
                  Keep
                </button>
              </div>
            ) : (
              <div className={styles.cardActions}>
                <button className="btn btn-sm" type="button" onClick={open}>
                  Open
                </button>
                <button
                  className="btn btn-sm"
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label={`Rename or tag ${item.play.name}`}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  type="button"
                  onClick={() => setConfirming(true)}
                  aria-label={`Delete ${item.play.name}`}
                >
                  Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
