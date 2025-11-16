/**
 * File-related types
 */

import { SuccessResponse } from "./common";

/**
 * Request parameters for uploading a file
 */
export interface UploadFileParams {
  file: File;
  drive: string;
  key: string;
}

/**
 * Request parameters for deleting a file
 */
export interface DeleteFileParams {
  path: string;
}

/**
 * Request parameters for renaming a file
 */
export interface RenameFileParams {
  drive: string;
  oldKey: string;
  newKey: string;
}

/**
 * Request parameters for getting file content
 */
export interface GetFileContentParams {
  path: string;
}

/**
 * Response for file content
 */
export interface FileContentResponse {
  content: string;
}

/**
 * Request parameters for saving file content
 */
export interface SaveFileContentParams {
  drive: string;
  key: string;
  content: string;
  contentType?: string;
}

/**
 * Request parameters for downloading a file
 */
export interface DownloadFileParams {
  path: string;
}

/**
 * Request parameters for getting file metadata
 */
export interface GetFileMetadataParams {
  path: string;
}

/**
 * Response for file metadata
 */
export interface FileMetadataResponse {
  key: string;
  size: number;
  lastModified: string;
  contentType: string;
  etag: string;
  metadata?: Record<string, string>;
}

/**
 * Request parameters for getting preview URL
 */
export interface GetPreviewUrlParams {
  path: string;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Request parameters for getting upload URL
 */
export interface GetUploadUrlParams {
  drive: string;
  key: string;
  contentType: string;
  expiresIn?: number;
}

/**
 * Response for upload URL
 */
export interface UploadUrlResponse {
  url: string;
  expiresAt: string;
}

/**
 * Response types
 */
export type UploadFileResponse = SuccessResponse;
export type DeleteFileResponse = SuccessResponse;
export type RenameFileResponse = SuccessResponse;
export type SaveFileContentResponse = SuccessResponse;
export type DownloadFileResponse = Response;

