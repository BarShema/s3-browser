import type { S3File, S3Directory } from "@/lib/s3";

// S3 Library
export interface ListS3ObjectsResponse {
  files: S3File[];
  directories: S3Directory[];
}

// useResize Hook
export interface UseResizeOptions {
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  onResize?: (width: number) => void;
}

