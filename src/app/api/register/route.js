import { NextResponse } from 'next/server.js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pwghazyfxhypzkadqfnn.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

/**
 * POST /api/register — Server-side student event registration endpoint
 * 
 * Algorithm:
 * 1. Validate required fields (name, roll_no, event reference)
 * 2. Resolve the event UUID from form_slug or event_id
 * 3. Check for duplicate registration (same student + event)
 * 4. INSERT into event_registrations table
 * 5. Return registration receipt (Supabase Realtime pushes the INSERT to admin panel)
 */
export async function POST(req) {
  try {
    const body = await req.json();

    // 1. Validate required fields
    const studentName = (body.student_name || '').trim();
    const studentRollNo = (body.student_roll_no || '').trim();
    const formSlug = (body.form_slug || '').replace(/^event-/, '').trim();
    let eventId = body.event_id || null;

    if (!studentName) {
      return NextResponse.json(
        { success: false, error: 'Student name is required.' },
        { status: 400 }
      );
    }
    if (!studentRollNo) {
      return NextResponse.json(
        { success: false, error: 'Roll number is required.' },
        { status: 400 }
      );
    }
    if (!eventId && !formSlug) {
      return NextResponse.json(
        { success: false, error: 'Event reference (event_id or form_slug) is required.' },
        { status: 400 }
      );
    }

    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    const isUuid = (str) =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    // 2. Resolve the real event UUID
    let realEventId = isUuid(eventId) ? eventId : null;

    if (!realEventId && formSlug) {
      // Try resolving via events table by form_slug
      try {
        const lookupRes = await fetch(
          `${SUPABASE_URL}/rest/v1/events?form_slug=eq.${encodeURIComponent(formSlug)}&select=id&limit=1`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        if (lookupRes.ok) {
          const rows = await lookupRes.json();
          if (Array.isArray(rows) && rows[0]?.id && isUuid(rows[0].id)) {
            realEventId = rows[0].id;
          }
        }
      } catch (lookupErr) {
        console.warn('[/api/register] Event lookup by form_slug failed:', lookupErr.message);
      }
    }

    // If still no UUID, check notifications table for drive_id -> event_id mapping
    if (!realEventId) {
      const searchIdentifier = eventId || formSlug;
      try {
        const notifRes = await fetch(
          `${SUPABASE_URL}/rest/v1/notifications?data->>drive_id=eq.${encodeURIComponent(searchIdentifier)}&select=data&order=created_at.desc&limit=3`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        if (notifRes.ok) {
          const notifRows = await notifRes.json();
          const match = Array.isArray(notifRows)
            ? notifRows.find((n) => n.data?.event_id && isUuid(n.data.event_id))
            : null;
          if (match) {
            realEventId = match.data.event_id;
          }
        }
      } catch {}
    }

    if (!realEventId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to resolve event. The event may not have been published to the database yet. Please try again shortly.',
        },
        { status: 422 }
      );
    }

    // 3. Check for duplicate registration
    try {
      const dupRes = await fetch(
        `${SUPABASE_URL}/rest/v1/event_registrations?event_id=eq.${realEventId}&student_roll_no=ilike.${encodeURIComponent(studentRollNo)}&select=id&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      if (dupRes.ok) {
        const dupRows = await dupRes.json();
        if (Array.isArray(dupRows) && dupRows.length > 0) {
          return NextResponse.json(
            { success: false, error: 'You have already registered for this drive / event.' },
            { status: 409 }
          );
        }
      }
    } catch {}

    // 4. INSERT into event_registrations
    const registrationPayload = {
      event_id: realEventId,
      student_roll_no: studentRollNo,
      student_name: studentName,
      student_email: (body.student_email || '').trim() || null,
      student_phone: (body.student_phone || '').trim() || null,
      department: (body.department || '').trim() || null,
      semester: (body.semester || '').trim() || null,
      form_responses: body.form_responses || {},
      status: 'REGISTERED',
    };

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/event_registrations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(registrationPayload),
    });

    if (!insertRes.ok) {
      const errBody = await insertRes.text();
      // Check for unique constraint violation (duplicate)
      if (insertRes.status === 409 || errBody.includes('23505')) {
        return NextResponse.json(
          { success: false, error: 'You have already registered for this drive / event.' },
          { status: 409 }
        );
      }
      console.error('[/api/register] Supabase INSERT failed:', insertRes.status, errBody);
      return NextResponse.json(
        { success: false, error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }

    const insertedRows = await insertRes.json();
    const registration = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;

    // 5. Return success receipt
    return NextResponse.json(
      {
        success: true,
        message: 'Registration submitted successfully.',
        registration,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[/api/register] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}

