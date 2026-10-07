import type { NextConfig } from 'next';
import pkg from './package.json' with { type: 'json' };

const dev = process.env.NODE_ENV !== 'production';
/**
 * Extra image origins for media previews when the bucket isn't served over https — e.g. MinIO's
 * signed links in development (`http://localhost:9200`). Comma-separated; read at build time.
 */
const mediaOrigins = (process.env.MEDIA_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter((o) => /^https?:\/\/[\w.-]+(:\d+)?$/.test(o));

/**
 * Content Security Policy: same-origin scripts and API calls (the gateway), images from any https
 * origin (product media on the shop's CDN/S3). Inline styles are needed by Radix positioning.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  ["img-src 'self' data: blob: https:", ...mediaOrigins].join(' '),
  "font-src 'self' data:",
  `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // An admin console is never indexed.
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  ...(dev
    ? []
    : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]),
];

const nextConfig: NextConfig = {
  // Shown in the style guide; only the version string is inlined, not package.json.
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
  poweredByHeader: false,
  reactStrictMode: true,
  output: 'standalone',
  // Media is served (and resized) by the shop's CDN; the admin never optimises images itself, so
  // sharp and its native libvips stay out of the standalone build (~45 MB, LGPL).
  images: { unoptimized: true },
  outputFileTracingExcludes: { '*': ['node_modules/sharp/**', 'node_modules/@img/**'] },
  experimental: {
    // proxy.ts buffers request bodies; past this size they are silently truncated. Media uploads go
    // through the gateway, so keep it above the shop's MEDIA_MAX_UPLOAD_MB (20 MB by default).
    proxyClientMaxBodySize: '25mb',
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
