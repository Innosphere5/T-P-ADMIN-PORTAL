import { NextResponse } from 'next/server';
import { getAuthContext, requireAdmin, apiSuccess, apiError } from '@/lib/drives/authHelper';
import { getPlacementDrives, updatePlacementDrive, deletePlacementDrive, getDriveRegistrations } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/drives/[id]
 * Returns Drive + draft schema + latest published schema + hasRegistrations
 */
export async function GET(req, { params }) {
  try {
    const auth = await getAuthContext(req);
    requireAdmin(auth);

    const { id } = params;
    const drives = await getPlacementDrives();
    const drive = drives.find((d) => d.id === id);

    if (!drive) {
      return apiError('NOT_FOUND', 'Drive not found');
    }

    // Check registrations count
    const registrations = await getDriveRegistrations(id);
    const hasRegistrations = registrations.length > 0;

    // Fetch schemas from drive_forms table if available
    let draftSchema = [];
    let publishedSchema = [];

    try {
      const { data: forms } = await supabase
        .from('drive_forms')
        .select('*')
        .eq('drive_id', id)
        .order('version', { ascending: false });

      if (forms && forms.length > 0) {
        const published = forms.find((f) => f.published_at !== null);
        const draft = forms.find((f) => f.published_at === null);
        if (published) publishedSchema = published.schema || [];
        if (draft) draftSchema = draft.schema || [];
      }
    } catch (_) {}

    // Fallback if schemas were stored in drive
    if (draftSchema.length === 0 && (drive.customForm || drive.formSchema || drive.form_schema)) {
      draftSchema = drive.customForm || drive.formSchema || drive.form_schema || [];
    }
    if (publishedSchema.length === 0 && (drive.customForm || drive.formSchema || drive.form_schema)) {
      publishedSchema = drive.customForm || drive.formSchema || drive.form_schema || [];
    }

    return NextResponse.json({
      success: true,
      drive,
      data: {
        ...drive,
        draftSchema,
        publishedSchema,
        hasRegistrations,
        registrationCount: registrations.length,
      },
    });
  } catch (err) {
    if (err.message === 'UNAUTHENTICATED') return apiError('UNAUTHENTICATED', 'Authentication required');
    if (err.message === 'FORBIDDEN') return apiError('FORBIDDEN', 'Administrator access required');
    console.error('[GET /api/admin/drives/[id]] Error:', err);
    return apiError('INTERNAL_ERROR', err.message);
  }
}

/**
 * PATCH /api/admin/drives/[id]
 * Updates drive details (cannot alter slug or status via PATCH)
 */
export async function PATCH(req, { params }) {
  try {
    const auth = await getAuthContext(req);
    requireAdmin(auth);

    const { id } = params;
    const updates = await req.json();

    // Prevent direct status or slug tampering via PATCH
    delete updates.slug;
    delete updates.status;

    const updated = await updatePlacementDrive(id, updates);
    if (!updated) {
      return apiError('NOT_FOUND', 'Drive not found');
    }

    return NextResponse.json({
      success: true,
      message: 'Drive details updated successfully',
      drive: updated,
      data: updated,
    });
  } catch (err) {
    if (err.message === 'UNAUTHENTICATED') return apiError('UNAUTHENTICATED', 'Authentication required');
    if (err.message === 'FORBIDDEN') return apiError('FORBIDDEN', 'Administrator access required');
    return apiError('INTERNAL_ERROR', err.message);
  }
}

/**
 * PUT: Kept for backwards compatibility with existing UI
 */
export async function PUT(req, { params }) {
  return PATCH(req, { params });
}

/**
 * DELETE /api/admin/drives/[id]
 * Allowed only if status 'draft' or zero registrations
 */
export async function DELETE(req, { params }) {
  try {
    const auth = await getAuthContext(req);
    requireAdmin(auth);

    const { id } = params;
    const drives = await getPlacementDrives();
    const drive = drives.find((d) => d.id === id);

    if (!drive) {
      return apiError('NOT_FOUND', 'Drive not found');
    }

    const registrations = await getDriveRegistrations(id);
    const isDraft = (drive.status || '').toLowerCase() === 'draft';

    if (!isDraft && registrations.length > 0) {
      return apiError(
        'HAS_REGISTRATIONS',
        `Cannot delete drive with ${registrations.length} existing registration(s). Close the drive instead.`
      );
    }

    await deletePlacementDrive(id);
    return NextResponse.json({
      success: true,
      message: 'Drive deleted successfully',
      data: { id, deleted: true },
    });
  } catch (err) {
    if (err.message === 'UNAUTHENTICATED') return apiError('UNAUTHENTICATED', 'Authentication required');
    if (err.message === 'FORBIDDEN') return apiError('FORBIDDEN', 'Administrator access required');
    return apiError('INTERNAL_ERROR', err.message);
  }
}
