import { NextRequest, NextResponse } from 'next/server';
import { s3Client, uploadToS3 } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Parse the path to extract bucket and key
    const pathParts = path.split('/').filter(Boolean);
    const bucket = pathParts[0];
    const key = pathParts.slice(1).join('/');

    if (!bucket || !key) {
      return NextResponse.json({ error: 'Bucket and key are required' }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const content = await response.Body.transformToString();
    const contentType = response.ContentType || 'text/plain';

    return NextResponse.json({ 
      content, 
      contentType,
      lastModified: response.LastModified,
      size: response.ContentLength 
    });
  } catch (error) {
    console.error('Error in GET /api/s3/content:', error);
    return NextResponse.json({ error: 'Failed to get file content' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { bucket, key, content, contentType = 'text/plain' } = body;

    if (!bucket || !key || content === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const buffer = Buffer.from(content, 'utf-8');
    await uploadToS3(bucket, key, buffer, contentType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/s3/content:', error);
    return NextResponse.json({ error: 'Failed to save file content' }, { status: 500 });
  }
}