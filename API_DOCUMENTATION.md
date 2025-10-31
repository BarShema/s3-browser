# API Documentation

Complete API reference for the Idits Drive S3 File Management System.

## Base URL

All API endpoints are prefixed with `/api/s3`

---

## Table of Contents

- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [List Files and Directories](#list-files-and-directories)
  - [Upload File](#upload-file)
  - [Create Directory](#create-directory)
  - [Delete File](#delete-file)
  - [Rename File](#rename-file)
  - [Download File](#download-file)
  - [Download Directory](#download-directory)
  - [Preview/Thumbnail](#previewthumbnail)
  - [File Metadata](#file-metadata)
  - [File Content](#file-content)
  - [Get Upload URL](#get-upload-url)
  - [List Buckets](#list-buckets)
  - [Drive Size](#drive-size)
  - [Directory Size](#directory-size)

---

## Authentication

All API endpoints require AWS credentials to be configured via environment variables:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (optional, defaults to `eu-west-1`)

---

## Error Handling

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

Status codes:
- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Endpoints

### List Files and Directories

**GET** `/api/s3`

List files and directories in an S3 bucket with optional filtering and pagination.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | Yes | - | Bucket name with optional prefix (e.g., `bucket-name` or `bucket-name/folder/subfolder`) |
| `page` | number | No | `1` | Page number for pagination |
| `limit` | number | No | `20` | Items per page |
| `name` | string | No | `""` | Filter files/directories by name (case-insensitive partial match) |
| `type` | string | No | `""` | Filter by type: `"directory"`, `"file"`, or empty for all |
| `extension` | string | No | `""` | Filter files by extension (case-insensitive) |

#### Path Format

The `path` parameter follows the format: `bucketName` or `bucketName/prefix/path`

Example paths:
- `portfolio-files2` - Lists root of bucket
- `portfolio-files2/images` - Lists files in `images/` folder
- `portfolio-files2/images/dance` - Lists files in `images/dance/` folder

#### Response

```json
{
  "files": [
    {
      "key": "images/dance/DSC00001.jpg",
      "name": "DSC00001.jpg",
      "size": 2345678,
      "lastModified": "2025-04-19T19:34:43.000Z",
      "isDirectory": false,
      "etag": "\"abc123...\""
    }
  ],
  "directories": [
    {
      "key": "images/dance/thumbnails/",
      "name": "thumbnails",
      "lastModified": "2025-10-30T11:28:19.174Z",
      "isDirectory": true
    }
  ],
  "totalFiles": 402,
  "totalDirectories": 1,
  "totalPages": 21,
  "currentPage": 1
}
```

#### Example Request

```bash
curl "http://localhost:3000/api/s3?path=portfolio-files2/images/dance&page=1&limit=20&name=DSC&type=file"
```

---

### Upload File

**POST** `/api/s3`

Upload a file to S3 or create a new directory.

#### Request Format: File Upload (multipart/form-data)

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file` (File) - The file to upload
- `bucket` (string) - Target bucket name
- `key` (string) - S3 object key (file path)

#### Request Format: Create Directory (application/json)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "bucket": "portfolio-files2",
  "dirKey": "images/new-folder"
}
```

Note: `dirKey` will automatically have a trailing `/` appended if not present.

#### Response

```json
{
  "success": true
}
```

#### Example Requests

**File Upload**:
```bash
curl -X POST http://localhost:3000/api/s3 \
  -F "file=@photo.jpg" \
  -F "bucket=portfolio-files2" \
  -F "key=images/dance/photo.jpg"
```

**Create Directory**:
```bash
curl -X POST http://localhost:3000/api/s3 \
  -H "Content-Type: application/json" \
  -d '{"bucket": "portfolio-files2", "dirKey": "images/new-folder"}'
```

---

### Create Directory

**POST** `/api/s3` (JSON body)

Creates a new directory in S3 by uploading a zero-byte object with a trailing slash.

See [Upload File](#upload-file) section for details.

---

### Delete File

**DELETE** `/api/s3`

Delete a file or directory from S3.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Full path including bucket (e.g., `bucket-name/path/to/file.jpg`) |

#### Response

```json
{
  "success": true
}
```

#### Example Request

```bash
curl -X DELETE "http://localhost:3000/api/s3?path=portfolio-files2/images/dance/DSC00001.jpg"
```

---

### Rename File

**PATCH** `/api/s3`

Rename or move a file/directory in S3.

#### Request Body

```json
{
  "bucket": "portfolio-files2",
  "oldKey": "images/dance/old-name.jpg",
  "newKey": "images/dance/new-name.jpg"
}
```

#### Response

```json
{
  "success": true
}
```

#### Example Request

```bash
curl -X PATCH http://localhost:3000/api/s3 \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "portfolio-files2",
    "oldKey": "images/dance/old-name.jpg",
    "newKey": "images/dance/new-name.jpg"
  }'
```

---

### Download File

**GET** `/api/s3/download`

Generate a signed download URL for a file.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | Yes | - | Full path including bucket (e.g., `bucket-name/path/to/file.jpg`) |
| `expiresIn` | number | No | `3600` | URL expiration time in seconds |

#### Response

```json
{
  "downloadUrl": "https://s3.amazonaws.com/bucket-name/path/to/file.jpg?X-Amz-Algorithm=..."
}
```

#### Example Request

```bash
curl "http://localhost:3000/api/s3/download?path=portfolio-files2/images/dance/DSC00001.jpg&expiresIn=7200"
```

---

### Download Directory

**GET** `/api/s3/download-directory`

Download a directory as a ZIP file (for small directories) or get download suggestions (for large directories).

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Full path including bucket and directory (e.g., `bucket-name/images/dance`) |

#### Behavior

- **Small directories** (≤100 files AND ≤50MB):
  - Returns ZIP file directly as binary stream
  - Headers: `Content-Type: application/zip`, `Content-Disposition: attachment; filename="directory.zip"`

- **Large directories**:
  - Returns JSON with metadata and suggestions

#### Response (Large Directory)

```json
{
  "message": "Directory is too large for ZIP download (402 files, 1234.56 MB)",
  "directoryName": "dance",
  "fileCount": 402,
  "totalSizeMB": "1234.56",
  "suggestions": [
    "Download individual files using the file browser",
    "Use AWS CLI: aws s3 sync s3://bucket/path/ ./local-folder/",
    "Contact administrator for bulk download assistance",
    "Consider using S3 Transfer Acceleration for large downloads"
  ],
  "files": [...]
}
```

#### Example Request

```bash
curl -O "http://localhost:3000/api/s3/download-directory?path=portfolio-files2/images/dance"
```

---

### Preview/Thumbnail

**GET** `/api/s3/preview`

Generate thumbnails for images, videos, and PDFs. Returns optimized WebP images.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `path` | string | Yes | - | Full path including bucket (e.g., `bucket-name/path/to/image.jpg`) |
| `mw` | number | No | `0` | Maximum width in pixels (0 = original) |
| `mh` | number | No | `0` | Maximum height in pixels (0 = original) |

#### Supported Formats

- **Images**: JPG, JPEG, PNG, GIF, BMP, SVG, WEBP, ICO, TIFF
- **Videos**: MP4 (extracts first frame)
- **Documents**: PDF (converts first page)

#### Behavior

1. Checks if thumbnail exists in temp bucket (configured via `tempBucketName` in app config, default: `idits-drive-tmp`)
2. If cached, returns cached thumbnail
3. If not cached:
   - Downloads original file from S3
   - Generates thumbnail (resizes, converts to WebP)
   - Uploads to temp bucket for future requests (cached for 1 year)
   - Returns thumbnail

**Caching Strategy**: Thumbnails are stored in a temporary S3 bucket with the same key structure as the original file, but with a size suffix (e.g., `image-1000x1000.webp` for a 1000x1000 thumbnail of `image.jpg`).

#### Response

Returns binary image data (WebP format) with headers:
- `Content-Type: image/webp`
- `Cache-Control: max-age=31536000`

#### Example Request

```bash
curl "http://localhost:3000/api/s3/preview?path=portfolio-files2/images/dance/DSC00001.jpg&mw=1000&mh=1000" -o thumbnail.webp
```

---

### File Metadata

**GET** `/api/s3/metadata`

Extract metadata from image or video files (dimensions, duration).

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Full path including bucket (e.g., `bucket-name/path/to/file.jpg`) |

#### Supported Formats

- **Images**: JPG, JPEG, PNG, GIF, BMP, SVG, WEBP, ICO, TIFF
- **Videos**: MP4, AVI, MOV, WMV, FLV, WEBM, MKV, M4V

#### Response (Image)

```json
{
  "width": 1920,
  "height": 1080,
  "format": "jpeg"
}
```

#### Response (Video)

```json
{
  "width": 1920,
  "height": 1080,
  "duration": 125.5
}
```

#### Example Request

```bash
curl "http://localhost:3000/api/s3/metadata?path=portfolio-files2/images/dance/video.mp4"
```

**Note**: Requires `ffprobe` to be installed for video metadata extraction.

---

### File Content

**GET** `/api/s3/content`

Read text file content from S3.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Full path including bucket (e.g., `bucket-name/path/to/file.txt`) |

#### Response

```json
{
  "content": "File content as string",
  "contentType": "text/plain",
  "lastModified": "2025-04-19T19:34:43.000Z",
  "size": 1234
}
```

#### Example Request

```bash
curl "http://localhost:3000/api/s3/content?path=portfolio-files2/documents/readme.txt"
```

---

### Update File Content

**PUT** `/api/s3/content`

Update text file content in S3.

#### Request Body

```json
{
  "bucket": "portfolio-files2",
  "key": "documents/readme.txt",
  "content": "Updated file content",
  "contentType": "text/plain"
}
```

#### Response

```json
{
  "success": true
}
```

#### Example Request

```bash
curl -X PUT http://localhost:3000/api/s3/content \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "portfolio-files2",
    "key": "documents/readme.txt",
    "content": "Updated content"
  }'
```

---

### Get Upload URL

**POST** `/api/s3/upload-url`

Generate a presigned URL for direct client-side uploads to S3.

#### Request Body

```json
{
  "bucket": "portfolio-files2",
  "key": "images/upload.jpg",
  "contentType": "image/jpeg",
  "expiresIn": 3600
}
```

#### Response

```json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket-name/path/to/file.jpg?X-Amz-Algorithm=..."
}
```

#### Example Request

```bash
curl -X POST http://localhost:3000/api/s3/upload-url \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "portfolio-files2",
    "key": "images/upload.jpg",
    "contentType": "image/jpeg",
    "expiresIn": 3600
  }'
```

---

### List Buckets

**GET** `/api/s3/buckets`

List all S3 buckets accessible with the configured AWS credentials.

#### Response

```json
{
  "buckets": [
    {
      "name": "portfolio-files2",
      "creationDate": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Example Request

```bash
curl "http://localhost:3000/api/s3/buckets"
```

---

### Drive Size

**GET** `/api/s3/drive-size`

Calculate total size and object count for an entire S3 bucket (drive).

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `drive` | string | Yes | Bucket name |

#### Response

```json
{
  "drive": "portfolio-files2",
  "totalSize": 1234567890123,
  "totalObjects": 5000,
  "formattedSize": "1.12 TB"
}
```

#### Example Request

```bash
curl "http://localhost:3000/api/s3/drive-size?drive=portfolio-files2"
```

**Note**: This operation can be slow for large buckets as it iterates through all objects.

---

### Directory Size

**GET** `/api/s3/directory-size`

Calculate total size and object count for a specific directory.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Full path including bucket and directory (e.g., `bucket-name/images/dance`) |

#### Response (Specific Directory)

```json
{
  "totalSize": 123456789,
  "totalObjects": 402,
  "formattedSize": "117.74 MB"
}
```

#### Response (All Directories)

If path points to root or no specific directory:

```json
{
  "bucket": "portfolio-files2",
  "prefix": "",
  "directorySizes": {
    "images/": {
      "size": 123456789,
      "objects": 500,
      "formattedSize": "117.74 MB"
    },
    "documents/": {
      "size": 98765432,
      "objects": 100,
      "formattedSize": "94.23 MB"
    }
  }
}
```

#### Example Request

```bash
curl "http://localhost:3000/api/s3/directory-size?path=portfolio-files2/images/dance"
```

**Note**: This operation can be slow for large directories as it iterates through all objects.

---

## Common Response Patterns

### Success Response

Most endpoints return success in this format:

```json
{
  "success": true
}
```

### Error Response

```json
{
  "error": "Error message describing what went wrong"
}
```

### Pagination

Endpoints that support pagination return:

```json
{
  "data": [...],
  "totalPages": 10,
  "currentPage": 1,
  "totalItems": 200
}
```

---

## Path Format Specification

Throughout the API, paths follow a consistent format:

**Format**: `bucketName` or `bucketName/path/to/resource`

**Examples**:
- `portfolio-files2` - Root of bucket
- `portfolio-files2/images` - `images/` folder in bucket
- `portfolio-files2/images/dance/DSC00001.jpg` - Specific file

**Important Notes**:
- Bucket name is always the first segment
- Forward slashes (`/`) are used as path separators
- Trailing slashes on directories are handled automatically
- Paths are URL-encoded when passed as query parameters

---

## Rate Limiting & Performance

- **Thumbnail Generation**: Thumbnails are cached in a temporary S3 bucket for 1 year
- **Large Directories**: Directory operations process in batches of 1000 objects
- **File Upload**: No size limit, but large files may take time
- **Directory Download**: Limited to ≤100 files AND ≤50MB for ZIP generation
- **Default Pagination**: 20 items per page (configurable via `defaultItemsPerPage` in app config)

---

## Dependencies & Requirements

- **Image Processing**: `sharp` library for image thumbnails
- **Video Processing**: `ffmpeg` for video frame extraction
- **PDF Processing**: `poppler-utils` (`pdftoppm`) for PDF thumbnails
- **ZIP Creation**: `archiver` library for directory downloads
- **AWS SDK**: `@aws-sdk/client-s3` for S3 operations

---

## Security Considerations

1. All endpoints require valid AWS credentials
2. Presigned URLs expire after specified duration
3. File paths are validated to prevent path traversal attacks
4. Directory operations batch process large datasets to prevent memory issues

---

## Changelog

### Current Version

- Supports file upload/download/delete/rename
- Directory creation and listing
- Thumbnail generation for images/videos/PDFs
- Metadata extraction for images and videos
- Directory size calculation
- ZIP download for small directories
- Presigned URL generation

---

## Support

For issues or questions, please refer to the main project documentation or contact the development team.

