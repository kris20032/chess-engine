import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static page generation for server.js compatibility
  output: 'standalone',

  // Disable ESLint during builds (optional, speeds up build)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript errors during build (optional)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
