'use client';

import React from 'react';
import CompanyBrandLogo from '@/components/common/CompanyBrandLogo';

function getInitials(name) {
  if (!name) return 'ST';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function getCompBadge(type, stipend, fee) {
  if (type === 'stipend' || (!type && stipend)) {
    const formatted = stipend
      ? typeof stipend === 'number'
        ? `₹${stipend.toLocaleString('en-IN')}`
        : stipend.startsWith('₹')
        ? stipend
        : `₹${stipend}`
      : '—';
    return {
      label: `Stipend ${formatted} / mo`,
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
      icon: 'payments',
    };
  }
  if (type === 'paid') {
    const formatted = fee ? `₹${Number(fee).toLocaleString('en-IN')}` : '—';
    return {
      label: `Paid (${formatted})`,
      bg: 'bg-amber-50 text-amber-800 border-amber-300/80',
      icon: 'monetization_on',
    };
  }
  return {
    label: 'Non-Stipend',
    bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
    icon: 'money_off',
  };
}

function getSeasonBadge(season) {
  if (!season || season === 'any') return null;
  const s = season.toLowerCase();
  switch (s) {
    case 'winter':
      return { label: 'Winter', bg: 'bg-sky-50 text-sky-700 border-sky-200/70', icon: 'ac_unit' };
    case 'summer':
      return { label: 'Summer', bg: 'bg-amber-50 text-amber-700 border-amber-200/70', icon: 'wb_sunny' };
    case 'spring':
      return { label: 'Spring', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/70', icon: 'local_florist' };
    case 'autumn':
      return { label: 'Autumn', bg: 'bg-rose-50 text-rose-700 border-rose-200/70', icon: 'eco' };
    default:
      return null;
  }
}

export default function StudentInternshipCard({
  internship,
  onViewDetails,
  viewMode = 'grid',
}) {
  const studentName = internship.student_name || internship.studentName || 'Student';
  const rollNumber = internship.student_roll || internship.roll || '—';
  const department = internship.student_department || internship.department || '';
  const company = internship.company || internship.company_name || 'Partner Company';
  const role = internship.role || internship.title || 'Intern';
  const mentor = internship.mentor || internship.faculty_mentor || 'Unassigned';
  const progress = typeof internship.progress === 'number' ? Math.min(100, Math.max(0, internship.progress)) : 0;
  const status = internship.status || 'Active';
  const durationMonths = internship.duration_months;
  const durationText = durationMonths ? `${durationMonths} Months` : internship.duration || '6-Month Track';
  const stipend = internship.stipend_amount || internship.stipend;
  const compBadge = getCompBadge(internship.compensation_type, stipend, internship.fee_amount);
  const seasonBadge = getSeasonBadge(internship.season);

  const statusBadgeClass =
    status === 'Completed' || status === 'concluded'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
      : status.toLowerCase().includes('risk')
      ? 'bg-rose-50 text-rose-700 border-rose-200/60'
      : status === 'In Evaluation'
      ? 'bg-blue-50 text-blue-700 border-blue-200/60'
      : 'bg-amber-50 text-amber-700 border-amber-200/60';

  if (viewMode === 'list') {
    return (
      <div className="group rounded-2xl p-4 bg-white border border-border-subtle shadow-xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Student & Company Info */}
        <div className="flex items-center gap-3.5 min-w-[280px]">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20 shadow-xs">
            {getInitials(studentName)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors truncate">
                {studentName}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadgeClass}`}>
                {status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
              <span className="font-mono text-[11px]">{rollNumber}</span>
              {department && <span>• {department}</span>}
            </div>
          </div>
        </div>

        {/* Center: Company & Role */}
        <div className="flex-1 min-w-[200px] text-xs">
          <div className="flex items-center gap-2">
            <CompanyBrandLogo companyName={company} size="xs" />
            <span className="font-bold text-text-primary truncate">{company}</span>
          </div>
          <p className="text-text-secondary truncate mt-0.5">{role}</p>
        </div>

        {/* Badges: Comp + Duration */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${compBadge.bg}`}>
            <span className="material-symbols-outlined text-xs">{compBadge.icon}</span>
            <span>{compBadge.label}</span>
          </span>
          {seasonBadge && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${seasonBadge.bg}`}>
              <span className="material-symbols-outlined text-xs">{seasonBadge.icon}</span>
              <span>{seasonBadge.label}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <span className="material-symbols-outlined text-xs">schedule</span>
            <span>{durationText}</span>
          </span>
        </div>

        {/* Progress */}
        <div className="w-36 hidden lg:block">
          <div className="flex items-center justify-between text-[11px] text-text-secondary mb-1">
            <span>Progress</span>
            <span className="font-bold text-text-primary">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container-low overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress === 100 ? 'bg-success-green' : progress < 60 ? 'bg-rose-500' : 'bg-primary'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => onViewDetails(internship)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-primary hover:text-white text-primary text-xs font-bold transition-all flex items-center gap-1 border border-border-subtle"
          >
            <span>Certificate &amp; Logs</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="group relative rounded-2xl p-5 bg-white border border-border-subtle shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Specular highlight */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

      <div>
        {/* Header: Student Initials + Name + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20 shadow-xs">
              {getInitials(studentName)}
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-bold text-base text-text-primary group-hover:text-primary transition-colors truncate">
                {studentName}
              </h3>
              <div className="flex items-center gap-2 text-xs text-text-secondary font-mono">
                <span>{rollNumber}</span>
                {department && <span>• {department}</span>}
              </div>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${statusBadgeClass}`}>
            {status}
          </span>
        </div>

        {/* Company & Role Details Box */}
        <div className="mt-4 p-3 rounded-xl bg-surface-container-low/70 border border-border-subtle space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-medium">Visiting Employer</span>
            <div className="flex items-center gap-1.5 font-bold text-text-primary max-w-[60%] truncate">
              <CompanyBrandLogo companyName={company} size="xs" />
              <span className="truncate">{company}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-medium">Assigned Role</span>
            <span className="font-semibold text-text-primary truncate max-w-[60%]">{role}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-medium">Compensation</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${compBadge.bg}`}>
              <span className="material-symbols-outlined text-xs">{compBadge.icon}</span>
              <span>{compBadge.label}</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-medium">Faculty Mentor</span>
            <span className="font-semibold text-text-primary truncate max-w-[60%]">
              {mentor}
            </span>
          </div>
        </div>

        {/* Badges: Season & Duration */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <span className="material-symbols-outlined text-xs">schedule</span>
            <span>{durationText}</span>
          </span>
          {seasonBadge && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${seasonBadge.bg}`}>
              <span className="material-symbols-outlined text-xs">{seasonBadge.icon}</span>
              <span>{seasonBadge.label}</span>
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary font-medium">Internship Progress</span>
            <span className="font-bold text-text-primary">{progress}% Concluded</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface-container-low overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress === 100 ? 'bg-success-green' : progress < 60 ? 'bg-rose-500' : 'bg-primary'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer: Certificate & Logs */}
      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
        <span className="text-text-secondary font-mono text-[11px]">
          {durationText}
        </span>
        <button
          onClick={() => onViewDetails(internship)}
          className="font-bold text-primary hover:underline flex items-center gap-1"
        >
          <span>Certificate &amp; Logs</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
