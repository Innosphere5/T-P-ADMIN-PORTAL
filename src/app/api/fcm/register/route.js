import { NextResponse } from 'next/server';
import { subscribeTokenToTopic } from '@/lib/fcmAdmin';

export const dynamic = 'force-dynamic';

/**
 * POST: Register or refresh a student's FCM device token.
 * Called by the student app on login/boot to ensure push delivery.
 *
 * Body: { roll_no, token, device_platform?, token_type? }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { roll_no, token, device_platform = 'android', token_type = 'fcm' } = body;

    if (!roll_no || !token) {
      return NextResponse.json(
        { error: 'roll_no and token are required' },
        { status: 400 }
      );
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.warn('[FCM Register] Supabase credentials not configured');
      return NextResponse.json(
        { success: false, reason: 'SUPABASE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    // Upsert the token into fcm_tokens table
    const now = new Date().toISOString();
    const upsertPayload = {
      roll_no: String(roll_no).toUpperCase().trim(),
      token: String(token).trim(),
      device_platform,
      token_type,
      is_active: true,
      last_refreshed_at: now,
      updated_at: now,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/fcm_tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(upsertPayload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn('[FCM Register] Supabase upsert failed:', res.status, errText);
    }

    // Subscribe the native FCM token to the all_students topic for broadcast
    if (token_type === 'fcm' && token && !token.startsWith('ExponentPushToken')) {
      subscribeTokenToTopic(token, 'all_students').catch((e) =>
        console.warn('[FCM Register] Topic subscription notice:', e.message)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'FCM token registered successfully',
      roll_no: upsertPayload.roll_no,
    });
  } catch (err) {
    console.error('[POST /api/fcm/register] Error:', err);
    return NextResponse.json(
      { error: 'Failed to register FCM token', details: err.message },
      { status: 500 }
    );
  }
}
