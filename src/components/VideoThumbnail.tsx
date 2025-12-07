"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

import { api } from "@/lib/api";

interface VideoThumbnailProps {
  src: string;
  alt: string;
}

export function VideoThumbnail({ src, alt }: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    setThumbnailUrl(null);
    setVideoUrl(null);

    // Fetch the presigned URL from the API using SDK
    const fetchVideoUrl = async () => {
      try {
        const response = await api.drive.file.download({
          path: src,
        });
        const presignedUrl = response.downloadUrl;
        setVideoUrl(presignedUrl);
        
        // Now load the video for thumbnail generation
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (!video || !canvas) return;

        const captureFrame = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              setThumbnailUrl(dataUrl);
              setIsLoading(false);
            }
          }
        };

        const handleLoad = () => {
          if (video.duration > 0) {
            video.currentTime = Math.min(1, video.duration / 4);
          }
        };

        const handleSeeked = () => {
          captureFrame();
        };

        const handleError = () => {
          setHasError(true);
          setIsLoading(false);
        };

        video.addEventListener('loadedmetadata', handleLoad);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('error', handleError);
        
        return () => {
          video.removeEventListener('loadedmetadata', handleLoad);
          video.removeEventListener('seeked', handleSeeked);
          video.removeEventListener('error', handleError);
        };
      } catch (error) {
        setHasError(true);
        setIsLoading(false);
      }
    };

    fetchVideoUrl();
  }, [src]);

  return (
    <>
      <video
        ref={videoRef}
        src={videoUrl || ''}
        style={{ display: 'none' }}
        muted
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {hasError ? (
        <div style={{ 
          width: "100%", 
          height: "100%", 
          background: "#f3f4f6", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          flexDirection: "column",
          gap: "0.5rem"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Preview unavailable</div>
        </div>
      ) : isLoading ? (
        <div style={{ 
          width: "100%", 
          height: "100%", 
          background: "#f3f4f6", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          flexDirection: "column",
          gap: "0.5rem"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Loading preview...</div>
        </div>
      ) : thumbnailUrl ? (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <img 
            src={thumbnailUrl} 
            alt={alt}
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "cover",
              display: "block"
            }} 
          />
          <div style={{
            position: "absolute",
            bottom: "0.5rem",
            right: "0.5rem",
            background: "rgba(0, 0, 0, 0.7)",
            borderRadius: "50%",
            width: "2rem",
            height: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Play size={16} color="white" />
          </div>
        </div>
      ) : (
        <div style={{ 
          width: "100%", 
          height: "100%", 
          background: "#f3f4f6", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center" 
        }}>
          <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Video Preview</div>
        </div>
      )}
    </>
  );
}

