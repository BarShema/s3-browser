"use client";

import styles from "./breadcrumb.module.css";

interface BreadcrumbProps {
  currentPath: string;
  onPathClick: (path: string) => void;
}

export function Breadcrumb({ currentPath, onPathClick }: BreadcrumbProps) {
  const pathSegments = currentPath.split("/").filter(Boolean);

  const handlePathClick = (index: number) => {
    const newPath = pathSegments.slice(0, index + 1).join("/");
    onPathClick(newPath);
  };

  return (
    <div className={styles.container}>
      <button
        onClick={() => onPathClick("")}
        className={styles.button}
      >
        Root
      </button>

      {pathSegments.map((segment, index) => (
        <div key={index} className={styles.segment}>
          <span className={styles.separator}>/</span>
          <button
            onClick={() => handlePathClick(index)}
            className={styles.button}
          >
            {segment}
          </button>
        </div>
      ))}

      {currentPath && (
        <div className={styles.segment}>
          <span className={styles.separator}>/</span>
          <span className={styles.current}>Current</span>
        </div>
      )}
    </div>
  );
}
