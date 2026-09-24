import { useEditorStore, type Tool } from '../store/editorStore';
import { chooseTool } from './actions';
import { TOOL_ICONS } from './icons';
import styles from './ToolRail.module.css';

const TOOLS: { tool: Tool; name: string; key: string }[] = [
  { tool: 'move', name: 'Move', key: 'V' },
  { tool: 'route', name: 'Route', key: 'R' },
  { tool: 'block', name: 'Block', key: 'B' },
  { tool: 'motion', name: 'Motion', key: 'M' },
  { tool: 'erase', name: 'Erase', key: 'E' },
];

export function ToolRail() {
  const active = useEditorStore((s) => s.tool);
  return (
    <nav className={styles.rail} aria-label="Tools">
      {TOOLS.map(({ tool, name, key }) => (
        <button
          key={tool}
          type="button"
          className={styles.tool}
          aria-pressed={active === tool}
          aria-label={`${name} tool (${key})`}
          aria-keyshortcuts={key}
          title={`${name} (${key})`}
          onClick={() => chooseTool(tool)}
          data-testid={`tool-${tool}`}
        >
          {TOOL_ICONS[tool]}
          <span className={styles.name}>{name}</span>
          <kbd className={styles.key}>{key}</kbd>
        </button>
      ))}
    </nav>
  );
}
