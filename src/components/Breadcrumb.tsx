"use client";

import type { BreadcrumbProps } from "@/types";
import styles from "./breadcrumb.module.css";

export function Breadcrumb({
  currentPath,
  driveName,
  onPathClick,
  totalFiles = 0,
  totalDirectories = 0,
}: BreadcrumbProps) {
  const pathSegments = currentPath.split("/").filter(Boolean);

  const handlePathClick = (index: number) => {
    const newPath = pathSegments.slice(0, index + 1).join("/");
    onPathClick(newPath);
  };

  return (
    <div className={styles.container}>
      <button onClick={() => onPathClick("")} className={styles.breadcrum}>
        {driveName}
      </button>

      {pathSegments.map((segment, index) => (
        <div key={index} className={styles.segment}>
          <span className={styles.separator}>/</span>
          {currentPath.split("/").pop()?.toString() === segment ? (
            <span className={styles.breadcrum}>{segment}</span>
          ) : (
            <button
              onClick={() => handlePathClick(index)}
              className={styles.breadcrum}
            >
              {segment}
            </button>
          )}
        </div>
      ))}

      {(totalDirectories > 0 || totalFiles > 0) && (
        <div className={styles.counterWrapper}>
          <span className={styles.counter}>
            {totalDirectories} {totalDirectories === 1 ? "directory" : "directories"} | {totalFiles} {totalFiles === 1 ? "file" : "files"}
          </span>
        </div>
      )}
    </div>
  );
}
