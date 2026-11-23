/**
 * Auth Context and Error Mapping Helpers
 * Implements Section 7 of DRIVE_MANAGEMENT_AGENT.md
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../supabaseClient.js';
import { verifyToken } from '../auth.js';
import { extractToken } from '../middleware.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pwghazyfxhypzkadqfnn.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || 'sb_publishable_i_u2xeBeomYmIqQ2XhD66Q_jD0bb4XN';

export const ERROR_CODES = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  SCHEMA_INCOMPATIBLE: 409,
  ALREADY_REGISTERED: 409,
  REGISTRATION_CLOSED: 403,
  NOT_ELIGIBLE: 403,
  DRIVE_FULL: 409,
  HAS_REGISTRATIONS: 409,
  RATE_LIMITED: 429,
};

export function apiSuccess(data, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(code, message, details = null) {
  const httpStatus = ERROR_CODES[code] || 500;
  return NextResponse.json(
    {
      error: {
        code,
        message: message || code,
        ...(details ? { details } : {}),
      },
    },
    { status: httpStatus }
  );
}

/**
 * Maps Postgres raise exception messages to standard API error responses
 */
export function mapDatabaseError(err) {
  const msg = err?.message || '';

  if (msg.includes('FORBIDDEN')) return apiError('FORBIDDEN', 'Administrative privileges required');
  if (msg.includes('NOT_FOUND')) return apiError('NOT_FOUND', 'Drive not found or inaccessible');
  if (msg.includes('DRIVE_CLOSED')) return apiError('REGISTRATION_CLOSED', 'This drive is closed');
  if (msg.includes('NOT_A_STUDENT')) return apiError('FORBIDDEN', 'Valid student profile required to register');
  if (msg.includes('REGISTRATION_CLOSED')) return apiError('REGISTRATION_CLOSED', 'Registration is closed or deadline has passed');
  if (msg.includes('NOT_ELIGIBLE')) return apiError('NOT_ELIGIBLE', 'You do not meet the department or year eligibility criteria');
  if (msg.includes('DRIVE_FULL')) return apiError('DRIVE_FULL', 'Drive capacity limit has been reached');
  if (msg.includes('ALREADY_REGISTERED') || msg.includes('unique_violation')) {
    return apiError('ALREADY_REGISTERED', 'You are already registered for this drive');
  }

  return apiError('INTERNAL_ERROR', err?.message || 'An unexpected database error occurred');
}

/**
 * Builds the authentication context from request headers/cookies
 */
export async function getAuthContext(req) {
  const token = extractToken(req);
  let client = defaultSupabase;
  let user = null;
  let isAdmin = false;
  let studentId = null;

  if (token) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Check custom JWT first
    const payload = await verifyToken(token);
    if (payload) {
      user = payload;
      if (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN') {
        isAdmin = true;
      }
      if (payload.id || payload.studentId) {
        studentId = payload.studentId || payload.id;
      }
    } else {
      // Check Supabase Auth user
      const { data: supaUser } = await client.auth.getUser();
      if (supaUser?.user) {
        user = supaUser.user;
        const role = user.app_metadata?.role || user.user_metadata?.role;
        if (role === 'admin') isAdmin = true;
        studentId = user.id;
      }
    }
  }

  // Also verify admin via DB helper if not already resolved
  if (!isAdmin && user) {
    try {
      const { data: isAdm } = await client.rpc('is_admin');
      if (isAdm === true) isAdmin = true;
    } catch (_) {}
  }

  return {
    supabase: client,
    user,
    isAdmin,
    studentId,
  };
}

export function requireAdmin(auth) {
  if (!auth.user) {
    throw new Error('UNAUTHENTICATED');
  }
  if (!auth.isAdmin) {
    throw new Error('FORBIDDEN');
  }
}

export function requireStudent(auth) {
  if (!auth.user && !auth.studentId) {
    throw new Error('UNAUTHENTICATED');
  }
}
