import { NextResponse } from 'next/server';
import { getPlacementDrives, dispatchDriveNotification } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

/**
 * POST: Dispatches notification to all students for this drive
 */
async function postHandler(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const drives = await getPlacementDrives();
    const drive = drives.find((d) => d.id === id);

    const notif = await dispatchDriveNotification({
      driveId: id,
      title: body.title || (drive ? `${drive.category === 'COLLEGE_EVENT' ? 'Event' : drive.category === 'COMPETITION' ? 'Competition' : 'Placement Drive'}: ${drive.title}` : 'Campus Notice'),
      body: body.body || (drive?.description ? drive.description.slice(0, 160) : 'Registration is now live on the student portal.'),
      drive: drive || null,
    });

    return NextResponse.json({
      success: true,
      deliveredCount: body.audienceCount || 1,
      notification: notif,
    });
  } catch (err) {
    console.error('[POST /api/admin/drives/[id]/notify] Error:', err);
    return NextResponse.json(
      { error: 'Failed to dispatch notification', details: err.message },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler, { requiredRole: 'ADMIN' });
