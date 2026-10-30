import { NextResponse } from 'next/server';
import { getAuthContext, apiError } from '@/lib/drives/authHelper';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Cursor-paginated notifications list, newest first.
 * Query: cursor (ISO timestamp), limit (default 20)
 */
export async function GET(req) {
  try {
    const auth = await getAuthContext(req);
    if (!auth.user && !auth.studentId) {
      return apiError('UNAUTHENTICATED', 'Authentication required');
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const studentId = auth.studentId || auth.user?.id;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('[GET /api/notifications] DB error:', error);
      // Fallback: return empty list if table doesn't exist yet
      return NextResponse.json({
        success: true,
        data: [],
        nextCursor: null,
      });
    }

    const nextCursor =
      notifications && notifications.length === limit
        ? notifications[notifications.length - 1].created_at
        : null;

    return NextResponse.json({
      success: true,
      data: notifications || [],
      nextCursor,
    });
  } catch (err) {
    console.error('[GET /api/notifications] Error:', err);
    return NextResponse.json({ success: true, data: [], nextCursor: null });
  }
}
