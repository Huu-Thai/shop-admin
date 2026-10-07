// Builds the archive buyers download: dist/shop-admin-<version>.zip with one top-level folder.
// Allow-list only: source, docs, config and licence files. Never builds, dependencies, test output,
// saved sessions or environment files.
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const name = `shop-admin-${version}`;

const DIRS = ['src', 'test', 'e2e', 'public', 'scripts', 'docs'];
const FILES = [
  '.dockerignore',
  '.env.example',
  '.gitignore',
  '.prettierignore',
  '.prettierrc.json',
  'AGENTS.md',
  'CHANGELOG.md',
  'docker-compose.example.yml',
  'Dockerfile',
  'eslint.config.mjs',
  'LICENSE',
  'lighthouse-budget.json',
  'next.config.ts',
  'package-lock.json',
  'package.json',
  'playwright.config.ts',
  'postcss.config.mjs',
  'README.md',
  'THIRD-PARTY-NOTICES.md',
  'tsconfig.json',
  'vitest.config.mts',
];
// Inside the allowed folders, still leave these out.
const SKIP = [/(^|\/)\.DS_Store$/, /\.tmp\./, /^e2e\/\.auth(\/|$)/, /(^|\/)\.env(?!\.example$)/];

const files = [...FILES];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (SKIP.some((re) => re.test(path))) continue;
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
};
for (const d of DIRS) walk(d);

const missing = files.filter((f) => !existsSync(f));
if (missing.length) throw new Error(`Missing release files: ${missing.join(', ')}`);

const stage = join('dist', 'stage', name);
rmSync(join('dist', 'stage'), { recursive: true, force: true });
for (const f of files) cpSync(f, join(stage, f));

const zip = join('dist', `${name}.zip`);
mkdirSync('dist', { recursive: true });
rmSync(zip, { force: true });
execFileSync('zip', ['-qrX', relative(join('dist', 'stage'), zip), name], {
  cwd: join('dist', 'stage'),
});
rmSync(join('dist', 'stage'), { recursive: true, force: true });

const kb = Math.round(statSync(zip).size / 1024);
console.log(`${zip}: ${files.length} files, ${kb} KB`);
