import { NextResponse } from 'next/server';
import { getAllStudentInternships } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

async function handler() {
  try {
    const list = await getAllStudentInternships();
    return NextResponse.json({
      success: true,
      internships: list,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch student internships', details: err.message },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, { requiredRole: 'ADMIN' });
