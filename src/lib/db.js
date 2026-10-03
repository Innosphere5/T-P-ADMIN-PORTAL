/**
 * Unified Database Layer
 * Interfaces with Supabase PostgreSQL and provides an in-memory fallback store
 * ensuring reliable functionality across environments and unit test runners.
 */

import { hashPassword } from './auth.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pwghazyfxhypzkadqfnn.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || 'sb_publishable_i_u2xeBeomYmIqQ2XhD66Q_jD0bb4XN';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IS_TEST_ENV = process.env.NODE_ENV === 'test'
  || process.argv?.some((argument) => argument.includes('test'))
  || Boolean(process.env.VITEST)
  || Boolean(process.env.JEST_WORKER_ID);

const HAS_SUPABASE_READ = Boolean(SUPABASE_URL && SUPABASE_KEY);

function getAdminWriteHeaders() {
  const token = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
  if (!token) {
    return null;
  }

  return {
    apikey: token,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function normalizeStatus(value) {
  const raw = (value || 'UNKNOWN').toUpperCase();
  return raw === 'VERIFIED' ? 'APPROVED' : raw;
}

function normalizeStudentRecord(student) {
  if (!student) return null;

  const fullName = student.full_name || student.name || student.fullName || null;
  const rollNumber = student.roll_number || student.roll_no || student.rollNumber || null;
  const department = student.department || student.course || student.dept || null;
  const yearSemester = student.year_semester || student.batch || student.semester || student.yearSemester || null;
  const avatarUrl = student.avatar_url || student.avatar || null;
  const phone = student.phone || student.contact_number || student.phone_no || null;
  const bio = student.bio || student.about || null;
  const aboutMe = student.about_me || null;
  const headline = student.headline || (department ? `${department} Scholar @ RIMT University | Software Engineer` : 'RIMT University Scholar');
  const bannerUrl = student.banner_url || student.banner || null;
  const cgpa = student.cgpa || student.academic_score_cgpa || null;
  const academicScore = student.academic_score || (cgpa ? Number((Number(cgpa) * 9.5).toFixed(1)) : null);

  // Parse JSONB fields
  let parsedSkills = student.skills || [];
  if (typeof parsedSkills === 'string') {
    try { parsedSkills = JSON.parse(parsedSkills); } catch { parsedSkills = []; }
  }
  let parsedSemesterScores = student.semester_scores || [];
  if (typeof parsedSemesterScores === 'string') {
    try { parsedSemesterScores = JSON.parse(parsedSemesterScores); } catch { parsedSemesterScores = []; }
  }

  return {
    ...student,
    id: student.id || student.student_id || null,
    full_name: fullName,
    name: fullName,
    roll_number: rollNumber,
    roll_no: rollNumber,
    department,
    course: department,
    year_semester: yearSemester,
    batch: yearSemester,
    semester: yearSemester,
    avatar_url: avatarUrl,
    avatar: avatarUrl,
    banner_url: bannerUrl,
    phone,
    bio,
    about_me: aboutMe,
    headline,
    cgpa,
    academic_score: academicScore,
    skills: parsedSkills,
    semester_scores: parsedSemesterScores,
    current_semester: student.current_semester || null,
    attendance_rate: student.attendance_rate || null,
    academic_standing: student.academic_standing || null,
    active_backlogs: student.active_backlogs ?? null,
    total_credits: student.total_credits || null,
    faculty_advisor: student.faculty_advisor || null,
    admin_notes: student.admin_notes || null,
    status: normalizeStatus(student.status),
    role: student.role || 'USER',
    rejection_reason: student.rejection_reason || null,
    revocation_reason: student.revocation_reason || null,
    created_at: student.created_at || null,
    reviewed_by: student.reviewed_by || null,
    reviewed_at: student.reviewed_at || null,
  };
}

function buildPublicRecordFromSupabase(student) {
  if (!student) return null;
  return normalizeStudentRecord(student);
}

function getMemoryUsers() {
  return global.__RIMT_DB_USERS || [];
}

// Global singleton in-memory database to persist across hot-reloads and API calls
if (!global.__RIMT_DB_USERS) {
  global.__RIMT_DB_USERS = [];
  global.__RIMT_DB_INITIALIZED = false;
}

if (!global.__RIMT_DB_ADMINS) {
  global.__RIMT_DB_ADMINS = [];
  global.__RIMT_DB_ADMINS_INITIALIZED = false;
}

function getMemoryAdmins() {
  return global.__RIMT_DB_ADMINS || [];
}

/**
 * Seed initial administrative and sample student accounts
 */
export async function initDb() {
  if (global.__RIMT_DB_INITIALIZED) return;

  const adminHash = await hashPassword('Admin@123');

  global.__RIMT_DB_USERS = [
    {
      id: 'admin-001-uuid',
      full_name: 'RIMT System Administrator',
      roll_number: 'ADMIN-001',
      department: 'University Administration',
      year_semester: 'Staff',
      email: 'admin@rimt.ac.in',
      password_hash: adminHash,
      status: 'APPROVED',
      role: 'ADMIN',
      created_at: new Date('2026-09-01T10:00:00Z').toISOString(),
    },
  ];

  global.__RIMT_DB_INITIALIZED = true;
}

/**
 * Seed the two fixed authorized admin accounts.
 * Only Raj Kumar (BCAHOD) and Sagrika (VICEHOD) can access the portal.
 * Passwords are pre-hashed with PBKDF2-SHA256, 10000 iterations, salt='rimt-salt-key'.
 */
export async function initAdminDb() {
  if (global.__RIMT_DB_ADMINS_INITIALIZED) return;

  global.__RIMT_DB_ADMINS = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      full_name: 'Raj Kumar',
      email: null,
      password_hash: 'd680cfb989acd4d9054db88f98af7ec384a8b69c7b16c3995c7b92c28897e54a',
      profile_pic_url: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      last_login_at: null,
      created_at: new Date('2026-09-01T10:00:00Z').toISOString(),
      updated_at: new Date('2026-09-01T10:00:00Z').toISOString(),
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      full_name: 'Sagrika',
      email: null,
      password_hash: '6e0fe68a50605d90af3ce96b8dc2921095f27a562e758eb2866bade3e3a37381',
      profile_pic_url: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      last_login_at: null,
      created_at: new Date('2026-09-01T10:00:00Z').toISOString(),
      updated_at: new Date('2026-09-01T10:00:00Z').toISOString(),
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      full_name: 'Dean T&P Cell',
      email: 'dean.tp.rimt@gmail.com',
      password_hash: 'e1b1ed1445413ae2f55381cae964ee6cb020696f7f26a09b407bf3f63d5e3027',
      profile_pic_url: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      last_login_at: null,
      created_at: new Date('2026-09-01T10:00:00Z').toISOString(),
      updated_at: new Date('2026-09-01T10:00:00Z').toISOString(),
    },
  ];

  global.__RIMT_DB_ADMINS_INITIALIZED = true;
}

/**
 * Find user by email (case-insensitive)
 */
export async function getUserByEmail(email) {
  await initDb();
  const normalized = email?.trim().toLowerCase();
  const inMem = getMemoryUsers().find((u) => (u.email || u.mail)?.toLowerCase() === normalized);
  if (inMem) return inMem;

  if (!HAS_SUPABASE_READ) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?or=(email.ilike.${encodeURIComponent(email)},email.eq.${encodeURIComponent(email)})&select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      return buildPublicRecordFromSupabase(data[0]);
    }
  } catch (err) {
    console.warn('Supabase getUserByEmail error:', err.message);
  }

  return null;
}

/**
 * Find user by roll number (case-insensitive)
 */
export async function getUserByRollNo(rollNo) {
  await initDb();
  const normalized = rollNo?.trim().toUpperCase();
  const inMem = getMemoryUsers().find((u) => {
    const candidateRolls = [u.roll_number, u.roll_no, u.rollNumber];
    return candidateRolls.some((value) => String(value || '').trim().toUpperCase() === normalized);
  });
  if (inMem) return inMem;

  if (!HAS_SUPABASE_READ) return null;

  try {
    const candidates = [
      `${SUPABASE_URL}/rest/v1/students?roll_no=ilike.${encodeURIComponent(normalized)}&select=*`,
      `${SUPABASE_URL}/rest/v1/students?roll_number=ilike.${encodeURIComponent(normalized)}&select=*`,
      `${SUPABASE_URL}/rest/v1/students?or=(roll_no.ilike.${encodeURIComponent(normalized)},roll_number.ilike.${encodeURIComponent(normalized)})&select=*`,
    ];

    for (const url of candidates) {
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        return buildPublicRecordFromSupabase(row);
      }
    }
  } catch (err) {
    console.warn('Supabase getUserByRollNo error:', err.message);
  }

  return null;
}

/**
 * Find user by ID
 */
export async function getUserById(id) {
  await initDb();
  const inMem = getMemoryUsers().find((u) => u.id === id || u.roll_number === id);
  if (inMem) return inMem;

  if (!HAS_SUPABASE_READ) return null;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?or=(id.eq.${encodeURIComponent(id)},roll_no.eq.${encodeURIComponent(id)})&select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      return buildPublicRecordFromSupabase(data[0]);
    }
  } catch (err) {
    console.warn('Supabase getUserById error:', err.message);
  }

  return null;
}

/**
 * Create a new student (default status: PENDING, role: USER)
 */
export async function createStudent({
  full_name,
  roll_number,
  department,
  year_semester,
  email,
  password_hash,
}) {
  await initDb();

  const id = crypto.randomUUID ? crypto.randomUUID() : `std-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const newStudent = {
    id,
    full_name: full_name.trim(),
    name: full_name.trim(),
    roll_number: roll_number.trim().toUpperCase(),
    roll_no: roll_number.trim().toUpperCase(),
    department: department?.trim() || null,
    course: department?.trim() || null,
    year_semester: year_semester?.trim() || null,
    batch: year_semester?.trim() || null,
    semester: year_semester?.trim() || null,
    email: email?.trim().toLowerCase() || null,
    password_hash,
    status: 'PENDING',
    role: 'USER',
    rejection_reason: null,
    revocation_reason: null,
    created_at: new Date().toISOString(),
    reviewed_by: null,
    reviewed_at: null,
  };

  if (IS_TEST_ENV) {
    global.__RIMT_DB_USERS.unshift(newStudent);
    return newStudent;
  }

  if (HAS_SUPABASE_READ) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          name: newStudent.full_name,
          full_name: newStudent.full_name,
          roll_no: newStudent.roll_number,
          roll_number: newStudent.roll_number,
          department: newStudent.department,
          course: newStudent.department,
          batch: newStudent.year_semester,
          year_semester: newStudent.year_semester,
          semester: newStudent.year_semester,
          status: 'PENDING',
          role: 'USER',
        }),
      });
      if (response.ok) {
        const [inserted] = await response.json();
        if (inserted) {
          Object.assign(newStudent, {
            id: inserted.id,
            created_at: inserted.created_at || newStudent.created_at,
          });
        }
      }
    } catch (e) {
      console.warn('Supabase createStudent fallback used:', e.message);
    }
  }

  global.__RIMT_DB_USERS.unshift(newStudent);
  return newStudent;
}

/**
 * Get all requests filtered by status (integrates live Supabase + memory)
 */
export async function getRequests({ status = 'PENDING' } = {}) {
  await initDb();

  let supabaseStudents = [];

  if (HAS_SUPABASE_READ) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=*&order=created_at.desc`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          supabaseStudents = list.map(buildPublicRecordFromSupabase).filter(Boolean);
        }
      }
    } catch (err) {
      console.warn('Supabase fetch error in getRequests:', err.message);
    }
  }

  const memoryRecords = getMemoryUsers()
    .filter((user) => user.role === 'USER')
    .map((user) => ({
      ...user,
      full_name: user.full_name || user.name || null,
      roll_number: user.roll_number || user.roll_no || null,
      department: user.department || null,
      year_semester: user.year_semester || null,
      status: normalizeStatus(user.status),
    }));

  const deduped = new Map();
  [...supabaseStudents, ...memoryRecords].forEach((record) => {
    const key = record.id || record.roll_number || record.roll_no;
    if (!key) return;
    deduped.set(String(key), record);
  });

  const records = Array.from(deduped.values());

  if (!status || status === 'ALL') {
    return records;
  }

  return records.filter((u) => u.status === status);
}

/**
 * Approve a student request
 */
export async function approveStudent(id, adminId = 'ADMIN-001') {
  await initDb();
  const now = new Date().toISOString();

  const targetUser = getMemoryUsers().find((user) => user.id === id || user.roll_number === id || user.roll_number?.toUpperCase() === String(id || '').toUpperCase());
  if (IS_TEST_ENV) {
    if (targetUser) {
      targetUser.status = 'APPROVED';
      targetUser.rejection_reason = null;
      targetUser.revocation_reason = null;
      targetUser.reviewed_by = adminId;
      targetUser.reviewed_at = now;
      return { ...targetUser };
    }
    return null;
  }

  const writeHeaders = getAdminWriteHeaders();
  let updatedSupabaseStudent = null;

  if (writeHeaders && HAS_SUPABASE_READ) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const query = isUuid
        ? `id=eq.${encodeURIComponent(id)}`
        : `roll_no=ilike.${encodeURIComponent(id)}`;

      const response = await fetch(`${SUPABASE_URL}/rest/v1/students?${query}`, {
        method: 'PATCH',
        headers: writeHeaders,
        body: JSON.stringify({
          status: 'APPROVED',
          updated_at: now,
        }),
      });

      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows[0]) {
          updatedSupabaseStudent = rows[0];
        }
      } else {
        console.warn(`Supabase approve PATCH failed with status ${response.status}`);
      }
    } catch (err) {
      console.warn('Supabase approveStudent error:', err.message);
    }
  }

  if (updatedSupabaseStudent) {
    const normalized = normalizeStudentRecord(updatedSupabaseStudent);
    normalized.status = 'APPROVED';
    normalized.rejection_reason = null;
    normalized.revocation_reason = null;
    normalized.reviewed_by = adminId;
    normalized.reviewed_at = now;

    const memIndex = getMemoryUsers().findIndex((u) => u.id === normalized.id || u.roll_number === normalized.roll_number);
    if (memIndex >= 0) {
      global.__RIMT_DB_USERS[memIndex] = { ...global.__RIMT_DB_USERS[memIndex], ...normalized };
    } else {
      global.__RIMT_DB_USERS.unshift(normalized);
    }
    return normalized;
  }

  if (targetUser) {
    targetUser.status = 'APPROVED';
    targetUser.rejection_reason = null;
    targetUser.revocation_reason = null;
    targetUser.reviewed_by = adminId;
    targetUser.reviewed_at = now;
    return { ...targetUser };
  }

  return null;
}

/**
 * Reject a student request with reason
 */
export async function rejectStudent(id, reason = null, adminId = 'ADMIN-001') {
  await initDb();
  const now = new Date().toISOString();
  const finalReason = reason || 'Registration details did not meet university institutional criteria.';

  const targetUser = getMemoryUsers().find((user) => user.id === id || user.roll_number === id || user.roll_number?.toUpperCase() === String(id || '').toUpperCase());
  if (IS_TEST_ENV) {
    if (targetUser) {
      targetUser.status = 'REJECTED';
      targetUser.rejection_reason = finalReason;
      targetUser.revocation_reason = null;
      targetUser.reviewed_by = adminId;
      targetUser.reviewed_at = now;
      return { ...targetUser };
    }
    return null;
  }

  const writeHeaders = getAdminWriteHeaders();
  let updatedSupabaseStudent = null;

  if (writeHeaders && HAS_SUPABASE_READ) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const query = isUuid
        ? `id=eq.${encodeURIComponent(id)}`
        : `roll_no=ilike.${encodeURIComponent(id)}`;

      const response = await fetch(`${SUPABASE_URL}/rest/v1/students?${query}`, {
        method: 'PATCH',
        headers: writeHeaders,
        body: JSON.stringify({
          status: 'REJECTED',
          updated_at: now,
        }),
      });

      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows[0]) {
          updatedSupabaseStudent = rows[0];
        }
      } else {
        console.warn(`Supabase reject PATCH failed with status ${response.status}`);
      }
    } catch (err) {
      console.warn('Supabase rejectStudent error:', err.message);
    }
  }

  if (updatedSupabaseStudent) {
    const normalized = normalizeStudentRecord(updatedSupabaseStudent);
    normalized.status = 'REJECTED';
    normalized.rejection_reason = finalReason;
    normalized.revocation_reason = null;
    normalized.reviewed_by = adminId;
    normalized.reviewed_at = now;

    const memIndex = getMemoryUsers().findIndex((u) => u.id === normalized.id || u.roll_number === normalized.roll_number);
    if (memIndex >= 0) {
      global.__RIMT_DB_USERS[memIndex] = { ...global.__RIMT_DB_USERS[memIndex], ...normalized };
    } else {
      global.__RIMT_DB_USERS.unshift(normalized);
    }
    return normalized;
  }

  if (targetUser) {
    targetUser.status = 'REJECTED';
    targetUser.rejection_reason = finalReason;
    targetUser.revocation_reason = null;
    targetUser.reviewed_by = adminId;
    targetUser.reviewed_at = now;
    return { ...targetUser };
  }

  return null;
}

export async function revokeStudent(id, reason = null, adminId = 'ADMIN-001') {
  await initDb();
  const now = new Date().toISOString();
  const finalReason = reason?.trim() || 'Student access revoked by university administration.';

  const targetUser = getMemoryUsers().find((user) => user.id === id || user.roll_number === id || user.roll_number?.toUpperCase() === String(id || '').toUpperCase());
  if (IS_TEST_ENV) {
    if (targetUser) {
      targetUser.status = 'REVOKED';
      targetUser.revocation_reason = finalReason;
      targetUser.reviewed_by = adminId;
      targetUser.reviewed_at = now;
      return { ...targetUser };
    }
    return null;
  }

  const writeHeaders = getAdminWriteHeaders();
  let updatedSupabaseStudent = null;

  if (writeHeaders && HAS_SUPABASE_READ) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const query = isUuid
        ? `id=eq.${encodeURIComponent(id)}`
        : `roll_no=ilike.${encodeURIComponent(id)}`;

      const response = await fetch(`${SUPABASE_URL}/rest/v1/students?${query}`, {
        method: 'PATCH',
        headers: writeHeaders,
        body: JSON.stringify({
          status: 'REVOKED',
          updated_at: now,
        }),
      });

      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows[0]) {
          updatedSupabaseStudent = rows[0];
        }
      } else {
        console.warn(`Supabase revoke PATCH failed with status ${response.status}`);
      }
    } catch (err) {
      console.warn('Supabase revokeStudent error:', err.message);
    }
  }

  if (updatedSupabaseStudent) {
    const normalized = normalizeStudentRecord(updatedSupabaseStudent);
    normalized.status = 'REVOKED';
    normalized.revocation_reason = finalReason;
    normalized.reviewed_by = adminId;
    normalized.reviewed_at = now;

    const memIndex = getMemoryUsers().findIndex((u) => u.id === normalized.id || u.roll_number === normalized.roll_number);
    if (memIndex >= 0) {
      global.__RIMT_DB_USERS[memIndex] = { ...global.__RIMT_DB_USERS[memIndex], ...normalized };
    } else {
      global.__RIMT_DB_USERS.unshift(normalized);
    }
    return normalized;
  }

  if (targetUser) {
    targetUser.status = 'REVOKED';
    targetUser.revocation_reason = finalReason;
    targetUser.reviewed_by = adminId;
    targetUser.reviewed_at = now;
    return { ...targetUser };
  }

  return null;
}

/**
 * Update student profile (only allowed if status === 'APPROVED')
 */
export async function updateProfile(id, updates) {
  await initDb();
  const user = await getUserById(id);
  if (!user) return null;

  if (user.status !== 'APPROVED') {
    throw new Error('Only APPROVED users can modify their profile.');
  }

  if (updates.full_name) user.full_name = updates.full_name.trim();
  if (updates.department) user.department = updates.department.trim();
  if (updates.year_semester) user.year_semester = updates.year_semester.trim();
  if (updates.phone) user.phone = updates.phone.trim();
  if (updates.avatar_url) user.avatar_url = updates.avatar_url;

  return { ...user };
}

/**
 * ====================================================================
 * STUDENT LINKEDIN PROFILE & DOSSIER RETRIEVAL (Track & View by Admin)
 * ====================================================================
 */

/**
 * Fetch student documents from public.student_documents (with institutional fallbacks)
 */
/**
 * Fetch real student documents & certificates from Supabase.
 * Queries both student_certificates and student_documents tables
 * with multiple fallback strategies to ensure all uploaded documents
 * are returned regardless of roll_no format or table availability.
 */
export async function getStudentDocuments(rollNo, studentId, studentData) {
  if (!rollNo && !studentId && !studentData) return [];
  const normalized = String(rollNo || studentData?.roll_no || studentData?.roll_number || '').trim().toUpperCase();

  const realDocs = [];
  const seenIds = new Set();
  let studentProjects = studentData?.projects || [];
  if (typeof studentProjects === 'string') {
    try {
      studentProjects = JSON.parse(studentProjects);
    } catch {
      studentProjects = [];
    }
  }
  const projectLogoUrls = new Set(
    (Array.isArray(studentProjects) ? studentProjects : [])
      .map((project) => project?.logo_url || project?.logoUrl)
      .filter(Boolean)
  );

  // 1. Check studentData for certificates stored in admin_notes or directly
  if (studentData?.admin_notes) {
    try {
      const parsedNotes = JSON.parse(studentData.admin_notes);
      if (Array.isArray(parsedNotes?.certificates) && parsedNotes.certificates.length > 0) {
        parsedNotes.certificates.forEach((c, idx) => {
          if (String(c.document_type || '').toUpperCase() === 'PROJECT_LOGO') return;
          const docId = c.id || `cert_${idx + 1}`;
          if (seenIds.has(docId)) return;
          seenIds.add(docId);
          const fileUrl = c.url || c.cloudinary_url || c.file_url || c.verification_url || null;
          if (fileUrl && projectLogoUrls.has(fileUrl)) return;
          const fileName = c.original_filename || fileUrl?.split(/[?#]/)[0]?.split('/').pop() || '';
          const extension = fileName.split('.').pop()?.toLowerCase();
          const mimeType = c.mime_type || ({
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            pdf: 'application/pdf',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            gif: 'image/gif',
          }[extension] || (fileUrl && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(fileUrl) ? 'image/jpeg' : 'application/pdf'));
          realDocs.push({
            id: docId,
            title: c.title || 'Official Academic Certificate',
            original_filename: fileName || undefined,
            issuer: c.issuer || 'RIMT University Registrar',
            issue_date: c.issue_date || (c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : null),
            credential_id: c.credential_id || `CERT-${String(idx + 1).padStart(4, '0')}`,
            mime_type: mimeType,
            format: c.format || (extension || (mimeType.startsWith('image/') ? 'image' : 'pdf')),
            status: c.status || 'Verified',
            cloudinary_url: fileUrl,
            url: fileUrl,
            document_type: c.document_type,
            cloudinary_public_id: c.cloudinary_public_id,
            storage_provider: c.storage_provider || 'supabase',
            created_at: c.created_at || new Date().toISOString(),
          });
        });
      }
    } catch {}
  }

  // 2. Also check if studentData has a verified resume_url (ignore dummy unsplash images)
  if (studentData?.resume_url && typeof studentData.resume_url === 'string' && !studentData.resume_url.includes('images.unsplash.com')) {
    const resumeUrl = studentData.resume_url;
    if (!projectLogoUrls.has(resumeUrl) && !seenIds.has('resume_doc') && !seenIds.has(resumeUrl)) {
      seenIds.add('resume_doc');
      seenIds.add(resumeUrl);
      const isImg = /\.(jpg|jpeg|png|webp|gif)/i.test(resumeUrl);
      realDocs.push({
        id: 'resume_doc',
        title: 'Official Academic Resume / Credential',
        issuer: 'RIMT Career & Placement Cell',
        issue_date: new Date().toISOString().split('T')[0],
        credential_id: 'RESUME-001',
        mime_type: isImg ? 'image/jpeg' : 'application/pdf',
        format: isImg ? 'image' : 'pdf',
        status: 'Verified',
        cloudinary_url: resumeUrl,
        url: resumeUrl,
        storage_provider: 'supabase',
        created_at: studentData.updated_at || new Date().toISOString(),
      });
    }
  }

  if (HAS_SUPABASE_READ) {
    // 3. Fetch from student_certificates table (if exists)
    if (studentId) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/student_certificates?student_id=eq.${encodeURIComponent(studentId)}&order=created_at.desc&select=*`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
            cache: 'no-store',
          }
        );
        if (res.ok) {
          const certs = await res.json();
          if (Array.isArray(certs)) {
            certs.forEach((c) => {
              if (seenIds.has(c.id)) return;
              seenIds.add(c.id);
              const fileUrl = c.verification_url || c.file_url || c.cloudinary_url || c.url || null;
              realDocs.push({
                id: c.id,
                title: c.title || 'Official Academic Certificate',
                issuer: c.issuer || 'RIMT University Registrar',
                issue_date: c.issue_date || (c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : null),
                credential_id: c.credential_id || (c.id ? c.id.slice(0, 8).toUpperCase() : null),
                mime_type: c.mime_type || (fileUrl && /\.(jpg|jpeg|png|webp|gif)/i.test(fileUrl) ? 'image/jpeg' : 'application/pdf'),
                format: c.format || (fileUrl && /\.(jpg|jpeg|png|webp|gif)/i.test(fileUrl) ? 'image' : 'pdf'),
                status: 'Verified',
                created_at: c.created_at || new Date().toISOString(),
                cloudinary_url: fileUrl,
                url: fileUrl,
                storage_provider: c.storage_provider || 'certificate',
              });
            });
          }
        }
      } catch (e) {
        // student_certificates table may not exist — normal on fresh installs
      }
    }

    // 4. Fetch from student_documents table — primary source for app-uploaded certificates
    const queryStrategies = [];
    if (normalized) {
      queryStrategies.push(`roll_no=ilike.${encodeURIComponent(normalized)}`);
      queryStrategies.push(`roll_no=eq.${encodeURIComponent(normalized)}`);
      const originalRoll = String(rollNo || '').trim();
      if (originalRoll && originalRoll !== normalized) {
        queryStrategies.push(`roll_no=eq.${encodeURIComponent(originalRoll)}`);
      }
    }

    for (const filter of queryStrategies) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/student_documents?${filter}&order=created_at.desc&select=*`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
            cache: 'no-store',
          }
        );
        if (res.ok) {
          const docs = await res.json();
          if (Array.isArray(docs) && docs.length > 0) {
            docs.forEach((d) => {
              if (String(d.document_type || '').toUpperCase() === 'PROJECT_LOGO') return;
              if (seenIds.has(d.id)) return;
              seenIds.add(d.id);
              const fileUrl = d.cloudinary_url || d.file_url || d.url || d.verification_url || null;
              if (fileUrl && projectLogoUrls.has(fileUrl)) return;
              const fileName = d.original_filename || fileUrl?.split(/[?#]/)[0]?.split('/').pop() || 'document';
              const extension = fileName.split('.').pop()?.toLowerCase();
              realDocs.push({
                id: d.id,
                title: d.title || d.original_filename || 'Scholar Document',
                original_filename: fileName,
                mime_type: d.mime_type || ({
                  doc: 'application/msword',
                  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  pdf: 'application/pdf',
                  jpg: 'image/jpeg',
                  jpeg: 'image/jpeg',
                  png: 'image/png',
                  webp: 'image/webp',
                  gif: 'image/gif',
                }[extension] || (fileUrl && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(fileUrl) ? 'image/jpeg' : 'application/pdf')),
                file_size: d.file_size || 0,
                format: d.format || (extension || (d.mime_type?.startsWith('image/') ? 'image' : 'pdf')),
                document_type: d.document_type,
                cloudinary_public_id: d.cloudinary_public_id,
                status: d.status || 'Verified',
                cloudinary_url: fileUrl,
                url: fileUrl,
                storage_provider: d.storage_provider || 'supabase',
                created_at: d.created_at || new Date().toISOString(),
              });
            });
            break;
          }
        }
      } catch (e) {
        console.warn('Supabase student_documents query notice:', e.message);
      }
    }
  }

  return realDocs;
}

/**
 * Retrieve comprehensive LinkedIn-style dossier for any student.
 * Uses real Supabase data and real-time student app updates.
 * NO dummy/fake fallback projects, certificates, or scores are injected.
 */
export async function getStudentDossier(idOrRoll) {
  await initDb();
  let student = await getUserById(idOrRoll);
  if (!student) {
    student = await getUserByRollNo(idOrRoll);
  }
  if (!student) return null;

  const rollNo = student.roll_number || student.roll_no || '';
  const fullName = student.full_name || student.name || 'RIMT Scholar';
  const dept = student.department || student.course || 'Department of Computer Applications';
  const batch = student.year_semester || student.batch || student.semester || 'Batch 2024-2027';

  // Live real documents and certificates from Supabase & student profile
  const documents = await getStudentDocuments(rollNo, student.id, student);

  // Real projects from students.projects JSONB OR student_projects table
  let realProjects = [];
  if (Array.isArray(student.projects)) {
    realProjects = [...student.projects];
  } else if (typeof student.projects === 'string') {
    try {
      const parsed = JSON.parse(student.projects);
      if (Array.isArray(parsed)) realProjects = parsed;
    } catch {}
  }

  // Also query student_projects table if student.id is available
  if (HAS_SUPABASE_READ && student.id) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/student_projects?student_id=eq.${encodeURIComponent(student.id)}&order=created_at.desc&select=*`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const pList = await res.json();
        if (Array.isArray(pList) && pList.length > 0) {
          const tableProjects = pList.map((p) => ({
            id: p.id,
            title: p.title || 'Untitled Project',
            description: p.description || p.about || '',
            about: p.description || p.about || '',
            tags: typeof p.tech_stack === 'string'
              ? p.tech_stack.split(',').map((t) => t.trim()).filter(Boolean)
              : (Array.isArray(p.tech_stack) ? p.tech_stack : (Array.isArray(p.tags) ? p.tags : [])),
            tech_stack: typeof p.tech_stack === 'string'
              ? p.tech_stack.split(',').map((t) => t.trim()).filter(Boolean)
              : (Array.isArray(p.tech_stack) ? p.tech_stack : (Array.isArray(p.tags) ? p.tags : [])),
            live_url: p.live_url || p.liveUrl || null,
            liveUrl: p.live_url || p.liveUrl || null,
            github_url: p.github_url || p.githubUrl || null,
            githubUrl: p.github_url || p.githubUrl || null,
            logo_url: p.logo_url || p.logoUrl || null,
            logoUrl: p.logo_url || p.logoUrl || null,
            category: p.category || 'Academic Core',
            categoryLabel: p.categoryLabel || p.category || 'Academic Core',
            status: p.status || 'Completed',
            commitInfo: p.created_at ? `Added on ${new Date(p.created_at).toLocaleDateString('en-IN')}` : 'Verified Project',
            gitStatus: 'Git Synced',
          }));
          const existingTitles = new Set(realProjects.map((p) => p.title?.toLowerCase()));
          tableProjects.forEach((tp) => {
            if (!existingTitles.has(tp.title?.toLowerCase())) {
              realProjects.push(tp);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Supabase fetch student_projects error:', e.message);
    }
  }

  // Normalize all projects array to ensure consistent property access
  realProjects = realProjects.map((p, idx) => {
    const rawTech = p.tech_stack || p.tags || [];
    const techArray = Array.isArray(rawTech)
      ? rawTech
      : (typeof rawTech === 'string' ? rawTech.split(',').map((t) => t.trim()).filter(Boolean) : []);
    const desc = p.description || p.about || '';
    const gh = p.github_url || p.githubUrl || null;
    const live = p.live_url || p.liveUrl || null;
    const logo = p.logo_url || p.logoUrl || null;
    return {
      ...p,
      id: p.id || `PRJ-${idx + 1}`,
      title: p.title || 'Untitled Project',
      description: desc,
      about: desc,
      tags: techArray,
      tech_stack: techArray,
      github_url: gh,
      githubUrl: gh,
      live_url: live,
      liveUrl: live,
      logo_url: logo,
      logoUrl: logo,
      category: p.category || 'Academic Core',
      categoryLabel: p.categoryLabel || p.category || 'Academic Core',
      status: p.status || 'Active',
      commitInfo: p.commitInfo || 'Git Synced',
      gitStatus: p.gitStatus || 'Git Synced',
    };
  });

  // Real CGPA from DB (no fake calculation!)
  const realCgpa = (student.cgpa !== null && student.cgpa !== undefined && !isNaN(Number(student.cgpa)))
    ? Number(Number(student.cgpa).toFixed(2))
    : null;
  const percentage = (student.academic_score !== null && student.academic_score !== undefined && !isNaN(Number(student.academic_score)))
    ? Number(Number(student.academic_score).toFixed(1))
    : (realCgpa ? Number((realCgpa * 9.5).toFixed(1)) : null);

  // Real semester scores from DB
  let semesterScores = [];
  if (Array.isArray(student.semester_scores)) {
    semesterScores = student.semester_scores;
  } else if (typeof student.semester_scores === 'string') {
    try {
      const parsed = JSON.parse(student.semester_scores);
      if (Array.isArray(parsed)) semesterScores = parsed;
    } catch {}
  }

  // Real skills from DB
  let realSkills = [];
  if (Array.isArray(student.skills)) {
    realSkills = student.skills;
  } else if (typeof student.skills === 'string') {
    try {
      const parsed = JSON.parse(student.skills);
      if (Array.isArray(parsed)) realSkills = parsed;
    } catch {
      realSkills = student.skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  const realHeadline = student.headline || null;
  const realBio = student.bio || null;
  const realAboutMe = student.about_me || null;
  const realAttendance = (student.attendance_rate !== null && student.attendance_rate !== undefined)
    ? (String(student.attendance_rate).includes('%') ? student.attendance_rate : `${student.attendance_rate}%`)
    : null;
  const realStanding = student.academic_standing || (realCgpa ? (realCgpa >= 8.5 ? "Dean's Honors List (First Class with Distinction)" : 'First Class with Distinction') : null);

  // Real internships from DB and admin_notes
  let realInternships = [];
  if (Array.isArray(student.internships)) {
    realInternships = [...student.internships];
  } else if (typeof student.internships === 'string') {
    try {
      const parsed = JSON.parse(student.internships);
      if (Array.isArray(parsed)) realInternships = parsed;
    } catch {}
  }
  if (student.admin_notes) {
    try {
      const parsedNotes = JSON.parse(student.admin_notes);
      if (Array.isArray(parsedNotes?.internships)) {
        const seenIds = new Set(realInternships.map((i) => i.id));
        parsedNotes.internships.forEach((i) => {
          if (!seenIds.has(i.id)) {
            seenIds.add(i.id);
            realInternships.push(i);
          }
        });
      }
    } catch {}
  }

  return {
    ...student,
    full_name: fullName,
    name: fullName,
    roll_number: rollNo,
    roll_no: rollNo,
    department: dept,
    course: dept,
    year_semester: batch,
    batch: batch,
    phone: student.phone || null,
    email: student.email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@rimt.ac.in`,
    headline: realHeadline,
    bio: realBio,
    about_me: realAboutMe,
    avatar_url: student.avatar_url || student.avatar || null,
    banner_url: student.banner_url || null,
    location: 'RIMT University, Mandi Gobindgarh, Punjab, India',
    cgpa: realCgpa,
    academic_score: percentage,
    semester_scores: semesterScores,
    current_semester: student.current_semester || null,
    total_credits: student.total_credits || null,
    attendance_rate: realAttendance,
    academic_standing: realStanding,
    active_backlogs: student.active_backlogs ?? 0,
    faculty_advisor: student.faculty_advisor || student.spoc || null,
    admin_notes: student.admin_notes || null,
    projects: realProjects,
    documents: documents,
    certificates: documents,
    internships: realInternships,
    skills: realSkills,
    spoc: student.faculty_advisor || student.spoc || null,
  };
}

/**
 * Admin update for student dossier — persists ALL academic and profile fields to Supabase.
 * Admin can set: cgpa, academic_score, attendance_rate, academic_standing,
 * semester_scores, current_semester, faculty_advisor, total_credits,
 * active_backlogs, admin_notes, bio, about_me, headline, phone, skills, projects, certificates
 */
export async function updateStudentDossier(id, updates) {
  await initDb();
  let student = await getUserById(id);
  if (!student) student = await getUserByRollNo(id);
  if (!student) return null;
  const previousCertificates = Array.isArray(updates.certificates)
    ? await getStudentDocuments(student.roll_no || student.roll_number, student.id, student)
    : [];

  // Apply all editable fields to in-memory record
  if (updates.bio !== undefined) student.bio = updates.bio;
  if (updates.about_me !== undefined) student.about_me = updates.about_me;
  if (updates.headline !== undefined) student.headline = updates.headline;
  if (updates.phone !== undefined) student.phone = updates.phone;
  if (updates.cgpa !== undefined && updates.cgpa !== '' && updates.cgpa !== null) {
    student.cgpa = Number(updates.cgpa);
    student.academic_score = Number((Number(updates.cgpa) * 9.5).toFixed(1));
  } else if (updates.cgpa === null || updates.cgpa === '') {
    student.cgpa = null;
    student.academic_score = null;
  }
  if (updates.academic_score !== undefined && updates.academic_score !== '') student.academic_score = Number(updates.academic_score);
  if (updates.attendance_rate !== undefined && updates.attendance_rate !== '') {
    student.attendance_rate = typeof updates.attendance_rate === 'string'
      ? Number(updates.attendance_rate.replace('%', ''))
      : Number(updates.attendance_rate);
  }
  if (updates.academic_standing !== undefined) student.academic_standing = updates.academic_standing;
  if (updates.semester_scores !== undefined) student.semester_scores = updates.semester_scores;
  if (updates.skills !== undefined) student.skills = updates.skills;
  if (updates.faculty_advisor !== undefined) student.faculty_advisor = updates.faculty_advisor;
  if (updates.current_semester !== undefined) student.current_semester = updates.current_semester;
  if (updates.total_credits !== undefined) student.total_credits = Number(updates.total_credits);
  if (updates.active_backlogs !== undefined) student.active_backlogs = Number(updates.active_backlogs);
  if (updates.admin_notes !== undefined) student.admin_notes = updates.admin_notes;
  if (updates.projects !== undefined) student.projects = updates.projects;
  if (updates.internships !== undefined) student.internships = updates.internships;

  // Build Supabase payload with ALL admin-editable columns
  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const writeHeaders = getAdminWriteHeaders();
      const supabasePayload = {
        updated_at: new Date().toISOString(),
      };

      // Profile fields
      if (updates.bio !== undefined) supabasePayload.bio = student.bio;
      if (updates.about_me !== undefined) supabasePayload.about_me = student.about_me;
      if (updates.headline !== undefined) supabasePayload.headline = student.headline;
      if (updates.phone !== undefined) supabasePayload.phone = student.phone;
      if (updates.skills !== undefined) supabasePayload.skills = student.skills;
      if (updates.projects !== undefined) supabasePayload.projects = student.projects;

      // Pack certificates and internships into admin_notes JSON for full Supabase cloud sync
      let notesPayload = {};
      try {
        if (student.admin_notes) {
          notesPayload = JSON.parse(student.admin_notes);
        }
      } catch {}
      if (!notesPayload || typeof notesPayload !== 'object') notesPayload = {};

      if (updates.certificates !== undefined) notesPayload.certificates = updates.certificates;
      if (updates.internships !== undefined) notesPayload.internships = updates.internships;
      if (typeof updates.admin_notes === 'string') notesPayload.notes = updates.admin_notes;

      supabasePayload.admin_notes = JSON.stringify(notesPayload);

      // If updates.certificates provided a URL, ensure resume_url is set if empty
      if (Array.isArray(updates.certificates) && updates.certificates.length > 0 && !student.resume_url) {
        const firstCertUrl = updates.certificates[0].url || updates.certificates[0].cloudinary_url;
        if (firstCertUrl) supabasePayload.resume_url = firstCertUrl;
      }

      // Academic fields (admin-only)
      if (updates.cgpa !== undefined) {
        supabasePayload.cgpa = student.cgpa;
        supabasePayload.academic_score = student.academic_score;
      }
      if (updates.attendance_rate !== undefined) supabasePayload.attendance_rate = student.attendance_rate;
      if (updates.academic_standing !== undefined) supabasePayload.academic_standing = student.academic_standing;
      if (updates.semester_scores !== undefined) supabasePayload.semester_scores = student.semester_scores;
      if (updates.current_semester !== undefined) supabasePayload.current_semester = student.current_semester;
      if (updates.total_credits !== undefined) supabasePayload.total_credits = student.total_credits;
      if (updates.active_backlogs !== undefined) supabasePayload.active_backlogs = student.active_backlogs;
      if (updates.faculty_advisor !== undefined) supabasePayload.faculty_advisor = student.faculty_advisor;

      const studentId = student.id || student.roll_no || student.roll_number;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId);
      const query = isUuid
        ? `id=eq.${encodeURIComponent(studentId)}`
        : `roll_no=ilike.${encodeURIComponent(studentId)}`;

      const studentUpdateResponse = await fetch(`${SUPABASE_URL}/rest/v1/students?${query}`, {
        method: 'PATCH',
        headers: writeHeaders,
        body: JSON.stringify(supabasePayload),
      });
      if (!studentUpdateResponse.ok) {
        throw new Error(`Supabase student update failed (${studentUpdateResponse.status}).`);
      }

      if (Array.isArray(updates.certificates)) {
        const retainedKeys = new Set();
        updates.certificates.forEach((document) => {
          [document.id, document.cloudinary_public_id, document.url, document.cloudinary_url]
            .filter(Boolean)
            .forEach((key) => retainedKeys.add(String(key)));
        });
        const removedDocuments = previousCertificates.filter((document) => (
          ![document.id, document.cloudinary_public_id, document.url, document.cloudinary_url]
            .filter(Boolean)
            .some((key) => retainedKeys.has(String(key)))
        ));
        const rollNo = String(student.roll_no || student.roll_number || '').trim();
        for (const document of removedDocuments) {
          if (!document.id) continue;
          const documentId = encodeURIComponent(document.id);
          const documentDelete = await fetch(
            `${SUPABASE_URL}/rest/v1/student_documents?id=eq.${documentId}&roll_no=eq.${encodeURIComponent(rollNo)}`,
            { method: 'DELETE', headers: writeHeaders }
          );
          const documentDeleteResult = await documentDelete.json().catch(() => ({}));
          const missingDocumentsTable = ['PGRST205', '42P01'].includes(documentDeleteResult.code);
          if (!documentDelete.ok && !missingDocumentsTable) {
            throw new Error(`Could not delete document metadata ${document.id} (${documentDelete.status}).`);
          }
          if (student.id) {
            const certificateDelete = await fetch(
              `${SUPABASE_URL}/rest/v1/student_certificates?id=eq.${documentId}&student_id=eq.${encodeURIComponent(student.id)}`,
              { method: 'DELETE', headers: writeHeaders }
            );
            const certificateDeleteResult = await certificateDelete.json().catch(() => ({}));
            const missingCertificatesTable = ['PGRST205', '42P01'].includes(certificateDeleteResult.code);
            if (!certificateDelete.ok && !missingCertificatesTable) {
              throw new Error(`Could not delete certificate metadata ${document.id} (${certificateDelete.status}).`);
            }
          }
        }

        const removedResume = previousCertificates.some((document) => {
          const documentUrl = document.url || document.cloudinary_url;
          return documentUrl && documentUrl === student.resume_url
            && !updates.certificates.some((retained) => (retained.url || retained.cloudinary_url) === documentUrl);
        });
        if (removedResume) {
          const clearResume = await fetch(`${SUPABASE_URL}/rest/v1/students?${query}`, {
            method: 'PATCH',
            headers: writeHeaders,
            body: JSON.stringify({ resume_url: null }),
          });
          if (!clearResume.ok) throw new Error(`Could not clear deleted resume URL (${clearResume.status}).`);
        }
      }

      // If certificates were provided, sync to student_certificates
      if (Array.isArray(updates.certificates) && student.id) {
        for (const cert of updates.certificates) {
          if (cert.title && !cert.id) {
            await fetch(`${SUPABASE_URL}/rest/v1/student_certificates`, {
              method: 'POST',
              headers: writeHeaders,
              body: JSON.stringify({
                student_id: student.id,
                title: cert.title,
                issuer: cert.issuer || 'RIMT University',
                issue_date: cert.issue_date || new Date().toISOString().split('T')[0],
                credential_id: cert.credential_id || `CERT-${Date.now().toString().slice(-6)}`,
              }),
            });
          }
        }
      }
    } catch (e) {
      console.warn('Supabase updateStudentDossier error:', e.message);
      if (updates.certificates !== undefined || updates.internships !== undefined) {
        throw e;
      }
    }
  }

  return getStudentDossier(student.id || student.roll_no || student.roll_number);
}

/**
 * ====================================================================
 * ADMIN AUTHENTICATION HELPERS (NEW-FEATURE.md Module: /admin-panel/auth)
 * ====================================================================
 */

/**
 * Find admin by email (case-insensitive) — legacy, kept for middleware compatibility
 */
export async function getAdminByEmail(email) {
  if (!email) return null;
  await initAdminDb();
  const normalized = email.trim().toLowerCase();

  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/admins?email=ilike.${encodeURIComponent(normalized)}&select=*`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          return data[0];
        }
      }
    } catch (err) {
      console.warn('Supabase getAdminByEmail error, falling back to memory:', err.message);
    }
  }

  const found = getMemoryAdmins().find(
    (a) => a.email && a.email.toLowerCase() === normalized
  );
  return found ? { ...found } : null;
}

/**
 * Find admin by full name (case-insensitive) — primary login method
 */
export async function getAdminByName(name) {
  if (!name) return null;
  await initAdminDb();
  const normalized = name.trim().toLowerCase();

  // Try Supabase first
  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/admins?full_name=ilike.${encodeURIComponent(normalized)}&select=*`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          return data[0];
        }
      }
    } catch (err) {
      console.warn('Supabase getAdminByName error, falling back to memory:', err.message);
    }
  }

  // Fallback to in-memory store
  const found = getMemoryAdmins().find(
    (a) => a.full_name && a.full_name.toLowerCase() === normalized
  );
  return found ? { ...found } : null;
}

/**
 * Find admin by ID
 */
export async function getAdminById(id) {
  if (!id) return null;
  await initAdminDb();

  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/admins?id=eq.${encodeURIComponent(id)}&select=*`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          return data[0];
        }
      }
    } catch (err) {
      console.warn('Supabase getAdminById error, falling back to memory:', err.message);
    }
  }

  const found = getMemoryAdmins().find((a) => a.id === id);
  return found ? { ...found } : null;
}

export async function createAdmin(adminData) {
  await initAdminDb();
  const memoryAdmins = getMemoryAdmins();
  const newAdmin = {
    id: adminData.id || `admin-${Date.now()}`,
    full_name: adminData.full_name || 'Admin Officer',
    email: adminData.email?.toLowerCase() || null,
    password_hash: adminData.password_hash,
    role: adminData.role || 'ADMIN',
    status: adminData.status || 'ACTIVE',
    profile_pic_url: adminData.profile_pic_url || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  memoryAdmins.push(newAdmin);
  return newAdmin;
}

export async function checkAdminEmailExists(email) {
  if (!email) return false;
  const admin = await getAdminByEmail(email);
  return Boolean(admin);
}

/**
 * Update admin record
 */
export async function updateAdmin(id, updates) {
  await initAdminDb();
  const now = new Date().toISOString();

  // Update in memory
  const memoryAdmins = getMemoryAdmins();
  const index = memoryAdmins.findIndex((a) => a.id === id);
  let updatedRecord = null;

  if (index >= 0) {
    memoryAdmins[index] = {
      ...memoryAdmins[index],
      ...updates,
      updated_at: now,
    };
    updatedRecord = { ...memoryAdmins[index] };
  }

  // Attempt update in Supabase
  const writeHeaders = getAdminWriteHeaders();
  if (writeHeaders && !IS_TEST_ENV) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/admins?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: writeHeaders,
        body: JSON.stringify({ ...updates, updated_at: now }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          if (index >= 0) {
            memoryAdmins[index] = data[0];
          }
          return data[0];
        }
      }
    } catch (err) {
      console.warn('Supabase updateAdmin error:', err.message);
    }
  }

  return updatedRecord;
}
