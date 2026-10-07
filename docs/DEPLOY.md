# Deploy & upgrade

Shop Admin is a single Node.js server, built by Next.js's `standalone` output. It keeps no state on
disk: sessions live in an encrypted cookie. Run it behind HTTPS, next to the shop API.

## Option A: Docker

```bash
docker build -t shop-admin .
# Image origins that aren't https (rare in production) are baked in at build time:
# docker build -t shop-admin --build-arg MEDIA_ORIGINS=http://minio.internal:9000 .

docker run -d --name shop-admin -p 3000:3000 \
  -e SHOP_API_URL=http://shop-api:3000 \
  -e SESSION_SECRET="$(openssl rand -base64 48)" \
  shop-admin
```

`SESSION_SECRET` must stay the same across restarts and on every instance. Store it in your
secret manager; don't generate a new one at each start as the short example above does.

The image:

- runs as a non-root user
- listens on port `3000`
- reports its health at `GET /api/health`, which Docker's `HEALTHCHECK` uses

`docker-compose.example.yml` shows Shop Admin next to an existing shop API.

## Option B: Node.js

```bash
npm ci
npm run build                           # .next/standalone with its static files copied in
SHOP_API_URL=… SESSION_SECRET=… PORT=3000 npm run start
```

To deploy without the source, copy `.next/standalone` to the server and run
`node server.js` there. Use a process manager (systemd, PM2) to restart it on failure.

## HTTPS and the reverse proxy

Put Shop Admin behind a TLS-terminating proxy (nginx, Caddy, a load balancer):

- Forward `Host`, or `X-Forwarded-Host`. The gateway's same-origin check compares it with the
  browser's `Origin`.
- Allow request bodies of at least **25 MB** for media uploads. For nginx:
  `client_max_body_size 25m;`.
- Shop Admin sends HSTS, a Content Security Policy and frame denial itself
  (`next.config.ts`). Don't strip these headers.

Example for nginx:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto https;
  client_max_body_size 25m;
}
```

## Running several instances

Sessions are cookies, so any instance can serve any admin. Token **refreshes**, though, are
de-duplicated per instance. If two instances refresh one admin's token at the same moment, the
shop treats the second as reuse and ends that session; the admin signs in again. To avoid this,
turn on **sticky sessions** at the load balancer, using its own affinity cookie or an IP hash. One
instance is plenty for most teams.

## Shop API checklist

In the shop API's environment:

- `APP_ENCRYPTION_KEY` (webhooks and payment credentials)
- `MEDIA_PUBLIC_BASE_URL` (permanent image links)

Also run the shop **worker** next to the API. It handles imports, exports, indexing and webhook
delivery. See [Install & configure](INSTALL.md#settings-on-the-shop-api-side).

## Upgrade

1. Read `CHANGELOG.md` for the new version. Look especially for **Breaking** notes and the shop
   API version it needs.
2. Upgrade the shop API first, when the changelog says so.
3. Merge your changes into the new release:
   - Keep your changes in the places [Extending](EXTENDING.md) and [Theming](THEMING.md) describe:
     `src/theme/*`, your own `src/features/<area>`, and registry entries. That keeps a merge small.
   - If you track the theme in git, add the release as a vendor branch and merge it.
4. Run `npm ci && npm run check`, then the [release checklist](RELEASE-CHECKLIST.md).
5. Deploy. Sessions survive the upgrade as long as `SESSION_SECRET` is unchanged.

To roll back, deploy the previous image or build. Shop Admin has no database of its own.
