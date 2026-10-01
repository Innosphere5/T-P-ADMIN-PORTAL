import { NextResponse } from 'next/server';
import { revokeStudent } from '@/lib/db';
import { withAuth, sanitizeUser } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

async function handler(req, context) {
  try {
    const resolvedParams = await Promise.resolve(context?.params);
    const id = resolvedParams?.id;
    const adminUser = req.user;
    const body = await req.json().catch(() => ({}));
    const updated = await revokeStudent(id, body.reason, adminUser.id || adminUser.email);

    if (!updated) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Access for ${updated.full_name} (${updated.roll_number}) was revoked.`,
      request: sanitizeUser(updated),
    });
  } catch (err) {
    console.error('Revoke student error:', err);
    const status = err.message?.includes('SUPABASE_SERVICE_ROLE_KEY') ? 503 : 500;
    return NextResponse.json(
      { error: err.message || 'Failed to revoke student access.' },
      { status }
    );
  }
}

export const PATCH = withAuth(handler, { requiredRole: 'ADMIN' });