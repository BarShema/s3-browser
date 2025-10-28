"use client";

import { useEffect, useState } from "react";

interface VideoPreviewProps {
  src: string;
  className?: string;
}

export function VideoPreview({ src, className }: VideoPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    setPreviewUrl(null);

    // Use the preview endpoint to get video first frame as image
    const fetchVideoPreview = async () => {
      try {
        const previewEndpointUrl = `/api/s3/preview?path=${encodeURIComponent(src)}&mw=800&mh=600`;
        
        // Test if the preview URL loads
        const testImg = document.createElement('img');
        
        const handleLoad = () => {
          setPreviewUrl(previewEndpointUrl);
          setIsLoading(false);
        };

        const handleError = () => {
          setHasError(true);
          setIsLoading(false);
        };

        testImg.addEventListener('load', handleLoad);
        testImg.addEventListener('error', handleError);
        
        testImg.src = previewEndpointUrl;

        return () => {
          testImg.removeEventListener('load', handleLoad);
          testImg.removeEventListener('error', handleError);
        };
      } catch (error) {
        console.error('Error loading video preview:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    fetchVideoPreview();
  }, [src]);

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
        Video preview unavailable
      </div>
    );
  }

  if (isLoading) {
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
        Loading video preview...
      </div>
    );
  }

  return previewUrl ? (
    <img
      src={previewUrl}
      alt="Video Preview"
      className={className}
      style={{
        maxWidth: "100%",
        maxHeight: "70vh",
        objectFit: "contain"
      }}
    />
  ) : (
    <div className={className}>
      <p>Video preview unavailable</p>
    </div>
  );
}
