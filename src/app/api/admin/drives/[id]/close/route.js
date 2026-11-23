import { NextResponse } from 'next/server';
import { getAuthContext, requireAdmin, apiSuccess, apiError } from '@/lib/drives/authHelper';
import { getPlacementDrives, updatePlacementDrive } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/drives/[id]/close
 * Closes an active drive, preventing further registrations.
 */
export async function POST(req, { params }) {
  try {
    const auth = await getAuthContext(req);
    requireAdmin(auth);

    const { id } = params;
    const drives = await getPlacementDrives();
    const drive = drives.find((d) => d.id === id);

    if (!drive) {
      return apiError('NOT_FOUND', 'Drive not found');
    }

    const updated = await updatePlacementDrive(id, {
      status: 'COMPLETED', // Maps to closed
    });

    try {
      await supabase
        .from('drives')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: 'Drive closed successfully',
      data: {
        id,
        status: 'closed',
        drive: updated,
      },
    });
  } catch (err) {
    if (err.message === 'UNAUTHENTICATED') return apiError('UNAUTHENTICATED', 'Authentication required');
    if (err.message === 'FORBIDDEN') return apiError('FORBIDDEN', 'Administrator access required');
    return apiError('INTERNAL_ERROR', err.message);
  }
}
