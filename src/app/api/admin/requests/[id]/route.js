import { NextResponse } from 'next/server';
import { getUserById, getStudentDossier, updateStudentDossier } from '@/lib/db';
import { withAuth, sanitizeUser } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET: Retrieve comprehensive student LinkedIn-style dossier
 * Includes bio, name, documents, projects, profile, phone, and academic score
 */
async function getHandler(req, context) {
  try {
    const resolvedParams = await Promise.resolve(context?.params);
    const id = resolvedParams?.id;
    console.log('[GET /api/admin/requests/[id]] Resolved student ID:', id);
    const dossier = await getStudentDossier(id);

    if (!dossier) {
      return NextResponse.json(
        { error: 'Student request or scholar dossier not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: sanitizeUser(dossier),
      dossier: sanitizeUser(dossier),
    });
  } catch (err) {
    console.error('Fetch request details error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve request details', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Admin update for student dossier (bio, phone, headline, cgpa, projects)
 */
async function patchHandler(req, context) {
  try {
    const resolvedParams = await Promise.resolve(context?.params);
    const id = resolvedParams?.id;
    const body = await req.json();

    const actorId = req.user?.id || req.user?.adminId || null;
    const updated = await updateStudentDossier(id, body, actorId);
    if (!updated) {
      return NextResponse.json(
        { error: 'Student record not found for update.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Scholar dossier updated successfully.',
      dossier: sanitizeUser(updated),
    });
  } catch (err) {
    console.error('Update student dossier error:', err);
    return NextResponse.json(
      { error: 'Failed to update student dossier', details: err.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHandler, { requiredRole: 'ADMIN' });
export const PATCH = withAuth(patchHandler, { requiredRole: 'ADMIN' });
