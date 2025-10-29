"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
} from "lucide-react";
import styles from "./customVideoPlayer.module.css";

interface CustomVideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
}

export function CustomVideoPlayer({
  src,
  className,
  autoPlay = false,
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [wasPlayingBeforeSeek, setWasPlayingBeforeSeek] = useState(false);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] = useState(0);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [showPlayPauseAnimation, setShowPlayPauseAnimation] = useState(false);
  const [animationAction, setAnimationAction] = useState<"play" | "pause">("play");
  
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (autoPlay) {
        video.play().catch(() => setIsPlaying(false));
      }
    };

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("durationchange", updateDuration);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    // Handle fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("durationchange", updateDuration);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [src, autoPlay]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    // Show animation
    if (isPlaying) {
      setAnimationAction("pause");
      video.pause();
    } else {
      setAnimationAction("play");
      video.play();
    }
    
    setShowPlayPauseAnimation(true);
    setTimeout(() => {
      setShowPlayPauseAnimation(false);
    }, 600);
  };

  const captureFrame = useCallback(async (time: number): Promise<string | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !duration) return null;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 180;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Store current time to restore later
    const originalTime = video.currentTime;
    const wasPlaying = !video.paused;

    // Pause and seek to preview time
    if (wasPlaying) {
      video.pause();
    }
    video.currentTime = time;

    // Wait for seeked event before capturing
    return new Promise<string | null>((resolve) => {
      const handleSeeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          
          // Restore original time and play state
          video.currentTime = originalTime;
          if (wasPlaying) {
            video.play().catch(() => {});
          }
          
          video.removeEventListener("seeked", handleSeeked);
          resolve(dataUrl);
        } catch (error) {
          console.error("Error capturing frame:", error);
          video.currentTime = originalTime;
          if (wasPlaying) {
            video.play().catch(() => {});
          }
          video.removeEventListener("seeked", handleSeeked);
          resolve(null);
        }
      };

      video.addEventListener("seeked", handleSeeked, { once: true });
      
      // Timeout fallback
      setTimeout(() => {
        video.removeEventListener("seeked", handleSeeked);
        video.currentTime = originalTime;
        if (wasPlaying) {
          video.play().catch(() => {});
        }
        resolve(null);
      }, 1000);
    });
  }, [duration]);

  // Handle dragging progress bar
  useEffect(() => {
    if (!isDraggingProgress || !progressRef.current || !duration) return;

    const progress = progressRef.current;

    const handleMouseMove = async (e: MouseEvent) => {
      const rect = progress.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const clampedPos = Math.max(0, Math.min(1, pos));
      const previewTime = clampedPos * duration;

      setPreviewTime(previewTime);
      setPreviewPosition(clampedPos * 100);

      // Update preview thumbnail (but don't seek video during drag)
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }

      previewTimeoutRef.current = setTimeout(async () => {
        const thumbnail = await captureFrame(previewTime);
        setPreviewThumbnail(thumbnail);
      }, 150);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDraggingProgress(false);
      
      // Now seek to the final position on mouse up
      const rect = progress.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const clampedPos = Math.max(0, Math.min(1, pos));
      const finalTime = clampedPos * duration;
      
      const video = videoRef.current;
      if (video) {
        video.currentTime = finalTime;
        setCurrentTime(finalTime);
      }
      
      if (wasPlayingBeforeSeek) {
        videoRef.current?.play();
      }
      setPreviewTime(null);
      setPreviewThumbnail(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingProgress, duration, wasPlayingBeforeSeek, captureFrame]);

  const updatePreview = async (e: React.MouseEvent<HTMLDivElement>) => {
    const progress = progressRef.current;
    if (!progress || !duration) return;

    const rect = progress.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0, Math.min(1, pos));
    const previewTime = clampedPos * duration;
    
    setPreviewTime(previewTime);
    setPreviewPosition(clampedPos * 100);

    // Debounce frame capture to avoid too many seeks
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    previewTimeoutRef.current = setTimeout(async () => {
      const thumbnail = await captureFrame(previewTime);
      setPreviewThumbnail(thumbnail);
    }, 150);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progress = progressRef.current;
    if (!video || !progress || !duration) return;

    const rect = progress.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;

    // Only seek on click (not hover)
    video.currentTime = newTime;
    setCurrentTime(newTime);
    setPreviewTime(null);
    setPreviewThumbnail(null);
    
    // Clear preview timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
  };

  const handleProgressMouseEnter = () => {
    // Initialize preview on hover
  };

  const handleProgressMouseLeave = () => {
    if (!isDraggingProgress) {
      setPreviewTime(null);
      setPreviewThumbnail(null);
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    }
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const volumeSlider = volumeRef.current;
    if (!video || !volumeSlider) return;

    const rect = volumeSlider.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newVolume = Math.max(0, Math.min(1, pos));

    setVolume(newVolume);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  useEffect(() => {
    const volumeSlider = volumeRef.current;
    if (!volumeSlider) return;

    let isDragging = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !volumeRef.current) return;
      
      const rect = volumeRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newVolume = Math.max(0, Math.min(1, pos));
      const video = videoRef.current;
      
      if (video) {
        setVolume(newVolume);
        video.volume = newVolume;
        setIsMuted(newVolume === 0);
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.stopPropagation();
      isDragging = true;
      
      const rect = volumeSlider.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const newVolume = Math.max(0, Math.min(1, pos));
      const video = videoRef.current;
      
      if (video) {
        setVolume(newVolume);
        video.volume = newVolume;
        setIsMuted(newVolume === 0);
      }
      
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    volumeSlider.addEventListener("mousedown", handleMouseDown);

    return () => {
      volumeSlider.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      setVolume(video.volume);
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        console.error("Error attempting to enable fullscreen");
      });
    } else {
      document.exitFullscreen();
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const formatTime = (time: number): string => {
    if (!isFinite(time)) return "0:00";
    
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const showControls = () => {
    setIsControlsVisible(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3000);
    }
  };

  const hideControls = () => {
    if (isPlaying) {
      setIsControlsVisible(false);
    }
  };

  useEffect(() => {
    if (isPlaying && isControlsVisible) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3000);
    }

    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isControlsVisible]);

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`${styles.videoContainer} ${className || ""}`}
      onMouseMove={showControls}
      onMouseLeave={hideControls}
      onDoubleClick={toggleFullscreen}
    >
      <video
        ref={videoRef}
        src={src}
        className={styles.video}
        onClick={togglePlay}
        playsInline
      />
      
      {/* Play/Pause Animation */}
      {showPlayPauseAnimation && (
        <div className={styles.playPauseAnimation}>
          {animationAction === "play" ? (
            <Play size={80} />
          ) : (
            <Pause size={80} />
          )}
        </div>
      )}

      <div
        className={`${styles.controls} ${
          isControlsVisible ? styles.visible : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div
          ref={progressRef}
          className={styles.progressBar}
          onClick={handleSeek}
          onMouseEnter={handleProgressMouseEnter}
          onMouseMove={updatePreview}
          onMouseLeave={handleProgressMouseLeave}
          onMouseDown={(e) => {
            setIsDraggingProgress(true);
            setWasPlayingBeforeSeek(isPlaying);
            if (isPlaying) {
              videoRef.current?.pause();
            }
            // Don't seek immediately on mousedown, wait for mouseup
            updatePreview(e);
          }}
        >
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div className={styles.progressTrack} />
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
          {previewTime !== null && previewThumbnail && (
            <div
              className={styles.previewThumbnail}
              style={{ left: `${previewPosition}%` }}
            >
              <img src={previewThumbnail} alt="Preview" />
              <span className={styles.previewTime}>
                {formatTime(previewTime)}
              </span>
            </div>
          )}
          <div
            className={styles.progressHandle}
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Controls */}
        <div className={styles.controlsBar}>
          <div className={styles.controlsLeft}>
            <button
              className={styles.controlButton}
              onClick={togglePlay}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
            </button>

            <button
              className={styles.controlButton}
              onClick={() => skip(-10)}
              title="Rewind 10s"
            >
              <SkipBack size={18} />
            </button>

            <button
              className={styles.controlButton}
              onClick={() => skip(10)}
              title="Forward 10s"
            >
              <SkipForward size={18} />
            </button>

            <div className={styles.volumeControl}>
              <button
                className={styles.controlButton}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX size={18} />
                ) : (
                  <Volume2 size={18} />
                )}
              </button>
              <div
                ref={volumeRef}
                className={styles.volumeSlider}
                onClick={(e) => {
                  e.stopPropagation();
                  handleVolumeChange(e);
                }}
              >
                <div className={styles.volumeTrack} />
                <div
                  className={styles.volumeFill}
                  style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                />
              </div>
            </div>

            <div className={styles.timeDisplay}>
              <span>{formatTime(currentTime)}</span>
              <span className={styles.timeSeparator}>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className={styles.controlsRight}>
            <button
              className={styles.controlButton}
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize size={18} />
              ) : (
                <Maximize size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

