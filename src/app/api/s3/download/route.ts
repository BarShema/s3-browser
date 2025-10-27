import { NextRequest, NextResponse } from 'next/server';
import { getDownloadUrl } from '@/lib/s3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket');
    const key = searchParams.get('key');
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600');

    if (!bucket || !key) {
      return NextResponse.json({ error: 'Bucket and key are required' }, { status: 400 });
    }

    const downloadUrl = await getDownloadUrl(bucket, key, expiresIn);
    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error('Error in GET /api/s3/download:', error);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
}
