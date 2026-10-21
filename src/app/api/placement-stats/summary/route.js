import { NextResponse } from 'next/server';
import { getPlacementSummary } from '@/lib/placementStats';

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
    const cohort = searchParams.get('academicYear') || searchParams.get('cohort') || 'AY 2024–25';

    const data = await getPlacementSummary(cohort);
    return NextResponse.json(
      { success: true, ...data },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error('Failed to get placement summary:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve placement statistics summary', details: err.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
