import { useEffect } from 'react';
import { EditorScreen } from '../editor/EditorScreen';
import { LibraryScreen } from '../library/LibraryScreen';
import { useLibraryStore } from '../library/libraryStore';
import { useAutosave } from '../library/useAutosave';
import { SheetsScreen } from '../sheets/SheetsScreen';
import { Landing } from './Landing';
import { Header } from './Header';
import { useRoute } from './router';

export function App() {
  const route = useRoute();
  if (route === 'landing') return <Landing />;
  return <Workspace route={route} />;
}

function Workspace({ route }: { route: 'editor' | 'library' | 'sheets' }) {
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
    </div>
  );
}
