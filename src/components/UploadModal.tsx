"use client";

import { api } from "@/lib/api";
import { clz } from "@/lib/clz";
import { formatFileSize } from "@/lib/utils";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
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
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => {
        let relativeKey = file.name;
        // If directory dropped and browser gives relative path, preserve structure
        if (file.webkitRelativePath && file.webkitRelativePath !== "") {
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
    noClick: true, // We'll handle clicks manually with Upload button
    noKeyboard: false,
  });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
      // Get all files in the current path
      const fullPath = currentPath ? `${driveName}/${currentPath}` : driveName;
      const allFiles: ExistingFile[] = [];

      // Fetch all pages of files
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const data = await api.drive.list({
          path: fullPath,
          page,
          limit: 1000,
        });

        data.files.forEach((file: any) => {
          allFiles.push({
            key: file.key,
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
          });
        });

        hasMore = page < (data.totalPages || 1);
        page++;
      }

      // Check which upload files already exist
      uploadFiles.forEach((uploadFile) => {
        const existing = allFiles.find((f) => f.key === uploadFile.key);
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
      console.error("Error checking existing files:", error);
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

  const uploadFile = async (
    uploadFile: UploadFile,
    onProgress?: (progress: number, uploaded: number) => void
  ) => {
    try {
      const startTime = Date.now();
      const previousUploaded = uploadFile.uploadedBytes || 0;
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

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      const formData = new FormData();
      formData.append("file", uploadFile.file);
      formData.append("drive", driveName);
      formData.append("key", uploadFile.key);

      // Get base URL from API instance and build upload URL
      const baseUrl = (api as any).drive?.file?.getBaseUrl?.() || "";
      const uploadUrl = baseUrl
        ? `${baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl}/api/drive`
        : "/api/drive";

      return new Promise<void>((resolve, reject) => {
        const fileKey = uploadFile.key;
        
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            // Don't process progress events if file is already marked as completed
            if (completedFilesRef.current.has(fileKey)) {
              return;
            }
            
            const progress = Math.round((e.loaded / e.total) * 100);
            const isComplete = e.loaded === e.total && e.total > 0;
            
            // Calculate bytes delta more accurately
            setUploadFiles((prev) => {
              const currentFile = prev.find((f) => f.key === fileKey);
              // Double-check ref in case it was updated between checks
              if (completedFilesRef.current.has(fileKey)) {
                return prev;
              }
              
              const previousBytes = currentFile?.uploadedBytes || 0;
              const bytesDelta = e.loaded - previousBytes;
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
                        uploadedBytes: e.loaded,
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
                      uploadedBytes: e.loaded,
                    }
                  : f
              );
            });
            if (onProgress) {
              onProgress(progress, e.loaded);
            }
          }
        });

        const markAsCompleted = () => {
          completedFilesRef.current.add(fileKey);
          // Force update to completed status with 100% progress
          setUploadFiles((prev) => {
            return prev.map((f) =>
              f.key === fileKey
                ? {
                    ...f,
                    status: "completed",
                    progress: 100,
                  }
                : f
            );
          });
        };

        // Additional safety: timeout to ensure progress is set to 100% if events don't fire
        let completionTimeout: NodeJS.Timeout | null = null;
        
        xhr.addEventListener("load", () => {
          if (completionTimeout) {
            clearTimeout(completionTimeout);
            completionTimeout = null;
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            markAsCompleted();
            resolve();
          } else {
            const errorMsg =
              xhr.responseText || `Upload failed with status ${xhr.status}`;
            reject(new Error(errorMsg));
          }
        });
        
        // Also handle loadend as a fallback to ensure status is updated
        // This fires after load/error, so it's a safety net
        xhr.addEventListener("loadend", () => {
          if (completionTimeout) {
            clearTimeout(completionTimeout);
            completionTimeout = null;
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            markAsCompleted();
          }
        });
        
        // Safety timeout: if loadend doesn't fire within 2 seconds, check and update
        completionTimeout = setTimeout(() => {
          if (xhr.readyState === XMLHttpRequest.DONE && xhr.status >= 200 && xhr.status < 300) {
            if (!completedFilesRef.current.has(fileKey)) {
              markAsCompleted();
            }
          }
          completionTimeout = null;
        }, 2000);

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload aborted"));
        });

        xhr.open("POST", uploadUrl);
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Upload error:", error);
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
      } catch (error) {
        // Directory might already exist, which is fine
        // Only log if it's a different error
        if (
          error instanceof Error &&
          !error.message.includes("already exists") &&
          !error.message.includes("exists")
        ) {
          console.warn(`Failed to create directory ${dirPath}:`, error);
        }
      }
    }

    // Now upload all files
    for (const file of filesToUpload) {
      if (abortRequestedRef.current) break;

      try {
        await uploadFile(file, (progress, uploaded) => {
          // Update overall progress tracking
          const currentUploaded = uploadedBytesRef.current;
          const elapsed = (Date.now() - uploadStartTimeRef.current) / 1000;
          if (elapsed > 0) {
            const rate = currentUploaded / elapsed; // bytes per second
            const remaining = totalBytesRef.current - currentUploaded;
            const estimatedSeconds =
              rate > 0 && remaining > 0 ? remaining / rate : 0;
            // Estimated time is calculated and displayed in the UI
          }
        });
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
      } catch (error) {
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
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 2000,
          background: "var(--theme-bg-primary)",
          border: "1px solid var(--theme-border-primary)",
          borderRadius: 8,
          boxShadow: "var(--theme-shadow-lg)",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          minWidth: 260,
        }}
        title="Click to open uploader"
      >
        <Upload size={16} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "var(--theme-text-secondary)",
              fontSize: 12,
              marginBottom: 6,
            }}
          >
            {completed}/{total} completed{" "}
            {uploading ? `(uploading ${uploading})` : ""}
            {estimatedSeconds > 0 && (
              <span style={{ marginLeft: 8 }}>
                ~{formatTimeRemaining(estimatedSeconds)} left
              </span>
            )}
          </div>
          <div
            style={{
              position: "relative",
              height: 6,
              background: "var(--theme-bg-tertiary)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${overallProgress}%`,
                background: "var(--theme-accent-primary)",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          title="Restore"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid var(--theme-border-secondary)",
            background: "var(--theme-bg-secondary)",
            color: "var(--theme-text-secondary)",
          }}
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
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid var(--theme-border-secondary)",
            background: "var(--theme-bg-secondary)",
            color: "var(--theme-text-secondary)",
          }}
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
        className={styles.modal}
        style={{ maxWidth: "800px", width: "90vw" }}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Upload Files</h2>
          <div style={{ display: "flex", gap: 8 }}>
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
            <div style={{ width: "100%", padding: "20px" }}>
              <h3
                style={{
                  marginBottom: "16px",
                  color: "var(--theme-text-primary)",
                }}
              >
                Replace existing files?
              </h3>
              <p
                style={{
                  marginBottom: "16px",
                  color: "var(--theme-text-secondary)",
                  fontSize: "14px",
                }}
              >
                The following files already exist. Select which ones you want to
                replace:
              </p>

              <div
                style={{ marginBottom: "12px", display: "flex", gap: "8px" }}
              >
                <button
                  onClick={selectAllReplace}
                  className={styles.buttonCancel}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllReplace}
                  className={styles.buttonCancel}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  Deselect All
                </button>
              </div>

              <div
                style={{
                  maxHeight: "500px",
                  overflowY: "auto",
                  padding: "8px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {existingFilesList.map((uploadFile, index) => {
                    const existing = existingFiles.get(uploadFile.key);
                    return (
                      <div
                        key={index}
                        style={{
                          background: "var(--theme-bg-secondary)",
                          border: uploadFile.shouldReplace
                            ? "2px solid var(--theme-accent-primary)"
                            : "1px solid var(--theme-border-primary)",
                          borderRadius: "8px",
                          padding: "12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          cursor: "pointer",
                          position: "relative",
                          minHeight: "160px",
                          transition: "all 0.2s",
                        }}
                        onClick={() => toggleReplaceFile(uploadFile.key)}
                        onMouseEnter={(e) => {
                          if (!uploadFile.shouldReplace) {
                            e.currentTarget.style.borderColor =
                              "var(--theme-accent-primary)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!uploadFile.shouldReplace) {
                            e.currentTarget.style.borderColor =
                              "var(--theme-border-primary)";
                          }
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                          }}
                        >
                          {uploadFile.shouldReplace ? (
                            <CheckSquare
                              size={20}
                              style={{ color: "var(--theme-accent-primary)" }}
                            />
                          ) : (
                            <Square
                              size={20}
                              style={{ color: "var(--theme-text-tertiary)" }}
                            />
                          )}
                        </div>

                        {uploadFile.file.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(uploadFile.file)}
                            alt={uploadFile.file.name}
                            style={{
                              width: "64px",
                              height: "64px",
                              objectFit: "cover",
                              borderRadius: "6px",
                              marginBottom: "8px",
                            }}
                          />
                        ) : (
                          <File
                            size={48}
                            style={{
                              color: "var(--theme-text-secondary)",
                              marginBottom: "8px",
                            }}
                          />
                        )}

                        <div
                          style={{
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 500,
                              color: "var(--theme-text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              width: "100%",
                              padding: "0 4px",
                            }}
                          >
                            {uploadFile.file.name}
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "var(--theme-text-secondary)",
                            }}
                          >
                            Existing:{" "}
                            {existing
                              ? formatFileSize(existing.size)
                              : "Unknown"}
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "var(--theme-text-secondary)",
                            }}
                          >
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
                {...getRootProps()}
                className={`${uploadStyles.dropzone} ${
                  isDragActive ? uploadStyles.active : ""
                }`}
              >
                <input {...getInputProps()} style={{ display: "none" }} />
                <Upload size={48} className={uploadStyles.uploadIcon} />
                <p className={uploadStyles.dropzoneText}>
                  {isDragActive
                    ? "Drop files here"
                    : "Drag & drop files and directories here"}
                </p>
                <p className={uploadStyles.pathHint}>
                  Upload to: {currentPath || driveName}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--theme-text-tertiary)",
                    marginTop: "8px",
                  }}
                >
                  Files will maintain their local directory structure
                </p>
              </div>

              {/* Single Upload Button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  margin: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={handleUploadClick}
                  style={{
                    padding: "12px 24px",
                    background: "var(--theme-accent-primary)",
                    color: "var(--theme-text-primary)",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--theme-accent-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "var(--theme-accent-primary)";
                  }}
                >
                  <Upload size={18} />
                  Upload
                </button>
              </div>

              {/* Hidden file input - supports both files and directories with webkitdirectory */}
              <input
                ref={fileInputRef}
                type="file"
                {...({ webkitdirectory: "", directory: "" } as any)}
                multiple
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </>
          )}

          {/* File List - Grid/Tiles View */}
          {uploadFiles.length > 0 && !showReplaceConfirmation && (
            <div className={uploadStyles.fileList}>
              <h3 className={uploadStyles.fileListTitle}>
                Files to Upload ({uploadFiles.length})
                {isChecking && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "12px",
                      color: "var(--theme-text-secondary)",
                    }}
                  >
                    Checking for existing files...
                  </span>
                )}
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "12px",
                  padding: "0 20px 20px",
                }}
              >
                {uploadFiles.map((uploadFile, index) => (
                  <div
                    key={index}
                    style={{
                      background: "var(--theme-bg-secondary)",
                      border: "1px solid var(--theme-border-primary)",
                      borderRadius: "8px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      position: "relative",
                      minHeight: "140px",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--theme-accent-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--theme-border-primary)";
                    }}
                  >
                    {uploadFile.status === "pending" && (
                      <button
                        onClick={() => removeFile(index)}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          color: "var(--theme-text-tertiary)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--theme-error)";
                          e.currentTarget.style.background =
                            "var(--theme-bg-error-light)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color =
                            "var(--theme-text-tertiary)";
                          e.currentTarget.style.background = "none";
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}

                    {uploadFile.file.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(uploadFile.file)}
                        alt={uploadFile.file.name}
                        style={{
                          width: "64px",
                          height: "64px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          marginBottom: "8px",
                        }}
                      />
                    ) : uploadFile.file.type === "" &&
                      uploadFile.file.name.includes("/") ? (
                      <Folder
                        size={48}
                        style={{
                          color: "var(--theme-text-secondary)",
                          marginBottom: "8px",
                        }}
                      />
                    ) : (
                      <File
                        size={48}
                        style={{
                          color: "var(--theme-text-secondary)",
                          marginBottom: "8px",
                        }}
                      />
                    )}

                    <div
                      style={{
                        width: "100%",
                        minHeight: "40px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "var(--theme-text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          width: "100%",
                          padding: "0 4px",
                        }}
                      >
                        {uploadFile.file.name}
                      </div>

                      {uploadFile.exists && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "var(--theme-warning)",
                            background: "var(--theme-bg-quinary)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          Exists
                        </span>
                      )}

                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--theme-text-secondary)",
                        }}
                      >
                        {formatFileSize(uploadFile.file.size)}
                      </div>

                      {uploadFile.status === "uploading" && (
                        <div style={{ width: "100%", marginTop: "8px" }}>
                          <div className={uploadStyles.progressBar}>
                            <div
                              className={uploadStyles.progressFill}
                              style={{ width: `${uploadFile.progress}%` }}
                            />
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "var(--theme-text-secondary)",
                              marginTop: "4px",
                            }}
                          >
                            {uploadFile.progress}%
                          </div>
                        </div>
                      )}

                      {uploadFile.status === "completed" && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--theme-success)",
                            marginTop: "4px",
                          }}
                        >
                          ✓ Uploaded
                        </div>
                      )}

                      {uploadFile.status === "error" && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "var(--theme-error)",
                            marginTop: "4px",
                          }}
                        >
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
            <div
              style={{
                padding: "20px",
                borderTop: "1px solid var(--theme-border-primary)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--theme-text-primary)",
                  }}
                >
                  Overall Progress
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--theme-text-secondary)",
                  }}
                >
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
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--theme-text-secondary)",
                    marginTop: "8px",
                  }}
                >
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
              className={styles.buttonSave}
              style={{ width: "auto" }}
            >
              Replace Selected ({filesToUpload.length} file
              {filesToUpload.length !== 1 ? "s" : ""})
            </button>
          ) : allDone ? (
            <button
              onClick={handleClose}
              className={styles.buttonSave}
              style={{
                width: "auto",
                background: "var(--theme-accent-primary)",
                color: "var(--theme-text-primary)",
              }}
            >
              Close
            </button>
          ) : !isUploading && !isChecking ? (
            <button
              onClick={checkExistingFiles}
              disabled={uploadFiles.length === 0}
              className={styles.buttonSave}
              style={{ width: "auto" }}
            >
              Upload {uploadFiles.length} File
              {uploadFiles.length !== 1 ? "s" : ""}
            </button>
          ) : (
            <button
              onClick={stopUpload}
              className={styles.buttonSave}
              style={{
                width: "auto",
                background: "var(--theme-bg-quinary)",
                color: "var(--theme-error)",
              }}
            >
              Stop Upload
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
