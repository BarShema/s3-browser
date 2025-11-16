/**
 * Bucket-related types
 */

/**
 * Bucket information
 */
export interface Bucket {
  name: string;
  creationDate?: string;
}

/**
 * Request parameters for getting bucket size
 */
export interface GetBucketSizeParams {
  drive: string;
}

/**
 * Response for bucket size
 */
export interface BucketSizeResponse {
  size: number;
  sizeFormatted: string;
}

/**
 * Response types
 */
export type ListBucketsResponse = Array<Bucket>;

