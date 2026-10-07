/**
 * Token inventory for the live style guide and the contrast test — mirrors src/theme/tokens.css.
 * Swatches render `var(--token)`, so they follow the active mode and preset.
 */
export const inkScale = [
  '950',
  '900',
  '800',
  '700',
  '600',
  '500',
  '400',
  '300',
  '200',
  '100',
  '50',
] as const;
export const accentScale = ['50', '100', '300', '400', '700', '900'] as const;

export const semanticTokens = [
  { token: 'bg', role: 'Page background' },
  { token: 'surface', role: 'Cards, header, inputs, popovers' },
  { token: 'surface-muted', role: 'Table header, hover, subtle fills' },
  { token: 'surface-inverse', role: 'Sidebar, hero, tooltips' },
  { token: 'fg', role: 'Primary text' },
  { token: 'fg-muted', role: 'Secondary text' },
  { token: 'fg-subtle', role: 'Placeholders, hints' },
  { token: 'border', role: 'Default borders' },
  { token: 'border-strong', role: 'Input and control boundaries' },
  { token: 'primary', role: 'Primary buttons' },
  { token: 'accent', role: 'Active markers, highlights' },
  { token: 'accent-text', role: 'Accent-coloured text' },
  { token: 'ring', role: 'Focus ring' },
] as const;

export const statusTokens = ['success', 'warning', 'danger', 'info'] as const;
export const chartTokens = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
] as const;

/** Text/background pairs that must meet WCAG AA (min ratio); checked by src/theme/tokens.test.ts. */
export const contrastPairs: {
  fg: string;
  bg: string;
  min: number;
  use: string;
}[] = [
  { fg: 'fg', bg: 'bg', min: 4.5, use: 'Body text on the page' },
  { fg: 'fg', bg: 'surface', min: 4.5, use: 'Text on cards' },
  { fg: 'fg-muted', bg: 'surface', min: 4.5, use: 'Secondary text' },
  { fg: 'fg-muted', bg: 'surface-muted', min: 4.5, use: 'Table header labels' },
  { fg: 'fg-subtle', bg: 'surface', min: 4.5, use: 'Hints, placeholders' },
  { fg: 'fg-subtle', bg: 'bg', min: 4.5, use: 'Footnotes on the page background' },
  { fg: 'fg-subtle', bg: 'surface-muted', min: 4.5, use: 'Search field, muted panels' },
  {
    fg: 'fg-inverse',
    bg: 'surface-inverse',
    min: 4.5,
    use: 'Sidebar / hero text',
  },
  {
    fg: 'fg-inverse-muted',
    bg: 'surface-inverse',
    min: 4.5,
    use: 'Sidebar items',
  },
  { fg: 'primary-fg', bg: 'primary', min: 4.5, use: 'Primary button' },
  { fg: 'accent-fg', bg: 'accent', min: 4.5, use: 'Accent button, badges' },
  { fg: 'accent-text', bg: 'surface', min: 4.5, use: 'Accent text' },
  {
    fg: 'border-strong',
    bg: 'surface',
    min: 3,
    use: 'Control boundaries (non-text)',
  },
  { fg: 'success-fg', bg: 'success-soft', min: 4.5, use: 'Success badge' },
  { fg: 'warning-fg', bg: 'warning-soft', min: 4.5, use: 'Warning badge' },
  { fg: 'danger-fg', bg: 'danger-soft', min: 4.5, use: 'Danger badge' },
  { fg: 'info-fg', bg: 'info-soft', min: 4.5, use: 'Info badge' },
];

export const typeScale = [
  { name: 'display', size: 36, line: 44, weight: 600, use: 'Dashboard hero' },
  { name: 'h1', size: 28, line: 36, weight: 600, use: 'Page title' },
  { name: 'h2', size: 22, line: 30, weight: 600, use: 'Section title' },
  { name: 'h3', size: 18, line: 26, weight: 600, use: 'Card title' },
  { name: 'h4', size: 16, line: 24, weight: 600, use: 'Dialog title, group' },
  { name: 'body-lg', size: 16, line: 24, weight: 400, use: 'Lead paragraphs' },
  { name: 'body', size: 14, line: 20, weight: 400, use: 'Default UI text' },
  {
    name: 'small',
    size: 13,
    line: 18,
    weight: 400,
    use: 'Labels, table cells',
  },
  {
    name: 'caption',
    size: 12,
    line: 16,
    weight: 400,
    use: 'Meta, helper text',
  },
  {
    name: 'overline',
    size: 11,
    line: 16,
    weight: 600,
    use: 'Section labels (caps)',
  },
] as const;

export const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;
export const radii = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export const shadows = ['xs', 'sm', 'md', 'lg'] as const;
