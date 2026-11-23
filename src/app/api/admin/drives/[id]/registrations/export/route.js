import { NextResponse } from 'next/server';
import { getAuthContext, requireAdmin, apiError } from '@/lib/drives/authHelper';
import { getDriveRegistrations } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * Neutralize formula injection: prefix cells starting with =, +, -, @ with a single quote
 */
function sanitizeCSVCell(val) {
  if (typeof val !== 'string') return val == null ? '' : String(val);
  const trimmed = val.trim();
  if (/^[=+\-@]/.test(trimmed)) return `'${trimmed}`;
  // Escape double quotes by doubling them
  if (trimmed.includes('"') || trimmed.includes(',') || trimmed.includes('\n')) {
    return `"${trimmed.replace(/"/g, '""')}"`;
  }
  return trimmed;
}

/**
 * GET /api/admin/drives/[id]/registrations/export
 * CSV stream download. UTF-8 with BOM. Formula-injection safe.
 */
export async function GET(req, { params }) {
  try {
    const auth = await getAuthContext(req);
    requireAdmin(auth);

    const { id } = params;
    const registrations = await getDriveRegistrations(id);

    // Collect all answer keys across registrations for dynamic columns
    const answerKeysSet = new Set();
    const answerKeyLabels = {};

    // Try to load latest published schema for column labels
    try {
      const { data: forms } = await supabase
        .from('drive_forms')
        .select('schema')
        .eq('drive_id', id)
        .not('published_at', 'is', null)
        .order('version', { ascending: false })
        .limit(1);

      if (forms && forms[0]?.schema) {
        for (const field of forms[0].schema) {
          answerKeysSet.add(field.key);
          answerKeyLabels[field.key] = field.label;
        }
      }
    } catch (_) {}

    // Also scan actual answers for any additional keys
    for (const reg of registrations) {
      if (reg.answers && typeof reg.answers === 'object') {
        for (const key of Object.keys(reg.answers)) {
          answerKeysSet.add(key);
          if (!answerKeyLabels[key]) answerKeyLabels[key] = key;
        }
      }
    }

    const answerKeys = [...answerKeysSet];

    // Build CSV
    const fixedHeaders = ['Name', 'Roll No', 'Department', 'Semester', 'Email', 'Phone', 'Registered At'];
    const dynamicHeaders = answerKeys.map((k) => answerKeyLabels[k] || k);
    const allHeaders = [...fixedHeaders, ...dynamicHeaders];

    // UTF-8 BOM
    let csv = '\uFEFF';
    csv += allHeaders.map(sanitizeCSVCell).join(',') + '\n';

    for (const reg of registrations) {
      const fixedCells = [
        sanitizeCSVCell(reg.student_name || ''),
        sanitizeCSVCell(reg.roll_no || ''),
        sanitizeCSVCell(reg.department || ''),
        sanitizeCSVCell(reg.semester || ''),
        sanitizeCSVCell(reg.email || ''),
        sanitizeCSVCell(reg.phone || ''),
        sanitizeCSVCell(reg.registered_at || reg.created_at || ''),
      ];

      const dynamicCells = answerKeys.map((key) => {
        const val = reg.answers?.[key];
        if (Array.isArray(val)) return sanitizeCSVCell(val.join('; '));
        return sanitizeCSVCell(val);
      });

      csv += [...fixedCells, ...dynamicCells].join(',') + '\n';
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="drive_${id}_registrations.csv"`,
      },
    });
  } catch (err) {
    if (err.message === 'UNAUTHENTICATED') return apiError('UNAUTHENTICATED', 'Authentication required');
    if (err.message === 'FORBIDDEN') return apiError('FORBIDDEN', 'Administrator access required');
    console.error('[GET /api/admin/drives/[id]/registrations/export] Error:', err);
    return apiError('INTERNAL_ERROR', err.message);
  }
}
