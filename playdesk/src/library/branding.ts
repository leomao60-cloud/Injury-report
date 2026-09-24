/** Team branding used on sheets, wristbands and exports. */
export type BrandFont = 'sans' | 'serif' | 'condensed' | 'mono';

export interface Branding {
  teamName: string;
  /** Main team color, #rrggbb. */
  primary: string;
  /** Accent color, #rrggbb. */
  secondary: string;
  font: BrandFont;
  /** Logo as a PNG or JPEG data URL. */
  logo?: string;
  /** Fill offensive players with the team color on sheets and exports. */
  offenseInTeamColor: boolean;
}

export const DEFAULT_BRANDING: Branding = {
  teamName: '',
  primary: '#1f6f43',
  secondary: '#f2c14e',
  font: 'sans',
  offenseInTeamColor: false,
};

/** How each font choice is written in CSS, in PDFs (jsPDF built-in fonts) and in PowerPoint/Visio. */
export const BRAND_FONTS: Record<
  BrandFont,
  { label: string; css: string; pdf: string; office: string }
> = {
  sans: {
    label: 'Clean (Arial)',
    css: 'Arial, Helvetica, sans-serif',
    pdf: 'helvetica',
    office: 'Arial',
  },
  serif: {
    label: 'Classic (Georgia)',
    css: "Georgia, 'Times New Roman', serif",
    pdf: 'times',
    office: 'Georgia',
  },
  condensed: {
    label: 'Condensed (Arial Narrow)',
    css: "'Arial Narrow', 'Roboto Condensed', Arial, sans-serif",
    pdf: 'helvetica',
    office: 'Arial Narrow',
  },
  mono: {
    label: 'Typewriter (Courier)',
    css: "'Courier New', Courier, monospace",
    pdf: 'courier',
    office: 'Courier New',
  },
};

export const MAX_LOGO_BYTES = 1024 * 1024;

const HEX = /^#[0-9a-f]{6}$/i;
const LOGO = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/;

/** Clean untrusted branding (from storage or a backup file). Bad fields fall back to defaults. */
export function sanitizeBranding(v: unknown): Branding {
  const o = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
  const b: Branding = {
    teamName: typeof o.teamName === 'string' ? o.teamName.slice(0, 60) : '',
    primary:
      typeof o.primary === 'string' && HEX.test(o.primary) ? o.primary : DEFAULT_BRANDING.primary,
    secondary:
      typeof o.secondary === 'string' && HEX.test(o.secondary)
        ? o.secondary
        : DEFAULT_BRANDING.secondary,
    font: typeof o.font === 'string' && o.font in BRAND_FONTS ? (o.font as BrandFont) : 'sans',
    offenseInTeamColor: o.offenseInTeamColor === true,
  };
  if (typeof o.logo === 'string' && o.logo.length < MAX_LOGO_BYTES * 1.4 && LOGO.test(o.logo)) {
    b.logo = o.logo;
  }
  return b;
}

/** Black or white, whichever reads better on the color. */
export function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum < 150 ? '#ffffff' : '#111111';
}

export function offenseFill(b: Branding): string | undefined {
  return b.offenseInTeamColor ? b.primary : undefined;
}

/** Image format of a logo data URL, for PDF and PowerPoint. */
export function logoFormat(logo: string): 'PNG' | 'JPEG' {
  return logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}
