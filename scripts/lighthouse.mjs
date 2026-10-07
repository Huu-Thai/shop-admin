// Lighthouse (desktop preset) on key screens against a running production build. Needs the
// signed-in session saved by the Playwright setup (npm run test:e2e first). Fails below the
// targets (performance, accessibility, best practices ≥ 95) or over the budgets in
// lighthouse-budget.json. Each page runs LH_RUNS times (3) and the median-performance run counts,
// as Lighthouse recommends for its run-to-run variance.
// Usage: E2E_BASE_URL=http://localhost:3000 node scripts/lighthouse.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { ReportGenerator } from 'lighthouse/report/generator/report-generator.js';
import desktop from 'lighthouse/core/config/desktop-config.js';

const base = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const MIN = Number(process.env.LH_MIN ?? 0.95);
const RUNS = Math.max(1, Number(process.env.LH_RUNS ?? 3));
const PAGES = [
  { path: '/login', auth: false },
  { path: '/', auth: true },
  { path: '/orders', auth: true },
  { path: '/products', auth: true },
  { path: '/customers', auth: true },
  { path: '/settings', auth: true },
];
const state = JSON.parse(readFileSync('e2e/.auth/admin.json', 'utf8'));
const cookie = state.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
const budgets = JSON.parse(readFileSync('lighthouse-budget.json', 'utf8'));

const chrome = await chromeLauncher.launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox'],
});
mkdirSync('lighthouse-report', { recursive: true });
const failures = [];
// Warm each page once so a freshly started server's first render doesn't count against it.
for (const p of PAGES)
  await fetch(`${base}${p.path}`, { headers: p.auth ? { Cookie: cookie } : {} }).catch(() => {});
try {
  for (const p of PAGES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++)
      runs.push(
        await lighthouse(
          `${base}${p.path}`,
          {
            port: chrome.port,
            onlyCategories: ['performance', 'accessibility', 'best-practices'],
            extraHeaders: p.auth ? { Cookie: cookie } : undefined,
            budgets,
          },
          desktop,
        ),
      );
    runs.sort((a, b) => a.lhr.categories.performance.score - b.lhr.categories.performance.score);
    const result = runs[Math.floor(runs.length / 2)];
    const { categories, audits } = result.lhr;
    const scores = Object.fromEntries(Object.entries(categories).map(([k, c]) => [k, c.score]));
    const overBudget = (audits['performance-budget']?.details?.items ?? [])
      .filter((i) => (i.sizeOverBudget ?? 0) > 0 || (i.countOverBudget ?? 0) > 0)
      .map((i) => i.label);
    const timing = (audits['timing-budget']?.details?.items ?? [])
      .filter((i) => (i.overBudget ?? 0) > 0)
      .map((i) => i.label);
    const name = p.path === '/' ? 'dashboard' : p.path.slice(1).replace(/\//g, '-');
    // Reports echo the run settings, session cookie included: drop it before writing.
    delete result.lhr.configSettings.extraHeaders;
    writeFileSync(`lighthouse-report/${name}.html`, ReportGenerator.generateReportHtml(result.lhr));
    writeFileSync(`lighthouse-report/${name}.json`, JSON.stringify(result.lhr, null, 2));
    const line = Object.entries(scores)
      .map(([k, v]) => `${k} ${Math.round(v * 100)}`)
      .join(' · ');
    console.log(
      `${p.path.padEnd(12)} ${line}${overBudget.length || timing.length ? ` · over budget: ${[...overBudget, ...timing].join(', ')}` : ''}`,
    );
    for (const [k, v] of Object.entries(scores))
      if (v < MIN) failures.push(`${p.path}: ${k} ${Math.round(v * 100)} < ${MIN * 100}`);
    for (const b of [...overBudget, ...timing]) failures.push(`${p.path}: over budget (${b})`);
  }
} finally {
  await chrome.kill();
}
if (failures.length) {
  console.error(`\nLighthouse targets missed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\nLighthouse: every page meets the targets. Reports in lighthouse-report/.');
