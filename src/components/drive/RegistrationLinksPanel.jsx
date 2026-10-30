'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { deriveRegistrationLinkStatus, formatDateTime, generateRegistrationsCsv } from '@/lib/driveUtils';
import { getDriveRegistrations } from '@/lib/driveClient';

/**
 * RegistrationLinksPanel — Manages registration links (Google Docs/Forms/Portals)
 * AND displays the live roster of registered students who submitted from their phones.
 */
export default function RegistrationLinksPanel({ drive, onSaveLink, onDeleteLink }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Form fields
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [formError, setFormError] = useState('');

  // Registered Students State
  const [registrations, setRegistrations] = useState([]);
  const [isLoadingRegs, setIsLoadingRegs] = useState(false);
  const [regSearch, setRegSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const links = drive?.registrationLinks || [];

  // Load registered students for this drive
  const loadRegistrations = useCallback(async () => {
    if (!drive?.id) return;
    setIsLoadingRegs(true);
    try {
      const data = await getDriveRegistrations(drive.id);
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error loading registrations:', err);
    } finally {
      setIsLoadingRegs(false);
    }
  }, [drive?.id]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const handleOpenForm = (linkToEdit = null) => {
    if (linkToEdit) {
      setEditingLink(linkToEdit);
      setLabel(linkToEdit.label || '');
      setUrl(linkToEdit.url || '');
      setOpensAt(linkToEdit.opensAt ? linkToEdit.opensAt.slice(0, 16) : '');
      setClosesAt(linkToEdit.closesAt ? linkToEdit.closesAt.slice(0, 16) : '');
      setEnabled(linkToEdit.enabled !== false);
    } else {
      setEditingLink(null);
      setLabel('Official Google Docs / Form Registration');
      setUrl('');
      setOpensAt('');
      setClosesAt(drive?.registrationDeadline ? drive.registrationDeadline.slice(0, 16) : '');
      setEnabled(true);
    }
    setFormError('');
    setShowAddForm(true);
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!label.trim()) {
      setFormError('Please enter a descriptive label for this registration link');
      return;
    }
    if (!url.trim()) {
      setFormError('Please enter a destination URL (Google Docs, Google Form, or portal)');
      return;
    }
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      setFormError('Registration URL must start with https://');
      return;
    }

    const payload = {
      id: editingLink ? editingLink.id : undefined,
      label: label.trim(),
      url: url.trim(),
      opensAt: opensAt ? new Date(opensAt).toISOString() : null,
      closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      enabled,
    };

    onSaveLink(payload);
    setShowAddForm(false);
    setEditingLink(null);
  };

  const handleCopy = (id, linkUrl) => {
    navigator.clipboard?.writeText(linkUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleExportCsv = () => {
    if (registrations.length === 0) return;
    const csvContent = generateRegistrationsCsv(filteredRegistrations, drive);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `Registrations_${(drive.title || 'Drive').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (regSearch.trim()) {
        const q = regSearch.toLowerCase().trim();
        const nameMatch = (r.student_name || r.name || '').toLowerCase().includes(q);
        const rollMatch = (r.roll_no || r.roll_number || '').toLowerCase().includes(q);
        const deptMatch = (r.department || '').toLowerCase().includes(q);
        const emailMatch = (r.email || '').toLowerCase().includes(q);
        return nameMatch || rollMatch || deptMatch || emailMatch;
      }
      return true;
    });
  }, [registrations, statusFilter, regSearch]);

  const isGoogleDoc = (linkUrl) => {
    if (!linkUrl) return false;
    return linkUrl.includes('docs.google.com') || linkUrl.includes('forms.google.com');
  };

  return (
    <div className="flex flex-col gap-7">
      {/* ========================================================= */}
      {/* SECTION 1: REGISTRATION LINKS & GOOGLE DOCS PORTALS      */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-text-primary">
                Student Registration Portals &amp; Google Docs Links
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tint-blue text-info-blue border border-blue-200">
                {links.length} Configured
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Official links shared with students for Google Docs, Google Forms, or registration portals
            </p>
          </div>

          <button
            onClick={() => handleOpenForm(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-white font-label-button text-xs font-semibold hover:bg-primary-hover shadow-xs transition-all"
          >
            <span className="material-symbols-outlined text-sm">add_link</span>
            <span>+ Add External Link</span>
          </button>
        </div>

        {/* Official Auto-Generated Dynamic Registration Form Link */}
        {drive && (drive.slug || drive.id) && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#6B0018] text-[#E7B94A] flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                📝
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs text-text-primary">
                    Official Student Registration Form
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#6B0018] text-white">
                    Auto-Generated Form Link
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tint-green text-success-green border border-emerald-200">
                    Live &amp; Synced to App
                  </span>
                </div>
                <a
                  href={typeof window !== 'undefined' ? `${window.location.origin}/drives/${drive.slug || drive.id}` : `/drives/${drive.slug || drive.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-info-blue hover:underline truncate max-w-lg mt-0.5 font-mono"
                >
                  {typeof window !== 'undefined' ? `${window.location.origin}/drives/${drive.slug || drive.id}` : `/drives/${drive.slug || drive.id}`}
                </a>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {(drive.customForm || drive.formSchema || []).length} dynamic questions configured by T&amp;P. Students can open this link in mobile or web to register.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const urlToCopy = typeof window !== 'undefined' ? `${window.location.origin}/drives/${drive.slug || drive.id}` : `/drives/${drive.slug || drive.id}`;
                  handleCopy('official_link', urlToCopy);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  copiedId === 'official_link'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-border-subtle text-text-primary hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {copiedId === 'official_link' ? 'check' : 'content_copy'}
                </span>
                <span>{copiedId === 'official_link' ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <a
                href={typeof window !== 'undefined' ? `${window.location.origin}/drives/${drive.slug || drive.id}` : `/drives/${drive.slug || drive.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6B0018] text-white text-xs font-semibold hover:bg-[#85001F] transition shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                <span>Test Web Form</span>
              </a>
            </div>
          </div>
        )}

        {/* Add / Edit Form Modal */}
        {showAddForm && (
          <form
            onSubmit={handleSubmitForm}
            className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col gap-3 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-text-primary uppercase tracking-wider">
                  {editingLink ? 'Edit Registration Link' : 'New Registration Link'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-info-blue">
                  Google Docs / Forms Compatible
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-primary font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  Portal Label *
                </label>
                <input
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Official Google Docs Form, TCS iON Portal"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  Destination URL * (Google Docs / Form URL)
                </label>
                <input
                  required
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/... or Google Docs URL"
                  className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary font-mono text-[11px]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  Opens At (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  Closes At / Deadline
                </label>
                <input
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-subtle/80">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary font-semibold">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Enabled &amp; directly accessible to students in mobile app</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs"
                >
                  {editingLink ? 'Update Link' : 'Save Link'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Links List */}
        {links.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface-container-low border border-dashed border-border-subtle text-center flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-text-secondary">
              <span className="material-symbols-outlined text-xl">link_off</span>
            </div>
            <p className="text-xs font-semibold text-text-primary">No registration links configured yet</p>
            <p className="text-[11px] text-text-secondary max-w-sm">
              Add an official Google Docs link, Google Form, or corporate careers portal so scholars can tap and register directly from their phones.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {links.map((link) => {
              const status = deriveRegistrationLinkStatus(link);
              const isCopied = copiedId === link.id;
              const isGDoc = isGoogleDoc(link.url);

              return (
                <div
                  key={link.id}
                  className="p-3.5 rounded-xl bg-white border border-border-subtle shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isGDoc ? 'bg-blue-100 text-blue-700' : 'bg-tint-blue text-info-blue'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {isGDoc ? 'description' : 'link'}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-text-primary truncate">{link.label}</span>

                        {isGDoc && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Google Docs / Forms
                          </span>
                        )}

                        {status === 'OPEN' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tint-green text-success-green border border-emerald-200">
                            Active / Open
                          </span>
                        )}
                        {status === 'UPCOMING' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tint-blue text-info-blue border border-blue-200">
                            Scheduled
                          </span>
                        )}
                        {status === 'CLOSED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-text-secondary border border-border-subtle">
                            Closed
                          </span>
                        )}
                        {status === 'DISABLED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-primary border border-rose-200">
                            Disabled
                          </span>
                        )}
                      </div>

                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-info-blue hover:underline truncate max-w-md mt-0.5 font-mono"
                      >
                        {link.url}
                      </a>

                      <div className="flex items-center gap-3 text-[10px] text-text-secondary mt-1">
                        {link.closesAt && <span>Deadline: {formatDateTime(link.closesAt)}</span>}
                        <span>Live Sync: Enabled for Mobile Navigation</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => handleCopy(link.id, link.url)}
                      className="p-1.5 rounded-lg border border-border-subtle hover:bg-surface-container text-text-secondary hover:text-text-primary transition-colors"
                      title="Copy URL"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isCopied ? 'check' : 'content_copy'}
                      </span>
                    </button>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-info-blue text-xs font-semibold border border-blue-200 transition-colors"
                      title="Open Google Docs / Destination in new tab"
                    >
                      <span>Open Form</span>
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </a>

                    <button
                      onClick={() => handleOpenForm(link)}
                      className="p-1.5 rounded-lg border border-border-subtle hover:bg-surface-container text-text-secondary hover:text-text-primary transition-colors"
                      title="Edit Link"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>

                    <button
                      onClick={() => onDeleteLink(link.id)}
                      className="p-1.5 rounded-lg border border-border-subtle hover:bg-rose-50 text-text-secondary hover:text-primary transition-colors"
                      title="Delete Link"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SECTION 2: LIVE APPLICANT ROSTER (STUDENT REGISTRATIONS)   */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-4 pt-3 border-t border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-text-primary">
                Live Registered Scholars &amp; Candidates
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-primary text-white font-mono">
                {registrations.length} Total
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Verified registrations submitted by students from their mobile phones or web portal
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadRegistrations}
              disabled={isLoadingRegs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-surface-container-low text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors"
              title="Refresh live registrations"
            >
              <span className={`material-symbols-outlined text-sm ${isLoadingRegs ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{isLoadingRegs ? 'Syncing...' : 'Sync Roster'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={registrations.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container border border-border-subtle hover:bg-surface-container-high text-text-primary text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter bar for registrations */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
              search
            </span>
            <input
              type="text"
              value={regSearch}
              onChange={(e) => setRegSearch(e.target.value)}
              placeholder="Search by scholar name, roll no, department..."
              className="w-full h-8 pl-8 pr-3 bg-surface-container-low rounded-lg text-xs text-text-primary border border-border-subtle outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2 rounded-lg bg-surface-container-low border border-border-subtle text-xs text-text-primary outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="REGISTERED">Registered</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="OFFERED">Offered</option>
            </select>
          </div>
        </div>

        {/* Registrations Table */}
        {filteredRegistrations.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface-container-low border border-dashed border-border-subtle text-center flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center text-text-secondary">
              <span className="material-symbols-outlined text-xl">group</span>
            </div>
            <p className="text-xs font-semibold text-text-primary">
              {regSearch ? 'No registered scholars match your search' : 'No registrations received yet'}
            </p>
            <p className="text-[11px] text-text-secondary max-w-sm">
              When students open the mobile app and register for this drive/event, their credentials and profile details will appear here instantly in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-subtle bg-white shadow-xs">
            <table className="w-full text-left text-xs text-text-primary border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-border-subtle text-[10px] uppercase font-bold text-text-secondary tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Scholar Name</th>
                  <th className="py-2.5 px-3">Roll Number</th>
                  <th className="py-2.5 px-3">Department &amp; Term</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">CGPA</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Registered At</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/70">
                {filteredRegistrations.map((reg, idx) => (
                  <tr key={reg.id || idx} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-2.5 px-3 text-text-secondary font-mono text-[11px]">{idx + 1}</td>

                    <td className="py-2.5 px-3 font-semibold text-text-primary">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                          {(reg.student_name || 'S')[0].toUpperCase()}
                        </div>
                        <span>{reg.student_name || reg.name || 'Scholar'}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold text-primary">
                      {reg.roll_no || reg.roll_number || '—'}
                    </td>

                    <td className="py-2.5 px-3 text-text-secondary text-[11px]">
                      <div>{reg.department || 'BCA'}</div>
                      <div className="text-[10px] text-text-secondary/80">{reg.semester || '3rd Year'}</div>
                    </td>

                    <td className="py-2.5 px-3 text-text-secondary text-[11px]">
                      <div>{reg.email || '—'}</div>
                      <div className="text-[10px] text-text-secondary/80">{reg.phone || '—'}</div>
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold text-text-primary">
                      {reg.cgpa ? `${reg.cgpa}` : '—'}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-info-blue border border-blue-200">
                        <span className="material-symbols-outlined text-[10px]">smartphone</span>
                        {reg.registration_source === 'google_docs' ? 'Google Docs' : 'Mobile App'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-text-secondary text-[10px] whitespace-nowrap">
                      {formatDateTime(reg.registered_at || reg.createdAt)}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tint-green text-success-green border border-emerald-200">
                        {reg.status || 'REGISTERED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
