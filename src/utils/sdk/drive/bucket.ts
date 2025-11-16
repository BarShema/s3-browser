import { BaseAPI } from "../base";
import type {
  ListBucketsResponse,
  GetBucketSizeParams,
  BucketSizeResponse,
} from "../types";

/**
 * Bucket API operations
 */
export class BucketAPI extends BaseAPI {
  /**
   * List all S3 buckets
   */
  async list(): Promise<ListBucketsResponse> {
    return this.request("api/s3/buckets");
  }

  /**
   * Get drive (bucket) size
   */
  async getSize(params: GetBucketSizeParams): Promise<BucketSizeResponse> {
    const queryParams = new URLSearchParams({
      drive: params.drive,
    });

    return this.request(`api/s3/drive-size?${queryParams.toString()}`);
  }
}

