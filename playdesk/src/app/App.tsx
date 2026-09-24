import { useEffect } from 'react';
import { EditorScreen } from '../editor/EditorScreen';
import { LibraryScreen } from '../library/LibraryScreen';
import { useLibraryStore } from '../library/libraryStore';
import { useAutosave } from '../library/useAutosave';
import { SheetsScreen } from '../sheets/SheetsScreen';
import { TeamScreen } from '../library/TeamScreen';
import { initOffice, startedFromAddin } from '../office/office';
import { Landing } from './Landing';
import { Header } from './Header';
import { useRoute, type Route } from './router';

export function App() {
  const route = useRoute();
  useEffect(() => {
    // Opened by the PowerPoint add-in (or reloaded inside it): connect to Office.
    if (route === 'addin' || startedFromAddin()) void initOffice().catch(() => {});
  }, [route]);
  if (route === 'landing') return <Landing />;
  return <Workspace route={route === 'addin' ? 'editor' : route} />;
}

function Workspace({ route }: { route: Exclude<Route, 'landing' | 'addin'> }) {
  const restored = useAutosave();
  const refresh = useLibraryStore((s) => s.refresh);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="app">
      <Header route={route} />
      {route === 'editor' && (restored ? <EditorScreen /> : null)}
      {route === 'library' && <LibraryScreen />}
      {route === 'sheets' && <SheetsScreen />}
      {route === 'team' && <TeamScreen />}
    </div>
  );
}
