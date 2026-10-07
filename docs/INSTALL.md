# Install & configure

## Requirements

| What       | Version / notes                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| Node.js    | 22 or newer (`node -v`)                                                                                     |
| Shop API   | The release this theme was built against (see `CHANGELOG.md`), reachable from the server Shop Admin runs on |
| Admin user | An account on the shop API. The first one is created with the API's `admin:create` command                  |
| Browser    | Current Chrome, Edge, Firefox or Safari                                                                     |

The browser never calls the shop API directly. Only the Shop Admin server needs to reach it, so the
API can stay on a private network.

## 1. Install

```bash
cd shop-admin
npm ci
cp .env.example .env.local
```

## 2. Configure

Edit `.env.local` for development. In production, set these as environment variables.

| Variable         | Required | When read | Purpose                                                                                                                                                                                                            |
| ---------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SHOP_API_URL`   | yes      | runtime   | Base URL of the shop API, without `/api/v1`. For example `http://shop-api:3000`. Used only on the server.                                                                                                          |
| `SESSION_SECRET` | yes      | runtime   | At least 32 characters. Encrypts the session cookie. Generate it with `openssl rand -base64 48`. Changing it signs everyone out.                                                                                   |
| `MEDIA_ORIGINS`  | no       | **build** | Image origins that aren't `https`, comma-separated. For example `http://localhost:9200` for MinIO in development. Added to the Content Security Policy, so rebuild after changing it. `https` images already work. |
| `DEMO_MODE`      | no       | runtime   | `true` turns on the read-only demo. See [Demo mode](#demo-mode).                                                                                                                                                   |
| `DEMO_EMAIL`     | no       | runtime   | Demo sign-in e-mail. It is shown and prefilled on the sign-in page.                                                                                                                                                |
| `DEMO_PASSWORD`  | no       | runtime   | Demo sign-in password. It is shown and prefilled on the sign-in page.                                                                                                                                              |
| `PORT`           | no       | runtime   | Port to listen on (default `3000`).                                                                                                                                                                                |

The server checks these when it starts. If `SHOP_API_URL` or `SESSION_SECRET` is missing or
invalid, it stops with _Invalid shop-admin configuration_ and names the variable. In production it
also warns when `SHOP_API_URL` isn't `https`.

### Settings on the shop API side

These live in the **shop API's** environment, not in Shop Admin's. Several screens depend on them:

| Shop API variable                    | Needed for                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `APP_ENCRYPTION_KEY`                 | Saving webhooks and payment-provider credentials. Generate it with `openssl rand -hex 32`.       |
| `MEDIA_PUBLIC_BASE_URL`              | Permanent image URLs (CDN). Without it, images inserted in content use short-lived signed links. |
| `WEBHOOK_ALLOW_PRIVATE_TARGETS=true` | Only for testing webhooks against `localhost` or private-network receivers.                      |
| The worker process                   | Imports, exports, price indexing, search indexing and webhook delivery all run in the worker.    |

## 3. Run

```bash
npm run dev                     # development, http://localhost:3000
npm run dev -- -p 3001          # if the shop API already uses port 3000
```

For production builds, see [Deploy & upgrade](DEPLOY.md).

## 4. First sign-in

1. Create the first admin on the shop API:
   `ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' npm run admin:create` (run in the shop project).
2. Open Shop Admin and sign in.
3. Under **System → Users & roles → Roles**, create roles for your team and invite them. Each screen and
   button follows the role's permissions.
4. Under **Settings** and **Stores**, check websites, stores, locales and currencies.

## Brand it

Change the name, monogram, default accent preset and default colour mode in
`src/theme/config.ts`. Change colours in `src/theme/tokens.css`. [Theming](THEMING.md) walks
through both. Every admin can also pick an accent preset and a colour mode from the user menu.

## Demo mode

Use demo mode to show Shop Admin publicly without letting anyone change data.

1. In the shop API, create a role with only `…:read` permissions, and an admin user with that role.
2. Start Shop Admin with:

   ```bash
   DEMO_MODE=true
   DEMO_EMAIL=demo@example.com
   DEMO_PASSWORD=…
   ```

3. The sign-in page shows the demo credentials and prefills them. A banner on every page says the
   admin is read-only.

Demo mode refuses changes twice:

- Shop Admin's gateway and Server Actions refuse every change with _"This is a read-only demo"_.
- The read-only role means the shop API refuses them too.

The demo credentials are public, so never give the demo user write permissions.

## Languages

Shop Admin ships in English and Vietnamese. Each admin picks their language in the user menu. To
add a language, see [Extending → Translations](EXTENDING.md).
