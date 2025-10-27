import { NextRequest, NextResponse } from 'next/server';
import { listS3Objects, getDownloadUrl, uploadToS3, deleteFromS3, renameS3Object, getFileMetadata, getUploadUrl } from '@/lib/s3';

// List files and directories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket');
    const prefix = searchParams.get('prefix') || '';

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket name is required' }, { status: 400 });
    }

    const result = await listS3Objects(bucket, prefix);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/s3:', error);
    return NextResponse.json({ error: 'Failed to list objects' }, { status: 500 });
  }
}

// Upload file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;
    const key = formData.get('key') as string;

    if (!file || !bucket || !key) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToS3(bucket, key, buffer, file.type);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/s3:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

// Delete file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket');
    const key = searchParams.get('key');

    if (!bucket || !key) {
      return NextResponse.json({ error: 'Bucket and key are required' }, { status: 400 });
    }

    await deleteFromS3(bucket, key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/s3:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}

// Rename file
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { bucket, oldKey, newKey } = body;

    if (!bucket || !oldKey || !newKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await renameS3Object(bucket, oldKey, newKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/s3:', error);
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 });
  }
}
