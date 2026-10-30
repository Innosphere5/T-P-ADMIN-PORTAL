/**
 * Client API Client for Admin Authentication & Multi-Account Management
 * Coordinates with /api/admin/auth/* endpoints
 */

const ACCOUNTS_STORAGE_KEY = 'rimt_admin_accounts';

/**
 * Determines whether two admin/company account objects represent the same identity.
 */
export function isSameAdminAccount(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && String(a.id) === String(b.id)) return true;
  const aEmail = (a.email || '').trim().toLowerCase();
  const bEmail = (b.email || '').trim().toLowerCase();
  if (aEmail && bEmail && aEmail === bEmail) return true;
  const aName = (a.full_name || a.name || '').trim().toLowerCase();
  const bName = (b.full_name || b.name || '').trim().toLowerCase();
  if (aName && bName && aName === bName) return true;
  const aCompany = (a.company_name || '').trim().toLowerCase();
  const bCompany = (b.company_name || '').trim().toLowerCase();
  if (aCompany && bCompany && aCompany === bCompany) return true;
  return false;
}

/**
 * Strictly classifies whether an account is an Institutional Administrator.
 * Hardcoded fixed admins (Raj Kumar, Sagrika) and institutional emails (@rimt.ac.in) are ALWAYS admins.
 */
export function isAdminAccount(acc) {
  if (!acc) return false;
  const name = (acc.full_name || acc.name || '').trim().toLowerCase();
  const email = (acc.email || '').trim().toLowerCase();
  if (name === 'raj kumar' || name === 'sagrika') return true;
  if (email === 'raj.kumar@rimt.ac.in' || email === 'sagrika@rimt.ac.in') return true;
  if (email.endsWith('@rimt.ac.in')) return true;
  if (acc.role === 'ADMIN' || acc.role === 'SUPER_ADMIN') return true;
  return false;
}

/**
 * Strictly classifies whether an account is a Corporate Company Recruiter.
 * Admins are unconditionally excluded.
 */
export function isCompanyAccount(acc) {
  if (!acc) return false;
  if (isAdminAccount(acc)) return false;
  if (acc.role === 'COMPANY') return true;
  if (acc.company_name && typeof acc.company_name === 'string' && acc.company_name.trim().length > 0) return true;
  return false;
}

export function getSavedAccounts() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    let accounts = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          accounts = parsed;
        }
      } catch (e) {}
    }

    if (accounts.length === 0) {
      accounts = [
        {
          id: 'a0000000-0000-0000-0000-000000000001',
          full_name: 'Raj Kumar',
          name: 'Raj Kumar',
          email: 'raj.kumar@rimt.ac.in',
          role: 'ADMIN',
          roleTitle: 'HOD BCA',
          profile_pic_url: 'https://ui-avatars.com/api/?name=Raj+Kumar&background=7A1D27&color=fff&bold=true',
          lastActive: new Date().toISOString(),
        },
      ];
    }

    // Auto-repair & sanitize: immediately strip any accidental company fields from admin records
    let modified = false;
    const sanitized = accounts.map((acc) => {
      if (isAdminAccount(acc)) {
        if (acc.role !== 'ADMIN' || acc.company_name || acc.recruiter_name || acc.roleTitle === 'Corporate Partner' || acc.roleTitle === 'Corporate Recruiter') {
          modified = true;
          const name = acc.full_name || acc.name || 'Raj Kumar';
          return {
            id: acc.id || 'admin-001',
            full_name: name,
            name: name,
            email: acc.email || `${name.toLowerCase().replace(/\s+/g, '.')}@rimt.ac.in`,
            role: 'ADMIN',
            roleTitle: name.toLowerCase().includes('sagrika') ? 'Vice HOD BCA' : 'HOD BCA',
            profile_pic_url: acc.profile_pic_url || (name.toLowerCase().includes('sagrika')
              ? 'https://ui-avatars.com/api/?name=Sagrika&background=1E3A8A&color=fff&bold=true'
              : 'https://ui-avatars.com/api/?name=Raj+Kumar&background=7A1D27&color=fff&bold=true'),
            token: acc.token || null,
            lastActive: acc.lastActive || new Date().toISOString(),
          };
        }
      }
      return acc;
    });

    if (modified) {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch (e) {
    return [];
  }
}

export function saveAccountSession(adminUser, token) {
  if (!adminUser || typeof window === 'undefined') return [];
  try {
    const accounts = getSavedAccounts();
    const filtered = accounts.filter((a) => !isSameAdminAccount(a, adminUser));
    const isCompany = isCompanyAccount(adminUser);
    const fullName = isCompany
      ? (adminUser.company_name || adminUser.recruiter_name || 'Corporate Partner')
      : (adminUser.full_name || adminUser.name || 'Administrator');
    const email = adminUser.email || (fullName ? `${fullName.toLowerCase().replace(/\s+/g, '.')}@rimt.ac.in` : 'admin@rimt.ac.in');
    const existing = accounts.find((a) => isSameAdminAccount(a, adminUser));

    const newEntry = isCompany
      ? {
          id: adminUser.id || existing?.id || `comp-${Date.now()}`,
          company_name: adminUser.company_name || fullName,
          recruiter_name: adminUser.recruiter_name || null,
          full_name: fullName,
          name: fullName,
          email: email,
          role: 'COMPANY',
          roleTitle: 'Corporate Recruiter',
          profile_pic_url: adminUser.logo_url || adminUser.avatar_url || adminUser.profile_pic_url || existing?.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0B4EA2&color=fff&bold=true`,
          avatar_url: adminUser.logo_url || adminUser.avatar_url || adminUser.profile_pic_url || existing?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0B4EA2&color=fff&bold=true`,
          logo_url: adminUser.logo_url || adminUser.avatar_url || null,
          token: token || adminUser.token || existing?.token || null,
          lastActive: new Date().toISOString(),
        }
      : {
          id: adminUser.id || existing?.id || `admin-${Date.now()}`,
          full_name: fullName,
          name: fullName,
          email: email,
          role: 'ADMIN',
          roleTitle: fullName.toLowerCase().includes('sagrika') ? 'Vice HOD BCA' : 'HOD BCA',
          profile_pic_url: adminUser.avatar_url || adminUser.profile_pic_url || existing?.profile_pic_url || (fullName.toLowerCase().includes('sagrika')
            ? 'https://ui-avatars.com/api/?name=Sagrika&background=1E3A8A&color=fff&bold=true'
            : 'https://ui-avatars.com/api/?name=Raj+Kumar&background=7A1D27&color=fff&bold=true'),
          token: token || adminUser.token || existing?.token || null,
          lastActive: new Date().toISOString(),
        };

    const updated = [newEntry, ...filtered];
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save account session:', e);
    return [];
  }
}

export function removeAccountSession(target) {
  if (typeof window === 'undefined' || !target) return [];
  try {
    const accounts = getSavedAccounts();
    const updated = accounts.filter((a) => {
      if (typeof target === 'object') {
        return !isSameAdminAccount(a, target);
      }
      const matchId = String(a.id) === String(target);
      const matchEmail = a.email && a.email.toLowerCase() === String(target).toLowerCase();
      const matchName = (a.full_name || a.name || a.company_name) && (a.full_name || a.name || a.company_name).toLowerCase() === String(target).toLowerCase();
      return !matchId && !matchEmail && !matchName;
    });
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

export async function adminLogin({ name, password, remember_me = false }) {
  const res = await fetch('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password, remember_me }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to authenticate');
  }
  if (data.token) {
    try {
      localStorage.setItem('rimt_admin_token', data.token);
      localStorage.setItem('rimt_admin_user', JSON.stringify(data.admin));
      saveAccountSession(data.admin, data.token);
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }
  return data;
}

export async function adminSignup({ name, email, password, role = 'ADMIN' }) {
  const res = await fetch('/api/admin/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to register administrator');
  }
  if (data.token) {
    try {
      localStorage.setItem('rimt_admin_token', data.token);
      localStorage.setItem('rimt_admin_user', JSON.stringify(data.admin));
      saveAccountSession(data.admin, data.token);
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }
  return data;
}

export async function adminLogout() {
  try {
    const cachedUserStr = typeof window !== 'undefined' ? localStorage.getItem('rimt_admin_user') : null;
    let cachedUser = null;
    try { if (cachedUserStr) cachedUser = JSON.parse(cachedUserStr); } catch (e) {}

    if (cachedUser?.role === 'COMPANY') {
      await fetch('/api/company/auth/logout', { method: 'POST' });
    } else {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    }
  } catch (err) {
    console.warn('Logout API error:', err);
  } finally {
    try {
      localStorage.removeItem('rimt_admin_token');
      localStorage.removeItem('rimt_admin_user');
      localStorage.removeItem('rimt_company_token');
    } catch (e) {}
    try {
      sessionStorage.removeItem('rimt_splash_shown');
    } catch (e) {}
  }
  return true;
}

export async function getAdminMe() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rimt_admin_token') : null;
  const cachedUserStr = typeof window !== 'undefined' ? localStorage.getItem('rimt_admin_user') : null;
  let cachedUser = null;
  try {
    if (cachedUserStr) cachedUser = JSON.parse(cachedUserStr);
  } catch (e) {}

  if (!token) return cachedUser;

  const headers = {
    'Authorization': `Bearer ${token}`,
  };

  // If currently active as Company, verify against company me endpoint
  if (cachedUser?.role === 'COMPANY') {
    try {
      const res = await fetch('/api/company/auth/me', {
        method: 'GET',
        headers,
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(2000) : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.company) {
          try {
            localStorage.setItem('rimt_admin_user', JSON.stringify(data.company));
            if (token) saveAccountSession(data.company, token);
          } catch (e) {}
          return data.company;
        }
      }
    } catch (e) {}
    return cachedUser;
  }

  try {
    const res = await fetch('/api/admin/auth/me', {
      method: 'GET',
      headers,
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(2000) : undefined,
    });

    if (!res.ok) {
      return cachedUser;
    }
    const data = await res.json();
    if (data?.admin) {
      // Identity guard: only update session storage if returned admin matches the client active identity
      if (!cachedUser || isSameAdminAccount(cachedUser, data.admin)) {
        try {
          localStorage.setItem('rimt_admin_user', JSON.stringify(data.admin));
          if (token) {
            saveAccountSession(data.admin, token);
          }
        } catch (e) {}
        return data.admin;
      } else {
        console.warn('Retaining active admin account:', cachedUser.full_name || cachedUser.name);
        return cachedUser;
      }
    }
  } catch (err) {
    return cachedUser;
  }

  return cachedUser;
}

export async function updateAdminProfilePic(fileOrUrl) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rimt_admin_token') : null;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body;
  if (typeof fileOrUrl === 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ profile_pic_url: fileOrUrl });
  } else {
    const formData = new FormData();
    formData.append('file', fileOrUrl);
    body = formData;
  }

  const res = await fetch('/api/admin/auth/profile-pic', {
    method: 'POST',
    headers,
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update profile photo');
  }

  if (data.admin) {
    try {
      localStorage.setItem('rimt_admin_user', JSON.stringify(data.admin));
      if (token) saveAccountSession(data.admin, token);
    } catch (e) {}
  }
  return data;
}

export async function changeAdminPassword({ current_password, new_password }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rimt_admin_token') : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/admin/auth/change-password', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ current_password, new_password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update password');
  }
  return data;
}

/**
 * ====================================================================
 * CORPORATE / COMPANY AUTHENTICATION CLIENT METHODS
 * ====================================================================
 */

export async function companyRegister({ company_name, recruiter_name, email, password, industry, logo_url }) {
  const res = await fetch('/api/company/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_name, recruiter_name, email, password, industry, logo_url }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to register company.');
  }

  if (data.token) {
    try {
      localStorage.setItem('rimt_admin_token', data.token);
      localStorage.setItem('rimt_admin_user', JSON.stringify(data.company));
      saveAccountSession(data.company, data.token);
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }
  return data;
}

export async function companyLogin({ email, password, remember_me = true }) {
  const res = await fetch('/api/company/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember_me }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Corporate sign-in failed.');
  }

  if (data.token) {
    try {
      localStorage.setItem('rimt_admin_token', data.token);
      localStorage.setItem('rimt_admin_user', JSON.stringify(data.company));
      saveAccountSession(data.company, data.token);
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }
  return data;
}

export async function companyGoogleLogin({ email, name, avatar_url, company_name }) {
  const res = await fetch('/api/company/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, avatar_url, company_name }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Google authentication failed.');
  }

  if (data.token) {
    try {
      localStorage.setItem('rimt_admin_token', data.token);
      localStorage.setItem('rimt_admin_user', JSON.stringify(data.company));
      saveAccountSession(data.company, data.token);
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }
  return data;
}

