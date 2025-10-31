'use client';

import { useState } from 'react';
import { Item, FileItem, DirectoryItem } from '@/lib/utils';
import { formatFileSize, formatDate, isImage, isVideo, formatDuration, formatDimensions } from '@/lib/utils';
import { 
  Download, 
  Trash2, 
  Edit3, 
  Eye,
  Folder,
  Calculator,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Info
} from 'lucide-react';
import { isViewModeEnabled } from '@/lib/preferences';
import { FileIcon } from './FileIcon';
import { FileDetailsCell } from './FileDetailsCell';
import styles from './fileList.module.css';

interface FileListProps {
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
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (column: string) => void;
  bucketName?: string;
}

export function FileList({
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
  onDetailsClick,
  onDirectorySizeClick,
  sortColumn,
  sortDirection,
  onSort,
  bucketName,
}: FileListProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loadingMetadata, setLoadingMetadata] = useState<Set<string>>(new Set());
  const [metadataCache, setMetadataCache] = useState<Map<string, string>>(new Map());

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
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(item => item.id));
    }
  };

  const startRename = (item: Item) => {
    setEditingItem(item.id);
    setEditValue(item.name);
  };

  const finishRename = () => {
    if (editingItem && editValue.trim()) {
      const item = items.find(i => i.id === editingItem);
      if (item && !item.isDirectory) {
        onRename(item as FileItem, editValue.trim());
      }
    }
    setEditingItem(null);
    setEditValue('');
  };

  const cancelRename = () => {
    setEditingItem(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishRename();
    } else if (e.key === 'Escape') {
      cancelRename();
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown size={14} className={styles.sortIcon} />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp size={14} className={styles.sortIcon} />;
    }
    if (sortDirection === 'desc') {
      return <ChevronDown size={14} className={styles.sortIcon} />;
    }
    return <ChevronsUpDown size={14} className={styles.sortIcon} />;
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
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerCheckbox}>
          <input
            type="checkbox"
            checked={selectedItems.length === items.length && items.length > 0}
            onChange={handleSelectAll}
            className={styles.checkbox}
          />
        </div>
        <div className={styles.headerName}>
          <button 
            className={styles.headerButton}
            onClick={() => onSort?.('name')}
          >
            Name
            {getSortIcon('name')}
          </button>
        </div>
        <div className={styles.headerSize}>
          <button 
            className={styles.headerButton}
            onClick={() => onSort?.('size')}
          >
            Size
            {getSortIcon('size')}
          </button>
        </div>
        <div className={styles.headerModified}>
          <button 
            className={styles.headerButton}
            onClick={() => onSort?.('modified')}
          >
            Modified
            {getSortIcon('modified')}
          </button>
        </div>
        <div className={styles.headerDetails}>
          <button 
            className={styles.headerButton}
            onClick={() => onSort?.('details')}
          >
            Details
            {getSortIcon('details')}
          </button>
        </div>
        <div className={styles.headerActions}>Actions</div>
      </div>

      {/* Items */}
      {items.map((item) => (
        <div
          key={item.id}
          className={`${styles.row} ${selectedItems.includes(item.id) ? styles.selected : ''}`}
          onClick={() => handleItemClick(item)}
          onDoubleClick={() => handleItemDoubleClick(item)}
        >
          <div className={styles.checkboxCell}>
            <input
              type="checkbox"
              checked={selectedItems.includes(item.id)}
              onChange={(e) => {
                e.stopPropagation();
                handleCheckboxChange(item.id, e.target.checked);
              }}
              className={styles.checkbox}
            />
          </div>

          <div className={styles.nameCell}>
            <div className={styles.iconCell}>
              <FileIcon filename={item.name} isDirectory={item.isDirectory} />
            </div>
            
            <div>
              {editingItem === item.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={handleKeyPress}
                  onClick={(e) => e.stopPropagation()}
                  className={styles.nameInput}
                  autoFocus
                />
              ) : (
                <div className={styles.nameButton}>
                  {item.name}
                </div>
              )}
            </div>
          </div>

          <div className={styles.sizeCell}>
            {item.isDirectory ? (
                <div 
                  className={`${styles.directorySize} ${
                    (item as DirectoryItem).formattedSize === "Click to calculate" ? styles.clickableSize : ""
                  }`}
                  onClick={(e) => {
                    if ((item as DirectoryItem).formattedSize === "Click to calculate" && onDirectorySizeClick) {
                      e.stopPropagation();
                      onDirectorySizeClick(item as DirectoryItem);
                    }
                  }}
                  title={(item as DirectoryItem).formattedSize === "Click to calculate" ? "Click to calculate size" : ""}
                >
                  {(item as DirectoryItem).formattedSize === "Click to calculate" ? (
                    <Calculator size={14} className={styles.calculateIcon} />
                  ) : (
                    (item as DirectoryItem).formattedSize || "Click to calculate"
                  )}
                </div>
            ) : (
              formatFileSize((item as FileItem).size)
            )}
          </div>

          <div className={styles.modifiedCell}>
            {formatDate(item.lastModified)}
          </div>

          <div className={styles.detailsCell}>
            {!item.isDirectory ? (
              <FileDetailsCell
                file={item as FileItem}
                loadingMetadata={loadingMetadata}
                metadataCache={metadataCache}
                onLoadMetadata={(fileId: string) => {
                  if (loadingMetadata.has(fileId)) return;
                  
                  setLoadingMetadata(prev => new Set(prev).add(fileId));
                  
                  const file = item as FileItem;
                  const fullPath = bucketName ? `${bucketName}/${file.key}` : file.key;
                  fetch(`/api/s3/metadata?path=${encodeURIComponent(fullPath)}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(metadata => {
                      if (metadata) {
                        const details = isVideo(file.name) && metadata.duration
                          ? formatDuration(metadata.duration)
                          : (isImage(file.name) && metadata.width && metadata.height)
                          ? formatDimensions(metadata.width, metadata.height)
                          : '';
                        setMetadataCache(prev => new Map(prev).set(fileId, details));
                      }
                    })
                    .catch(() => {})
                    .finally(() => {
                      setLoadingMetadata(prev => {
                        const next = new Set(prev);
                        next.delete(fileId);
                        return next;
                      });
                    });
                }}
              />
            ) : "-"}
          </div>

          <div className={styles.actionsCell}>
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
                <Download size={16} />
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
                      <Eye size={16} />
                    </button>
                  )}
                </>
              )}
              
              {!item.isDirectory && onDetailsClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDetailsClick(item as FileItem);
                  }}
                  className={`${styles.actionButton} blue`}
                  title="Details"
                >
                  <Info size={16} />
                </button>
              )}

              {(!isViewModeEnabled()) && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(item);
                    }}
                    className={`${styles.actionButton} yellow`}
                    title="Rename"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item as FileItem);
                    }}
                    className={`${styles.actionButton} red`}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
