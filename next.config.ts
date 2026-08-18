import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';

// `@scalar/ui` and `@scalar/sdk` are consumed with pnpm `link:` from sibling repositories until they
// are published. Turbopack only resolves files under its root, so point it at the parent folder.
// Once the packages come from npm this override goes away.
const parentDir = fileURLToPath(new URL('..', import.meta.url));

// The desktop and mobile shells bundle the app as files rather than serving it, so the same
// source builds two ways. Set SCALAR_STATIC_EXPORT=1 for a folder of static assets.
const staticExport = process.env.SCALAR_STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@scalar/ui', '@scalar/sdk'],
  turbopack: {
    root: parentDir,
  },
  ...(staticExport
    ? {
        output: 'export' as const,
        // A packaged app is opened from the file system, so every route needs its own index.html.
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
