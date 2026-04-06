import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-expect-error -- no type declarations for this plugin
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/viewer', destination: '/viewer.html' }];
  },
  outputFileTracingIncludes: {
    '/api/*': ['./lib/generated/prisma/*.node', './lib/generated/prisma/*.so.*'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
};

/**
 * Pin tracing to this repo root only when building locally next to another
 * lockfile (e.g. parent `CODE/package-lock.json`). On Vercel there is a single
 * app checkout — forcing this path can break the serverless bundle and yield 404.
 */
if (!process.env.VERCEL) {
  nextConfig.outputFileTracingRoot = path.join(__dirname);
}

export default nextConfig;
