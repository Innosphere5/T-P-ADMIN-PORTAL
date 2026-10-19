import { NextResponse } from 'next/server';
import { getInternshipOpportunities, createInternshipOpportunity } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET: List internship opportunities with filtering, sorting, and search.
 */
async function getHandler(req) {
  try {
    const { searchParams } = new URL(req.url);

    const filters = {
      q: searchParams.get('q') || '',
      skills: searchParams.get('skills') || '',
      duration: searchParams.get('duration') || '',
      season: searchParams.get('season') || '',
      compensation: searchParams.get('compensation') || '',
      company: searchParams.get('company') || '',
      status: searchParams.get('status') || '',
      department: searchParams.get('department') || '',
      sort: searchParams.get('sort') || 'newest',
    };

    const opportunities = await getInternshipOpportunities(filters);

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      opportunities,
    });
  } catch (err) {
    console.error('[GET /api/admin/internship-opportunities] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch internship opportunities', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new corporate internship opportunity.
 * Full server-side validation per R2/R3 schema.
 */
async function postHandler(req) {
  try {
    const body = await req.json();
    const actor = req.user || null;

    const created = await createInternshipOpportunity(body, actor);

    return NextResponse.json(
      {
        success: true,
        message: 'Internship opportunity created successfully',
        opportunity: created,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err.errors || err.status === 400) {
      return NextResponse.json(
        {
          error: err.message || 'Validation failed for internship opportunity',
          code: 'VALIDATION_ERROR',
          errors: err.errors || {},
        },
        { status: 400 }
      );
    }

    console.error('[POST /api/admin/internship-opportunities] Error:', err);
    return NextResponse.json(
      { error: 'Failed to create internship opportunity', details: err.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, { requiredRole: 'ADMIN' });
export const POST = withAuth(postHandler, { requiredRole: 'ADMIN' });
