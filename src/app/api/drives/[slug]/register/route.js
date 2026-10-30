import { NextResponse } from 'next/server';
import { getAuthContext, apiError, mapDatabaseError } from '@/lib/drives/authHelper';
import { registerStudentForDrive, getPlacementDrives, getDriveRegistrations } from '@/lib/db';
import { buildAnswerSchema, validateFormSchema } from '@/lib/drives/schema';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

const MAX_BODY_SIZE = 100 * 1024; // 100 KB

/**
 * POST /api/drives/[slug]/register
 * Student submits form answers. Steps:
 * 1. Load published schema
 * 2. Validate answers with buildAnswerSchema
 * 3. Call register_for_drive RPC or direct insert
 */
export async function POST(req, { params }) {
  try {
    const { slug } = params;
    const auth = await getAuthContext(req);

    if (!auth.user && !auth.studentId) {
      return apiError('UNAUTHENTICATED', 'You must be logged in to register');
    }

    // Body size check
    const bodyText = await req.text();
    if (Buffer.byteLength(bodyText, 'utf8') > MAX_BODY_SIZE) {
      return apiError('VALIDATION_ERROR', 'Request body exceeds 100 KB limit');
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (_) {
      return apiError('VALIDATION_ERROR', 'Invalid JSON body');
    }

    const answers = body.answers || {};

    // Find drive by slug or id
    const allDrives = await getPlacementDrives();
    const drive = allDrives.find((d) => d.slug === slug || d.id === slug);

    if (!drive) {
      return apiError('NOT_FOUND', 'Drive not found');
    }

    const statusLower = (drive.status || '').toLowerCase();
    if (statusLower === 'draft') {
      return apiError('NOT_FOUND', 'Drive not found');
    }

    // Check registration eligibility
    const registrationEnabled = drive.registration_enabled !== false && drive.registrationEnabled !== false;
    if (!registrationEnabled) {
      return apiError('REGISTRATION_CLOSED', 'This drive does not accept registrations');
    }
    if (statusLower === 'completed' || statusLower === 'closed') {
      return apiError('REGISTRATION_CLOSED', 'This drive is closed');
    }
    if (drive.registration_deadline && new Date(drive.registration_deadline) < new Date()) {
      return apiError('REGISTRATION_CLOSED', 'Registration deadline has passed');
    }

    // Check capacity
    const registrations = await getDriveRegistrations(drive.id).catch(() => []);
    const maxRegs = drive.max_registrations || drive.maxRegistrations;
    if (maxRegs && registrations.length >= maxRegs) {
      return apiError('DRIVE_FULL', 'Drive has reached maximum capacity');
    }

    // Check duplicate
    const studentId = auth.studentId || auth.user?.id;
    const studentRoll = auth.user?.roll_no || auth.user?.rollNo || body.roll_no || body.rollNumber;
    const alreadyReg = registrations.find(
      (r) => r.student_id === studentId || r.roll_no === studentRoll
    );
    if (alreadyReg) {
      return apiError('ALREADY_REGISTERED', 'You have already registered for this drive');
    }

    // Validate answers against published schema if available
    let publishedSchema = [];
    try {
      const { data: form } = await supabase
        .from('drive_forms')
        .select('schema')
        .eq('drive_id', drive.id)
        .not('published_at', 'is', null)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (form?.schema) publishedSchema = form.schema;
    } catch (_) {}

    if (publishedSchema.length > 0) {
      try {
        const zodSchema = buildAnswerSchema(publishedSchema);
        zodSchema.parse(answers);
      } catch (zodErr) {
        const flatErrors = zodErr.flatten?.() || {};
        return apiError('VALIDATION_ERROR', 'Form answers are invalid', flatErrors.fieldErrors || zodErr.message);
      }
    }

    // Perform registration via existing DB function
    const registration = await registerStudentForDrive({
      drive_id: drive.id,
      driveId: drive.id,
      student_id: studentId,
      student_name: body.student_name || body.studentName || auth.user?.full_name || auth.user?.name || 'Student',
      roll_no: studentRoll || 'UNSPECIFIED',
      email: body.email || auth.user?.email || '',
      phone: body.phone || auth.user?.phone || '',
      department: body.department || auth.user?.department || auth.user?.course || '',
      semester: body.semester || auth.user?.semester || auth.user?.year_semester || '',
      cgpa: body.cgpa || null,
      answers,
      registration_source: 'mobile_app',
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful!',
      alreadyRegistered: Boolean(registration?.alreadyRegistered),
      data: {
        registrationId: registration?.id || registration?.registration_id,
      },
    });
  } catch (err) {
    const msg = err?.message || '';
    if (msg.includes('ALREADY_REGISTERED') || msg.includes('unique_violation')) {
      return apiError('ALREADY_REGISTERED', 'You have already registered for this drive');
    }
    console.error('[POST /api/drives/[slug]/register] Error:', err);
    return mapDatabaseError(err);
  }
}
