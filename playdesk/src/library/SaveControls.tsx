import { useState } from 'react';
import { createPlay } from '../model';
import { navigate } from '../app/router';
import { cancelLine } from '../editor/actions';
import { useEditorStore } from '../store/editorStore';
import { usePlay, usePlayStore } from '../store/playStore';
import { useLibraryStore } from './libraryStore';

export function SaveControls() {
  const play = usePlay();
  const { plays, folders, save, saveCopy } = useLibraryStore();
  const saved = plays.find((p) => p.id === play.id);
  const [folder, setFolder] = useState('Offense');
  const dirty = !saved || JSON.stringify(saved.play) !== JSON.stringify(play);

  const status = !saved
    ? 'Not saved to the library yet'
    : dirty
      ? 'Unsaved changes'
      : `Saved in ${saved.folder}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {!saved && (
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          <span className="muted">Folder</span>
          <select
            className="select"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            aria-label="Folder to save in"
          >
            {folders.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!dirty}
          onClick={() => void save(play, folder)}
          data-testid="save-play"
        >
          {saved ? 'Save changes' : 'Save'}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={async () => {
            const copy = await saveCopy(play, saved ? undefined : folder);
            usePlayStore.getState().load(copy);
          }}
        >
          Save as copy
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            if (
              dirty &&
              !window.confirm(
                'Start a new play? Changes to this play that are not saved to the library will be lost.',
              )
            )
              return;
            cancelLine();
            useEditorStore.getState().select(null);
            usePlayStore
              .getState()
              .load(createPlay({ level: play.level, formation: play.formation }));
          }}
        >
          New play
        </button>
        <button type="button" className="btn btn-sm" onClick={() => navigate('library')}>
          Open…
        </button>
      </div>
      <p className="small muted" aria-live="polite" data-testid="save-status">
        {status}
      </p>
    </div>
  );
}
