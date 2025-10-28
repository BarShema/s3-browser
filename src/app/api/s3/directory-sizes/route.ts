import { s3Client } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket");
    const prefix = searchParams.get("prefix") || "";

    if (!bucket) {
      return NextResponse.json({ error: "Bucket name is required" }, { status: 400 });
    }

    const directorySizes: { [key: string]: { size: number; objects: number; formattedSize: string } } = {};

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
                directorySizes[directoryPath] = { size: 0, objects: 0, formattedSize: "" };
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
    Object.keys(directorySizes).forEach(dir => {
      directorySizes[dir].formattedSize = formatBytes(directorySizes[dir].size);
    });

    return NextResponse.json({
      bucket,
      prefix,
      directorySizes,
    });

  } catch (error: unknown) {
    console.error("Error calculating directory sizes:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
