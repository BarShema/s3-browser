import { NextRequest, NextResponse } from 'next/server';
import { getDownloadUrl } from '@/lib/s3';
import { verifyAuthorizationToken } from '@/lib/api-auth-server';

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
    const path = searchParams.get('path');
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600');

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Parse the path to extract bucket and key
    // Path format: "bucketName/key" or just "bucketName"
    const pathParts = path.split('/').filter(Boolean);
    const bucket = pathParts[0];
    const key = pathParts.slice(1).join('/');

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
