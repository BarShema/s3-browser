"use client";

import { useEffect, useState } from "react";
import { HardDrive, Loader2 } from "lucide-react";
import styles from "./bucketCard.module.css";

interface BucketInfo {
  bucket: string;
  totalSize: number;
  totalObjects: number;
  formattedSize: string;
}

interface BucketCardProps {
  bucket: string;
  onClick: () => void;
}

export function BucketCard({ bucket, onClick }: BucketCardProps) {
  const [bucketInfo, setBucketInfo] = useState<BucketInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBucketSize = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/s3/bucket-size?bucket=${encodeURIComponent(bucket)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch bucket size: ${response.statusText}`);
        }
        
        const data = await response.json();
        setBucketInfo(data);
      } catch (err) {
        console.error("Error fetching bucket size:", err);
        setError(err instanceof Error ? err.message : "Failed to load bucket info");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBucketSize();
  }, [bucket]);

  return (
    <button
      onClick={onClick}
      className={styles.bucketCard}
    >
      <div className={styles.bucketHeader}>
        <HardDrive size={24} className={styles.bucketIcon} />
        <span className={styles.bucketName}>{bucket}</span>
      </div>
      
      <div className={styles.bucketInfo}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <Loader2 size={16} className={styles.spinner} />
            <span>Calculating size...</span>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <span className={styles.errorText}>Size unavailable</span>
          </div>
        ) : bucketInfo ? (
          <div className={styles.sizeInfo}>
            <div className={styles.sizeValue}>{bucketInfo.formattedSize}</div>
            <div className={styles.objectsCount}>
              {bucketInfo.totalObjects.toLocaleString()} objects
            </div>
          </div>
        ) : null}
      </div>
      
      <span className={styles.bucketArrow}>→</span>
    </button>
  );
}
