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
  contentType: string;
  lastModified: string;
  size: number;
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
  expiresIn?: number;
}

/**
 * Request parameters for getting file metadata
 */
export interface GetFileMetadataParams {
  path: string;
}

/**
 * Image metadata response
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  exif?: Record<string, any>;
}

/**
 * Video metadata response
 */
export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  format: string;
  size: number;
  bitrate?: number;
  fps?: number;
}

/**
 * Response for file metadata (can be image or video)
 */
export type FileMetadataResponse = ImageMetadata | VideoMetadata;

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
  contentType?: string;
  expiresIn?: number;
}

/**
 * Response for upload URL
 */
export interface UploadUrlResponse {
  uploadUrl: string;
}

/**
 * Response for download URL
 */
export interface DownloadUrlResponse {
  downloadUrl: string;
}

/**
 * Response types
 */
export type UploadFileResponse = SuccessResponse;
export type DeleteFileResponse = SuccessResponse;
export type RenameFileResponse = SuccessResponse;
export type SaveFileContentResponse = SuccessResponse;
export type DownloadFileResponse = DownloadUrlResponse;
