import { NextRequest, NextResponse } from 'next/server';
import { listBuckets } from '@/lib/s3';
import { verifyAuthorizationToken } from '@/lib/api-auth-server';

// List all S3 buckets
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
    const buckets = await listBuckets();
    return NextResponse.json({ buckets });
  } catch (error) {
    console.error('Error in GET /api/s3/buckets:', error);
    return NextResponse.json({ error: 'Failed to list buckets' }, { status: 500 });
  }
}
