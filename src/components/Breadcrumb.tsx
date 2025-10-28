"use client";

import styles from "./breadcrumb.module.css";

interface BreadcrumbProps {
  currentPath: string;
  bucketName: string;
  onPathClick: (path: string) => void;
}

export function Breadcrumb({
  currentPath,
  bucketName,
  onPathClick,
}: BreadcrumbProps) {
  const pathSegments = currentPath.split("/").filter(Boolean);

  const handlePathClick = (index: number) => {
    const newPath = pathSegments.slice(0, index + 1).join("/");
    onPathClick(newPath);
  };

  return (
    <div className={styles.container}>
      <button onClick={() => onPathClick("")} className={styles.breadcrum}>
        {bucketName}
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
    </div>
  );
}
