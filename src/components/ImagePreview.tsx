"use client";

import { useEffect, useRef, useState } from "react";

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
  const effectRef = useRef<string | null>(null);

  useEffect(() => {
    effectRef.current = src;
    let canceled = false;
    const fetchThumbnailUrl = async () => {
      try {
        const previewUrl = `/api/s3/preview?path=${encodeURIComponent(
          src
        )}&mw=${maxWidth}&mh=${maxHeight}`;
        const testImg = new window.Image();
        testImg.onload = () => {
          if (!canceled && effectRef.current === src) {
            setHasError(false);
            setImageUrl(previewUrl);
          }
        };
        testImg.onerror = () => {
          if (!canceled && effectRef.current === src) {
            setHasError(true);
          }
        };
        testImg.src = previewUrl;
      } catch (error) {
        console.error("Error loading thumbnail:", error);
        if (!canceled && effectRef.current === src) {
          setHasError(true);
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
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f4f6",
          color: "#9ca3af",
        }}
      >
        Preview unavailable
      </div>
    );
  }
  if (!imageUrl) {
    return null;
  }
  return (
    <img
      key={imageUrl}
      src={imageUrl}
      alt={alt}
      className={className}
      onLoad={() => {
        onLoad?.();
      }}
    />
  );
}
