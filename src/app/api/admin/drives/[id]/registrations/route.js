import { NextResponse } from 'next/server';
import { getDriveRegistrations, registerStudentForDrive } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET: Retrieve all student registrations for a specific drive or event
 */
async function getHandler(req, { params }) {
  try {
    const { id } = params;
    const registrations = await getDriveRegistrations(id);

    return NextResponse.json({
      success: true,
      driveId: id,
      count: registrations.length,
      registrations,
    });
  } catch (err) {
    console.error('[GET /api/admin/drives/[id]/registrations] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch drive registrations', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Manually register a student or update registration status
 */
async function postHandler(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const registered = await registerStudentForDrive({
      ...body,
      driveId: id,
      registration_source: 'web_admin',
    });

    return NextResponse.json({
      success: true,
      message: registered.alreadyRegistered ? 'Student was already registered' : 'Registration saved successfully',
      registration: registered,
    });
  } catch (err) {
    console.error('[POST /api/admin/drives/[id]/registrations] Error:', err);
    return NextResponse.json(
      { error: 'Failed to register student', details: err.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, { requiredRole: 'ADMIN' });
export const POST = withAuth(postHandler, { requiredRole: 'ADMIN' });
