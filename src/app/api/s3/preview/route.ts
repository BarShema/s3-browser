import { appConfig } from "@/config/app";
import { getS3ClientForBucket, s3Client } from "@/lib/s3";
import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const mhParam = searchParams.get("mh");
    const mwParam = searchParams.get("mw");
    
    // If mw & mh are empty, use original size (0 means original)
    const maxHeight = mhParam ? parseInt(mhParam) : 0;
    const maxWidth = mwParam ? parseInt(mwParam) : 0;

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    // Parse the path to extract bucket and key
    const pathParts = path.split("/").filter(Boolean);
    const bucket = pathParts[0];
    const key = pathParts.slice(1).join("/");

    if (!bucket || !key) {
      return NextResponse.json(
        { error: "Bucket and key are required" },
        { status: 400 }
      );
    }

    // Check if file is supported for preview
    const fileExtension = key.split(".").pop()?.toLowerCase();
    const supportedExtensions = [
      "jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico", "tiff",
      "mp4", "pdf"
    ];
    
    if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: "File type not supported for preview" },
        { status: 400 }
      );
    }

    // Generate thumbnail filename (always save as webp)
    const fileName = key.split("/").pop() || "";
    const nameWithoutExt = fileName.split(".").slice(0, -1).join(".");
    const sizeSuffix = maxWidth && maxHeight ? `-${maxHeight}x${maxWidth}` : "-original";
    const thumbnailKey = `${key.replace(fileName, '')}${nameWithoutExt}${sizeSuffix}.webp`;

    // Check if thumbnail already exists in temp bucket
    const tempBucket = appConfig.tempBucketName;
    try {
      // Get S3 client with correct region for temp bucket
      const tempS3Client = await getS3ClientForBucket(tempBucket);
      const getThumbnailCommand = new GetObjectCommand({
        Bucket: tempBucket,
        Key: thumbnailKey,
      });

      const thumbnailResponse = await tempS3Client.send(getThumbnailCommand);

      if (thumbnailResponse.Body) {
        // Convert stream to buffer and return directly
        const chunks: Uint8Array[] = [];
        const stream = thumbnailResponse.Body as NodeJS.ReadableStream;
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
        const thumbnailBuffer = Buffer.concat(chunks);

        return new NextResponse(new Uint8Array(thumbnailBuffer), {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "max-age=31536000",
          },
        });
      }
    } catch (error: unknown) {
      // Thumbnail doesn't exist or temp bucket is not accessible
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
    }

    // Get original file from S3
    const getOriginalCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const originalResponse = await s3Client.send(getOriginalCommand);

    if (!originalResponse.Body) {
      return NextResponse.json(
        { error: "Original file not found" },
        { status: 404 }
      );
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = originalResponse.Body as NodeJS.ReadableStream;
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const fileBuffer = Buffer.concat(chunks);

    let thumbnailBuffer: Buffer;

    if (fileExtension === "mp4") {
      // Extract first frame from MP4
      thumbnailBuffer = await extractMP4Frame(fileBuffer, maxWidth, maxHeight);
    } else if (fileExtension === "pdf") {
      // Extract first page from PDF
      thumbnailBuffer = await extractPDFPage(fileBuffer, maxWidth, maxHeight);
    } else {
      // Process image with Sharp
      thumbnailBuffer = await processImage(fileBuffer, maxWidth, maxHeight);
    }

    // Upload thumbnail to temp bucket
    if (tempBucket) {
      try {
        // Get S3 client with correct region for temp bucket
        const tempS3Client = await getS3ClientForBucket(tempBucket);
        const putThumbnailCommand = new PutObjectCommand({
          Bucket: tempBucket,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: "image/webp",
          CacheControl: "max-age=31536000", // Cache for 1 year
        });

        await tempS3Client.send(putThumbnailCommand);
        
      } catch (error: unknown) {
        console.error("Error saving thumbnail to temp bucket:", error instanceof Error ? error.message : 'Unknown error');
        // If temp bucket fails, just return the thumbnail without caching
        
      }
    }

    // Return the thumbnail buffer directly
    return new NextResponse(new Uint8Array(thumbnailBuffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error in GET /api/s3/preview:", error);
    return NextResponse.json(
      { error: "Failed to generate thumbnail" },
      { status: 500 }
    );
  }
}

// Helper function to process images with Sharp
async function processImage(imageBuffer: Buffer, maxWidth: number, maxHeight: number): Promise<Buffer> {
  const sharpInstance = sharp(imageBuffer);
  
  if (maxWidth === 0 && maxHeight === 0) {
    // Return original size
    return await sharpInstance.webp({ quality: 80 }).toBuffer();
  }
  
  // Get image metadata
  const metadata = await sharpInstance.metadata();
  
  // Calculate new dimensions maintaining aspect ratio
  let newWidth = maxWidth;
  let newHeight = maxHeight;
  
  if (metadata.width && metadata.height) {
    const aspectRatio = metadata.width / metadata.height;
    
    if (aspectRatio > maxWidth / maxHeight) {
      // Image is wider, constrain by width
      newHeight = Math.round(maxWidth / aspectRatio);
    } else {
      // Image is taller, constrain by height
      newWidth = Math.round(maxHeight * aspectRatio);
    }
  }

  // Resize image
  return await sharpInstance
    .resize(newWidth, newHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
}

// Helper function to extract first frame from MP4
async function extractMP4Frame(videoBuffer: Buffer, maxWidth: number, maxHeight: number): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input-${Date.now()}.mp4`);
  const outputPath = path.join(tempDir, `output-${Date.now()}.webp`);
  
  try {
    // Write video buffer to temp file
    fs.writeFileSync(inputPath, videoBuffer);
    
    // Use ffmpeg to extract first frame
    const ffmpegCmd = `ffmpeg -i "${inputPath}" -vframes 1 -f image2 "${outputPath}" -y`;
    await execAsync(ffmpegCmd);
    
    // Read the extracted frame
    const frameBuffer = fs.readFileSync(outputPath);
    
    // Process with Sharp to resize and convert to webp
    return await processImage(frameBuffer, maxWidth, maxHeight);
  } finally {
    // Clean up temp files
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (cleanupError) {
      console.warn("Failed to clean up temp files:", cleanupError);
    }
  }
}

// Helper function to extract first page from PDF
async function extractPDFPage(pdfBuffer: Buffer, maxWidth: number, maxHeight: number): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `input-${Date.now()}.pdf`);
  const outputPath = path.join(tempDir, `output-${Date.now()}.png`);
  
  try {
    // Write PDF buffer to temp file
    fs.writeFileSync(inputPath, pdfBuffer);
    
    // Use poppler to convert first page to image
    const popplerCmd = `pdftoppm -png -f 1 -l 1 "${inputPath}" "${outputPath.replace('.png', '')}"`;
    await execAsync(popplerCmd);
    
    // Read the converted image
    const imageBuffer = fs.readFileSync(outputPath);
    
    // Process with Sharp to resize and convert to webp
    return await processImage(imageBuffer, maxWidth, maxHeight);
  } finally {
    // Clean up temp files
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (cleanupError) {
      console.warn("Failed to clean up temp files:", cleanupError);
    }
  }
}