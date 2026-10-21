import { NextResponse } from 'next/server';
import { getHiringCompaniesWithScholars } from '@/lib/placementStats';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const companies = await getHiringCompaniesWithScholars();
    return NextResponse.json(
      {
        success: true,
        count: companies.length,
        companies,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error('Failed to get hiring companies:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve hiring companies', details: err.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
