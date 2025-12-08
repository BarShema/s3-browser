"use client";

import { FileItem, isImage, isVideo } from "@/lib/utils";
import { Clock, Loader2, Ruler } from "lucide-react";
import type { FileDetailsCellProps } from "@/types";
import styles from "./fileList.module.css";

export function FileDetailsCell({
  file,
  loadingMetadata,
  metadataCache,
  onLoadMetadata,
}: FileDetailsCellProps) {
  const fileId = file.id;
  const isLoading = loadingMetadata.has(fileId);
  const cachedDetails = metadataCache.get(fileId);

  // If we have cached metadata, show it
  if (cachedDetails) {
    return <span>{cachedDetails}</span>;
  }

  // If loading, show spinner
  if (isLoading) {
    return <Loader2 size={16} className={styles.metadataSpinner} />;
  }

  // Show icon based on file type
  if (isImage(file.name)) {
    return (
      <Ruler
        size={16}
        className={styles.metadataIcon}
        onClick={(e) => {
          e.stopPropagation();
          onLoadMetadata(fileId);
        }}
      />
    );
  }

  if (isVideo(file.name)) {
    return (
      <Clock
        size={16}
        className={styles.metadataIcon}
        onClick={(e) => {
          e.stopPropagation();
          onLoadMetadata(fileId);
        }}
      />
    );
  }

  return <span>-</span>;
}
