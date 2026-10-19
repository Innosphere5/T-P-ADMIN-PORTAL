/**
 * Shared validation logic for Internship Opportunities
 * Used across client forms and server-side API route handlers.
 */

export const VALID_SEASONS = ['winter', 'summer', 'spring', 'autumn', 'any'];
export const VALID_COMPENSATION_TYPES = ['stipend', 'non_stipend', 'paid'];
export const VALID_WORK_MODES = ['onsite', 'remote', 'hybrid'];
export const VALID_STATUSES = ['draft', 'open', 'closed', 'filled'];
export const VALID_DEPARTMENTS = [
  'BCA',
  'B.Sc IT',
  'B.Sc Cyber Security',
  'B.Sc (Hons) AI & ML',
];

/**
 * Normalizes an array of skill tags:
 * Trims whitespace, removes empty values, and deduplicates case-insensitively while preserving first casing.
 */
export function normalizeSkills(skills) {
  if (!Array.isArray(skills)) {
    if (typeof skills === 'string') {
      skills = skills.split(',').map((s) => s.trim());
    } else {
      return [];
    }
  }

  const seen = new Set();
  const normalized = [];

  for (const item of skills) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      normalized.push(trimmed);
    }
  }

  return normalized;
}

/**
 * Validates an opportunity payload.
 * Returns { valid: boolean, errors: Record<string, string>, sanitized: Object }
 */
export function validateInternshipOpportunity(data, { isPartial = false } = {}) {
  const errors = {};
  const sanitized = {};

  // Company Name
  if (!isPartial || data.company_name !== undefined) {
    if (!data.company_name || typeof data.company_name !== 'string' || !data.company_name.trim()) {
      errors.company_name = 'Company name is required';
    } else {
      sanitized.company_name = data.company_name.trim();
    }
  }

  // Company ID (optional TEXT, links to companies.id)
  if (data.company_id !== undefined) {
    sanitized.company_id = data.company_id ? String(data.company_id).trim() : null;
  }

  // Title / Role
  if (!isPartial || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      errors.title = 'Title / Role is required';
    } else {
      sanitized.title = data.title.trim();
    }
  }

  // Description
  if (data.description !== undefined) {
    sanitized.description = data.description ? String(data.description).trim() : null;
  }

  // Required Skills (supports required_skills and skills_required)
  const rawSkills = data.required_skills !== undefined ? data.required_skills : data.skills_required;
  if (!isPartial || rawSkills !== undefined) {
    const skills = normalizeSkills(rawSkills);
    if (!skills || skills.length === 0) {
      errors.required_skills = 'At least one required skill must be specified';
    } else {
      sanitized.required_skills = skills;
      sanitized.skills_required = skills;
    }
  }

  // Eligible Departments (supports eligible_departments, departments, and department)
  const rawDepts = data.eligible_departments !== undefined 
    ? data.eligible_departments 
    : (data.departments !== undefined ? data.departments : data.department);
  if (rawDepts !== undefined) {
    if (Array.isArray(rawDepts)) {
      sanitized.eligible_departments = rawDepts.filter((dept) =>
        VALID_DEPARTMENTS.includes(dept)
      );
    } else if (typeof rawDepts === 'string' && VALID_DEPARTMENTS.includes(rawDepts)) {
      sanitized.eligible_departments = [rawDepts];
    } else {
      sanitized.eligible_departments = [];
    }
    sanitized.department = sanitized.eligible_departments;
  } else if (!isPartial) {
    sanitized.eligible_departments = [];
  }

  // Duration Months (1 to 24)
  if (!isPartial || data.duration_months !== undefined) {
    const duration = Number(data.duration_months);
    if (!Number.isInteger(duration) || duration < 1 || duration > 24) {
      errors.duration_months = 'Duration must be an integer between 1 and 24 months';
    } else {
      sanitized.duration_months = duration;
    }
  }

  // Season
  if (!isPartial || data.season !== undefined) {
    const season = (data.season || 'any').toLowerCase().trim();
    if (!VALID_SEASONS.includes(season)) {
      errors.season = `Season must be one of: ${VALID_SEASONS.join(', ')}`;
    } else {
      sanitized.season = season;
    }
  }

  // Compensation Model
  if (!isPartial || data.compensation_type !== undefined) {
    const compType = (data.compensation_type || '').toLowerCase().trim();
    if (!VALID_COMPENSATION_TYPES.includes(compType)) {
      errors.compensation_type = `Compensation type must be one of: ${VALID_COMPENSATION_TYPES.join(', ')}`;
    } else {
      sanitized.compensation_type = compType;

      const stipendAmount = data.stipend_amount !== undefined && data.stipend_amount !== null && data.stipend_amount !== ''
        ? Number(data.stipend_amount)
        : null;
      const feeAmount = data.fee_amount !== undefined && data.fee_amount !== null && data.fee_amount !== ''
        ? Number(data.fee_amount)
        : null;

      if (compType === 'stipend') {
        if (stipendAmount === null || isNaN(stipendAmount) || stipendAmount <= 0) {
          errors.stipend_amount = 'Monthly stipend amount must be greater than 0';
        } else {
          sanitized.stipend_amount = stipendAmount;
        }
        if (feeAmount !== null && feeAmount !== undefined) {
          errors.fee_amount = 'Fee amount must not be set for stipend compensation';
        } else {
          sanitized.fee_amount = null;
        }
      } else if (compType === 'paid') {
        if (feeAmount === null || isNaN(feeAmount) || feeAmount <= 0) {
          errors.fee_amount = 'Program fee amount paid by student must be greater than 0';
        } else {
          sanitized.fee_amount = feeAmount;
        }
        if (stipendAmount !== null && stipendAmount !== undefined) {
          errors.stipend_amount = 'Stipend amount must not be set for paid (student-fee) compensation';
        } else {
          sanitized.stipend_amount = null;
        }
      } else if (compType === 'non_stipend') {
        if (stipendAmount !== null && stipendAmount !== undefined) {
          errors.stipend_amount = 'Stipend amount must not be set for non-stipend compensation';
        } else {
          sanitized.stipend_amount = null;
        }
        if (feeAmount !== null && feeAmount !== undefined) {
          errors.fee_amount = 'Fee amount must not be set for non-stipend compensation';
        } else {
          sanitized.fee_amount = null;
        }
      }
    }
  }

  // Work Mode
  if (!isPartial || data.work_mode !== undefined) {
    const workMode = (data.work_mode || 'onsite').toLowerCase().trim();
    if (!VALID_WORK_MODES.includes(workMode)) {
      errors.work_mode = `Work mode must be one of: ${VALID_WORK_MODES.join(', ')}`;
    } else {
      sanitized.work_mode = workMode;
    }
  }

  // Location
  if (data.location !== undefined) {
    sanitized.location = data.location ? String(data.location).trim() : null;
  }

  // Seats
  if (data.seats !== undefined && data.seats !== null && data.seats !== '') {
    const seats = Number(data.seats);
    if (!Number.isInteger(seats) || seats <= 0) {
      errors.seats = 'Seats must be a positive integer';
    } else {
      sanitized.seats = seats;
    }
  } else if (!isPartial) {
    sanitized.seats = null;
  }

  // Dates
  if (data.application_deadline !== undefined) {
    sanitized.application_deadline = data.application_deadline ? String(data.application_deadline).trim() : null;
  }
  if (data.start_date !== undefined) {
    sanitized.start_date = data.start_date ? String(data.start_date).trim() : null;
  }
  if (data.end_date !== undefined) {
    sanitized.end_date = data.end_date ? String(data.end_date).trim() : null;
  }

  const startDate = sanitized.start_date || (isPartial ? data.start_date : null);
  const endDate = sanitized.end_date || (isPartial ? data.end_date : null);
  if (startDate && endDate) {
    if (new Date(endDate) < new Date(startDate)) {
      errors.end_date = 'End date cannot precede start date';
    }
  }

  // Status
  if (!isPartial || data.status !== undefined) {
    const status = (data.status || 'draft').toLowerCase().trim();
    if (!VALID_STATUSES.includes(status)) {
      errors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}`;
    } else {
      sanitized.status = status;
    }
  }

  // Visibility
  if (data.is_visible !== undefined) {
    sanitized.is_visible = Boolean(data.is_visible);
  } else if (!isPartial) {
    sanitized.is_visible = true;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}
