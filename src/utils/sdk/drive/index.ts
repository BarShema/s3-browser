import { BaseAPI } from "../base";
import { DirectoryAPI } from "./directory";
import { FileAPI } from "./file";
import type {
  ListFilesParams,
  ListFilesResponse,
  ListDrivesResponse,
  GetDriveSizeParams,
  DriveSizeResponse,
} from "../types";

/**
 * Drive (S3) API Class
 * 
 * Handles all S3-related API operations including file management,
 * directory operations, uploads, downloads, and metadata.
 * 
 * Organized by resource type: directory and file. Drive-level operations
 * (like listing drives and getting drive size) are at the drive level.
 */
export class DriveAPI extends BaseAPI {
  public directory: DirectoryAPI;
  public file: FileAPI;

  constructor(baseUrl?: string | null) {
    super(baseUrl);
    // Initialize nested API classes with the same baseUrl
    this.directory = new DirectoryAPI(baseUrl);
    this.file = new FileAPI(baseUrl);
  }

  /**
   * Override setBaseUrl to update nested APIs as well
   */
  setBaseUrl(baseUrl: string): void {
    super.setBaseUrl(baseUrl);
    this.directory.setBaseUrl(baseUrl);
    this.file.setBaseUrl(baseUrl);
  }

  /**
   * List files and directories in a drive
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

  /**
   * List all drives
   */
  async listDrives(): Promise<ListDrivesResponse> {
    return this.request("api/s3/buckets");
  }

  /**
   * Get drive size
   */
  async getSize(params: GetDriveSizeParams): Promise<DriveSizeResponse> {
    const queryParams = new URLSearchParams({
      drive: params.drive,
    });

    return this.request(`api/s3/drive-size?${queryParams.toString()}`);
  }
}

