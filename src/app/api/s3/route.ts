import { appConfig } from "@/config/app";
import {
  deleteFromS3,
  listS3Objects,
  renameS3Object,
  uploadToS3,
} from "@/lib/s3";
import { NextRequest, NextResponse } from "next/server";

const defaultLimit = appConfig.defaultItemsPerPage;

// List files and directories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(
      searchParams.get("limit") || defaultLimit.toString()
    );
    const nameFilter = searchParams.get("name") || "";
    const typeFilter = searchParams.get("type") || "";
    const extensionFilter = searchParams.get("extension") || "";

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

    // Add trailing slash to prefix for S3 listing
    const s3Prefix = prefix ? `${prefix}/` : "";
    const result = await listS3Objects(bucket, s3Prefix);
    
    // Apply client-side filtering and pagination
    let filteredFiles = result.files;
    let filteredDirectories = result.directories;

    // Apply name filter
    if (nameFilter) {
      const nameLower = nameFilter.toLowerCase();
      filteredFiles = filteredFiles.filter((file) =>
        file.name.toLowerCase().includes(nameLower)
      );
      filteredDirectories = filteredDirectories.filter((dir) =>
        dir.name.toLowerCase().includes(nameLower)
      );
    }

    // Apply extension filter
    if (extensionFilter) {
      const extLower = extensionFilter.toLowerCase();
      filteredFiles = filteredFiles.filter((file) =>
        file.name.toLowerCase().endsWith(extLower)
      );
    }

    // Apply type filter
    if (typeFilter === "directory") {
      filteredFiles = [];
    } else if (typeFilter === "file") {
      filteredDirectories = [];
    }

    // Combine all items for pagination
    const allItems = [...filteredDirectories, ...filteredFiles];
    const totalItems = allItems.length;
    const totalPages = Math.ceil(totalItems / limit);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = allItems.slice(startIndex, endIndex);

    // Separate back into files and directories
    const paginatedFiles = paginatedItems.filter((item) => !item.isDirectory);
    const paginatedDirectories = paginatedItems.filter(
      (item) => item.isDirectory
    );

    return NextResponse.json({
      files: paginatedFiles,
      directories: paginatedDirectories,
      totalFiles: filteredFiles.length,
      totalDirectories: filteredDirectories.length,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error in GET /api/s3:", error);
    return NextResponse.json(
      { error: "Failed to list objects" },
      { status: 500 }
    );
  }
}

// Upload file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const bucket = formData.get("bucket") as string;
    const key = formData.get("key") as string;

    if (!file || !bucket || !key) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToS3(bucket, key, buffer, file.type);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/s3:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// Delete file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

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

    await deleteFromS3(bucket, key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/s3:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

// Rename file
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { bucket, oldKey, newKey } = body;

    if (!bucket || !oldKey || !newKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await renameS3Object(bucket, oldKey, newKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /api/s3:", error);
    return NextResponse.json(
      { error: "Failed to rename file" },
      { status: 500 }
    );
  }
}
