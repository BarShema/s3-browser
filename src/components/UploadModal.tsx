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

          if (onProgress) {
            onProgress(progress, loaded);
          }
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
                {...getRootProps()}
                className={`${uploadStyles.dropzone} ${
                  isDragActive ? uploadStyles.active : ""
                }`}
              >
                <input {...getInputProps()} className={uploadStyles.hiddenInput} />
                <Upload size={48} className={uploadStyles.uploadIcon} />
                <p className={uploadStyles.dropzoneText}>
                  {isDragActive
                    ? "Drop files here"
                    : "Drag & drop files and directories here"}
                </p>
                <p className={uploadStyles.pathHint}>
                  Upload to: {currentPath || driveName}
                </p>
                <p className={uploadStyles.dropzoneHint}>
                  Files will maintain their local directory structure
                </p>
              </div>

              {/* Single Upload Button */}
              <div className={uploadStyles.uploadButtonContainer}>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className={uploadStyles.uploadButton}
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
                className={uploadStyles.hiddenInput}
              />
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
