"use client";

import { useEffect, useState } from "react";
import { HardDrive, Loader2, Calculator } from "lucide-react";
import styles from "./driveCard.module.css";

interface DriveInfo {
  drive: string;
  totalSize: number;
  totalObjects: number;
  formattedSize: string;
}

interface DriveCardProps {
  drive: string;
  onClick: () => void;
}

export function DriveCard({ drive, onClick }: DriveCardProps) {
  const [driveInfo, setDriveInfo] = useState<DriveInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);

  const handleSizeClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the main onClick
    
    if (hasCalculated || isLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/s3/drive-size?drive=${encodeURIComponent(drive)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch drive size: ${response.statusText}`);
      }

      const data = await response.json();
      setDriveInfo(data);
      setHasCalculated(true);
    } catch (err) {
      console.error("Error fetching drive size:", err);
      setError(err instanceof Error ? err.message : "Failed to load drive info");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={onClick}
      className={styles.driveCard}
    >
      <div className={styles.driveHeader}>
        <HardDrive size={24} className={styles.driveIcon} />
        <span className={styles.driveName}>{drive}</span>
      </div>
      
            <div className={styles.driveInfo}>
              {isLoading ? (
                <div className={styles.loadingState}>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Calculating size...</span>
                </div>
              ) : error ? (
                <div className={styles.errorState}>
                  <span className={styles.errorText}>Size unavailable</span>
                </div>
              ) : driveInfo ? (
                <div className={styles.sizeInfo}>
                  <div className={styles.sizeValue}>{driveInfo.formattedSize}</div>
                  <div className={styles.objectsCount}>
                    {driveInfo.totalObjects.toLocaleString()} files
                  </div>
                </div>
              ) : (
                <div 
                  className={styles.clickToCalculate}
                  onClick={handleSizeClick}
                  title="Click to calculate size"
                >
                  <Calculator size={16} className={styles.calculateIcon} />
                </div>
              )}
            </div>
      
      <span className={styles.driveArrow}>→</span>
    </button>
  );
}
