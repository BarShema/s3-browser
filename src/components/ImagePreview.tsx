"use client";

import { useEffect, useState, useRef } from "react";

interface ImagePreviewProps {
  src: string;
  alt: string;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
}

export function ImagePreview({ src, alt, className, maxWidth = 800, maxHeight = 600 }: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const effectRef = useRef<string | null>(null);

  useEffect(() => {
    // Track this effect instance
    effectRef.current = src;
    
    // Use the preview endpoint directly as image source
    const fetchThumbnailUrl = async () => {
      try {
        const previewUrl = `/api/s3/preview?path=${encodeURIComponent(src)}&mw=${maxWidth}&mh=${maxHeight}`;
        
        // Test if the preview URL loads
        const testImg = document.createElement('img');
        
        const handleLoad = () => {
          // Only update if this is still the current effect
          if (effectRef.current === src) {
            setImageUrl(previewUrl);
            setIsLoading(false);
          }
        };

        const handleError = () => {
          // Only update if this is still the current effect
          if (effectRef.current === src) {
            setHasError(true);
            setIsLoading(false);
          }
        };

        testImg.addEventListener('load', handleLoad);
        testImg.addEventListener('error', handleError);
        
        testImg.src = previewUrl;

        return () => {
          testImg.removeEventListener('load', handleLoad);
          testImg.removeEventListener('error', handleError);
        };
      } catch (error) {
        console.error('Error loading thumbnail:', error);
        if (effectRef.current === src) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    fetchThumbnailUrl();
  }, [src, maxWidth, maxHeight]);

  if (hasError) {
    return (
      <div className={className} style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "#f3f4f6",
        color: "#9ca3af"
      }}>
        Preview unavailable
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={className} style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "#f3f4f6",
        color: "#9ca3af"
      }}>
        Loading...
      </div>
    );
  }

  return (
    <img 
      src={imageUrl || ''} 
      alt={alt}
      className={className}
    />
  );
}
