# Shop Admin — plan

A sellable back-office theme for the **shop** headless commerce API (`../shop`), built with
Next.js 16 (App Router, React 19, TypeScript strict) and Tailwind CSS 4. Buyers deploy it in front of
their shop API, rebrand it with tokens, and extend it with their own screens.

## 1. Goals

- **Complete back office** for every shop admin module: catalog, pricing & tax, inventory, orders &
  payments, customers, marketing & loyalty, CMS & merchandising, search, system.
- **Market-ready theme:** a documented design system (`docs/STYLE-GUIDE.md`, live at
  `/style-guide`), light/dark modes, accent presets, responsive down to 360 px, WCAG 2.2 AA,
  Lighthouse ≥ 95 (performance, accessibility, best practices), docs for buyers and developers,
  changelog, licence.
- **Extensible:** navigation, dashboard widgets, settings pages and feature modules are registered,
  not hard-coded; branding and tokens live in `theme.config.ts` and `src/theme`.
- **Secure by design:** the browser never sees API tokens. All calls go through the Next.js
  **API gateway** (backend-for-frontend), which holds the session in an encrypted httpOnly cookie,
  refreshes tokens, enforces same-origin requests and forwards only the admin API.

## 2. Architecture

```
Browser ──(cookie: encrypted session)──► Next.js (shop-admin)
   │                                      ├─ proxy.ts        session refresh (rotating refresh tokens), auth redirects
   │                                      ├─ Server Components → src/server/api.ts (typed client) ──► shop /api/v1/admin/*
   └─ fetch('/api/gw/…')  ───────────────►├─ app/api/gw/[...path]  API gateway (same-origin, CSRF header) ──► shop /api/v1/admin/*
                                          └─ Server Actions   login, logout, mutations
```

- **Types** are generated from the shop OpenAPI document (`npm run api:types` reads
  `../shop/openapi/shop-api.json`).
- **Session:** JWE (A256GCM, `SESSION_SECRET`) with the access token, refresh token and expiries.
  Refreshes happen only in `proxy.ts` (the one place that can both rewrite the request and set the
  cookie), deduplicated per refresh token, so parallel requests never replay a single-use token.
- **Permissions:** `GET /admin/auth/me` drives navigation and page guards (`requirePermission`).
- **Structure:** `src/app` (routes) · `src/components/ui` (design system) · `src/components/shell`
  (layout) · `src/features/<area>` (screens, registered in `src/features/registry.ts`) ·
  `src/server` (session, API client, gateway) · `src/theme` (tokens, presets) · `src/i18n`.

## 3. Delivery plan

| Phase                                | Scope                                                                                                                                                                                                                                                                                                                                   | Done when                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **0. Foundation**                    | Next 16 app, design tokens + style guide (doc and `/style-guide` page), UI kit, theming (light/dark, presets), API gateway + session + login/logout, app shell (sidebar, header, user menu, breadcrumbs), registry for navigation, dashboard with live KPIs and sales chart (backend `reports` endpoint), i18n scaffold (en, vi), tests | Sign in against a live shop API, see the dashboard with real data, browse the style guide; gateway and session covered by tests |
| **1. Catalog**                       | Products (list, filters, create/edit for every type, variants, bundles, images, store overrides, relations), categories tree (drag & drop), attributes & sets, media library                                                                                                                                                            | A product of each type can be created and edited end to end                                                                     |
| **2. Pricing & inventory**           | Price books & entries, exchange rates, price preview, tax classes/zones/rates, sources, stock, movements, reservations                                                                                                                                                                                                                  | Prices and stock of a product managed without the API                                                                           |
| **3. Orders & payments**             | Orders (list, detail, timeline, shipments, refunds, notes, cancel), payments, providers & methods, shipping methods                                                                                                                                                                                                                     | An order is shipped and refunded from the UI                                                                                    |
| **4. Customers, marketing, loyalty** | Customers & groups, campaigns, promotions (rule builder), coupons, loyalty programs, tiers, ledgers                                                                                                                                                                                                                                     | A campaign with a coupon is built and published from the UI                                                                     |
| **5. Content & storefront**          | Pages, posts, blocks, menus, banners, sliders, schedules, URL rewrites, search settings, websites/stores/locales/currencies                                                                                                                                                                                                             | A store is configured and its content published on schedule                                                                     |
| **6. System**                        | Admin users, roles, API keys, audit log, jobs & executions, imports/exports, webhooks, settings                                                                                                                                                                                                                                         | An import runs and a webhook is configured from the UI                                                                          |
| **7. Market readiness**              | Accent presets, buyer docs site, demo mode, a11y audit, Lighthouse budgets, Playwright suite, packaging, licence, changelog                                                                                                                                                                                                             | Release candidate passes the checklist in `docs/RELEASE-CHECKLIST.md`                                                           |

## 4. Status

**Phases 0–7 — done (2026-10-06). Release candidate `1.0.0-rc.1` passes `docs/RELEASE-CHECKLIST.md`**
(record at the end of that file). Before publishing: fill in the `LICENSE` placeholders, take the
listing screenshots and bump to `1.0.0`.

Phase 7 delivered:

- **Theme:** accent presets teal, amber and violet (six in all), with `fg-subtle` darkened to
  `#6b6b69` so footnotes and search placeholders pass AA on every surface. Option labels
  (`Medium / Black`) replace codes in variant search and bundle choosers.
- **Demo mode:** `DEMO_MODE`, `DEMO_EMAIL`, `DEMO_PASSWORD`, giving a banner, prefilled demo
  sign-in, and changes refused in both the gateway and the Server Actions.
- **Packaging:**
  - a non-root Docker image with a healthcheck, plus `docker-compose.example.yml`
  - standalone `npm run start`
  - `npm run package`, which builds the buyer archive from an allow-list
  - the commercial `LICENSE`, `CHANGELOG.md` and `THIRD-PARTY-NOTICES.md`
  - the server stops at start-up when its configuration is invalid
  - sharp/libvips left out of the build
- **Quality:**
  - a Playwright suite covering every screen at 1440 / 1280 / 768 / 360 px, with axe WCAG 2.2 AA
    checks, behaviour specs and a demo spec
  - Lighthouse at 95+ with budgets, scored on the median of 3 runs
- **Fixes the suite found:**
  - sub-navigation and grids overflowing on phones
  - sheets and dialogs not returning focus
  - unnamed comboboxes
  - low-contrast dashboard period pills
  - card headings skipping a level
  - the logo link's name not matching its visible text
  - a lockfile npm 10 rejected
  - `npm run check` failing on a fresh checkout (route types now generated first)
  - the expired-session redirect pointing at the server's bind address (`0.0.0.0`) instead of the
    browser's host
  - Lighthouse reports embedding the session cookie
- **Docs** (`docs/`): index, install & configure, deploy & upgrade, troubleshooting, testing and the
  release checklist.

Phase 6 delivered: admin users (create with a policy-checked or generated password, roles, disable,
password reset, delete; self-protection), roles with a permission grid by area that only offers
what the signed-in admin may grant, API keys (scoped, optional expiry, shown once, revocable), the
audit log (filters by action prefix, entity, person and dates; field-level before / after; CSV
export), jobs — live activity with progress, row problems, downloads, stop and run again; CSV
imports with templates per type; exports and maintenance tools with typed parameter forms (JSON
for job types the admin doesn't know); scheduled jobs with cron presets and time zones — outgoing
webhooks (event groups, signing secret shown once, test ping, delivery log with payload / response
and resend, secret rotation, auto-disable notice), and a settings hub open to every admin (account,
password change, appearance, configuration links filtered by permission). Verified live: a stock
CSV import ran from the UI (1 updated, 1 unchanged, 1 row problem reported) and a webhook created
from the UI received its signed test ping plus the import's `inventory.changed` and
`job-execution.succeeded` events.

Shop API changes for Phase 6: the last untyped fields (`JobDto.nextRunAt`, `CreateJobDto.cron`,
`ExecutionDto.outputName`, `AdminUserDto.lockedUntil`) are typed, and the app e2e suite now fails
on any bare `object` property in the spec (`src/common/openapi/schema-lint.ts`).

Admin guard added: `src/client-boundary.test.ts` fails when a server file imports anything but
components from a `'use client'` module (the cause of two runtime crashes in earlier phases).

Phase 5 delivered: store setup — websites and stores (URL, country, languages and currencies with
defaults, tax display), languages with fallbacks, currencies, and per-website search (engine choice
with encrypted connection, index prefix, synonyms, stop words, index status, rebuild); content —
pages and blog posts (per-language title, URL, HTML editor with toolbar, block embeds, images from
the media library and a sandboxed preview, SEO fields with a search-result preview, store scope,
layout, featured image, tags), blocks (embed code, placements on pages, posts, categories and
products), menus (tree editor: reorder, nest, links to categories / pages / posts / products / URLs,
per-language labels), banners (slot, artwork per language, live preview), sliders (slides with
order, captions, autoplay), the publishing schedule across content and promotions, and URLs &
redirects (system rewrites, custom 301 / 302, rebuild). Every publishable item shares the
publishing panel (now, scheduled start / end). Verified live: a new store was configured and a page
for it went live by itself at its scheduled time (visible on that store only).

Shop API changes for Phase 5: schedules carry `targetLabel` (title, name or identifier of the
content); `UpdateSlideDto` no longer documents create defaults (omitted fields stay unchanged); a
race in the menu e2e test fixed.

Phase 4 delivered: customers (list with search / status / group / website filters, create with a
policy-checked or generated password, profile editing, address book, disable / enable, sign out
everywhere, GDPR delete, recent orders, points summary and ledger with manual adjustments) and
customer groups with tax classes; campaigns (budget, publishing now or scheduled, their
promotions); promotions with a rule builder (conditions: subtotal, item quantity, customer group;
discounts: percent / fixed off items or cart, buy X get Y, free shipping; item filters by category,
product or SKU; amounts per selling currency), coupon-only mode with single codes, background batch
generation, enable / disable and CSV export, limits, per-locale checkout labels and publishing that
shows when a promotion waits for its campaign; a cart simulator on the shop's promotion engine with
prices filled from the price books; loyalty programs per website (earn rate, point value,
redemption, expiry, tier window) with tiers, and a members list. A shared publishing panel
(`src/features/publishing`) is ready for Phase 5 content. Verified live: a campaign with a
coupon-only promotion was built, published and applied in the simulator from the UI.

Shop API changes for Phase 4: promotion `conditions` / `actions` typed in OpenAPI (one schema per
rule, discriminated by `type`); `ids` filter on the admin products list (picker labels); loyalty
accounts list returns the customer's e-mail and name and accepts `search`; database sessions are
pinned to UTC (the Prisma pg adapter sends timestamps without an offset, so a Postgres server in
another zone stored every Prisma-written time shifted — rows written before the fix on such a
server keep the shift).

Phase 3 delivered: an orders list (search, order / payment / fulfilment status and period filters)
and an order detail page with items, totals, payments, refunds, shipments, a timeline with internal
notes and a customer / address / discount / document sidebar. Actions: ship all or part of the open
quantity with carrier and tracking, mark a shipment delivered, mark cash on delivery as collected,
refund by line items (with restock) or by amount (idempotency key per dialog) and cancel. Payments
cover providers (write-only credentials, replaced as a set), per-store methods (titles, countries,
min / max amounts) and the webhook event log with reconcile; shipping covers per-store methods with
rates and free-over thresholds. Verified live: an order was shipped in two parcels, delivered, paid
and partly refunded from the UI.

Shop API changes for Phase 3: payments `TransactionDto` renamed `PaymentTransactionDto` (schema name
clash with loyalty, now guarded by a unit test); amount maps typed as integer maps; order list
filters `paymentStatus`, `fulfillmentStatus`, `placedFrom`, `placedTo`; refund history messages
show formatted money.

Phase 2 delivered: price books (scope by website / store / customer group, priority, validity window,
net or gross) with per-variant quantity tiers and compare-at prices; currencies and exchange rates;
a price preview that explains the base book and tiers for any store, group, quantity and moment;
tax classes, zones with regions (country / subdivision / postcode patterns), rates (compound,
priority, validity) and a tax calculator; inventory stock with receive / remove / count (optimistic
versioning), the movement ledger, sources with per-website priority, reservation lookup with release
and convert; and a product "Pricing & stock" tab (price grid across books, stock grid across
sources, recent movements).

Shop API changes for Phase 2: `GET /admin/variants` (search by SKU or product name, for pickers);
`productId` and SKU search filters on price entries, stock and movements; movements carry the SKU.

Notes: price books rank by **lowest priority number first**, then specificity; the first book sets
the base price and each quantity tier comes from the cheapest matching book.

Carried forward:

- Webhooks and payment-provider credentials need `APP_ENCRYPTION_KEY` in the shop's environment
  (`openssl rand -hex 32`); without it the admin shows the API's message when saving them.
- Customer language can be set but not cleared back to the store default (the API has no null).
- Images inserted into HTML content use the media URL; set `MEDIA_PUBLIC_BASE_URL` in the shop so
  those links are permanent CDN URLs rather than short-lived signed links.
- Token refresh is deduplicated per instance; multi-instance deployments need sticky sessions
  (`docs/DEPLOY.md`). A shared lock (Redis) is a possible 1.x addition.
- Store overrides cover status and visibility; per-store attribute values are not in the UI yet.
