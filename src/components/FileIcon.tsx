"use client";

import {
  File,
  Folder,
  FileText,
  FileSpreadsheet,
  Archive,
  Cpu,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  Presentation,
} from "lucide-react";
import { getFileIcon, getFileExtension } from "@/lib/utils";
import styles from "./fileIcon.module.css";

interface FileIconProps {
  filename: string;
  isDirectory?: boolean;
  size?: number;
  className?: string;
  showExtension?: boolean;
}

export function FileIcon({
  filename,
  isDirectory = false,
  size = 20,
  className,
  showExtension = true,
}: FileIconProps) {
  const extension = getFileExtension(filename);

  if (isDirectory) {
    return (
      <div
        className={`${styles.iconContainer} ${className || ""}`}
        data-size={size <= 24 ? "small" : size >= 48 ? "large" : "medium"}
      >
        <Folder size={size} className={styles.iconFolder} />
      </div>
    );
  }

  const iconType = getFileIcon(filename);

  const renderIcon = () => {
    switch (iconType) {
      case "image":
        return <FileImage size={size} className={styles.iconImage} />;
      case "video":
        return <FileVideo size={size} className={styles.iconVideo} />;
      case "music":
        return <FileAudio size={size} className={styles.iconMusic} />;
      case "file-text":
        return <FileText size={size} className={styles.iconText} />;
      case "table":
        return <FileSpreadsheet size={size} className={styles.iconTable} />;
      case "presentation":
        return <Presentation size={size} className={styles.iconPresentation} />;
      case "archive":
        return <Archive size={size} className={styles.iconArchive} />;
      case "code":
        return <FileCode size={size} className={styles.iconCode} />;
      case "cpu":
        return <Cpu size={size} className={styles.iconCpu} />;
      default:
        return <File size={size} className={styles.iconFile} />;
    }
  };

  return (
    <div
      className={`${styles.iconContainer} ${className || ""}`}
      data-size={size <= 24 ? "small" : size >= 48 ? "large" : "medium"}
    >
      {renderIcon()}
      {showExtension && extension && (
        <div className={styles.extensionBox}>
          <span className={styles.extensionText}>
            {extension.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
