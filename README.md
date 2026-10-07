# Shop Admin

A back-office theme for the **shop** headless commerce API, built with Next.js 16 (App Router,
React 19), TypeScript and Tailwind CSS 4. It uses the **Ink** design system: base colour `#191919`
and a lime accent, light and dark modes, six accent presets (lime, cobalt, coral, teal, amber, violet), and WCAG 2.2 AA contrast checked in
tests.

- **Documentation:** [`docs/`](docs/README.md): install, deploy, troubleshooting, theming,
  extending, testing, release checklist
- **Live style guide:** `/style-guide` (public), written spec in [`docs/STYLE-GUIDE.md`](docs/STYLE-GUIDE.md)
- **What's new:** [`CHANGELOG.md`](CHANGELOG.md)

## Requirements

- Node.js 22 or newer
- A running shop API (`../shop`, `docker compose up` there) and an admin account

## Quick start

```bash
cp .env.example .env.local      # set SHOP_API_URL and SESSION_SECRET
npm install
npm run dev                     # http://localhost:3001 if the API uses 3000: npm run dev -- -p 3001
```

Sign in with a shop admin user. What each admin sees follows their role's permissions. The full
setup, including the shop API settings some screens need, is in [`docs/INSTALL.md`](docs/INSTALL.md).

## Architecture

The browser never talks to the shop API and never sees a token.

| Piece             | Where                      | What it does                                                                                                                                               |
| ----------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session           | `src/server/session*.ts`   | Encrypted httpOnly cookie (JWE, A256GCM) holding the token pair                                                                                            |
| Proxy             | `src/proxy.ts`             | Redirects to sign in; refreshes tokens before they expire (single-use refresh tokens, deduplicated)                                                        |
| Server API client | `src/server/api.ts`        | Typed client (`openapi-fetch`) for Server Components and Actions                                                                                           |
| API gateway       | `src/app/api/gw/[...path]` | `fetch('/api/gw/orders')` from client code → `SHOP_API_URL/api/v1/admin/orders`; same-origin and CSRF-header checks, header allow-lists, no path traversal |
| Types             | `src/server/shop-api.d.ts` | Generated from the shop OpenAPI document: `npm run api:types`                                                                                              |

Client components call the gateway with `gw()` from `src/lib/gateway-client.ts`.

## Scripts

| Script                            |                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start` | Develop, build (standalone output with its static files), serve the build                   |
| `npm run check`                   | Typecheck, lint, format check and unit tests                                                |
| `npm test`                        | Unit tests (Vitest): session, proxy, gateway, token contrast, i18n, UI logic                |
| `npm run test:e2e`                | Browser suite (Playwright, 4 viewports, axe) against a running admin: see `docs/TESTING.md` |
| `npm run lighthouse`              | Lighthouse scores and budgets for key pages                                                 |
| `npm run api:types`               | Regenerate API types from `../shop/openapi/shop-api.json` (or `SHOP_OPENAPI=…`)             |
| `npm run notices`                 | Regenerate `THIRD-PARTY-NOTICES.md`                                                         |
| `npm run package`                 | Build the distributable `dist/shop-admin-<version>.zip`                                     |

## Configuration

| Variable                                   | Required |                                                                                                                                                                 |
| ------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SHOP_API_URL`                             | yes      | Base URL of the shop API (server-side only)                                                                                                                     |
| `SESSION_SECRET`                           | yes      | ≥ 32 characters; encrypts the session cookie                                                                                                                    |
| `MEDIA_ORIGINS`                            | no       | Image origins that aren't `https` (e.g. MinIO in development, `http://localhost:9200`), comma-separated, **read at build time** for the Content Security Policy |
| `DEMO_MODE`, `DEMO_EMAIL`, `DEMO_PASSWORD` | no       | Read-only public demo: see `docs/INSTALL.md#demo-mode`                                                                                                          |

Media uploads stream through the gateway; request bodies up to 25 MB pass `proxy.ts`
(`experimental.proxyClientMaxBodySize` in `next.config.ts`), above the shop's default 20 MB limit.
Image previews use the URLs the shop API returns (CDN via `MEDIA_PUBLIC_BASE_URL`, or signed links).

## Deployment

Docker (`Dockerfile`, `docker-compose.example.yml`) or plain Node (`npm run build && npm run start`),
behind HTTPS. Security headers (CSP, HSTS, frame denial) are set in `next.config.ts`. Several
instances need sticky sessions. Everything is in [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Licence

Commercial theme licence: Regular and Extended terms in [`LICENSE`](LICENSE). Open-source components
are listed in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
