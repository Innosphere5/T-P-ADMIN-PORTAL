/**
 * driveClient.js — Client-side service layer for Drive Management
 * Adheres strictly to ADMIN.md & drive.md (§8.3 Handling a missing backend):
 * - Does not invent dummy data or fake database writes
 * - Detects 404/501/missing endpoints and honestly reports 'NOT_CONNECTED'
 * - Manages in-memory session drives so administrators can test, preview,
 *   draft, and export drives without false persistence claims
 * - Integrates with real approved students endpoint: GET /api/admin/requests?status=ALL
 */

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
