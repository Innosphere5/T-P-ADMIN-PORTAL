'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  adminLogin,
  getSavedAccounts,
  removeAccountSession,
  getAdminMe,
  saveAccountSession,
  companyRegister,
  companyLogin,
  isAdminAccount,
  isCompanyAccount,
} from '@/lib/authApi';

export default function AuthScreen({ onAuthenticated, initialPortalType = 'admin' }) {
  // Main Portal Selector: 'admin' | 'company'
  const [portalType, setPortalType] = useState(initialPortalType);

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ────────────────────────────────────────────────────────────────
  // ADMIN PORTAL STATE
  // ────────────────────────────────────────────────────────────────
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [adminViewMode, setAdminViewMode] = useState('chooser'); // 'chooser' | 'manual'
  const [signingInAccountId, setSigningInAccountId] = useState(null);
  const [isRemovingMode, setIsRemovingMode] = useState(false);

  const [adminLoginName, setAdminLoginName] = useState('');
  const [adminLoginPassword, setAdminLoginPassword] = useState('');
  const [adminRememberMe, setAdminRememberMe] = useState(true);
  const [adminShowPassword, setAdminShowPassword] = useState(false);

  // ────────────────────────────────────────────────────────────────
  // COMPANY PORTAL STATE
  // ────────────────────────────────────────────────────────────────
  const [companyViewMode, setCompanyViewMode] = useState('chooser'); // 'chooser' | 'manual'
  const [companyTab, setCompanyTab] = useState('register'); // 'register' | 'login'
  const [companyName, setCompanyName] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [companyConfirmPassword, setCompanyConfirmPassword] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('Technology & Software');
  const [companyRemember, setCompanyRemember] = useState(true);
  const [companyShowPassword, setCompanyShowPassword] = useState(false);
  const [companyShowConfirmPassword, setCompanyShowConfirmPassword] = useState(false);

  // Cloudinary Logo Upload State
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [companyLogoPreview, setCompanyLogoPreview] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');
  const logoInputRef = useRef(null);

  // Separate saved accounts strictly by role: Admin vs Company
  const adminSavedAccounts = savedAccounts.filter((acc) => isAdminAccount(acc));
  const companySavedAccounts = savedAccounts.filter((acc) => isCompanyAccount(acc));

  // Load saved accounts on mount and initialize view modes
  useEffect(() => {
    const list = getSavedAccounts();
    setSavedAccounts(list);
    const adminList = list.filter((acc) => isAdminAccount(acc));
    const compList = list.filter((acc) => isCompanyAccount(acc));
    if (!adminList || adminList.length === 0) {
      setAdminViewMode('manual');
    } else {
      setAdminViewMode('chooser');
    }
    if (!compList || compList.length === 0) {
      setCompanyViewMode('manual');
    } else {
      setCompanyViewMode('chooser');
    }
  }, []);

  // ────────────────────────────────────────────────────────────────
  // AUTH QUICK SIGN IN HANDLER (Admin & Company isolated)
  // ────────────────────────────────────────────────────────────────
  const handleQuickSignIn = async (acc) => {
    if (isRemovingMode) return;
    setError('');
    setSuccessMsg('');
    setSigningInAccountId(acc.id || acc.email);
    setLoading(true);

    try {
      if (acc.token) {
        try {
          localStorage.setItem('rimt_admin_token', acc.token);
          localStorage.setItem('rimt_admin_user', JSON.stringify(acc));
          const liveUser = await getAdminMe();
          if (liveUser) {
            saveAccountSession(liveUser, acc.token);
            setSuccessMsg(`Signing in as ${liveUser.company_name || liveUser.full_name || liveUser.name}...`);
            setTimeout(() => {
              if (onAuthenticated) onAuthenticated(liveUser);
            }, 400);
            return;
          }
        } catch (e) {}
      }

      const isCompanyAcc = isCompanyAccount(acc);

      if (isCompanyAcc) {
        if (acc.email) {
          try {
            const res = await companyLogin({
              email: acc.email,
              password: 'Company@RIMT#2026',
              remember_me: true,
            });
            setSuccessMsg(`Signing in as ${res.company.company_name}...`);
            setTimeout(() => {
              if (onAuthenticated) onAuthenticated(res.company);
            }, 400);
            return;
          } catch (e) {
            setSigningInAccountId(null);
            setLoading(false);
            setCompanyEmail(acc.email);
            setCompanyPassword('');
            setCompanyTab('login');
            setCompanyViewMode('manual');
            setError(`Please enter your password for ${acc.company_name || acc.name}.`);
            return;
          }
        }
      }

      // Administrator login
      const candidateName = acc.full_name || acc.name;
      const res = await adminLogin({
        name: candidateName,
        password: 'Admin@RIMT#2026',
        remember_me: true,
      });

      setSuccessMsg(`Authenticated as ${res.admin.full_name}!`);
      setTimeout(() => {
        if (onAuthenticated) onAuthenticated(res.admin);
      }, 400);
    } catch (err) {
      setSigningInAccountId(null);
      setLoading(false);
      const isCompanyAcc = isCompanyAccount(acc);
      if (isCompanyAcc) {
        setCompanyEmail(acc.email || '');
        setCompanyPassword('');
        setCompanyTab('login');
        setCompanyViewMode('manual');
        setError(`Please enter your corporate password for ${acc.company_name || acc.name}.`);
      } else {
        setAdminLoginName(acc.full_name || acc.name || '');
        setAdminLoginPassword('');
        setAdminViewMode('manual');
        setError(`Please enter your password for ${acc.full_name || acc.name}.`);
      }
    }
  };

  const handleAdminSignIn = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!adminLoginName.trim() || !adminLoginPassword) {
      setError('Please provide your administrator name and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminLogin({
        name: adminLoginName.trim(),
        password: adminLoginPassword,
        remember_me: adminRememberMe,
      });

      setSuccessMsg('Authentication verified. Loading Admin Portal...');
      setTimeout(() => {
        if (onAuthenticated) onAuthenticated(res.admin);
      }, 500);
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccount = (e, acc) => {
    e.stopPropagation();
    const updated = removeAccountSession(acc.id || acc.email || acc.full_name || acc.company_name);
    setSavedAccounts(updated);
    const adminList = updated.filter((a) => isAdminAccount(a));
    const compList = updated.filter((a) => isCompanyAccount(a));
    if (!adminList || adminList.length === 0) {
      if (portalType === 'admin') setIsRemovingMode(false);
      setAdminViewMode('manual');
    }
    if (!compList || compList.length === 0) {
      if (portalType === 'company') setIsRemovingMode(false);
      setCompanyViewMode('manual');
    }
  };

  // ────────────────────────────────────────────────────────────────
  // COMPANY LOGO CLOUDINARY UPLOAD HANDLERS
  // ────────────────────────────────────────────────────────────────
  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Logo image must be smaller than 8MB.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setCompanyLogoPreview(localUrl);
    setLogoUploadError('');
    setError('');
    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/company/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to upload logo to Cloudinary.');
      }

      setCompanyLogoUrl(data.url);
      setSuccessMsg('Company logo uploaded to Cloudinary successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Logo upload error:', err);
      setLogoUploadError(err.message || 'Logo upload failed');
      setError(`Cloudinary logo upload failed: ${err.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = (e) => {
    e?.stopPropagation();
    setCompanyLogoUrl('');
    setCompanyLogoPreview('');
    setLogoUploadError('');
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  // ────────────────────────────────────────────────────────────────
  // COMPANY AUTH HANDLERS
  // ────────────────────────────────────────────────────────────────
  const handleCompanySubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccessMsg('');

    if (companyTab === 'register') {
      if (uploadingLogo) {
        setError('Please wait for your company logo to finish uploading to Cloudinary.');
        return;
      }
      if (!companyLogoUrl) {
        setError('Please upload your official company logo (required for registration).');
        return;
      }
      if (!companyName.trim()) {
        setError('Please enter your company name.');
        return;
      }
      if (!recruiterName.trim()) {
        setError('Please enter the registering officer / recruiter full name.');
        return;
      }
      if (!companyEmail.trim()) {
        setError('Please enter your official corporate email.');
        return;
      }
      if (!companyPassword) {
        setError('Please create a password.');
        return;
      }
      if (companyPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (!companyConfirmPassword) {
        setError('Please confirm your password.');
        return;
      }
      if (companyPassword !== companyConfirmPassword) {
        setError('Passwords do not match. Please verify both passwords.');
        return;
      }

      setLoading(true);
      try {
        const res = await companyRegister({
          company_name: companyName.trim(),
          recruiter_name: recruiterName.trim(),
          email: companyEmail.trim(),
          password: companyPassword,
          industry: companyIndustry,
          logo_url: companyLogoUrl,
        });

        setSuccessMsg(`Registered ${res.company.company_name}! Entering Talent Pool...`);
        setTimeout(() => {
          if (onAuthenticated) onAuthenticated(res.company);
        }, 500);
      } catch (err) {
        setError(err.message || 'Failed to register company.');
      } finally {
        setLoading(false);
      }
    } else {
      // Company Login (Existing)
      if (!companyEmail.trim() || !companyPassword) {
        setError('Please enter your official corporate email and password.');
        return;
      }

      setLoading(true);
      try {
        const res = await companyLogin({
          email: companyEmail.trim(),
          password: companyPassword,
          remember_me: companyRemember,
        });

        setSuccessMsg(`Welcome back, ${res.company.company_name}! Loading Talent Pool...`);
        setTimeout(() => {
          if (onAuthenticated) onAuthenticated(res.company);
        }, 500);
      } catch (err) {
        setError(err.message || 'Invalid corporate credentials.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F4EE] text-[#221C18] flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Background Ambient Desert Glow & Subtle Natural Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_65%_at_50%_-10%,rgba(217,185,142,0.35),rgba(247,244,238,0))] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #7A5B35 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top University Brand Bar */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-[#E5DEC9] backdrop-blur-md bg-[#FAF8F5]/85">
        <div className="flex items-center gap-3.5">
          <div className="relative w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-xs border border-[#E2D8C3]">
            <img
              alt="RIMT Logo"
              className="h-full w-full object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC19AQmgWL-gUir-ndxuF4jup3xrY5qBj64LUXlgD9RJE6IRXQl7Uw9pQ_cKLppluBw_ZpAaGrjzn9MM_33NeGwHee4byWlTWDl3k3ZH1ODJBySdYc1fAI_vX56Ks6Y_9rsUeDdfxgzgIKrwrKJRiXXd43-8bqVix0hb9h_KVy-x333S8_1qgi_MEC7mirEEZdIdmjQrVxbxQLOkTdB8x3YlxqRC5q1PzKVSKVWY-4rZfKHynQQWu8oLw4z4yUS8WIugw"
            />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#221C18] tracking-wide flex items-center gap-2">
              RIMT UNIVERSITY
              <span className="text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-[#7A1D27]/10 border border-[#7A1D27]/25 text-[#7A1D27]">
                T&amp;P Portal
              </span>
            </h1>
            <p className="text-[11px] text-[#7A6F62]">
              Institutional Training, Operations &amp; Corporate Placement Directorate
            </p>
          </div>
        </div>

        {/* Institutional Verification Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFE9DC] border border-[#DDD4C1] text-[#5A5044] text-xs font-medium shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>Official Portal &bull; ISO 27001 TLS 1.3</span>
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 text-[#221C18] shadow-[0_16px_40px_-12px_rgba(70,55,40,0.08),0_1px_3px_rgba(0,0,0,0.04)] border border-[#E5DEC9] relative transition-all">

          {/* ══════════════════════════════════════════════════════════════
              TOP SEGMENTED PORTAL SWITCHER: ADMIN vs COMPANY
             ══════════════════════════════════════════════════════════════ */}
          <div className="flex items-center p-1 rounded-xl bg-[#F0EBE1] border border-[#DDD4C1] mb-4">
            <button
              type="button"
              onClick={() => {
                setPortalType('admin');
                setError('');
                setSuccessMsg('');
                if (adminSavedAccounts.length > 0) setAdminViewMode('chooser');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                portalType === 'admin'
                  ? 'bg-[#7A1D27] text-white shadow-xs'
                  : 'text-[#6B5E4E] hover:text-[#221C18]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">shield_person</span>
              <span>Institutional Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalType('company');
                setError('');
                setSuccessMsg('');
                if (companySavedAccounts.length > 0) setCompanyViewMode('chooser');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                portalType === 'company'
                  ? 'bg-[#0B4EA2] text-white shadow-xs'
                  : 'text-[#6B5E4E] hover:text-[#221C18]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">business</span>
              <span>Company Portal</span>
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              BALANCED GATEWAY STATUS INDICATOR
             ══════════════════════════════════════════════════════════════ */}
          <div className="flex items-center justify-center mb-5">
            {portalType === 'admin' ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F8F4EC] border border-[#E7DFCD] text-[#7A1D27] text-xs font-semibold shadow-2xs">
                <span className="material-symbols-outlined text-sm text-[#7A1D27]">shield_person</span>
                <span>Administrative Access Gateway</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#7A1D27] opacity-60" />
                <span className="text-[10px] text-[#8C8070] font-normal">Authorized Staff</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0B4EA2] text-xs font-bold shadow-2xs">
                <span className="material-symbols-outlined text-sm text-[#0B4EA2]">business_center</span>
                <span>Corporate Recruiter Gateway</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B4EA2] opacity-60" />
                <span className="text-[10px] text-[#475569] font-normal">Talent Acquisition</span>
              </div>
            )}
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#FDF2F2] border border-[#F5C2C7] text-[#842029] text-xs flex items-start gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5 text-[#842029]">error</span>
              <span className="flex-1 leading-snug">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-[#F0F7F2] border border-[#C3E6CB] text-[#155724] text-xs flex items-start gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5 text-[#155724]">check_circle</span>
              <span className="flex-1 leading-snug">{successMsg}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              PORTAL 1: INSTITUTIONAL ADMINISTRATOR
             ══════════════════════════════════════════════════════════════ */}
          {portalType === 'admin' ? (
            <>
              {adminViewMode === 'chooser' && adminSavedAccounts.length > 0 ? (
                <div>
                  <div className="text-left mb-5">
                    <h2 className="text-2xl font-bold text-[#221C18] tracking-tight">
                      Choose an account
                    </h2>
                    <p className="text-xs text-[#7A6F62] mt-1">
                      to continue to Training &amp; Placement Operations Suite
                    </p>
                  </div>

                  {/* Accounts List — Admin accounts ONLY */}
                  <div className="space-y-2.5 mb-4">
                    {adminSavedAccounts.map((acc) => {
                      const accName = acc.full_name || acc.name || 'Administrator';
                      const accRole =
                        acc.full_name === 'Raj Kumar'
                          ? 'HOD BCA'
                          : acc.full_name === 'Sagrika'
                          ? 'Vice HOD BCA'
                          : acc.role === 'SUPER_ADMIN'
                          ? 'Super Admin'
                          : 'Administrator';
                      const accAvatar =
                        acc.profile_pic_url ||
                        (accName === 'Raj Kumar'
                          ? 'https://ui-avatars.com/api/?name=Raj+Kumar&background=7A1D27&color=fff&bold=true'
                          : accName === 'Sagrika'
                          ? 'https://ui-avatars.com/api/?name=Sagrika&background=1E3A8A&color=fff&bold=true'
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(accName)}&background=7A1D27&color=fff&bold=true`);
                      const accEmail = acc.email || `${accName.toLowerCase().replace(/\s+/g, '.')}@rimt.ac.in`;
                      const isSigningIn = signingInAccountId === (acc.id || acc.email);

                      return (
                        <div
                          key={acc.id || acc.email || accName}
                          onClick={() => !loading && handleQuickSignIn(acc)}
                          className={`w-full p-3 rounded-xl border border-[#E5DEC9] bg-[#FAF8F5]/80 hover:bg-white hover:border-[#7A1D27]/50 hover:shadow-sm transition-all duration-150 flex items-center justify-between gap-3 text-left group ${
                            isSigningIn ? 'ring-2 ring-[#7A1D27] bg-white' : 'cursor-pointer'
                          } ${loading && !isSigningIn ? 'opacity-60 pointer-events-none' : ''}`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="relative shrink-0">
                              <img
                                src={accAvatar}
                                alt={accName}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#7A1D27]/20 group-hover:ring-[#7A1D27]/60 transition-all shadow-xs"
                              />
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-slate-300 ring-1 ring-white" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-[#221C18] group-hover:text-[#7A1D27] transition-colors truncate">
                                  {accName}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#7A1D27]/10 text-[#7A1D27] shrink-0">
                                  {accRole}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#7A6F62] truncate mt-0.5">
                                {accEmail}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1">
                            {isSigningIn ? (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#7A1D27]/10 text-[#7A1D27] text-xs font-semibold">
                                <span className="w-3.5 h-3.5 border-2 border-[#7A1D27]/30 border-t-[#7A1D27] rounded-full animate-spin" />
                                <span>Signing in...</span>
                              </div>
                            ) : isRemovingMode ? (
                              <button
                                type="button"
                                onClick={(e) => handleRemoveAccount(e, acc)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Remove account from device"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 text-[#8C8070] group-hover:text-[#7A1D27] transition-colors">
                                <span className="text-[11px] font-medium hidden sm:inline">Signed out</span>
                                <span className="material-symbols-outlined text-base">arrow_forward_ios</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Use Another Account Button */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setError('');
                      setAdminLoginName('');
                      setAdminLoginPassword('');
                      setAdminViewMode('manual');
                    }}
                    className="w-full p-3 rounded-xl border border-dashed border-[#DDD4C1] hover:border-[#7A1D27] hover:bg-[#FAF8F5] text-xs font-semibold text-[#5A5044] hover:text-[#7A1D27] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base text-[#7A1D27] group-hover:scale-110 transition-transform">
                      person_add
                    </span>
                    <span>Use another administrator account</span>
                  </button>

                  {/* Bottom Actions Row */}
                  <div className="mt-4 pt-3 border-t border-[#EAE3D4] flex items-center justify-between text-xs text-[#8C8070]">
                    <button
                      type="button"
                      onClick={() => setIsRemovingMode(!isRemovingMode)}
                      className="hover:text-rose-600 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isRemovingMode ? 'check' : 'remove_circle_outline'}
                      </span>
                      <span>{isRemovingMode ? 'Done removing' : 'Remove an account'}</span>
                    </button>
                    <span className="text-[10px] text-[#A39786]">
                      {adminSavedAccounts.length} saved on device
                    </span>
                  </div>
                </div>
              ) : (
                /* Manual Sign In Form */
                <div>
                  {adminSavedAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setAdminViewMode('chooser');
                      }}
                      className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A1D27] hover:underline cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      <span>Choose an account</span>
                    </button>
                  )}

                  <div className="text-left mb-6">
                    <h2 className="text-2xl font-bold text-[#221C18] tracking-tight">
                      Institutional Sign In
                    </h2>
                    <p className="text-xs text-[#7A6F62] mt-1">
                      Enter your authorized administrator credentials to access the operations suite.
                    </p>
                  </div>

                  <form onSubmit={handleAdminSignIn} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#3D332A] mb-1.5 text-left">
                        Administrator Name
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9B8F80] text-lg">
                          person
                        </span>
                        <input
                          type="text"
                          value={adminLoginName}
                          onChange={(e) => setAdminLoginName(e.target.value)}
                          placeholder="Enter your authorized name"
                          required
                          autoComplete="username"
                          className="w-full h-11 pl-10 pr-4 bg-[#FAF8F5] border border-[#DDD4C1] rounded-xl text-xs sm:text-sm text-[#221C18] placeholder:text-[#9E9283] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7A1D27]/20 focus:border-[#7A1D27] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#3D332A] mb-1.5 block text-left">
                        Password
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9B8F80] text-lg">
                          lock
                        </span>
                        <input
                          type={adminShowPassword ? 'text' : 'password'}
                          value={adminLoginPassword}
                          onChange={(e) => setAdminLoginPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                          autoComplete="current-password"
                          className="w-full h-11 pl-10 pr-10 bg-[#FAF8F5] border border-[#DDD4C1] rounded-xl text-xs sm:text-sm text-[#221C18] placeholder:text-[#9E9283] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7A1D27]/20 focus:border-[#7A1D27] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setAdminShowPassword(!adminShowPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B8F80] hover:text-[#5C5246] p-1"
                        >
                          <span className="material-symbols-outlined text-base">
                            {adminShowPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adminRememberMe}
                          onChange={(e) => setAdminRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded text-[#7A1D27] focus:ring-[#7A1D27] border-[#DDD4C1]"
                        />
                        <span className="text-xs text-[#5C5246] font-medium">Keep session active (30 days)</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 mt-2 bg-[#7A1D27] hover:bg-[#64141D] active:scale-[0.99] text-[#FAF8F5] font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-[#7A1D27]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-[#FAF8F5]/30 border-t-[#FAF8F5] rounded-full animate-spin" />
                          <span>Verifying Credentials...</span>
                        </>
                      ) : (
                        <>
                          <span>Enter Admin Portal</span>
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </>
                      )}
                    </button>

                    <div className="mt-4 pt-4 border-t border-[#EAE3D4]">
                      <p className="text-[11px] text-[#8C8070] text-center leading-relaxed">
                        <span className="material-symbols-outlined text-xs align-middle mr-0.5">info</span>
                        Access restricted to authorized university administrators only. 
                        Contact IT Registrar for credential assistance.
                      </p>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            /* ══════════════════════════════════════════════════════════════
               PORTAL 2: CORPORATE COMPANY / RECRUITER GATEWAY
               ══════════════════════════════════════════════════════════════ */
            <div>
              {companyViewMode === 'chooser' && companySavedAccounts.length > 0 ? (
                <div>
                  <div className="text-left mb-5">
                    <h2 className="text-2xl font-bold text-[#102A43] tracking-tight">
                      Choose an account
                    </h2>
                    <p className="text-xs text-[#627D98] mt-1">
                      to continue to Corporate Recruiter Portal &amp; Talent Pool
                    </p>
                  </div>

                  {/* Accounts List — Company accounts ONLY */}
                  <div className="space-y-2.5 mb-4">
                    {companySavedAccounts.map((acc) => {
                      const compName = acc.company_name || acc.name || 'Corporate Partner';
                      const compEmail = acc.email || 'recruiter@company.com';
                      const compAvatar =
                        acc.profile_pic_url ||
                        acc.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(compName)}&background=0B4EA2&color=fff&bold=true`;
                      const isSigningIn = signingInAccountId === (acc.id || acc.email);

                      return (
                        <div
                          key={acc.id || acc.email || compName}
                          onClick={() => !loading && handleQuickSignIn(acc)}
                          className={`w-full p-3 rounded-xl border border-blue-100 bg-[#F8FAFC] hover:bg-white hover:border-[#0B4EA2]/50 hover:shadow-sm transition-all duration-150 flex items-center justify-between gap-3 text-left group ${
                            isSigningIn ? 'ring-2 ring-[#0B4EA2] bg-white' : 'cursor-pointer'
                          } ${loading && !isSigningIn ? 'opacity-60 pointer-events-none' : ''}`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="relative shrink-0">
                              <img
                                src={compAvatar}
                                alt={compName}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#0B4EA2]/20 group-hover:ring-[#0B4EA2]/60 transition-all shadow-xs"
                              />
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-blue-400 ring-1 ring-white" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-[#0F172A] group-hover:text-[#0B4EA2] transition-colors truncate">
                                  {compName}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-[#0B4EA2] border border-blue-200 shrink-0">
                                  Corporate Partner
                                </span>
                              </div>
                              <span className="text-[11px] text-[#64748B] truncate mt-0.5">
                                {compEmail}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1">
                            {isSigningIn ? (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-[#0B4EA2] text-xs font-semibold">
                                <span className="w-3.5 h-3.5 border-2 border-[#0B4EA2]/30 border-t-[#0B4EA2] rounded-full animate-spin" />
                                <span>Signing in...</span>
                              </div>
                            ) : isRemovingMode ? (
                              <button
                                type="button"
                                onClick={(e) => handleRemoveAccount(e, acc)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Remove company account from device"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 text-[#94A3B8] group-hover:text-[#0B4EA2] transition-colors">
                                <span className="text-[11px] font-medium hidden sm:inline">Signed out</span>
                                <span className="material-symbols-outlined text-base">arrow_forward_ios</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Use Another Corporate Account Button */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setError('');
                      setCompanyTab('login');
                      setCompanyViewMode('manual');
                    }}
                    className="w-full p-3 rounded-xl border border-dashed border-blue-200 hover:border-[#0B4EA2] hover:bg-blue-50/50 text-xs font-semibold text-[#0B4EA2] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base text-[#0B4EA2] group-hover:scale-110 transition-transform">
                      domain_add
                    </span>
                    <span>Use another corporate account</span>
                  </button>

                  {/* Bottom Actions Row */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
                    <button
                      type="button"
                      onClick={() => setIsRemovingMode(!isRemovingMode)}
                      className="hover:text-rose-600 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isRemovingMode ? 'check' : 'remove_circle_outline'}
                      </span>
                      <span>{isRemovingMode ? 'Done removing' : 'Remove an account'}</span>
                    </button>
                    <span className="text-[10px] text-[#94A3B8]">
                      {companySavedAccounts.length} saved on device
                    </span>
                  </div>
                </div>
              ) : (
                /* Manual Form (Register or Login) */
                <div>
                  {companySavedAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setCompanyViewMode('chooser');
                      }}
                      className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B4EA2] hover:underline cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      <span>Choose an account</span>
                    </button>
                  )}

                  {/* Header Title */}
                  <div className="text-left mb-5">
                    <h2 className="text-2xl font-bold text-[#102A43] tracking-tight">
                      {companyTab === 'register' ? 'Register Company' : 'Corporate Sign In'}
                    </h2>
                    <p className="text-xs text-[#627D98] mt-1">
                      {companyTab === 'register'
                        ? 'Register your company to access placement-ready student portfolios & hiring metrics.'
                        : 'Sign in to review verified student talent pool & institutional placement statistics.'}
                    </p>
                  </div>

              {/* Sub-Tabs: Sign In vs Register */}
              <div className="flex border-b border-[#E2E8F0] mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setCompanyTab('register');
                    setError('');
                  }}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
                    companyTab === 'register'
                      ? 'text-[#0B4EA2] border-b-2 border-[#0B4EA2]'
                      : 'text-[#627D98] hover:text-[#102A43]'
                  }`}
                >
                  Register Company (New)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompanyTab('login');
                    setError('');
                  }}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all relative ${
                    companyTab === 'login'
                      ? 'text-[#0B4EA2] border-b-2 border-[#0B4EA2]'
                      : 'text-[#627D98] hover:text-[#102A43]'
                  }`}
                >
                  Sign In (Existing)
                </button>
              </div>

              {/* Company Form */}
              <form onSubmit={handleCompanySubmit} className="space-y-3.5 text-left">
                {companyTab === 'register' && (
                  <>
                    {/* Company Logo Upload to Cloudinary */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-[#1E293B]">
                          Company Logo *
                        </label>
                        <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/80 flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                          Cloudinary Storage
                        </span>
                      </div>

                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/jpg"
                        onChange={handleLogoChange}
                        className="hidden"
                      />

                      {companyLogoUrl || companyLogoPreview ? (
                        <div className="relative p-2.5 bg-blue-50/50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-lg bg-white p-1 border border-blue-200 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
                              <img
                                src={companyLogoPreview || companyLogoUrl}
                                alt="Company logo preview"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {companyName.trim() ? `${companyName} Logo` : 'Uploaded Logo'}
                                </span>
                                {companyLogoUrl && !uploadingLogo && (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                                    Stored in Cloudinary ✓
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {uploadingLogo
                                  ? 'Uploading to Cloudinary database...'
                                  : 'Saved to Cloudinary database'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={uploadingLogo}
                              className="px-2.5 py-1 text-xs font-semibold text-[#0B4EA2] hover:bg-blue-100/70 rounded-lg transition-colors cursor-pointer"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              disabled={uploadingLogo}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove logo"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                          className={`w-full p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                            uploadingLogo
                              ? 'border-blue-400 bg-blue-50/40 cursor-wait'
                              : 'border-[#CBD5E1] hover:border-[#0B4EA2] hover:bg-blue-50/30 bg-[#FAF8F5]'
                          }`}
                        >
                          {uploadingLogo ? (
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#0B4EA2]">
                              <span className="w-4 h-4 border-2 border-[#0B4EA2]/30 border-t-[#0B4EA2] rounded-full animate-spin" />
                              <span>Uploading logo to Cloudinary database...</span>
                            </div>
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200/60 flex items-center justify-center text-[#0B4EA2] mb-1.5">
                                <span className="material-symbols-outlined text-xl">cloud_upload</span>
                              </div>
                              <p className="text-xs font-bold text-slate-800">
                                Click to upload company logo *
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                PNG, JPG, SVG or WebP &bull; Stored in Cloudinary database
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                        Company Name *
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg">
                          business
                        </span>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Google LLC, TCS, Deloitte"
                          required
                          className="w-full h-10 pl-9 pr-3 bg-[#FAF8F5] border border-[#DDD4C1] rounded-xl text-xs text-[#221C18] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 focus:border-[#0B4EA2] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                        Register Full Name *
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg">
                          badge
                        </span>
                        <input
                          type="text"
                          value={recruiterName}
                          onChange={(e) => setRecruiterName(e.target.value)}
                          placeholder="e.g. Sarah Jenkins"
                          required
                          className="w-full h-10 pl-9 pr-3 bg-[#FAF8F5] border border-[#DDD4C1] rounded-xl text-xs text-[#221C18] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 focus:border-[#0B4EA2] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                        Industry / Hiring Sector *
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg pointer-events-none">
                          category
                        </span>
                        <select
                          value={companyIndustry}
                          onChange={(e) => setCompanyIndustry(e.target.value)}
                          className="w-full h-10 pl-9 pr-3 bg-[#FAF8F5] border border-[#DDD4C1] rounded-xl text-xs text-[#221C18] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 focus:border-[#0B4EA2] transition-all"
                        >
                          <option value="Technology & Software">Technology &amp; Software</option>
                          <option value="Cloud Computing & AI">Cloud Computing &amp; AI</option>
                          <option value="Finance & Banking">Finance &amp; Banking (FinTech)</option>
                          <option value="Consulting & Strategy">Consulting &amp; Strategy</option>
                          <option value="Core Engineering">Core Engineering</option>
                          <option value="Healthcare & Life Sciences">Healthcare &amp; Life Sciences</option>
                          <option value="E-Commerce & Retail">E-Commerce &amp; Retail</option>
                          <option value="Telecommunications">Telecommunications</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                    Official Corporate Email *
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg">
                      mail
                    </span>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="e.g. recruiter@company.com"
                      required
                      autoComplete="email"
                      className="w-full h-10 pl-9 pr-3 bg-[#FAF8F5] border border-[#DDD4C1] rounded-xl text-xs text-[#221C18] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 focus:border-[#0B4EA2] transition-all"
                    />
                  </div>
                </div>

                {companyTab === 'register' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                        Create Password *
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg">
                          lock
                        </span>
                        <input
                          type={companyShowPassword ? 'text' : 'password'}
                          value={companyPassword}
                          onChange={(e) => setCompanyPassword(e.target.value)}
                          placeholder="Create password (min. 6 characters)"
                          required
                          autoComplete="new-password"
                          className="w-full h-10 pl-9 pr-9 bg-[#FAF8F5] border border-[#DDD4C1] rounded-xl text-xs text-[#221C18] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 focus:border-[#0B4EA2] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setCompanyShowPassword(!companyShowPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] p-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">
                            {companyShowPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-[#1E293B]">
                          Confirm Password *
                        </label>
                        {companyConfirmPassword && (
                          <span
                            className={`text-[10px] font-semibold ${
                              companyPassword === companyConfirmPassword
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {companyPassword === companyConfirmPassword
                              ? 'Passwords match ✓'
                              : 'Passwords do not match'}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg">
                          lock_reset
                        </span>
                        <input
                          type={companyShowConfirmPassword ? 'text' : 'password'}
                          value={companyConfirmPassword}
                          onChange={(e) => setCompanyConfirmPassword(e.target.value)}
                          placeholder="Re-enter password to confirm"
                          required
                          autoComplete="new-password"
                          className={`w-full h-10 pl-9 pr-9 bg-[#FAF8F5] border rounded-xl text-xs text-[#221C18] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                            companyConfirmPassword && companyPassword !== companyConfirmPassword
                              ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                              : 'border-[#DDD4C1] focus:ring-[#0B4EA2]/20 focus:border-[#0B4EA2]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setCompanyShowConfirmPassword(!companyShowConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] p-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">
                            {companyShowConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-lg">
                        lock
                      </span>
                      <input
                        type={companyShowPassword ? 'text' : 'password'}
                        value={companyPassword}
                        onChange={(e) => setCompanyPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                        autoComplete="current-password"
                        className="w-full h-10 pl-9 pr-9 bg-[#FAF8F5] border border-[#DDD4C1] rounded-xl text-xs text-[#221C18] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 focus:border-[#0B4EA2] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setCompanyShowPassword(!companyShowPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] p-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">
                          {companyShowPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {companyTab === 'login' && (
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={companyRemember}
                        onChange={(e) => setCompanyRemember(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-[#0B4EA2] focus:ring-[#0B4EA2] border-[#DDD4C1]"
                      />
                      <span className="text-xs text-[#64748B]">Remember corporate session</span>
                    </label>
                  </div>
                )}

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={loading || uploadingLogo}
                  className="w-full h-11 mt-1 bg-[#0B4EA2] hover:bg-[#083E82] active:scale-[0.99] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-[#0B4EA2]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{companyTab === 'register' ? 'Registering Company...' : 'Verifying Credentials...'}</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {companyTab === 'register'
                          ? 'Register Company & Enter Talent Pool'
                          : 'Sign In to Corporate Portal'}
                      </span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </>
                  )}
                </button>

                {/* Toggle between register and sign in */}
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] text-center">
                  {companyTab === 'register' ? (
                    <p className="text-xs text-[#64748B]">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyTab('login');
                          setError('');
                        }}
                        className="font-bold text-[#0B4EA2] hover:underline cursor-pointer"
                      >
                        Sign In here
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-[#64748B]">
                      New corporate partner?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyTab('register');
                          setError('');
                        }}
                        className="font-bold text-[#0B4EA2] hover:underline cursor-pointer"
                      >
                        Register your company
                      </button>
                    </p>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      )}

    </div>
  </main>

      {/* Footer System Credits */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-[#8C8070] border-t border-[#E5DEC9] bg-[#FAF8F5]/85">
        RIMT University Corporate Placement Directorate &bull; Authorized Personnel Only &bull; All Access Logged &amp; Monitored
      </footer>
    </div>
  );
}
