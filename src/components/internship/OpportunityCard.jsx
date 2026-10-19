'use client';

import React from 'react';
import CompanyBrandLogo from '@/components/common/CompanyBrandLogo';

const SKILL_PALETTES = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/70' },
  { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200/70' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/70' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/70' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/70' },
];

function skillPalette(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return SKILL_PALETTES[Math.abs(h) % SKILL_PALETTES.length];
}

function getSeasonBadge(season) {
  const s = (season || 'any').toLowerCase();
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
      return { label: 'Any Season', bg: 'bg-slate-50 text-slate-600 border-slate-200/70', icon: 'calendar_today' };
  }
}

function getCompBadge(type, stipend, fee) {
  if (type === 'stipend') {
    const formatted = stipend ? `₹${Number(stipend).toLocaleString('en-IN')}` : '—';
    return {
      label: `Stipend ${formatted} / month`,
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
      icon: 'payments',
    };
  }
  if (type === 'paid') {
    const formatted = fee ? `₹${Number(fee).toLocaleString('en-IN')}` : '—';
    return {
      label: `Paid — Student pays ${formatted}`,
      bg: 'bg-amber-50 text-amber-800 border-amber-300/80',
      icon: 'monetization_on',
    };
  }
  return {
    label: 'Non-Stipend (Unpaid)',
    bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
    icon: 'money_off',
  };
}

function getStatusBadge(status) {
  switch (status) {
    case 'open':
      return { label: 'Open', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/70' };
    case 'closed':
      return { label: 'Closed', bg: 'bg-rose-50 text-rose-700 border-rose-200/70' };
    case 'filled':
      return { label: 'Filled', bg: 'bg-blue-50 text-blue-700 border-blue-200/70' };
    case 'draft':
    default:
      return { label: 'Draft', bg: 'bg-slate-100 text-slate-600 border-slate-200/70' };
  }
}

export default function OpportunityCard({
  opportunity,
  viewMode = 'grid',
  onEdit,
  onToggleVisibility,
  onStatusChange,
  onDelete,
}) {
  const opp = opportunity || {};
  const season = getSeasonBadge(opp.season);
  const comp = getCompBadge(opp.compensation_type, opp.stipend_amount, opp.fee_amount);
  const status = getStatusBadge(opp.status);
  const skills = Array.isArray(opp.required_skills) ? opp.required_skills : [];
  const departments = Array.isArray(opp.eligible_departments) ? opp.eligible_departments : [];

  const locationMapsUrl = opp.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opp.location)}`
    : null;

  if (viewMode === 'list') {
    return (
      <div className={`p-4 rounded-2xl bg-white border ${opp.is_visible ? 'border-border-subtle' : 'border-dashed border-slate-300 opacity-75'} shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-border-subtle p-2 flex items-center justify-center shrink-0">
            <CompanyBrandLogo company={{ name: opp.company_name, id: opp.company_id }} />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-text-primary hover:text-primary transition-colors truncate">
                {opp.title}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.bg}`}>
                {status.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${comp.bg}`}>
                <span className="material-symbols-outlined text-[12px]">{comp.icon}</span>
                <span>{comp.label}</span>
              </span>
              {!opp.is_visible && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                  Hidden
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-text-secondary flex-wrap">
              <span className="font-semibold text-text-primary">{opp.company_name}</span>
              <span>•</span>
              <span className="font-mono">{opp.duration_months} Months</span>
              <span>•</span>
              <span className="capitalize">{opp.work_mode}</span>
              {opp.location && (
                <>
                  <span>•</span>
                  <a
                    href={locationMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[12px]">location_on</span>
                    <span>{opp.location}</span>
                  </a>
                </>
              )}
              {opp.seats && (
                <>
                  <span>•</span>
                  <span>{opp.seats} {opp.seats === 1 ? 'seat' : 'seats'}</span>
                </>
              )}
            </div>

            {skills.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {skills.slice(0, 4).map((sk) => {
                  const p = skillPalette(sk);
                  return (
                    <span
                      key={sk}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${p.bg} ${p.text} ${p.border}`}
                    >
                      {sk}
                    </span>
                  );
                })}
                {skills.length > 4 && (
                  <span className="text-[10px] text-text-secondary">+{skills.length - 4} more</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row actions */}
        <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
          <button
            onClick={() => onToggleVisibility?.(opp)}
            title={opp.is_visible ? 'Hide Opportunity' : 'Make Visible'}
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">
              {opp.is_visible ? 'visibility' : 'visibility_off'}
            </span>
          </button>
          <button
            onClick={() => onEdit?.(opp)}
            title="Edit Opportunity"
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button
            onClick={() => onDelete?.(opp)}
            title="Delete Opportunity"
            className="w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className={`relative rounded-2xl p-5 bg-white border ${opp.is_visible ? 'border-border-subtle' : 'border-dashed border-slate-300 opacity-80'} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden group`}>
      {/* Specular top highlight */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

      <div>
        {/* Header: Company logo, name, status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-border-subtle p-2 flex items-center justify-center shrink-0">
              <CompanyBrandLogo company={{ name: opp.company_name, id: opp.company_id }} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-text-primary group-hover:text-primary transition-colors truncate">
                {opp.title}
              </h3>
              <p className="text-xs text-text-secondary font-medium truncate">
                {opp.company_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${status.bg}`}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Badges strip: Season, Duration, Work mode */}
        <div className="mt-3.5 flex items-center gap-1.5 flex-wrap text-xs">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${season.bg}`}>
            <span className="material-symbols-outlined text-[13px]">{season.icon}</span>
            <span>{season.label}</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-container-low text-text-primary border border-border-subtle">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            <span>{opp.duration_months} Months</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-container-low text-text-secondary border border-border-subtle capitalize">
            <span className="material-symbols-outlined text-[13px]">
              {opp.work_mode === 'remote' ? 'laptop_mac' : opp.work_mode === 'hybrid' ? 'sync_alt' : 'apartment'}
            </span>
            <span>{opp.work_mode}</span>
          </span>
        </div>

        {/* Compensation Banner */}
        <div className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${comp.bg}`}>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">{comp.icon}</span>
            <span>{comp.label}</span>
          </div>
          {opp.seats && (
            <span className="text-[11px] font-medium opacity-90 font-mono">
              {opp.seats} {opp.seats === 1 ? 'opening' : 'openings'}
            </span>
          )}
        </div>

        {/* Description preview */}
        {opp.description && (
          <p className="mt-3 text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {opp.description}
          </p>
        )}

        {/* Required Skills tags */}
        <div className="mt-3.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            Required Skills
          </span>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => {
              const p = skillPalette(skill);
              return (
                <span
                  key={skill}
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${p.bg} ${p.text} ${p.border}`}
                >
                  {skill}
                </span>
              );
            })}
          </div>
        </div>

        {/* Eligible Departments */}
        {departments.length > 0 && (
          <div className="mt-3 flex items-center gap-1 text-[11px] text-text-secondary flex-wrap">
            <span className="font-semibold text-text-primary">Eligible:</span>
            <span>{departments.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Card Footer: Location / Deadline / Actions */}
      <div className="mt-5 pt-3.5 border-t border-border-subtle flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-text-secondary min-w-0">
          {opp.location ? (
            <a
              href={locationMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline flex items-center gap-1 truncate"
            >
              <span className="material-symbols-outlined text-sm">location_on</span>
              <span className="truncate max-w-[140px]">{opp.location}</span>
            </a>
          ) : (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">public</span>
              <span>Flexible</span>
            </span>
          )}

          {opp.application_deadline && (
            <span className="text-[11px] font-mono shrink-0">
              Due: {new Date(opp.application_deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Row actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleVisibility?.(opp)}
            title={opp.is_visible ? 'Hide Opportunity' : 'Make Visible'}
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">
              {opp.is_visible ? 'visibility' : 'visibility_off'}
            </span>
          </button>
          <button
            onClick={() => onEdit?.(opp)}
            title="Edit Opportunity"
            className="w-8 h-8 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button
            onClick={() => onDelete?.(opp)}
            title="Delete Opportunity"
            className="w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
