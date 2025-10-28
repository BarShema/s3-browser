"use client";

import { useEffect, useState } from "react";
import { X, Download, Edit3, Trash2, FileText } from "lucide-react";
import { FileItem, isImage, isVideo, isPDF, isEditableText, getFileExtension } from "@/lib/utils";
import { ImagePreview } from "./ImagePreview";
import { VideoPreview } from "./VideoPreview";
import styles from "./sidePreviewPanel.module.css";

interface SidePreviewPanelProps {
  file: FileItem | null;
  bucketName: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
  onRename: (file: FileItem, newName: string) => void;
  onDelete: (file: FileItem) => void;
  onEdit: (file: FileItem) => void;
}

export function SidePreviewPanel({
  file,
  bucketName,
  isOpen,
  onClose,
  onDownload,
  onRename,
  onDelete,
  onEdit,
}: SidePreviewPanelProps) {
  const [textContent, setTextContent] = useState<string>("");
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  useEffect(() => {
    if (file && isEditableText(file.name)) {
      setIsLoadingText(true);
      setTextError(null);
      
      fetch(`/api/s3/content?path=${encodeURIComponent(`${bucketName}/${file.key}`)}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch file content');
          }
          return response.text();
        })
        .then(content => {
          setTextContent(content);
          setIsLoadingText(false);
        })
        .catch(error => {
          console.error('Error loading text content:', error);
          setTextError(error.message);
          setIsLoadingText(false);
        });
    }
  }, [file, bucketName]);

  if (!isOpen || !file) {
    return null;
  }

  const extension = getFileExtension(file.name);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.fileInfo}>
            <h3 className={styles.fileName}>{file.name}</h3>
            <div className={styles.fileMeta}>
              <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
              <span className={styles.fileExtension}>{extension.toUpperCase()}</span>
            </div>
          </div>
          <div className={styles.actions}>
            <button
              onClick={() => onDownload(file)}
              className={styles.actionButton}
              title="Download"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => onRename(file, file.name)}
              className={styles.actionButton}
              title="Rename"
            >
              <Edit3 size={16} />
            </button>
            {isEditableText(file.name) && (
              <button
                onClick={() => onEdit(file)}
                className={styles.actionButton}
                title="Edit Content"
              >
                <FileText size={16} />
              </button>
            )}
            <button
              onClick={() => onDelete(file)}
              className={`${styles.actionButton} ${styles.deleteButton}`}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className={styles.closeButton}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {isImage(file.name) ? (
            <ImagePreview
              src={`${bucketName}/${file.key}`}
              alt={file.name}
              className={styles.previewContent}
              maxWidth={800}
              maxHeight={600}
            />
          ) : isVideo(file.name) ? (
            <VideoPreview
              src={`${bucketName}/${file.key}`}
              className={styles.previewContent}
            />
          ) : isPDF(file.name) ? (
            <div className={styles.pdfContainer}>
              <iframe
                src={`/api/s3/download?path=${encodeURIComponent(`${bucketName}/${file.key}`)}`}
                className={styles.pdfViewer}
                title={file.name}
              />
            </div>
          ) : isEditableText(file.name) ? (
            <div className={styles.textContainer}>
              {isLoadingText ? (
                <div className={styles.loading}>Loading content...</div>
              ) : textError ? (
                <div className={styles.error}>Error loading content: {textError}</div>
              ) : (
                <pre className={styles.textContent}>{textContent}</pre>
              )}
            </div>
          ) : (
            <div className={styles.unsupportedContainer}>
              <div className={styles.unsupportedIcon}>
                <FileText size={48} />
              </div>
              <p className={styles.unsupportedText}>
                Preview not available for this file type
              </p>
              <p className={styles.unsupportedSubtext}>
                Click download to view the file
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
