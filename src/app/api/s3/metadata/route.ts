import { s3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { exec } from "child_process";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import os from "os";
import path from "path";
import sharp from "sharp";
import { promisify } from "util";

const execAsync = promisify(exec);

interface VideoStream {
  width?: number;
  height?: number;
  duration?: string;
}

interface FFProbeFormat {
  duration?: string;
}

interface FFProbeData {
  streams?: VideoStream[];
  format?: FFProbeFormat;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    // Parse the path to extract bucket and key
    // Handle bucket names that may contain spaces or special characters
    // Find the first "/" that separates bucket from key
    const firstSlashIndex = filePath.indexOf("/");
    let bucket: string;
    let key: string;

    if (firstSlashIndex === -1) {
      // No slash found - entire path is bucket (shouldn't happen for files)
      bucket = filePath;
      key = "";
    } else {
      bucket = filePath.substring(0, firstSlashIndex);
      key = filePath.substring(firstSlashIndex + 1);
    }

    if (!bucket || !key) {
      return NextResponse.json(
        { error: "Bucket and key are required" },
        { status: 400 }
      );
    }

    const fileExtension = key.split(".").pop()?.toLowerCase() || "";
    const isVideoFile = [
      "mp4",
      "avi",
      "mov",
      "wmv",
      "flv",
      "webm",
      "mkv",
      "m4v",
    ].includes(fileExtension);
    const isImageFile = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "svg",
      "webp",
      "ico",
      "tiff",
    ].includes(fileExtension);

    if (!isVideoFile && !isImageFile) {
      return NextResponse.json(
        { error: "File type not supported for metadata extraction" },
        { status: 400 }
      );
    }

    // Get file from S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    
    const response = await s3Client.send(getObjectCommand);

    if (!response.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    const stream = response.Body as NodeJS.ReadableStream;
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const fileBuffer = Buffer.concat(chunks);

    if (isImageFile) {
      // Extract image dimensions using Sharp
      try {
        const metadata = await sharp(fileBuffer).metadata();
        return NextResponse.json({
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format,
        });
      } catch (error) {
        console.error("Error extracting image metadata:", error);
        return NextResponse.json(
          { error: "Failed to extract image metadata" },
          { status: 500 }
        );
      }
    } else if (isVideoFile) {
      // Extract video duration and dimensions using ffprobe
      try {
        // Create temporary file
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(
          tempDir,
          `video_${Date.now()}.${fileExtension}`
        );
        fs.writeFileSync(tempFilePath, fileBuffer);

        try {
          // Use ffprobe to get video metadata (both stream and format info)
          const { stdout } = await execAsync(
            `ffprobe -v error -show_entries stream=width,height,duration:format=duration -of json "${tempFilePath}"`
          );

          const probeData: FFProbeData = JSON.parse(stdout);
          const videoStream = probeData.streams?.find(
            (stream: VideoStream) => stream.width && stream.height
          );

          // Get duration from video stream, or from format if available
          let duration: string | undefined = videoStream?.duration;
          if (!duration && probeData.format?.duration) {
            duration = probeData.format.duration;
          }

          // Clean up temp file
          fs.unlinkSync(tempFilePath);

          return NextResponse.json({
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            duration: duration ? parseFloat(duration) : null,
          });
        } catch (ffprobeError) {
          // Clean up temp file on error
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          throw ffprobeError;
        }
      } catch (error) {
        console.error("Error extracting video metadata:", error);
        return NextResponse.json(
          {
            error:
              "Failed to extract video metadata. Make sure ffprobe is installed.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in GET /api/s3/metadata:", error);
    return NextResponse.json(
      { error: "Failed to get file metadata" },
      { status: 500 }
    );
  }
}
