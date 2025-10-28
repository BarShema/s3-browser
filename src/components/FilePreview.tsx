"use client";

import { appConfig } from "@/config/app";
import {
  DirectoryItem,
  FileItem,
  formatDate,
  formatFileSize,
  isImage,
  isPDF,
  isVideo,
  Item,
} from "@/lib/utils";
import {
  Calculator,
  Download,
  Edit3,
  Eye,
  Folder,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { FileIcon } from "./FileIcon";
import styles from "./filePreview.module.css";
import { ImageThumbnail } from "./ImageThumbnail";
import { PDFPreview } from "./PDFPreview";
import { VideoPreview } from "./VideoPreview";

interface FilePreviewProps {
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
  bucketName: string;
  onDirectorySizeClick?: (directory: DirectoryItem) => void;
  itemsPerRow: number;
  onItemsPerRowChange: (count: number) => void;
}

export function FilePreview({
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
  bucketName,
  onDirectorySizeClick,
  itemsPerRow,
  onItemsPerRowChange,
}: FilePreviewProps) {
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
    <div className={styles.container}>
      {/* Grid Controls */}
      <div className={styles.gridControlsButtons}>
        <button
          className={styles.gridControlButton}
          onClick={() =>
            onItemsPerRowChange(
              Math.max(appConfig.previewView.minItemsPerRow, itemsPerRow - 1)
            )
          }
          disabled={itemsPerRow <= appConfig.previewView.minItemsPerRow}
          title="Decrease items per row"
        >
          <Minus size={16} />
        </button>
        <span className={styles.gridControlCount}>{itemsPerRow}</span>
        <button
          className={styles.gridControlButton}
          onClick={() =>
            onItemsPerRowChange(
              Math.min(appConfig.previewView.maxItemsPerRow, itemsPerRow + 1)
            )
          }
          disabled={itemsPerRow >= appConfig.previewView.maxItemsPerRow}
          title="Increase items per row"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Grid */}
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)` }}
      >
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

            {/* Preview Area */}
            <div className={styles.previewArea}>
              {item.isDirectory ? (
                <FileIcon filename={item.name} isDirectory={true} size={64} />
              ) : isImage(item.name) ? (
                <ImageThumbnail
                  src={`${bucketName}/${item.key}`}
                  alt={item.name}
                  maxWidth={400}
                  maxHeight={400}
                />
              ) : isVideo(item.name) ? (
                <VideoPreview
                  src={`${bucketName}/${item.key}`}
                  className={styles.previewThumbnail}
                />
              ) : isPDF(item.name) ? (
                <PDFPreview
                  src={`${bucketName}/${item.key}`}
                  className={styles.previewThumbnail}
                />
              ) : (
                <FileIcon filename={item.name} size={64} />
              )}
            </div>

            {/* Content */}
            <div className={styles.content}>
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

              {/* Metadata */}
              <div className={styles.metadata}>
                <div>
                  {item.isDirectory ? (
                    <div
                      className={`${styles.directorySize} ${
                        (item as DirectoryItem).formattedSize ===
                        "Click to calculate"
                          ? styles.clickableSize
                          : ""
                      }`}
                      onClick={(e) => {
                        if (
                          (item as DirectoryItem).formattedSize ===
                            "Click to calculate" &&
                          onDirectorySizeClick
                        ) {
                          e.stopPropagation();
                          onDirectorySizeClick(item as DirectoryItem);
                        }
                      }}
                      title={
                        (item as DirectoryItem).formattedSize ===
                        "Click to calculate"
                          ? "Click to calculate size"
                          : ""
                      }
                    >
                      {(item as DirectoryItem).formattedSize ===
                      "Click to calculate" ? (
                        <Calculator
                          size={12}
                          className={styles.calculateIcon}
                        />
                      ) : (
                        (item as DirectoryItem).formattedSize ||
                        "Click to calculate"
                      )}
                    </div>
                  ) : (
                    formatFileSize((item as FileItem).size)
                  )}
                </div>
                <div>{formatDate(item.lastModified)}</div>
              </div>
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
    </div>
  );
}
