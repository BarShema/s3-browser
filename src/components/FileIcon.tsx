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
  Presentation
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
  showExtension = true 
}: FileIconProps) {
  const extension = getFileExtension(filename);
  
  if (isDirectory) {
    return (
      <div 
        className={`${styles.iconContainer} ${className || ''}`}
        data-size={size <= 24 ? 'small' : size >= 48 ? 'large' : 'medium'}
      >
        <Folder size={size} style={{ color: "#3b82f6" }} />
      </div>
    );
  }

  const iconType = getFileIcon(filename);

  const renderIcon = () => {
    switch (iconType) {
      case "image":
        return <FileImage size={size} style={{ color: "#10b981" }} />;
      case "video":
        return <FileVideo size={size} style={{ color: "#f59e0b" }} />;
      case "music":
        return <FileAudio size={size} style={{ color: "#8b5cf6" }} />;
      case "file-text":
        return <FileText size={size} style={{ color: "#3b82f6" }} />;
      case "table":
        return <FileSpreadsheet size={size} style={{ color: "#059669" }} />;
      case "presentation":
        return <Presentation size={size} style={{ color: "#dc2626" }} />;
      case "archive":
        return <Archive size={size} style={{ color: "#7c3aed" }} />;
      case "code":
        return <FileCode size={size} style={{ color: "#ea580c" }} />;
      case "cpu":
        return <Cpu size={size} style={{ color: "#6b7280" }} />;
      default:
        return <File size={size} style={{ color: "#6b7280" }} />;
    }
  };

  return (
    <div 
      className={`${styles.iconContainer} ${className || ''}`}
      data-size={size <= 24 ? 'small' : size >= 48 ? 'large' : 'medium'}
    >
      {renderIcon()}
      {showExtension && extension && (
        <div className={styles.extensionBox}>
          <span className={styles.extensionText}>{extension.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
