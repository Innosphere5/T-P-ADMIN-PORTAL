import { NextResponse } from 'next/server';
import { rejectStudent } from '@/lib/db';
import { withAuth, sanitizeUser } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

async function handler(req, context) {
  try {
    const resolvedParams = await Promise.resolve(context?.params);
    const id = resolvedParams?.id;
    const adminUser = req.user;
    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    const updated = await rejectStudent(id, reason, adminUser.id || adminUser.email);
    if (!updated) {
      return NextResponse.json(
        { error: 'Student record not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Student ${updated.full_name} (${updated.roll_number}) rejected.`,
      request: sanitizeUser(updated),
    });
  } catch (err) {
    console.error('Reject student error:', err);
    const status = err.message?.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500;
    return NextResponse.json(
      { error: err.message || 'Failed to reject student request' },
      { status }
    );
  }
}

export const PATCH = withAuth(handler, { requiredRole: 'ADMIN' });
