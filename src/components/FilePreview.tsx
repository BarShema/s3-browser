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
      <div className="text-center py-12 text-gray-500">
        <Folder size={48} className="mx-auto mb-4 text-gray-300" />
        <p>This folder is empty</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <div
          key={item.id}
          className={`relative group bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
            selectedItems.includes(item.id)
              ? "ring-2 ring-blue-500"
              : "border-gray-200"
          }`}
          onClick={() => handleItemClick(item)}
          onDoubleClick={() => handleItemDoubleClick(item)}
        >
          {/* Checkbox */}
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={selectedItems.includes(item.id)}
              onChange={(e) => {
                e.stopPropagation();
                handleCheckboxChange(item.id, e.target.checked);
              }}
              className="rounded border-gray-300"
            />
          </div>

          {/* Preview Area */}
          <div className="aspect-square bg-gray-50 flex items-center justify-center">
            {item.isDirectory ? (
              <Folder size={64} className="text-blue-500" />
            ) : isImage(item.name) ? (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="text-gray-400 text-sm">Image Preview</div>
              </div>
            ) : isVideo(item.name) ? (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="text-gray-400 text-sm">Video Preview</div>
              </div>
            ) : (
              <File size={64} className="text-gray-500" />
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Name */}
            <div className="mb-2">
              {editingItem === item.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={handleKeyPress}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="text-sm font-medium text-gray-900 truncate"
                  title={item.name}
                >
                  {item.name}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="text-xs text-gray-500 space-y-1">
              <div>
                {item.isDirectory
                  ? "Folder"
                  : formatFileSize((item as FileItem).size)}
              </div>
              <div>{formatDate(item.lastModified)}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-1">
              {!item.isDirectory && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(item as FileItem);
                    }}
                    className="p-1 bg-white rounded-full shadow-sm text-gray-400 hover:text-blue-600 transition-colors"
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
                      className="p-1 bg-white rounded-full shadow-sm text-gray-400 hover:text-green-600 transition-colors"
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
                className="p-1 bg-white rounded-full shadow-sm text-gray-400 hover:text-yellow-600 transition-colors"
                title="Rename"
              >
                <Edit3 size={14} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item as FileItem);
                }}
                className="p-1 bg-white rounded-full shadow-sm text-gray-400 hover:text-red-600 transition-colors"
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
