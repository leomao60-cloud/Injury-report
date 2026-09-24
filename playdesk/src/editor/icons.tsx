import type { Tool } from '../store/editorStore';

const common = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const TOOL_ICONS: Record<Tool, JSX.Element> = {
  move: (
    <svg {...common}>
      <path d="M5 3l14 8-6 2-2 6z" />
    </svg>
  ),
  route: (
    <svg {...common}>
      <path d="M6 20V9h10" />
      <path d="M14 6l4 3-4 3" fill="currentColor" />
    </svg>
  ),
  block: (
    <svg {...common}>
      <path d="M12 20V7" />
      <path d="M6 7h12" />
    </svg>
  ),
  motion: (
    <svg {...common} strokeDasharray="3 2.5">
      <path d="M4 16h13" />
      <path d="M16 12.5l4 3.5-4 3.5" fill="currentColor" strokeDasharray="none" />
    </svg>
  ),
  erase: (
    <svg {...common}>
      <path d="M20 20H8l-4-4 10-10 7 7-6 7" />
      <path d="M9 11l6 6" />
    </svg>
  ),
};
