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
  AllDirectoriesSizeResponse,
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
    return this.request("api/drive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        drive: data.drive,
        dirKey: data.dirKey,
      }),
    });
  }

  /**
   * Delete a directory
   */
  async delete(params: DeleteDirectoryParams): Promise<DeleteDirectoryResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request(`api/drive?${queryParams.toString()}`, {
      method: "DELETE",
    });
  }

  /**
   * Rename a directory
   */
  async rename(data: RenameDirectoryParams): Promise<RenameDirectoryResponse> {
    return this.request("api/drive", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        drive: data.drive,
        oldKey: data.oldKey,
        newKey: data.newKey,
      }),
    });
  }

  /**
   * Get directory size
   * Returns DirectorySizeResponse for single directory or AllDirectoriesSizeResponse for root
   */
  async getSize(params: GetDirectorySizeParams): Promise<DirectorySizeResponse | AllDirectoriesSizeResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request(`api/drive/directory/size?${queryParams.toString()}`);
  }

  /**
   * Download a directory as ZIP
   * Returns Response (ZIP blob) for small directories or JSON error for large directories
   */
  async download(params: DownloadDirectoryParams): Promise<DownloadDirectoryResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request<Response>(
      `api/drive/directory/download?${queryParams.toString()}`
    );
  }
}

