import { navigate, ROUTE_PATHS, type Route } from './router';
import styles from './Header.module.css';

const NAV: { route: Route; label: string }[] = [
  { route: 'editor', label: 'Editor' },
  { route: 'library', label: 'Library' },
  { route: 'sheets', label: 'Sheets' },
  { route: 'team', label: 'Team' },
];

export function Header({ route }: { route: Route }) {
  return (
    <header className={styles.header} data-print-hide>
      <a
        href="/"
        className={styles.brand}
        onClick={(e) => {
          e.preventDefault();
          navigate('landing');
        }}
      >
        <img src="/favicon.svg" alt="" width={24} height={24} />
        Playdesk
      </a>
      <nav aria-label="Main">
        <ul className={styles.nav}>
          {NAV.map((n) => (
            <li key={n.route}>
              <a
                href={ROUTE_PATHS[n.route]}
                aria-current={route === n.route ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(n.route);
                }}
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
