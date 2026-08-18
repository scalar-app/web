import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';

// `@scalar/ui` and `@scalar/sdk` are consumed with pnpm `link:` from sibling repositories until they
// are published. Turbopack only resolves files under its root, so point it at the parent folder.
// Once the packages come from npm this override goes away.
const parentDir = fileURLToPath(new URL('..', import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@scalar/ui', '@scalar/sdk'],
  turbopack: {
    root: parentDir,
  },
};

export default nextConfig;
