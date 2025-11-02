"use client";

import { Breadcrumb } from "@/components/Breadcrumb";
import { DirectoryTree } from "@/components/DirectoryTree";
import { EditModal } from "@/components/EditModal";
import { FileDetailsModal } from "@/components/FileDetailsModal";
import { FileGrid } from "@/components/FileGrid";
import { FileList } from "@/components/FileList";
import { FilePreview } from "@/components/FilePreview";
import { FilterControls } from "@/components/FilterControls";
import { PaginationControls } from "@/components/PaginationControls";
import { SidePreviewPanel } from "@/components/SidePreviewPanel";
import { Toolbar } from "@/components/Toolbar";
import { UploadModal } from "@/components/UploadModal";
import { appConfig } from "@/config/app";
import { apiFetch } from "@/lib/api-client";
import { isDeleteProtectionEnabled } from "@/lib/preferences";
import { useResize } from "@/lib/useResize";
import {
  DirectoryItem,
  FileItem,
  ViewMode,
  generateStableIdFromString,
  getFileExtension,
  isAudio as isAudioFile,
  isImage as isImageFile,
  isVideo as isVideoFile,
} from "@/lib/utils";
import { Loader2, X } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DeleteProtectionModal } from "./DeleteProtectionModal";
import styles from "./fileExplorer.module.css";

interface FileExplorerProps {
  bucketName: string;
  onOpenSettings?: () => void;
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

export function FileExplorer({
  bucketName,
  onOpenSettings,
}: FileExplorerProps) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("idits-drive-view-mode");
      return (saved as ViewMode) || "list";
    }
    return "list";
  });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [detailsFile, setDetailsFile] = useState<FileItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteProtectionModalOpen, setIsDeleteProtectionModalOpen] =
    useState(false);
  const [directorySizes, setDirectorySizes] = useState<{
    [key: string]: {
      size: number;
      objects: number;
      formattedSize: string | React.ReactNode;
      isLoading?: boolean;
      hasError?: boolean;
    };
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

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );

  // Grid/Preview items per row state
  const [gridItemsPerRow, setGridItemsPerRow] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("idits-drive-grid-items-per-row");
      return saved
        ? parseInt(saved, 10)
        : appConfig.gridView.defaultItemsPerRow;
    }
    return appConfig.gridView.defaultItemsPerRow;
  });
  const [previewItemsPerRow, setPreviewItemsPerRow] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("idits-drive-preview-items-per-row");
      return saved
        ? parseInt(saved, 10)
        : appConfig.previewView.defaultItemsPerRow;
    }
    return appConfig.previewView.defaultItemsPerRow;
  });

  // Directory tree visibility state
  const [isTreeVisible, setIsTreeVisible] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("idits-drive-tree-visible");
      return saved === "true";
    }
    return false;
  });

  // Resizable tree sidebar
  const treeResize = useResize({
    initialWidth: 280,
    minWidth: 200,
    maxWidth: 600,
    storageKey: "idits-drive-tree-width",
  });

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

  // Handle view mode change and save to localStorage
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("idits-drive-view-mode", mode);
    }
  }, []);

  // Handle grid items per row change
  const handleGridItemsPerRowChange = useCallback((newCount: number) => {
    setGridItemsPerRow(newCount);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "idits-drive-grid-items-per-row",
        newCount.toString()
      );
    }
  }, []);

  // Handle preview items per row change
  const handlePreviewItemsPerRowChange = useCallback((newCount: number) => {
    setPreviewItemsPerRow(newCount);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "idits-drive-preview-items-per-row",
        newCount.toString()
      );
    }
  }, []);

  // Handle tree visibility toggle
  const handleTreeToggle = useCallback(() => {
    const newVisibility = !isTreeVisible;
    setIsTreeVisible(newVisibility);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "idits-drive-tree-visible",
        newVisibility.toString()
      );
    }
  }, [isTreeVisible]);

  // Function to calculate individual directory size on click
  const calculateDirectorySize = useCallback(
    async (directory: DirectoryItem) => {
      const dirKey = directory.key;

      // If already calculated or calculating, return
      if (directorySizes[dirKey] && !directorySizes[dirKey].isLoading) {
        return;
      }

      // Set loading state
      setDirectorySizes((prev) => ({
        ...prev,
        [dirKey]: {
          size: 0,
          objects: 0,
          formattedSize: <Loader2 size={16} className={styles.spinner} />,
          isLoading: true,
        },
      }));

      try {
        const response = await apiFetch(
          `${
            appConfig.apiBaseUrl
          }/api/s3/directory-size?path=${encodeURIComponent(
            `${bucketName}/${dirKey}`
          )}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch directory size: ${response.statusText}`
          );
        }

        const data = await response.json();

        // Check if there's an error in the response
        if (data.error) {
          setDirectorySizes((prev) => ({
            ...prev,
            [dirKey]: {
              size: 0,
              objects: 0,
              formattedSize: (
                <X
                  size={16}
                  className={styles.errorIcon}
                  onClick={() => calculateDirectorySize(directory)}
                />
              ),
              isLoading: false,
              hasError: true,
            },
          }));

          // Revert back to calculator after 5 seconds
          setTimeout(() => {
            setDirectorySizes((prev) => ({
              ...prev,
              [dirKey]: {
                size: 0,
                objects: 0,
                formattedSize: "",
                isLoading: false,
                hasError: false,
              },
            }));
          }, 5000);
        } else {
          setDirectorySizes((prev) => ({
            ...prev,
            [dirKey]: {
              size: data.totalSize,
              objects: data.totalObjects,
              formattedSize: data.formattedSize,
              isLoading: false,
            },
          }));
        }
      } catch (error) {
        console.error("Error calculating directory size:", error);
        setDirectorySizes((prev) => ({
          ...prev,
          [dirKey]: {
            size: 0,
            objects: 0,
            formattedSize: (
              <X
                size={16}
                className={styles.errorIcon}
                onClick={() => calculateDirectorySize(directory)}
              />
            ),
            isLoading: false,
            hasError: true,
          },
        }));

        // Revert back to calculator after 5 seconds
        setTimeout(() => {
          setDirectorySizes((prev) => ({
            ...prev,
            [dirKey]: {
              size: 0,
              objects: 0,
              formattedSize: "",
              isLoading: false,
              hasError: false,
            },
          }));
        }, 5000);
      }
    },
    [bucketName, directorySizes]
  );

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

        console.log("appConfig.apiBaseUrl", appConfig.apiBaseUrl);
        const response = await apiFetch(
          `${appConfig.apiBaseUrl}/api/s3?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to load files");
        }

        const data = await response.json();

        // Convert S3 objects to our item types (deterministic IDs based on key)
        const fileItems = data.files.map((file: S3File) => ({
          ...file,
          id: generateStableIdFromString(file.key),
          isDirectory: false,
          lastModified: new Date(file.lastModified),
        }));

        const directoryItems = data.directories.map((dir: S3Directory) => ({
          ...dir,
          id: generateStableIdFromString(dir.key),
          isDirectory: true,
          lastModified: new Date(dir.lastModified),
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

  useEffect(() => {
    const previewKey = searchParams?.get("preview");
    if (previewKey && files.length > 0) {
      const found = files.find((f) => f.key === previewKey);
      if (found) {
        setPreviewFile(found);
        setIsPreviewOpen(true);
      }
    }
  }, [searchParams, files]);

  // Merge directory sizes with directory information
  const directoriesWithSizes = directories.map((dir) => {
    const sizeInfo = directorySizes[dir.key];
    return {
      ...dir,
      size: sizeInfo?.size || 0,
      formattedSize: sizeInfo?.formattedSize || "Click to calculate",
      objectCount: sizeInfo?.objects || 0,
      isLoading: sizeInfo?.isLoading || false,
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
      .map((segment) =>
        segment.split("/").map((segment) => encodeURIComponent(segment))
      )
      .flat()
      .join("/");

    router.push(`/${encodedPath}`);
  };

  const handleBreadcrumbClick = (path: string) => {
    // Remove trailing slash if present
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path;
    // Encode each path segment for the URL (including bucket name)
    const encodedPath = [bucketName, cleanPath]
      .filter(Boolean)
      .map((segment) =>
        segment.split("/").map((segment) => encodeURIComponent(segment))
      )
      .flat()
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

  const handleDetailsClick = (file: FileItem) => {
    setDetailsFile(file);
    setIsDetailsModalOpen(true);
  };

  const handleFileClick = (file: FileItem) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("preview", file.key);
      router.push(url.pathname + "?" + url.searchParams.toString(), {
        scroll: false,
      });
    } catch {}
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const response = await apiFetch(
        `${appConfig.apiBaseUrl}/api/s3/download?path=${encodeURIComponent(
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

      const response = await apiFetch(
        `${
          appConfig.apiBaseUrl
        }/api/s3/download-directory?path=${encodeURIComponent(
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

  // Internal delete function without confirmation
  const deleteFile = async (file: FileItem): Promise<boolean> => {
    try {
      console.log("appConfig.apiBaseUrl", appConfig.apiBaseUrl);
      const response = await apiFetch(
        `${appConfig.apiBaseUrl}/api/s3?path=${encodeURIComponent(
          `${bucketName}/${file.key}`
        )}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  };

  const handleDelete = async (file: FileItem) => {
    // Check delete protection
    if (isDeleteProtectionEnabled()) {
      setIsDeleteProtectionModalOpen(true);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    const success = await deleteFile(file);
    if (success) {
      toast.success("File deleted successfully");
      // Close preview panel if the deleted file was being previewed
      if (previewFile && previewFile.key === file.key) {
        setIsPreviewOpen(false);
        setPreviewFile(null);
      }
      loadFiles(currentPath);
    } else {
      toast.error("Failed to delete file");
    }
  };

  const handleRename = async (file: FileItem, newName: string) => {
    if (newName === file.name) return;

    const newKey = currentPath ? `${currentPath}/${newName}` : newName;

    try {
      const response = await apiFetch("/api/s3", {
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
  const handleEdit = (file: FileItem) => {
    setEditingFile(file);
    setIsEditModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
    setIsPreviewOpen(false);
  };

  // Sorting function
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Same column clicked - cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      // Different column clicked - start with asc
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Apply sorting to items
  const getSortedItems = (items: (FileItem | DirectoryItem)[]) => {
    if (!sortColumn || !sortDirection) {
      return items;
    }

    return [...items].sort((a, b) => {
      // Always keep directories on top
      if (a.isDirectory && !b.isDirectory) {
        return -1;
      }
      if (!a.isDirectory && b.isDirectory) {
        return 1;
      }

      // If both are directories or both are files, sort within their group
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortColumn) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "size":
          aValue = a.isDirectory
            ? (a as DirectoryItem).size || 0
            : (a as FileItem).size || 0;
          bValue = b.isDirectory
            ? (b as DirectoryItem).size || 0
            : (b as FileItem).size || 0;
          break;
        case "modified":
          aValue = new Date(a.lastModified).getTime();
          bValue = new Date(b.lastModified).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const allItems = getSortedItems([...directoriesWithSizes, ...files]);

  return (
    <div className={styles.container}>
      {/* Directory Tree Sidebar */}
      {isTreeVisible && (
        <>
          <div
            className={styles.treeSidebar}
            style={{
              width: `${treeResize.width}px`,
              minWidth: `${treeResize.width}px`,
            }}
          >
            <DirectoryTree
              bucketName={bucketName}
              currentPath={currentPath}
              onPathClick={handleBreadcrumbClick}
              isVisible={isTreeVisible}
            />
          </div>
          <div
            className={styles.treeResizer}
            onMouseDown={treeResize.handleMouseDown}
          />
        </>
      )}

      <div
        className={`${styles.mainContent} ${
          isTreeVisible ? styles.withTree : ""
        }`}
      >
        <div className={styles.toolbarContainer}>
          <Toolbar
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onUpload={() => setIsUploadModalOpen(true)}
            onNewDirectory={async () => {
              const name = prompt("New directory name:")?.trim();
              if (!name) return;
              // Basic sanitize
              const safe = name.replace(/^[/.]+|[\\]/g, "");
              const dirKey = currentPath ? `${currentPath}/${safe}` : safe;
              try {
                const res = await apiFetch("/api/s3", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ bucket: bucketName, dirKey }),
                });
                if (!res.ok) throw new Error("Failed to create directory");
                toast.success("Directory created");
                loadFiles(currentPath);
              } catch (e) {
                console.error(e);
                toast.error("Could not create directory");
              }
            }}
            selectedCount={selectedItems.length}
            onDelete={async () => {
              // Check delete protection
              if (isDeleteProtectionEnabled()) {
                setIsDeleteProtectionModalOpen(true);
                return;
              }

              const selectedFiles = files.filter((f) =>
                selectedItems.includes(f.id)
              );

              // Confirm deletion for multiple files
              if (
                !confirm(
                  `Are you sure you want to delete ${selectedFiles.length} file(s)?`
                )
              ) {
                return;
              }

              // Delete all files and then refresh once
              const deletePromises = selectedFiles.map((file) =>
                deleteFile(file)
              );
              const results = await Promise.all(deletePromises);

              const successCount = results.filter((r) => r === true).length;
              if (successCount > 0) {
                toast.success(`${successCount} file(s) deleted successfully`);
                loadFiles(currentPath);
              } else {
                toast.error("Failed to delete files");
              }
            }}
            isTreeVisible={isTreeVisible}
            onTreeToggle={handleTreeToggle}
            onRefresh={() => loadFiles(currentPath)}
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
        </div>

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
                  onDetailsClick={handleDetailsClick}
                  onDirectorySizeClick={calculateDirectorySize}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  bucketName={bucketName}
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
                  onDirectorySizeClick={calculateDirectorySize}
                  itemsPerRow={gridItemsPerRow}
                  onItemsPerRowChange={handleGridItemsPerRowChange}
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
                  onDetailsClick={handleDetailsClick}
                  bucketName={bucketName}
                  onDirectorySizeClick={calculateDirectorySize}
                  itemsPerRow={previewItemsPerRow}
                  onItemsPerRowChange={handlePreviewItemsPerRowChange}
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
      </div>
      {/* Side Preview Panel */}
      <SidePreviewPanel
        file={previewFile}
        bucketName={bucketName}
        isOpen={isPreviewOpen}
        onClose={() => {
          handleClosePreview();
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("preview");
            const qs = url.searchParams.toString();
            router.replace(url.pathname + (qs ? "?" + qs : ""), {
              scroll: false,
            });
          } catch {}
        }}
        onDownload={handleDownload}
        onRename={handleRename}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onDetailsClick={handleDetailsClick}
        onPrev={() => {
          if (!previewFile) return;
          const idx = files.findIndex((f) => f.key === previewFile.key);
          if (idx > 0) {
            const nextFile = files[idx - 1];
            setPreviewFile(nextFile);
            try {
              const url = new URL(window.location.href);
              url.searchParams.set("preview", nextFile.key);
              router.replace(url.pathname + "?" + url.searchParams.toString(), {
                scroll: false,
              });
            } catch {}
          }
        }}
        onNext={() => {
          if (!previewFile) return;
          const idx = files.findIndex((f) => f.key === previewFile.key);
          if (idx >= 0 && idx < files.length - 1) {
            const nextFile = files[idx + 1];
            setPreviewFile(nextFile);
            try {
              const url = new URL(window.location.href);
              url.searchParams.set("preview", nextFile.key);
              router.replace(url.pathname + "?" + url.searchParams.toString(), {
                scroll: false,
              });
            } catch {}
          }
        }}
        canPrev={(() => {
          if (!previewFile) return false;
          const idx = files.findIndex((f) => f.key === previewFile.key);
          return idx > 0;
        })()}
        canNext={(() => {
          if (!previewFile) return false;
          const idx = files.findIndex((f) => f.key === previewFile.key);
          return idx >= 0 && idx < files.length - 1;
        })()}
      />
      <DeleteProtectionModal
        isOpen={isDeleteProtectionModalOpen}
        onClose={() => setIsDeleteProtectionModalOpen(false)}
        onGoToSettings={() => {
          setIsDeleteProtectionModalOpen(false);
          if (onOpenSettings) {
            onOpenSettings();
          }
        }}
      />
      <FileDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        file={detailsFile}
        bucketName={bucketName}
      />
    </div>
  );
}
