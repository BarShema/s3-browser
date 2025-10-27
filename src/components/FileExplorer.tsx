"use client";

import { Breadcrumb } from "@/components/Breadcrumb";
import { EditModal } from "@/components/EditModal";
import { FileGrid } from "@/components/FileGrid";
import { FileList } from "@/components/FileList";
import { FilePreview } from "@/components/FilePreview";
import { Toolbar } from "@/components/Toolbar";
import { UploadModal } from "@/components/UploadModal";
import { DirectoryItem, FileItem, ViewMode } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import styles from "./fileExplorer.module.css";

interface FileExplorerProps {
  bucketName: string;
}

interface S3File {
  name: string;
  key: string;
  size: number;
  lastModified: string;
}

interface S3Directory {
  name: string;
  key: string;
  lastModified: string;
}

export function FileExplorer({ bucketName }: FileExplorerProps) {
  const params = useParams();
  const lastPathRef = useRef("");
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // Get path from URL segments
  const getPathFromUrl = useCallback(() => {
    if (!params.path) return "";
    const pathSegments = Array.isArray(params.path)
      ? params.path
      : [params.path];
    return pathSegments.join("/");
  }, [params.path]);

  // Initialize currentPath from URL on mount
  useEffect(() => {
    const urlPath = getPathFromUrl();
    if (urlPath !== "" && currentPath === "") {
      setCurrentPath(urlPath);
      lastPathRef.current = urlPath;
    }
  }, [currentPath, getPathFromUrl]);

  // Sync URL when currentPath changes (user navigation)
  useEffect(() => {
    const urlPath = getPathFromUrl();
    if (currentPath !== urlPath && currentPath !== "") {
      lastPathRef.current = currentPath;
      const newPath = currentPath ? `/${currentPath}` : "/";
      window.history.replaceState({}, "", newPath);
    }
  }, [currentPath, getPathFromUrl]);

  const loadFiles = useCallback(
    async (path: string = "") => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/s3?bucket=${bucketName}&prefix=${path}`
        );
        if (!response.ok) {
          throw new Error("Failed to load files");
        }

        const data = await response.json();

        // Convert S3 objects to our item types
        const fileItems = data.files.map((file: S3File) => ({
          ...file,
          id: Math.random().toString(36).substr(2, 9),
        }));

        const directoryItems = data.directories.map((dir: S3Directory) => ({
          ...dir,
          id: Math.random().toString(36).substr(2, 9),
        }));

        setFiles(fileItems);
        setDirectories(directoryItems);
        setSelectedItems([]);
      } catch (error) {
        console.error("Error loading files:", error);
        toast.error("Failed to load files");
      } finally {
        setIsLoading(false);
      }
    },
    [bucketName]
  );

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath, loadFiles]);

  const handleDirectoryClick = (directory: DirectoryItem) => {
    const newPath = directory.key;
    setCurrentPath(newPath);
  };

  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path);
  };

  const handleFileDoubleClick = (file: FileItem) => {
    if (
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json")
    ) {
      setEditingFile(file);
      setIsEditModalOpen(true);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (isImage(file.name) || isVideo(file.name)) {
      setPreviewFile(file);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const response = await fetch(
        `/api/s3/download?bucket=${bucketName}&key=${file.key}`
      );
      if (!response.ok) {
        throw new Error("Failed to get download URL");
      }

      const data = await response.json();
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/s3?bucket=${bucketName}&key=${file.key}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      toast.success("File deleted successfully");
      loadFiles(currentPath);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const handleRename = async (file: FileItem, newName: string) => {
    if (newName === file.name) return;

    const newKey = currentPath ? `${currentPath}/${newName}` : newName;

    try {
      const response = await fetch("/api/s3", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucket: bucketName,
          oldKey: file.key,
          newKey: newKey,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename file");
      }

      toast.success("File renamed successfully");
      loadFiles(currentPath);
    } catch (error) {
      console.error("Error renaming file:", error);
      toast.error("Failed to rename file");
    }
  };

  const handleUploadComplete = () => {
    loadFiles(currentPath);
    setIsUploadModalOpen(false);
  };

  const handleEditComplete = () => {
    loadFiles(currentPath);
    setIsEditModalOpen(false);
    setEditingFile(null);
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
  };

  const allItems = [...directories, ...files];

  return (
    <div className={styles.container}>
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onUpload={() => setIsUploadModalOpen(true)}
        selectedCount={selectedItems.length}
        onDelete={() => {
          const selectedFiles = files.filter((f) =>
            selectedItems.includes(f.id)
          );
          selectedFiles.forEach(handleDelete);
        }}
      />

      <Breadcrumb
        currentPath={currentPath}
        onPathClick={handleBreadcrumbClick}
      />

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loader}></div>
            <span className={styles.loadingText}>Loading...</span>
          </div>
        ) : (
          <>
            {viewMode === "list" && (
              <FileList
                items={allItems}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                onDirectoryClick={handleDirectoryClick}
                onFileClick={handleFileClick}
                onFileDoubleClick={handleFileDoubleClick}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            )}

            {viewMode === "grid" && (
              <FileGrid
                items={allItems}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                onDirectoryClick={handleDirectoryClick}
                onFileClick={handleFileClick}
                onFileDoubleClick={handleFileDoubleClick}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            )}

            {viewMode === "preview" && (
              <FilePreview
                items={allItems}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                onDirectoryClick={handleDirectoryClick}
                onFileClick={handleFileClick}
                onFileDoubleClick={handleFileDoubleClick}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onRename={handleRename}
                bucketName={bucketName}
              />
            )}
          </>
        )}
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onComplete={handleUploadComplete}
        bucketName={bucketName}
        currentPath={currentPath}
      />

      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onComplete={handleEditComplete}
        file={editingFile}
        bucketName={bucketName}
      />

      {previewFile && (
        <div className={styles.previewOverlay}>
          <div className={styles.previewContent}>
            <div className={styles.previewHeader}>
              <h3 className={styles.previewTitle}>{previewFile.name}</h3>
              <button
                onClick={handleClosePreview}
                className={styles.closeButton}
              >
                ✕
              </button>
            </div>
            {isImage(previewFile.name) && (
              <img
                src={`/api/s3/download?bucket=${bucketName}&key=${previewFile.key}`}
                alt={previewFile.name}
                className={styles.previewImage}
              />
            )}
            {isVideo(previewFile.name) && (
              <video controls className={styles.previewVideo}>
                <source
                  src={`/api/s3/download?bucket=${bucketName}&key=${previewFile.key}`}
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function isImage(filename: string): boolean {
  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "svg",
    "webp",
    "ico",
    "tiff",
  ];
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  return imageExtensions.includes(extension);
}

function isVideo(filename: string): boolean {
  const videoExtensions = [
    "mp4",
    "avi",
    "mov",
    "wmv",
    "flv",
    "webm",
    "mkv",
    "m4v",
  ];
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  return videoExtensions.includes(extension);
}
