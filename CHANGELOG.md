# Changelog

All notable changes to Shop Admin. Versions follow [Semantic Versioning](https://semver.org/);
the shop API it talks to is versioned separately (`/api/v1`).

## 1.0.0 — 2026-10-06

First release candidate.

### Added

- **Foundation:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4; the Ink
  design system (base `#191919`) with light and dark modes and six WCAG 2.2 AA accent presets
  (lime, cobalt, coral, teal, amber, violet); live style guide at `/style-guide`; English and
  Vietnamese; API gateway (backend-for-frontend) with an encrypted session cookie, token refresh
  and CSRF checks; navigation registry and extension points.
- **Catalog:** products of every type (variants, bundles, gift cards, images, store overrides,
  relations), categories tree with drag and drop, attributes and sets, media library.
- **Pricing and inventory:** price books with tiers, exchange rates, price preview, tax classes,
  zones and rates with a calculator, stock, movements, sources, reservations.
- **Orders and payments:** orders with shipments, refunds, notes and cancellation; payment
  providers and methods; shipping methods.
- **Customers, marketing and loyalty:** customers and groups, campaigns, promotions with a rule
  builder, coupons (single and generated), a cart simulator, loyalty programs, tiers and ledgers.
- **Content and storefront:** websites, stores, languages, currencies, search engines; pages,
  posts, blocks, menus, banners, sliders with an HTML editor and scheduled publishing; URLs and
  redirects.
- **System:** admin users, roles and API keys; audit log; jobs with CSV imports, exports and
  schedules; outgoing webhooks; settings hub.
- **Release:** demo mode (`DEMO_MODE`), Docker image, standalone server start, Playwright suite
  with accessibility checks and viewport coverage, Lighthouse budgets, buyer documentation,
  release checklist, `npm run package` for the distributable archive; the server stops at start
  when its configuration is invalid.

### Requires

- Node.js 22+ and the shop API (v1). Webhooks and payment-provider credentials need the shop's
  `APP_ENCRYPTION_KEY`.
