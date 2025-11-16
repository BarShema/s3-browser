/**
 * Directory-related types
 */

import { SuccessResponse } from "./common";

/**
 * Request parameters for creating a directory
 */
export interface CreateDirectoryParams {
  bucket: string;
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
  bucket: string;
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
 * Response for directory size
 */
export interface DirectorySizeResponse {
  size: number;
  sizeFormatted: string;
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
export type DownloadDirectoryResponse = Response;

