import { NextResponse } from 'next/server';
import { getPlacementDrives, getDriveRegistrations } from '@/lib/db';
import { getAuthContext } from '@/lib/drives/authHelper';

export const dynamic = 'force-dynamic';

/**
 * GET /api/drives
 * Public list of published drives visible to students.
 * Each item includes: id, slug, title, type, description, deadline, status,
 * registrationEnabled, myRegistration, seatsLeft.
 */
export async function GET(req) {
  try {
    const auth = await getAuthContext(req);
    const allDrives = await getPlacementDrives();

    // Only return published or completed/closed drives
    const published = allDrives.filter(
      (d) => d.status === 'PUBLISHED' || d.status === 'COMPLETED' || d.status === 'published' || d.status === 'closed'
    );

    // Enrich each drive with registration metadata for the requesting student
    const enriched = await Promise.all(
      published.map(async (d) => {
        let myRegistration = false;
        let seatsLeft = null;
        const registrations = await getDriveRegistrations(d.id).catch(() => []);

        if (auth.studentId || auth.user?.id || auth.user?.roll_no) {
          myRegistration = registrations.some(
            (r) =>
              r.student_id === auth.studentId ||
              r.student_id === auth.user?.id ||
              r.roll_no === auth.user?.roll_no ||
              r.roll_no === auth.user?.rollNo
          );
        }

        const maxRegs = d.max_registrations || d.maxRegistrations;
        if (maxRegs) {
          seatsLeft = Math.max(0, maxRegs - registrations.length);
        }

        // Compute drive state
        const registrationEnabled = d.registration_enabled !== false && d.registrationEnabled !== false;
        const isClosed = (d.status || '').toLowerCase() === 'completed' || (d.status || '').toLowerCase() === 'closed';
        const deadlinePassed = d.registration_deadline && new Date(d.registration_deadline) < new Date();
        const isFull = seatsLeft !== null && seatsLeft <= 0;

        let state = 'open';
        if (isClosed) state = 'closed';
        else if (!registrationEnabled) state = 'info_only';
        else if (deadlinePassed) state = 'deadline_passed';
        else if (isFull) state = 'full';
        else if (myRegistration) state = 'registered';

        return {
          ...d,
          registrationEnabled,
          myRegistration,
          seatsLeft,
          state,
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: enriched.length,
      drives: enriched,
      data: enriched,
    });
  } catch (err) {
    console.error('[GET /api/drives] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch drives', details: err.message },
      { status: 500 }
    );
  }
}
