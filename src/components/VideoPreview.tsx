"use client";

import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { clz } from "@/lib/clz";
import { getFileExtension } from "@/lib/utils";
import { CustomVideoPlayer } from "./CustomVideoPlayer";
import fileIconStyles from "./fileIcon.module.css";
import styles from "./videoPreview.module.css";

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
  const [videoOrientation, setVideoOrientation] = useState<
    "vertical" | "horizontal" | null
  >(null);
  const videoUrlRef = useRef<string | null>(null);
  const testImgRef = useRef<HTMLImageElement | null>(null);
  const orientationVideoRef = useRef<HTMLVideoElement | null>(null);
  const onLoadRef = useRef(onLoad);
  const isFetchingRef = useRef(false);
  const fetchingSrcRef = useRef<string | null>(null);

  // Extract filename from src to get extension
  const filename = src.split("/").pop() || "";
  const extension = getFileExtension(filename);

  // Update onLoad ref when it changes (without triggering useEffect)
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    // Prevent duplicate requests for the same src
    if (isFetchingRef.current && fetchingSrcRef.current === src) {
      return;
    }

    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    setPreviewUrl(null);
    setVideoUrl(null);
    setVideoOrientation(null);
    isFetchingRef.current = true;
    fetchingSrcRef.current = src;

    // Revoke previous video URL if it exists (only if it's a blob URL)
    if (videoUrlRef.current && videoUrlRef.current.startsWith("blob:")) {
      window.URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }

    // Clean up previous test image
    if (testImgRef.current) {
      const img = testImgRef.current;
      img.removeEventListener("load", () => {});
      img.removeEventListener("error", () => {});
      testImgRef.current = null;
    }

    // Fetch video download URL
    const fetchVideoUrl = async () => {
      try {
        const downloadResponse = await api.drive.file.download({
          path: src,
        });

        // Validate downloadResponse has a downloadUrl
        if (!downloadResponse || !downloadResponse.downloadUrl) {
          throw new Error("Invalid download response: missing downloadUrl");
        }

        if (isThumbnail) {
          // For thumbnails, fetch the preview image
          const previewEndpointUrl = api.drive.file.getPreviewUrl({
            path: src,
            maxWidth: 800,
            maxHeight: 600,
          });
          const testImg = document.createElement("img");
          testImgRef.current = testImg;

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
        } else {
          // For video player, use the download URL directly for streaming
          // No need to download the entire blob - the browser will stream it
          videoUrlRef.current = downloadResponse.downloadUrl;
          setVideoUrl(downloadResponse.downloadUrl);

          // Detect video orientation by loading metadata
          const tempVideo = document.createElement("video");
          orientationVideoRef.current = tempVideo;

          const handleMetadataLoaded = () => {
            const videoWidth = tempVideo.videoWidth;
            const videoHeight = tempVideo.videoHeight;
            if (videoWidth > 0 && videoHeight > 0) {
              const orientation =
                videoHeight > videoWidth ? "vertical" : "horizontal";
              setVideoOrientation(orientation);
            }
            tempVideo.removeEventListener(
              "loadedmetadata",
              handleMetadataLoaded
            );
            tempVideo.src = "";
            orientationVideoRef.current = null;
          };

          tempVideo.addEventListener("loadedmetadata", handleMetadataLoaded);
          tempVideo.src = downloadResponse.downloadUrl;
          tempVideo.load();

          setIsLoading(false);
          onLoadRef.current?.();
        }
        isFetchingRef.current = false;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setHasError(true);
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchVideoUrl();

    // Cleanup function
    return () => {
      isFetchingRef.current = false;
      fetchingSrcRef.current = null;
      // Only revoke object URL if we created one (for thumbnails, not for streaming)
      // For streaming mode, videoUrl is just the download URL string, not an object URL
      if (videoUrlRef.current && videoUrlRef.current.startsWith("blob:")) {
        window.URL.revokeObjectURL(videoUrlRef.current);
        videoUrlRef.current = null;
      }
      // Clean up test image event listeners
      if (testImgRef.current) {
        const img = testImgRef.current;
        img.removeEventListener("load", () => {});
        img.removeEventListener("error", () => {});
        testImgRef.current = null;
      }
      // Clean up orientation detection video
      if (orientationVideoRef.current) {
        const video = orientationVideoRef.current;
        video.src = "";
        orientationVideoRef.current = null;
      }
    };
  }, [src, isThumbnail]);

  // Thumbnail mode (for grid/preview views)
  if (isThumbnail) {
    return (
      <div className={styles.iconContainer}>
        {hasError ? (
          <div className={`${styles.errorContainer} ${className || ""}`}>
            Video preview unavailable
          </div>
        ) : isLoading ? (
          <div className={`${styles.loadingContainer} ${className || ""}`}>
            Loading video preview...
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="Video Preview"
            className={`${styles.previewImage} ${className || ""}`}
          />
        ) : (
          <div className={className}>
            <p>Video preview unavailable</p>
          </div>
        )}
        {extension && (
          <div className={fileIconStyles.extensionBox}>
            <span className={fileIconStyles.extensionText}>
              {extension.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Video player mode (for preview panel)
  return (
    <div className={clz(styles.videoPlayerContainer, styles[videoOrientation])}>
      {hasError ? (
        <div className={`${styles.videoErrorContainer} ${className || ""}`}>
          Video unavailable
        </div>
      ) : isLoading ? (
        <div className={`${styles.videoLoadingContainer} ${className || ""}`}>
          Loading...
        </div>
      ) : videoUrl ? (
        <CustomVideoPlayer
          src={videoUrl}
          className={className}
          autoPlay={autoPlay}
          onLoad={onLoad}
          orientation={videoOrientation}
        />
      ) : (
        <div className={className}>
          <p>Video unavailable</p>
        </div>
      )}
    </div>
  );
}
