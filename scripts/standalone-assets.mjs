// Copies the static assets the standalone server needs next to it (Next.js leaves this to you):
// .next/static → .next/standalone/.next/static and public → .next/standalone/public.
import { cpSync, existsSync } from 'node:fs';

const out = '.next/standalone';
if (!existsSync(out)) {
  console.error('No .next/standalone — run next build first (output: "standalone").');
  process.exit(1);
}
cpSync('.next/static', `${out}/.next/static`, { recursive: true });
if (existsSync('public')) cpSync('public', `${out}/public`, { recursive: true });
console.log('Standalone assets copied.');
