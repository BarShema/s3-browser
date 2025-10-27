'use client';

import { useState } from 'react';
import { Item, FileItem, DirectoryItem } from '@/lib/utils';
import { getFileIcon, formatFileSize, formatDate, isImage, isVideo } from '@/lib/utils';
import { 
  Folder, 
  File, 
  Download, 
  Trash2, 
  Edit3, 
  Eye,
  MoreVertical 
} from 'lucide-react';

interface FileListProps {
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

export function FileList({
  items,
  selectedItems,
  onSelectionChange,
  onDirectoryClick,
  onFileClick,
  onFileDoubleClick,
  onDownload,
  onDelete,
  onRename,
}: FileListProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Folder size={48} className="mx-auto mb-4 text-gray-300" />
        <p>This folder is empty</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 py-2 px-4 bg-gray-50 border-b text-sm font-medium text-gray-600">
        <div className="col-span-1">
          <input
            type="checkbox"
            checked={selectedItems.length === items.length && items.length > 0}
            onChange={handleSelectAll}
            className="rounded border-gray-300"
          />
        </div>
        <div className="col-span-5">Name</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-3">Modified</div>
        <div className="col-span-1">Actions</div>
      </div>

      {/* Items */}
      {items.map((item) => (
        <div
          key={item.id}
          className={`grid grid-cols-12 gap-4 py-3 px-4 hover:bg-gray-50 border-b border-gray-100 ${
            selectedItems.includes(item.id) ? 'bg-blue-50' : ''
          }`}
        >
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={selectedItems.includes(item.id)}
              onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
              className="rounded border-gray-300"
            />
          </div>

          <div className="col-span-5 flex items-center space-x-3">
            <div className="flex-shrink-0">
              {item.isDirectory ? (
                <Folder size={20} className="text-blue-500" />
              ) : (
                <File size={20} className="text-gray-500" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              {editingItem === item.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={handleKeyPress}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => handleItemClick(item)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  className="text-left text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                >
                  {item.name}
                </button>
              )}
            </div>
          </div>

          <div className="col-span-2 flex items-center text-sm text-gray-600">
            {item.isDirectory ? '—' : formatFileSize((item as FileItem).size)}
          </div>

          <div className="col-span-3 flex items-center text-sm text-gray-600">
            {formatDate(item.lastModified)}
          </div>

          <div className="col-span-1 flex items-center justify-end">
            <div className="flex items-center space-x-1">
              {!item.isDirectory && (
                <>
                  <button
                    onClick={() => onDownload(item as FileItem)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Download"
                  >
                    <Download size={16} />
                  </button>
                  
                  {(isImage(item.name) || isVideo(item.name)) && (
                    <button
                      onClick={() => onFileClick(item as FileItem)}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Preview"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                </>
              )}
              
              <button
                onClick={() => startRename(item)}
                className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                title="Rename"
              >
                <Edit3 size={16} />
              </button>
              
              <button
                onClick={() => onDelete(item as FileItem)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
