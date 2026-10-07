/**
 * Branding and theme defaults — the first file a buyer edits (docs/THEMING.md). Colours live in
 * src/theme/tokens.css; presets listed here must exist there as `[data-theme='<id>']`.
 */
export const themeConfig = {
  name: 'Shop Admin',
  /** Two letters shown in the logo mark and the collapsed sidebar. */
  monogram: 'SA',
  tagline: 'Commerce back office',
  /** Accent presets; `lime` is the default palette in :root. */
  presets: [
    { id: 'lime', label: 'Lime', swatch: '#C3EB4D' },
    { id: 'cobalt', label: 'Cobalt', swatch: '#7D94FF' },
    { id: 'coral', label: 'Coral', swatch: '#FF9B7D' },
    { id: 'teal', label: 'Teal', swatch: '#4FD1BD' },
    { id: 'amber', label: 'Amber', swatch: '#FFC24B' },
    { id: 'violet', label: 'Violet', swatch: '#B69CFF' },
  ],
  defaultPreset: 'lime',
  /** 'light' | 'dark' | 'system' */
  defaultMode: 'system',
  supportUrl: 'https://example.com/support',
} as const;

export type PresetId = (typeof themeConfig.presets)[number]['id'];

export const PRESET_COOKIE = 'sa_preset';

export function isPreset(value: unknown): value is PresetId {
  return themeConfig.presets.some((p) => p.id === value);
}
