import { NextResponse } from 'next/server';
import { listBuckets } from '@/lib/s3';

// List all S3 buckets
export async function GET() {
  try {
    const buckets = await listBuckets();
    return NextResponse.json({ buckets });
  } catch (error) {
    console.error('Error in GET /api/s3/buckets:', error);
    return NextResponse.json({ error: 'Failed to list buckets' }, { status: 500 });
  }
}
