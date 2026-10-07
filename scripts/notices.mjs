// Writes THIRD-PARTY-NOTICES.md from `license-checker-rseidelsohn --production --json` on stdin.
import { readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(0, 'utf8'));
const self = JSON.parse(readFileSync('package.json', 'utf8')).name;
const rows = Object.entries(data)
  .filter(([id]) => !id.startsWith(`${self}@`))
  .map(([id, v]) => {
    const at = id.lastIndexOf('@');
    return {
      name: id.slice(0, at),
      version: id.slice(at + 1),
      licence: [v.licenses].flat().join(' / '),
      repo: v.repository ?? '',
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
const lines = [
  '# Third-party notices',
  '',
  'Shop Admin ships with these open-source packages (production dependencies). Each keeps its own',
  'licence; the commercial licence in `LICENSE` does not change them. Notes:',
  '',
  '- `sharp` and `@img/sharp-libvips-*` (LGPL-3.0-or-later) are installed with Next.js as optional',
  '  dependencies. Shop Admin turns image optimisation off and leaves them out of the built server',
  '  and the Docker image (`next.config.ts`), so the shipped app does not include them.',
  '- `caniuse-lite` (CC-BY-4.0) — browser support data © caniuse.com contributors.',
  '',
  'Regenerate with `npm run notices`.',
  '',
  '| Package | Version | Licence | Repository |',
  '| --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.name} | ${r.version} | ${r.licence} | ${r.repo} |`),
  '',
];
writeFileSync('THIRD-PARTY-NOTICES.md', lines.join('\n'));
console.log(`${rows.length} packages listed.`);
