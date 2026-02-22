import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // roughjs は pure ESM なので transpile 対象に含める
  transpilePackages: ['roughjs'],
};

export default nextConfig;
