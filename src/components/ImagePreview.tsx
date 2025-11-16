"use client";

import { api } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import styles from "./imagePreview.module.css";

interface ImagePreviewProps {
  src: string;
  alt: string;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
  onLoad?: () => void;
}

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
    console.log("[ImagePreview] useEffect triggered", { src, maxWidth, maxHeight });
    effectRef.current = src;
    let canceled = false;

    // Reset state immediately (synchronously)
    setIsLoading(true);
    setHasError(false);
    setImageUrl(null);
    console.log("[ImagePreview] Reset state - loading: true, imageUrl: null");

    const fetchThumbnailUrl = async () => {
      try {
        console.log("[ImagePreview] Getting preview URL for path:", src);
        const previewUrl = api.drive.file.getPreviewUrl({
          path: src,
          maxWidth,
          maxHeight,
        });
        console.log("[ImagePreview] Preview URL generated:", previewUrl);

        // Set the URL immediately and let the browser handle loading
        if (!canceled && effectRef.current === src) {
          console.log("[ImagePreview] Setting imageUrl, will render img element");
          setImageUrl(previewUrl);
        } else {
          console.log("[ImagePreview] Effect canceled or src changed, not setting URL");
        }
      } catch (error) {
        console.error("[ImagePreview] Error getting preview URL:", error);
        if (!canceled && effectRef.current === src) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    fetchThumbnailUrl();

    return () => {
      console.log("[ImagePreview] Cleanup - canceling effect");
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

  console.log("[ImagePreview] Rendering img element", {
    imageUrl,
    hasError,
    isLoading,
    willCallOnLoad: !!onLoad,
  });

  return (
    <img
      key={imageUrl}
      src={imageUrl}
      alt={alt}
      className={className}
      onLoad={() => {
        console.log("[ImagePreview] img onLoad event fired");
        setIsLoading(false);
        console.log("[ImagePreview] Calling onLoad callback:", !!onLoad);
        onLoad?.();
      }}
      onError={(e) => {
        console.error("[ImagePreview] img onError event fired", e);
        setIsLoading(false);
        setHasError(true);
      }}
    />
  );
}
