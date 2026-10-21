import { NextResponse } from 'next/server';
import { createNotification } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Server-side in-memory cache for drives if Supabase table is not yet created
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
      notifications: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * GET: Retrieve list of recruitment drives
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      count: global.__RIMT_DB_DRIVES.length,
      drives: global.__RIMT_DB_DRIVES,
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
      notifications: body.notifications || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    global.__RIMT_DB_DRIVES.unshift(drive);

    // If drive is published, automatically notify student app
    if (drive.status === 'PUBLISHED') {
      try {
        const pkgStr = drive.packageMinLpa && drive.packageMaxLpa
          ? `${drive.packageMinLpa} - ${drive.packageMaxLpa} LPA`
          : (drive.packageMinLpa ? `${drive.packageMinLpa} LPA` : 'Competitive CTC');

        await createNotification({
          title: `New Placement Drive: ${drive.companyName}`,
          message: `${drive.companyName} is conducting a campus drive for ${drive.roleTitle}. Package: ${pkgStr}. Mode: ${drive.mode}. Register before ${drive.registrationDeadline ? new Date(drive.registrationDeadline).toLocaleDateString('en-IN') : 'deadline'}!`,
          type: 'drive',
          priority: 'URGENT',
          target_type: 'all',
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
          },
          action_route: 'placement',
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
