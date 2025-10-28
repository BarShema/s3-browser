import { s3Client } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const drive = searchParams.get("drive");

    if (!drive) {
      return NextResponse.json({ error: "Drive name is required" }, { status: 400 });
    }

    let totalSize = 0;
    let totalObjects = 0;
    let continuationToken: string | undefined;

    // Calculate bucket size by iterating through all objects
    do {
      const command = new ListObjectsV2Command({
        Bucket: drive,
        ContinuationToken: continuationToken,
        MaxKeys: 1000, // Process in batches for better performance
      });

      const response = await s3Client.send(command);

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Size) {
            totalSize += obj.Size;
            totalObjects++;
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return NextResponse.json({
      drive,
      totalSize,
      totalObjects,
      formattedSize: formatBytes(totalSize),
    });

  } catch (error: unknown) {
    console.error("Error calculating drive size:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to calculate drive size: ${errorMessage}` },
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
