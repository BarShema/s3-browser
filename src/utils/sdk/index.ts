import { DriveAPI } from "./drive";

/**
 * SDK API Client
 * 
 * Standalone SDK for interacting with the API.
 * Can be used in any project by importing this module.
 * 
 * Usage:
 * ```typescript
 * import api from '@/utils/sdk';
 * 
 * // Directory operations
 * api.drive.directory.create({ bucket: 'my-bucket', dirKey: 'folder' });
 * api.drive.directory.delete({ path: 'my-bucket/folder' });
 * api.drive.directory.rename({ bucket: 'my-bucket', oldKey: 'old', newKey: 'new' });
 * 
 * // File operations
 * api.drive.file.upload({ file: myFile, bucket: 'my-bucket', key: 'file.txt' });
 * api.drive.file.delete({ path: 'my-bucket/file.txt' });
 * api.drive.file.getContent({ path: 'my-bucket/file.txt' });
 * 
 * // Bucket operations
 * api.drive.bucket.list();
 * api.drive.bucket.getSize({ drive: 'my-bucket' });
 * 
 * // List files and directories
 * api.drive.list({ path: 'my-bucket', page: 1, limit: 20 });
 * ```
 * 
 * Base URL Configuration:
 * - Set NEXT_PUBLIC_API_BASE_URL environment variable, OR
 * - Pass baseUrl to the constructor when creating a custom instance
 * - Empty string is valid (uses relative URLs)
 * - If both are undefined/null, an error will be thrown
 */
class SDK {
  public drive: DriveAPI;

  constructor(baseUrl?: string | null) {
    // Create Drive API instance with the same baseUrl
    this.drive = new DriveAPI(baseUrl);
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.drive.getBaseUrl();
  }

  /**
   * Set a new base URL for all API modules
   */
  setBaseUrl(baseUrl: string): void {
    this.drive.setBaseUrl(baseUrl);
    // When adding more modules, update them here too
    // Example: this.auth.setBaseUrl(baseUrl);
  }
}

// Export singleton instance (uses environment variable or throws error)
const api = new SDK();

// Export the SDK class for custom instances
export { SDK };

// Export the singleton instance as default
export default api;

