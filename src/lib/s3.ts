import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Get AWS credentials from environment
const getS3Config = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "eu-west-1";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
    );
  }

  return {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };
};

// S3 Client configuration
const s3Client = new S3Client(getS3Config());

export interface S3File {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  contentType?: string;
  etag?: string;
}

export interface S3Directory {
  key: string;
  name: string;
  lastModified: Date;
  isDirectory: boolean;
}

export interface S3Bucket {
  name: string;
  creationDate?: Date;
}

// List all S3 buckets
export async function listBuckets(): Promise<S3Bucket[]> {
  try {
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);

    if (!response.Buckets) {
      return [];
    }

    return response.Buckets.map((bucket) => ({
      name: bucket.Name || "",
      creationDate: bucket.CreationDate,
    }));
  } catch (error) {
    console.error("Error listing S3 buckets:", error);
    throw new Error("Failed to list buckets");
  }
}

// List objects in a bucket with optional prefix (folder)
export async function listS3Objects(
  bucket: string,
  prefix: string = ""
): Promise<{ files: S3File[]; directories: S3Directory[] }> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: "/",
    });

    const response = await s3Client.send(command);

    const files: S3File[] = [];
    const directories: S3Directory[] = [];
    const directorySet = new Set<string>();

    // Process files
    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && obj.Key !== prefix) {
          files.push({
            key: obj.Key,
            name: obj.Key.split("/").pop() || obj.Key,
            size: obj.Size || 0,
            lastModified: obj.LastModified || new Date(),
            isDirectory: false,
            etag: obj.ETag,
          });
        }
      }
    }

    // Process directories from CommonPrefixes (directories with files)
    if (response.CommonPrefixes) {
      for (const prefixObj of response.CommonPrefixes) {
        if (prefixObj.Prefix) {
          // Extract directory name more reliably
          const fullPath = prefixObj.Prefix;
          const pathParts = fullPath.split("/").filter(Boolean);
          const dirName = pathParts[pathParts.length - 1] || "Unnamed Folder";

          console.log("Prefix:", prefix);
          console.log("Directory:", {
            key: prefixObj.Prefix,
            name: dirName,
            lastModified: new Date(),
            isDirectory: true,
          });
          directories.push({
            key: prefixObj.Prefix,
            name: dirName,
            lastModified: new Date(),
            isDirectory: true,
          });

          directorySet.add(prefixObj.Prefix);
        }
      }
    }

    // Extract directories from file paths (for empty directories)
    if (response.Contents) {
      for (const obj of response.Contents) {
        if (!obj.Key || obj.Key === prefix) continue;

        const pathParts = obj.Key.split("/").filter(Boolean);
        const prefixParts = prefix.split("/").filter(Boolean);

        // Extract all parent directories
        for (let i = 1; i < pathParts.length; i++) {
          const dirPath = pathParts.slice(0, i).join("/") + "/";
          
          if (directorySet.has(dirPath)) continue;

          const dirName = pathParts[i - 1];
          
          // Skip if this directory is part of the prefix path
          if (prefixParts.includes(dirName)) continue;

          directories.push({
            key: dirPath,
            name: dirName,
            lastModified: new Date(),
            isDirectory: true,
          });
          
          directorySet.add(dirPath);
        }
      }
    }

    return { files, directories };
  } catch (error) {
    console.error("Error listing S3 objects:", error);
    throw new Error("Failed to list objects from S3");
  }
}

// Get signed URL for downloading a file
export async function getDownloadUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("Error generating download URL:", error);
    throw new Error("Failed to generate download URL");
  }
}

// Upload file to S3
export async function uploadToS3(
  bucket: string,
  key: string,
  file: Buffer,
  contentType: string
): Promise<void> {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload file to S3");
  }
}

// Delete file from S3
export async function deleteFromS3(bucket: string, key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw new Error("Failed to delete file from S3");
  }
}

// Rename/move file in S3
export async function renameS3Object(
  bucket: string,
  oldKey: string,
  newKey: string
): Promise<void> {
  try {
    // Copy object to new location
    const copyCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${oldKey}`,
      Key: newKey,
    });

    await s3Client.send(copyCommand);

    // Delete original object
    await deleteFromS3(bucket, oldKey);
  } catch (error) {
    console.error("Error renaming S3 object:", error);
    throw new Error("Failed to rename file in S3");
  }
}

// Get file metadata
export async function getFileMetadata(
  bucket: string,
  key: string
): Promise<HeadObjectCommandOutput> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    return response;
  } catch (error) {
    console.error("Error getting file metadata:", error);
    throw new Error("Failed to get file metadata");
  }
}

// Get signed URL for uploading a file
export async function getUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    throw new Error("Failed to generate upload URL");
  }
}

export { s3Client };
