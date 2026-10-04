'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TalentProfileModal from '../components/student/TalentProfileModal';

/* ───────────────────── Profile Strength Utility ───────────────────── */
function computeProfileStrength(student) {
  let score = 0;
  let maxScore = 0;
  const checks = [];

  // Bio / About
  maxScore += 15;
  if (student.bio || student.about_me) { score += 15; checks.push('bio'); }

  // Headline
  maxScore += 10;
  if (student.headline) { score += 10; checks.push('headline'); }

  // Avatar
  maxScore += 10;
  if (student.avatar_url || student.avatar) { score += 10; checks.push('avatar'); }

  // Skills (minimum 2)
  maxScore += 15;
  const skills = Array.isArray(student.skills) ? student.skills
    : (typeof student.skills === 'string' ? (() => { try { return JSON.parse(student.skills); } catch { return student.skills.split(',').filter(Boolean); } })() : []);
  if (skills.length >= 2) { score += 15; checks.push('skills'); }
  else if (skills.length === 1) { score += 8; }

  // Projects (minimum 1)
  maxScore += 20;
  const projects = Array.isArray(student.projects) ? student.projects
    : (typeof student.projects === 'string' ? (() => { try { return JSON.parse(student.projects); } catch { return []; } })() : []);
  if (projects.length >= 2) { score += 20; checks.push('projects'); }
  else if (projects.length === 1) { score += 14; checks.push('projects'); }

  // Certificates / Documents
  maxScore += 15;
  const certs = Array.isArray(student.certificates) ? student.certificates
    : (typeof student.certificates === 'string' ? (() => { try { return JSON.parse(student.certificates); } catch { return []; } })() : []);
  if (certs.length >= 1) { score += 15; checks.push('certificates'); }

  // Internships
  maxScore += 15;
  const internships = Array.isArray(student.internships) ? student.internships
    : (typeof student.internships === 'string' ? (() => { try { return JSON.parse(student.internships); } catch { return []; } })() : []);
  if (internships.length >= 1) { score += 15; checks.push('internships'); }

  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, pct, checks, skills, projects, certs, internships };
}

function getStrengthLabel(pct) {
  if (pct >= 85) return { label: 'Exceptional', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', barColor: 'from-emerald-500 to-emerald-400' };
  if (pct >= 65) return { label: 'Strong', color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200', barColor: 'from-blue-500 to-blue-400' };
  if (pct >= 45) return { label: 'Developing', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200', barColor: 'from-amber-500 to-amber-400' };
  return { label: 'Starter', color: 'text-slate-500', bg: 'bg-slate-50', ring: 'ring-slate-200', barColor: 'from-slate-400 to-slate-300' };
}

/* ────────────────────── Main Component ────────────────────── */
export default function CompanyManagement({ globalSearch = '' }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sortBy, setSortBy] = useState('strength');
  const [selectedDept, setSelectedDept] = useState('all');

  /* ── Fetch Students ── */
  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/requests?status=ALL', {
        headers: {
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
      });
      if (!response.ok) throw new Error(`Sync failed (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data.requests)) throw new Error('Invalid response');
      setStudents(data.requests);
      setSyncError(null);
    } catch (error) {
      setSyncError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    const interval = setInterval(fetchStudents, 8000);
    return () => clearInterval(interval);
  }, [fetchStudents]);

  /* ── Process & Filter Students ── */
  const processedStudents = useMemo(() => {
    return students
      .filter((s) => {
        const status = (s.status || '').toUpperCase();
        return status === 'APPROVED' || status === 'VERIFIED';
      })
      .map((s) => {
        const strength = computeProfileStrength(s);
        const fullName = s.full_name || s.name || '';
        const department = s.department || s.course || '';
        const rollNo = s.roll_number || s.roll_no || '';
        const initials = fullName.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
        return {
          ...s,
          _name: fullName,
          _department: department,
          _roll: rollNo,
          _initials: initials,
          _avatar: s.avatar_url || s.avatar || null,
          _headline: s.headline || (department ? `${department} Scholar · RIMT University` : 'RIMT University Scholar'),
          _bio: s.bio || s.about_me || null,
          _skills: strength.skills,
          _projects: strength.projects,
          _certs: strength.certs,
          _internships: strength.internships,
          _strength: strength,
          _strengthLabel: getStrengthLabel(strength.pct),
        };
      });
  }, [students]);

  const effectiveSearch = (globalSearch || searchQuery).toLowerCase().trim();

  const filteredStudents = useMemo(() => {
    let result = processedStudents;

    // Filter by profile strength category
    if (activeFilter === 'exceptional') result = result.filter((s) => s._strength.pct >= 85);
    else if (activeFilter === 'strong') result = result.filter((s) => s._strength.pct >= 65 && s._strength.pct < 85);
    else if (activeFilter === 'developing') result = result.filter((s) => s._strength.pct >= 45 && s._strength.pct < 65);
    else if (activeFilter === 'has-projects') result = result.filter((s) => s._projects.length > 0);
    else if (activeFilter === 'has-internships') result = result.filter((s) => s._internships.length > 0);
    else if (activeFilter === 'has-certificates') result = result.filter((s) => s._certs.length > 0);

    // Department filter
    if (selectedDept !== 'all') result = result.filter((s) => s._department === selectedDept);

    // Search
    if (effectiveSearch) {
      result = result.filter((s) => {
        return (
          s._name.toLowerCase().includes(effectiveSearch) ||
          s._roll.toLowerCase().includes(effectiveSearch) ||
          s._department.toLowerCase().includes(effectiveSearch) ||
          (s._headline || '').toLowerCase().includes(effectiveSearch) ||
          s._skills.some((sk) => (typeof sk === 'string' ? sk : sk?.name || '').toLowerCase().includes(effectiveSearch))
        );
      });
    }

    // Sort
    if (sortBy === 'strength') result.sort((a, b) => b._strength.pct - a._strength.pct);
    else if (sortBy === 'name') result.sort((a, b) => a._name.localeCompare(b._name));
    else if (sortBy === 'projects') result.sort((a, b) => b._projects.length - a._projects.length);
    else if (sortBy === 'recent') result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return result;
  }, [processedStudents, activeFilter, selectedDept, effectiveSearch, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = processedStudents.length;
    const exceptional = processedStudents.filter((s) => s._strength.pct >= 85).length;
    const strong = processedStudents.filter((s) => s._strength.pct >= 65).length;
    const withProjects = processedStudents.filter((s) => s._projects.length > 0).length;
    const withInternships = processedStudents.filter((s) => s._internships.length > 0).length;
    const withCerts = processedStudents.filter((s) => s._certs.length > 0).length;
    const avgStrength = total > 0 ? Math.round(processedStudents.reduce((acc, s) => acc + s._strength.pct, 0) / total) : 0;
    const departments = [...new Set(processedStudents.map((s) => s._department).filter(Boolean))];
    return { total, exceptional, strong, withProjects, withInternships, withCerts, avgStrength, departments };
  }, [processedStudents]);

  const filterPills = [
    { id: 'all', label: `All Talent (${stats.total})`, icon: 'groups' },
    { id: 'exceptional', label: `Exceptional (${stats.exceptional})`, icon: 'star' },
    { id: 'strong', label: `Strong (${stats.strong})`, icon: 'trending_up' },
    { id: 'has-projects', label: `Projects (${stats.withProjects})`, icon: 'code' },
    { id: 'has-internships', label: `Internships (${stats.withInternships})`, icon: 'work' },
    { id: 'has-certificates', label: `Certified (${stats.withCerts})`, icon: 'workspace_premium' },
  ];

  const handleStatusChange = () => {
    fetchStudents();
  };

  /* ── Render ── */
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Animations */}
      <style>{`
        @keyframes sweep {
          0% { transform: translateX(-150%) rotate(25deg); opacity: 0; }
          30% { opacity: 0.7; }
          70% { opacity: 0.7; }
          100% { transform: translateX(250%) rotate(25deg); opacity: 0; }
        }
        .animate-sweep { animation: sweep 4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        @keyframes heroSheenBeam {
          0% { transform: translateX(-150%) skewX(-20deg); }
          40%, 100% { transform: translateX(250%) skewX(-20deg); }
        }
        .hero-light-sweep { animation: heroSheenBeam 6s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        @keyframes strengthPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .strength-pulse { animation: strengthPulse 2s ease-in-out infinite; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.4s ease-out forwards; }
      `}</style>

      {/* ── Top Action Ribbon ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-label-eyebrow text-label-eyebrow text-text-secondary uppercase">
              Student Talent Showcase
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-badge text-label-badge bg-tint-maroon text-primary-container text-[11px] font-bold">
              For Companies
            </span>
          </div>
          <h1 className="font-headline-page text-xl sm:text-2xl text-text-primary tracking-tight font-bold">
            Placement-Ready Student Profiles
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              const csvRows = ['Name,Roll No,Department,Profile Strength,Projects,Internships,Skills'];
              filteredStudents.forEach((s) => {
                csvRows.push(`"${s._name}","${s._roll}","${s._department}",${s._strength.pct}%,${s._projects.length},${s._internships.length},"${s._skills.map(sk => typeof sk === 'string' ? sk : sk?.name || '').join('; ')}"`);
              });
              const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'RIMT_Student_Talent_Profiles.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="group relative h-10 px-4 bg-white/80 backdrop-blur-md text-text-primary font-label-button text-label-button rounded-full border border-white/60 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 flex items-center gap-2 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 243, 249, 0.65) 100%)',
              boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 16px, rgba(255, 255, 255, 0.85) 0px 1px 1px inset',
            }}
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none transition-transform" />
            <span className="material-symbols-outlined text-lg text-primary transition-transform duration-300 group-hover:-translate-y-0.5">
              download
            </span>
            <span className="tracking-tight font-medium">Export Talent Directory</span>
          </button>
        </div>
      </div>

      {/* ── Dark Hero Banner ── */}
      <div className="group relative overflow-hidden rounded-2xl bg-[#15151F] text-white p-5 sm:p-6 lg:p-7 shadow-xl border-t border-white/20 ring-1 ring-white/10 cursor-pointer select-none transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:-translate-y-1.5 hover:shadow-2xl hover:z-20 active:scale-[0.99]">
        {/* Animated sweep beam */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div
            className="hero-light-sweep absolute -inset-y-full w-[60%] h-[300%] blur-sm"
            style={{
              background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.08) 45%, rgba(239,192,80,0.14) 52%, rgba(255,255,255,0.06) 58%, transparent 80%)',
            }}
          />
        </div>
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-gradient-to-br from-primary-container/20 to-transparent blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
        <div className="absolute right-40 -bottom-16 w-56 h-56 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-1 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white backdrop-blur-md transform transition-transform duration-300 group-hover:scale-105">
                <span
                  className="material-symbols-outlined text-sm text-[#efc050]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                Talent Showcase
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-300 font-medium">LinkedIn &amp; GitHub Style Profiles</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Verified Student Talent Pool for Corporate Hiring
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Browse placement-ready scholars with completed portfolios, verified certifications, internship experience, and technical expertise. Each profile is curated for corporate recruitment readiness.
            </p>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center gap-1.5 text-slate-200">
                <span className="w-2 h-2 rounded-full bg-[#1E9E5A]" />
                <span className="font-semibold text-white">{stats.total} Verified Scholars</span>
              </div>
              <span className="text-slate-500">•</span>
              <div className="flex items-center gap-1.5 text-slate-200">
                <span className="material-symbols-outlined text-[#fece5d] text-sm">star</span>
                <span>{stats.exceptional} Exceptional Profiles</span>
              </div>
              <span className="text-slate-500">•</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="material-symbols-outlined text-info-blue text-sm">code</span>
                <span>{stats.withProjects} With Live Projects</span>
              </div>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 self-stretch lg:self-center border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-8 shrink-0 transform transition-all duration-300 hover:scale-105">
            <div className="text-left lg:text-right">
              <div className="text-xs text-slate-400 font-label-eyebrow uppercase">Avg Profile Strength</div>
              <div className="text-xl font-extrabold text-white transform transition-transform duration-300 group-hover:scale-105 origin-left lg:origin-right">{stats.avgStrength}%</div>
            </div>
            <div className="w-36 bg-white/15 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-secondary-container to-success-green rounded-full transition-all duration-700"
                style={{ width: `${stats.avgStrength}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-300">{stats.departments.length} Departments Represented</span>
          </div>
        </div>
      </div>

      {/* ── 4 KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Exceptional Profiles */}
        <div className="relative overflow-hidden bg-surface-card rounded-2xl p-5 sm:p-6 shadow-sm border border-border-subtle/80 flex flex-col justify-between cursor-pointer select-none transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.045] hover:-translate-y-2 hover:shadow-2xl hover:z-20 active:scale-[0.98] group">
          <div
            className="animate-sweep absolute -inset-y-full -left-1/4 w-[70%] h-[300%] bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent pointer-events-none blur-[2px]"
            style={{ animationDelay: '0s' }}
          />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-tint-green text-success-green flex items-center justify-center shadow-xs border border-emerald-100 transform transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-2deg]">
              <span className="material-symbols-outlined text-[22px]">emoji_events</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tint-green text-success-green font-label-badge text-label-badge border border-emerald-200/60 shadow-xs transform transition-transform duration-300 group-hover:scale-105">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              Top Tier
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <div className="font-display-stat text-display-stat text-text-primary tracking-tight font-extrabold transform transition-transform duration-300 group-hover:scale-[1.03] origin-left">{stats.exceptional}</div>
            <div className="font-body-medium text-body-medium font-semibold text-text-primary mt-1">Exceptional Profiles</div>
            <div className="font-body-sm text-body-sm text-text-secondary mt-0.5">85%+ profile strength</div>
          </div>
        </div>

        {/* With Projects */}
        <div className="relative overflow-hidden bg-surface-card rounded-2xl p-5 sm:p-6 shadow-sm border border-border-subtle/80 flex flex-col justify-between cursor-pointer select-none transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.045] hover:-translate-y-2 hover:shadow-2xl hover:z-20 active:scale-[0.98] group">
          <div
            className="animate-sweep absolute -inset-y-full -left-1/4 w-[70%] h-[300%] bg-gradient-to-r from-transparent via-blue-400/25 to-transparent pointer-events-none blur-[2px]"
            style={{ animationDelay: '0.8s' }}
          />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-tint-blue text-info-blue flex items-center justify-center shadow-xs border border-blue-100 transform transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-2deg]">
              <span className="material-symbols-outlined text-[22px]">code</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tint-blue text-info-blue font-label-badge text-label-badge border border-blue-200/60 shadow-xs transform transition-transform duration-300 group-hover:scale-105">
              <span className="w-1.5 h-1.5 rounded-full bg-info-blue animate-pulse" />
              Active builders
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <div className="font-display-stat text-display-stat text-text-primary tracking-tight font-extrabold transform transition-transform duration-300 group-hover:scale-[1.03] origin-left">{stats.withProjects}</div>
            <div className="font-body-medium text-body-medium font-semibold text-text-primary mt-1">With Live Projects</div>
            <div className="font-body-sm text-body-sm text-text-secondary mt-0.5">GitHub / deployed projects</div>
          </div>
        </div>

        {/* With Internships */}
        <div className="relative overflow-hidden bg-surface-card rounded-2xl p-5 sm:p-6 shadow-sm border border-border-subtle/80 flex flex-col justify-between cursor-pointer select-none transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.045] hover:-translate-y-2 hover:shadow-2xl hover:z-20 active:scale-[0.98] group">
          <div
            className="animate-sweep absolute -inset-y-full -left-1/4 w-[70%] h-[300%] bg-gradient-to-r from-transparent via-rose-400/25 to-transparent pointer-events-none blur-[2px]"
            style={{ animationDelay: '1.6s' }}
          />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-tint-maroon text-primary-container flex items-center justify-center shadow-xs border border-rose-100 transform transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-2deg]">
              <span className="material-symbols-outlined text-[22px]">work</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tint-maroon text-primary font-label-badge text-label-badge border border-rose-200/60 shadow-xs transform transition-transform duration-300 group-hover:scale-105">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
              Industry exp
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <div className="font-display-stat text-display-stat text-text-primary tracking-tight font-extrabold transform transition-transform duration-300 group-hover:scale-[1.03] origin-left">{stats.withInternships}</div>
            <div className="font-body-medium text-body-medium font-semibold text-text-primary mt-1">Internship Experience</div>
            <div className="font-body-sm text-body-sm text-text-secondary mt-0.5">Industry trained scholars</div>
          </div>
        </div>

        {/* Certified */}
        <div className="relative overflow-hidden bg-surface-card rounded-2xl p-5 sm:p-6 shadow-sm border border-border-subtle/80 flex flex-col justify-between cursor-pointer select-none transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.045] hover:-translate-y-2 hover:shadow-2xl hover:z-20 active:scale-[0.98] group">
          <div
            className="animate-sweep absolute -inset-y-full -left-1/4 w-[70%] h-[300%] bg-gradient-to-r from-transparent via-amber-400/25 to-transparent pointer-events-none blur-[2px]"
            style={{ animationDelay: '2.4s' }}
          />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-[#FEF7E6] text-[#785a00] flex items-center justify-center shadow-xs border border-amber-100 transform transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-2deg]">
              <span className="material-symbols-outlined text-[22px]">workspace_premium</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF7E6] text-[#785a00] font-label-badge text-label-badge border border-amber-200/70 shadow-xs transform transition-transform duration-300 group-hover:scale-105">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              Credentialed
            </span>
          </div>
          <div className="relative z-10 mt-4">
            <div className="font-display-stat text-display-stat text-text-primary tracking-tight font-extrabold transform transition-transform duration-300 group-hover:scale-[1.03] origin-left">{stats.withCerts}</div>
            <div className="font-body-medium text-body-medium font-semibold text-text-primary mt-1">Certified Scholars</div>
            <div className="font-body-sm text-body-sm text-text-secondary mt-0.5">Verified certificates uploaded</div>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div
        className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-sm border border-white/80 ring-1 ring-black/5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(245, 247, 252, 0.75) 100%)',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 20px -2px, rgba(255, 255, 255, 0.9) 0px 1px 1px inset',
        }}
      >
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none z-10">
          {filterPills.map((pill) => {
            const isActive = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActiveFilter(pill.id)}
                className={`group relative h-9 px-4 rounded-full font-label-button text-label-button transition-all duration-300 flex items-center justify-center gap-1.5 overflow-hidden shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'text-white shadow-md hover:shadow-lg hover:scale-[1.01]'
                    : 'text-text-primary hover:text-primary bg-white/70 hover:bg-white/95 backdrop-blur-md border border-white/80 hover:border-slate-300/80 shadow-xs hover:shadow-sm hover:scale-[1.01]'
                }`}
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(135deg, rgb(165, 35, 54) 0%, rgb(139, 29, 44) 50%, rgb(110, 21, 33) 100%)',
                        boxShadow: 'rgba(139, 29, 44, 0.35) 0px 4px 12px, rgba(255, 255, 255, 0.35) 0px 1px 1px inset',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                      }
                    : {
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 1px rgba(255,255,255,0.9)',
                      }
                }
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none transition-transform" />
                <span className={`material-symbols-outlined text-sm ${isActive ? 'text-white' : ''}`}>{pill.icon}</span>
                <span className={`relative z-10 ${isActive ? 'font-semibold tracking-tight' : 'font-medium'}`}>
                  {pill.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Sort & View Toggle */}
        <div className="flex items-center gap-2 z-10 flex-wrap">
          <div className="relative flex-1 sm:w-56">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-base">
              search
            </span>
            <input
              className="w-full h-9 pl-9 pr-3 bg-white/70 hover:bg-white/90 focus:bg-white text-text-primary placeholder:text-text-secondary rounded-xl font-body-default text-body-default outline-none border border-white/80 focus:border-primary-container shadow-xs transition-all duration-200"
              placeholder="Search student, skill, or dept..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)' }}
            />
          </div>

          {/* Department Filter */}
          {stats.departments.length > 1 && (
            <select
              className="h-9 px-3 bg-white/70 hover:bg-white/90 text-text-primary rounded-xl font-body-default text-body-default outline-none border border-white/80 focus:border-primary-container shadow-xs transition-all duration-200 text-xs"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="all">All Depts</option>
              {stats.departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          )}

          {/* Sort */}
          <select
            className="h-9 px-3 bg-white/70 hover:bg-white/90 text-text-primary rounded-xl font-body-default text-body-default outline-none border border-white/80 focus:border-primary-container shadow-xs transition-all duration-200 text-xs"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="strength">By Strength</option>
            <option value="name">By Name</option>
            <option value="projects">By Projects</option>
            <option value="recent">Most Recent</option>
          </select>

          <div className="flex bg-surface-container-low/70 backdrop-blur-md p-0.5 rounded-xl border border-white/60 shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white shadow-xs text-primary-container border border-white/80'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Card View"
            >
              <span className="material-symbols-outlined text-lg">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white shadow-xs text-primary-container border border-white/80'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="List View"
            >
              <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary-container/30 border-t-primary-container animate-spin" />
          <p className="text-text-secondary text-sm font-medium">Syncing student profiles from database...</p>
        </div>
      )}

      {/* ── Error State ── */}
      {!loading && syncError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
          <span className="material-symbols-outlined text-3xl text-rose-400 mb-2">cloud_off</span>
          <p className="text-rose-700 font-semibold">Connection Issue</p>
          <p className="text-rose-600 text-sm mt-1">{syncError}</p>
          <button onClick={fetchStudents} className="mt-3 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && !syncError && filteredStudents.length === 0 && (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-12 text-center border border-white/80 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-slate-400">person_search</span>
          </div>
          <h3 className="text-lg font-bold text-text-primary">No Matching Profiles</h3>
          <p className="text-text-secondary text-sm mt-1 max-w-md mx-auto">
            {effectiveSearch
              ? `No students found matching "${effectiveSearch}". Try adjusting your search or filters.`
              : 'No students match the current filter criteria. Try selecting a different category.'}
          </p>
        </div>
      )}

      {/* ── Grid View: LinkedIn/GitHub Style Cards ── */}
      {!loading && !syncError && filteredStudents.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStudents.map((s, idx) => (
            <div
              key={s.id || s._roll || idx}
              className="animate-slide-up group relative rounded-2xl backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:scale-[1.01] flex flex-col overflow-hidden cursor-pointer"
              style={{
                animationDelay: `${Math.min(idx * 60, 600)}ms`,
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.65) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: 'rgba(255, 255, 255, 0.95) 0px 1px 1px inset, rgba(0, 0, 0, 0.05) 0px 10px 25px -5px, rgba(0, 0, 0, 0.03) 0px 8px 10px -6px',
              }}
              onClick={() => setSelectedStudent(s)}
            >
              {/* Hover sheen */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none transition-transform" />

              {/* Banner + Avatar */}
              <div className="relative h-20 overflow-hidden rounded-t-2xl">
                {s.banner_url ? (
                  <img src={s.banner_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: `linear-gradient(135deg, ${s._strength.pct >= 85 ? '#0f766e' : s._strength.pct >= 65 ? '#1d4ed8' : s._strength.pct >= 45 ? '#b45309' : '#475569'} 0%, ${s._strength.pct >= 85 ? '#134e4a' : s._strength.pct >= 65 ? '#1e3a5f' : s._strength.pct >= 45 ? '#78350f' : '#334155'} 100%)`,
                    }}
                  />
                )}
                {/* Profile Strength Badge */}
                <div className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md border ${s._strengthLabel.bg} ${s._strengthLabel.color} ${s._strengthLabel.ring}`}
                  style={{ borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  {s._strength.pct}% · {s._strengthLabel.label}
                </div>
              </div>

              {/* Avatar (overlapping banner) */}
              <div className="relative z-10 px-5 -mt-8">
                {s._avatar ? (
                  <img
                    src={s._avatar}
                    alt={s._name}
                    className="w-16 h-16 rounded-xl object-cover border-[3px] border-white shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-container to-primary-hover flex items-center justify-center text-white text-lg font-bold border-[3px] border-white shadow-md">
                    {s._initials}
                  </div>
                )}
              </div>

              {/* Content Body */}
              <div className="relative z-10 px-5 pb-5 flex-1 flex flex-col mt-2">
                {/* Name + Headline */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-headline-section text-headline-section text-text-primary leading-snug truncate">
                      {s._name}
                    </h3>
                    {s._strength.pct >= 65 && (
                      <span className="material-symbols-outlined text-info-blue text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    )}
                  </div>
                  <p className="text-body-sm text-text-secondary mt-0.5 line-clamp-1">{s._headline}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary">
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">badge</span>
                      {s._roll}
                    </span>
                    {s._department && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="truncate">{s._department}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {s._bio && (
                  <p className="text-body-sm text-text-secondary mt-2 line-clamp-2 leading-relaxed italic">
                    &ldquo;{s._bio}&rdquo;
                  </p>
                )}

                {/* Tech Stack / Skills */}
                {s._skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s._skills.slice(0, 6).map((skill, i) => {
                      const skillName = typeof skill === 'string' ? skill : skill?.name || '';
                      return (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-tint-blue text-info-blue border border-blue-200/60"
                        >
                          {skillName}
                        </span>
                      );
                    })}
                    {s._skills.length > 6 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-container-low text-text-secondary">
                        +{s._skills.length - 6} more
                      </span>
                    )}
                  </div>
                )}

                {/* Stats Row */}
                <div className="mt-auto pt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="p-1.5 bg-surface-container-low/60 rounded-lg">
                    <div className="text-sm font-bold text-text-primary">{s._projects.length}</div>
                    <div className="text-[10px] text-text-secondary">Projects</div>
                  </div>
                  <div className="p-1.5 bg-surface-container-low/60 rounded-lg">
                    <div className="text-sm font-bold text-text-primary">{s._internships.length}</div>
                    <div className="text-[10px] text-text-secondary">Internships</div>
                  </div>
                  <div className="p-1.5 bg-surface-container-low/60 rounded-lg">
                    <div className="text-sm font-bold text-text-primary">{s._certs.length}</div>
                    <div className="text-[10px] text-text-secondary">Certificates</div>
                  </div>
                </div>

                {/* Profile Strength Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-text-secondary font-medium">Profile Strength</span>
                    <span className={`text-[10px] font-bold ${s._strengthLabel.color}`}>{s._strength.pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${s._strengthLabel.barColor} transition-all duration-700`}
                      style={{ width: `${s._strength.pct}%` }}
                    />
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStudent(s);
                  }}
                  className="mt-3 w-full h-9 rounded-lg bg-primary-container text-on-primary font-label-button text-label-button hover:bg-primary-hover shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 text-white"
                >
                  <span className="material-symbols-outlined text-base">visibility</span>
                  <span>View Full Profile</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── List View ── */}
      {!loading && !syncError && filteredStudents.length > 0 && viewMode === 'list' && (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/80 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2.5fr_1fr_0.8fr_0.8fr_0.8fr_1fr_120px] gap-3 px-5 py-3 bg-surface-container-low/60 border-b border-border-subtle/80 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
            <span>Scholar</span>
            <span>Department</span>
            <span className="text-center">Projects</span>
            <span className="text-center">Internships</span>
            <span className="text-center">Certs</span>
            <span>Strength</span>
            <span className="text-center">Action</span>
          </div>

          {/* Rows */}
          {filteredStudents.map((s, idx) => (
            <div
              key={s.id || s._roll || idx}
              className="animate-slide-up grid grid-cols-[2.5fr_1fr_0.8fr_0.8fr_0.8fr_1fr_120px] gap-3 px-5 py-3 items-center border-b border-border-subtle/40 hover:bg-tint-blue/20 transition-colors cursor-pointer group"
              style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
              onClick={() => setSelectedStudent(s)}
            >
              {/* Scholar */}
              <div className="flex items-center gap-3 min-w-0">
                {s._avatar ? (
                  <img src={s._avatar} alt={s._name} className="w-10 h-10 rounded-xl object-cover border border-white/80 shadow-xs shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-container to-primary-hover flex items-center justify-center text-white text-xs font-bold border border-white/80 shadow-xs shrink-0">
                    {s._initials}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-text-primary text-sm truncate">{s._name}</span>
                    {s._strength.pct >= 65 && (
                      <span className="material-symbols-outlined text-info-blue text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-secondary truncate block">{s._roll}</span>
                </div>
              </div>

              {/* Department */}
              <span className="text-xs text-text-secondary truncate">{s._department || '—'}</span>

              {/* Projects */}
              <div className="text-center">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${s._projects.length > 0 ? 'bg-tint-blue text-info-blue' : 'bg-slate-50 text-slate-400'}`}>
                  {s._projects.length}
                </span>
              </div>

              {/* Internships */}
              <div className="text-center">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${s._internships.length > 0 ? 'bg-tint-green text-success-green' : 'bg-slate-50 text-slate-400'}`}>
                  {s._internships.length}
                </span>
              </div>

              {/* Certs */}
              <div className="text-center">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${s._certs.length > 0 ? 'bg-[#FEF7E6] text-[#785a00]' : 'bg-slate-50 text-slate-400'}`}>
                  {s._certs.length}
                </span>
              </div>

              {/* Strength */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${s._strengthLabel.barColor} transition-all duration-500`}
                    style={{ width: `${s._strength.pct}%` }}
                  />
                </div>
                <span className={`text-[11px] font-bold min-w-[32px] text-right ${s._strengthLabel.color}`}>{s._strength.pct}%</span>
              </div>

              {/* Action */}
              <div className="flex justify-center">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedStudent(s); }}
                  className="px-3 py-1.5 rounded-lg bg-primary-container text-white font-label-button text-[11px] hover:bg-primary-hover shadow-sm transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results Count ── */}
      {!loading && !syncError && filteredStudents.length > 0 && (
        <div className="flex items-center justify-between text-xs text-text-secondary px-1">
          <span>Showing {filteredStudents.length} of {stats.total} verified scholars</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-success-green">sync</span>
            Live sync active
          </span>
        </div>
      )}

      {/* ── Talent Profile Modal (Read-Only Portfolio View) ── */}
      {selectedStudent && (
        <TalentProfileModal
          student={{
            id: selectedStudent.id,
            roll: selectedStudent._roll,
            roll_number: selectedStudent._roll,
            roll_no: selectedStudent._roll,
            name: selectedStudent._name,
            full_name: selectedStudent._name,
            avatar_url: selectedStudent._avatar,
            email: selectedStudent.email,
            department: selectedStudent._department,
          }}
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
