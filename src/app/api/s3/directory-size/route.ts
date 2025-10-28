import { s3Client } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    // Parse the path to extract bucket and prefix
    // Path format: "bucketName/prefix" or just "bucketName"
    const pathParts = path.split("/").filter(Boolean);
    const bucket = pathParts[0];
    const prefix = pathParts.slice(1).join("/");

    if (!bucket) {
      return NextResponse.json(
        { error: "Bucket name is required" },
        { status: 400 }
      );
    }

    const directorySizes: {
      [key: string]: { size: number; objects: number; formattedSize: string };
    } = {};

    let continuationToken: string | undefined;

    // Calculate directory sizes by iterating through all objects
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000, // Process in batches for better performance
      });

      const response = await s3Client.send(command);

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && obj.Size) {
            // Extract directory path
            const keyParts = obj.Key.split("/");
            if (keyParts.length > 1) {
              // Get the directory path (everything except the filename)
              const directoryPath = keyParts.slice(0, -1).join("/") + "/";

              if (!directorySizes[directoryPath]) {
                directorySizes[directoryPath] = {
                  size: 0,
                  objects: 0,
                  formattedSize: "",
                };
              }

              directorySizes[directoryPath].size += obj.Size;
              directorySizes[directoryPath].objects += 1;
            }
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    // Format sizes for all directories
    Object.keys(directorySizes).forEach((dir) => {
      directorySizes[dir].formattedSize = formatBytes(directorySizes[dir].size);
    });

    // If requesting a specific directory, return its size data
    if (prefix) {
      const targetDirectory = prefix.endsWith('/') ? prefix : prefix + '/';
      const directoryData = directorySizes[targetDirectory];
      
      if (directoryData) {
        // Check if directory is too large (more than 10,000 objects or 1GB)
        const isTooLarge = directoryData.objects > 10000 || directoryData.size > 1024 * 1024 * 1024;
        
        if (isTooLarge) {
          return NextResponse.json({
            error: "Directory too large to calculate",
            totalSize: 0,
            totalObjects: 0,
            formattedSize: "Too large",
          });
        }
        
        return NextResponse.json({
          totalSize: directoryData.size,
          totalObjects: directoryData.objects,
          formattedSize: directoryData.formattedSize,
        });
      } else {
        // Directory exists but has no files
        return NextResponse.json({
          totalSize: 0,
          totalObjects: 0,
          formattedSize: "0 Bytes",
        });
      }
    }

    // Return all directory sizes for general requests
    return NextResponse.json({
      bucket,
      prefix,
      directorySizes,
    });
  } catch (error: unknown) {
    console.error("Error calculating directory sizes:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to calculate directory sizes: ${errorMessage}` },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
