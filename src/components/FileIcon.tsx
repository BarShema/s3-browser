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
import { getFileIcon } from "@/lib/utils";

interface FileIconProps {
  filename: string;
  isDirectory?: boolean;
  size?: number;
  className?: string;
}

export function FileIcon({ filename, isDirectory = false, size = 20, className }: FileIconProps) {
  if (isDirectory) {
    return <Folder size={size} className={className} style={{ color: "#3b82f6" }} />;
  }

  const iconType = getFileIcon(filename);

  switch (iconType) {
    case "image":
      return <FileImage size={size} className={className} style={{ color: "#10b981" }} />;
    case "video":
      return <FileVideo size={size} className={className} style={{ color: "#f59e0b" }} />;
    case "music":
      return <FileAudio size={size} className={className} style={{ color: "#8b5cf6" }} />;
    case "file-text":
      return <FileText size={size} className={className} style={{ color: "#3b82f6" }} />;
    case "table":
      return <FileSpreadsheet size={size} className={className} style={{ color: "#059669" }} />;
    case "presentation":
      return <Presentation size={size} className={className} style={{ color: "#dc2626" }} />;
    case "archive":
      return <Archive size={size} className={className} style={{ color: "#7c3aed" }} />;
    case "code":
      return <FileCode size={size} className={className} style={{ color: "#ea580c" }} />;
    case "cpu":
      return <Cpu size={size} className={className} style={{ color: "#6b7280" }} />;
    default:
      return <File size={size} className={className} style={{ color: "#6b7280" }} />;
  }
}
