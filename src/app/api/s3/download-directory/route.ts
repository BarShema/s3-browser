import { s3Client } from "@/lib/s3";
import { verifyAuthorizationToken } from "@/lib/api-auth-server";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const authResult = await verifyAuthorizationToken(authHeader);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 }
      );
    }

    // Parse the path to extract bucket and directory path
    const pathParts = path.split("/").filter(Boolean);
    const bucket = pathParts[0];
    const directoryPath = pathParts.slice(1).join("/");

    if (!bucket || !directoryPath) {
      return NextResponse.json(
        { error: "Bucket and directory path are required" },
        { status: 400 }
      );
    }

    // Ensure directory path ends with /
    const normalizedPath = directoryPath.endsWith("/") ? directoryPath : directoryPath + "/";
    
    // Get directory name for filename
    const directoryNameParts = normalizedPath.split("/").filter(Boolean);
    const directoryName = directoryNameParts[directoryNameParts.length - 1] || "directory";

    // Get all files in the directory
    let continuationToken: string | undefined;
    const files: { key: string; name: string; size: number }[] = [];

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: normalizedPath,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(listCommand);

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key && obj.Size) {
            const fileName = obj.Key.split("/").pop() || obj.Key;
            files.push({
              key: obj.Key,
              name: fileName,
              size: obj.Size,
            });
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Directory is empty" },
        { status: 404 }
      );
    }

    // Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);

    

    // For small directories (≤100 files AND ≤50MB), create ZIP
    if (files.length <= 100 && totalSizeMB <= 50) {
      

      // Create ZIP file in memory
      const archive = archiver("zip", {
        zlib: { level: 1 } // Fast compression
      });

      const chunks: Buffer[] = [];
      
      archive.on("data", (chunk) => {
        chunks.push(chunk);
      });

      archive.on("error", (err) => {
        console.error("Archive error:", err);
        throw err;
      });

      // Add files to ZIP
      for (const file of files) {
        try {
          const getCommand = new GetObjectCommand({
            Bucket: bucket,
            Key: file.key,
          });

          const s3Response = await s3Client.send(getCommand);
          
          if (s3Response.Body) {
            // Convert stream to buffer
            const fileChunks: Uint8Array[] = [];
            const stream = s3Response.Body as NodeJS.ReadableStream;
            for await (const chunk of stream) {
              fileChunks.push(Buffer.from(chunk));
            }
            const fileBuffer = Buffer.concat(fileChunks);

            // Get relative path within the ZIP
            const relativePath = file.key.replace(normalizedPath, "");
            
            // Add file to archive
            archive.append(fileBuffer, { name: relativePath });
          }
        } catch (error) {
          console.error(`Error processing file ${file.key}:`, error);
          // Continue with other files even if one fails
        }
      }

      // Finalize the archive
      await archive.finalize();

      // Wait for archive to complete
      await new Promise<void>((resolve, reject) => {
        archive.on("end", resolve);
        archive.on("error", reject);
      });

      // Combine all chunks into a single buffer
      const zipBuffer = Buffer.concat(chunks);

      

      // Return the ZIP file directly
      return new NextResponse(zipBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${directoryName}.zip"`,
          "Content-Length": zipBuffer.length.toString(),
        },
      });
    }

    // For large directories, return information and suggest alternatives
    return NextResponse.json({
      message: `Directory is too large for ZIP download (${files.length} files, ${totalSizeMB.toFixed(2)} MB)`,
      directoryName,
      fileCount: files.length,
      totalSizeMB: totalSizeMB.toFixed(2),
      suggestions: [
        "Download individual files using the file browser",
        "Use AWS CLI: aws s3 sync s3://bucket/path/ ./local-folder/",
        "Contact administrator for bulk download assistance",
        "Consider using S3 Transfer Acceleration for large downloads"
      ],
      files: files.slice(0, 20), // Show first 20 files as example
    });

  } catch (error: unknown) {
    console.error("Error processing directory download:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to process directory: ${errorMessage}` },
      { status: 500 }
    );
  }
}