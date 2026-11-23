import { NextResponse } from 'next/server';
import { getAuthContext, requireAdmin, apiSuccess, apiError } from '@/lib/drives/authHelper';
import { validateFormSchema, assertSchemaCompatible, SchemaIncompatibleError } from '@/lib/drives/schema';
import { getPlacementDrives, updatePlacementDrive, getDriveRegistrations } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/drives/[id]/publish
 * Validates schema, checks backwards compatibility against registrations,
 * publishes the drive, and returns { slug, link, formVersion, notified }.
 */
export async function POST(req, { params }) {
  try {
    const auth = await getAuthContext(req);
    requireAdmin(auth);

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const drives = await getPlacementDrives();
    const drive = drives.find((d) => d.id === id);

    if (!drive) {
      return apiError('NOT_FOUND', 'Drive not found');
    }

    if ((drive.status || '').toLowerCase() === 'closed') {
      return apiError('REGISTRATION_CLOSED', 'Closed drives cannot be published');
    }

    // Determine target schema: from request body, or drive's draft schema, or empty array
    let nextSchema = body.schema || drive.form_schema || [];
    validateFormSchema(nextSchema);

    // Check existing registrations and previous published version
    const registrations = await getDriveRegistrations(id);
    const hasRegistrations = registrations.length > 0;

    let prevPublished = [];
    try {
      const { data: prevForm } = await supabase
        .from('drive_forms')
        .select('*')
        .eq('drive_id', id)
        .not('published_at', 'is', null)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevForm) prevPublished = prevForm.schema || [];
    } catch (_) {}

    // Assert schema compatibility
    try {
      assertSchemaCompatible(prevPublished, nextSchema, hasRegistrations);
    } catch (compatErr) {
      if (compatErr instanceof SchemaIncompatibleError) {
        return apiError('SCHEMA_INCOMPATIBLE', compatErr.message, compatErr.violations);
      }
      return apiError('VALIDATION_ERROR', compatErr.message);
    }

    // Generate slug if not present
    let slug = drive.slug;
    if (!slug) {
      slug = crypto.randomBytes(5).toString('hex');
    }

    let formVersion = 1;
    let notifiedCount = 0;

    // Try calling publish_drive RPC if database function is active
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('publish_drive', {
        p_drive_id: id,
        p_schema: nextSchema,
      });

      if (!rpcErr && rpcRes) {
        slug = rpcRes.slug || slug;
        formVersion = rpcRes.form_version || formVersion;
        notifiedCount = rpcRes.notified || notifiedCount;
      } else {
        // Direct table update fallback
        const now = new Date().toISOString();
        await supabase
          .from('drive_forms')
          .insert([
            {
              drive_id: id,
              version: formVersion,
              schema: nextSchema,
              published_at: now,
            },
          ]);
      }
    } catch (e) {
      console.warn('publish_drive RPC fallback:', e.message);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const link = `${appUrl}/drives/${slug}`;

    // Update drive status in local DB
    const updated = await updatePlacementDrive(id, {
      slug,
      status: 'PUBLISHED',
      published_at: drive.published_at || new Date().toISOString(),
      form_schema: nextSchema,
      form_version: formVersion,
    });

    return NextResponse.json({
      success: true,
      message: 'Drive published successfully',
      data: {
        id,
        slug,
        link,
        formVersion,
        notified: notifiedCount,
        drive: updated,
      },
    });
  } catch (err) {
    if (err.message === 'UNAUTHENTICATED') return apiError('UNAUTHENTICATED', 'Authentication required');
    if (err.message === 'FORBIDDEN') return apiError('FORBIDDEN', 'Administrator access required');
    console.error('[POST /api/admin/drives/[id]/publish] Error:', err);
    return apiError('INTERNAL_ERROR', err.message);
  }
}
