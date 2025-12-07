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
   * Upload a file
   */
  async upload(data: UploadFileParams): Promise<UploadFileResponse> {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("drive", data.drive);
    formData.append("key", data.key);

    return this.request("api/drive", {
      method: "POST",
      body: formData,
    });
  }

  /**
   * Upload a file with progress tracking using XMLHttpRequest
   * This method is needed for progress tracking which fetch() doesn't support
   */
  uploadWithProgress(
    data: UploadFileParams,
    onProgress?: (progress: number, loaded: number, total: number) => void
  ): Promise<UploadFileResponse> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("drive", data.drive);
      formData.append("key", data.key);

      const url = this.buildUrl("api/drive");
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(
            Math.round((e.loaded / e.total) * 100),
            e.loaded,
            e.total
          );
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = xhr.responseText
              ? JSON.parse(xhr.responseText)
              : {};
            resolve(response as UploadFileResponse);
          } catch (error) {
            resolve({} as UploadFileResponse);
          }
        } else {
          let errorMessage = `Upload failed with status ${xhr.status}`;
          try {
            const errorData = JSON.parse(xhr.responseText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            errorMessage = xhr.statusText || errorMessage;
          }
          // Create error with status code attached for easier detection
          const error = new Error(errorMessage) as Error & { status?: number; response?: { status: number } };
          error.status = xhr.status;
          error.response = { status: xhr.status };
          reject(error);
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"));
      });

      xhr.open("POST", url);
      xhr.send(formData);
    });
  }

  /**
   * Delete a file
   */
  async delete(params: DeleteFileParams): Promise<DeleteFileResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request(`api/drive?${queryParams.toString()}`, {
      method: "DELETE",
    });
  }

  /**
   * Rename a file
   */
  async rename(data: RenameFileParams): Promise<RenameFileResponse> {
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
   * Get file content
   * Uses GET /api/drive with content=true parameter
   */
  async getContent(params: GetFileContentParams): Promise<FileContentResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
      content: "true",
    });

    return this.request(`api/drive?${queryParams.toString()}`);
  }

  /**
   * Save file content
   * Uses PUT /api/drive/file with path in query parameter
   */
  async saveContent(data: SaveFileContentParams): Promise<SaveFileContentResponse> {
    const queryParams = new URLSearchParams({
      path: `${data.drive}/${data.key}`,
    });

    const body: any = {
      drive: data.drive,
      key: data.key,
      content: data.content,
    };

    if (data.contentType) {
      body.contentType = data.contentType;
    }

    return this.request(`api/drive/file?${queryParams.toString()}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  /**
   * Get download URL (presigned URL)
   */
  async download(params: DownloadFileParams): Promise<DownloadFileResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    if (params.expiresIn) {
      queryParams.append("expiresIn", params.expiresIn.toString());
    }

    return this.request(`api/drive/file/download?${queryParams.toString()}`);
  }

  /**
   * Get file metadata
   */
  async getMetadata(params: GetFileMetadataParams): Promise<FileMetadataResponse> {
    const queryParams = new URLSearchParams({
      path: params.path,
    });

    return this.request(`api/drive/file/metadata?${queryParams.toString()}`);
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

    return this.buildUrl(`api/drive/file/preview?${queryParams.toString()}`);
  }

  /**
   * Get upload URL (presigned URL)
   */
  async getUploadUrl(data: GetUploadUrlParams): Promise<UploadUrlResponse> {
    const body: any = {
      drive: data.drive,
      key: data.key,
    };

    if (data.contentType) {
      body.contentType = data.contentType;
    }
    if (data.expiresIn) {
      body.expiresIn = data.expiresIn;
    }

    return this.request("api/drive/file/upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
}

