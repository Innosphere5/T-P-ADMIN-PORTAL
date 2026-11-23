import { NextResponse } from 'next/server';
import { sendFCMPushNotification } from '@/lib/fcmAdmin';

export const dynamic = 'force-dynamic';

/**
 * POST: Broadcast or direct-send an FCM push notification.
 * Body: { title, message, type?, priority?, data?, topic?, targetToken? }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { title, message, type = 'general', priority = 'HIGH', data = {}, topic = 'all_students', targetToken } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'title and message are required' },
        { status: 400 }
      );
    }

    const result = await sendFCMPushNotification({
      title,
      message,
      type,
      priority,
      data,
      topic: targetToken ? null : topic,
      targetToken: targetToken || null,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        recipientCount: result.recipientCount,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          reason: result.reason || 'FCM_SEND_FAILED',
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('[POST /api/fcm/send] Error:', err);
    return NextResponse.json(
      { error: 'Failed to send FCM push notification', details: err.message },
      { status: 500 }
    );
  }
}
