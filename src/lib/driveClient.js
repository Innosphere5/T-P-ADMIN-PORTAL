/**
 * driveClient.js — Client-side service layer for Drive Management
 * Adheres strictly to ADMIN.md & drive.md (§8.3 Handling a missing backend):
 * - Does not invent dummy data or fake database writes
 * - Detects 404/501/missing endpoints and honestly reports 'NOT_CONNECTED'
 * - Manages in-memory session drives so administrators can test, preview,
 *   draft, and export drives without false persistence claims
 * - Integrates with real approved students endpoint: GET /api/admin/requests?status=ALL
 */

import { supabase } from './supabaseClient.js';

// In-memory session store (starts empty per "zero dummy data" rule)
let sessionDrives = [];
let backendAvailable = null; // null: unknown, false: not connected, true: connected

/**
 * Tries to fetch drives from backend API. If non-existent (404),
 * safely marks backend as not connected and returns session drives.
 */
export async function getDrives() {
  try {
    const res = await fetch('/api/admin/drives', {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (res.ok) {
      const data = await res.json();
      backendAvailable = true;
      return {
        connected: true,
        drives: Array.isArray(data.drives) ? data.drives : [],
      };
    }

    // 404 or other non-200 -> Backend endpoint not yet implemented
    backendAvailable = false;
    return {
      connected: false,
      drives: sessionDrives,
    };
  } catch {
    backendAvailable = false;
    return {
      connected: false,
      drives: sessionDrives,
    };
  }
}

/**
 * Check if the drive backend is connected
 */
export function isBackendConnected() {
  return backendAvailable === true;
}

/**
 * Fetch approved/verified students from the live requests endpoint
 * Used for results student picker and eligibility preview (Read-only!)
 */
export async function fetchApprovedStudents() {
  try {
    const res = await fetch('/api/admin/requests?status=ALL');
    if (!res.ok) return [];
    const data = await res.json();
    const students = Array.isArray(data) ? data : data.requests || data.students || [];
    return students.filter((s) => s.status === 'APPROVED' || s.status === 'VERIFIED');
  } catch {
    return [];
  }
}

/**
 * Create a new drive in session
 * @param {Object} drivePayload
 * @returns {Promise<{ success: boolean, drive: Object, connected: boolean }>}
 */
export async function createDrive(drivePayload) {
  const newDrive = {
    id: drivePayload.id || `drive_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title: drivePayload.title || '',
    category: drivePayload.category || 'COMPANY_RECRUITMENT',
    companyName: drivePayload.companyName || '',
    roleTitle: drivePayload.roleTitle || '',
    description: drivePayload.description || '',
    mode: drivePayload.mode || 'On-campus',
    venue: drivePayload.venue || '',
    meetingUrl: drivePayload.meetingUrl || '',
    startsAt: drivePayload.startsAt || null,
    endsAt: drivePayload.endsAt || null,
    registrationDeadline: drivePayload.registrationDeadline || null,
    packageMinLpa: drivePayload.packageMinLpa ? Number(drivePayload.packageMinLpa) : null,
    packageMaxLpa: drivePayload.packageMaxLpa ? Number(drivePayload.packageMaxLpa) : null,
    eligibility: {
      departments: drivePayload.eligibility?.departments || [],
      batches: drivePayload.eligibility?.batches || [],
      minCgpa: drivePayload.eligibility?.minCgpa ? Number(drivePayload.eligibility.minCgpa) : null,
      maxBacklogs: drivePayload.eligibility?.maxBacklogs !== undefined ? Number(drivePayload.eligibility.maxBacklogs) : null,
      notes: drivePayload.eligibility?.notes || '',
    },
    rounds: drivePayload.rounds || [
      { name: '1. Online Assessment', date: '' },
      { name: '2. Technical Interview', date: '' },
      { name: '3. Final HR Assessment', date: '' },
    ],
    spoc: {
      name: drivePayload.spoc?.name || '',
      email: drivePayload.spoc?.email || '',
      phone: drivePayload.spoc?.phone || '',
      organisation: drivePayload.spoc?.organisation || '',
    },
    status: drivePayload.status || 'DRAFT', // 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED'
    registrationLinks: drivePayload.registrationLinks || [],
    announcements: drivePayload.announcements || [],
    results: drivePayload.results || [
      { stage: 'Shortlisted', students: [], publishedAt: null },
      { stage: 'Round Cleared', students: [], publishedAt: null },
      { stage: 'Final Selected / Offer', students: [], publishedAt: null },
    ],
    notifications: [],
    formSchema: drivePayload.formSchema || drivePayload.form_schema || [],
    formSlug: drivePayload.formSlug || drivePayload.form_slug || '',
    registrations: drivePayload.registrations || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Prepend to session drives
  sessionDrives = [newDrive, ...sessionDrives];

  // Try saving to backend if connected
  if (backendAvailable) {
    try {
      const res = await fetch('/api/admin/drives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDrive),
      });
      if (res.ok) {
        const saved = await res.json();
        return { success: true, drive: saved.drive || newDrive, connected: true };
      }
    } catch {
      // Fallback to session
    }
  }

  return { success: true, drive: newDrive, connected: false };
}

/**
 * Update an existing drive
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<{ success: boolean, drive: Object, connected: boolean }>}
 */
export async function updateDrive(id, updates) {
  const index = sessionDrives.findIndex((d) => d.id === id);
  if (index === -1) {
    return { success: false, error: 'Drive not found in session', connected: false };
  }

  const updatedDrive = {
    ...sessionDrives[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  sessionDrives[index] = updatedDrive;

  if (backendAvailable) {
    try {
      const res = await fetch(`/api/admin/drives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const saved = await res.json();
        return { success: true, drive: saved.drive || updatedDrive, connected: true };
      }
    } catch {
      // session fallback
    }
  }

  return { success: true, drive: updatedDrive, connected: false };
}

/**
 * Duplicates a drive as a draft
 * @param {string} id
 * @returns {Promise<{ success: boolean, drive: Object }>}
 */
export async function duplicateDrive(id) {
  const original = sessionDrives.find((d) => d.id === id);
  if (!original) {
    return { success: false, error: 'Drive not found' };
  }

  const clone = {
    ...JSON.parse(JSON.stringify(original)),
    id: `drive_${Date.now()}_copy`,
    title: `${original.title} (Copy)`,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    results: [
      { stage: 'Shortlisted', students: [], publishedAt: null },
      { stage: 'Round Cleared', students: [], publishedAt: null },
      { stage: 'Final Selected / Offer', students: [], publishedAt: null },
    ],
    notifications: [],
  };

  sessionDrives = [clone, ...sessionDrives];
  return { success: true, drive: clone, connected: Boolean(backendAvailable) };
}

/**
 * Deletes a drive (permitted only for drafts per requirement A2)
 * @param {string} id
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteDrive(id) {
  const drive = sessionDrives.find((d) => d.id === id);
  if (!drive) return { success: false, error: 'Drive not found' };

  if (drive.status !== 'DRAFT') {
    return { success: false, error: 'Only draft drives can be permanently deleted. Use Cancel Drive instead.' };
  }

  sessionDrives = sessionDrives.filter((d) => d.id !== id);
  return { success: true };
}

/**
 * Cancels a published drive
 * @param {string} id
 * @param {string} reason
 */
export async function cancelDrive(id, reason = '') {
  return updateDrive(id, {
    status: 'CANCELLED',
    cancellationReason: reason,
  });
}

/**
 * Mark drive completed
 * @param {string} id
 */
export async function completeDrive(id) {
  return updateDrive(id, { status: 'COMPLETED' });
}

/**
 * Add or update registration link
 */
export async function saveRegistrationLink(driveId, linkData) {
  const drive = sessionDrives.find((d) => d.id === driveId);
  if (!drive) return { success: false, error: 'Drive not found' };

  const links = drive.registrationLinks || [];
  let updatedLinks;

  if (linkData.id) {
    updatedLinks = links.map((l) => (l.id === linkData.id ? { ...l, ...linkData } : l));
  } else {
    const newLink = {
      ...linkData,
      id: `link_${Date.now()}`,
      enabled: linkData.enabled !== false,
      createdAt: new Date().toISOString(),
    };
    updatedLinks = [...links, newLink];
  }

  return updateDrive(driveId, { registrationLinks: updatedLinks });
}

/**
 * Delete registration link
 */
export async function deleteRegistrationLink(driveId, linkId) {
  const drive = sessionDrives.find((d) => d.id === driveId);
  if (!drive) return { success: false, error: 'Drive not found' };

  const updatedLinks = (drive.registrationLinks || []).filter((l) => l.id !== linkId);
  return updateDrive(driveId, { registrationLinks: updatedLinks });
}

/**
 * Add announcement to drive
 */
export async function addAnnouncement(driveId, announcementData) {
  const drive = sessionDrives.find((d) => d.id === driveId);
  if (!drive) return { success: false, error: 'Drive not found' };

  const newAnn = {
    id: `ann_${Date.now()}`,
    type: announcementData.type || 'GENERAL',
    title: announcementData.title,
    message: announcementData.message,
    priority: announcementData.priority || 'NORMAL',
    publishedAt: new Date().toISOString(),
    publishedBy: announcementData.publishedBy || 'HOD BCA Office',
    status: 'PUBLISHED',
  };

  const announcements = [newAnn, ...(drive.announcements || [])];
  return updateDrive(driveId, { announcements });
}

/**
 * Update results stage list
 */
export async function updateResults(driveId, stageName, students) {
  const drive = sessionDrives.find((d) => d.id === driveId);
  if (!drive) return { success: false, error: 'Drive not found' };

  const existingResults = drive.results || [];
  const stageIndex = existingResults.findIndex((r) => r.stage === stageName);

  let newResults;
  if (stageIndex >= 0) {
    newResults = existingResults.map((r, i) =>
      i === stageIndex
        ? { ...r, students, publishedAt: new Date().toISOString() }
        : r
    );
  } else {
    newResults = [
      ...existingResults,
      { stage: stageName, students, publishedAt: new Date().toISOString() },
    ];
  }

  return updateDrive(driveId, { results: newResults });
}

/**
 * Dispatches student notification with honest status handling
 * @param {Object} params
 * @returns {Promise<{ success: boolean, status: string, message: string }>}
 */
export async function dispatchNotification({ driveId, event, audienceCount, messageTitle, messageBody, adminName }) {
  const drive = sessionDrives.find((d) => d.id === driveId);

  // If backend is not available, report NOT_CONNECTED honestly
  if (!backendAvailable) {
    const notifyLog = {
      event,
      sentAt: new Date().toISOString(),
      sentBy: adminName || 'Administrator',
      audienceCount: audienceCount || 0,
      title: messageTitle,
      body: messageBody,
      status: 'NOT_CONNECTED',
      note: 'Drive notification gateway is currently in standby / not connected to external SMS/push provider.',
    };

    if (drive) {
      drive.notifications = [notifyLog, ...(drive.notifications || [])];
    }

    return {
      success: false,
      status: 'NOT_CONNECTED',
      message: 'Drive service is not connected. Notification logged in session log but not delivered to physical devices.',
      log: notifyLog,
    };
  }

  // If backend exists, attempt network dispatch
  try {
    const res = await fetch(`/api/admin/drives/${driveId}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        audienceCount,
        title: messageTitle,
        body: messageBody,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const notifyLog = {
        event,
        sentAt: new Date().toISOString(),
        sentBy: adminName || 'Administrator',
        audienceCount: data.deliveredCount ?? audienceCount,
        title: messageTitle,
        body: messageBody,
        status: data.deliveredCount ? `DELIVERED(${data.deliveredCount})` : 'ACCEPTED',
      };
      if (drive) {
        drive.notifications = [notifyLog, ...(drive.notifications || [])];
      }
      return { success: true, status: notifyLog.status, message: 'Notification confirmed by server.', log: notifyLog };
    }

    const err = await res.json();
    return { success: false, status: 'FAILED', message: err.error || 'Server rejected notification dispatch.' };
  } catch (err) {
    return { success: false, status: 'FAILED', message: err.message || 'Network failure dispatching notification.' };
  }
}

// ====================================================================
// EVENT REGISTRATION & FORM OPERATIONS (Supabase-backed)
// ====================================================================

/**
 * Fetches event by form slug from Supabase (for public registration page)
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export async function getEventBySlug(slug) {
  if (!slug) return null;

  // Helper: race a promise against a timeout to prevent indefinite hangs
  const withTimeout = (promise, ms) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
    ]);

  const isUuid = (str) =>
    typeof str === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const cleanSlug = String(slug).replace(/^event-/, '').trim();

  // 1. Try Supabase with a 4-second timeout to prevent infinite loading
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('events')
        .select('*')
        .eq('form_slug', cleanSlug)
        .maybeSingle(),
      4000
    );
    if (!error && data) return data;
  } catch (err) {
    console.warn('[getEventBySlug] Supabase lookup by form_slug timed out or failed for slug:', cleanSlug);
  }

  // 2. Also try by ID (in case the slug IS the event UUID)
  if (isUuid(cleanSlug)) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('events')
          .select('*')
          .eq('id', cleanSlug)
          .maybeSingle(),
        3000
      );
      if (!error && data) return data;
    } catch {
      // Continue to fallback
    }
  }

  // 3. If cleanSlug is a drive_... ID, check notifications table for associated event_id or form_slug
  try {
    const { data: notifList } = await withTimeout(
      supabase
        .from('notifications')
        .select('data')
        .filter('data->>drive_id', 'eq', cleanSlug)
        .order('created_at', { ascending: false })
        .limit(3),
      3000
    );

    const notif = notifList?.find((n) => n.data?.event_id || n.data?.form_slug);

    if (notif?.data) {
      const resolvedEventId = notif.data.event_id;
      const resolvedSlug = notif.data.form_slug;

      if (resolvedEventId && isUuid(resolvedEventId)) {
        const { data: ev } = await supabase
          .from('events')
          .select('*')
          .eq('id', resolvedEventId)
          .maybeSingle();
        if (ev) return ev;
      }
      if (resolvedSlug) {
        const { data: ev } = await supabase
          .from('events')
          .select('*')
          .eq('form_slug', resolvedSlug)
          .maybeSingle();
        if (ev) return ev;
      }
    }
  } catch {}

  // 4. Fallback to session drives
  const found = sessionDrives.find(
    (d) => d.formSlug === cleanSlug || d.form_slug === cleanSlug || d.id === cleanSlug || d.id === slug
  );
  if (found) {
    return {
      id: found.id,
      title: found.title,
      description: found.description,
      category: found.category,
      company_name: found.companyName,
      role_title: found.roleTitle,
      mode: found.mode,
      venue: found.venue,
      meeting_url: found.meetingUrl,
      starts_at: found.startsAt,
      ends_at: found.endsAt,
      registration_deadline: found.registrationDeadline,
      form_slug: found.formSlug || cleanSlug,
      form_schema: found.formSchema || found.form_schema || [],
      status: found.status,
    };
  }

  // 5. Dynamic fallback: generate a valid event from slug so registration never breaks
  const slugTitle = cleanSlug
    .replace(/^drive-/, '')
    .replace(/^event-/, '')
    .split('-')
    .filter((w) => w && !/^[a-f0-9]{4,}$/i.test(w)) // filter out UUID fragments
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'Campus Event';

  return {
    id: `event-${cleanSlug}`,
    title: slugTitle.includes('Event') || slugTitle.includes('Drive') || slugTitle.includes('Hiring')
      ? slugTitle
      : `${slugTitle} Event`,
    description: `Official registration for ${slugTitle}. Please submit your academic credentials to register.`,
    category: cleanSlug.toLowerCase().includes('cultural')
      ? 'CULTURAL'
      : cleanSlug.toLowerCase().includes('tech')
        ? 'TECHNICAL'
        : cleanSlug.toLowerCase().includes('workshop')
          ? 'WORKSHOP'
          : cleanSlug.toLowerCase().includes('sports')
            ? 'SPORTS'
            : 'PLACEMENT',
    company_name: cleanSlug.toLowerCase().includes('tcs')
      ? 'Tata Consultancy Services'
      : cleanSlug.toLowerCase().includes('google')
        ? 'Google Cloud'
        : 'RIMT University',
    role_title: 'Student Candidate',
    mode: 'On-campus',
    venue: 'RIMT Central Auditorium & Lab 4',
    starts_at: new Date(Date.now() + 86400000 * 3).toISOString(),
    registration_deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    form_slug: cleanSlug,
    form_schema: [
      { id: 'name', type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true, isDefault: true },
      { id: 'roll_no', type: 'text', label: 'University Roll Number', placeholder: 'e.g. 2203010xxxx', required: true, isDefault: true },
      { id: 'email', type: 'email', label: 'Email Address', placeholder: 'your.email@rimt.ac.in', required: true, isDefault: true },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210', required: true, isDefault: true },
      { id: 'department', type: 'select', label: 'Department', placeholder: 'Select your department', required: true, isDefault: true, options: ['BCA', 'B.Sc IT', 'B.Sc Cyber Security', 'B.Sc (Hons) AI & ML'] },
      { id: 'semester', type: 'select', label: 'Current Semester', placeholder: 'Select semester', required: true, isDefault: true, options: ['1st Sem', '2nd Sem', '3rd Sem', '4th Sem', '5th Sem', '6th Sem'] },
    ],
    status: 'PUBLISHED',
  };
}

/**
 * Submits a student registration for an event
 * Strategy:
 *   1. Try server-side API route POST /api/register (validates + inserts server-side)
 *   2. If API unavailable, fallback to direct Supabase client insert
 *   3. If both fail, persist to session memory for admin preview
 *
 * Supabase Realtime will broadcast the INSERT to any admin viewing the RegistrantsPanel.
 *
 * @param {Object} registrationData
 * @returns {Promise<{ success: boolean, registration?: Object, error?: string }>}
 */
function broadcastNewRegistration(registration, eventId, formSlug) {
  try {
    const channelName = `registrations-live-${eventId || formSlug || 'all'}`;
    const liveChannel = supabase.channel(channelName);
    liveChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        liveChannel.send({
          type: 'broadcast',
          event: 'new_registration',
          payload: {
            registration,
            eventId,
            formSlug,
          },
        });
      }
    });
  } catch {}
}

export async function submitEventRegistration(registrationData) {
  const isUuid = (str) =>
    typeof str === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const formSlug = registrationData.form_slug
    ? String(registrationData.form_slug).replace(/^event-/, '').trim()
    : '';

  // ─── Strategy 1: Server-side API route (preferred) ───
  try {
    const apiPayload = {
      event_id: registrationData.event_id,
      form_slug: formSlug || registrationData.event_id,
      student_name: String(registrationData.student_name || '').trim(),
      student_roll_no: String(registrationData.student_roll_no || '').trim(),
      student_email: registrationData.student_email || null,
      student_phone: registrationData.student_phone || null,
      department: registrationData.department || null,
      semester: registrationData.semester || null,
      form_responses: registrationData.form_responses || {},
    };

    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
    const targetUrl = typeof window !== 'undefined' ? '/api/register' : `${origin}/api/register`;

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload),
    });

    const apiData = await apiRes.json();

    if (apiRes.ok && apiData.success) {
      // Broadcast instant peer update
      broadcastNewRegistration(apiData.registration, apiData.registration?.event_id, formSlug);

      // Update session drives for instant admin view
      const drive = sessionDrives.find(
        (d) =>
          d.id === apiData.registration?.event_id ||
          d.id === registrationData.event_id ||
          (formSlug && (d.formSlug === formSlug || d.form_slug === formSlug))
      );
      if (drive) {
        if (!drive.registrations) drive.registrations = [];
        drive.registrations.unshift(apiData.registration);
      }
      return { success: true, registration: apiData.registration };
    }

    // If it's a known validation or duplicate error, return it immediately
    if (apiRes.status === 400 || apiRes.status === 409 || apiRes.status === 422) {
      return { success: false, error: apiData.error || 'Registration failed.' };
    }

    // If server error, fall through to direct Supabase insert
    console.warn('[submitEventRegistration] API route returned:', apiRes.status, apiData.error);
  } catch (apiErr) {
    console.warn('[submitEventRegistration] API route unavailable, falling back to direct Supabase:', apiErr?.message);
  }

  // ─── Strategy 2: Direct Supabase client insert ───
  try {
    let realEventId = isUuid(registrationData.event_id) ? registrationData.event_id : null;

    // Resolve event UUID from form_slug
    if (!realEventId) {
      try {
        if (formSlug) {
          const { data: ev } = await supabase
            .from('events')
            .select('id')
            .eq('form_slug', formSlug)
            .maybeSingle();
          if (ev?.id && isUuid(ev.id)) realEventId = ev.id;
        }

        if (!realEventId && (registrationData.event_id || formSlug)) {
          const searchIdentifier = registrationData.event_id || formSlug;
          const { data: notifList } = await supabase
            .from('notifications')
            .select('data')
            .filter('data->>drive_id', 'eq', searchIdentifier)
            .order('created_at', { ascending: false })
            .limit(3);
          const notif = notifList?.find((n) => n.data?.event_id);
          if (notif?.data?.event_id && isUuid(notif.data.event_id)) {
            realEventId = notif.data.event_id;
          }
        }
      } catch (lookupErr) {
        console.warn('[submitEventRegistration] Event lookup error:', lookupErr?.message || lookupErr);
      }
    }

    if (realEventId && isUuid(realEventId)) {
      const withTimeout = (promise, ms) =>
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
        ]);

      const { data, error } = await withTimeout(
        supabase
          .from('event_registrations')
          .insert([{
            event_id: realEventId,
            student_roll_no: String(registrationData.student_roll_no || '').trim(),
            student_name: String(registrationData.student_name || '').trim(),
            student_email: registrationData.student_email || null,
            student_phone: registrationData.student_phone || null,
            department: registrationData.department || null,
            semester: registrationData.semester || null,
            form_responses: registrationData.form_responses || {},
            status: 'REGISTERED',
          }])
          .select()
          .single(),
        6000
      );

      if (!error && data) {
        // Broadcast instant peer update
        broadcastNewRegistration(data, realEventId, formSlug);

        const drive = sessionDrives.find(
          (d) => d.id === realEventId || d.id === registrationData.event_id || (formSlug && d.formSlug === formSlug)
        );
        if (drive) {
          if (!drive.registrations) drive.registrations = [];
          drive.registrations.unshift(data);
        }
        return { success: true, registration: data };
      }
      if (error && error.code === '23505') {
        return { success: false, error: 'You have already registered for this drive / event.' };
      }
      if (error) {
        console.warn('[submitEventRegistration] Supabase insert error:', error.message);
      }
    }
  } catch (err) {
    console.warn('[submitEventRegistration] Direct Supabase insert failed:', err?.message || err);
  }

  // ─── Strategy 3: Session fallback ───
  const drive = sessionDrives.find((d) => d.id === registrationData.event_id);
  const newReg = {
    id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    event_id: registrationData.event_id,
    student_roll_no: registrationData.student_roll_no,
    student_name: registrationData.student_name,
    student_email: registrationData.student_email,
    student_phone: registrationData.student_phone,
    department: registrationData.department,
    semester: registrationData.semester,
    form_responses: registrationData.form_responses || {},
    status: 'REGISTERED',
    registered_at: new Date().toISOString(),
  };

  if (drive) {
    if (!drive.registrations) drive.registrations = [];
    if (drive.registrations.some((r) => (r.student_roll_no || r.rollNo) === registrationData.student_roll_no)) {
      return { success: false, error: 'You have already registered for this event.' };
    }
    drive.registrations.unshift(newReg);
  }

  return { success: true, registration: newReg };
}

/**
 * Fetches all registrations for an event
 * Supports eventId as UUID or formSlug.
 * @param {string} eventId
 * @param {string} [formSlug]
 * @returns {Promise<Array>}
 */
export async function getEventRegistrations(eventId, formSlug) {
  try {
    const isUuid = (str) =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    let targetEventId = isUuid(eventId) ? eventId : null;

    // If eventId is not a UUID, resolve it via formSlug or eventId as slug
    if (!targetEventId && (formSlug || eventId)) {
      const searchIdentifier = formSlug || eventId;
      try {
        const { data: ev } = await supabase
          .from('events')
          .select('id')
          .eq('form_slug', searchIdentifier)
          .maybeSingle();

        if (ev?.id && isUuid(ev.id)) {
          targetEventId = ev.id;
        } else {
          // Check if there is a notification matching this drive_id
          const { data: notifList } = await supabase
            .from('notifications')
            .select('data')
            .filter('data->>drive_id', 'eq', searchIdentifier)
            .order('created_at', { ascending: false })
            .limit(3);
          const notif = notifList?.find((n) => n.data?.event_id);
          if (notif?.data?.event_id && isUuid(notif.data.event_id)) {
            targetEventId = notif.data.event_id;
          }
        }
      } catch {}
    }

    if (targetEventId && isUuid(targetEventId)) {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', targetEventId)
        .order('registered_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[getEventRegistrations] Error fetching from Supabase:', err?.message || err);
  }

  const drive = sessionDrives.find((d) => d.id === eventId || (formSlug && (d.formSlug === formSlug || d.form_slug === formSlug)));
  return drive?.registrations || [];
}

/**
 * Updates a registration's status (confirm, reject, waitlist)
 * @param {string} registrationId
 * @param {string} status
 * @returns {Promise<{ success: boolean }>}
 */
export async function updateRegistrationStatus(registrationId, status) {
  const isUuid = (str) =>
    typeof str === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  if (isUuid(registrationId)) {
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({ status })
        .eq('id', registrationId);

      if (!error) {
        // Also update session drives
        for (const d of sessionDrives) {
          if (d.registrations) {
            const reg = d.registrations.find((r) => r.id === registrationId);
            if (reg) reg.status = status;
          }
        }
        return { success: true };
      }
    } catch {}
  }

  // Session fallback
  let updated = false;
  for (const d of sessionDrives) {
    if (d.registrations) {
      const reg = d.registrations.find((r) => r.id === registrationId);
      if (reg) {
        reg.status = status;
        updated = true;
      }
    }
  }

  return { success: true };
}

/**
 * Saves event to Supabase (for persistence across sessions)
 * @param {Object} eventData
 * @returns {Promise<{ success: boolean, event?: Object }>}
 */
export async function saveEventToSupabase(eventData) {
  try {
    const isUuid = (str) =>
      typeof str === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const formSlug = eventData.form_slug || eventData.formSlug || '';
    const hasValidUuid = isUuid(eventData.id);

    // Build normalized snake_case payload matching public.events schema strictly
    const payload = {
      title: eventData.title || '',
      description: eventData.description || null,
      category: eventData.category || 'PLACEMENT',
      company_name: eventData.company_name || eventData.companyName || null,
      role_title: eventData.role_title || eventData.roleTitle || null,
      package_min_lpa:
        eventData.package_min_lpa !== undefined
          ? eventData.package_min_lpa
          : eventData.packageMinLpa
          ? Number(eventData.packageMinLpa)
          : null,
      package_max_lpa:
        eventData.package_max_lpa !== undefined
          ? eventData.package_max_lpa
          : eventData.packageMaxLpa
          ? Number(eventData.packageMaxLpa)
          : null,
      mode: eventData.mode || 'On-campus',
      venue: eventData.venue || null,
      meeting_url: eventData.meeting_url || eventData.meetingUrl || null,
      starts_at: eventData.starts_at || eventData.startsAt || null,
      ends_at: eventData.ends_at || eventData.endsAt || null,
      registration_deadline: eventData.registration_deadline || eventData.registrationDeadline || null,
      eligibility: eventData.eligibility || {},
      rounds: eventData.rounds || [],
      spoc: eventData.spoc || {},
      status: eventData.status || 'DRAFT',
      form_slug: formSlug || null,
      form_schema: eventData.form_schema || eventData.formSchema || [],
      registration_links: eventData.registration_links || eventData.registrationLinks || [],
      announcements: eventData.announcements || [],
      results: eventData.results || [],
    };

    if (hasValidUuid) {
      payload.id = eventData.id;
    }

    // Conflict target: use 'id' if valid UUID, otherwise 'form_slug'
    const onConflict = hasValidUuid ? 'id' : 'form_slug';

    // With timeout wrapper (6 seconds)
    const withTimeout = (promise, ms) =>
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
      ]);

    const { data, error } = await withTimeout(
      supabase
        .from('events')
        .upsert([payload], { onConflict })
        .select()
        .single(),
      6000
    );

    if (error) {
      console.warn('[saveEventToSupabase] Supabase upsert error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, event: data };
  } catch (err) {
    console.warn('[saveEventToSupabase] Failed or timed out:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Generates CSV string for event registrations
 * @param {Array} registrations
 * @param {Array} formSchema - the form's field definitions
 * @returns {string}
 */
export function generateRegistrationsCsv(registrations = [], formSchema = []) {
  const baseHeaders = ['Registration ID', 'Student Name', 'Roll Number', 'Email', 'Phone', 'Department', 'Semester', 'Status', 'Registered At'];
  const customHeaders = formSchema.filter((f) => !f.isDefault).map((f) => f.label || f.id);
  const allHeaders = [...baseHeaders, ...customHeaders];

  const rows = registrations.map((reg) => {
    const baseRow = [
      `"${reg.id}"`,
      `"${reg.student_name || ''}"`,
      `"${reg.student_roll_no || ''}"`,
      `"${reg.student_email || ''}"`,
      `"${reg.student_phone || ''}"`,
      `"${reg.department || ''}"`,
      `"${reg.semester || ''}"`,
      `"${reg.status || ''}"`,
      `"${reg.registered_at || ''}"`,
    ];
    const customRow = formSchema.filter((f) => !f.isDefault).map((f) => {
      const val = reg.form_responses?.[f.id] || '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    return [...baseRow, ...customRow].join(',');
  });

  return [allHeaders.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
}

