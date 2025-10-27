'use client';

import { ViewMode } from '@/lib/utils';
import { Upload, Grid3X3, List, Trash2 } from 'lucide-react';
import styles from './toolbar.module.css';

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onUpload: () => void;
  selectedCount: number;
  onDelete: () => void;
}

export function Toolbar({ viewMode, onViewModeChange, onUpload, selectedCount, onDelete }: ToolbarProps) {
  return (
    <div className={styles.container}>
      <div className={styles.buttonGroup}>
        <button
          onClick={() => onViewModeChange('list')}
          className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
          title="List View"
        >
          <List size={20} />
        </button>
        
        <button
          onClick={() => onViewModeChange('grid')}
          className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
          title="Grid View"
        >
          <Grid3X3 size={20} />
        </button>
        
        <button
          onClick={() => onViewModeChange('preview')}
          className={`${styles.viewButton} ${viewMode === 'preview' ? styles.active : ''}`}
          title="Preview View"
        >
          <Grid3X3 size={20} />
        </button>
      </div>

      <div className={styles.actionsGroup}>
        {selectedCount > 0 && (
          <button
            onClick={onDelete}
            className={styles.deleteButton}
          >
            <Trash2 size={16} />
            <span>Delete ({selectedCount})</span>
          </button>
        )}
        
        <button
          onClick={onUpload}
          className={styles.uploadButton}
        >
          <Upload size={16} />
          <span>Upload</span>
        </button>
      </div>
    </div>
  );
}
