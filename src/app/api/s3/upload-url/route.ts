import { NextRequest, NextResponse } from 'next/server';
import { getUploadUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bucket, key, contentType, expiresIn = 3600 } = body;

    if (!bucket || !key || !contentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const uploadUrl = await getUploadUrl(bucket, key, contentType, expiresIn);
    return NextResponse.json({ uploadUrl });
  } catch (error) {
    console.error('Error in POST /api/s3/upload-url:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
