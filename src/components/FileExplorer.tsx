"use client";

import { Breadcrumb } from "@/components/Breadcrumb";
import { EditModal } from "@/components/EditModal";
import { FileGrid } from "@/components/FileGrid";
import { FileList } from "@/components/FileList";
import { FilePreview } from "@/components/FilePreview";
import { FilterControls } from "@/components/FilterControls";
import { ImagePreview } from "@/components/ImagePreview";
import { PaginationControls } from "@/components/PaginationControls";
import { PDFPreview } from "@/components/PDFPreview";
import { Toolbar } from "@/components/Toolbar";
import { UploadModal } from "@/components/UploadModal";
import { appConfig } from "@/config/app";
import {
  DirectoryItem,
  FileItem,
  ViewMode,
  getFileExtension,
  isAudio as isAudioFile,
  isEditableText,
  isImage as isImageFile,
  isPDF,
  isVideo as isVideoFile,
} from "@/lib/utils";
import { Download, Edit3, FileText, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import styles from "./fileExplorer.module.css";
import { VideoPreview } from "./VideoPreview";

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
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [directorySizes, setDirectorySizes] = useState<{
    [key: string]: { size: number; objects: number; formattedSize: string };
  }>({});

  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(
    appConfig.defaultItemsPerPage
  );
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [nameFilter, setNameFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [extensionFilter, setExtensionFilter] = useState("");

  // Extract bucket and path from URL
  // URL format: /{bucket}/{path/to/directory}
  const getCurrentPath = useCallback(() => {
    if (!params.path) return "";
    const pathSegments = Array.isArray(params.path)
      ? params.path
      : [params.path];

    // Skip the first segment (bucket name) and get the rest as the path
    if (pathSegments.length <= 1) return "";

    // Join the path segments and decode only once
    const fullPath = pathSegments.slice(1).join("/");
    return decodeURIComponent(fullPath);
  }, [params.path]);

  const currentPath = getCurrentPath();

  // Function to fetch directory sizes asynchronously
  const fetchDirectorySizes = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/s3/directory-sizes?bucket=${encodeURIComponent(
          bucketName
        )}&prefix=${encodeURIComponent(currentPath)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch directory sizes");
      }

      const data = await response.json();
      setDirectorySizes(data.directorySizes || {});
    } catch (error) {
      console.error("Error fetching directory sizes:", error);
      // Don't show error toast for directory sizes as it's not critical
    }
  }, [bucketName, currentPath]);

  const loadFiles = useCallback(
    async (path: string = "") => {
      setIsLoading(true);
      try {
        // Construct the full path: bucketName/path
        const fullPath = path ? `${bucketName}/${path}` : bucketName;

        // Build query parameters
        const params = new URLSearchParams({
          path: fullPath,
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });

        if (nameFilter) params.append("name", nameFilter);
        if (typeFilter) params.append("type", typeFilter);
        if (extensionFilter) params.append("extension", extensionFilter);

        const response = await fetch(`/api/s3?${params.toString()}`);

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

        // Apply client-side type filters for images/videos/docs/sound
        let filteredFiles = fileItems;
        let filteredDirectories = directoryItems;

        if (typeFilter === "images") {
          // Show only image files
          filteredFiles = fileItems.filter((f: FileItem) =>
            isImageFile(f.name)
          );
          filteredDirectories = [];
        } else if (typeFilter === "videos") {
          // Show only video files
          filteredFiles = fileItems.filter((f: FileItem) =>
            isVideoFile(f.name)
          );
          filteredDirectories = [];
        } else if (typeFilter === "sound") {
          // Show only audio files
          filteredFiles = fileItems.filter((f: FileItem) =>
            isAudioFile(f.name)
          );
          filteredDirectories = [];
        } else if (typeFilter === "docs") {
          // Show only document files (including text files)
          const docExts = [
            "pdf",
            "doc",
            "docx",
            "txt",
            "rtf",
            "odt",
            "xls",
            "xlsx",
            "csv",
            "ods",
            "ppt",
            "pptx",
            "odp",
            "json",
            "xml",
            "yaml",
            "yml",
            "md",
            "js",
            "ts",
            "jsx",
            "tsx",
            "html",
            "css",
            "scss",
            "sass",
            "php",
            "py",
            "java",
            "cpp",
            "c",
            "cs",
            "go",
            "rs",
            "rb",
            "swift",
            "kt",
            "sql",
          ];
          filteredFiles = fileItems.filter((f: FileItem) =>
            docExts.includes(getFileExtension(f.name))
          );
          filteredDirectories = [];
        }

        setFiles(filteredFiles);
        setDirectories(filteredDirectories);
        setTotalPages(data.totalPages || 1);
        setTotalItems((data.totalFiles || 0) + (data.totalDirectories || 0));
        setSelectedItems([]);
      } catch (error) {
        console.error("Error loading files:", error);
        toast.error("Failed to load files");
      } finally {
        setIsLoading(false);
      }
    },
    [
      bucketName,
      currentPage,
      itemsPerPage,
      nameFilter,
      typeFilter,
      extensionFilter,
    ]
  );

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath, loadFiles]);

  // Fetch directory sizes after files are loaded
  useEffect(() => {
    if (directories.length > 0) {
      fetchDirectorySizes();
    }
  }, [directories, fetchDirectorySizes]);

  // Merge directory sizes with directory information
  const directoriesWithSizes = directories.map((dir) => {
    const sizeInfo = directorySizes[dir.key];
    return {
      ...dir,
      size: sizeInfo?.size || 0,
      formattedSize: sizeInfo?.formattedSize || "Calculating...",
      objectCount: sizeInfo?.objects || 0,
    };
  });

  // Update page title based on current path and bucket
  useEffect(() => {
    if (bucketName) {
      if (currentPath) {
        const pathParts = currentPath.split("/").filter(Boolean);
        const currentDir = pathParts[pathParts.length - 1] || bucketName;
        document.title = `${currentDir} | Idit File Browser`;
      } else {
        document.title = `${bucketName} | Idit File Browser`;
      }
    } else {
      document.title = "Idit File Browser";
    }
  }, [bucketName, currentPath]);

  const handleDirectoryClick = (directory: DirectoryItem) => {
    const newPath = directory.key;
    // Remove trailing slash if present
    const cleanPath = newPath.endsWith("/") ? newPath.slice(0, -1) : newPath;
    // Encode each path segment for the URL (including bucket name)
    const encodedPath = [bucketName, cleanPath]
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    router.push(`/${encodedPath}`);
  };

  const handleBreadcrumbClick = (path: string) => {
    // Remove trailing slash if present
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path;
    // Encode each path segment for the URL (including bucket name)
    const encodedPath = [bucketName, cleanPath]
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    router.push(`/${encodedPath}`);
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Filter handlers
  const handleNameFilterChange = (value: string) => {
    setNameFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleExtensionFilterChange = (value: string) => {
    setExtensionFilter(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleClearFilters = () => {
    setNameFilter("");
    setTypeFilter("");
    setExtensionFilter("");
    setCurrentPage(1);
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
        `/api/s3/download?path=${encodeURIComponent(
          `${bucketName}/${file.key}`
        )}`
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

  const handleDirectoryDownload = async (directory: DirectoryItem) => {
    try {
      toast.loading("Creating ZIP file...", { id: "zip-creation" });

      const response = await fetch(
        `/api/s3/download-directory?path=${encodeURIComponent(
          `${bucketName}/${directory.key}`
        )}`
      );

      if (!response.ok) {
        throw new Error("Failed to process directory");
      }

      // Check if response is JSON (large directory) or ZIP (small directory)
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        // Large directory - show detailed message
        const data = await response.json();

        const message = data.totalSizeMB
          ? `Directory too large: ${data.fileCount} files (${
              data.totalSizeMB
            } MB). ${
              data.suggestions?.[0] || "Please download individual files."
            }`
          : `Directory contains ${data.fileCount} files. Please download individual files or contact administrator for bulk download.`;

        toast.error(message, {
          id: "zip-creation",
          duration: 10000,
        });
        return;
      }

      // Small directory - download ZIP
      const zipBlob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${directory.name}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      window.URL.revokeObjectURL(url);

      toast.success(`${directory.name}.zip downloaded successfully`, {
        id: "zip-creation",
      });
    } catch (error) {
      console.error("Error downloading directory:", error);
      toast.error("Failed to download directory", { id: "zip-creation" });
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/s3?path=${encodeURIComponent(`${bucketName}/${file.key}`)}`,
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

  const allItems = [...directoriesWithSizes, ...files];

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

      <FilterControls
        nameFilter={nameFilter}
        typeFilter={typeFilter}
        extensionFilter={extensionFilter}
        onNameFilterChange={handleNameFilterChange}
        onTypeFilterChange={handleTypeFilterChange}
        onExtensionFilterChange={handleExtensionFilterChange}
        onClearFilters={handleClearFilters}
      />

      <Breadcrumb
        currentPath={currentPath}
        bucketName={bucketName}
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
                onDirectoryDownload={handleDirectoryDownload}
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
                onDirectoryDownload={handleDirectoryDownload}
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
                onDirectoryDownload={handleDirectoryDownload}
                onDelete={handleDelete}
                onRename={handleRename}
                bucketName={bucketName}
              />
            )}
          </>
        )}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

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
        <div className={styles.previewOverlay} onClick={handleClosePreview}>
          <div
            className={styles.previewContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.previewHeader}>
              <h3 className={styles.previewTitle}>{previewFile.name}</h3>
              <div className={styles.previewActions}>
                <button
                  onClick={() => handleDownload(previewFile)}
                  className={styles.actionButton}
                  title="Download"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => {
                    setEditingFile(previewFile);
                    setIsEditModalOpen(true);
                    handleClosePreview();
                  }}
                  className={styles.actionButton}
                  title="Rename"
                >
                  <Edit3 size={16} />
                </button>
                {isEditableText(previewFile.name) && (
                  <button
                    onClick={() => {
                      setEditingFile(previewFile);
                      setIsEditModalOpen(true);
                      handleClosePreview();
                    }}
                    className={styles.actionButton}
                    title="Edit Content"
                  >
                    <FileText size={16} />
                  </button>
                )}
                <button
                  onClick={() => {
                    handleDelete(previewFile);
                    handleClosePreview();
                  }}
                  className={styles.actionButton}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={handleClosePreview}
                  className={styles.closeButton}
                >
                  ✕
                </button>
              </div>
            </div>
            {isImage(previewFile.name) && (
              <ImagePreview
                src={`${bucketName}/${previewFile.key}`}
                alt={previewFile.name}
                className={styles.previewImage}
                maxWidth={1000}
                maxHeight={1000}
              />
            )}
            {isVideo(previewFile.name) && (
              <VideoPreview
                src={`${bucketName}/${previewFile.key}`}
                className={styles.previewVideo}
              />
            )}
            {isPDF(previewFile.name) && (
              <PDFPreview
                src={`${bucketName}/${previewFile.key}`}
                className={styles.previewImage}
              />
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
