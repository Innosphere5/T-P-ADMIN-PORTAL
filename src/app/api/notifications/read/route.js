import { NextResponse } from 'next/server';
import { getAuthContext, apiError } from '@/lib/drives/authHelper';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/read
 * Body: { ids?: string[], all?: boolean }
 * Marks specified notifications (or all) as read.
 */
export async function POST(req) {
  try {
    const auth = await getAuthContext(req);
    if (!auth.user && !auth.studentId) {
      return apiError('UNAUTHENTICATED', 'Authentication required');
    }

    const studentId = auth.studentId || auth.user?.id;
    const body = await req.json();
    const now = new Date().toISOString();

    if (body.all) {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('student_id', studentId)
        .is('read_at', null);

      if (error) {
        console.error('[POST /api/notifications/read] all error:', error);
      }
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('student_id', studentId)
        .in('id', body.ids);

      if (error) {
        console.error('[POST /api/notifications/read] ids error:', error);
      }
    }

    return NextResponse.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    console.error('[POST /api/notifications/read] Error:', err);
    return NextResponse.json({ success: true, message: 'OK' });
  }
}
