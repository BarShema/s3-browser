import { BaseAPI } from "../base";
import type {
  CreateDirectoryParams,
  CreateDirectoryResponse,
  DeleteDirectoryParams,
  DeleteDirectoryResponse,
  RenameDirectoryParams,
  RenameDirectoryResponse,
  GetDirectorySizeParams,
  DirectorySizeResponse,
  DownloadDirectoryParams,
  DownloadDirectoryResponse,
} from "../types";

/**
 * Directory API operations
 */
export class DirectoryAPI extends BaseAPI {
  /**
   * Create a directory in S3
   */
  async create(data: CreateDirectoryParams): Promise<CreateDirectoryResponse> {
    return this.request("api/s3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket: data.bucket,
        dirKey: data.dirKey,
      }),
    });
  }

  /**
   * Delete a directory from S3
   */
  async delete(params: DeleteDirectoryParams): Promise<DeleteDirectoryResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request(`api/s3?${queryParams.toString()}`, {
      method: "DELETE",
    });
  }

  /**
   * Rename a directory in S3
   */
  async rename(data: RenameDirectoryParams): Promise<RenameDirectoryResponse> {
    return this.request("api/s3", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket: data.bucket,
        oldKey: data.oldKey,
        newKey: data.newKey,
      }),
    });
  }

  /**
   * Get directory size
   */
  async getSize(params: GetDirectorySizeParams): Promise<DirectorySizeResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request(`api/s3/directory-size?${queryParams.toString()}`);
  }

  /**
   * Download a directory as ZIP
   */
  async download(params: DownloadDirectoryParams): Promise<DownloadDirectoryResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request<Response>(
      `api/s3/download-directory?${queryParams.toString()}`
    );
  }
}

