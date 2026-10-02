import { prepareMedia } from './scripts/prepare-media.mjs';
import nextConstants from 'next/constants.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // isomorphic-dompurify (lib/sanitize.ts, used on every product & journal
  // detail page) pulls in jsdom for server-side HTML sanitisation. jsdom
  // reads its own default-stylesheet.css via a __dirname-relative fs read;
  // when webpack bundles it into the server build, that path resolves
  // relative to the app's cwd instead of jsdom's actual install location,
  // and every page that calls sanitizeHtml() 500s with an ENOENT (found via
  // a real `next build`, not caught by `next dev`). Excluding it from
  // bundling keeps it a plain Node require() at runtime, where __dirname is
  // correct. See DEPLOY_READINESS_PLAN.md #0.1.
  experimental: {
    serverComponentsExternalPackages: ["isomorphic-dompurify", "jsdom"],
  },
  images: {
    imageSizes: [16, 32, 48, 64, 80, 96, 128, 160, 256, 384],
    remotePatterns: [
      // Cloudinary CDN: product images uploaded via the admin panel
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/fonts/pinned/:file([a-f0-9]{16}-s(?:[.]p)?[.]woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/media/:version([a-f0-9]{16})/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default function configure(phase) {
  if (phase === nextConstants.PHASE_DEVELOPMENT_SERVER || phase === nextConstants.PHASE_PRODUCTION_BUILD) prepareMedia();
  return nextConfig;
}
