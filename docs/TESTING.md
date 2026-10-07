# Testing

Three layers, from fastest to slowest. Run all three before a release (see the
[release checklist](RELEASE-CHECKLIST.md)).

| Layer      | Command              | Needs                                      | Time   |
| ---------- | -------------------- | ------------------------------------------ | ------ |
| Unit       | `npm run check`      | Nothing                                    | ~30 s  |
| Browser    | `npm run test:e2e`   | A running admin, shop API, worker and data | ~3 min |
| Lighthouse | `npm run lighthouse` | The same, after the browser suite          | ~1 min |

## Unit tests (Vitest)

`npm run check` runs, in order:

1. the typecheck
2. ESLint
3. the Prettier check
4. `vitest run`, which runs `src/**/*.test.ts`

The tests cover:

- session encryption, token refresh and the proxy
- the gateway's path, header, CSRF and demo checks
- **WCAG contrast for every token pair**, in light and dark modes and for every accent preset
- i18n key parity between languages
- the client/server module boundary
- the pure logic behind forms and screens

Put new tests next to the code: `my-thing.test.ts`.

## Browser suite (Playwright)

### Prepare

1. Start the shop API and its worker. Load demo data so every screen has content: in the shop
   project, run `npm run seed:demo`. Place at least one order, so the order and customer detail
   screens are tested instead of skipped.
2. Create an admin whose role has **every permission**. Use a dedicated test account.
3. Build and start Shop Admin in production mode:
   `npm run build && SHOP_API_URL=… SESSION_SECRET=… PORT=3000 npm run start`.
4. Install the browser once: `npx playwright install chromium`.

### Run

```bash
E2E_BASE_URL=http://localhost:3000 \
E2E_EMAIL=e2e-admin@example.com E2E_PASSWORD='…' \
npm run test:e2e
```

Keep the password out of your shell history. For example, read it from a file:
`E2E_PASSWORD="$(cat ~/.e2e-pass)"`.

### What it checks

| Project        | Viewport   | Specs                                                                                              |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `setup`        | n/a        | Signs in once and saves the session to `e2e/.auth/admin.json` (git-ignored)                        |
| `signed-out`   | 1280 × 720 | Sign-in redirect and errors, axe on `/login` and `/style-guide`, security headers                  |
| `desktop-1440` | 1440 × 900 | Every screen, plus behaviour: dark mode, presets, Vietnamese, sheet focus, skip link, gateway CSRF |
| `laptop-1280`  | 1280 × 800 | Every screen                                                                                       |
| `tablet-768`   | 768 × 1024 | Every screen                                                                                       |
| `phone-360`    | 360 × 780  | Every screen                                                                                       |

On **every screen**, the suite checks that:

- the page loads (HTTP status below 400)
- it has exactly one `h1`
- no error boundary shows
- there is no horizontal scroll
- there are no uncaught errors
- at 1440 px, **axe** finds no serious or critical WCAG 2.2 AA violations

The list of screens is in `e2e/routes.ts`. Add every new page there. Detail pages (`:id`) take
the first row from a list endpoint, and are skipped when that list is empty.

The demo test runs only against an admin started with `DEMO_MODE=true`:

```bash
E2E_DEMO=1 E2E_BASE_URL=http://localhost:3002 … npx playwright test --project=setup --project=desktop-1440 -g demo
```

Failures save a screenshot and trace in `test-results/`. Open the HTML report with
`npx playwright show-report`.

The behaviour specs open forms but never save them. The suite only reads data.

## Lighthouse

After the browser suite, which leaves a signed-in session in `e2e/.auth/admin.json`, run:

```bash
E2E_BASE_URL=http://localhost:3000 npm run lighthouse
```

It audits `/login`, `/`, `/orders`, `/products`, `/customers` and `/settings` with the desktop
preset. Each page runs three times (`LH_RUNS`), and the run with the median performance score
counts, because single Lighthouse runs vary by a few points. It fails when:

- any **performance**, **accessibility** or **best-practices** score is below **95**, or
- a page breaks a budget in `lighthouse-budget.json`:
  - scripts ≤ 450 KB, CSS ≤ 60 KB, total ≤ 900 KB
  - no third-party requests
  - FCP ≤ 1.5 s, LCP ≤ 2 s, TTI ≤ 3 s, CLS ≤ 0.05

Reports are saved in `lighthouse-report/` (HTML and JSON).
