import { S3Directory, S3File } from "./s3";

export type ViewMode = "list" | "grid" | "preview";

export interface FileItem extends S3File {
  id: string;
}

export interface DirectoryItem extends S3Directory {
  id: string;
}

export type Item = FileItem | DirectoryItem;

// Get file extension
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

// Get file icon based on extension
export function getFileIcon(filename: string): string {
  const extension = getFileExtension(filename);

  const iconMap: { [key: string]: string } = {
    // Images
    jpg: "image",
    jpeg: "image",
    png: "image",
    gif: "image",
    bmp: "image",
    svg: "image",
    webp: "image",
    ico: "image",
    tiff: "image",

    // Videos
    mp4: "video",
    avi: "video",
    mov: "video",
    wmv: "video",
    flv: "video",
    webm: "video",
    mkv: "video",
    m4v: "video",

    // Audio
    mp3: "music",
    wav: "music",
    flac: "music",
    aac: "music",
    ogg: "music",
    m4a: "music",

    // Documents
    pdf: "file-text",
    doc: "file-text",
    docx: "file-text",
    txt: "file-text",
    rtf: "file-text",
    odt: "file-text",

    // Spreadsheets
    xls: "table",
    xlsx: "table",
    csv: "table",
    ods: "table",

    // Presentations
    ppt: "presentation",
    pptx: "presentation",
    odp: "presentation",

    // Archives
    zip: "archive",
    rar: "archive",
    "7z": "archive",
    tar: "archive",
    gz: "archive",

    // Code
    js: "code",
    ts: "code",
    jsx: "code",
    tsx: "code",
    html: "code",
    css: "code",
    scss: "code",
    sass: "code",
    php: "code",
    py: "code",
    java: "code",
    cpp: "code",
    c: "code",
    cs: "code",
    go: "code",
    rs: "code",
    rb: "code",
    swift: "code",
    kt: "code",
    json: "code",
    xml: "code",
    yaml: "code",
    yml: "code",
    md: "code",
    sql: "code",

    // Other
    exe: "cpu",
    msi: "cpu",
    dmg: "cpu",
    pkg: "cpu",
  };

  return iconMap[extension] || "file";
}

// Check if file is an image
export function isImage(filename: string): boolean {
  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "svg",
    "webp",
    "ico",
    "tiff",
  ];
  return imageExtensions.includes(getFileExtension(filename));
}

// Check if file is a video
export function isVideo(filename: string): boolean {
  const videoExtensions = [
    "mp4",
    "avi",
    "mov",
    "wmv",
    "flv",
    "webm",
    "mkv",
    "m4v",
  ];
  return videoExtensions.includes(getFileExtension(filename));
}

// Check if file is audio
export function isAudio(filename: string): boolean {
  const audioExtensions = ["mp3", "wav", "flac", "aac", "ogg", "m4a"];
  return audioExtensions.includes(getFileExtension(filename));
}

// Check if file is a text file that can be edited
export function isEditableText(filename: string): boolean {
  const textExtensions = [
    "txt",
    "md",
    "json",
    "xml",
    "yaml",
    "yml",
    "js",
    "ts",
    "jsx",
    "tsx",
    "html",
    "css",
    "scss",
    "sass",
    "php",
    "py",
    "java",
    "cpp",
    "c",
    "cs",
    "go",
    "rs",
    "rb",
    "swift",
    "kt",
    "sql",
  ];
  return textExtensions.includes(getFileExtension(filename));
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Format date
export function formatDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return (new Date).toLocaleDateString();
  }
}

// Generate unique ID for items
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Convert S3File to FileItem
export function s3FileToFileItem(file: S3File): FileItem {
  return {
    ...file,
    id: generateId(),
  };
}

// Convert S3Directory to DirectoryItem
export function s3DirectoryToDirectoryItem(
  directory: S3Directory
): DirectoryItem {
  return {
    ...directory,
    id: generateId(),
  };
}
