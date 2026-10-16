'use client';

import React, { useState } from 'react';
import CompanyBrandLogo from '@/components/common/CompanyBrandLogo';
import { DriveStatusBadge, CategoryBadge, PackageTierBadge } from './StatusBadges';
import RegistrationLinksPanel from './RegistrationLinksPanel';
import AnnouncementsPanel from './AnnouncementsPanel';
import ResultsPanel from './ResultsPanel';
import { formatDateTime, formatCtcRange } from '@/lib/driveUtils';

/**
 * DriveDetailDrawer — Tabbed modal/drawer detailing drive operations
 */
export default function DriveDetailDrawer({
  drive,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onCancel,
  onComplete,
  onSaveLink,
  onDeleteLink,
  onPublishAnnouncement,
  onUpdateResults,
  onTriggerNotify,
  prefilledScheduleDiff = null,
}) {
  const [activeTab, setActiveTab] = useState(
    prefilledScheduleDiff && prefilledScheduleDiff.length > 0 ? 'announcements' : 'overview'
  );

  if (!isOpen || !drive) return null;

  // Active registration links count
  const activeLinks = (drive.registrationLinks || []).filter((l) => l.enabled !== false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Drawer Card */}
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-white/80 z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Specular Highlight */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        {/* Header Banner */}
        <div className="p-5 bg-surface-hero text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 shadow-sm border border-border-subtle">
              <CompanyBrandLogo company={{ name: drive.companyName || drive.title, shortName: drive.companyName?.slice(0, 4) }} />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold tracking-tight truncate text-white">
                  {drive.title}
                </h3>
                <DriveStatusBadge drive={drive} />
                <CategoryBadge category={drive.category} />
              </div>
              <span className="text-xs text-surface-container-high/80 truncate mt-0.5">
                {drive.companyName ? `${drive.companyName} • ` : ''}
                {drive.roleTitle ? `Role: ${drive.roleTitle} • ` : ''}
                {drive.mode} • Venue: {drive.venue || drive.meetingUrl || 'T&P Campus'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onEdit(drive)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/15 transition-all"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              <span>Edit Drive</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-container-high hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center px-6 pt-3 border-b border-border-subtle bg-surface-container-low shrink-0 overflow-x-auto gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: 'dashboard' },
            { id: 'eligibility', label: 'Eligibility', icon: 'school' },
            {
              id: 'registration',
              label: `Registration (${drive.registrationLinks?.length || 0})`,
              icon: 'link',
            },
            {
              id: 'announcements',
              label: `Announcements (${drive.announcements?.length || 0})`,
              icon: 'campaign',
            },
            { id: 'results', label: 'Results & Offers', icon: 'workspace_premium' },
            {
              id: 'notifications',
              label: `Notification Log (${drive.notifications?.length || 0})`,
              icon: 'notifications',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-150">
              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">
                    Offered CTC Package
                  </span>
                  <span className="text-sm font-extrabold text-text-primary">
                    {formatCtcRange(drive.packageMinLpa, drive.packageMaxLpa)}
                  </span>
                  {drive.packageMaxLpa && <PackageTierBadge maxLpa={drive.packageMaxLpa} />}
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">
                    Drive Start Date
                  </span>
                  <span className="text-xs font-bold text-text-primary">
                    {formatDateTime(drive.startsAt)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">
                    Registration Deadline
                  </span>
                  <span className="text-xs font-bold text-text-primary">
                    {formatDateTime(drive.registrationDeadline)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">
                    Execution Mode &amp; Venue
                  </span>
                  <span className="text-xs font-bold text-text-primary">
                    {drive.mode}
                  </span>
                  <span className="text-[11px] text-text-secondary truncate">
                    {drive.venue || drive.meetingUrl || 'Campus Venue'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {drive.description && (
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Drive Description &amp; Candidate Scope
                  </h4>
                  <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle text-xs text-text-primary whitespace-pre-line leading-relaxed">
                    {drive.description}
                  </div>
                </div>
              )}

              {/* Rounds Pipeline */}
              {drive.rounds && drive.rounds.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Recruitment Pipeline Stages
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {drive.rounds.map((rnd, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white border border-border-subtle shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-surface-container text-text-secondary text-[10px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-xs font-bold text-text-primary">
                            {rnd.name || rnd}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-success-green px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SPOC Liaison Block */}
              {drive.spoc?.name && (
                <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm">
                      {drive.spoc.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-text-secondary uppercase">
                        Company Liaison &amp; T&amp;P SPOC
                      </span>
                      <span className="text-sm font-bold text-text-primary">{drive.spoc.name}</span>
                      <span className="text-xs text-text-secondary">
                        {drive.spoc.organisation || 'Northern Region Campus Cell'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    {drive.spoc.phone && <span>Phone: {drive.spoc.phone}</span>}
                    {drive.spoc.email && <span>Email: {drive.spoc.email}</span>}
                  </div>
                </div>
              )}

              {/* Quick Actions Row */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDuplicate(drive.id)}
                    className="px-3 py-1.5 rounded-lg border border-border-subtle bg-white text-xs font-semibold text-text-primary hover:bg-surface-container shadow-2xs transition-colors inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>Duplicate Drive</span>
                  </button>

                  {drive.status !== 'COMPLETED' && (
                    <button
                      onClick={() => onComplete(drive.id)}
                      className="px-3 py-1.5 rounded-lg border border-border-subtle bg-white text-xs font-semibold text-success-green hover:bg-emerald-50 shadow-2xs transition-colors inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">task_alt</span>
                      <span>Mark Completed</span>
                    </button>
                  )}
                </div>

                {drive.status !== 'CANCELLED' && (
                  <button
                    onClick={() => {
                      const reason = prompt('Enter official reason for cancelling this recruitment drive:');
                      if (reason !== null) onCancel(drive.id, reason);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-primary hover:bg-rose-100 shadow-2xs transition-colors inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    <span>Cancel Drive</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ELIGIBILITY */}
          {activeTab === 'eligibility' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col gap-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Verified Candidate Eligibility Framework
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">
                      Permitted Departments
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {(drive.eligibility?.departments || []).length > 0 ? (
                        drive.eligibility.departments.map((dept) => (
                          <span
                            key={dept}
                            className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white border border-border-subtle text-text-primary shadow-2xs"
                          >
                            {dept}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-text-primary">All Departments Allowed</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">
                      Academic Year / Semester
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {(drive.eligibility?.batches || []).length > 0 ? (
                        drive.eligibility.batches.map((batch) => (
                          <span
                            key={batch}
                            className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white border border-border-subtle text-text-primary shadow-2xs"
                          >
                            {batch}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-text-primary">All Semesters</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">
                      Minimum CGPA Cutoff
                    </span>
                    <span className="text-sm font-extrabold text-text-primary">
                      {drive.eligibility?.minCgpa !== null && drive.eligibility?.minCgpa !== undefined
                        ? `CGPA ≥ ${drive.eligibility.minCgpa} / 10.00`
                        : 'No CGPA Cutoff Enforced'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">
                      Active Backlogs Policy
                    </span>
                    <span className="text-sm font-extrabold text-text-primary">
                      {drive.eligibility?.maxBacklogs !== null && drive.eligibility?.maxBacklogs !== undefined
                        ? drive.eligibility.maxBacklogs === 0
                          ? 'Zero Active Backlogs Permitted'
                          : `Maximum ${drive.eligibility.maxBacklogs} Active Backlogs Allowed`
                        : 'No Backlogs Restriction'}
                    </span>
                  </div>
                </div>

                {drive.eligibility?.notes && (
                  <div className="pt-2 border-t border-border-subtle flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">
                      Additional Pre-Requisite Notes
                    </span>
                    <p className="text-xs text-text-primary leading-relaxed">
                      {drive.eligibility.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: REGISTRATION */}
          {activeTab === 'registration' && (
            <RegistrationLinksPanel
              drive={drive}
              onSaveLink={(linkData) => onSaveLink(drive.id, linkData)}
              onDeleteLink={(linkId) => onDeleteLink(drive.id, linkId)}
            />
          )}

          {/* TAB 4: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <AnnouncementsPanel
              drive={drive}
              prefilledScheduleDiff={prefilledScheduleDiff}
              onPublishAnnouncement={(annData) => onPublishAnnouncement(drive.id, annData)}
            />
          )}

          {/* TAB 5: RESULTS */}
          {activeTab === 'results' && (
            <ResultsPanel
              drive={drive}
              onUpdateResults={(stage, students) => onUpdateResults(drive.id, stage, students)}
              onTriggerNotify={(notifyParams) => onTriggerNotify(drive.id, notifyParams)}
            />
          )}

          {/* TAB 6: NOTIFICATIONS LOG */}
          {activeTab === 'notifications' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Audit Log of Student Notifications
                </span>
                <span className="text-[11px] text-text-secondary">
                  {(drive.notifications || []).length} Recorded Action(s)
                </span>
              </div>

              {(drive.notifications || []).length === 0 ? (
                <div className="p-8 rounded-xl bg-surface-container-low border border-dashed border-border-subtle text-center flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-2xl text-text-secondary">notifications_none</span>
                  <p className="text-xs font-semibold text-text-primary">No student alerts dispatched yet</p>
                  <p className="text-[11px] text-text-secondary">
                    Notices published to candidates will appear here with auditor timestamps.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {drive.notifications.map((notif, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-primary text-xs">
                          {notif.title || notif.event}
                        </span>
                        <span className="text-[11px] text-text-secondary">
                          {formatDateTime(notif.sentAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-text-primary whitespace-pre-line">
                        {notif.body}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-[10px] text-text-secondary">
                        <span>Auditor: {notif.sentBy}</span>
                        <span className="font-semibold text-primary">
                          Status: {notif.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-surface-container-low border-t border-border-subtle flex items-center justify-between shrink-0">
          <span className="text-[11px] text-text-secondary">
            Drive ID: <span className="font-mono">{drive.id}</span>
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
