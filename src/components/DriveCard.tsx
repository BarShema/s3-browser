"use client";

import { useState } from "react";
import { Calculator, HardDrive, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import type { DriveInfo, DriveCardProps } from "@/types";
import styles from "./driveCard.module.css";

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

      const data = await api.drive.getSize({ drive });
      setDriveInfo({
        drive: data.drive,
        totalSize: data.totalSize,
        totalObjects: 0, // API doesn't return this, keeping for compatibility
        formattedSize: data.formattedSize,
      });
      setHasCalculated(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load drive info"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={onClick} className={styles.driveCard}>
      <div className={styles.driveHeader}>
        <HardDrive size={24} className={styles.driveIcon} />
        <span className={styles.driveName}>{drive}</span>
      </div>

      <div className={styles.driveInfo}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <Loader2 size={16} className={styles.spinner} />
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
    </button>
  );
}
