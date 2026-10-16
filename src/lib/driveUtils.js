/**
 * driveUtils.js — Pure utility functions for Drive Management module
 * Complies with ADMIN.md & drive.md specification:
 * - Pure functions with zero side effects
 * - Honest status derivation (no invented values)
 * - Safe CSV escaping
 * - Schedule difference calculator for announcements
 */

/**
 * Derives the active lifecycle/temporal badge for a drive.
 * @param {Object} drive
 * @returns {{ key: string, label: string, type: 'upcoming' | 'ongoing' | 'completed' | 'draft' | 'cancelled' }}
 */
export function deriveDriveStatus(drive) {
  if (!drive) return { key: 'unknown', label: '—', type: 'draft' };

  if (drive.status === 'DRAFT') {
    return { key: 'draft', label: 'Draft', type: 'draft' };
  }
  if (drive.status === 'CANCELLED') {
    return { key: 'cancelled', label: 'Cancelled', type: 'cancelled' };
  }
  if (drive.status === 'COMPLETED') {
    return { key: 'completed', label: 'Completed', type: 'completed' };
  }

  const now = new Date();
  const startsAt = drive.startsAt ? new Date(drive.startsAt) : null;
  const endsAt = drive.endsAt ? new Date(drive.endsAt) : null;
  const deadline = drive.registrationDeadline ? new Date(drive.registrationDeadline) : null;

  // Has results published
  if (drive.results && drive.results.some((r) => r.students && r.students.length > 0)) {
    const hasFinalOffers = drive.results.some(
      (r) => (r.stage === 'Final Selected / Offer' || r.stage === 'Offer') && r.students.length > 0
    );
    if (hasFinalOffers) {
      return { key: 'offer_rollout', label: 'Offer Rollout Phase', type: 'completed' };
    }
  }

  // Active / Ongoing check
  if (startsAt && endsAt) {
    if (now >= startsAt && now <= endsAt) {
      return { key: 'ongoing', label: 'In Progress', type: 'ongoing' };
    }
    if (now > endsAt) {
      return { key: 'completed', label: 'Completed', type: 'completed' };
    }
  } else if (startsAt && now >= startsAt) {
    return { key: 'ongoing', label: 'In Progress', type: 'ongoing' };
  }

  // Registration open check
  if (deadline && now <= deadline) {
    return { key: 'registration_open', label: 'Registration Open', type: 'upcoming' };
  }
  if (deadline && now > deadline && (!startsAt || now < startsAt)) {
    return { key: 'registration_closed', label: 'Registration Closed', type: 'upcoming' };
  }

  return { key: 'upcoming', label: 'Upcoming', type: 'upcoming' };
}

/**
 * Derives registration link status
 * @param {Object} link
 * @returns {'DISABLED' | 'OPEN' | 'UPCOMING' | 'CLOSED'}
 */
export function deriveRegistrationLinkStatus(link) {
  if (!link || link.enabled === false) return 'DISABLED';
  const now = new Date();
  if (link.opensAt && new Date(link.opensAt) > now) return 'UPCOMING';
  if (link.closesAt && new Date(link.closesAt) < now) return 'CLOSED';
  return 'OPEN';
}

/**
 * Package tier computation based on Placement Statistics benchmarks
 * @param {number|null} maxLpa
 * @returns {{ tier: string, badgeStyle: string, label: string } | null}
 */
export function derivePackageTier(maxLpa) {
  if (maxLpa === null || maxLpa === undefined || isNaN(maxLpa) || maxLpa <= 0) {
    return null;
  }
  const lpa = Number(maxLpa);
  if (lpa >= 15.0) {
    return {
      tier: 'SUPER_DREAM',
      label: 'Super Dream (≥15 LPA)',
      badgeStyle: 'bg-tint-maroon text-primary font-bold border border-rose-200/80 shadow-xs',
    };
  }
  if (lpa >= 10.0) {
    return {
      tier: 'DREAM',
      label: 'Dream Tier (≥10 LPA)',
      badgeStyle: 'bg-tint-green text-success-green font-bold border border-emerald-200/80 shadow-xs',
    };
  }
  if (lpa >= 6.0) {
    return {
      tier: 'STANDARD_1',
      label: 'Standard Tier (≥6 LPA)',
      badgeStyle: 'bg-tint-blue text-info-blue font-bold border border-blue-200/80 shadow-xs',
    };
  }
  return {
    tier: 'ENTRY',
    label: 'Entry Tier',
    badgeStyle: 'bg-surface-container text-text-secondary font-semibold border border-white/60 shadow-xs',
  };
}

/**
 * Formats date and time string with IST suffix
 * @param {string|Date} dateVal
 * @param {boolean} includeTime
 * @returns {string}
 */
export function formatDateTime(dateVal, includeTime = true) {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';

    const dateStr = d.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!includeTime) return dateStr;

    const timeStr = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateStr} • ${timeStr} IST`;
  } catch {
    return '—';
  }
}

/**
 * Formats a short date
 * @param {string|Date} dateVal
 * @returns {string}
 */
export function formatShortDate(dateVal) {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

/**
 * Formats CTC range
 * @param {number|null} min
 * @param {number|null} max
 * @returns {string}
 */
export function formatCtcRange(min, max) {
  if (!min && !max) return '—';
  if (min && max && min === max) return `₹${min} LPA`;
  if (min && max) return `₹${min} – ₹${max} LPA`;
  if (min) return `From ₹${min} LPA`;
  if (max) return `Up to ₹${max} LPA`;
  return '—';
}

/**
 * Compares old drive and new drive to produce a schedule difference report
 * Useful for the Schedule Change announcement helper (Requirement C2)
 * @param {Object} oldDrive
 * @param {Object} newDrive
 * @returns {Array<{ field: string, oldVal: string, newVal: string }>}
 */
export function computeScheduleDiff(oldDrive, newDrive) {
  if (!oldDrive || !newDrive) return [];
  const diffs = [];

  if (oldDrive.startsAt !== newDrive.startsAt) {
    diffs.push({
      field: 'Drive Start Time',
      oldVal: formatDateTime(oldDrive.startsAt),
      newVal: formatDateTime(newDrive.startsAt),
    });
  }
  if (oldDrive.endsAt !== newDrive.endsAt) {
    diffs.push({
      field: 'Drive Concluding Time',
      oldVal: formatDateTime(oldDrive.endsAt),
      newVal: formatDateTime(newDrive.endsAt),
    });
  }
  if (oldDrive.registrationDeadline !== newDrive.registrationDeadline) {
    diffs.push({
      field: 'Registration Deadline',
      oldVal: formatDateTime(oldDrive.registrationDeadline),
      newVal: formatDateTime(newDrive.registrationDeadline),
    });
  }
  if ((oldDrive.venue || '') !== (newDrive.venue || '')) {
    diffs.push({
      field: 'Venue / Location',
      oldVal: oldDrive.venue || '—',
      newVal: newDrive.venue || '—',
    });
  }
  if ((oldDrive.mode || '') !== (newDrive.mode || '')) {
    diffs.push({
      field: 'Conducting Mode',
      oldVal: oldDrive.mode || '—',
      newVal: newDrive.mode || '—',
    });
  }
  return diffs;
}

/**
 * Form validation helper
 * @param {Object} data
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateDriveForm(data) {
  const errors = {};

  if (!data.title || !data.title.trim()) {
    errors.title = 'Drive title is required';
  }

  if (!data.category) {
    errors.category = 'Drive category is required';
  }

  if (data.category === 'COMPANY_RECRUITMENT' && (!data.companyName || !data.companyName.trim())) {
    errors.companyName = 'Company name is required for recruitment drives';
  }

  if (!data.mode) {
    errors.mode = 'Execution mode is required';
  }

  if (data.startsAt && data.endsAt) {
    const start = new Date(data.startsAt);
    const end = new Date(data.endsAt);
    if (end < start) {
      errors.endsAt = 'Concluding time must be after start time';
    }
  }

  if (data.startsAt && data.registrationDeadline) {
    const start = new Date(data.startsAt);
    const deadline = new Date(data.registrationDeadline);
    if (deadline > start) {
      errors.registrationDeadline = 'Registration deadline must be on or before drive start';
    }
  }

  if (data.packageMinLpa !== undefined && data.packageMinLpa !== '' && data.packageMinLpa !== null) {
    const min = Number(data.packageMinLpa);
    if (isNaN(min) || min < 0) {
      errors.packageMinLpa = 'Minimum CTC must be a positive number';
    }
  }

  if (data.packageMaxLpa !== undefined && data.packageMaxLpa !== '' && data.packageMaxLpa !== null) {
    const max = Number(data.packageMaxLpa);
    if (isNaN(max) || max < 0) {
      errors.packageMaxLpa = 'Maximum CTC must be a positive number';
    }
    const min = Number(data.packageMinLpa);
    if (!isNaN(min) && !isNaN(max) && max < min) {
      errors.packageMaxLpa = 'Maximum CTC cannot be lower than minimum CTC';
    }
  }

  if (data.minCgpa !== undefined && data.minCgpa !== '' && data.minCgpa !== null) {
    const cgpa = Number(data.minCgpa);
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10.0) {
      errors.minCgpa = 'Cutoff CGPA must be between 0.00 and 10.00';
    }
  }

  if (data.maxBacklogs !== undefined && data.maxBacklogs !== '' && data.maxBacklogs !== null) {
    const bl = Number(data.maxBacklogs);
    if (isNaN(bl) || bl < 0 || !Number.isInteger(bl)) {
      errors.maxBacklogs = 'Maximum backlogs must be a non-negative integer';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Escapes CSV values safely
 * @param {any} val
 * @returns {string}
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates CSV string for a list of drives
 * @param {Array<Object>} drives
 * @returns {string}
 */
export function generateDrivesCsv(drives = []) {
  const headers = [
    'Drive ID',
    'Title',
    'Category',
    'Company / Organisation',
    'Role',
    'Status',
    'Mode',
    'Venue / Link',
    'Start Date (IST)',
    'End Date (IST)',
    'Registration Deadline',
    'Min CTC (LPA)',
    'Max CTC (LPA)',
    'Eligible Departments',
    'Min CGPA',
    'Max Backlogs',
    'SPOC Name',
    'SPOC Email',
    'SPOC Phone',
    'Active Registration Links',
    'Total Announcements',
  ];

  const rows = drives.map((d) => [
    escapeCsv(d.id),
    escapeCsv(d.title),
    escapeCsv(d.category),
    escapeCsv(d.companyName || '—'),
    escapeCsv(d.roleTitle || '—'),
    escapeCsv(deriveDriveStatus(d).label),
    escapeCsv(d.mode || '—'),
    escapeCsv(d.venue || d.meetingUrl || '—'),
    escapeCsv(formatDateTime(d.startsAt)),
    escapeCsv(formatDateTime(d.endsAt)),
    escapeCsv(formatDateTime(d.registrationDeadline)),
    escapeCsv(d.packageMinLpa !== null && d.packageMinLpa !== undefined ? d.packageMinLpa : '—'),
    escapeCsv(d.packageMaxLpa !== null && d.packageMaxLpa !== undefined ? d.packageMaxLpa : '—'),
    escapeCsv((d.eligibility?.departments || []).join(', ') || 'All Departments'),
    escapeCsv(d.eligibility?.minCgpa ?? '—'),
    escapeCsv(d.eligibility?.maxBacklogs ?? '—'),
    escapeCsv(d.spoc?.name || '—'),
    escapeCsv(d.spoc?.email || '—'),
    escapeCsv(d.spoc?.phone || '—'),
    escapeCsv((d.registrationLinks || []).length),
    escapeCsv((d.announcements || []).length),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Generates CSV string for drive results
 * @param {Object} drive
 * @param {string} [stageFilter]
 * @returns {string}
 */
export function generateResultsCsv(drive, stageFilter = null) {
  const headers = ['Drive Title', 'Company', 'Result Stage', 'Student Name', 'Roll Number', 'Published At (IST)'];

  const rows = [];
  const results = drive?.results || [];

  for (const res of results) {
    if (stageFilter && res.stage !== stageFilter) continue;
    const students = res.students || [];
    for (const st of students) {
      rows.push([
        escapeCsv(drive.title),
        escapeCsv(drive.companyName || '—'),
        escapeCsv(res.stage),
        escapeCsv(st.name || st.full_name || '—'),
        escapeCsv(st.roll_no || st.roll_number || '—'),
        escapeCsv(formatDateTime(res.publishedAt)),
      ]);
    }
  }

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}
