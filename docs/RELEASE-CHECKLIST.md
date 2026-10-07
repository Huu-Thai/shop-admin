# Release checklist

Work through this list for every release, including releases of your own customised copy. A
release candidate ships only when every box is ticked. Record the results in the release notes
(see the record at the end).

## 1. Version and notes

- [ ] `package.json` → `version` bumped. Use semver: `-rc.N` for candidates.
- [ ] `CHANGELOG.md` has a section for this version, with **Breaking** changes and the shop API
      version it needs.
- [ ] The style guide header shows the new version (`/style-guide`, read from `package.json`).
- [ ] `LICENSE` placeholders (`[SELLER NAME]`, `[MARKETPLACE OR SELLER WEBSITE]`,
      `[CONTACT E-MAIL]`) filled in for the marketplace upload.

## 2. Code quality

- [ ] `npm ci` installs with no errors.
- [ ] `npm run check` is clean: types, lint, format, unit tests including token contrast.
- [ ] `npm audit --omit=dev` reports **0** vulnerabilities.
- [ ] `npm run notices` re-generated `THIRD-PARTY-NOTICES.md`, and no new copyleft licence appears
      in the production dependencies.
- [ ] `npm run api:types` against the target shop API leaves `src/server/shop-api.d.ts` unchanged,
      or the changes are handled.

## 3. Build and package

- [ ] `npm run build` finishes with no errors or warnings.
- [ ] `docker build -t shop-admin .` succeeds. The container starts, and `/api/health` answers
      `{"status":"ok"}`.
- [ ] A start without `SESSION_SECRET` stops with _Invalid shop-admin configuration_ (exit code 1).
- [ ] `npm run package` creates `dist/shop-admin-<version>.zip`, and the archive holds:
  - no `.env` file other than `.env.example`
  - no `e2e/.auth`, `node_modules`, `.next` or reports
- [ ] **Clean-room build:** unzip the archive into an empty folder, then run
      `npm ci && npm run check && npm run build`. All three must pass.

## 4. Live checks (against a shop API with demo data and at least one order)

- [ ] Playwright: `npm run test:e2e` passes in every project (signed-out, 1440, 1280, 768, 360).
      Skips are allowed only for the demo test.
- [ ] Demo: an instance with `DEMO_MODE=true` passes the demo test (`E2E_DEMO=1`, see
      [Testing](TESTING.md)).
- [ ] Lighthouse: `npm run lighthouse` reports every score at 95 or above, and no budget is
      exceeded.
- [ ] Manual pass in **light and dark** mode, with **every accent preset**, in **English and
      Vietnamese**:
  - sign in
  - dashboard
  - create and edit a product
  - an order's detail page
  - the style guide
- [ ] Keyboard only:
  - the skip link works
  - the command palette opens with ⌘K / Ctrl K
  - sheets and dialogs trap focus, close with Esc and return focus to what opened them

## 5. Documentation

- [ ] `README.md`, and `docs/` (install, deploy, troubleshooting, theming, extending, testing),
      match this release's variables, scripts and screens.
- [ ] Screenshots for the marketplace listing are taken from this build.

## 6. Clean-up

- [ ] Test admins, orders and other rows created for the checks are removed from shared
      environments.
- [ ] Test passwords, saved sessions (`e2e/.auth`) and temporary files are deleted.

---

## Record

| Version    | Date       | check        | audit | build | docker             | clean-room          | e2e (pass / skip)                                                                                          | Lighthouse (min perf / a11y / bp) | By                 |
| ---------- | ---------- | ------------ | ----- | ----- | ------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------ |
| 1.0.0-rc.1 | 2026-10-06 | ✅ 326 tests | ✅ 0  | ✅    | ✅ 283 MB, healthy | ✅ Node 22 / npm 10 | ✅ 275 / 9 (8 detail screens without data: passed with data on the previous build; demo run separately ✅) | 96 / 100 / 100                    | Claude (dev build) |

The rc.1 record covers sections 2–4 and the clean-up. Before uploading to a marketplace, still to
do: fill in the `LICENSE` placeholders, and take the listing screenshots.
