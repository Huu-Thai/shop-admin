import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { themeConfig } from './config';
import { contrast, over, parseColor } from './contrast';
import { contrastPairs } from './tokens';

/** Minimal parser for tokens.css: custom properties per selector block. */
function blocks(css: string): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    const vars: Record<string, string> = {};
    for (const d of m[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
    out.set(selector, { ...(out.get(selector) ?? {}), ...vars });
  }
  return out;
}

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const b = blocks(css);

function theme(mode: 'light' | 'dark', preset: string): Record<string, string> {
  const layers = [
    b.get(':root'),
    mode === 'dark' ? b.get('.dark') : undefined,
    b.get(`[data-theme='${preset}']`),
    mode === 'dark' ? b.get(`.dark[data-theme='${preset}']`) : undefined,
  ];
  return Object.assign({}, ...layers.filter(Boolean));
}

function resolve(vars: Record<string, string>, name: string, depth = 0): string {
  const v = vars[name];
  if (v === undefined) throw new Error(`--${name} is not defined`);
  const ref = /^var\(--([\w-]+)\)$/.exec(v);
  if (ref && depth < 10) return resolve(vars, ref[1], depth + 1);
  return v;
}

const cases = (['light', 'dark'] as const).flatMap((mode) =>
  themeConfig.presets.flatMap((p) =>
    contrastPairs.map((pair) => ({ mode, preset: p.id, ...pair })),
  ),
);

describe('design tokens meet WCAG 2.2 AA', () => {
  it.each(cases)('$mode/$preset: --$fg on --$bg ≥ $min', ({ mode, preset, fg, bg, min }) => {
    const vars = theme(mode, preset);
    const surface = parseColor(resolve(vars, 'surface'))!;
    const back = over(parseColor(resolve(vars, bg))!, surface);
    const fore = over(parseColor(resolve(vars, fg))!, back);
    expect(contrast(fore, back)).toBeGreaterThanOrEqual(min);
  });

  it('every preset in theme.config exists in tokens.css', () => {
    for (const p of themeConfig.presets)
      if (p.id !== 'lime') expect(b.has(`[data-theme='${p.id}']`)).toBe(true);
  });

  it('parses every colour syntax the browser may report', () => {
    expect(parseColor('#16a34a29')).toEqual([22, 163, 74, 0x29 / 255]);
    expect(parseColor('#fff8')).toEqual([255, 255, 255, 0x88 / 255]);
    expect(parseColor('rgb(22 163 74 / 0.16)')).toEqual([22, 163, 74, 0.16]);
    expect(parseColor('rgba(22, 163, 74, 16%)')).toEqual([22, 163, 74, 0.16]);
    expect(parseColor('var(--x)')).toBeNull();
  });

  it('computes contrast like WCAG', () => {
    expect(contrast(parseColor('#000')!, parseColor('#fff')!)).toBeCloseTo(21, 5);
    expect(contrast(parseColor('#191919')!, parseColor('#ffffff')!)).toBeCloseTo(17.58, 1);
  });
});
