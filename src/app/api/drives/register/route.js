import { NextResponse } from 'next/server';
import { registerStudentForDrive } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST: Student Registration Endpoint
 * Public / Authenticated student submission from Expo React Native app or Web Portal
 */
export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.drive_id && !body.driveId) {
      return NextResponse.json({ error: 'drive_id is required' }, { status: 400 });
    }

    if (!body.student_name && !body.studentName) {
      return NextResponse.json({ error: 'student_name is required' }, { status: 400 });
    }

    if (!body.roll_no && !body.rollNumber) {
      return NextResponse.json({ error: 'roll_no is required' }, { status: 400 });
    }

    const registration = await registerStudentForDrive({
      ...body,
      registration_source: body.registration_source || 'mobile_app',
    });

    return NextResponse.json({
      success: true,
      message: registration.alreadyRegistered
        ? 'You have already registered for this drive/event'
        : 'Registration successful! Your application has been recorded.',
      alreadyRegistered: Boolean(registration.alreadyRegistered),
      registration,
    });
  } catch (err) {
    console.error('[POST /api/drives/register] Error:', err);
    return NextResponse.json(
      { error: 'Failed to complete registration', details: err.message },
      { status: 500 }
    );
  }
}
