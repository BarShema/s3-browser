"use client";

import {
  DirectoryItem, FileItem, formatDate, formatFileSize, isImage,
  isVideo, Item
} from "@/lib/utils";
import {
  Download,
  Edit3,
  Eye,
  File,
  Folder,
  Trash2
} from "lucide-react";
import { useState } from "react";
import styles from './filePreview.module.css';
import { VideoThumbnail } from './VideoThumbnail';

interface FilePreviewProps {
  items: Item[];
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  onDirectoryClick: (directory: DirectoryItem) => void;
  onFileClick: (file: FileItem) => void;
  onFileDoubleClick: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onRename: (file: FileItem, newName: string) => void;
  bucketName: string;
}

export function FilePreview({
  items,
  selectedItems,
  onSelectionChange,
  onDirectoryClick,
  onFileClick,
  onFileDoubleClick,
  onDownload,
  onDelete,
  onRename,
  bucketName,
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
    <div className={styles.grid}>
      {items.map((item) => (
        <div
          key={item.id}
          className={`${styles.item} ${selectedItems.includes(item.id) ? styles.selected : ''}`}
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
              <Folder size={64} style={{ color: "#3b82f6" }} />
            ) : isImage(item.name) ? (
              <div className={styles.previewPlaceholder}>
                <div className={styles.previewPlaceholderText}>Image Preview</div>
              </div>
            ) : isVideo(item.name) ? (
              <VideoThumbnail 
                src={`/api/s3/download?bucket=${bucketName}&key=${item.key}`}
                alt={item.name}
                bucketName={bucketName}
              />
            ) : (
              <File size={64} style={{ color: "#6b7280" }} />
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
                {item.isDirectory
                  ? "Folder"
                  : formatFileSize((item as FileItem).size)}
              </div>
              <div>{formatDate(item.lastModified)}</div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <div className={styles.actionsGroup}>
              {!item.isDirectory && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(item as FileItem);
                    }}
                    className={styles.actionButton}
                    title="Download"
                  >
                    <Download size={14} />
                  </button>

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
