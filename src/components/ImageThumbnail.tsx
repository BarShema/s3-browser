"use client";

import { api } from "@/lib/api";
import { Image } from "lucide-react";
import { useEffect, useState } from "react";
import { getFileExtension } from "@/lib/utils";
import styles from "./fileIcon.module.css";

interface ImageThumbnailProps {
  src: string;
  alt: string;
  maxWidth?: number;
  maxHeight?: number;
}

export function ImageThumbnail({
  src,
  alt,
  maxWidth = 400,
  maxHeight = 400,
}: ImageThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  // Extract filename from src to get extension
  const filename = src.split('/').pop() || '';
  const extension = getFileExtension(filename);

  useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    setImageUrl(null);

    // Use the preview endpoint directly as image source
    const fetchThumbnailUrl = async () => {
      try {
        const previewUrl = api.drive.file.getPreviewUrl({
          path: src,
          maxWidth,
          maxHeight,
        });

        // Test if the preview URL loads
        const testImg = document.createElement("img");

        const handleLoad = () => {
          setImageUrl(previewUrl);
          setIsLoading(false);
        };

        const handleError = () => {
          setHasError(true);
          setIsLoading(false);
        };

        testImg.addEventListener("load", handleLoad);
        testImg.addEventListener("error", handleError);

        testImg.src = previewUrl;

        return () => {
          testImg.removeEventListener("load", handleLoad);
          testImg.removeEventListener("error", handleError);
        };
      } catch (error) {
        console.error("Error loading thumbnail:", error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    fetchThumbnailUrl();
  }, [src, maxWidth, maxHeight]);

  return (
    <div className={styles.iconContainer} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {hasError ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <Image size={24} color="#9ca3af" />
          <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
            Preview unavailable
          </div>
        </div>
      ) : isLoading ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
            Loading...
          </div>
        </div>
      ) : (
        <img
          src={imageUrl || ""}
          alt={alt || "Image thumbnail"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}
      {extension && (
        <div className={styles.extensionBox}>
          <span className={styles.extensionText}>{extension.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
