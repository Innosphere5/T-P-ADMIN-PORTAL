import { NextResponse } from 'next/server';
import { getAuthContext, requireAdmin, apiSuccess, apiError } from '@/lib/drives/authHelper';
import { validateFormSchema } from '@/lib/drives/schema';
import { updatePlacementDrive, getPlacementDrives } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/drives/[id]/form
 * Saves the draft schema for a drive after validating field shapes and limits.
 */
export async function PUT(req, { params }) {
  try {
    const auth = await getAuthContext(req);
    requireAdmin(auth);

    const { id } = params;
    const body = await req.json();
    const schema = body.schema || body;

    // Validate form schema definition
    try {
      validateFormSchema(schema);
    } catch (valErr) {
      return apiError('VALIDATION_ERROR', valErr.message);
    }

    // Persist draft schema in drive_forms table
    try {
      // Upsert the single draft where published_at is null
      const { data: existingDraft } = await supabase
        .from('drive_forms')
        .select('*')
        .eq('drive_id', id)
        .is('published_at', null)
        .maybeSingle();

      if (existingDraft) {
        await supabase
          .from('drive_forms')
          .update({ schema, created_at: new Date().toISOString() })
          .eq('id', existingDraft.id);
      } else {
        // Find highest version
        const { data: latest } = await supabase
          .from('drive_forms')
          .select('version')
          .eq('drive_id', id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextVersion = (latest?.version || 0) + 1;
        await supabase.from('drive_forms').insert([
          {
            drive_id: id,
            version: nextVersion,
            schema,
            published_at: null,
          },
        ]);
      }
    } catch (dbErr) {
      console.warn('drive_forms table draft write fallback:', dbErr.message);
    }

    // Also store on drive object in DB for guaranteed fallback availability
    await updatePlacementDrive(id, { form_schema: schema });

    return apiSuccess({
      message: 'Draft form schema saved successfully',
      fieldsCount: schema.length,
      schema,
    });
  } catch (err) {
    if (err.message === 'UNAUTHENTICATED') return apiError('UNAUTHENTICATED', 'Authentication required');
    if (err.message === 'FORBIDDEN') return apiError('FORBIDDEN', 'Administrator access required');
    console.error('[PUT /api/admin/drives/[id]/form] Error:', err);
    return apiError('INTERNAL_ERROR', err.message);
  }
}
