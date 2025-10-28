"use client";

import styles from "./filterControls.module.css";

interface FilterControlsProps {
  nameFilter: string;
  typeFilter: string;
  extensionFilter: string;
  onNameFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onExtensionFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

export function FilterControls({
  nameFilter,
  typeFilter,
  extensionFilter,
  onNameFilterChange,
  onTypeFilterChange,
  onExtensionFilterChange,
  onClearFilters,
}: FilterControlsProps) {
  const hasActiveFilters = nameFilter || typeFilter || extensionFilter;

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="nameFilter">Filter by name:</label>
          <input
            id="nameFilter"
            type="text"
            value={nameFilter}
            onChange={(e) => onNameFilterChange(e.target.value)}
            placeholder="Enter file or folder name..."
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="typeFilter">Filter by type:</label>
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className={styles.select}
          >
            <option value="">All types</option>
            <option value="directory">Directories only</option>
            <option value="file">Files only</option>
            <option value="images">Images</option>
            <option value="videos">Videos</option>
            <option value="docs">Text Files</option>
            <option value="sound">Sound</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="extensionFilter">Filter by extension:</label>
          <input
            id="extensionFilter"
            type="text"
            value={extensionFilter}
            onChange={(e) => onExtensionFilterChange(e.target.value)}
            placeholder="e.g., .jpg, .pdf, .txt"
            className={styles.input}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className={styles.clearButton}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
