/**
 * Centralized API SDK instance
 * 
 * This file exports a single SDK instance that uses the environment variable
 * for the base URL. All components should import from this file instead of
 * creating their own SDK instances.
 */

import { SDK } from "@idits/sdk";

// Get base URL from environment variable
const getBaseUrl = (): string => {
  // Support both IDITS_API_BASE_URL (generic) and NEXT_PUBLIC_API_BASE_URL (Next.js)
  const baseUrl = 
    (typeof process !== 'undefined' && process.env?.IDITS_API_BASE_URL) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE_URL);
  
  if (!baseUrl) {
    throw new Error(
      "API base URL is required. Set IDITS_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL environment variable."
    );
  }
  
  return baseUrl;
};

// Create SDK instance with base URL from environment
const api = new SDK(getBaseUrl());

export { api };

