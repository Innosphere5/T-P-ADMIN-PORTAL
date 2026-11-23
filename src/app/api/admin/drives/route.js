import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pwghazyfxhypzkadqfnn.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

// Server-side in-memory cache for drives
if (!global.__RIMT_DB_DRIVES) {
  global.__RIMT_DB_DRIVES = [
    {
      id: 'drive_tcs_2026',
      title: 'TCS Digital & Ninja National Qualifier 2026',
      category: 'COMPANY_RECRUITMENT',
      companyName: 'Tata Consultancy Services',
      roleTitle: 'Software Engineer (Digital & Ninja)',
      description: 'Campus hiring drive for final and pre-final year engineering and computer applications students.',
      mode: 'On-campus',
      venue: 'RIMT Central Auditorium & Lab 4',
      startsAt: '2026-10-28T09:30:00Z',
      endsAt: '2026-10-29T18:00:00Z',
      registrationDeadline: '2026-10-24T23:59:00Z',
      packageMinLpa: 7.5,
      packageMaxLpa: 11.5,
      eligibility: {
        departments: ['BCA', 'Department of Computer Applications', 'B.Sc Cyber Security'],
        batches: ['2026', '2027'],
        minCgpa: 6.5,
        maxBacklogs: 0,
      },
      status: 'PUBLISHED',
      formSlug: 'tcs-digital-ninja-2026',
      registrations: [],
      notifications: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * GET: Retrieve list of recruitment drives (Supabase events merged with in-memory store)
 */
export async function GET() {
  try {
    let supabaseDrives = [];

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/events?select=*,event_registrations(*)&order=starts_at.desc`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
            cache: 'no-store',
          }
        );
        if (res.ok) {
          const events = await res.json();
          if (Array.isArray(events) && events.length > 0) {
            supabaseDrives = events.map((ev) => ({
              id: ev.id,
              eventId: ev.id,
              title: ev.title,
              category: ev.category,
              companyName: ev.company_name,
              roleTitle: ev.role_title,
              description: ev.description,
              mode: ev.mode,
              venue: ev.venue,
              meetingUrl: ev.meeting_url,
              startsAt: ev.starts_at,
              endsAt: ev.ends_at,
              registrationDeadline: ev.registration_deadline,
              packageMinLpa: ev.package_min_lpa ? Number(ev.package_min_lpa) : null,
              packageMaxLpa: ev.package_max_lpa ? Number(ev.package_max_lpa) : null,
              eligibility: ev.eligibility || {},
              rounds: ev.rounds || [],
              spoc: ev.spoc || {},
              status: ev.status,
              formSlug: ev.form_slug,
              formSchema: ev.form_schema || [],
              registrationLinks: ev.registration_links || [],
              announcements: ev.announcements || [],
              results: ev.results || [],
              notifications: ev.notifications || [],
              registrations: ev.event_registrations || [],
              createdAt: ev.created_at,
              updatedAt: ev.updated_at,
            }));
          }
        }
      } catch (dbErr) {
        console.warn('Supabase events fetch in GET /api/admin/drives:', dbErr.message);
      }
    }

    // Merge Supabase drives with in-memory drives
    const deduped = new Map();
    [...supabaseDrives, ...global.__RIMT_DB_DRIVES].forEach((d) => {
      const key = d.id || d.formSlug || d.title;
      if (!deduped.has(key)) {
        deduped.set(key, d);
      }
    });

    const allDrives = Array.from(deduped.values());

    return NextResponse.json({
      success: true,
      count: allDrives.length,
      drives: allDrives,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to retrieve drives', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a recruitment drive & automatically trigger notification if published
 */
export async function POST(req) {
  try {
    const body = await req.json();

    const drive = {
      id: body.id || `drive_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: body.title || `${body.companyName} Recruitment Drive`,
      category: body.category || 'COMPANY_RECRUITMENT',
      companyName: body.companyName || 'Corporate Partner',
      roleTitle: body.roleTitle || 'Graduate Trainee',
      description: body.description || '',
      mode: body.mode || 'On-campus',
      venue: body.venue || 'Campus Auditorium',
      meetingUrl: body.meetingUrl || '',
      startsAt: body.startsAt || null,
      endsAt: body.endsAt || null,
      registrationDeadline: body.registrationDeadline || null,
      packageMinLpa: body.packageMinLpa ? Number(body.packageMinLpa) : null,
      packageMaxLpa: body.packageMaxLpa ? Number(body.packageMaxLpa) : null,
      eligibility: body.eligibility || {},
      rounds: body.rounds || [],
      spoc: body.spoc || {},
      status: body.status || 'DRAFT',
      formSlug: body.formSlug || body.form_slug || null,
      formSchema: body.formSchema || body.form_schema || [],
      registrations: [],
      notifications: body.notifications || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Persist to Supabase events table if credentials available
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const formSlug =
          drive.formSlug ||
          `${(drive.companyName || 'event').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
        const eventCategory =
          drive.category === 'COMPANY_RECRUITMENT' ? 'PLACEMENT' : drive.category || 'PLACEMENT';

        const eventPayload = {
          title: drive.title,
          description: drive.description,
          category: eventCategory,
          company_name: drive.companyName,
          role_title: drive.roleTitle,
          mode: drive.mode,
          venue: drive.venue,
          meeting_url: drive.meetingUrl,
          starts_at: drive.startsAt,
          ends_at: drive.endsAt,
          registration_deadline: drive.registrationDeadline,
          package_min_lpa: drive.packageMinLpa,
          package_max_lpa: drive.packageMaxLpa,
          eligibility: drive.eligibility,
          rounds: drive.rounds,
          spoc: drive.spoc,
          status: drive.status,
          form_slug: formSlug,
          form_schema: drive.formSchema,
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(eventPayload),
        });

        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows[0]) {
            const inserted = rows[0];
            drive.id = inserted.id;
            drive.eventId = inserted.id;
            drive.formSlug = inserted.form_slug;
          }
        }
      } catch (insertErr) {
        console.warn('Failed to insert event into Supabase:', insertErr.message);
      }
    }

    global.__RIMT_DB_DRIVES.unshift(drive);

    // If drive is published, automatically notify student app
    if (drive.status === 'PUBLISHED') {
      try {
        const pkgStr =
          drive.packageMinLpa && drive.packageMaxLpa
            ? `${drive.packageMinLpa} - ${drive.packageMaxLpa} LPA`
            : drive.packageMinLpa
            ? `${drive.packageMinLpa} LPA`
            : 'Competitive CTC';

        await createNotification({
          title: `New Placement Drive: ${drive.companyName}`,
          message: `${drive.companyName} is conducting a campus drive for ${drive.roleTitle}. Package: ${pkgStr}. Mode: ${drive.mode}. Register before ${
            drive.registrationDeadline
              ? new Date(drive.registrationDeadline).toLocaleDateString('en-IN')
              : 'deadline'
          }!`,
          type: 'drive',
          priority: 'URGENT',
          target_type: 'all',
          idempotency_key: `drive_publish_${drive.id}`,
          data: {
            drive_id: drive.id,
            company_name: drive.companyName,
            role_title: drive.roleTitle,
            package_min: drive.packageMinLpa,
            package_max: drive.packageMaxLpa,
            mode: drive.mode,
            venue: drive.venue,
            starts_at: drive.startsAt,
            registration_deadline: drive.registrationDeadline,
            form_slug: drive.formSlug,
            registration_url: `/register/${drive.formSlug || ''}`,
          },
          action_route: 'register',
          created_by: 'T&P Administration',
        });
      } catch (notifErr) {
        console.warn('Auto drive notification notice:', notifErr.message);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Drive created successfully',
        drive,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create drive', details: err.message },
      { status: 500 }
    );
  }
}
