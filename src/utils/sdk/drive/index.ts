import { BaseAPI } from "../base";
import { DirectoryAPI } from "./directory";
import { FileAPI } from "./file";
import { BucketAPI } from "./bucket";
import type {
  ListFilesParams,
  ListFilesResponse,
} from "../types";

/**
 * Drive (S3) API Class
 * 
 * Handles all S3-related API operations including file management,
 * directory operations, uploads, downloads, and metadata.
 * 
 * Organized by resource type: directory, file, and bucket.
 */
export class DriveAPI extends BaseAPI {
  public directory: DirectoryAPI;
  public file: FileAPI;
  public bucket: BucketAPI;

  constructor(baseUrl?: string | null) {
    super(baseUrl);
    // Initialize nested API classes with the same baseUrl
    this.directory = new DirectoryAPI(baseUrl);
    this.file = new FileAPI(baseUrl);
    this.bucket = new BucketAPI(baseUrl);
  }

  /**
   * Override setBaseUrl to update nested APIs as well
   */
  setBaseUrl(baseUrl: string): void {
    super.setBaseUrl(baseUrl);
    this.directory.setBaseUrl(baseUrl);
    this.file.setBaseUrl(baseUrl);
    this.bucket.setBaseUrl(baseUrl);
  }

  /**
   * List files and directories in an S3 bucket
   */
  async list(params: ListFilesParams): Promise<ListFilesResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
      page: (params.page || 1).toString(),
      limit: (params.limit || 20).toString(),
    });

    if (params.name) queryParams.append("name", params.name);
    if (params.type) queryParams.append("type", params.type);
    if (params.extension) queryParams.append("extension", params.extension);

    return this.request(`api/s3?${queryParams.toString()}`);
  }
}

