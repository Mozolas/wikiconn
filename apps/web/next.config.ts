import { fileURLToPath } from 'node:url';

import { DEFAULT_LOCALE } from './src/i18n/config';

import type { NextConfig } from 'next';

// Defense-in-depth headers. A strict script-src CSP is intentionally omitted
// because it requires per-request nonces via middleware in the App Router;
// the rendered article HTML is already allowlist-sanitized server-side.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  },
];

// The dev server answers /_next/* with 403 when the request comes from a host
// other than localhost, which is exactly what happens when you open the game on
// a phone to get a second player. List those hostnames (no scheme, no port) in
// NEXT_DEV_ALLOWED_ORIGINS, e.g. `192.168.1.20,my-laptop.local`.
const devOrigins = (process.env['NEXT_DEV_ALLOWED_ORIGINS'] ?? '')
  .split(',')
  .map((entry) => entry.trim())
  .filter((entry) => entry.length > 0);

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wikiconn/shared'],
  // Ships a self-contained server with only the traced dependencies, which is
  // what the production image runs. Tracing has to start at the workspace root
  // or it would miss @wikiconn/shared.
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  ...(devOrigins.length > 0 ? { allowedDevOrigins: devOrigins } : {}),
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // The routes live under a [lang] segment, but the default locale is served
  // from the root: the invite links already in circulation point at /room/CODE,
  // and the home page is already indexed at /. Rewriting keeps those addresses
  // while the tree underneath stays uniform.
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: `/${DEFAULT_LOCALE}` },
        { source: '/room/:path*', destination: `/${DEFAULT_LOCALE}/room/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  // ...which would otherwise leave the same page reachable at two addresses.
  async redirects() {
    return [
      { source: `/${DEFAULT_LOCALE}`, destination: '/', permanent: true },
      { source: `/${DEFAULT_LOCALE}/:path*`, destination: '/:path*', permanent: true },
    ];
  },
};

export default config;
