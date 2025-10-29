"use client";

import { getFileExtension } from "@/lib/utils";
import { useEffect, useState } from "react";
import { CustomVideoPlayer } from "./CustomVideoPlayer";
import styles from "./fileIcon.module.css";

interface VideoPreviewProps {
  src: string;
  className?: string;
  isThumbnail?: boolean; // If true, show thumbnail image; if false, show video player
  autoPlay?: boolean;
  onLoad?: () => void;
}

export function VideoPreview({
  src,
  className,
  isThumbnail = false,
  autoPlay = false,
  onLoad,
}: VideoPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Extract filename from src to get extension
  const filename = src.split("/").pop() || "";
  const extension = getFileExtension(filename);

  useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    setPreviewUrl(null);
    setVideoUrl(null);

    // Fetch video download URL
    const fetchVideoUrl = async () => {
      try {
        const downloadResponse = await fetch(
          `/api/s3/download?path=${encodeURIComponent(src)}`
        );

        if (!downloadResponse.ok) {
          throw new Error("Failed to get video URL");
        }

        const downloadData = await downloadResponse.json();
        setVideoUrl(downloadData.downloadUrl);

        if (isThumbnail) {
          // For thumbnails, also fetch the preview image
          const previewEndpointUrl = `/api/s3/preview?path=${encodeURIComponent(
            src
          )}&mw=800&mh=600`;
          const testImg = document.createElement("img");

          const handleLoad = () => {
            setPreviewUrl(previewEndpointUrl);
            setIsLoading(false);
          };

          const handleError = () => {
            setHasError(true);
            setIsLoading(false);
          };

          testImg.addEventListener("load", handleLoad);
          testImg.addEventListener("error", handleError);

          testImg.src = previewEndpointUrl;

          return () => {
            testImg.removeEventListener("load", handleLoad);
            testImg.removeEventListener("error", handleError);
          };
        } else {
          // For video player, just set loading to false
          setIsLoading(false);
          onLoad?.();
        }
      } catch (error) {
        console.error("Error loading video:", error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    fetchVideoUrl();
  }, [src, isThumbnail]);

  // Thumbnail mode (for grid/preview views)
  if (isThumbnail) {
    return (
      <div
        className={styles.iconContainer}
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
        {hasError ? (
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
            Video preview unavailable
          </div>
        ) : isLoading ? (
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
            Loading video preview...
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="Video Preview"
            className={className}
            style={{
              maxWidth: "100%",
              maxHeight: "70vh",
              objectFit: "contain",
            }}
          />
        ) : (
          <div className={className}>
            <p>Video preview unavailable</p>
          </div>
        )}
        {extension && (
          <div className={styles.extensionBox}>
            <span className={styles.extensionText}>
              {extension.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Video player mode (for preview panel)
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {hasError ? (
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
          Video unavailable
        </div>
      ) : !isLoading ? (
        <div
          className={className}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
          }}
        >
          Loading...
        </div>
      ) : videoUrl ? (
        <CustomVideoPlayer
          src={videoUrl}
          className={className}
          autoPlay={autoPlay}
          onLoad={onLoad}
        />
      ) : (
        <div className={className}>
          <p>Video unavailable</p>
        </div>
      )}
    </div>
  );
}
