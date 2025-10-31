"use client";

import { isViewModeEnabled } from "@/lib/preferences";
import { ViewMode } from "@/lib/utils";
import {
  FolderPlus,
  FolderTree,
  Grid3X3,
  List,
  Trash2,
  Upload,
} from "lucide-react";
import styles from "./toolbar.module.css";
interface ToolbarProps {
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

export function Toolbar({
  viewMode,
  onViewModeChange,
  onUpload,
  onNewDirectory,
  selectedCount,
  onDelete,
  isTreeVisible,
  onTreeToggle,
  onRefresh,
}: ToolbarProps) {
  return (
    <div className={styles.container}>
      <div className={styles.buttonGroup}>
        <button
          onClick={onTreeToggle}
          className={`${styles.viewButton} ${
            isTreeVisible ? styles.active : ""
          }`}
          title={isTreeVisible ? "Hide Directory Tree" : "Show Directory Tree"}
        >
          <FolderTree size={20} />
        </button>

        <button
          onClick={() => onViewModeChange("list")}
          className={`${styles.viewButton} ${
            viewMode === "list" ? styles.active : ""
          }`}
          title="List View"
        >
          <List size={20} />
        </button>

        <button
          onClick={() => onViewModeChange("grid")}
          className={`${styles.viewButton} ${
            viewMode === "grid" ? styles.active : ""
          }`}
          title="Grid View"
        >
          <Grid3X3 size={20} />
        </button>

        <button
          onClick={() => onViewModeChange("preview")}
          className={`${styles.viewButton} ${
            viewMode === "preview" ? styles.active : ""
          }`}
          title="Preview View"
        >
          <Grid3X3 size={20} />
        </button>
      </div>

      <div className={styles.actionsGroup}>
        <button
          onClick={onRefresh}
          className={styles.viewButton}
          title="Refresh directory structure"
        >
          ↻
        </button>
        {selectedCount > 0 && !isViewModeEnabled() && (
          <button onClick={onDelete} className={styles.deleteButton}>
            <Trash2 size={16} />
            <span>Delete ({selectedCount})</span>
          </button>
        )}

        {!isViewModeEnabled() && (
          <button
            onClick={onNewDirectory}
            className={styles.uploadButton}
            title="New Directory"
          >
            <FolderPlus size={16} />
            <span>New Directory</span>
          </button>
        )}

        {!isViewModeEnabled() && (
          <button onClick={onUpload} className={styles.uploadButton}>
            <Upload size={16} />
            <span>Upload</span>
          </button>
        )}
      </div>
    </div>
  );
}
