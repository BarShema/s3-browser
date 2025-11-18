/**
 * Directory-related types
 */

import { SuccessResponse } from "./common";

/**
 * Request parameters for creating a directory
 */
export interface CreateDirectoryParams {
  drive: string;
  dirKey: string;
}

/**
 * Request parameters for deleting a directory
 */
export interface DeleteDirectoryParams {
  path: string;
}

/**
 * Request parameters for renaming a directory
 */
export interface RenameDirectoryParams {
  drive: string;
  oldKey: string;
  newKey: string;
}

/**
 * Request parameters for getting directory size
 */
export interface GetDirectorySizeParams {
  path: string;
}

/**
 * Response for single directory size
 */
export interface DirectorySizeResponse {
  totalSize: number;
  totalObjects: number;
  formattedSize: string;
}

/**
 * Response for all directories size (when path is root)
 */
export interface AllDirectoriesSizeResponse {
  drive: string;
  prefix: string;
  directorySizes: Record<string, {
    size: number;
    objects: number;
    formattedSize: string;
  }>;
}

/**
 * Request parameters for downloading a directory
 */
export interface DownloadDirectoryParams {
  path: string;
}

/**
 * Response types
 */
export type CreateDirectoryResponse = SuccessResponse;
export type DeleteDirectoryResponse = SuccessResponse;
export type RenameDirectoryResponse = SuccessResponse;
export type DownloadDirectoryResponse = Response | {
  message: string;
  directoryName: string;
  fileCount: number;
  totalSizeMB?: string;
  suggestions?: string[];
  files?: Array<{
    key: string;
    name: string;
    size: number;
    lastModified: string;
    isDirectory: boolean;
    etag?: string;
  }>;
};
