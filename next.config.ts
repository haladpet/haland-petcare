import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'radix-ui'],
  },
};

export default nextConfig;