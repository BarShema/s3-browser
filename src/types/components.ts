import type { ReactNode } from "react";
import type { DirectoryItem, FileItem, Item, ViewMode } from "@/lib/utils";

// FileExplorer
export interface FileExplorerProps {
  driveName: string;
  onOpenSettings?: () => void;
}

export interface DirectorySizeInfo {
  size: number;
  objects: number;
  formattedSize: string | ReactNode;
  isLoading?: boolean;
  hasError?: boolean;
}

// DirectoryTree
export interface DirectoryNode {
  key: string;
  name: string;
  children?: DirectoryNode[];
  isExpanded?: boolean;
  level: number;
  isEmpty?: boolean;
}

export interface DirectoryTreeProps {
  driveName: string;
  currentPath: string;
  onPathClick: (path: string) => void;
  isVisible: boolean;
}

export interface DirectoryInfo {
  key: string;
  name: string;
}

// UploadModal
export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  driveName: string;
  currentPath: string;
}

export interface UploadFile {
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

export interface ExistingFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
}

// FileList
export interface FileListProps {
  items: Item[];
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  onDirectoryClick: (directory: DirectoryItem) => void;
  onFileClick: (file: FileItem) => void;
  onFileDoubleClick: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDirectoryDownload: (directory: DirectoryItem) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem, newName: string) => void;
  onDetailsClick?: (file: FileItem) => void;
  onDirectorySizeClick?: (directory: DirectoryItem) => void;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc" | null;
  onSort?: (column: string) => void;
  driveName?: string;
  previewedFileId?: string | null;
}

// FilePreview
export interface FilePreviewProps {
  items: Item[];
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  onDirectoryClick: (directory: DirectoryItem) => void;
  onFileClick: (file: FileItem) => void;
  onFileDoubleClick: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDirectoryDownload: (directory: DirectoryItem) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem, newName: string) => void;
  onDetailsClick?: (file: FileItem) => void;
  driveName: string;
  onDirectorySizeClick?: (directory: DirectoryItem) => void;
  itemsPerRow: number;
  onItemsPerRowChange: (count: number) => void;
  previewedFileId?: string | null;
}

// FileGrid
export interface FileGridProps {
  items: Item[];
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  onDirectoryClick: (directory: DirectoryItem) => void;
  onFileClick: (file: FileItem) => void;
  onFileDoubleClick: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDirectoryDownload: (directory: DirectoryItem) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem, newName: string) => void;
  onDetailsClick?: (file: FileItem) => void;
  onDirectorySizeClick?: (directory: DirectoryItem) => void;
  itemsPerRow: number;
  onItemsPerRowChange: (count: number) => void;
  previewedFileId?: string | null;
}

// FileDetailsModal
export interface FileDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  driveName: string;
}

// FileDetailsCell
export interface FileDetailsCellProps {
  file: FileItem;
  loadingMetadata: Set<string>;
  metadataCache: Map<string, string>;
  onLoadMetadata: (fileId: string) => void;
}

// FileIcon
export interface FileIconProps {
  filename: string;
  isDirectory?: boolean;
  size?: number;
  className?: string;
  showExtension?: boolean;
}

// SidePreviewPanel
export interface SidePreviewPanelProps {
  file: FileItem | null;
  driveName: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
  onRename: (file: FileItem, newName: string) => void;
  onDelete: (file: FileItem) => void;
  onEdit: (file: FileItem) => void;
  onDetailsClick?: (file: FileItem) => void;
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
}

// Toolbar
export interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onUpload: () => void;
  onNewDirectory: () => void;
  selectedCount: number;
  onDelete: () => void;
  isTreeVisible: boolean;
  onTreeToggle: () => void;
  onRefresh: () => void;
}

// FilterControls
export interface FilterControlsProps {
  nameFilter: string;
  typeFilter: string;
  extensionFilter: string;
  onNameFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onExtensionFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

// Breadcrumb
export interface BreadcrumbProps {
  currentPath: string;
  driveName: string;
  onPathClick: (path: string) => void;
  totalFiles?: number;
  totalDirectories?: number;
}

// ConfigModal
export interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (drive: string) => void;
  initialDrive?: string;
}

// SettingsModal
export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// EditModal
export interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  file: FileItem | null;
  driveName: string;
}

// DeleteProtectionModal
export interface DeleteProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToSettings: () => void;
}

// DriveCard
export interface DriveInfo {
  drive: string;
  totalSize: number;
  totalObjects: number;
  formattedSize: string;
}

export interface DriveCardProps {
  drive: string;
  onClick: () => void;
}

// CustomVideoPlayer
export interface CustomVideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  onLoad?: () => void;
  orientation?: "vertical" | "horizontal" | null;
}

// VideoPreview
export interface VideoPreviewProps {
  src: string;
  className?: string;
  isThumbnail?: boolean;
  autoPlay?: boolean;
  onLoad?: () => void;
}

// VideoThumbnail
export interface VideoThumbnailProps {
  src: string;
  alt: string;
}

// ImagePreview
export interface ImagePreviewProps {
  src: string;
  alt: string;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
  onLoad?: () => void;
}

// ImageThumbnail
export interface ImageThumbnailProps {
  src: string;
  alt: string;
  maxWidth?: number;
  maxHeight?: number;
}

// PDFPreview
export interface PDFPreviewProps {
  src: string;
  className?: string;
}

// AuthGuard
export interface AuthGuardProps {
  children: ReactNode;
}

// PageHeader
export interface PageHeaderProps {
  driveName: string;
  user: { username?: string; email?: string } | null;
  handleLogout: () => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
}

// UserMenu
export interface UserMenuProps {
  user: { username?: string; email?: string } | null;
  onLogout: () => void;
  onOpenSettings: () => void;
}

