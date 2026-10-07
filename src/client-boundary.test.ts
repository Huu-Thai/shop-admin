import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Server Components can render components from a 'use client' module but can't use its other
 * exports (constants, functions): at runtime they are client references ("… is not a function").
 * This scans server files for value imports from client modules that aren't components.
 */
const ROOT = join(__dirname);
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory()
      ? files(p)
      : /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)
        ? [p]
        : [];
  });
const isClient = (src: string) => /^\s*['"]use client['"]/.test(src);
const resolve = (spec: string): string | null => {
  const base = spec.startsWith('@/') ? join(ROOT, spec.slice(2)) : null;
  if (!base) return null;
  for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts'])
    if (existsSync(base + ext)) return base + ext;
  return null;
};
/** Components are PascalCase (not ALL_CAPS constants). */
const isComponent = (name: string) => /^[A-Z][a-z0-9]/.test(name);

describe('client / server boundary', () => {
  it('server files import only components from client modules', () => {
    const problems: string[] = [];
    for (const file of [...files(join(ROOT, 'app')), ...files(join(ROOT, 'server'))]) {
      const src = readFileSync(file, 'utf8');
      if (isClient(src)) continue;
      for (const m of src.matchAll(/^import\s+(?!type\b)\{([^}]+)\}\s+from\s+'(@\/[^']+)'/gm)) {
        const target = resolve(m[2]);
        if (!target || !isClient(readFileSync(target, 'utf8'))) continue;
        for (const raw of m[1].split(',')) {
          const name = raw.trim();
          if (!name || name.startsWith('type ')) continue;
          if (!isComponent(name))
            problems.push(`${file.slice(ROOT.length + 1)}: ${name} from ${m[2]}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
