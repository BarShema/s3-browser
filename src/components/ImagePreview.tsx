"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { ImagePreviewProps } from "@/types";
import styles from "./imagePreview.module.css";

export function ImagePreview({
  src,
  alt,
  className,
  maxWidth = 800,
  maxHeight = 600,
  onLoad,
}: ImagePreviewProps) {
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const effectRef = useRef<string | null>(null);

  useEffect(() => {
    effectRef.current = src;
    let canceled = false;

    // Reset state immediately (synchronously)
    setIsLoading(true);
    setHasError(false);
    setImageUrl(null);

    const fetchThumbnailUrl = async () => {
      try {
        const previewUrl = api.drive.file.getPreviewUrl({
          path: src,
          maxWidth,
          maxHeight,
        });

        // Set the URL immediately and let the browser handle loading
        if (!canceled && effectRef.current === src) {
          setImageUrl(previewUrl);
        }
      } catch (error) {
        if (!canceled && effectRef.current === src) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    fetchThumbnailUrl();

    return () => {
      canceled = true;
    };
  }, [src, maxWidth, maxHeight]);

  if (hasError) {
    return (
      <div className={`${styles.errorContainer} ${className || ""}`}>
        Preview unavailable
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={`${styles.loadingContainer} ${className || ""}`}>
        Loading...
      </div>
    );
  }

  return (
    <img
      key={imageUrl}
      src={imageUrl}
      alt={alt}
      className={className}
      onLoad={() => {
        setIsLoading(false);
        onLoad?.();
      }}
      onError={(e) => {
        setIsLoading(false);
        setHasError(true);
      }}
    />
  );
}
