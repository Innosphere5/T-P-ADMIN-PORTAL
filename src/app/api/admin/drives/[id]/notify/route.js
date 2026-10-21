import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST: Dispatch student notification for a placement drive event.
 */
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { event, audienceCount, title, body: messageBody } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Notification title and body are required' },
        { status: 400 }
      );
    }

    // Lookup drive in memory if present
    const drive = (global.__RIMT_DB_DRIVES || []).find((d) => d.id === id);

    // Create system notification
    const notification = await createNotification({
      title: title,
      message: messageBody,
      type: 'drive',
      priority: event === 'RESULTS_PUBLISHED' ? 'HIGH' : 'URGENT',
      target_type: 'all',
      data: {
        drive_id: id,
        event: event || 'GENERAL',
        company_name: drive?.companyName || 'Corporate Partner',
        role_title: drive?.roleTitle || '',
        audience_estimate: audienceCount,
      },
      action_route: 'placement',
      created_by: 'T&P Administration',
    });

    const notifyLog = {
      event: event || 'GENERAL',
      sentAt: new Date().toISOString(),
      sentBy: 'T&P Administration',
      audienceCount: audienceCount || 0,
      title,
      body: messageBody,
      status: 'DELIVERED',
      notificationId: notification.id,
    };

    if (drive) {
      drive.notifications = [notifyLog, ...(drive.notifications || [])];
    }

    return NextResponse.json({
      success: true,
      status: 'DELIVERED',
      deliveredCount: audienceCount || 1,
      message: `Notification broadcasted to ${audienceCount || 'eligible'} students successfully.`,
      log: notifyLog,
      notification,
    });
  } catch (err) {
    console.error('[POST /api/admin/drives/[id]/notify] Error:', err);
    return NextResponse.json(
      { error: 'Failed to dispatch drive notification', details: err.message },
      { status: 500 }
    );
  }
}
