import { NextResponse } from 'next/server';
import { getPlacedStudentsList } from '@/lib/placementStats';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get('sort') || 'latest';
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    const items = await getPlacedStudentsList({ sort, limit });
    return NextResponse.json(
      {
        success: true,
        items,
        count: items.length,
        nextCursor: null,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error('Failed to get placed students:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve placed students list', details: err.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
