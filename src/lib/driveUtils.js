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

export const DRIVE_CATEGORIES = [
  { id: 'COMPANY_RECRUITMENT', label: 'Campus Recruitment Drive', icon: 'apartment', description: 'Corporate on/off campus recruitment with CTC & hiring rounds' },
  { id: 'COLLEGE_EVENT', label: 'College Event / Function', icon: 'celebration', description: 'Freshers celebration, annual day, department festivals & cultural showcases' },
  { id: 'COMPETITION', label: 'Department Competition / Hackathon', icon: 'emoji_events', description: 'Coding contests, hackathons, quizzes, project expos & prize challenges' },
  { id: 'WORKSHOP', label: 'Technical Workshop / Seminar', icon: 'school', description: 'Hands-on technical workshops, guest lectures, webinars & certification sessions' },
  { id: 'PLACEMENT_ACTIVITY', label: 'Placement Activity / Bootcamp', icon: 'psychology', description: 'Mock tests, pre-placement talks (PPT), resume audits & training bootcamps' },
];

export function getCategoryMeta(category) {
  switch (category) {
    case 'COLLEGE_EVENT':
      return {
        label: 'College Event / Function',
        icon: 'celebration',
        bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
        isRecruitment: false,
      };
    case 'COMPETITION':
      return {
        label: 'Competition / Hackathon',
        icon: 'emoji_events',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        isRecruitment: false,
      };
    case 'WORKSHOP':
      return {
        label: 'Technical Workshop',
        icon: 'school',
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
        isRecruitment: false,
      };
    case 'PLACEMENT_ACTIVITY':
      return {
        label: 'Placement Activity',
        icon: 'psychology',
        bg: 'bg-purple-50 text-purple-800 border-purple-200/80',
        isRecruitment: false,
      };
    case 'COMPANY_RECRUITMENT':
    default:
      return {
        label: 'Campus Recruitment',
        icon: 'apartment',
        bg: 'bg-surface-container-high text-on-surface-variant border-white/60',
        isRecruitment: true,
      };
  }
}

/**
 * Form validation helper
 * @param {Object} data
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateDriveForm(data) {
  const errors = {};

  if (!data.title || !data.title.trim()) {
    errors.title = 'Drive or Event title is required';
  }

  if (!data.category) {
    errors.category = 'Category is required';
  }

  const isCorporate = data.category === 'COMPANY_RECRUITMENT' || data.category === 'PLACEMENT';
  if (isCorporate && (!data.companyName || !data.companyName.trim())) {
    errors.companyName = 'Company name is required for recruitment drives';
  } else if (!isCorporate && (!data.companyName || !data.companyName.trim())) {
    errors.companyName = 'Organiser / host department or club is required';
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
      errors.registrationDeadline = 'Registration deadline must be on or before start time';
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

// ====================================================================
// EVENT CATEGORY SYSTEM
// ====================================================================

/**
 * Universal event category definitions
 */
export const EVENT_CATEGORIES = [
  { id: 'PLACEMENT', label: 'Placement Drive', icon: 'corporate_fare', color: '#9B1D2C', bg: '#FDE8EB', border: '#F8C4CB' },
  { id: 'CULTURAL', label: 'Cultural Event', icon: 'celebration', color: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD' },
  { id: 'TECHNICAL', label: 'Technical Event', icon: 'terminal', color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  { id: 'WORKSHOP', label: 'Workshop', icon: 'construction', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  { id: 'SEMINAR', label: 'Seminar', icon: 'school', color: '#0D9488', bg: '#CCFBF1', border: '#99F6E4' },
  { id: 'SPORTS', label: 'Sports Event', icon: 'sports_soccer', color: '#16A34A', bg: '#DCFCE7', border: '#86EFAC' },
  { id: 'CUSTOM', label: 'Custom Event', icon: 'tune', color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1' },
];

/**
 * Gets category metadata by category ID
 * @param {string} categoryId
 * @returns {Object}
 */
export function getCategoryMeta(categoryId) {
  return EVENT_CATEGORIES.find((c) => c.id === categoryId) || EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
}

/**
 * Checks if a category is placement-related (shows company/package fields)
 * @param {string} categoryId
 * @returns {boolean}
 */
export function isPlacementCategory(categoryId) {
  return categoryId === 'PLACEMENT';
}

// ====================================================================
// FORM BUILDER UTILITIES
// ====================================================================

/**
 * Available field types for form builder
 */
export const FORM_FIELD_TYPES = [
  { type: 'text', label: 'Short Text', icon: 'short_text', description: 'Single line text input' },
  { type: 'email', label: 'Email', icon: 'mail', description: 'Email address input' },
  { type: 'phone', label: 'Phone', icon: 'call', description: 'Phone number input' },
  { type: 'number', label: 'Number', icon: 'tag', description: 'Numeric input' },
  { type: 'textarea', label: 'Long Text', icon: 'notes', description: 'Multi-line text area' },
  { type: 'select', label: 'Dropdown', icon: 'arrow_drop_down_circle', description: 'Single choice dropdown' },
  { type: 'multi_select', label: 'Multi Select', icon: 'checklist', description: 'Multiple choice checkboxes' },
  { type: 'checkbox', label: 'Checkbox', icon: 'check_box', description: 'Yes/No checkbox' },
  { type: 'date', label: 'Date', icon: 'calendar_today', description: 'Date picker' },
  { type: 'file', label: 'File Upload', icon: 'attach_file', description: 'Upload document/image' },
];

/**
 * Default form fields that are auto-included in every registration form
 */
export const DEFAULT_FORM_FIELDS = [
  { id: 'name', type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true, isDefault: true },
  { id: 'roll_no', type: 'text', label: 'University Roll Number', placeholder: 'e.g. 2203010xxxx', required: true, isDefault: true },
  { id: 'email', type: 'email', label: 'Email Address', placeholder: 'your.email@rimt.ac.in', required: true, isDefault: true },
  { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+91 98765 43210', required: true, isDefault: true },
  { id: 'department', type: 'select', label: 'Department', placeholder: 'Select your department', required: true, isDefault: true, options: ['BCA', 'B.Sc IT', 'B.Sc Cyber Security', 'B.Sc (Hons) AI & ML'] },
  { id: 'semester', type: 'select', label: 'Current Semester', placeholder: 'Select semester', required: true, isDefault: true, options: ['1st Sem', '2nd Sem', '3rd Sem', '4th Sem', '5th Sem', '6th Sem'] },
];

/**
 * Generates a URL-safe slug from event title
 * @param {string} title
 * @returns {string}
 */
export function generateFormSlug(title) {
  const base = (title || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Creates a new custom form field with unique ID
 * @param {string} type
 * @returns {Object}
 */
export function createFormField(type = 'text') {
  const fieldType = FORM_FIELD_TYPES.find((f) => f.type === type) || FORM_FIELD_TYPES[0];
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    type: fieldType.type,
    label: '',
    placeholder: '',
    required: false,
    isDefault: false,
    options: fieldType.type === 'select' || fieldType.type === 'multi_select' ? ['Option 1', 'Option 2'] : undefined,
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

/**
 * Generates CSV string for registered students of a drive or event
 * @param {Array<Object>} registrations
 * @param {Object} drive
 * @returns {string}
 */
export function generateRegistrationsCsv(registrations = [], drive = {}) {
  const headers = [
    'Registration ID',
    'Drive / Event Title',
    'Category',
    'Student Name',
    'Roll Number',
    'Department',
    'Semester',
    'CGPA',
    'Email Address',
    'Contact Number',
    'Registration Source',
    'Application Status',
    'Registered Date & Time (IST)',
  ];

  const rows = registrations.map((r) => [
    escapeCsv(r.id),
    escapeCsv(drive.title || r.drive_title || '—'),
    escapeCsv(drive.category || '—'),
    escapeCsv(r.student_name || r.name || '—'),
    escapeCsv(r.roll_no || r.roll_number || '—'),
    escapeCsv(r.department || '—'),
    escapeCsv(r.semester || '—'),
    escapeCsv(r.cgpa ?? '—'),
    escapeCsv(r.email || '—'),
    escapeCsv(r.phone || '—'),
    escapeCsv(r.registration_source || 'mobile_app'),
    escapeCsv(r.status || 'REGISTERED'),
    escapeCsv(formatDateTime(r.registered_at || r.createdAt)),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

