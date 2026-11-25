import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/db';
import { generateFormSlug } from '@/lib/driveUtils';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://pwghazyfxhypzkadqfnn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

/**
 * POST: Authoritative single-dispatch endpoint for placement drive notifications.
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

    // 1. Lookup drive in memory
    const drive = (global.__RIMT_DB_DRIVES || []).find((d) => d.id === id);

    // 2. Lookup event in Supabase events table to resolve canonical UUID & form_slug
    let realEventId = id;
    let realFormSlug = drive?.formSlug || drive?.form_slug;

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const queryUrl = isUUID
          ? `${SUPABASE_URL}/rest/v1/events?id=eq.${id}&select=id,title,form_slug,company_name,role_title&limit=1`
          : `${SUPABASE_URL}/rest/v1/events?or=(form_slug.eq.${id},title.ilike.*${encodeURIComponent(drive?.title || title)}*)&select=id,title,form_slug,company_name,role_title&limit=1`;

        const evRes = await fetch(queryUrl, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        });
        if (evRes.ok) {
          const events = await evRes.json();
          if (Array.isArray(events) && events.length > 0) {
            realEventId = events[0].id;
            realFormSlug = events[0].form_slug || realFormSlug;
          }
        }
      } catch (dbErr) {
        console.warn('[notify route] Supabase event resolution notice:', dbErr.message);
      }
    }

    if (!realFormSlug) {
      realFormSlug = generateFormSlug(drive?.title || title || 'placement-drive');
    }

    // 3. Dispatch system notification (createNotification automatically pushes to FCM ONCE)
    const notification = await createNotification({
      title: title,
      message: messageBody,
      type: 'drive',
      priority: event === 'RESULTS_PUBLISHED' ? 'HIGH' : 'URGENT',
      target_type: 'all',
      idempotency_key: `drive_notify_${realEventId}_${event || 'GENERAL'}`,
      data: {
        drive_id: id,
        event_id: realEventId,
        form_slug: realFormSlug,
        registration_url: `/register/${realFormSlug}`,
        event: event || 'GENERAL',
        company_name: drive?.companyName || 'Corporate Partner',
        role_title: drive?.roleTitle || '',
        audience_estimate: audienceCount,
      },
      action_route: 'register',
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
