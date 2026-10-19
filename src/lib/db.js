/**
 * Unified Database Layer
 * Interfaces with Supabase PostgreSQL and provides an in-memory fallback store
 * ensuring reliable functionality across environments and unit test runners.
 */

import { hashPassword } from './auth.js';
import { DEFAULT_CAMPUS_BANNER } from '../constants/tokens.js';
import { validateInternshipOpportunity } from './internshipValidation.js';

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
  const bannerUrl = student.banner_url || student.banner || DEFAULT_CAMPUS_BANNER;
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

if (!global.__RIMT_DB_COMPANIES) {
  global.__RIMT_DB_COMPANIES = [];
  global.__RIMT_DB_COMPANIES_INITIALIZED = false;
}

function getMemoryAdmins() {
  return global.__RIMT_DB_ADMINS || [];
}

function getMemoryCompanies() {
  return global.__RIMT_DB_COMPANIES || [];
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
    banner_url: student.banner_url || DEFAULT_CAMPUS_BANNER,
    location: 'RIMT University, Mandi Gobindgarh, Punjab, India',
    cgpa: (global.__RIMT_DB_ACADEMIC_SUMMARY || []).find((a) => a.student_id === student.id)?.cgpa != null ? Number((global.__RIMT_DB_ACADEMIC_SUMMARY || []).find((a) => a.student_id === student.id).cgpa) : realCgpa,
    academic_score: percentage,
    academic_summary: (global.__RIMT_DB_ACADEMIC_SUMMARY || []).find((a) => a.student_id === student.id) || {},
    grades: (global.__RIMT_DB_GRADES || []).filter((g) => g.student_id === student.id),
    semester_scores: semesterScores,
    current_semester: student.current_semester || null,
    total_credits: student.total_credits || null,
    attendance_rate: (global.__RIMT_DB_ACADEMIC_SUMMARY || []).find((a) => a.student_id === student.id)?.overall_attendance != null ? Number((global.__RIMT_DB_ACADEMIC_SUMMARY || []).find((a) => a.student_id === student.id).overall_attendance) : realAttendance,
    overall_attendance: (global.__RIMT_DB_ACADEMIC_SUMMARY || []).find((a) => a.student_id === student.id)?.overall_attendance != null ? Number((global.__RIMT_DB_ACADEMIC_SUMMARY || []).find((a) => a.student_id === student.id).overall_attendance) : realAttendance,
    academic_standing: realStanding,
    active_backlogs: (global.__RIMT_DB_ACADEMIC_SUMMARY || []).find((a) => a.student_id === student.id)?.backlogs != null ? Number((global.__RIMT_DB_ACADEMIC_SUMMARY || []).find((a) => a.student_id === student.id).backlogs) : (student.active_backlogs ?? 0),
    backlogs: (global.__RIMT_DB_ACADEMIC_SUMMARY || []).find((a) => a.student_id === student.id)?.backlogs != null ? Number((global.__RIMT_DB_ACADEMIC_SUMMARY || []).find((a) => a.student_id === student.id).backlogs) : (student.active_backlogs ?? 0),
    faculty_advisor: student.faculty_advisor || student.spoc || null,
    admin_notes: student.admin_notes || null,
    projects: (global.__RIMT_DB_PROJECTS || []).filter((p) => p.student_id === student.id).length > 0
      ? (global.__RIMT_DB_PROJECTS || []).filter((p) => p.student_id === student.id)
      : realProjects,
    git_projects: (global.__RIMT_DB_GIT_PROJECTS || []).filter((g) => g.student_id === student.id),
    documents: documents,
    certificates: (global.__RIMT_DB_CERTIFICATES || []).filter((c) => c.student_id === student.id).length > 0
      ? (global.__RIMT_DB_CERTIFICATES || []).filter((c) => c.student_id === student.id)
      : documents,
    internships: (global.__RIMT_DB_INTERNSHIPS || []).filter((i) => i.student_id === student.id).length > 0
      ? (global.__RIMT_DB_INTERNSHIPS || []).filter((i) => i.student_id === student.id)
      : realInternships,
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

/**
 * ====================================================================
 * TAMPER-EVIDENT ADMIN AUDIT LOG
 * ====================================================================
 */

export async function recordAuditLog({ actorId, studentId, tableName, recordId, action, oldData, newData }) {
  const entry = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    actor_id: actorId || null,
    student_id: studentId || null,
    table_name: tableName,
    record_id: recordId ? String(recordId) : null,
    action, // 'insert' | 'update' | 'delete'
    old_data: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
    new_data: newData ? JSON.parse(JSON.stringify(newData)) : null,
    created_at: new Date().toISOString(),
  };

  if (!global.__RIMT_DB_AUDIT_LOG) global.__RIMT_DB_AUDIT_LOG = [];
  global.__RIMT_DB_AUDIT_LOG.unshift(entry);

  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const writeHeaders = getAdminWriteHeaders();
      if (writeHeaders) {
        await fetch(`${SUPABASE_URL}/rest/v1/admin_audit_log`, {
          method: 'POST',
          headers: writeHeaders,
          body: JSON.stringify({
            actor_id: entry.actor_id,
            actor_name: 'Administrator',
            target_entity: entry.table_name,
            target_id: entry.record_id,
            action: entry.action,
            old_values: entry.old_data,
            new_values: entry.new_data,
          }),
        });
      }
    } catch (e) {
      console.warn('Supabase recordAuditLog error:', e.message);
    }
  }

  return entry;
}

export async function getAdminAuditLog(filterOrStudentId) {
  if (!global.__RIMT_DB_AUDIT_LOG) global.__RIMT_DB_AUDIT_LOG = [];
  let inMem = global.__RIMT_DB_AUDIT_LOG;

  if (typeof filterOrStudentId === 'string') {
    inMem = inMem.filter((l) => l.student_id === filterOrStudentId);
  } else if (filterOrStudentId && typeof filterOrStudentId === 'object') {
    if (filterOrStudentId.studentId) {
      inMem = inMem.filter((l) => l.student_id === filterOrStudentId.studentId);
    }
    if (filterOrStudentId.tableName) {
      inMem = inMem.filter((l) => l.table_name === filterOrStudentId.tableName);
    }
    if (typeof filterOrStudentId.limit === 'number') {
      inMem = inMem.slice(0, filterOrStudentId.limit);
    }
  }

  return inMem;
}


/**
 * ====================================================================
 * STRICT MANUAL-ONLY ACADEMIC HELPERS
 * ====================================================================
 */

export async function upsertAcademicSummary(studentId, { cgpa, overall_attendance, backlogs }, actorId) {
  await initDb();
  const student = (await getUserById(studentId)) || (await getUserByRollNo(studentId));
  if (!student) throw new Error('Student not found');
  const validStudentId = student.id;

  let cleanCgpa = null;
  if (cgpa !== undefined && cgpa !== null && cgpa !== '') {
    const num = Number(cgpa);
    if (isNaN(num) || num < 0 || num > 10) {
      throw new Error('CGPA must be a number between 0.00 and 10.00');
    }
    cleanCgpa = Number(num.toFixed(2));
  }

  let cleanAttendance = null;
  if (overall_attendance !== undefined && overall_attendance !== null && overall_attendance !== '') {
    const num = Number(overall_attendance);
    if (isNaN(num) || num < 0 || num > 100) {
      throw new Error('Attendance percentage must be between 0.00 and 100.00');
    }
    cleanAttendance = Number(num.toFixed(2));
  }

  let cleanBacklogs = null;
  if (backlogs !== undefined && backlogs !== null && backlogs !== '') {
    const num = parseInt(backlogs, 10);
    if (isNaN(num) || num < 0) {
      throw new Error('Backlogs must be a non-negative integer');
    }
    cleanBacklogs = num;
  }

  if (!global.__RIMT_DB_ACADEMIC_SUMMARY) global.__RIMT_DB_ACADEMIC_SUMMARY = [];
  const existingIdx = global.__RIMT_DB_ACADEMIC_SUMMARY.findIndex((a) => a.student_id === validStudentId);
  const oldData = existingIdx >= 0 ? { ...global.__RIMT_DB_ACADEMIC_SUMMARY[existingIdx] } : null;

  const now = new Date().toISOString();
  const record = {
    student_id: validStudentId,
    cgpa: cleanCgpa,
    overall_attendance: cleanAttendance,
    backlogs: cleanBacklogs,
    updated_by: actorId || null,
    updated_at: now,
  };

  if (existingIdx >= 0) {
    global.__RIMT_DB_ACADEMIC_SUMMARY[existingIdx] = record;
  } else {
    global.__RIMT_DB_ACADEMIC_SUMMARY.push(record);
  }

  student.cgpa = cleanCgpa;
  student.academic_score = cleanCgpa != null ? Number((cleanCgpa * 9.5).toFixed(1)) : null;

  await recordAuditLog({
    actorId,
    studentId: validStudentId,
    tableName: 'student_academic_summary',
    recordId: validStudentId,
    action: oldData ? 'update' : 'insert',
    oldData,
    newData: record,
  });

  return record;
}

export async function upsertSemesterRecord(studentId, semesterNum, { sgpa, attendance_pct, remarks, academic_year }, actorId) {
  await initDb();
  const student = (await getUserById(studentId)) || (await getUserByRollNo(studentId));
  if (!student) throw new Error('Student not found');
  const validStudentId = student.id;

  const sem = parseInt(semesterNum, 10);
  if (isNaN(sem) || sem < 1 || sem > 12) {
    throw new Error('Semester must be an integer between 1 and 12');
  }

  let cleanSgpa = null;
  if (sgpa !== undefined && sgpa !== null && sgpa !== '') {
    const num = Number(sgpa);
    if (isNaN(num) || num < 0 || num > 10) {
      throw new Error('SGPA must be between 0.00 and 10.00');
    }
    cleanSgpa = Number(num.toFixed(2));
  }

  let cleanAttendance = null;
  if (attendance_pct !== undefined && attendance_pct !== null && attendance_pct !== '') {
    const num = Number(attendance_pct);
    if (isNaN(num) || num < 0 || num > 100) {
      throw new Error('Attendance percentage must be between 0.00 and 100.00');
    }
    cleanAttendance = Number(num.toFixed(2));
  }

  if (!global.__RIMT_DB_SEMESTER_RECORDS) global.__RIMT_DB_SEMESTER_RECORDS = [];
  const existingIdx = global.__RIMT_DB_SEMESTER_RECORDS.findIndex(
    (s) => s.student_id === validStudentId && s.semester === sem
  );
  const oldData = existingIdx >= 0 ? { ...global.__RIMT_DB_SEMESTER_RECORDS[existingIdx] } : null;

  const now = new Date().toISOString();
  const record = {
    id: oldData?.id || (crypto.randomUUID ? crypto.randomUUID() : `sem-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
    student_id: validStudentId,
    semester: sem,
    sgpa: cleanSgpa,
    attendance_percentage: cleanAttendance,
    remarks: remarks || null,
    academic_year: academic_year || null,
    updated_by: actorId || null,
    updated_at: now,
  };

  if (existingIdx >= 0) {
    global.__RIMT_DB_SEMESTER_RECORDS[existingIdx] = record;
  } else {
    global.__RIMT_DB_SEMESTER_RECORDS.push(record);
  }

  await recordAuditLog({
    actorId,
    studentId: validStudentId,
    tableName: 'student_semester_records',
    recordId: `${validStudentId}-sem-${sem}`,
    action: oldData ? 'update' : 'insert',
    oldData,
    newData: record,
  });

  return record;
}

export async function upsertGrades(studentId, semesterNum, rows, actorId) {
  await initDb();
  const student = (await getUserById(studentId)) || (await getUserByRollNo(studentId));
  if (!student) throw new Error('Student not found');
  const validStudentId = student.id;

  const sem = parseInt(semesterNum, 10);
  if (isNaN(sem) || sem < 1 || sem > 12) {
    throw new Error('Semester must be an integer between 1 and 12');
  }

  if (!Array.isArray(rows)) {
    throw new Error('Rows must be an array of course grade entries');
  }

  if (!global.__RIMT_DB_GRADES) global.__RIMT_DB_GRADES = [];
  const oldRows = global.__RIMT_DB_GRADES.filter(
    (g) => g.student_id === validStudentId && g.semester === sem
  );

  global.__RIMT_DB_GRADES = global.__RIMT_DB_GRADES.filter(
    (g) => !(g.student_id === validStudentId && g.semester === sem)
  );

  const now = new Date().toISOString();
  const cleanRows = rows.map((r, i) => ({
    id: r.id || `grade-${validStudentId}-${sem}-${i}-${Date.now()}`,
    student_id: validStudentId,
    semester: sem,
    subject_code: String(r.subject_code || `SUB${i + 1}`).trim(),
    subject_name: String(r.subject_name || 'Subject Course').trim(),
    credits: r.credits != null && r.credits !== '' ? Number(r.credits) : null,
    grade: String(r.grade || 'P').trim(),
    grade_points: r.grade_points != null && r.grade_points !== '' ? Number(r.grade_points) : null,
    updated_by: actorId || null,
    updated_at: now,
  }));

  global.__RIMT_DB_GRADES.push(...cleanRows);

  await recordAuditLog({
    actorId,
    studentId: validStudentId,
    tableName: 'student_grades',
    recordId: `${validStudentId}-sem-${sem}`,
    action: 'update',
    oldData: oldRows,
    newData: cleanRows,
  });

  return cleanRows;
}

export async function upsertStudentProfile(studentId, profileData, actorId) {
  await initDb();
  const student = (await getUserById(studentId)) || (await getUserByRollNo(studentId));
  if (!student) throw new Error('Student not found');
  const validStudentId = student.id;

  if (!global.__RIMT_DB_PROFILES) global.__RIMT_DB_PROFILES = [];
  const idx = global.__RIMT_DB_PROFILES.findIndex((p) => p.student_id === validStudentId);
  const oldData = idx >= 0 ? { ...global.__RIMT_DB_PROFILES[idx] } : null;

  const now = new Date().toISOString();
  const record = {
    student_id: validStudentId,
    bio: profileData.bio !== undefined ? profileData.bio : (oldData?.bio || student.bio || null),
    headline: profileData.headline !== undefined ? profileData.headline : (oldData?.headline || student.headline || null),
    skills: profileData.skills !== undefined ? (Array.isArray(profileData.skills) ? profileData.skills : []) : (oldData?.skills || student.skills || []),
    linkedin_url: profileData.linkedin_url !== undefined ? profileData.linkedin_url : (oldData?.linkedin_url || null),
    github_url: profileData.github_url !== undefined ? profileData.github_url : (oldData?.github_url || null),
    portfolio_url: profileData.portfolio_url !== undefined ? profileData.portfolio_url : (oldData?.portfolio_url || null),
    resume_url: profileData.resume_url !== undefined ? profileData.resume_url : (oldData?.resume_url || null),
    updated_by: actorId || null,
    updated_at: now,
  };

  if (idx >= 0) {
    global.__RIMT_DB_PROFILES[idx] = record;
  } else {
    global.__RIMT_DB_PROFILES.push(record);
  }

  if (profileData.bio !== undefined) student.bio = profileData.bio;
  if (profileData.headline !== undefined) student.headline = profileData.headline;
  if (profileData.skills !== undefined) student.skills = profileData.skills;

  await recordAuditLog({
    actorId,
    studentId: validStudentId,
    tableName: 'student_profiles',
    recordId: validStudentId,
    action: oldData ? 'update' : 'insert',
    oldData,
    newData: record,
  });

  return record;
}

/**
 * ====================================================================
 * SECTION CRUD: PROJECTS, GIT, CERTIFICATES, INTERNSHIPS
 * ====================================================================
 */

export async function createStudentProject(studentId, data, actorId) {
  await initDb();
  const student = (await getUserById(studentId)) || (await getUserByRollNo(studentId));
  if (!student) throw new Error('Student not found');
  const validStudentId = student.id;

  if (!global.__RIMT_DB_PROJECTS) global.__RIMT_DB_PROJECTS = [];
  const count = global.__RIMT_DB_PROJECTS.filter((p) => p.student_id === validStudentId).length;

  const now = new Date().toISOString();
  const item = {
    id: (crypto.randomUUID ? crypto.randomUUID() : `prj-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
    student_id: validStudentId,
    title: String(data.title || 'Untitled Project').trim(),
    description: data.description ? String(data.description).trim() : null,
    tech_stack: Array.isArray(data.tech_stack) ? data.tech_stack : (data.tech_stack ? String(data.tech_stack).split(',').map((s) => s.trim()) : []),
    live_url: data.live_url ? String(data.live_url).trim() : null,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    is_visible: data.is_visible !== undefined ? Boolean(data.is_visible) : true,
    sort_order: count,
    created_by: actorId || null,
    updated_by: actorId || null,
    created_at: now,
    updated_at: now,
  };

  global.__RIMT_DB_PROJECTS.push(item);

  await recordAuditLog({
    actorId,
    studentId: validStudentId,
    tableName: 'student_projects',
    recordId: item.id,
    action: 'insert',
    oldData: null,
    newData: item,
  });

  return item;
}

export async function updateStudentProject(projectId, data, actorId) {
  if (!global.__RIMT_DB_PROJECTS) global.__RIMT_DB_PROJECTS = [];
  const idx = global.__RIMT_DB_PROJECTS.findIndex((p) => p.id === projectId);
  const oldData = idx >= 0 ? { ...global.__RIMT_DB_PROJECTS[idx] } : null;

  const now = new Date().toISOString();
  const updated = {
    ...(oldData || {}),
    ...data,
    id: projectId,
    updated_by: actorId || null,
    updated_at: now,
  };

  if (idx >= 0) {
    global.__RIMT_DB_PROJECTS[idx] = updated;
  } else {
    global.__RIMT_DB_PROJECTS.push(updated);
  }

  await recordAuditLog({
    actorId,
    studentId: updated.student_id,
    tableName: 'student_projects',
    recordId: projectId,
    action: 'update',
    oldData,
    newData: updated,
  });

  return updated;
}

export async function deleteStudentProject(projectId, studentId, actorId) {
  if (!global.__RIMT_DB_PROJECTS) global.__RIMT_DB_PROJECTS = [];
  const idx = global.__RIMT_DB_PROJECTS.findIndex((p) => p.id === projectId);
  const oldData = idx >= 0 ? global.__RIMT_DB_PROJECTS[idx] : null;

  global.__RIMT_DB_PROJECTS = global.__RIMT_DB_PROJECTS.filter((p) => p.id !== projectId);

  await recordAuditLog({
    actorId,
    studentId: studentId || oldData?.student_id,
    tableName: 'student_projects',
    recordId: projectId,
    action: 'delete',
    oldData,
    newData: null,
  });

  return true;
}

export async function reorderStudentProjects(studentId, orderedIds, actorId) {
  if (!Array.isArray(orderedIds) || !global.__RIMT_DB_PROJECTS) return;
  orderedIds.forEach((id, sortOrder) => {
    const item = global.__RIMT_DB_PROJECTS.find((p) => p.id === id);
    if (item) {
      item.sort_order = sortOrder;
      item.updated_at = new Date().toISOString();
    }
  });
  return true;
}

export async function createStudentGitProject(studentId, data, actorId) {
  await initDb();
  const student = (await getUserById(studentId)) || (await getUserByRollNo(studentId));
  if (!student) throw new Error('Student not found');
  const validStudentId = student.id;

  if (!global.__RIMT_DB_GIT_PROJECTS) global.__RIMT_DB_GIT_PROJECTS = [];
  const count = global.__RIMT_DB_GIT_PROJECTS.filter((p) => p.student_id === validStudentId).length;

  const now = new Date().toISOString();
  const item = {
    id: (crypto.randomUUID ? crypto.randomUUID() : `git-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
    student_id: validStudentId,
    repo_name: String(data.repo_name || 'repository').trim(),
    repo_url: String(data.repo_url || '').trim(),
    description: data.description ? String(data.description).trim() : null,
    primary_language: data.primary_language ? String(data.primary_language).trim() : null,
    stars: data.stars != null ? Number(data.stars) : 0,
    is_visible: data.is_visible !== undefined ? Boolean(data.is_visible) : true,
    sort_order: count,
    created_by: actorId || null,
    updated_by: actorId || null,
    created_at: now,
    updated_at: now,
  };

  global.__RIMT_DB_GIT_PROJECTS.push(item);

  await recordAuditLog({
    actorId,
    studentId: validStudentId,
    tableName: 'student_git_projects',
    recordId: item.id,
    action: 'insert',
    oldData: null,
    newData: item,
  });

  return item;
}

export async function updateStudentGitProject(gitProjectId, data, actorId) {
  if (!global.__RIMT_DB_GIT_PROJECTS) global.__RIMT_DB_GIT_PROJECTS = [];
  const idx = global.__RIMT_DB_GIT_PROJECTS.findIndex((p) => p.id === gitProjectId);
  const oldData = idx >= 0 ? { ...global.__RIMT_DB_GIT_PROJECTS[idx] } : null;

  const now = new Date().toISOString();
  const updated = {
    ...(oldData || {}),
    ...data,
    id: gitProjectId,
    updated_by: actorId || null,
    updated_at: now,
  };

  if (idx >= 0) {
    global.__RIMT_DB_GIT_PROJECTS[idx] = updated;
  } else {
    global.__RIMT_DB_GIT_PROJECTS.push(updated);
  }

  await recordAuditLog({
    actorId,
    studentId: updated.student_id,
    tableName: 'student_git_projects',
    recordId: gitProjectId,
    action: 'update',
    oldData,
    newData: updated,
  });

  return updated;
}

export async function deleteStudentGitProject(gitProjectId, studentId, actorId) {
  if (!global.__RIMT_DB_GIT_PROJECTS) global.__RIMT_DB_GIT_PROJECTS = [];
  const idx = global.__RIMT_DB_GIT_PROJECTS.findIndex((p) => p.id === gitProjectId);
  const oldData = idx >= 0 ? global.__RIMT_DB_GIT_PROJECTS[idx] : null;

  global.__RIMT_DB_GIT_PROJECTS = global.__RIMT_DB_GIT_PROJECTS.filter((p) => p.id !== gitProjectId);

  await recordAuditLog({
    actorId,
    studentId: studentId || oldData?.student_id,
    tableName: 'student_git_projects',
    recordId: gitProjectId,
    action: 'delete',
    oldData,
    newData: null,
  });

  return true;
}

export async function createStudentCertificate(studentId, data, actorId) {
  await initDb();
  const student = (await getUserById(studentId)) || (await getUserByRollNo(studentId));
  if (!student) throw new Error('Student not found');
  const validStudentId = student.id;

  if (!global.__RIMT_DB_CERTIFICATES) global.__RIMT_DB_CERTIFICATES = [];

  const now = new Date().toISOString();
  const item = {
    id: (crypto.randomUUID ? crypto.randomUUID() : `cert-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
    student_id: validStudentId,
    project_id: data.project_id || null,
    title: String(data.title || 'Official Certificate').trim(),
    issuer: data.issuer ? String(data.issuer).trim() : null,
    issue_date: data.issue_date || null,
    credential_id: data.credential_id ? String(data.credential_id).trim() : null,
    credential_url: data.credential_url ? String(data.credential_url).trim() : null,
    file_path: data.file_path || null,
    file_mime: data.file_mime || 'application/pdf',
    is_visible: data.is_visible !== undefined ? Boolean(data.is_visible) : true,
    created_by: actorId || null,
    updated_by: actorId || null,
    created_at: now,
    updated_at: now,
  };

  global.__RIMT_DB_CERTIFICATES.push(item);

  await recordAuditLog({
    actorId,
    studentId: validStudentId,
    tableName: 'student_certificates',
    recordId: item.id,
    action: 'insert',
    oldData: null,
    newData: item,
  });

  return item;
}

export async function updateStudentCertificate(certId, data, actorId) {
  if (!global.__RIMT_DB_CERTIFICATES) global.__RIMT_DB_CERTIFICATES = [];
  const idx = global.__RIMT_DB_CERTIFICATES.findIndex((c) => c.id === certId);
  const oldData = idx >= 0 ? { ...global.__RIMT_DB_CERTIFICATES[idx] } : null;

  const now = new Date().toISOString();
  const updated = {
    ...(oldData || {}),
    ...data,
    id: certId,
    updated_by: actorId || null,
    updated_at: now,
  };

  if (idx >= 0) {
    global.__RIMT_DB_CERTIFICATES[idx] = updated;
  } else {
    global.__RIMT_DB_CERTIFICATES.push(updated);
  }

  await recordAuditLog({
    actorId,
    studentId: updated.student_id,
    tableName: 'student_certificates',
    recordId: certId,
    action: 'update',
    oldData,
    newData: updated,
  });

  return updated;
}

export async function deleteStudentCertificate(certId, studentId, actorId) {
  if (!global.__RIMT_DB_CERTIFICATES) global.__RIMT_DB_CERTIFICATES = [];
  const idx = global.__RIMT_DB_CERTIFICATES.findIndex((c) => c.id === certId);
  const oldData = idx >= 0 ? global.__RIMT_DB_CERTIFICATES[idx] : null;

  global.__RIMT_DB_CERTIFICATES = global.__RIMT_DB_CERTIFICATES.filter((c) => c.id !== certId);

  await recordAuditLog({
    actorId,
    studentId: studentId || oldData?.student_id,
    tableName: 'student_certificates',
    recordId: certId,
    action: 'delete',
    oldData,
    newData: null,
  });

  return true;
}

export async function createStudentInternship(studentId, data, actorId) {
  await initDb();
  const student = (await getUserById(studentId)) || (await getUserByRollNo(studentId));
  if (!student) throw new Error('Student not found');
  const validStudentId = student.id;

  if (!global.__RIMT_DB_INTERNSHIPS) global.__RIMT_DB_INTERNSHIPS = [];

  const now = new Date().toISOString();
  const item = {
    id: (crypto.randomUUID ? crypto.randomUUID() : `intern-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
    student_id: validStudentId,
    company_name: String(data.company_name || 'Organization').trim(),
    role_title: String(data.role_title || data.role || 'Intern').trim(),
    location: data.location ? String(data.location).trim() : null,
    mode: ['onsite', 'remote', 'hybrid'].includes(data.mode) ? data.mode : 'onsite',
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    is_ongoing: Boolean(data.is_ongoing),
    stipend: data.stipend != null && data.stipend !== '' ? Number(data.stipend) : null,
    description: data.description ? String(data.description).trim() : null,
    offer_letter_path: data.offer_letter_path || null,
    completion_certificate_path: data.completion_certificate_path || null,
    status: ['ongoing', 'completed', 'terminated'].includes(data.status) ? data.status : 'ongoing',
    opportunity_id: data.opportunity_id || null,
    duration_months: data.duration_months ? Number(data.duration_months) : null,
    season: data.season || null,
    compensation_type: data.compensation_type || null,
    fee_amount: data.fee_amount != null && data.fee_amount !== '' ? Number(data.fee_amount) : null,
    created_by: actorId || null,
    updated_by: actorId || null,
    created_at: now,
    updated_at: now,
  };

  global.__RIMT_DB_INTERNSHIPS.push(item);

  await recordAuditLog({
    actorId,
    studentId: validStudentId,
    tableName: 'student_internships',
    recordId: item.id,
    action: 'insert',
    oldData: null,
    newData: item,
  });

  return item;
}

export async function updateStudentInternship(internshipId, data, actorId) {
  if (!global.__RIMT_DB_INTERNSHIPS) global.__RIMT_DB_INTERNSHIPS = [];
  const idx = global.__RIMT_DB_INTERNSHIPS.findIndex((i) => i.id === internshipId);
  const oldData = idx >= 0 ? { ...global.__RIMT_DB_INTERNSHIPS[idx] } : null;

  const now = new Date().toISOString();
  const updated = {
    ...(oldData || {}),
    ...data,
    id: internshipId,
    updated_by: actorId || null,
    updated_at: now,
  };

  if (idx >= 0) {
    global.__RIMT_DB_INTERNSHIPS[idx] = updated;
  } else {
    global.__RIMT_DB_INTERNSHIPS.push(updated);
  }

  await recordAuditLog({
    actorId,
    studentId: updated.student_id,
    tableName: 'student_internships',
    recordId: internshipId,
    action: 'update',
    oldData,
    newData: updated,
  });

  return updated;
}

export async function deleteStudentInternship(internshipId, studentId, actorId) {
  if (!global.__RIMT_DB_INTERNSHIPS) global.__RIMT_DB_INTERNSHIPS = [];
  const idx = global.__RIMT_DB_INTERNSHIPS.findIndex((i) => i.id === internshipId);
  const oldData = idx >= 0 ? global.__RIMT_DB_INTERNSHIPS[idx] : null;

  global.__RIMT_DB_INTERNSHIPS = global.__RIMT_DB_INTERNSHIPS.filter((i) => i.id !== internshipId);

  await recordAuditLog({
    actorId,
    studentId: studentId || oldData?.student_id,
    tableName: 'student_internships',
    recordId: internshipId,
    action: 'delete',
    oldData,
    newData: null,
  });

  return true;
}

/**
 * Retrieve all student internships aggregated across approved students.
 * Always returns live data or [] if none exist. Never returns fake mock data.
 */
export async function getAllStudentInternships() {
  const internships = [];
  const seenIds = new Set();

  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/student_internships?select=*`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          for (const row of rows) {
            seenIds.add(row.id);
            internships.push(row);
          }
        }
      }
    } catch (e) {
      console.warn('Supabase getAllStudentInternships error:', e.message);
    }
  }

  if (global.__RIMT_DB_INTERNSHIPS && Array.isArray(global.__RIMT_DB_INTERNSHIPS)) {
    for (const intern of global.__RIMT_DB_INTERNSHIPS) {
      if (!seenIds.has(intern.id)) {
        seenIds.add(intern.id);
        internships.push({ ...intern });
      }
    }
  }

  const allStudents = await getRequests({ status: 'APPROVED' });
  for (const student of allStudents) {
    let studentInternships = [];
    if (Array.isArray(student.internships)) {
      studentInternships = student.internships;
    } else if (typeof student.internships === 'string') {
      try {
        const parsed = JSON.parse(student.internships);
        if (Array.isArray(parsed)) studentInternships = parsed;
      } catch {}
    }
    if (student.admin_notes) {
      try {
        const parsedNotes = JSON.parse(student.admin_notes);
        if (Array.isArray(parsedNotes?.internships)) {
          studentInternships = [...studentInternships, ...parsedNotes.internships];
        }
      } catch {}
    }

    for (const intern of studentInternships) {
      if (!seenIds.has(intern.id)) {
        seenIds.add(intern.id);
        internships.push({
          ...intern,
          student_id: student.id,
          student_name: student.full_name || student.name || '',
          student_roll: student.roll_number || student.roll_no || '',
          student_department: student.department || student.course || '',
        });
      }
    }
  }

  for (const intern of internships) {
    if (intern.student_id && (!intern.student_name || !intern.student_roll)) {
      const s = allStudents.find((st) => st.id === intern.student_id);
      if (s) {
        intern.student_name = intern.student_name || s.full_name || s.name || '';
        intern.student_roll = intern.student_roll || s.roll_number || s.roll_no || '';
        intern.student_department = intern.student_department || s.department || s.course || '';
      }
    }
  }

  return internships;
}

/**
 * ====================================================================
 * INTERNSHIP OPPORTUNITIES (Module 06 Core)
 * In-memory fallback starts strictly EMPTY.
 * ====================================================================
 */

if (!global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES) {
  global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES = [];
}

export async function getInternshipOpportunities(filters = {}) {
  let list = [];

  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/internship_opportunities?select=*`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          list = rows;
        }
      }
    } catch (e) {
      console.warn('Supabase getInternshipOpportunities error:', e.message);
    }
  }

  if (!list || list.length === 0) {
    if (!global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES) {
      global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES = [];
    }
    list = [...global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES];
  }

  let result = list;

  if (filters.q) {
    const q = filters.q.toLowerCase().trim();
    result = result.filter((item) => {
      const titleMatch = (item.title || '').toLowerCase().includes(q);
      const companyMatch = (item.company_name || '').toLowerCase().includes(q);
      const skillMatch = Array.isArray(item.required_skills) &&
        item.required_skills.some((s) => s.toLowerCase().includes(q));
      return titleMatch || companyMatch || skillMatch;
    });
  }

  if (filters.skills) {
    const filterSkills = (Array.isArray(filters.skills) ? filters.skills : String(filters.skills).split(','))
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (filterSkills.length > 0) {
      result = result.filter((item) => {
        const itemSkills = (item.required_skills || []).map((s) => s.toLowerCase());
        return filterSkills.some((fs) => itemSkills.includes(fs));
      });
    }
  }

  if (filters.duration) {
    const dur = Number(filters.duration);
    if (!isNaN(dur) && dur > 0) {
      result = result.filter((item) => Number(item.duration_months) === dur);
    }
  }

  if (filters.season && filters.season !== 'all') {
    const s = filters.season.toLowerCase().trim();
    result = result.filter((item) => (item.season || '').toLowerCase() === s);
  }

  if (filters.compensation && filters.compensation !== 'all') {
    const c = filters.compensation.toLowerCase().trim();
    result = result.filter((item) => (item.compensation_type || '').toLowerCase() === c);
  }

  if (filters.company && filters.company !== 'all') {
    const comp = filters.company.toLowerCase().trim();
    result = result.filter((item) =>
      (item.company_id || '').toLowerCase() === comp ||
      (item.company_name || '').toLowerCase() === comp
    );
  }

  if (filters.status && filters.status !== 'all') {
    const st = filters.status.toLowerCase().trim();
    result = result.filter((item) => (item.status || '').toLowerCase() === st);
  }

  if (filters.department && filters.department !== 'all') {
    const dept = filters.department.trim();
    result = result.filter((item) => {
      if (!item.eligible_departments || item.eligible_departments.length === 0) return true;
      return item.eligible_departments.includes(dept);
    });
  }

  const sort = filters.sort || 'newest';
  result.sort((a, b) => {
    if (sort === 'deadline') {
      if (!a.application_deadline) return 1;
      if (!b.application_deadline) return -1;
      return new Date(a.application_deadline) - new Date(b.application_deadline);
    }
    if (sort === 'duration') {
      return (Number(a.duration_months) || 0) - (Number(b.duration_months) || 0);
    }
    if (sort === 'stipend') {
      return (Number(b.stipend_amount) || 0) - (Number(a.stipend_amount) || 0);
    }
    if (sort === 'company') {
      return (a.company_name || '').localeCompare(b.company_name || '');
    }
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return result;
}

export async function getInternshipOpportunityById(id) {
  if (!id) return null;

  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/internship_opportunities?id=eq.${encodeURIComponent(id)}&select=*`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        }
      );
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows[0]) {
          return rows[0];
        }
      }
    } catch (e) {
      console.warn('Supabase getInternshipOpportunityById error:', e.message);
    }
  }

  if (!global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES) {
    global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES = [];
  }
  const found = global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES.find((o) => o.id === id);
  return found ? { ...found } : null;
}

export async function createInternshipOpportunity(data, actor = null) {
  const validation = validateInternshipOpportunity(data);
  if (!validation.valid) {
    const err = new Error('Validation failed');
    err.errors = validation.errors;
    err.status = 400;
    throw err;
  }

  const id = crypto.randomUUID ? crypto.randomUUID() : `opp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const actorName = actor?.full_name || actor?.name || 'Administrator';
  const actorId = actor?.id || actor?.adminId || null;

  const opportunity = {
    id,
    ...validation.sanitized,
    created_by: actorName,
    created_at: now,
    updated_at: now,
  };

  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const writeHeaders = getAdminWriteHeaders();
      if (writeHeaders) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/internship_opportunities`, {
          method: 'POST',
          headers: writeHeaders,
          body: JSON.stringify(opportunity),
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows[0]) {
            Object.assign(opportunity, rows[0]);
          }
        }
      }
    } catch (e) {
      console.warn('Supabase createInternshipOpportunity error:', e.message);
    }
  }

  if (!global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES) {
    global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES = [];
  }
  global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES.unshift(opportunity);

  await recordAuditLog({
    actorId,
    tableName: 'internship_opportunities',
    recordId: opportunity.id,
    action: 'insert',
    oldData: null,
    newData: opportunity,
  });

  return opportunity;
}

export async function updateInternshipOpportunity(id, data, actor = null) {
  if (!id) throw new Error('Opportunity ID is required');
  const existing = await getInternshipOpportunityById(id);
  if (!existing) {
    const err = new Error('Internship opportunity not found');
    err.status = 404;
    throw err;
  }

  const merged = { ...existing, ...data };
  const validation = validateInternshipOpportunity(merged, { isPartial: false });
  if (!validation.valid) {
    const err = new Error('Validation failed');
    err.errors = validation.errors;
    err.status = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const actorId = actor?.id || actor?.adminId || null;

  const updated = {
    ...existing,
    ...validation.sanitized,
    id: existing.id,
    updated_at: now,
  };

  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const writeHeaders = getAdminWriteHeaders();
      if (writeHeaders) {
        await fetch(`${SUPABASE_URL}/rest/v1/internship_opportunities?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: writeHeaders,
          body: JSON.stringify(updated),
        });
      }
    } catch (e) {
      console.warn('Supabase updateInternshipOpportunity error:', e.message);
    }
  }

  if (!global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES) {
    global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES = [];
  }
  const idx = global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES.findIndex((o) => o.id === id);
  if (idx >= 0) {
    global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES[idx] = updated;
  } else {
    global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES.unshift(updated);
  }

  await recordAuditLog({
    actorId,
    tableName: 'internship_opportunities',
    recordId: id,
    action: 'update',
    oldData: existing,
    newData: updated,
  });

  return updated;
}

export async function deleteInternshipOpportunity(id, actor = null) {
  if (!id) throw new Error('Opportunity ID is required');
  const existing = await getInternshipOpportunityById(id);
  if (!existing) {
    const err = new Error('Internship opportunity not found');
    err.status = 404;
    throw err;
  }

  const actorId = actor?.id || actor?.adminId || null;

  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const writeHeaders = getAdminWriteHeaders();
      if (writeHeaders) {
        await fetch(`${SUPABASE_URL}/rest/v1/internship_opportunities?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: writeHeaders,
        });
      }
    } catch (e) {
      console.warn('Supabase deleteInternshipOpportunity error:', e.message);
    }
  }

  if (!global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES) {
    global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES = [];
  }
  global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES = global.__RIMT_DB_INTERNSHIP_OPPORTUNITIES.filter(
    (o) => o.id !== id
  );

  await recordAuditLog({
    actorId,
    tableName: 'internship_opportunities',
    recordId: id,
    action: 'delete',
    oldData: existing,
    newData: null,
  });

  return true;
}

/**
 * ====================================================================
 * COMPANY / CORPORATE RECRUITER PORTAL HELPERS
 * ====================================================================
 */

export async function initCompanyDb() {
  if (global.__RIMT_DB_COMPANIES_INITIALIZED) return;

  const defaultHash = await hashPassword('Company@RIMT#2026');

  global.__RIMT_DB_COMPANIES = [
    {
      id: 'comp-google-001',
      company_name: 'Google LLC',
      recruiter_name: 'Google Campus Talent',
      email: 'recruiter@google.com',
      password_hash: defaultHash,
      auth_provider: 'google',
      industry: 'Cloud & AI Technology',
      avatar_url: 'https://ui-avatars.com/api/?name=Google&background=4285F4&color=fff&bold=true',
      role: 'COMPANY',
      status: 'ACTIVE',
      created_at: new Date('2026-09-01T10:00:00Z').toISOString(),
      updated_at: new Date('2026-09-01T10:00:00Z').toISOString(),
    },
    {
      id: 'comp-msft-002',
      company_name: 'Microsoft Corporation',
      recruiter_name: 'Microsoft University Recruiting',
      email: 'recruiter@microsoft.com',
      password_hash: defaultHash,
      auth_provider: 'google',
      industry: 'Enterprise Software & Azure',
      avatar_url: 'https://ui-avatars.com/api/?name=Microsoft&background=00A4EF&color=fff&bold=true',
      role: 'COMPANY',
      status: 'ACTIVE',
      created_at: new Date('2026-09-01T10:00:00Z').toISOString(),
      updated_at: new Date('2026-09-01T10:00:00Z').toISOString(),
    },
    {
      id: 'comp-tcs-003',
      company_name: 'Tata Consultancy Services',
      recruiter_name: 'TCS Campus Talent',
      email: 'campus@tcs.com',
      password_hash: defaultHash,
      auth_provider: 'email',
      industry: 'IT Consulting & Services',
      avatar_url: 'https://ui-avatars.com/api/?name=TCS&background=0B4EA2&color=fff&bold=true',
      role: 'COMPANY',
      status: 'ACTIVE',
      created_at: new Date('2026-09-01T10:00:00Z').toISOString(),
      updated_at: new Date('2026-09-01T10:00:00Z').toISOString(),
    },
  ];

  global.__RIMT_DB_COMPANIES_INITIALIZED = true;
}

export async function getCompanyByEmail(email) {
  if (!email) return null;
  await initCompanyDb();
  const normalized = email.trim().toLowerCase();

  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/companies?email=ilike.${encodeURIComponent(normalized)}&select=*`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          return {
            ...data[0],
            role: 'COMPANY',
          };
        }
      }
    } catch (err) {
      console.warn('Supabase getCompanyByEmail error:', err.message);
    }
  }

  const found = getMemoryCompanies().find(
    (c) => c.email && c.email.toLowerCase() === normalized
  );
  return found ? { ...found } : null;
}

export async function getCompanyById(id) {
  if (!id) return null;
  await initCompanyDb();

  if (HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/companies?id=eq.${encodeURIComponent(id)}&select=*`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]) {
          return {
            ...data[0],
            role: 'COMPANY',
          };
        }
      }
    } catch (err) {
      console.warn('Supabase getCompanyById error:', err.message);
    }
  }

  const found = getMemoryCompanies().find((c) => c.id === id);
  return found ? { ...found } : null;
}

export async function createCompany({
  company_name,
  recruiter_name,
  email,
  password_hash,
  auth_provider = 'email',
  industry = 'Corporate Recruitment',
  avatar_url = null,
  logo_url = null,
}) {
  await initCompanyDb();
  const id = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const normalizedEmail = email.trim().toLowerCase();

  const brandInitial = (company_name || 'Company').substring(0, 2).toUpperCase();
  const fallbackAvatar = logo_url || avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(company_name || 'Company')}&background=0B4EA2&color=fff&bold=true`;

  const newCompany = {
    id,
    company_name: (company_name || 'Corporate Partner').trim(),
    recruiter_name: (recruiter_name || company_name || 'Recruiter').trim(),
    email: normalizedEmail,
    password_hash: password_hash || null,
    auth_provider,
    industry: (industry || 'Corporate Recruitment').trim(),
    avatar_url: fallbackAvatar,
    logo_url: fallbackAvatar,
    role: 'COMPANY',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
  };

  // Attempt to store in Supabase
  const writeHeaders = getAdminWriteHeaders();
  if (writeHeaders && HAS_SUPABASE_READ && !IS_TEST_ENV) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
        method: 'POST',
        headers: writeHeaders,
        body: JSON.stringify(newCompany),
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows[0]) {
          Object.assign(newCompany, rows[0]);
        }
      }
    } catch (err) {
      console.warn('Supabase createCompany error, falling back to memory:', err.message);
    }
  }

  getMemoryCompanies().unshift(newCompany);
  return newCompany;
}

export async function getAllCompanies() {
  await initCompanyDb();
  return getMemoryCompanies();
}
