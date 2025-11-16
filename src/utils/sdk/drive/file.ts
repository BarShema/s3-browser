import { BaseAPI } from "../base";
import type {
  UploadFileParams,
  UploadFileResponse,
  DeleteFileParams,
  DeleteFileResponse,
  RenameFileParams,
  RenameFileResponse,
  GetFileContentParams,
  FileContentResponse,
  SaveFileContentParams,
  SaveFileContentResponse,
  DownloadFileParams,
  DownloadFileResponse,
  GetFileMetadataParams,
  FileMetadataResponse,
  GetPreviewUrlParams,
  GetUploadUrlParams,
  UploadUrlResponse,
} from "../types";

/**
 * File API operations
 */
export class FileAPI extends BaseAPI {
  /**
   * Upload a file to S3
   */
  async upload(data: UploadFileParams): Promise<UploadFileResponse> {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("bucket", data.bucket);
    formData.append("key", data.key);

    return this.request("api/s3", {
      method: "POST",
      body: formData,
    });
  }

  /**
   * Delete a file from S3
   */
  async delete(params: DeleteFileParams): Promise<DeleteFileResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request(`api/s3?${queryParams.toString()}`, {
      method: "DELETE",
    });
  }

  /**
   * Rename a file in S3
   */
  async rename(data: RenameFileParams): Promise<RenameFileResponse> {
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
   * Get file content
   */
  async getContent(params: GetFileContentParams): Promise<FileContentResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request(`api/s3/content?${queryParams.toString()}`);
  }

  /**
   * Save file content
   */
  async saveContent(data: SaveFileContentParams): Promise<SaveFileContentResponse> {
    return this.request("api/s3/content", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket: data.bucket,
        key: data.key,
        content: data.content,
        contentType: data.contentType || "text/plain",
      }),
    });
  }

  /**
   * Download a file
   */
  async download(params: DownloadFileParams): Promise<DownloadFileResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request<Response>(`api/s3/download?${queryParams.toString()}`);
  }

  /**
   * Get file metadata
   */
  async getMetadata(params: GetFileMetadataParams): Promise<FileMetadataResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request(`api/s3/metadata?${queryParams.toString()}`);
  }

  /**
   * Get preview/thumbnail URL for a file
   * Returns the URL as a string (for use in img src, etc.)
   */
  getPreviewUrl(params: GetPreviewUrlParams): string {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    if (params.maxWidth) {
      queryParams.append("mw", params.maxWidth.toString());
    }
    if (params.maxHeight) {
      queryParams.append("mh", params.maxHeight.toString());
    }

    return this.buildUrl(`api/s3/preview?${queryParams.toString()}`);
  }

  /**
   * Get upload URL (presigned URL)
   */
  async getUploadUrl(data: GetUploadUrlParams): Promise<UploadUrlResponse> {
    return this.request("api/s3/upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket: data.bucket,
        key: data.key,
        contentType: data.contentType,
        expiresIn: data.expiresIn || 3600,
      }),
    });
  }
}

