import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for CloudFront deployment
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : undefined,
  
  // Trailing slash for CloudFront compatibility
  trailingSlash: true,
  
  // Images configuration (if using next/image, you'll need external domains)
  images: {
    unoptimized: true, // Required for static export
  },
  
  // Base path for deployment (optional, can be set via NEXT_PUBLIC_BASE_PATH)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

export default nextConfig;
