import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for npm package distribution
  output: 'standalone',
  
  reactStrictMode: true,
  
  // Suppress experimental warnings
  experimental: {
    // Use async page params handling
  },
  
  // Environment variables that should be available on the client
  env: {
    III_ENGINE_HOST: process.env.III_ENGINE_HOST || 'localhost',
    III_ENGINE_PORT: process.env.III_ENGINE_PORT || '3111',
    III_WS_PORT: process.env.III_WS_PORT || '31112',
  },
};

export default nextConfig;
