'use client';

import React from 'react';
import CompanyBrandLogo from '@/components/common/CompanyBrandLogo';
import { DriveStatusBadge, CategoryBadge, PackageTierBadge } from './StatusBadges';
import { formatDateTime, formatCtcRange, deriveDriveStatus } from '@/lib/driveUtils';

/**
 * DriveCard — Full-width agenda card & table row view for a recruitment drive
 */
export default function DriveCard({ drive, onSelect, viewMode = 'agenda' }) {
  const statusInfo = deriveDriveStatus(drive);

  // Dynamic gradient based on status family
  const cardGradient =
    statusInfo.type === 'ongoing'
      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(254, 242, 244, 0.78) 45%, rgba(255, 255, 255, 0.88) 100%)'
      : statusInfo.type === 'completed'
      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(240, 253, 244, 0.78) 45%, rgba(255, 255, 255, 0.88) 100%)'
      : statusInfo.key === 'registration_open'
      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(240, 246, 255, 0.78) 45%, rgba(255, 255, 255, 0.88) 100%)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 251, 0.85) 50%, rgba(255, 255, 255, 0.9) 100%)';

  const cardShadow =
    statusInfo.type === 'ongoing'
      ? 'rgba(139, 29, 44, 0.08) 0px 16px 36px -10px, rgba(0, 0, 0, 0.04) 0px 4px 18px 0px, rgba(255, 255, 255, 0.95) 0px 1px 1px 0px inset'
      : statusInfo.type === 'completed'
      ? 'rgba(30, 158, 90, 0.08) 0px 16px 36px -10px, rgba(0, 0, 0, 0.04) 0px 4px 18px 0px, rgba(255, 255, 255, 0.95) 0px 1px 1px 0px inset'
      : 'rgba(62, 111, 217, 0.08) 0px 16px 36px -10px, rgba(0, 0, 0, 0.04) 0px 4px 18px 0px, rgba(255, 255, 255, 0.95) 0px 1px 1px 0px inset';

  const glowColor =
    statusInfo.type === 'ongoing'
      ? 'bg-rose-500/15'
      : statusInfo.type === 'completed'
      ? 'bg-emerald-500/15'
      : 'bg-blue-500/15';

  const sheenColor =
    statusInfo.type === 'ongoing'
      ? 'from-transparent via-rose-200/50 to-transparent'
      : statusInfo.type === 'completed'
      ? 'from-transparent via-emerald-200/50 to-transparent'
      : 'from-transparent via-blue-200/50 to-transparent';

  // Eligibility summary string
  const deptList = (drive.eligibility?.departments || []).join(', ') || 'All Departments';
  const cgpaCutoff = drive.eligibility?.minCgpa ? `CGPA ≥ ${drive.eligibility.minCgpa}` : null;
  const backlogs = drive.eligibility?.maxBacklogs !== undefined && drive.eligibility?.maxBacklogs !== null
    ? drive.eligibility.maxBacklogs === 0
      ? 'No Active Backlogs'
      : `Max ${drive.eligibility.maxBacklogs} Backlogs`
    : null;
  const eligibilitySummary = [deptList, cgpaCutoff, backlogs].filter(Boolean).join(' • ');

  // Active registration links count
  const activeLinks = (drive.registrationLinks || []).filter((l) => l.enabled !== false);

  // Table Row View
  if (viewMode === 'table') {
    return (
      <tr
        onClick={() => onSelect(drive)}
        className="group cursor-pointer hover:bg-surface-container-low transition-colors border-b border-border-subtle"
      >
        <td className="p-4 pl-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-xs border border-border-subtle flex items-center justify-center shrink-0">
              <CompanyBrandLogo company={{ name: drive.companyName || drive.title }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-text-primary group-hover:text-primary transition-colors truncate">
                {drive.title}
              </span>
              <span className="text-xs text-text-secondary truncate">
                {drive.companyName || drive.roleTitle || 'University Campus Drive'}
              </span>
            </div>
          </div>
        </td>
        <td className="p-4">
          <DriveStatusBadge drive={drive} />
        </td>
        <td className="p-4">
          <CategoryBadge category={drive.category} />
        </td>
        <td className="p-4">
          <span className="font-semibold text-xs text-text-primary">
            {formatCtcRange(drive.packageMinLpa, drive.packageMaxLpa)}
          </span>
        </td>
        <td className="p-4 text-xs text-text-secondary">
          {formatDateTime(drive.startsAt, false)}
        </td>
        <td className="p-4 text-right pr-6">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(drive);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-tint-maroon transition-colors"
          >
            <span>Manage</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </td>
      </tr>
    );
  }

  // Agenda Card View
  return (
    <div
      onClick={() => onSelect(drive)}
      className="group relative rounded-2xl p-5 lg:p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.008] cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      style={{
        background: cardGradient,
        backdropFilter: 'blur(16px)',
        boxShadow: cardShadow,
        border: '1px solid rgba(255, 255, 255, 0.9)',
      }}
    >
      {/* Specular Top Line */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
      <div className={`absolute -right-12 -top-12 w-44 h-44 rounded-full ${glowColor} blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`} />
      <div className={`pointer-events-none absolute inset-0 z-0 opacity-40 bg-gradient-to-r ${sheenColor} -skew-x-12 animate-glossy`} />

      {/* Left Details Block */}
      <div className="relative z-10 flex items-start gap-4 flex-1 min-w-0">
        {/* Company Logo Tile */}
        <div className="w-14 h-14 rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 shadow-sm border border-border-subtle/80 ring-1 ring-white/60">
          <CompanyBrandLogo company={{ name: drive.companyName || drive.title, shortName: drive.companyName?.slice(0, 4) }} />
        </div>

        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {/* Header Row */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-headline-section text-base lg:text-lg text-text-primary font-bold tracking-tight">
              {drive.title}
            </h3>

            <DriveStatusBadge drive={drive} />
            <CategoryBadge category={drive.category} />
            {drive.packageMaxLpa && <PackageTierBadge maxLpa={drive.packageMaxLpa} />}
          </div>

          {/* Subtitle / Company / Role */}
          {drive.companyName && (
            <span className="text-xs font-semibold text-text-secondary">
              {drive.companyName} {drive.roleTitle ? `• Role: ${drive.roleTitle}` : ''}
            </span>
          )}

          {/* Meta Info Line */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-text-secondary mt-1">
            <span className="flex items-center gap-1 font-semibold text-text-primary">
              <span className="material-symbols-outlined text-sm text-primary">monetization_on</span>
              CTC: {formatCtcRange(drive.packageMinLpa, drive.packageMaxLpa)}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-[#8B1D2C]">school</span>
              Eligibility: {eligibilitySummary}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-info-blue">link</span>
              {activeLinks.length > 0 ? `${activeLinks.length} Active Link(s)` : 'External / Portal Form'}
            </span>
          </div>

          {/* Stages Progression Pipeline */}
          {drive.rounds && drive.rounds.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {drive.rounds.map((rnd, idx) => {
                const isFirst = idx === 0;
                const isOngoing = statusInfo.type === 'ongoing' && idx === 0;
                return (
                  <React.Fragment key={idx}>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-2xs backdrop-blur-sm ${
                        statusInfo.type === 'completed'
                          ? 'bg-emerald-50 text-success-green border-emerald-100'
                          : isOngoing
                          ? 'bg-tint-blue text-info-blue border-blue-100'
                          : isFirst
                          ? 'bg-surface-container text-text-primary border-white/80'
                          : 'bg-surface-container/60 text-text-secondary border-white/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {statusInfo.type === 'completed' ? 'check_circle' : isOngoing ? 'hourglass_top' : 'radio_button_checked'}
                      </span>
                      <span>{rnd.name || rnd}</span>
                    </span>
                    {idx < drive.rounds.length - 1 && (
                      <span className="material-symbols-outlined text-text-secondary text-xs opacity-60">arrow_forward</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Action & Panel Block */}
      <div className="relative z-10 flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border-subtle/50">
        <div className="flex flex-col text-left lg:text-right">
          <span className="font-label-eyebrow text-[10px] text-text-secondary uppercase font-bold tracking-wider">
            {drive.mode === 'Online' ? 'Virtual Panel' : 'Campus Venue'}
          </span>
          <span className="text-xs font-semibold text-text-primary truncate max-w-[200px]">
            {drive.venue || drive.meetingUrl || 'T&P Main Campus'}
          </span>
          <span className="text-[11px] text-text-secondary">
            {formatDateTime(drive.startsAt)}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(drive);
          }}
          className="group/btn relative inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-label-button text-xs font-semibold text-text-primary shadow-xs hover:shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden border border-white/80 shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(235, 238, 243, 0.9) 100%)',
          }}
        >
          <div className="pointer-events-none absolute inset-0 z-0 opacity-25 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 group-hover/btn:opacity-60 transition-opacity" />
          <span className="relative z-10 font-semibold">Manage Drive</span>
          <span className="material-symbols-outlined text-base relative z-10 text-primary">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
