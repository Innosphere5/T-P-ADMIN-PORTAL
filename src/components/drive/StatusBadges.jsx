'use client';

import React from 'react';
import { deriveDriveStatus, derivePackageTier } from '@/lib/driveUtils';

/**
 * DriveStatusBadge — Renders the current lifecycle/temporal pill
 */
export function DriveStatusBadge({ drive, statusOverride }) {
  const statusInfo = drive ? deriveDriveStatus(drive) : { label: statusOverride || 'Upcoming', type: 'upcoming', key: 'upcoming' };

  if (statusInfo.type === 'ongoing') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-tint-green text-success-green font-label-badge text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs border border-emerald-200/80 backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success-green" />
        </span>
        {statusInfo.label}
      </span>
    );
  }

  if (statusInfo.key === 'registration_open') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-tint-blue text-info-blue font-label-badge text-xs font-semibold inline-flex items-center gap-1 border border-blue-200/80 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-info-blue animate-pulse" />
        {statusInfo.label}
      </span>
    );
  }

  if (statusInfo.key === 'registration_closed') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-text-secondary font-label-badge text-xs font-semibold inline-flex items-center gap-1 border border-white/60 shadow-xs">
        <span className="material-symbols-outlined text-xs">lock_clock</span>
        {statusInfo.label}
      </span>
    );
  }

  if (statusInfo.type === 'completed') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-tint-green text-success-green font-label-badge text-xs font-semibold inline-flex items-center gap-1 border border-emerald-200/80 shadow-xs">
        <span className="material-symbols-outlined text-sm font-bold">verified</span>
        {statusInfo.label}
      </span>
    );
  }

  if (statusInfo.type === 'draft') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-text-secondary font-label-badge text-xs font-semibold inline-flex items-center gap-1 border border-border-subtle">
        <span className="material-symbols-outlined text-xs">edit_note</span>
        Draft
      </span>
    );
  }

  if (statusInfo.type === 'cancelled') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-primary font-label-badge text-xs font-semibold inline-flex items-center gap-1 border border-rose-200">
        <span className="material-symbols-outlined text-xs">cancel</span>
        Cancelled
      </span>
    );
  }

  return (
    <span className="px-2.5 py-0.5 rounded-full bg-tint-blue text-info-blue font-label-badge text-xs font-semibold inline-flex items-center gap-1 border border-blue-100 shadow-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-info-blue" />
      {statusInfo.label}
    </span>
  );
}

/**
 * CategoryBadge — Shows the drive classification badge
 */
export function CategoryBadge({ category }) {
  if (category === 'UNIVERSITY_EVENT') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-xs inline-flex items-center gap-1">
        <span className="material-symbols-outlined text-xs">account_balance</span>
        University Event
      </span>
    );
  }
  if (category === 'PLACEMENT_ACTIVITY') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200/80 shadow-xs inline-flex items-center gap-1">
        <span className="material-symbols-outlined text-xs">psychology</span>
        Placement Activity
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-high text-on-surface-variant border border-white/60 shadow-xs inline-flex items-center gap-1">
      <span className="material-symbols-outlined text-xs">apartment</span>
      Campus Recruitment
    </span>
  );
}

/**
 * PackageTierBadge — Displays tier if package max LPA is set
 */
export function PackageTierBadge({ maxLpa }) {
  const tierInfo = derivePackageTier(maxLpa);
  if (!tierInfo) return null;

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] ${tierInfo.badgeStyle}`}>
      {tierInfo.label}
    </span>
  );
}

/**
 * NotificationStatusChip — Displays honest status of dispatch
 */
export function NotificationStatusChip({ status }) {
  if (!status || status === 'NOT_SENT') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container text-text-secondary">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Not Sent
      </span>
    );
  }
  if (status === 'SENDING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-info-blue">
        <span className="w-1.5 h-1.5 rounded-full bg-info-blue animate-ping" />
        Dispatching...
      </span>
    );
  }
  if (status === 'NOT_CONNECTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <span className="material-symbols-outlined text-xs text-amber-600">cloud_off</span>
        Gateway Standby (Not Connected)
      </span>
    );
  }
  if (status.startsWith('DELIVERED')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-success-green border border-emerald-200">
        <span className="material-symbols-outlined text-xs">done_all</span>
        {status}
      </span>
    );
  }
  if (status === 'ACCEPTED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-info-blue border border-blue-200">
        <span className="material-symbols-outlined text-xs">check</span>
        Accepted by Server
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-primary border border-rose-200">
      <span className="material-symbols-outlined text-xs">error</span>
      {status}
    </span>
  );
}
