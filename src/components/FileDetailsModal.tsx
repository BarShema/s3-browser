"use client";

import { api } from "@/lib/api";
import { FileItem, formatDate, formatFileSize, getFileExtension, isImage, isPDF, isVideo } from "@/lib/utils";
import { X, Ruler, Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FileIcon } from "./FileIcon";
import styles from "./modal.module.css";
import fileDetailsStyles from "./fileDetailsModal.module.css";

interface FileDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  bucketName: string;
}

export function FileDetailsModal({
  isOpen,
  onClose,
  file,
  bucketName,
}: FileDetailsModalProps) {
  const [metadata, setMetadata] = useState<{
    width?: number;
    height?: number;
    duration?: number;
  } | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [showProperties, setShowProperties] = useState(true);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !file) {
      setMetadata(null);
      setIsLoadingMetadata(false);
      setShowProperties(true); // Reset to show properties when modal opens
      return;
    }

    // If file already has metadata, use it
    if (file.metadata) {
      setMetadata(file.metadata);
      return;
    }

    // Fetch metadata for images and videos
    if (isImage(file.name) || isVideo(file.name)) {
      setIsLoadingMetadata(true);
      const fullPath = bucketName ? `${bucketName}/${file.key}` : file.key;
      
      api.drive.file.getMetadata({ path: fullPath })
        .then((data) => {
          if (data) {
            setMetadata({
              width: data.width,
              height: data.height,
              duration: data.duration,
            });
          }
        })
        .catch(() => {
          // Ignore errors
        })
        .finally(() => {
          setIsLoadingMetadata(false);
        });
    }
  }, [isOpen, file, bucketName]);

  if (!isOpen || !file) {
    return null;
  }

  const extension = getFileExtension(file.name);
  const hasPreview = isImage(file.name) || isVideo(file.name) || isPDF(file.name);
  const previewUrl = hasPreview
    ? api.drive.file.getPreviewUrl({
        path: `${bucketName}/${file.key}`,
        maxWidth: 400,
        maxHeight: 400,
      })
    : null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${fileDetailsStyles.modal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>File Details</h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={`${fileDetailsStyles.content} ${!showProperties ? fileDetailsStyles.contentFullHeight : ''}`}>
            {/* Preview */}
            <div className={`${fileDetailsStyles.previewContainer} ${!showProperties ? fileDetailsStyles.previewContainerFull : ''}`}>
              {hasPreview && previewUrl ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className={fileDetailsStyles.previewImage}
                />
              ) : (
                <div className={fileDetailsStyles.iconContainer}>
                  <FileIcon filename={file.name} size={128} />
                </div>
              )}
            </div>

            {/* Properties */}
            {showProperties && (
              <div className={fileDetailsStyles.properties}>
                <button
                  className={fileDetailsStyles.closePropertiesButton}
                  onClick={() => setShowProperties(false)}
                  title="Close properties"
                >
                  <X size={16} />
                </button>
              <div className={fileDetailsStyles.propertyRow}>
                <span className={fileDetailsStyles.propertyLabel}>Name</span>
                <span className={fileDetailsStyles.propertyValue}>{file.name}</span>
              </div>

              <div className={fileDetailsStyles.propertyRow}>
                <span className={fileDetailsStyles.propertyLabel}>Size</span>
                <span className={fileDetailsStyles.propertyValue}>{formatFileSize(file.size)}</span>
              </div>

              <div className={fileDetailsStyles.propertyRow}>
                <span className={fileDetailsStyles.propertyLabel}>Type</span>
                <span className={fileDetailsStyles.propertyValue}>{extension ? extension.toUpperCase() : "Unknown"}</span>
              </div>

              <div className={fileDetailsStyles.propertyRow}>
                <span className={fileDetailsStyles.propertyLabel}>Modified</span>
                <span className={fileDetailsStyles.propertyValue}>{formatDate(file.lastModified)}</span>
              </div>

              {/* Image dimensions */}
              {isImage(file.name) && (
                <div className={fileDetailsStyles.propertyRow}>
                  <span className={fileDetailsStyles.propertyLabel}>
                    <Ruler size={14} /> Dimensions
                  </span>
                  <span className={fileDetailsStyles.propertyValue}>
                    {isLoadingMetadata ? (
                      <Loader2 size={14} className={fileDetailsStyles.spinner} />
                    ) : metadata?.width && metadata?.height ? (
                      `${metadata.width} × ${metadata.height} px`
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
              )}

              {/* Video duration */}
              {isVideo(file.name) && (
                <div className={fileDetailsStyles.propertyRow}>
                  <span className={fileDetailsStyles.propertyLabel}>
                    <Clock size={14} /> Duration
                  </span>
                  <span className={fileDetailsStyles.propertyValue}>
                    {isLoadingMetadata ? (
                      <Loader2 size={14} className={fileDetailsStyles.spinner} />
                    ) : metadata?.duration ? (
                      formatDuration(metadata.duration)
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
              )}

              {/* Video dimensions */}
              {isVideo(file.name) && metadata?.width && metadata?.height && (
                <div className={fileDetailsStyles.propertyRow}>
                  <span className={fileDetailsStyles.propertyLabel}>
                    <Ruler size={14} /> Resolution
                  </span>
                  <span className={fileDetailsStyles.propertyValue}>
                    {metadata.width} × {metadata.height} px
                  </span>
                </div>
              )}

              <div className={fileDetailsStyles.propertyRow}>
                <span className={fileDetailsStyles.propertyLabel}>Path</span>
                <span className={fileDetailsStyles.propertyValue} title={`${bucketName}/${file.key}`}>
                  {bucketName ? `${bucketName}/${file.key}` : file.key}
                </span>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

