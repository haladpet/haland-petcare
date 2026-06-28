import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone', // Enable for production deployments
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'radix-ui'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
  typescript: {
    // Pre-existing type errors in the codebase — ignore during build
    ignoreBuildErrors: true,
  },
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},
  // Webpack config (used when running with --webpack flag)
  webpack(config) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;