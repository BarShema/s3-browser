"use client";
import {
  DirectoryItem,
  FileItem,
  formatDate,
  formatFileSize,
  isImage,
  isVideo,
  Item,
} from "@/lib/utils";
import { Download, Edit3, Eye, Folder, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { FileIcon } from "./FileIcon";
import styles from "./fileGrid.module.css";

interface FileGridProps {
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
}

export function FileGrid({
  items,
  selectedItems,
  onSelectionChange,
  onDirectoryClick,
  onFileClick,
  onFileDoubleClick,
  onDownload,
  onDirectoryDownload,
  onDelete,
  onRename,
}: FileGridProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleItemClick = (item: Item) => {
    if (item.isDirectory) {
      onDirectoryClick(item as DirectoryItem);
    } else {
      onFileClick(item as FileItem);
    }
  };

  const handleItemDoubleClick = (item: Item) => {
    if (!item.isDirectory) {
      onFileDoubleClick(item as FileItem);
    }
  };

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, itemId]);
    } else {
      onSelectionChange(selectedItems.filter((id) => id !== itemId));
    }
  };

  const startRename = (item: Item) => {
    setEditingItem(item.id);
    setEditValue(item.name);
  };

  const finishRename = () => {
    if (editingItem && editValue.trim()) {
      const item = items.find((i) => i.id === editingItem);
      if (item && !item.isDirectory) {
        onRename(item as FileItem, editValue.trim());
      }
    }
    setEditingItem(null);
    setEditValue("");
  };

  const cancelRename = () => {
    setEditingItem(null);
    setEditValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      finishRename();
    } else if (e.key === "Escape") {
      cancelRename();
    }
  };

  if (items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Folder size={48} className={styles.emptyIcon} />
        <p>This folder is empty</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <div
          key={item.id}
          className={`${styles.item} ${
            selectedItems.includes(item.id) ? styles.selected : ""
          }`}
          onClick={() => handleItemClick(item)}
          onDoubleClick={() => handleItemDoubleClick(item)}
        >
          {/* Checkbox */}
          <div className={styles.checkbox}>
            <input
              type="checkbox"
              checked={selectedItems.includes(item.id)}
              onChange={(e) => {
                e.stopPropagation();
                handleCheckboxChange(item.id, e.target.checked);
              }}
            />
          </div>

          {/* Icon */}
          <div className={styles.iconContainer}>
            <FileIcon
              filename={item.name}
              isDirectory={item.isDirectory}
              size={48}
            />
          </div>

          {/* Name */}
          <div className={styles.name}>
            {editingItem === item.id ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={finishRename}
                onKeyDown={handleKeyPress}
                className={styles.nameInput}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className={styles.nameText} title={item.name}>
                {item.name}
              </div>
            )}
          </div>

          {/* Size and Date */}
          <div className={styles.metadata}>
            <div>
              {item.isDirectory
                ? (item as DirectoryItem).formattedSize || "Calculating..."
                : formatFileSize((item as FileItem).size)}
            </div>
            <div>{formatDate(item.lastModified)}</div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <div className={styles.actionsGroup}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.isDirectory) {
                    onDirectoryDownload(item as DirectoryItem);
                  } else {
                    onDownload(item as FileItem);
                  }
                }}
                className={styles.actionButton}
                title="Download"
              >
                <Download size={14} />
              </button>

              {!item.isDirectory && (
                <>
                  {(isImage(item.name) || isVideo(item.name)) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileClick(item as FileItem);
                      }}
                      className={`${styles.actionButton} green`}
                      title="Preview"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                </>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startRename(item);
                }}
                className={`${styles.actionButton} yellow`}
                title="Rename"
              >
                <Edit3 size={14} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item as FileItem);
                }}
                className={`${styles.actionButton} red`}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
