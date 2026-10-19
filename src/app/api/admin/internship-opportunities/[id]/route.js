import { NextResponse } from 'next/server';
import {
  getInternshipOpportunityById,
  updateInternshipOpportunity,
  deleteInternshipOpportunity,
} from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET: Retrieve a single internship opportunity by ID.
 */
async function getHandler(req, context) {
  try {
    const resolvedParams = await Promise.resolve(context?.params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'Opportunity ID is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    const opportunity = await getInternshipOpportunityById(id);

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Internship opportunity not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      opportunity,
    });
  } catch (err) {
    console.error('[GET /api/admin/internship-opportunities/[id]] Error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve internship opportunity', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update an existing internship opportunity (details, status, visibility).
 */
async function patchHandler(req, context) {
  try {
    const resolvedParams = await Promise.resolve(context?.params);
    const id = resolvedParams?.id;
    const body = await req.json();
    const actor = req.user || null;

    if (!id) {
      return NextResponse.json(
        { error: 'Opportunity ID is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    const updated = await updateInternshipOpportunity(id, body, actor);

    return NextResponse.json({
      success: true,
      message: 'Internship opportunity updated successfully',
      opportunity: updated,
    });
  } catch (err) {
    if (err.status === 404) {
      return NextResponse.json(
        { error: err.message || 'Internship opportunity not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    if (err.errors || err.status === 400) {
      return NextResponse.json(
        {
          error: err.message || 'Validation failed for update',
          code: 'VALIDATION_ERROR',
          errors: err.errors || {},
        },
        { status: 400 }
      );
    }

    console.error('[PATCH /api/admin/internship-opportunities/[id]] Error:', err);
    return NextResponse.json(
      { error: 'Failed to update internship opportunity', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Hard delete an internship opportunity (audited).
 */
async function deleteHandler(req, context) {
  try {
    const resolvedParams = await Promise.resolve(context?.params);
    const id = resolvedParams?.id;
    const actor = req.user || null;

    if (!id) {
      return NextResponse.json(
        { error: 'Opportunity ID is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }

    await deleteInternshipOpportunity(id, actor);

    return NextResponse.json({
      success: true,
      message: 'Internship opportunity deleted successfully',
    });
  } catch (err) {
    if (err.status === 404) {
      return NextResponse.json(
        { error: err.message || 'Internship opportunity not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    console.error('[DELETE /api/admin/internship-opportunities/[id]] Error:', err);
    return NextResponse.json(
      { error: 'Failed to delete internship opportunity', details: err.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, { requiredRole: 'ADMIN' });
export const PATCH = withAuth(patchHandler, { requiredRole: 'ADMIN' });
export const DELETE = withAuth(deleteHandler, { requiredRole: 'ADMIN' });
