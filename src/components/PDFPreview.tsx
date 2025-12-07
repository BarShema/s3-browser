"use client";

import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { getFileExtension } from "@/lib/utils";
import styles from "./fileIcon.module.css";

interface PDFPreviewProps {
  src: string;
  className?: string;
}

export function PDFPreview({ src, className }: PDFPreviewProps) {
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

    // Use the preview endpoint to get PDF first page as image
    const fetchPDFPreview = async () => {
      try {
        const previewUrl = api.drive.file.getPreviewUrl({
          path: src,
          maxWidth: 800,
          maxHeight: 600,
        });
        
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
        setHasError(true);
        setIsLoading(false);
      }
    };

    fetchPDFPreview();
  }, [src]);

  return (
    <div className={styles.iconContainer} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {hasError ? (
        <div className={className} style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          background: "#f3f4f6",
          color: "#9ca3af"
        }}>
          PDF preview unavailable
        </div>
      ) : isLoading ? (
        <div className={className} style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          background: "#f3f4f6",
          color: "#9ca3af"
        }}>
          Loading PDF preview...
        </div>
      ) : (
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
      )}
      {extension && (
        <div className={styles.extensionBox}>
          <span className={styles.extensionText}>{extension.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
