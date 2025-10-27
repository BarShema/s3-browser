'use client';

import { ViewMode } from '@/lib/utils';
import { Upload, Grid3X3, List, Trash2 } from 'lucide-react';

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onUpload: () => void;
  selectedCount: number;
  onDelete: () => void;
}

export function Toolbar({ viewMode, onViewModeChange, onUpload, selectedCount, onDelete }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-gray-50">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onViewModeChange('list')}
          className={`p-2 rounded-md transition-colors ${
            viewMode === 'list'
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="List View"
        >
          <List size={20} />
        </button>
        
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-2 rounded-md transition-colors ${
            viewMode === 'grid'
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Grid View"
        >
          <Grid3X3 size={20} />
        </button>
        
        <button
          onClick={() => onViewModeChange('preview')}
          className={`p-2 rounded-md transition-colors ${
            viewMode === 'preview'
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Preview View"
        >
          <Grid3X3 size={20} />
        </button>
      </div>

      <div className="flex items-center space-x-2">
        {selectedCount > 0 && (
          <button
            onClick={onDelete}
            className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 size={16} />
            <span>Delete ({selectedCount})</span>
          </button>
        )}
        
        <button
          onClick={onUpload}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Upload size={16} />
          <span>Upload</span>
        </button>
      </div>
    </div>
  );
}
