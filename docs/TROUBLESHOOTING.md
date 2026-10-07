# Troubleshooting

## The server won't start

**`Invalid shop-admin configuration: - SHOP_API_URL … - SESSION_SECRET …`**
A required variable is missing or invalid, and the server stops with exit code 1. To fix it:

- Set `SHOP_API_URL` to a full `http(s)://` URL, without `/api/v1`.
- Set `SESSION_SECRET` to at least 32 characters (`openssl rand -base64 48`).

See [Install & configure](INSTALL.md#2-configure).

**`SHOP_API_URL is not https: tokens travel in clear text`**
This is a warning, not an error. It's fine on a private network or in Docker. Over the internet,
use `https`.

## Signing in

**After signing in I'm sent back to the sign-in page.**
In production the session cookie is `Secure`, so browsers only keep it over HTTPS (or on
`localhost`). To fix it, either:

- serve Shop Admin over HTTPS, or
- test a production build on `http://localhost`.

**"Your session has ended; sign in again" appears often.**
The likely causes:

- `SESSION_SECRET` changed. Every restart with a new secret signs everyone out.
- Several instances run without sticky sessions. See
  [Deploy → Running several instances](DEPLOY.md#running-several-instances).
- The shop API revoked the session: the password was changed, or an admin signed the user out.

**Sign-in says "The shop API is unreachable".**
Shop Admin's _server_ can't reach `SHOP_API_URL`, so check it from where Shop Admin runs. For
example, `curl $SHOP_API_URL/api/v1/health` inside the container. In Docker, `localhost` is the
container itself, so use the service name (`http://shop-api:3000`).

## Screens and actions

**A menu item or button is missing.**
Screens and buttons follow the role's permissions; a missing `…:read` hides the screen. Check the
admin's role under **System → Users & roles → Roles**.

**"Mutations need the x-shop-admin header" or "Cross-site request refused".**
The gateway only accepts changes from Shop Admin's own pages. These messages mean a proxy changed
the `Host` / `X-Forwarded-Host` header, or a script outside Shop Admin called `/api/gw`. Forward
the original host, as described in [Deploy → HTTPS](DEPLOY.md#https-and-the-reverse-proxy).

**"This is a read-only demo: changes are switched off."**
`DEMO_MODE` is on. Unset it, or set `DEMO_MODE=false`, and restart.

**Saving a webhook or payment provider fails with "APP_ENCRYPTION_KEY is not configured".**
Set `APP_ENCRYPTION_KEY` in the **shop API's** environment (`openssl rand -hex 32`) and restart the
API and the worker. Keep the key: if you change it, stored credentials can no longer be read and
must be entered again.

**Webhook deliveries to `localhost` or a private IP are refused.**
The shop blocks private targets by default. For testing only, set
`WEBHOOK_ALLOW_PRIVATE_TARGETS=true` in the shop API.

**Imports, exports or price changes stay "queued".**
The shop **worker** isn't running. Start it next to the API.

**Images in pages or posts break after a while.**
Without `MEDIA_PUBLIC_BASE_URL` in the shop, media URLs are signed links that expire. Set it to
your CDN or public bucket URL. Then re-insert images saved while it was missing.

**Image previews are blank in development (MinIO).**
The Content Security Policy only allows `https` images. Build with
`MEDIA_ORIGINS=http://localhost:9200 npm run build`; it is read at **build** time.

**Uploads over 20 MB fail.**
The shop API limits uploads to 20 MB by default (`MEDIA_MAX_UPLOAD_MB`), and Shop Admin passes
bodies up to 25 MB. Also check your reverse proxy's limit (`client_max_body_size`). To allow more
than 25 MB, raise `experimental.proxyClientMaxBodySize` in `next.config.ts` and rebuild.

## Appearance

**My colour change broke contrast.**
Run `npm test`. `src/theme/tokens.test.ts` lists every text and background pair below WCAG AA, in
both modes and for every preset. Then check `/style-guide` → Contrast.

**Fonts, logo or name didn't change.**
These are build-time values: rebuild after editing `src/theme/config.ts` or `src/app/layout.tsx`.

## Still stuck?

Gather these and contact support:

- the version from `package.json`
- the shop API version
- the browser
- the exact message
- the matching lines from the Shop Admin server log
