/**
 * Environment Configuration System
 * 
 * Provides default configuration values that can be overridden
 * per environment (lcl, dev, prd).
 * 
 * @example
 * ```typescript
 * import { envConfig } from '@/config/env';
 * 
 * // Use configuration
 * console.log(envConfig.apiBaseUrl); // Environment-specific URL
 * 
 * // The environment is automatically determined from:
 * // 1. NEXT_PUBLIC_ENV (set by PM2 config files)
 * //    - "local" -> lcl
 * //    - "development" -> dev
 * //    - "production" -> prd
 * // 2. NODE_ENV (fallback)
 * //    - "development" -> dev
 * //    - "production" -> prd
 * ```
 * 
 * @example Adding new environment overrides
 * ```typescript
 * // Add new override for 'lcl' environment
 * const lclConfig: Partial<AppConfig> = {
 *   apiBaseUrl: "http://localhost:3002",
 *   defaultItemsPerPage: 25, // Override default value
 * };
 * ```
 */

export type Environment = 'lcl' | 'dev' | 'prd' | 'cloudfront' | 'default';

export interface AppConfig {
  // Pagination
  defaultItemsPerPage: number;

  // Grid View Configuration
  gridView: {
    defaultItemsPerRow: number;
    minItemsPerRow: number;
    maxItemsPerRow: number;
    mobile: {
      defaultItemsPerRow: number;
      minItemsPerRow: number;
      maxItemsPerRow: number;
    };
    tablet: {
      defaultItemsPerRow: number;
      minItemsPerRow: number;
      maxItemsPerRow: number;
    };
  };

  // Preview View Configuration
  previewView: {
    defaultItemsPerRow: number;
    minItemsPerRow: number;
    maxItemsPerRow: number;
    mobile: {
      defaultItemsPerRow: number;
      minItemsPerRow: number;
      maxItemsPerRow: number;
    };
    tablet: {
      defaultItemsPerRow: number;
      minItemsPerRow: number;
      maxItemsPerRow: number;
    };
  };

  // S3 Configuration
  tempBucketName: string;
  apiBaseUrl: string;

  // Thumbnail Configuration
  thumbnailMaxWidth: number;
  thumbnailMaxHeight: number;
  previewMaxWidth: number;
  previewMaxHeight: number;

  // AWS Configuration
  region: string;
}

// Default configuration values
const defaultConfig: AppConfig = {
  // Pagination
  defaultItemsPerPage: 20,

  // Grid View Configuration
  gridView: {
    defaultItemsPerRow: 6,
    minItemsPerRow: 3,
    maxItemsPerRow: 9,
    mobile: {
      defaultItemsPerRow: 2,
      minItemsPerRow: 1,
      maxItemsPerRow: 3,
    },
    tablet: {
      defaultItemsPerRow: 4,
      minItemsPerRow: 2,
      maxItemsPerRow: 6,
    },
  },

  // Preview View Configuration
  previewView: {
    defaultItemsPerRow: 7,
    minItemsPerRow: 3,
    maxItemsPerRow: 9,
    mobile: {
      defaultItemsPerRow: 2,
      minItemsPerRow: 1,
      maxItemsPerRow: 3,
    },
    tablet: {
      defaultItemsPerRow: 4,
      minItemsPerRow: 2,
      maxItemsPerRow: 6,
    },
  },

  // S3 Configuration
  tempBucketName: "idits-drive-tmp",
  apiBaseUrl: "http://localhost:3000",

  // Thumbnail Configuration
  thumbnailMaxWidth: 200,
  thumbnailMaxHeight: 200,
  previewMaxWidth: 1000,
  previewMaxHeight: 1000,

  // AWS Configuration
  region: process.env.AWS_REGION || "eu-west-1",
};

// Local environment overrides (lcl)
const lclConfig: Partial<AppConfig> = {
  apiBaseUrl: "http://localhost:3002",
};

// Development environment overrides (dev)
const devConfig: Partial<AppConfig> = {
  apiBaseUrl: "http://localhost:3010",
};

// Production environment overrides (prd)
const prdConfig: Partial<AppConfig> = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "https://api.example.com",
  tempBucketName: "idits-drive-tmp-prd",
};

// CloudFront environment overrides (for dev.idit.photos)
const cloudfrontConfig: Partial<AppConfig> = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_CLOUDFRONT_API_URL || "https://api.dev.idit.photos",
  // CloudFront serves static files, API should be on a different subdomain
};

/**
 * Deep merge utility function
 * Merges source into target, handling nested objects
 */
function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const output = { ...target } as T;
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      const targetValue = target[key];
      
      if (isObject(sourceValue) && isObject(targetValue)) {
        (output as any)[key] = deepMerge(targetValue, sourceValue);
      } else {
        (output as any)[key] = sourceValue !== undefined ? sourceValue : targetValue;
      }
    });
  }
  
  return output;
}

function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Get current environment from environment variables
 * Checks NEXT_PUBLIC_ENV first, then falls back to NODE_ENV
 */
function getCurrentEnvironment(): Environment {
  // Check if running on CloudFront (check for CloudFront-specific env vars)
  if (process.env.NEXT_PUBLIC_CLOUDFRONT === 'true' || 
      process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'cloudfront') {
    return 'cloudfront';
  }
  
  // Check NEXT_PUBLIC_ENV (set by PM2 config files)
  const publicEnv = process.env.NEXT_PUBLIC_ENV?.toLowerCase();
  
  if (publicEnv === 'local') return 'lcl';
  if (publicEnv === 'development') return 'dev';
  if (publicEnv === 'production') return 'prd';
  
  // Fallback to NODE_ENV
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  if (nodeEnv === 'development') return 'dev';
  if (nodeEnv === 'production') return 'prd';
  
  // Default to 'default' if neither is set
  return 'default';
}

/**
 * Get environment-specific configuration
 */
function getEnvironmentConfig(env: Environment): Partial<AppConfig> {
  switch (env) {
    case 'lcl':
      return lclConfig;
    case 'dev':
      return devConfig;
    case 'prd':
      return prdConfig;
    case 'cloudfront':
      return cloudfrontConfig;
    case 'default':
    default:
      return {};
  }
}

/**
 * Build the final configuration by merging defaults with environment overrides
 */
function buildConfig(): AppConfig {
  const currentEnv = getCurrentEnvironment();
  const envConfig = getEnvironmentConfig(currentEnv);
  
  // Merge default config with environment-specific overrides
  const mergedConfig = deepMerge(defaultConfig, envConfig);
  
  // Override region from environment variable if set
  if (process.env.AWS_REGION) {
    mergedConfig.region = process.env.AWS_REGION;
  }
  
  return mergedConfig;
}

// Export the final configuration
export const envConfig = buildConfig();

// Export helper functions for testing or manual configuration
export const configHelpers = {
  getCurrentEnvironment,
  getEnvironmentConfig,
  buildConfig,
  deepMerge,
};

// Default export
export default envConfig;

