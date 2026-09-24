import { useState } from 'react';
import styles from './QuickStart.module.css';

const KEY = 'playdesk:quickstart-dismissed';

function dismissedBefore(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** A short first-run guide above the field, until the coach closes it. */
export function QuickStart() {
  const [open, setOpen] = useState(() => !dismissedBefore());
  if (!open) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // storage blocked: the card just comes back next visit
    }
    setOpen(false);
  };
  return (
    <aside className={styles.card} aria-label="Quick start" data-testid="quick-start">
      <ol className={styles.steps}>
        <li>
          <b>Move players:</b> drag them with the Move tool (V).
        </li>
        <li>
          <b>Draw a route:</b> pick Route (R), click a player, then click the field for each break.
          Click the last point again, or press Enter, to finish.
        </li>
        <li>
          <b>Save and print:</b> press Save, then open Sheets to print call sheets and wristbands.
        </li>
      </ol>
      <button type="button" className="btn btn-sm" onClick={close}>
        Got it
      </button>
    </aside>
  );
}
