import { useSyncExternalStore } from 'react';

/**
 * Running inside Microsoft PowerPoint as an Office add-in (task pane).
 * Office.js is loaded only when the app was opened from the add-in (path /addin),
 * so the normal web app never downloads it.
 */

interface OfficeGlobal {
  onReady: () => Promise<{ host: string | null }>;
  context: { requirements: { isSetSupported: (name: string, version: string) => boolean } };
}
interface PowerPointGlobal {
  run: (
    fn: (ctx: {
      presentation: {
        insertSlidesFromBase64: (base64: string, options?: { formatting?: string }) => void;
      };
      sync: () => Promise<void>;
    }) => Promise<void>,
  ) => Promise<void>;
}
declare global {
  interface Window {
    Office?: OfficeGlobal;
    PowerPoint?: PowerPointGlobal;
  }
}

const OFFICE_JS = 'https://appsforoffice.microsoft.com/lib/1/hosted/office.js';
const SESSION_KEY = 'playdesk:in-office';

let host: 'PowerPoint' | null = null;
const listeners = new Set<() => void>();

function setHost(h: 'PowerPoint' | null) {
  host = h;
  listeners.forEach((l) => l());
}

/** True when the page was opened by the add-in in this tab (survives in-app navigation and reloads). */
export function startedFromAddin(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export async function initOffice(): Promise<void> {
  if (!window.Office) await loadOfficeJs();
  const info = await window.Office!.onReady();
  if (info.host !== 'PowerPoint') return;
  // Only remember this once PowerPoint is confirmed, so /addin opened in a normal
  // browser tab doesn't make every later page try to load Office.js.
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // storage blocked: the add-in still works on this page
  }
  setHost('PowerPoint');
}

async function loadOfficeJs(): Promise<void> {
  // Office.js removes history.pushState/replaceState, which the app's router needs.
  const push = window.history.pushState;
  const replace = window.history.replaceState;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = OFFICE_JS;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Office.js did not load'));
    document.head.appendChild(s);
  });
  window.history.pushState = push;
  window.history.replaceState = replace;
}

export function useOfficeHost(): 'PowerPoint' | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => host,
  );
}

export class OfficeError extends Error {}

/** Insert every slide of a .pptx (base64) after the current slide, keeping Playdesk's formatting. */
export async function insertSlides(base64: string): Promise<void> {
  const office = window.Office;
  const ppt = window.PowerPoint;
  if (!office || !ppt || host !== 'PowerPoint')
    throw new OfficeError('Not running inside PowerPoint.');
  if (!office.context.requirements.isSetSupported('PowerPointApi', '1.2')) {
    throw new OfficeError('This version of PowerPoint cannot insert slides. Please update Office.');
  }
  await ppt.run(async (ctx) => {
    ctx.presentation.insertSlidesFromBase64(base64, { formatting: 'KeepSourceFormatting' });
    await ctx.sync();
  });
}
