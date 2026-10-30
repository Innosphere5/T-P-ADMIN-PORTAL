import { NextResponse } from 'next/server';
import { getAuthContext, requireAdmin, apiSuccess, apiError } from '@/lib/drives/authHelper';
import { getPlacementDrives, createPlacementDrive } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/drives
 * Lists all drives with query filters, pagination, and registration counts.
 */
export async function GET(req) {
  try {
    const auth = await getAuthContext(req);
    requireAdmin(auth);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const q = searchParams.get('q')?.toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

    let allDrives = await getPlacementDrives();

    // Map from DB or placement_drives
    if (status) {
      allDrives = allDrives.filter((d) => (d.status || '').toLowerCase() === status.toLowerCase());
    }
    if (type) {
      allDrives = allDrives.filter((d) => (d.category || d.type || '').toLowerCase() === type.toLowerCase());
    }
    if (q) {
      allDrives = allDrives.filter(
        (d) =>
          d.title?.toLowerCase().includes(q) ||
          d.company_name?.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q)
      );
    }

    const total = allDrives.length;
    const paginated = allDrives.slice((page - 1) * pageSize, page * pageSize);

    // Provide dual response structure for 100% backward & spec compatibility
    return NextResponse.json({
      success: true,
      connected: true,
      count: total,
      drives: paginated,
      data: {
        total,
        page,
        pageSize,
        items: paginated,
      },
    });
  } catch (err) {
    if (err.message === 'UNAUTHENTICATED') return apiError('UNAUTHENTICATED', 'Authentication required');
    if (err.message === 'FORBIDDEN') return apiError('FORBIDDEN', 'Administrator access required');
    console.error('[GET /api/admin/drives] Error:', err);
    return apiError('INTERNAL_ERROR', err.message);
  }
}

/**
 * POST /api/admin/drives
 * Creates a new draft drive.
 */
export async function POST(req) {
  try {
    const auth = await getAuthContext(req);
    requireAdmin(auth);

    const body = await req.json();
    if (!body.title || !body.title.trim() || body.title.length < 3) {
      return apiError('VALIDATION_ERROR', 'Title must be between 3 and 150 characters');
    }

    const driveType = (body.type || body.category || 'company').toLowerCase();
    const created = await createPlacementDrive({
      ...body,
      title: body.title.trim(),
      category: body.category || driveType.toUpperCase(),
      type: driveType,
      status: body.status || 'DRAFT',
      registration_enabled: body.registrationEnabled !== false,
      deadline: body.deadline || body.registration_deadline || null,
      max_registrations: body.maxRegistrations || null,
      eligible_branches: body.eligibleBranches || null,
      eligible_years: body.eligibleYears || null,
      created_by: auth.user?.id || 'admin',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Drive draft created successfully',
        drive: created,
        data: created,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err.message === 'UNAUTHENTICATED') return apiError('UNAUTHENTICATED', 'Authentication required');
    if (err.message === 'FORBIDDEN') return apiError('FORBIDDEN', 'Administrator access required');
    console.error('[POST /api/admin/drives] Error:', err);
    return apiError('INTERNAL_ERROR', err.message);
  }
}
