"use client";

import { useEffect, useState } from "react";

interface PDFPreviewProps {
  src: string;
  className?: string;
}

export function PDFPreview({ src, className }: PDFPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    setImageUrl(null);

    // Use the preview endpoint to get PDF first page as image
    const fetchPDFPreview = async () => {
      try {
        const previewUrl = `/api/s3/preview?path=${encodeURIComponent(src)}&mw=800&mh=600`;
        
        // Test if the preview URL loads
        const testImg = document.createElement('img');
        
        const handleLoad = () => {
          setImageUrl(previewUrl);
          setIsLoading(false);
        };

        const handleError = () => {
          setHasError(true);
          setIsLoading(false);
        };

        testImg.addEventListener('load', handleLoad);
        testImg.addEventListener('error', handleError);
        
        testImg.src = previewUrl;

        return () => {
          testImg.removeEventListener('load', handleLoad);
          testImg.removeEventListener('error', handleError);
        };
      } catch (error) {
        console.error('Error loading PDF preview:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    fetchPDFPreview();
  }, [src]);

  if (hasError) {
    return (
      <div className={className} style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "#f3f4f6",
        color: "#9ca3af"
      }}>
        PDF preview unavailable
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
        Loading PDF preview...
      </div>
    );
  }

  return (
    <img 
      src={imageUrl || ''} 
      alt="PDF Preview"
      className={className}
      style={{
        maxWidth: "100%",
        maxHeight: "70vh",
        objectFit: "contain"
      }}
    />
  );
}
