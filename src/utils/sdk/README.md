# IDITS Drive SDK

A standalone TypeScript SDK for interacting with the IDITS Drive API. This SDK provides a clean, type-safe interface for managing files, directories, and drives in S3-based storage.

## Features

- 🎯 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 🔧 **Standalone**: Can be used in any project, not tied to Next.js
- 📦 **Modular**: Organized by resource type (drive, directory, file)
- ⚙️ **Configurable**: Easy base URL configuration via environment variable or constructor
- 🚀 **Simple API**: Clean, intuitive method names

## Installation

```bash
# If using npm
npm install

# If using yarn
yarn install

# If using pnpm
pnpm install
```

## Configuration

The SDK uses the `NEXT_PUBLIC_API_BASE_URL` environment variable for the base URL. If not set, you can provide it via constructor.

### Environment Variable

Set the base URL in your environment:

```bash
# .env.local or .env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3010
```

### Constructor

You can also create a custom SDK instance with a specific base URL:

```typescript
import { SDK } from '@/utils/sdk';

const customApi = new SDK('https://api.example.com');
```

**Note**: Empty string is a valid value (uses relative URLs). If both environment variable and constructor parameter are undefined/null, an error will be thrown.

## Usage

### Basic Import

```typescript
import api from '@/utils/sdk';
```

### Drive Operations

#### List all drives

```typescript
const response = await api.drive.listDrives();
// Response: { drives: ['idits-drive', 'idits-drive-backup'] }
```

#### Get drive size

```typescript
const size = await api.drive.getSize({ drive: 'idits-drive' });
// Response: {
//   drive: 'idits-drive',
//   totalSize: 1073741824,
//   totalObjects: 1500,
//   formattedSize: '1.00 GB'
// }
```

#### List files and directories

```typescript
const files = await api.drive.list({
  path: 'idits-drive/folder/subfolder',
  page: 1,
  limit: 20,
  name: 'document',      // Optional: filter by name
  type: 'file',          // Optional: 'file', 'directory', or ''
  extension: 'pdf'        // Optional: filter by extension
});
// Response: {
//   files: [...],
//   directories: [...],
//   totalFiles: 150,
//   totalDirectories: 25,
//   totalPages: 8,
//   currentPage: 1
// }
```

### Directory Operations

#### Create directory

```typescript
await api.drive.directory.create({
  drive: 'idits-drive',
  dirKey: 'folder/subfolder'
});
```

#### Delete directory

```typescript
await api.drive.directory.delete({
  path: 'idits-drive/folder/subfolder'
});
```

#### Rename directory

```typescript
await api.drive.directory.rename({
  drive: 'idits-drive',
  oldKey: 'folder/old-name',
  newKey: 'folder/new-name'
});
```

#### Get directory size

```typescript
// Single directory
const size = await api.drive.directory.getSize({
  path: 'idits-drive/folder/subfolder'
});
// Response: {
//   totalSize: 52428800,
//   totalObjects: 100,
//   formattedSize: '50.00 MB'
// }

// All directories (root path)
const allSizes = await api.drive.directory.getSize({
  path: 'idits-drive'
});
// Response: {
//   drive: 'idits-drive',
//   prefix: '',
//   directorySizes: {
//     'folder/': { size: 52428800, objects: 100, formattedSize: '50.00 MB' },
//     ...
//   }
// }
```

#### Download directory as ZIP

```typescript
const response = await api.drive.directory.download({
  path: 'idits-drive/folder/subfolder'
});

// Small directories: Returns Response (ZIP blob)
if (response instanceof Response) {
  const blob = await response.blob();
  // Handle ZIP download
}

// Large directories: Returns JSON error
if (!(response instanceof Response)) {
  console.error(response.message);
  // Handle error with suggestions
}
```

### File Operations

#### Upload file

```typescript
const file = new File(['content'], 'file.txt', { type: 'text/plain' });

await api.drive.file.upload({
  file: file,
  drive: 'idits-drive',
  key: 'folder/subfolder/file.txt'
});
```

#### Delete file

```typescript
await api.drive.file.delete({
  path: 'idits-drive/folder/file.txt'
});
```

#### Rename file

```typescript
await api.drive.file.rename({
  drive: 'idits-drive',
  oldKey: 'folder/old-name.txt',
  newKey: 'folder/new-name.txt'
});
```

#### Get file content

```typescript
const content = await api.drive.file.getContent({
  path: 'idits-drive/documents/readme.txt'
});
// Response: {
//   content: 'File content here...',
//   contentType: 'text/plain',
//   lastModified: '2024-01-15T10:30:00Z',
//   size: 28
// }
```

#### Save file content

```typescript
await api.drive.file.saveContent({
  drive: 'idits-drive',
  key: 'documents/readme.txt',
  content: 'Updated content here',
  contentType: 'text/plain'  // Optional, defaults to 'text/plain'
});
```

#### Download file (get download URL)

```typescript
const response = await api.drive.file.download({
  path: 'idits-drive/folder/file.pdf',
  expiresIn: 3600  // Optional: URL expiration in seconds (default: 3600)
});
// Response: {
//   downloadUrl: 'https://...presigned-url...'
// }

// Use the download URL
window.open(response.downloadUrl, '_blank');
```

#### Get file metadata

```typescript
const metadata = await api.drive.file.getMetadata({
  path: 'idits-drive/photos/image.jpg'
});

// Image metadata
if ('format' in metadata && !('duration' in metadata)) {
  console.log(`Image: ${metadata.width}x${metadata.height}, ${metadata.format}`);
  // Access EXIF data: metadata.exif
}

// Video metadata
if ('duration' in metadata) {
  console.log(`Video: ${metadata.width}x${metadata.height}, ${metadata.duration}s`);
  // Access video properties: metadata.bitrate, metadata.fps
}
```

#### Get preview URL

```typescript
const previewUrl = api.drive.file.getPreviewUrl({
  path: 'idits-drive/photos/image.jpg',
  maxWidth: 400,   // Optional
  maxHeight: 400   // Optional
});
// Returns: URL string for use in <img src={previewUrl} />
```

#### Get upload URL (presigned URL)

```typescript
const response = await api.drive.file.getUploadUrl({
  drive: 'idits-drive',
  key: 'folder/file.pdf',
  contentType: 'application/pdf',  // Optional
  expiresIn: 3600                    // Optional (default: 3600)
});
// Response: {
//   uploadUrl: 'https://...presigned-url...'
// }

// Upload directly to S3 using the presigned URL
await fetch(response.uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': 'application/pdf'
  }
});
```

## Path Format

All paths use the format: `{drive}/{key}` where:
- `drive`: Drive name (e.g., `idits-drive`)
- `key`: File or directory path within the drive (e.g., `folder/subfolder/file.txt`)

Examples:
- `idits-drive` - Root of the drive
- `idits-drive/folder` - A folder in the root
- `idits-drive/folder/subfolder/file.txt` - A file in a subfolder

## Type Definitions

All types are exported from `@/utils/sdk/types`:

```typescript
import type {
  // Drive types
  ListDrivesResponse,
  DriveSizeResponse,
  GetDriveSizeParams,
  ListFilesParams,
  ListFilesResponse,
  
  // Directory types
  CreateDirectoryParams,
  RenameDirectoryParams,
  DirectorySizeResponse,
  AllDirectoriesSizeResponse,
  
  // File types
  UploadFileParams,
  FileContentResponse,
  SaveFileContentParams,
  DownloadFileResponse,
  FileMetadataResponse,
  ImageMetadata,
  VideoMetadata,
  
  // Common types
  SuccessResponse,
  ErrorResponse
} from '@/utils/sdk/types';
```

## Error Handling

All methods throw errors on failure. Use try-catch blocks:

```typescript
try {
  await api.drive.file.upload({
    file: myFile,
    drive: 'idits-drive',
    key: 'folder/file.txt'
  });
} catch (error) {
  if (error instanceof Error) {
    console.error('Upload failed:', error.message);
  }
}
```

## Custom SDK Instance

Create a custom SDK instance with a different base URL:

```typescript
import { SDK } from '@/utils/sdk';

// Create instance with custom base URL
const customApi = new SDK('https://api.example.com');

// Use the custom instance
await customApi.drive.listDrives();

// Change base URL at runtime
customApi.setBaseUrl('https://new-api.example.com');
```

## API Endpoints

The SDK uses the following API endpoints:

- `GET /api/drive` - List files/directories or get file content
- `POST /api/drive` - Upload file or create directory
- `DELETE /api/drive` - Delete file or directory
- `PATCH /api/drive` - Rename file or directory
- `GET /api/drive/list` - List all drives
- `GET /api/drive/size` - Get drive size
- `GET /api/drive/directory/size` - Get directory size
- `GET /api/drive/directory/download` - Download directory as ZIP
- `PUT /api/drive/file` - Update file content
- `GET /api/drive/file/download` - Get download URL
- `GET /api/drive/file/preview` - Get preview/thumbnail
- `GET /api/drive/file/metadata` - Get file metadata
- `POST /api/drive/file/upload-url` - Get presigned upload URL

## Examples

### Complete File Upload Flow

```typescript
import api from '@/utils/sdk';

async function uploadFile(file: File, drive: string, folder: string) {
  try {
    // Upload the file
    await api.drive.file.upload({
      file: file,
      drive: drive,
      key: `${folder}/${file.name}`
    });
    
    console.log('File uploaded successfully');
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

### List and Filter Files

```typescript
import api from '@/utils/sdk';

async function searchPDFs(drive: string, folder: string) {
  const results = await api.drive.list({
    path: `${drive}/${folder}`,
    extension: 'pdf',
    type: 'file',
    page: 1,
    limit: 50
  });
  
  return results.files;
}
```

### Download Large Directory

```typescript
import api from '@/utils/sdk';

async function downloadDirectory(drive: string, folder: string) {
  try {
    const response = await api.drive.directory.download({
      path: `${drive}/${folder}`
    });
    
    if (response instanceof Response) {
      // Small directory - download ZIP
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folder}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      // Large directory - show error with suggestions
      console.error(response.message);
      if (response.suggestions) {
        response.suggestions.forEach(suggestion => {
          console.log(`- ${suggestion}`);
        });
      }
    }
  } catch (error) {
    console.error('Download failed:', error);
  }
}
```

## License

This SDK is part of the IDITS Drive project.

