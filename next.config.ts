import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
