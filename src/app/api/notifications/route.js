import { NextResponse } from 'next/server';
import { getNotifications, createNotification } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET: Fetch real-time student notifications.
 * Accessible to student app and admin portal.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const filters = {
      type: searchParams.get('type') || 'all',
      q: searchParams.get('q') || '',
    };

    const notifications = await getNotifications(filters);

    return NextResponse.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error('[GET /api/notifications] Error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve notifications', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Publish a new institutional notification (internship, drive, announcement).
 */
export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.title || !body.message) {
      return NextResponse.json(
        { error: 'Notification title and message are required' },
        { status: 400 }
      );
    }

    const created = await createNotification(body);

    return NextResponse.json(
      {
        success: true,
        message: 'Notification published successfully',
        notification: created,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/notifications] Error:', err);
    return NextResponse.json(
      { error: 'Failed to publish notification', details: err.message },
      { status: 500 }
    );
  }
}
