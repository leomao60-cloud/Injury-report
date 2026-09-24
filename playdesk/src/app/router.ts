import { useEffect, useSyncExternalStore } from 'react';

/** Tiny history-API router: '/', '/app', '/app/library', '/app/sheets'. */
export type Route = 'landing' | 'editor' | 'library' | 'sheets';

export const ROUTE_PATHS: Record<Route, string> = {
  landing: '/',
  editor: '/app',
  library: '/app/library',
  sheets: '/app/sheets',
};

const ROUTE_TITLES: Record<Route, string> = {
  landing: 'Playdesk: draw plays, print call sheets',
  editor: 'Editor · Playdesk',
  library: 'Play library · Playdesk',
  sheets: 'Sheets · Playdesk',
};

export function routeFromPath(path: string): Route {
  const clean = path.replace(/\/+$/, '') || '/';
  const found = (Object.keys(ROUTE_PATHS) as Route[]).find((r) => ROUTE_PATHS[r] === clean);
  return found ?? (clean.startsWith('/app') ? 'editor' : 'landing');
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('popstate', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('popstate', cb);
  };
}

export function navigate(route: Route) {
  const path = ROUTE_PATHS[route];
  if (window.location.pathname !== path) window.history.pushState(null, '', path);
  listeners.forEach((l) => l());
  window.scrollTo(0, 0);
}

export function useRoute(): Route {
  const path = useSyncExternalStore(subscribe, () => window.location.pathname);
  const route = routeFromPath(path);
  useEffect(() => {
    document.title = ROUTE_TITLES[route];
  }, [route]);
  return route;
}
