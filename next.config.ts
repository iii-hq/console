import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable standalone output for npm package distribution
  output: 'standalone',
  
  // Set output file tracing root to avoid workspace detection issues
  outputFileTracingRoot: path.join(__dirname),
  
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
