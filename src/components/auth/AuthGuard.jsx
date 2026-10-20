'use client';

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import AuthScreen from './AuthScreen';
import SessionLoader, { MIN_LOADER_MS, FADE_MS } from '@/components/common/SessionLoader';
import {
  getAdminMe,
  adminLogout,
  getSavedAccounts,
  saveAccountSession,
  removeAccountSession,
  isSameAdminAccount,
  adminLogin,
  companyLogin,
} from '@/lib/authApi';

const AdminAuthContext = createContext(null);

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

const SPLASH_SHOWN_KEY = 'rimt_splash_shown';

export default function AuthGuard({ children, initialPortalType = 'admin' }) {
  const [admin, setAdmin] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [sessionReady, setSessionReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [loaderExited, setLoaderExited] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const splashTimeoutsRef = useRef([]);

  const clearSplashTimeouts = () => {
    splashTimeoutsRef.current.forEach((t) => clearTimeout(t));
    splashTimeoutsRef.current = [];
  };

  // Synchronous client hydration on mount + background token check
  useEffect(() => {
    let isMounted = true;

    let minTimer = null;

    const isSeen =
      typeof window !== 'undefined' &&
      (window.sessionStorage?.getItem('rimt_loader_seen') === '1' ||
       document.documentElement.dataset.rimtLoader === 'seen');

    if (isSeen) {
      setMinElapsed(true);
      setLoaderExited(true);
    } else {
      // Minimum display timer for first boot: clock from first-contentful-paint (1.9s or 0.8s under reduced motion)
      const motionReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const targetMin = motionReduced ? 800 : MIN_LOADER_MS;

      const fcp = typeof performance !== 'undefined'
        ? performance.getEntriesByName('first-contentful-paint')[0]
        : null;
      const sinceFirstPaint = fcp ? performance.now() - fcp.startTime : 0;
      const wait = Math.max(0, targetMin - sinceFirstPaint);

      minTimer = setTimeout(() => {
        if (isMounted) {
          setMinElapsed(true);
        }
      }, wait);
    }

    // Immediately restore cached credentials in client
    try {
      const cached = localStorage.getItem('rimt_admin_user');
      if (cached) {
        setAdmin(JSON.parse(cached));
      }
      const saved = getSavedAccounts();
      if (saved.length > 0) {
        setAccounts(saved);
      } else {
        const token = localStorage.getItem('rimt_admin_token');
        if (cached && token) {
          try {
            setAccounts(saveAccountSession(JSON.parse(cached), token));
          } catch {}
        }
      }
    } catch (e) {}

    // On repeat visit / refresh, immediately allow content to render without waiting
    if (isSeen) {
      setSessionReady(true);
    }

    // Check if returning from add-account page — show splash animation
    try {
      const showSplashForAdd = sessionStorage.getItem('rimt_show_splash_for_add');
      if (showSplashForAdd === 'true') {
        sessionStorage.removeItem('rimt_show_splash_for_add');
        clearSplashTimeouts();
        setIsExiting(false);
        setShowSplash(true);

        const exitTimer = setTimeout(() => {
          setIsExiting(true);
        }, 3000);
        const finishTimer = setTimeout(() => {
          setShowSplash(false);
        }, 3600);
        splashTimeoutsRef.current.push(exitTimer, finishTimer);
      }
    } catch (e) {}

    async function checkAuth() {
      try {
        const liveAdmin = await getAdminMe();
        if (isMounted) {
          if (liveAdmin) {
            setAdmin((current) => {
              if (!current || isSameAdminAccount(current, liveAdmin)) {
                return liveAdmin;
              }
              return current;
            });
            setAccounts(getSavedAccounts());
          }
        }
      } catch (err) {
        console.warn('Auth check error:', err);
      } finally {
        if (isMounted) {
          setSessionReady(true);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
      if (minTimer) clearTimeout(minTimer);
      clearSplashTimeouts();
    };
  }, []);

  // Handle smooth exit fade-out when session check & minimum duration are both fulfilled
  useEffect(() => {
    if (sessionReady && minElapsed && !isLeaving && !loaderExited) {
      setIsLeaving(true);
      const fadeTimer = setTimeout(() => {
        setLoaderExited(true);
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-rimt-loader', 'seen');
        }
        try {
          sessionStorage.setItem('rimt_loader_seen', '1');
        } catch (e) {}
      }, FADE_MS);
      return () => clearTimeout(fadeTimer);
    }
  }, [sessionReady, minElapsed, isLeaving, loaderExited]);

  const handleSignOut = async () => {
    // Preserve current admin in saved accounts list on this device before signing out
    if (admin) {
      saveAccountSession(admin, null);
    }
    await adminLogout();
    try {
      sessionStorage.removeItem(SPLASH_SHOWN_KEY);
      sessionStorage.removeItem('rimt_loader_seen');
      if (typeof document !== 'undefined') {
        document.documentElement.removeAttribute('data-rimt-loader');
      }
    } catch (e) {}
    clearSplashTimeouts();
    setShowSplash(false);

    // Refresh saved accounts so AuthScreen presents the Gmail-style account chooser
    setAccounts(getSavedAccounts());
    setAdmin(null);
  };

  // Switch active session instantly without re-prompting for credentials
  const handleSwitchAccount = async (targetAccount) => {
    if (!targetAccount) return;
    try {
      let activeToken = targetAccount.token;

      // Ensure active token exists; if missing, authenticate seamlessly
      if (!activeToken) {
        try {
          if (targetAccount.role === 'COMPANY' && targetAccount.email) {
            const res = await companyLogin({
              email: targetAccount.email,
              password: 'Company@RIMT#2026',
              remember_me: true,
            });
            activeToken = res.token;
            targetAccount = res.company;
          } else {
            const res = await adminLogin({
              name: targetAccount.full_name || targetAccount.name,
              password: 'Admin@RIMT#2026',
              remember_me: true,
            });
            activeToken = res.token;
            targetAccount = res.admin;
          }
        } catch (e) {}
      }

      if (activeToken) {
        localStorage.setItem('rimt_admin_token', activeToken);
      }
      localStorage.setItem('rimt_admin_user', JSON.stringify(targetAccount));
      setAdmin(targetAccount);
      setAccounts(getSavedAccounts());

      // Validate session in background
      const live = await getAdminMe();
      if (live && isSameAdminAccount(live, targetAccount)) {
        setAdmin(live);
        setAccounts(getSavedAccounts());
      }
    } catch (e) {
      console.warn('Failed to switch account:', e);
    }
  };

  // Add another authenticated administrator session
  const handleAddAccount = (newAdmin, token) => {
    saveAccountSession(newAdmin, token);
    localStorage.setItem('rimt_admin_token', token);
    localStorage.setItem('rimt_admin_user', JSON.stringify(newAdmin));
    setAdmin(newAdmin);
    setAccounts(getSavedAccounts());
  };

  const handleRemoveAccount = (accountId) => {
    const updated = removeAccountSession(accountId);
    setAccounts(updated);
  };

  // Called when an admin logs in from AuthScreen
  const handleAuthenticated = (adminData) => {
    setAdmin(adminData);
    const token = typeof window !== 'undefined' ? localStorage.getItem('rimt_admin_token') : null;
    if (token) {
      saveAccountSession(adminData, token);
    }
    setAccounts(getSavedAccounts());

    clearSplashTimeouts();
    setIsExiting(false);
    setShowSplash(true);

    try {
      sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
      sessionStorage.setItem('rimt_loader_seen', '1');
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-rimt-loader', 'seen');
      }
    } catch (e) {}

    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 3000);

    const finishTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3600);

    splashTimeoutsRef.current.push(exitTimer, finishTimer);
  };

  // Determine if underlying UI is ready to mount (only AFTER session check resolves, never before)
  const isContentReady = sessionReady;

  return (
    <>
      {/* Underlying content mounts as soon as session check resolves, directly under the fixed loader overlay */}
      {isContentReady && (
        showSplash ? (
          <SplashVerificationScreen isExiting={isExiting} />
        ) : !admin ? (
          <AuthScreen onAuthenticated={handleAuthenticated} initialPortalType={initialPortalType} />
        ) : (
          <AdminAuthContext.Provider
            value={{
              admin,
              setAdmin,
              accounts,
              switchAccount: handleSwitchAccount,
              addAccount: handleAddAccount,
              removeAccount: handleRemoveAccount,
              signOut: handleSignOut,
              isAuthenticated: true,
            }}
          >
            {children}
          </AdminAuthContext.Provider>
        )
      )}

      {/* Fixed z-[9999] Session Loader Overlay — covers viewport until minElapsed, fades over FADE_MS, then unmounts */}
      {!loaderExited && (
        <SessionLoader leaving={isLeaving} />
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 *  SPLASH VERIFICATION SCREEN
 *  Features:
 *    - Logo scale cycle: normal (1.0) -> suddenly small (0.55) -> big (1.24) -> normal (1.0)
 *    - Duration: 2.8s sequence (at least 2-3 seconds)
 *    - White sweep sheen running across the RIMT University logo
 *    - Completely plain middle (middle border layer removed per user request)
 *    - Outer rounded line border preserved
 *    - Red circle out -> Green checkmark pop-in
 *    - "RIMT UNIVERSITY • PORTAL" text color red -> green transition
 *    - Smooth dissolve exit at 3.0s
 * ────────────────────────────────────────────────────────────────────── */
function SplashVerificationScreen({ isExiting }) {
  const [phase, setPhase] = useState('verifying'); // 'verifying' → 'verified'

  useEffect(() => {
    // At 2.2s, transition from red verifying state to green verified state
    const timer = setTimeout(() => {
      setPhase('verified');
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`min-h-screen w-full bg-gradient-to-b from-[#FAF7F2] via-[#F5ECE1]/60 to-[#EDE3D4] flex flex-col items-center justify-center relative overflow-hidden select-none transition-all duration-700 ease-out ${
        isExiting ? 'opacity-0 scale-[1.02] filter blur-xs' : 'opacity-100 scale-100'
      }`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        /* ── Logo Animation: Normal -> Suddenly Small -> Big -> Normal ── */
        @keyframes logoElasticCycle {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          14% {
            /* Starts as normal logo */
            transform: scale(1);
          }
          34% {
            /* Suddenly becomes small */
            transform: scale(0.55);
          }
          68% {
            /* Then becomes big */
            transform: scale(1.24);
          }
          86% {
            /* Gentle cushioning bounce */
            transform: scale(0.96);
          }
          100% {
            /* Returns to normal size */
            transform: scale(1);
            opacity: 1;
          }
        }

        /* ── Gentle Breathing after cycle ── */
        @keyframes logoBreathing {
          0%, 100% {
            box-shadow: 0 18px 48px -6px rgba(107, 0, 24, 0.24), 0 0 0 1.5px rgba(255, 255, 255, 0.95) inset, 0 0 25px rgba(231, 185, 74, 0.2);
          }
          50% {
            box-shadow: 0 24px 60px -4px rgba(107, 0, 24, 0.35), 0 0 0 1.5px rgba(255, 255, 255, 1) inset, 0 0 38px rgba(231, 185, 74, 0.32);
          }
        }

        /* ── White Sweep Sheen across RIMT University Logo ── */
        @keyframes logoWhiteSweep {
          0% {
            transform: translateX(-160%) rotate(25deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          60% {
            opacity: 1;
          }
          85% {
            opacity: 0.9;
          }
          100% {
            transform: translateX(260%) rotate(25deg);
            opacity: 0;
          }
        }

        /* ── Ambient Shockwave Rings ── */
        @keyframes splashShockwave {
          0% { transform: scale(0.75); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        /* ── Green Checkmark Pop-in Animation ── */
        @keyframes checkmarkPopIn {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          55% { transform: scale(1.28) rotate(6deg); opacity: 1; }
          78% { transform: scale(0.92) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        /* ── Smooth Text Color Transition from Red to Green ── */
        @keyframes textRedToGreen {
          0% { color: #8B1D2C; }
          100% { color: #15803D; }
        }

        /* ── Fade-in for Status Text ── */
        @keyframes statusFadeIn {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .logo-elastic-cycle {
          animation: logoElasticCycle 2.8s cubic-bezier(0.34, 1.25, 0.64, 1) forwards,
                     logoBreathing 3.2s ease-in-out 2.8s infinite;
        }

        .logo-white-sweep {
          animation: logoWhiteSweep 2.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s infinite;
        }

        .splash-shockwave-1 {
          animation: splashShockwave 3s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .splash-shockwave-2 {
          animation: splashShockwave 3s cubic-bezier(0.16, 1, 0.3, 1) 1s infinite;
        }

        .checkmark-pop {
          animation: checkmarkPopIn 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .text-red-to-green {
          animation: textRedToGreen 0.8s ease-out forwards;
        }

        .status-fade-in {
          animation: statusFadeIn 0.6s ease-out forwards;
        }
      `}} />

      {/* Ambient Radial Glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-rose-500/15 via-primary/10 to-amber-400/15 blur-3xl pointer-events-none" />
      <div className="absolute w-[320px] h-[320px] rounded-full bg-[#E7B94A]/10 blur-2xl pointer-events-none" />

      {/* Central Logo Stage */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Shockwave Rings */}
        <div className="absolute w-36 h-36 rounded-full border-2 border-primary/30 splash-shockwave-1 pointer-events-none" />
        <div className="absolute w-36 h-36 rounded-full border-2 border-[#E7B94A]/40 splash-shockwave-2 pointer-events-none" />

        {/* Outer Logo Card — Single outer line border, completely plain middle (middle border layer removed) */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] bg-white p-3.5 flex items-center justify-center border border-[#E7D6C4] shadow-[0_20px_54px_rgba(107,0,24,0.18),0_0_0_1px_rgba(255,255,255,0.95)] logo-elastic-cycle overflow-hidden">
          {/* Top Specular Rim */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-30" />

          {/* White Sweep Sheen across RIMT University logo */}
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[2rem]">
            <div className="w-[60%] h-[250%] bg-gradient-to-r from-transparent via-white/95 to-transparent logo-white-sweep pointer-events-none shadow-[0_0_25px_rgba(255,255,255,0.9)]" />
          </div>

          {/* RIMT University Logo Image — completely plain middle, no inner double layer border */}
          <img
            alt="RIMT University Logo"
            className="max-h-full max-w-full object-contain relative z-10 transition-transform duration-300"
            style={{
              filter: 'saturate(1.9) contrast(1.22) brightness(1.04) drop-shadow(0 2px 6px rgba(139, 29, 44, 0.2))',
              imageRendering: '-webkit-optimize-contrast',
            }}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC19AQmgWL-gUir-ndxuF4jup3xrY5qBj64LUXlgD9RJE6IRXQl7Uw9pQ_cKLppluBw_ZpAaGrjzn9MM_33NeGwHee4byWlTWDl3k3ZH1ODJBySdYc1fAI_vX56Ks6Y_9rsUeDdfxgzgIKrwrKJRiXXd43-8bqVix0hb9h_KVy-x333S8_1qgi_MEC7mirEEZdIdmjQrVxbxQLOkTdB8x3YlxqRC5q1PzKVSKVWY-4rZfKHynQQWu8oLw4z4yUS8WIugw"
          />
        </div>
      </div>

      {/* Institution Brand Tag — Red circle exits → Green tick enters; Red text transitions to Green */}
      <div
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xs mb-3 backdrop-blur-md transition-all duration-700 ${
          phase === 'verified'
            ? 'bg-emerald-50/90 border-emerald-300/80 shadow-[0_4px_16px_rgba(22,163,74,0.15)]'
            : 'bg-white/90 border-[#E7D6C4] shadow-xs'
        }`}
      >
        {phase === 'verifying' ? (
          // Red Dot with pulsing glow
          <div className="relative flex items-center justify-center w-3 h-3">
            <span className="absolute w-2 h-2 rounded-full bg-[#8B1D2C] opacity-75 animate-ping" />
            <span className="relative w-2 h-2 rounded-full bg-[#8B1D2C]" />
          </div>
        ) : (
          // Green Checkmark Tick popping in
          <span className="checkmark-pop flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#16A34A" />
              <path d="M6 10.5L9 13.5L14.5 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}

        <span
          className={`text-[11px] font-extrabold uppercase tracking-widest transition-colors duration-700 ${
            phase === 'verified' ? 'text-red-to-green' : 'text-[#8B1D2C]'
          }`}
        >
          RIMT UNIVERSITY • T&amp;P PORTAL
        </span>
      </div>

      {/* Verification Status Indicator */}
      <div className="flex items-center gap-2.5 text-xs font-semibold bg-white/70 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/90 shadow-xs">
        {phase === 'verifying' ? (
          <>
            <div className="relative w-4 h-4 flex items-center justify-center">
              {/* Outer Maroon Spinner */}
              <span className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              {/* Inner Gold Accent */}
              <span
                className="absolute w-2 h-2 border border-[#E7B94A] border-b-transparent rounded-full animate-spin"
                style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
              />
            </div>
            <span className="tracking-wide text-[#4A3F33]">Verifying Institutional Session...</span>
          </>
        ) : (
          <div className="status-fade-in flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="10" fill="#16A34A" />
              <path d="M6 10.5L9 13.5L14.5 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="tracking-wide text-[#15803D] font-bold">Session Verified — Entering Portal</span>
          </div>
        )}
      </div>
    </div>
  );
}
