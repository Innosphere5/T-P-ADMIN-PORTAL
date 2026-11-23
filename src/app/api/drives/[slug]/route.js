import { NextResponse } from 'next/server';
import { getPlacementDrives, getDriveRegistrations } from '@/lib/db';
import { getAuthContext } from '@/lib/drives/authHelper';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * GET /api/drives/[slug]
 * Drive detail + latest published schema + alreadyRegistered + state
 */
export async function GET(req, { params }) {
  try {
    const { slug } = params;
    const auth = await getAuthContext(req);
    const allDrives = await getPlacementDrives();

    // Find by slug or by id
    const drive = allDrives.find(
      (d) => d.slug === slug || d.id === slug
    );

    if (!drive) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Drive not found' } },
        { status: 404 }
      );
    }

    // Hide drafts from students
    const statusLower = (drive.status || '').toLowerCase();
    if (statusLower === 'draft' && !auth.isAdmin) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Drive not found' } },
        { status: 404 }
      );
    }

    // Load published form schema
    let publishedSchema = [];
    try {
      const { data: form } = await supabase
        .from('drive_forms')
        .select('*')
        .eq('drive_id', drive.id)
        .not('published_at', 'is', null)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (form) publishedSchema = form.schema || [];
    } catch (_) {}

    if (publishedSchema.length === 0 && (drive.customForm || drive.formSchema)) {
      publishedSchema = drive.customForm || drive.formSchema || [];
    }

    // Check registration status
    const registrations = await getDriveRegistrations(drive.id).catch(() => []);
    let alreadyRegistered = false;
    let myRegistration = null;

    if (auth.user?.id || auth.user?.roll_no || auth.studentId) {
      const found = registrations.find(
        (r) =>
          r.student_id === auth.studentId ||
          r.student_id === auth.user?.id ||
          r.roll_no === auth.user?.roll_no ||
          r.roll_no === auth.user?.rollNo
      );
      if (found) {
        alreadyRegistered = true;
        myRegistration = {
          registrationId: found.id,
          registeredAt: found.registered_at || found.created_at,
          answers: found.answers || {},
        };
      }
    }

    // Compute state
    const registrationEnabled = drive.registration_enabled !== false && drive.registrationEnabled !== false;
    const isClosed = statusLower === 'completed' || statusLower === 'closed';
    const deadlinePassed = drive.registration_deadline && new Date(drive.registration_deadline) < new Date();
    const maxRegs = drive.max_registrations || drive.maxRegistrations;
    const isFull = maxRegs && registrations.length >= maxRegs;

    let state = 'open';
    if (!registrationEnabled) state = 'info_only';
    else if (isClosed) state = 'closed';
    else if (deadlinePassed) state = 'deadline_passed';
    else if (isFull) state = 'full';
    else if (alreadyRegistered) state = 'registered';

    const seatsLeft = maxRegs ? Math.max(0, maxRegs - registrations.length) : null;

    return NextResponse.json({
      success: true,
      data: {
        ...drive,
        publishedSchema,
        alreadyRegistered,
        myRegistration,
        state,
        seatsLeft,
        registrationCount: registrations.length,
      },
    });
  } catch (err) {
    console.error('[GET /api/drives/[slug]] Error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
