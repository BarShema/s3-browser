"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CheckSquare,
  File,
  Folder,
  Maximize2,
  Minimize2,
  Square,
  Upload,
  X,
} from "lucide-react";
import { FileRejection, useDropzone } from "react-dropzone";
import toast from "react-hot-toast";

import { api } from "@/lib/api";
import { clz } from "@/lib/clz";
import { formatFileSize } from "@/lib/utils";
import type { S3Directory, S3File } from "@/utils/sdk/types";
import styles from "./modal.module.css";
import uploadStyles from "./uploadModal.module.css";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  driveName: string;
  currentPath: string;
}

interface UploadFile {
  file: File;
  key: string;
  status:
    | "pending"
    | "checking"
    | "exists"
    | "uploading"
    | "completed"
    | "error";
  progress: number;
  error?: string;
  exists?: boolean;
  shouldReplace?: boolean;
  startTime?: number;
  uploadedBytes?: number;
}

interface ExistingFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
}

// Format time remaining
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  if (minutes < 60) {
    return `${minutes}m ${secs}s`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function UploadModal({
  isOpen,
  onClose,
  onComplete,
  driveName,
  currentPath,
}: UploadModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showReplaceConfirmation, setShowReplaceConfirmation] = useState(false);
  const [hasUploadStarted, setHasUploadStarted] = useState(false);
  const [existingFiles, setExistingFiles] = useState<Map<string, ExistingFile>>(
    new Map()
  );
  const abortRequestedRef = useRef(false);
  const uploadStartTimeRef = useRef<number>(0);
  const totalBytesRef = useRef<number>(0);
  const uploadedBytesRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completedFilesRef = useRef<Set<string>>(new Set());

  // Warn on page close while uploading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading || isChecking) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    if (isUploading || isChecking) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    } else {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    }
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isUploading, isChecking]);

  // Disable body scroll only when modal is open and not minimized
  useEffect(() => {
    if (isOpen && !isMinimized) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
      setUploadFiles([]);
      setShowReplaceConfirmation(false);
      setExistingFiles(new Map());
      setHasUploadStarted(false);
      completedFilesRef.current.clear();
    }
  }, [isOpen]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[], event: DragEvent) => {
      // Build a map of File objects to their full paths using DataTransfer API
      const filePathMap = new Map<File, string>();
      const filePromises: Promise<void>[] = [];
      
      // Process DataTransfer items to extract full directory structure
      if (event?.dataTransfer?.items) {
        const items = Array.from(event.dataTransfer.items);
        
        const processEntry = (entry: FileSystemEntry, basePath: string = ""): void => {
          if (entry.isFile) {
            const filePromise = new Promise<void>((resolve) => {
              entry.file((file: File) => {
                const fullPath = basePath ? `${basePath}/${file.name}` : file.name;
                filePathMap.set(file, fullPath);
                resolve();
              });
            });
            filePromises.push(filePromise);
          } else if (entry.isDirectory) {
            const dirReader = entry.createReader();
            const dirName = entry.name;
            const newBasePath = basePath ? `${basePath}/${dirName}` : dirName;
            
            const readEntries = (): void => {
              dirReader.readEntries((entries: FileSystemEntry[]) => {
                if (entries.length === 0) return;
                
                for (const subEntry of entries) {
                  processEntry(subEntry, newBasePath);
                }
                
                // Continue reading if there are more entries
                readEntries();
              });
            };
            
            readEntries();
          }
        };
        
        // Process all items from DataTransfer
        for (let i = 0; i < items.length; i++) {
          const item = items[i] as DataTransferItem;
          
          if (item.webkitGetAsEntry) {
            const entry = item.webkitGetAsEntry();
            if (entry) {
              processEntry(entry);
            }
          }
        }
        
        // Wait for all file entries to be processed
        await Promise.all(filePromises);
      }
      
      // Build file list with proper paths
      const newFiles: UploadFile[] = acceptedFiles.map((file) => {
        let relativeKey = file.name;
        
        // First try to use path from DataTransfer entry (most accurate for drag & drop)
        if (filePathMap.has(file)) {
          relativeKey = filePathMap.get(file)!;
        }
        // Try using file.path property (available when dragging files from file system)
        else if ((file as any).path && (file as any).path !== "") {
          // Extract relative path from absolute path
          // Path format: /dir1/dir2/file.txt -> dir1/dir2/file.txt
          const filePath = (file as any).path;
          // Remove leading slash and use as relative path
          relativeKey = filePath.startsWith("/") ? filePath.slice(1) : filePath;
        }
        // Fallback to webkitRelativePath if available (works for file input)
        else if (file.webkitRelativePath && file.webkitRelativePath !== "") {
          relativeKey = file.webkitRelativePath;
        }
        
        // Preserve the exact local path structure - don't flatten to root
        // If currentPath exists, files should be placed relative to it, maintaining their structure
        const s3key = currentPath
          ? `${currentPath.replace(/\\/g, "/")}/${relativeKey.replace(
              /^[/.]+/,
              ""
            )}`
          : relativeKey.replace(/^[/.]+/, "");
        
        return {
          file,
          key: s3key,
          status: "pending",
          progress: 0,
        };
      });
      
      setUploadFiles((prev) => [...prev, ...newFiles]);
    },
    [currentPath]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: false, // Allow clicks on dropzone to open file browser
    noKeyboard: false,
  });


  // Unified handler for file/directory selection that preserves path structure
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const newFiles: UploadFile[] = fileArray.map((file) => {
        let relativeKey = file.name;
        // Use webkitRelativePath to preserve directory structure
        // This is available when selecting a directory or when files are dropped from a directory
        if (file.webkitRelativePath && file.webkitRelativePath !== "") {
          relativeKey = file.webkitRelativePath;
        }
        // Preserve the exact local path structure
        // If currentPath exists, files should be placed relative to it, maintaining their structure
        const s3key = currentPath
          ? `${currentPath.replace(/\\/g, "/")}/${relativeKey.replace(
              /^[/.]+/,
              ""
            )}`
          : relativeKey.replace(/^[/.]+/, "");
        return {
          file,
          key: s3key,
          status: "pending",
          progress: 0,
        };
      });
      setUploadFiles((prev) => [...prev, ...newFiles]);
    }
    // Reset input so same files/directories can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Check for existing files
  const checkExistingFiles = async () => {
    setIsChecking(true);
    const existingMap = new Map<string, ExistingFile>();

    try {
      // Get all files - list from current path and root to get all files
      // The API uses delimiter so it only returns files at the current level
      // We need to check both the current path and root to find all files
      const allFiles: ExistingFile[] = [];
      const seenKeys = new Set<string>(); // Avoid duplicates
      
      // Extract unique directory paths from upload files - only check these directories
      const uploadDirectories = new Set<string>();
      uploadFiles.forEach((uf) => {
        const keyParts = uf.key.split('/');
        // Extract all parent directories (e.g., "new-test/test/file.jpg" -> ["new-test", "new-test/test"])
        for (let i = 1; i < keyParts.length; i++) {
          const dirPath = keyParts.slice(0, i).join('/');
          uploadDirectories.add(dirPath);
        }
      });
      
      // Strategy: List from root to get ALL files recursively
      // Since the API uses delimiter, we need to recursively list from each subdirectory
      // But for efficiency, let's first try listing from root and current path
      // Then recursively list from any subdirectories we find
      const pathsToCheck: string[] = [];
      const directoriesToCheck: string[] = [];
      
      // Always start from root to get all files
      pathsToCheck.push(driveName);
      
      // Also check current path if it exists
      if (currentPath) {
        pathsToCheck.push(`${driveName}/${currentPath}`);
      }

      // First pass: List from root and current path
      for (const listPath of pathsToCheck) {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          try {
            const data = await api.drive.list({
              path: listPath,
              page,
              limit: 1000,
            });
            
            // Process the response
            const responseData = data;
            
            if (responseData.files && responseData.files.length > 0) {
              responseData.files.forEach((file: S3File) => {
                // The API returns full S3 keys (absolute from bucket root)
                // So file.key should already be the full path like "new-test/DSCF2170.jpg"
                let normalizedKey = file.key;
                
                // Remove leading/trailing slashes and normalize
                normalizedKey = normalizedKey.replace(/^\/+|\/+$/g, "");
                
                // If listing from a subdirectory and the key doesn't include the path,
                // it might be relative - but based on S3 behavior, keys should be absolute
                // However, let's handle both cases to be safe
                if (listPath !== driveName && currentPath) {
                  const pathWithoutDrive = listPath.replace(`${driveName}/`, '');
                  // If key is just the filename, it's relative to the list path
                  if (normalizedKey === file.name || !normalizedKey.includes('/')) {
                    normalizedKey = `${pathWithoutDrive}/${file.name}`;
                  }
                }
                
                // Avoid duplicates
                if (!seenKeys.has(normalizedKey)) {
                  allFiles.push({
                    key: normalizedKey,
                    name: file.name,
                    size: file.size,
                    lastModified: file.lastModified,
                  });
                  seenKeys.add(normalizedKey);
                }
              });
            }

            // Collect directories for recursive listing - ONLY directories that contain upload files
            if (responseData.directories && responseData.directories.length > 0) {
              responseData.directories.forEach((dir: S3Directory) => {
                const dirKey = dir.key.replace(/^\/+|\/+$/g, "");
                const fullDirPath = `${driveName}/${dirKey}`;
                
                // Only add directories that are in the upload files list
                if (uploadDirectories.has(dirKey)) {
                  if (!directoriesToCheck.includes(fullDirPath)) {
                    directoriesToCheck.push(fullDirPath);
                  }
                }
              });
            }

            hasMore = page < (responseData.totalPages || 1);
            page++;
            
            // Safety check to prevent infinite loops
            if (page > 1000) {
              break;
            }
          } catch {
            // Continue to next page or path
            hasMore = false;
          }
        }
      }

      // Second pass: Recursively list from all subdirectories found
      for (const dirPath of directoriesToCheck) {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          try {
            const data = await api.drive.list({
              path: dirPath,
              page,
              limit: 1000,
            });

            if (data.files && data.files.length > 0) {
              data.files.forEach((file: S3File) => {
                const normalizedKey = file.key.replace(/^\/+|\/+$/g, "");
                
                if (!seenKeys.has(normalizedKey)) {
                  allFiles.push({
                    key: normalizedKey,
                    name: file.name,
                    size: file.size,
                    lastModified: file.lastModified,
                  });
                  seenKeys.add(normalizedKey);
                }
              });
            }

            // Check for nested subdirectories
            if (data.directories && data.directories.length > 0) {
              data.directories.forEach((dir: S3Directory) => {
                const dirKey = dir.key.replace(/^\/+|\/+$/g, "");
                const fullDirPath = `${driveName}/${dirKey}`;
                if (!directoriesToCheck.includes(fullDirPath) && dirPath !== fullDirPath) {
                  directoriesToCheck.push(fullDirPath);
                }
              });
            }

            hasMore = page < (data.totalPages || 1);
            page++;
            
            if (page > 1000) {
              break;
            }
          } catch (error) {
            hasMore = false;
          }
        }
      }

      // Check which upload files already exist
      // Normalize keys for comparison (remove leading/trailing slashes, handle relative vs absolute)
      uploadFiles.forEach((uploadFile) => {
        const normalizedUploadKey = uploadFile.key.replace(/^\/+|\/+$/g, "");
        
        const existing = allFiles.find((f) => {
          const normalizedExistingKey = f.key.replace(/^\/+|\/+$/g, "");
          const match = normalizedExistingKey === normalizedUploadKey;
          
          return match;
        });
        
        if (existing) {
          existingMap.set(uploadFile.key, existing);
        }
      });

      setExistingFiles(existingMap);

      // Update upload files status
      setUploadFiles((prev) =>
        prev.map((f) => {
          const exists = existingMap.has(f.key);
          return {
            ...f,
            status: exists ? "exists" : "pending",
            exists,
            shouldReplace: false,
          };
        })
      );

      setIsChecking(false);

      // Show replace confirmation if any files exist
      if (existingMap.size > 0) {
        setShowReplaceConfirmation(true);
      } else {
        // No existing files, proceed directly to upload
        startUpload();
      }
    } catch (error) {
      toast.error("Failed to check for existing files");
      setIsChecking(false);
      // Proceed with upload anyway
      startUpload();
    }
  };

  const toggleReplaceFile = (key: string) => {
    setUploadFiles((prev) =>
      prev.map((f) =>
        f.key === key ? { ...f, shouldReplace: !f.shouldReplace } : f
      )
    );
  };

  const selectAllReplace = () => {
    setUploadFiles((prev) =>
      prev.map((f) => (f.exists ? { ...f, shouldReplace: true } : f))
    );
  };

  const deselectAllReplace = () => {
    setUploadFiles((prev) =>
      prev.map((f) => (f.exists ? { ...f, shouldReplace: false } : f))
    );
  };

  const handleReplaceConfirmation = () => {
    // Filter out files that exist but shouldn't be replaced
    setUploadFiles((prev) => prev.filter((f) => !f.exists || f.shouldReplace));
    setShowReplaceConfirmation(false);
    startUpload();
  };

  // Upload file using presigned URL (for large files) via SDK
  const uploadFileViaPresignedUrl = async (
    uploadFile: UploadFile,
    uploadUrl: string,
    onProgress?: (progress: number, loaded: number, total: number) => void
  ): Promise<void> => {
    return api.drive.file.uploadViaPresignedUrl(
      {
        file: uploadFile.file,
        uploadUrl,
        contentType: uploadFile.file.type || "application/octet-stream",
      },
      onProgress
    );
  };

  // Helper function to upload via presigned URL with progress tracking
  const uploadFileViaPresignedUrlWithProgress = async (
    uploadFile: UploadFile
  ): Promise<void> => {
    const fileKeyForPresigned = uploadFile.key;

    // Get presigned upload URL
    const uploadUrlResponse = await api.drive.file.getUploadUrl({
      drive: driveName,
      key: uploadFile.key,
      contentType: uploadFile.file.type || "application/octet-stream",
      expiresIn: 3600, // 1 hour
    });

    const uploadUrl = uploadUrlResponse.uploadUrl;

    // Upload using presigned URL with progress tracking
    await uploadFileViaPresignedUrl(
      uploadFile,
      uploadUrl,
      (progress, loaded, total) => {
        // Don't process progress events if file is already marked as completed
        if (completedFilesRef.current.has(fileKeyForPresigned)) {
          return;
        }

        const isComplete = loaded === total && total > 0;

        // Calculate bytes delta more accurately
        setUploadFiles((prev) => {
          const currentFile = prev.find((f) => f.key === fileKeyForPresigned);
          // Double-check ref in case it was updated between checks
          if (completedFilesRef.current.has(fileKeyForPresigned)) {
            return prev;
          }

          const previousBytes = currentFile?.uploadedBytes || 0;
          const bytesDelta = loaded - previousBytes;
          if (bytesDelta > 0) {
            uploadedBytesRef.current += bytesDelta;
          }

          // If progress is 100% and file is complete, mark as completed
          if (isComplete && currentFile?.status === "uploading") {
            completedFilesRef.current.add(fileKeyForPresigned);
            return prev.map((f) =>
              f.key === fileKeyForPresigned
                ? {
                    ...f,
                    status: "completed",
                    progress: 100,
                    uploadedBytes: loaded,
                  }
                : f
            );
          }

          // Otherwise just update progress
          return prev.map((f) =>
            f.key === fileKeyForPresigned
              ? {
                  ...f,
                  progress,
                  uploadedBytes: loaded,
                }
              : f
          );
        });
      }
    );

    // Mark as completed after successful upload via presigned URL
    completedFilesRef.current.add(fileKeyForPresigned);
    setUploadFiles((prev) =>
      prev.map((f) =>
        f.key === fileKeyForPresigned
          ? {
              ...f,
              status: "completed",
              progress: 100,
            }
          : f
      )
    );
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    const startTime = Date.now();
    setUploadFiles((prev) =>
      prev.map((f) =>
        f.key === uploadFile.key
          ? {
              ...f,
              status: "uploading",
              progress: 0,
              startTime,
              uploadedBytes: 0,
            }
          : f
      )
    );

    const fileKey = uploadFile.key;
    const FILE_SIZE_THRESHOLD = 4 * 1024 * 1024; // 4MB in bytes

    // If file is larger than 4MB, automatically use presigned URL upload
    if (uploadFile.file.size > FILE_SIZE_THRESHOLD) {
      try {
        await uploadFileViaPresignedUrlWithProgress(uploadFile);
        return;
      } catch (presignedError) {
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.key === uploadFile.key
              ? {
                  ...f,
                  status: "error",
                  error: presignedError instanceof Error ? presignedError.message : "Upload failed",
                }
              : f
          )
        );
        throw presignedError;
      }
    }

    // For files <= 4MB, try regular upload first
    try {
      // Use SDK's uploadWithProgress method which handles XMLHttpRequest internally
      await api.drive.file.uploadWithProgress(
        {
          file: uploadFile.file,
          drive: driveName,
          key: uploadFile.key,
        },
        (progress, loaded, total) => {
          // Don't process progress events if file is already marked as completed
          if (completedFilesRef.current.has(fileKey)) {
            return;
          }

          const isComplete = loaded === total && total > 0;

          // Calculate bytes delta more accurately
          setUploadFiles((prev) => {
            const currentFile = prev.find((f) => f.key === fileKey);
            // Double-check ref in case it was updated between checks
            if (completedFilesRef.current.has(fileKey)) {
              return prev;
            }

            const previousBytes = currentFile?.uploadedBytes || 0;
            const bytesDelta = loaded - previousBytes;
            if (bytesDelta > 0) {
              uploadedBytesRef.current += bytesDelta;
            }

            // If progress is 100% and file is complete, mark as completed
            if (isComplete && currentFile?.status === "uploading") {
              completedFilesRef.current.add(fileKey);
              return prev.map((f) =>
                f.key === fileKey
                  ? {
                      ...f,
                      status: "completed",
                      progress: 100,
                      uploadedBytes: loaded,
                    }
                  : f
              );
            }

            // Otherwise just update progress
            return prev.map((f) =>
              f.key === fileKey
                ? {
                    ...f,
                    progress,
                    uploadedBytes: loaded,
                  }
                : f
            );
          });
        }
      );

      // Mark as completed after successful upload
      completedFilesRef.current.add(fileKey);
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.key === fileKey
            ? {
                ...f,
                status: "completed",
                progress: 100,
              }
            : f
        )
      );
    } catch (error) {
      // Check if error is 413 (Request Entity Too Large)
      // Check multiple possible error formats
      const errorObj = error as { status?: number; response?: { status?: number }; message?: string };
      const statusCode = errorObj?.status || errorObj?.response?.status || 
                        (errorObj?.message?.match(/\b413\b/) ? 413 : null) ||
                        (errorObj?.message?.toLowerCase().includes("content too large") ? 413 : null) ||
                        (errorObj?.message?.toLowerCase().includes("request entity too large") ? 413 : null);
      
      const is413Error = statusCode === 413 || 
                        (error instanceof Error && (
                          error.message.includes("413") ||
                          error.message.toLowerCase().includes("content too large") ||
                          error.message.toLowerCase().includes("request entity too large")
                        ));

      if (is413Error) {
        // Fallback to presigned URL upload for 413 errors
        try {
          await uploadFileViaPresignedUrlWithProgress(uploadFile);
        } catch (presignedError) {
          setUploadFiles((prev) =>
            prev.map((f) =>
              f.key === uploadFile.key
                ? {
                    ...f,
                    status: "error",
                    error: presignedError instanceof Error ? presignedError.message : "Upload failed",
                  }
                : f
            )
          );
          throw presignedError;
        }
      } else {
        // Not a 413 error, handle normally
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.key === uploadFile.key
              ? {
                  ...f,
                  status: "error",
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
        throw error;
      }
    }
  };

  // Helper function to extract all directory paths from file keys
  // Returns relative directory paths (without currentPath prefix)
  const extractDirectoryPaths = (
    fileKeys: string[],
    basePath: string
  ): string[] => {
    const dirPaths = new Set<string>();
    fileKeys.forEach((key) => {
      // Remove currentPath prefix if present to get relative path
      let relativeKey = key;
      if (basePath && key.startsWith(basePath + "/")) {
        relativeKey = key.substring(basePath.length + 1);
      } else if (key === basePath) {
        return; // This is the base path itself, skip
      }

      const parts = relativeKey.split("/");
      // Build up directory paths from root to file
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join("/");
        if (dirPath) {
          dirPaths.add(dirPath);
        }
      }
    });
    return Array.from(dirPaths).sort(); // Sort to create parent dirs before children
  };

  const startUpload = async () => {
    setHasUploadStarted(true);
    setIsUploading(true);
    abortRequestedRef.current = false;
    uploadStartTimeRef.current = Date.now();
    uploadedBytesRef.current = 0;

    // Calculate total bytes and reset uploaded bytes for files to upload
    const filesToUpload = uploadFiles.filter(
      (f) =>
        f.status === "pending" || (f.status === "exists" && f.shouldReplace)
    );
    totalBytesRef.current = filesToUpload.reduce(
      (sum, f) => sum + f.file.size,
      0
    );

    // Reset uploaded bytes for files being uploaded
    setUploadFiles((prev) =>
      prev.map((f) =>
        filesToUpload.some((ftu) => ftu.key === f.key)
          ? { ...f, uploadedBytes: 0 }
          : f
      )
    );

    // Extract and create all necessary directories first
    const fileKeys = filesToUpload.map((f) => f.key);
    const basePath = currentPath ? currentPath.replace(/\\/g, "/") : "";
    const directoryPaths = extractDirectoryPaths(fileKeys, basePath);

    // Create directories (with currentPath prefix if needed)
    for (const dirPath of directoryPaths) {
      if (abortRequestedRef.current) break;

      try {
        const fullDirKey = basePath ? `${basePath}/${dirPath}` : dirPath;

        // Clean up the path
        const cleanDirKey = fullDirKey
          .replace(/^[/.]+/, "")
          .replace(/\/+/g, "/");

        await api.drive.directory.create({
          drive: driveName,
          dirKey: cleanDirKey,
        });
      } catch {
        // Directory might already exist, which is fine
      }
    }

    // Now upload all files
    for (const file of filesToUpload) {
      if (abortRequestedRef.current) break;

      try {
        await uploadFile(file);
        // Final check: ensure progress is 100% after upload completes
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.key === file.key && f.status !== "completed"
              ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                }
              : f
          )
        );
      } catch {
        // Error already handled in uploadFile
      }
    }

    setIsUploading(false);

    const completedCount = uploadFiles.filter(
      (f) => f.status === "completed"
    ).length;
    if (completedCount > 0) {
      toast.success(`${completedCount} file(s) uploaded successfully`);
      onComplete();
    }
  };

  const stopUpload = () => {
    abortRequestedRef.current = true;
    setIsUploading(false);
  };

  const allDone =
    uploadFiles.length > 0
    && uploadFiles.every(
      (f) =>
        f.status === "completed" ||
        f.status === "error" ||
        (f.status === "exists" && !f.shouldReplace)
    );

  const handleClose = () => {
    if (!isUploading && !isChecking) {
      setUploadFiles([]);
      setIsMinimized(false);
      setShowReplaceConfirmation(false);
      setExistingFiles(new Map());
      onClose();
    }
  };

  if (!isOpen && !isMinimized) return null;

  // Overall progress percent
  const uploadingFiles = uploadFiles.filter((f) => f.status === "uploading");
  const completedFiles = uploadFiles.filter((f) => f.status === "completed");
  const overallProgress = uploadFiles.length
    ? Math.round(
        (uploadFiles.reduce(
          (acc, f) =>
            acc + (f.progress || (f.status === "completed" ? 100 : 0)),
          0
        ) /
          (uploadFiles.length * 100)) *
          100
      )
    : 0;

  // Calculate estimated time remaining
  const elapsed =
    uploadStartTimeRef.current > 0
      ? (Date.now() - uploadStartTimeRef.current) / 1000
      : 0;
  const rate =
    elapsed > 0 && uploadedBytesRef.current > 0
      ? uploadedBytesRef.current / elapsed
      : 0;
  const remaining = totalBytesRef.current - uploadedBytesRef.current;
  const estimatedSeconds = rate > 0 && remaining > 0 ? remaining / rate : 0;

  // Minimized status bar (non-blocking)
  if (isOpen && isMinimized) {
    const total = uploadFiles.length;
    const completed = completedFiles.length;
    const uploading = uploadingFiles.length;
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className={uploadStyles.minimizedContainer}
        title="Click to open uploader"
      >
        <Upload size={16} />
        <div className={uploadStyles.minimizedContent}>
          <div className={uploadStyles.minimizedStatus}>
            {completed}/{total} completed{" "}
            {uploading ? `(uploading ${uploading})` : ""}
            {estimatedSeconds > 0 && (
              <span className={uploadStyles.minimizedTimeLeft}>
                ~{formatTimeRemaining(estimatedSeconds)} left
              </span>
            )}
          </div>
          <div className={uploadStyles.minimizedProgressContainer}>
            <div
              className={uploadStyles.minimizedProgressFill}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          title="Restore"
          className={uploadStyles.minimizedButton}
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          disabled={isUploading || isChecking}
          title={isUploading || isChecking ? "Upload in progress" : "Close"}
          className={uploadStyles.minimizedButton}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  if (!isOpen) return null;

  const filesToUpload = uploadFiles.filter(
    (f) => f.status === "pending" || (f.status === "exists" && f.shouldReplace)
  );
  const existingFilesList = uploadFiles.filter((f) => f.exists);

  return (
    <div className={styles.overlay}>
      <div
        className={`${styles.modal} ${uploadStyles.modalLarge}`}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Upload Files</h2>
          <div className={uploadStyles.headerActions}>
            <button
              onClick={() => setIsMinimized(true)}
              className={clz(styles.closeButton, styles.actionButton)}
              title="Minimize"
            >
              <Minimize2 size={20} />
            </button>
            <button
              onClick={handleClose}
              disabled={isUploading || isChecking}
              className={clz(styles.closeButton, styles.actionButton)}
              title={isUploading || isChecking ? "Upload in progress" : "Close"}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className={styles.flexContainer}>
          {/* Replace Confirmation Screen */}
          {showReplaceConfirmation && existingFilesList.length > 0 && (
            <div className={uploadStyles.replaceContainer}>
              <h3 className={uploadStyles.replaceTitle}>
                Replace existing files?
              </h3>
              <p className={uploadStyles.replaceDescription}>
                The following files already exist. Select which ones you want to
                replace:
              </p>

              <div className={uploadStyles.replaceActions}>
                <button
                  onClick={selectAllReplace}
                  className={`${styles.buttonCancel} ${uploadStyles.replaceButtonSmall}`}
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllReplace}
                  className={`${styles.buttonCancel} ${uploadStyles.replaceButtonSmall}`}
                >
                  Deselect All
                </button>
              </div>

              <div className={uploadStyles.replaceGridContainer}>
                <div className={uploadStyles.replaceGrid}>
                  {existingFilesList.map((uploadFile, index) => {
                    const existing = existingFiles.get(uploadFile.key);
                    return (
                      <div
                        key={index}
                        className={`${uploadStyles.replaceTile} ${
                          uploadFile.shouldReplace
                            ? uploadStyles.replaceTileSelected
                            : ""
                        }`}
                        onClick={() => toggleReplaceFile(uploadFile.key)}
                      >
                        <div className={uploadStyles.replaceCheckbox}>
                          {uploadFile.shouldReplace ? (
                            <CheckSquare
                              size={20}
                              className={uploadStyles.checkboxIconPrimary}
                            />
                          ) : (
                            <Square
                              size={20}
                              className={uploadStyles.checkboxIconTertiary}
                            />
                          )}
                        </div>

                        {uploadFile.file.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(uploadFile.file)}
                            alt={uploadFile.file.name}
                            className={uploadStyles.fileTileImage}
                          />
                        ) : (
                          <File
                            size={48}
                            className={uploadStyles.fileTileIcon}
                          />
                        )}

                        <div className={uploadStyles.fileTileContent}>
                          <div className={uploadStyles.fileTileName}>
                            {uploadFile.file.name}
                          </div>
                          <div className={uploadStyles.fileTileSize}>
                            Existing:{" "}
                            {existing
                              ? formatFileSize(existing.size)
                              : "Unknown"}
                          </div>
                          <div className={uploadStyles.fileTileSize}>
                            New: {formatFileSize(uploadFile.file.size)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Drop Zone */}
          {!showReplaceConfirmation && !hasUploadStarted && (
            <>
              <div
                {...getRootProps({
                  onClick: (e) => {
                    // Override default click behavior to use our file input with webkitdirectory support
                    e.preventDefault();
                    fileInputRef.current?.click();
                  },
                })}
                className={`${uploadStyles.dropzone} ${
                  isDragActive ? uploadStyles.active : ""
                }`}
              >
                <input {...getInputProps()} className={uploadStyles.hiddenInput} />
                {/* File input with webkitdirectory support for directory selection */}
                <input
                  ref={fileInputRef}
                  type="file"
                  {...({ webkitdirectory: "", directory: "" } as any)}
                  multiple
                  onChange={handleFileSelect}
                  className={uploadStyles.hiddenInput}
                />
                <Upload size={48} className={uploadStyles.uploadIcon} />
                <p className={uploadStyles.dropzoneText}>
                  {isDragActive
                    ? "Drop files here"
                    : "Click or drag & drop files and directories here"}
                </p>
                <p className={uploadStyles.pathHint}>
                  Upload to: {currentPath || driveName}
                </p>
                <p className={uploadStyles.dropzoneHint}>
                  Files will maintain their local directory structure
                </p>
              </div>
            </>
          )}

          {/* File List - Grid/Tiles View */}
          {uploadFiles.length > 0 && !showReplaceConfirmation && (
            <div className={uploadStyles.fileList}>
              <h3 className={uploadStyles.fileListTitle}>
                Files to Upload ({uploadFiles.length})
                {isChecking && (
                  <span className={uploadStyles.checkingStatus}>
                    Checking for existing files...
                  </span>
                )}
              </h3>
              <div className={uploadStyles.fileGrid}>
                {uploadFiles.map((uploadFile, index) => (
                  <div
                    key={index}
                    className={uploadStyles.fileGridTile}
                  >
                    {uploadFile.status === "pending" && (
                      <button
                        onClick={() => removeFile(index)}
                        className={uploadStyles.removeFileButton}
                      >
                        <X size={14} />
                      </button>
                    )}

                    {uploadFile.file.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(uploadFile.file)}
                        alt={uploadFile.file.name}
                        className={uploadStyles.fileTileImage}
                      />
                    ) : uploadFile.file.type === "" &&
                      uploadFile.file.name.includes("/") ? (
                      <Folder
                        size={48}
                        className={uploadStyles.fileTileIcon}
                      />
                    ) : (
                      <File
                        size={48}
                        className={uploadStyles.fileTileIcon}
                      />
                    )}

                    <div className={uploadStyles.fileGridTileContent}>
                      <div className={uploadStyles.fileTileName}>
                        {uploadFile.file.name}
                      </div>

                      {uploadFile.exists && (
                        <span className={uploadStyles.fileTileExists}>
                          Exists
                        </span>
                      )}

                      <div className={uploadStyles.fileTileSizeSecondary}>
                        {formatFileSize(uploadFile.file.size)}
                      </div>

                      {uploadFile.status === "uploading" && (
                        <div className={uploadStyles.fileTileProgressContainer}>
                          <div className={uploadStyles.progressBar}>
                            <div
                              className={uploadStyles.progressFill}
                              style={{ width: `${uploadFile.progress}%` }}
                            />
                          </div>
                          <div className={uploadStyles.fileTileProgressText}>
                            {uploadFile.progress}%
                          </div>
                        </div>
                      )}

                      {uploadFile.status === "completed" && (
                        <div className={uploadStyles.fileTileStatusSuccess}>
                          ✓ Uploaded
                        </div>
                      )}

                      {uploadFile.status === "error" && (
                        <div className={uploadStyles.fileTileStatusError}>
                          ✗ Error
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overall Progress */}
          {isUploading && (
            <div className={uploadStyles.overallProgressContainer}>
              <div className={uploadStyles.overallProgressHeader}>
                <span className={uploadStyles.overallProgressLabel}>
                  Overall Progress
                </span>
                <span className={uploadStyles.overallProgressCount}>
                  {completedFiles.length} / {uploadFiles.length} files
                </span>
              </div>
              <div className={uploadStyles.progressBar}>
                <div
                  className={uploadStyles.progressFill}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              {estimatedSeconds > 0 && (
                <div className={uploadStyles.overallProgressTime}>
                  Estimated time remaining:{" "}
                  {formatTimeRemaining(estimatedSeconds)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.footer}>
          {showReplaceConfirmation ? (
            <button
              onClick={handleReplaceConfirmation}
              className={`${styles.buttonSave} ${uploadStyles.buttonAutoWidth}`}
            >
              Replace Selected ({filesToUpload.length} file
              {filesToUpload.length !== 1 ? "s" : ""})
            </button>
          ) : allDone ? (
            <button
              onClick={handleClose}
              className={`${styles.buttonSave} ${uploadStyles.buttonAutoWidth}`}
            >
              Close
            </button>
          ) : !isUploading && !isChecking ? (
            <button
              onClick={checkExistingFiles}
              disabled={uploadFiles.length === 0}
              className={`${styles.buttonSave} ${uploadStyles.buttonAutoWidth}`}
            >
              Upload {uploadFiles.length} File
              {uploadFiles.length !== 1 ? "s" : ""}
            </button>
          ) : (
            <button
              onClick={stopUpload}
              className={`${styles.buttonSave} ${uploadStyles.buttonAutoWidth} ${uploadStyles.stopUploadButton}`}
            >
              Stop Upload
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
