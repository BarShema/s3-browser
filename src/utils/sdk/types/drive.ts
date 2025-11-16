/**
 * Drive (S3) related types
 */

/**
 * S3 file item
 */
export interface S3File {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  isDirectory: boolean;
  etag?: string;
}

/**
 * S3 directory item
 */
export interface S3Directory {
  key: string;
  name: string;
  lastModified: string;
  isDirectory: boolean;
}

/**
 * Request parameters for listing files and directories
 */
export interface ListFilesParams {
  path: string;
  page?: number;
  limit?: number;
  name?: string;
  type?: string;
  extension?: string;
}

/**
 * Response for listing files and directories
 */
export interface ListFilesResponse {
  files: Array<S3File>;
  directories: Array<S3Directory>;
  totalFiles: number;
  totalDirectories: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Drive information
 */
export interface Drive {
  name: string;
  creationDate?: string;
}

/**
 * Request parameters for getting drive size
 */
export interface GetDriveSizeParams {
  drive: string;
}

/**
 * Response for drive size
 */
export interface DriveSizeResponse {
  size: number;
  sizeFormatted: string;
}

/**
 * Response types
 */
export type ListDrivesResponse = Array<Drive>;

