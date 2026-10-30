import { NextResponse } from 'next/server';
import { getUserByRollNo } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rollNo = searchParams.get('roll_no') || searchParams.get('roll');

    if (!rollNo || !rollNo.trim()) {
      return NextResponse.json({ success: false, error: 'Roll number is required' }, { status: 400 });
    }

    const student = await getUserByRollNo(rollNo.trim());

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student record not found' }, { status: 404 });
    }

    // Clean up sensitive fields before returning
    const safeStudent = {
      id: student.id,
      name: student.name || student.full_name || 'Scholar',
      full_name: student.full_name || student.name || 'Scholar',
      roll_no: student.roll_no || student.roll_number,
      roll_number: student.roll_number || student.roll_no,
      department: student.department || student.course || 'BCA',
      course: student.course || student.department || 'BCA',
      batch: student.batch || student.year_semester || '1st Year (1st Sem)',
      semester: student.semester || student.year_semester || '1st Year (1st Sem)',
      year_semester: student.year_semester || student.batch || '1st Year (1st Sem)',
      avatar_url: student.avatar_url || student.avatar || null,
      status: (student.status || 'APPROVED').toUpperCase(),
      cgpa: student.cgpa || 8.5,
      skills: student.skills || [],
    };

    return NextResponse.json({ success: true, student: safeStudent });
  } catch (err) {
    console.error('[GET /api/auth/student-lookup] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
