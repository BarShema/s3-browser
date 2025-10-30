"use client";

import { clz } from "@/lib/clz";
import {
  FileItem,
  getFileExtension,
  isEditableText,
  isImage,
  isPDF,
  isVideo,
} from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  Info,
  Loader2,
  Maximize2,
  Minimize2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  onDetailsClick?: (file: FileItem) => void;
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
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
  onDetailsClick,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: SidePreviewPanelProps) {
  const [textContent, setTextContent] = useState<string>("");
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [currentPreviewKey, setCurrentPreviewKey] = useState<string>("");
  const [previousFile, setPreviousFile] = useState<FileItem | null>(null);
  const previousFileRef = useRef<FileItem | null>(null);

  // Helper function to check if mobile
  const checkIsMobile = () => {
    return typeof window !== "undefined" && window.innerWidth <= 768;
  };

  // Resizable preview panel (default 50% of viewport, stored as percentage)
  // On mobile, always use 100% width (fullscreen)
  const [previewWidthPercent, setPreviewWidthPercent] = useState(() => {
    if (typeof window !== "undefined") {
      // Check if mobile - don't use stored width on mobile
      if (checkIsMobile()) {
        return 100;
      }
      const saved = localStorage.getItem("idits-drive-preview-width");
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 20 && parsed <= 80) {
          return parsed;
        }
      }
    }
    return 50;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const justFinishedResizingRef = useRef(false);

  // Handle window resize - update width for mobile/desktop
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      if (checkIsMobile()) {
        // On mobile, always use 100% width
        setPreviewWidthPercent(100);
      } else {
        // On desktop, restore saved width or use default
        const saved = localStorage.getItem("idits-drive-preview-width");
        if (saved) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed >= 20 && parsed <= 80) {
            setPreviewWidthPercent(parsed);
          } else {
            setPreviewWidthPercent(50);
          }
        } else {
          setPreviewWidthPercent(50);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Only save width to localStorage on desktop (not mobile)
    if (typeof window !== "undefined" && !checkIsMobile()) {
      localStorage.setItem(
        "idits-drive-preview-width",
        previewWidthPercent.toString()
      );
    }
  }, [previewWidthPercent]);

  useEffect(() => {
    if (!isResizing || !isOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      const viewportWidth = window.innerWidth;
      const deltaX = startXRef.current - e.clientX; // Inverted because preview is on the right
      const deltaPercent = (deltaX / viewportWidth) * 100;
      let newWidth = startWidthRef.current + deltaPercent;

      if (newWidth < 20) newWidth = 20;
      if (newWidth > 80) newWidth = 80;

      setPreviewWidthPercent(newWidth);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(false);
      // Mark that we just finished resizing to prevent click event
      justFinishedResizingRef.current = true;
      // Reset the flag after a short delay to allow click event to be ignored
      setTimeout(() => {
        justFinishedResizingRef.current = false;
      }, 100);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, isOpen]);

  const handlePreviewResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    justFinishedResizingRef.current = false; // Reset flag when starting new resize
    startXRef.current = e.clientX;
    startWidthRef.current = previewWidthPercent;
  };

  useEffect(() => {
    if (file && isEditableText(file.name)) {
      setIsLoadingText(true);
      setTextError(null);

      fetch(
        `/api/s3/content?path=${encodeURIComponent(
          `${bucketName}/${file.key}`
        )}`
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch file content");
          }
          return response.text();
        })
        .then((content) => {
          setTextContent(content);
          setIsLoadingText(false);
        })
        .catch((error) => {
          console.error("Error loading text content:", error);
          setTextError(error.message);
          setIsLoadingText(false);
        });
    }
  }, [file, bucketName]);

  // Reset expanded state when panel closes or file changes
  useEffect(() => {
    if (!isOpen || !file) {
      setIsExpanded(false);
    }
  }, [isOpen, file]);

  // Handle preview loading state when switching between images/videos
  useEffect(() => {
    if (!file) {
      console.log("loading preview false 1");
      setIsLoadingPreview(false);
      setCurrentPreviewKey("");
      setPreviousFile(null);
      previousFileRef.current = null;
      return;
    }

    // Check if this is an image or video that needs preview
    if (isImage(file.name) || isVideo(file.name)) {
      const newKey = `${file.id}-${file.key}`;

      console.log("keys", { newKey, currentPreviewKey });

      // If it's a different file, show loader and hide current content
      if (newKey !== currentPreviewKey) {
        // Store the current file as previous before switching
        if (previousFileRef.current) {
          setPreviousFile(previousFileRef.current);
        }
        console.log("loading preview true 1");
        setIsLoadingPreview(true);
      }

      // Update the ref to track the current file for next switch
      previousFileRef.current = file;
      setCurrentPreviewKey(newKey);
    } else {
      console.log("loading preview false 2");
      setIsLoadingPreview(false);
      setCurrentPreviewKey("");
      setPreviousFile(null);
      previousFileRef.current = null;
    }
  }, [file, currentPreviewKey]);

  // Callback to handle when preview finishes loading
  const handlePreviewLoaded = () => {
    console.log("loading preview false 3");
    setIsLoadingPreview(false);
  };

  if (!isOpen || !file) {
    return null;
  }

  const extension = getFileExtension(file.name);

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Don't close if we just finished resizing
    if (isResizing || justFinishedResizingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Don't close if clicking on the resizer
    if ((e.target as HTMLElement).closest(`.${styles.previewResizer}`)) {
      return;
    }
    onClose();
  };

  // On mobile, always use 100% width regardless of state
  const effectiveWidth = checkIsMobile() ? 100 : previewWidthPercent;

  return (
    <div
      className={`${styles.overlay} ${isExpanded ? styles.expanded : ""}`}
      onClick={handleOverlayClick}
      style={isExpanded ? {} : { width: `${effectiveWidth}%` }}
    >
      {!isExpanded && (
        <div
          className={styles.previewResizer}
          onMouseDown={handlePreviewResizeStart}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.fileInfo}>
            <h3 className={styles.fileName}>{file.name}</h3>
            <div className={styles.fileMeta}>
              <span className={styles.fileSize}>
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <span className={styles.fileExtension}>
                {extension.toUpperCase()}
              </span>
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
            {onDetailsClick && (
              <button
                onClick={() => onDetailsClick(file)}
                className={styles.actionButton}
                title="Details"
              >
                <Info size={16} />
              </button>
            )}
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
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={styles.actionButton}
              title={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className={clz(styles.closeButton, styles.actionButton)}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className={styles.headerCenter}>
            <button
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                onPrev && onPrev();
              }}
              title="Previous"
              disabled={onPrev ? !canPrev : true}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                onNext && onNext();
              }}
              title="Next"
              disabled={onNext ? !canNext : true}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {isImage(file.name) || isVideo(file.name) ? (
            <>
              {isLoadingPreview && (
                <div className={styles.previewLoader}>
                  {previousFile &&
                    (isImage(previousFile.name) ||
                      isVideo(previousFile.name)) && (
                      <div className={styles.previousPreview}>
                        <img
                          src={`/api/s3/preview?path=${encodeURIComponent(
                            `${bucketName}/${file.key}`
                          )}&mw=400&mh=400`}
                          alt={file.name}
                          className={styles.previousPreviewImage}
                        />
                      </div>
                    )}
                  <div className={styles.loaderOverlay}>
                    <Loader2 size={48} className={styles.loaderIcon} />
                    <p className={styles.loaderText}>Loading...</p>
                  </div>
                </div>
              )}
              <div
                style={{
                  display: isLoadingPreview ? "none" : "block",
                  width: "100%",
                  height: "100%",
                }}
              >
                {isImage(file.name) ? (
                  <ImagePreview
                    src={`${bucketName}/${file.key}`}
                    alt={file.name}
                    className={styles.previewContent}
                    maxWidth={1000}
                    maxHeight={1000}
                    onLoad={handlePreviewLoaded}
                  />
                ) : (
                  <VideoPreview
                    src={`${bucketName}/${file.key}`}
                    className={styles.previewContent}
                    autoPlay={true}
                    onLoad={handlePreviewLoaded}
                  />
                )}
              </div>
            </>
          ) : isPDF(file.name) ? (
            <div className={styles.pdfContainer}>
              <iframe
                src={`/api/s3/download?path=${encodeURIComponent(
                  `${bucketName}/${file.key}`
                )}`}
                className={styles.pdfViewer}
                title={file.name}
              />
            </div>
          ) : isEditableText(file.name) ? (
            <div className={styles.textContainer}>
              {isLoadingText ? (
                <div className={styles.loading}>Loading content...</div>
              ) : textError ? (
                <div className={styles.error}>
                  Error loading content: {textError}
                </div>
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
