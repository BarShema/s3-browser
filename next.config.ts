import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Frontend-only project - all pages are dynamically rendered
  // Content changes frequently per user and drive, so no static generation
  
  // Transpile the SDK package (local TypeScript package)
  transpilePackages: ['@idits/sdk'],
};

export default nextConfig;
