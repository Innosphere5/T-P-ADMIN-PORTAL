import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/drives/authHelper';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/unread-count
 * Returns { count } of unread notifications for the authenticated student.
 */
export async function GET(req) {
  try {
    const auth = await getAuthContext(req);
    const studentId = auth.studentId || auth.user?.id;

    if (!studentId) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .is('read_at', null);

    if (error) {
      return NextResponse.json({ success: true, count: 0 });
    }

    return NextResponse.json({ success: true, count: count || 0 });
  } catch (err) {
    return NextResponse.json({ success: true, count: 0 });
  }
}
