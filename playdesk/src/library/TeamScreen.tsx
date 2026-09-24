import { useRef, useState } from 'react';
import { exampleSmash } from '../model';
import { SheetPages } from '../sheets/SheetPages';
import { newSheet } from '../sheets/layout';
import { BRAND_FONTS, MAX_LOGO_BYTES, type BrandFont, type Branding } from './branding';
import { useLibraryStore } from './libraryStore';
import styles from './TeamScreen.module.css';

const PREVIEW_SHEET = {
  ...newSheet(),
  name: 'Call sheet',
  perPage: 2 as const,
  orientation: 'portrait' as const,
};
const PREVIEW_CALLS = [{ number: 12, play: exampleSmash() }];

/** Shrink a logo to at most 600 px on its longest side and return it as a data URL. */
async function readLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg'].includes(file.type))
    throw new Error('Please choose a PNG or JPEG image.');
  if (file.size > 10 * 1024 * 1024) throw new Error('That image is too large (over 10 MB).');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('That image could not be read.'));
      img.src = url;
    });
    const scale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL('image/png');
    if (data.length > MAX_LOGO_BYTES) data = canvas.toDataURL('image/jpeg', 0.85);
    if (data.length > MAX_LOGO_BYTES)
      throw new Error('That logo is too detailed; try a smaller image.');
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function TeamScreen() {
  const { branding, setBranding, brandingLoaded } = useLibraryStore();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Always merge into the latest saved settings: a slow logo upload must not undo other edits.
  const update = (patch: Partial<Branding>) =>
    void setBranding({ ...useLibraryStore.getState().branding, ...patch });

  if (!brandingLoaded) {
    return (
      <div className={styles.screen}>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <section className={styles.form} aria-labelledby="team-heading">
        <h1 id="team-heading" className={styles.title}>
          Team branding
        </h1>
        <p className="muted small">
          Used on call sheets, wristbands, PDFs, PowerPoint and Visio files. Saved in this browser
          and included in library backups.
        </p>

        <label className={styles.field}>
          Team name
          <input
            className="input"
            value={branding.teamName}
            maxLength={60}
            placeholder="e.g. Central High Eagles"
            onChange={(e) => update({ teamName: e.target.value })}
            data-testid="team-name"
          />
        </label>

        <div className={styles.colors}>
          <label className={styles.field}>
            Team color
            <input
              type="color"
              className={styles.color}
              value={branding.primary}
              onChange={(e) => update({ primary: e.target.value })}
              data-testid="team-primary"
            />
          </label>
          <label className={styles.field}>
            Accent color
            <input
              type="color"
              className={styles.color}
              value={branding.secondary}
              onChange={(e) => update({ secondary: e.target.value })}
            />
          </label>
        </div>

        <label className={styles.field}>
          Font
          <select
            className="select"
            value={branding.font}
            onChange={(e) => update({ font: e.target.value as BrandFont })}
          >
            {(Object.keys(BRAND_FONTS) as BrandFont[]).map((f) => (
              <option key={f} value={f} style={{ fontFamily: BRAND_FONTS[f].css }}>
                {BRAND_FONTS[f].label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.field}>
          Logo
          <div className={styles.logoRow}>
            {branding.logo ? (
              <img src={branding.logo} alt="Team logo" className={styles.logo} />
            ) : (
              <span className="small muted">No logo yet</span>
            )}
            <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
              {branding.logo ? 'Change logo…' : 'Upload logo…'}
            </button>
            {branding.logo && (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => update({ logo: undefined })}
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            hidden
            data-testid="logo-file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                setError(null);
                update({ logo: await readLogo(f) });
              } catch (err) {
                setError(err instanceof Error ? err.message : 'That image could not be used.');
              }
            }}
          />
          <span className="small muted">
            PNG or JPEG. It is resized to fit and kept only on this device.
          </span>
          {error && (
            <span className={styles.error} role="alert">
              {error}
            </span>
          )}
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={branding.offenseInTeamColor}
            onChange={(e) => update({ offenseInTeamColor: e.target.checked })}
          />
          Fill offensive players with the team color
        </label>
      </section>

      <section className={styles.preview} aria-label="Preview">
        <h2 className="small muted">Preview</h2>
        <div className={styles.previewPage}>
          <SheetPages sheet={PREVIEW_SHEET} calls={PREVIEW_CALLS} branding={branding} />
        </div>
      </section>
    </div>
  );
}
