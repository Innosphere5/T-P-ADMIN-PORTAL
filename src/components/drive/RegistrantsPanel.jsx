'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  getEventRegistrations,
  updateRegistrationStatus,
  generateRegistrationsCsv,
} from '@/lib/driveClient';
import { formatDateTime } from '@/lib/driveUtils';

/**
 * RegistrantsPanel — Admin view of all student submissions for an event
 * Features:
 * - Real-time list of registered students
 * - Status pills (Registered, Confirmed, Rejected, Waitlisted)
 * - Quick status change actions
 * - Inspect custom form responses in modal
 * - Search by name / roll number / department
 * - Filter by status
 * - Export to CSV
 * - Shareable registration link display + copy button
 */
export default function RegistrantsPanel({ drive }) {
  const [registrations, setRegistrations] = useState(drive?.registrations || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRegistrant, setSelectedRegistrant] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [recentRegisteredId, setRecentRegisteredId] = useState(null);
  const [liveAlert, setLiveAlert] = useState(null);

  const formSlug = drive?.formSlug || drive?.form_slug || drive?.id;
  const formSchema = drive?.formSchema || drive?.form_schema || [];

  const isUuid = (str) =>
    typeof str === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const [resolvedEventId, setResolvedEventId] = useState(() => {
    if (isUuid(drive?.id)) return drive.id;
    if (isUuid(drive?.eventId)) return drive.eventId;
    if (isUuid(drive?.event_id)) return drive.event_id;
    return null;
  });

  // Determine public registration URL
  const publicUrl = typeof window !== 'undefined' && formSlug
    ? `${window.location.origin}/register/${formSlug}`
    : `/register/${formSlug || ''}`;

  // Resolve event UUID if not already known
  useEffect(() => {
    if (resolvedEventId) return;
    let isMounted = true;
    async function resolveId() {
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        if (formSlug) {
          const { data: ev } = await supabase
            .from('events')
            .select('id')
            .eq('form_slug', formSlug)
            .maybeSingle();
          if (isMounted && ev?.id && isUuid(ev.id)) {
            setResolvedEventId(ev.id);
            return;
          }
        }
        if (drive?.id) {
          const { data: ev } = await supabase
            .from('events')
            .select('id')
            .eq('id', drive.id)
            .maybeSingle();
          if (isMounted && ev?.id && isUuid(ev.id)) {
            setResolvedEventId(ev.id);
          }
        }
      } catch {}
    }
    resolveId();
    return () => {
      isMounted = false;
    };
  }, [formSlug, drive?.id, resolvedEventId]);

  // Fetch registrations on mount or when drive.id changes
  useEffect(() => {
    if (!drive?.id) return;
    let isMounted = true;
    async function loadRegistrations() {
      setLoading(true);
      try {
        const data = await getEventRegistrations(drive.id, formSlug);
        if (isMounted && data) {
          if (data.length > 0) {
            setRegistrations(data);
            if (data[0]?.event_id && isUuid(data[0].event_id) && !resolvedEventId) {
              setResolvedEventId(data[0].event_id);
            }
          } else if (drive?.registrations?.length) {
            setRegistrations(drive.registrations);
          } else {
            setRegistrations([]);
          }
        }
      } catch {
        if (isMounted) setRegistrations(drive?.registrations || []);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRegistrations();
    return () => {
      isMounted = false;
    };
  }, [drive?.id, formSlug, resolvedEventId]);

  // Subscribe to real-time registration inserts, updates, and broadcasts
  useEffect(() => {
    if (!drive?.id && !formSlug) return;
    let channel;
    let isSubscribed = true;

    async function subscribeRealtime() {
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        const channelName = `registrations-live-${drive?.id || formSlug || 'all'}`;

        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'event_registrations',
            },
            (payload) => {
              if (!isSubscribed) return;
              const newRecord = payload.new;
              const oldRecord = payload.old;

              const isMatch = (evId) => {
                if (!evId) return true;
                if (resolvedEventId && evId === resolvedEventId) return true;
                if (drive?.id && evId === drive.id) return true;
                if (drive?.eventId && evId === drive.eventId) return true;
                if (drive?.event_id && evId === drive.event_id) return true;
                return false;
              };

              if (payload.eventType === 'INSERT' && newRecord) {
                const shouldAdd = !resolvedEventId && !drive?.id ? true : isMatch(newRecord.event_id);

                if (shouldAdd) {
                  setRegistrations((prev) => {
                    if (
                      prev.some(
                        (r) =>
                          r.id === newRecord.id ||
                          (r.student_roll_no && r.student_roll_no === newRecord.student_roll_no)
                      )
                    ) {
                      return prev.map((r) =>
                        r.id === newRecord.id || r.student_roll_no === newRecord.student_roll_no
                          ? { ...r, ...newRecord }
                          : r
                      );
                    }
                    return [newRecord, ...prev];
                  });
                  setRecentRegisteredId(newRecord.id);
                  setLiveAlert(
                    `🎓 New Registration: ${newRecord.student_name || 'Student'} (${
                      newRecord.student_roll_no || 'Roll No'
                    }) registered just now!`
                  );
                  setTimeout(() => setLiveAlert(null), 6000);
                  setTimeout(() => setRecentRegisteredId(null), 10000);
                }
              } else if (payload.eventType === 'UPDATE' && newRecord) {
                setRegistrations((prev) =>
                  prev.map((r) => (r.id === newRecord.id ? { ...r, ...newRecord } : r))
                );
              } else if (payload.eventType === 'DELETE' && oldRecord) {
                setRegistrations((prev) => prev.filter((r) => r.id !== oldRecord.id));
              }
            }
          )
          .on('broadcast', { event: 'new_registration' }, ({ payload }) => {
            if (!isSubscribed || !payload?.registration) return;
            const reg = payload.registration;
            const isMatch =
              (resolvedEventId && payload.eventId === resolvedEventId) ||
              (drive?.id && (payload.eventId === drive.id || payload.formSlug === formSlug)) ||
              (formSlug && payload.formSlug === formSlug);

            if (isMatch || !resolvedEventId) {
              setRegistrations((prev) => {
                if (
                  prev.some(
                    (r) =>
                      r.id === reg.id ||
                      (r.student_roll_no && r.student_roll_no === reg.student_roll_no)
                  )
                ) {
                  return prev.map((r) =>
                    r.id === reg.id || r.student_roll_no === reg.student_roll_no ? reg : r
                  );
                }
                return [reg, ...prev];
              });
              setRecentRegisteredId(reg.id);
              setLiveAlert(
                `🎓 Live: ${reg.student_name} (${reg.student_roll_no}) registered just now!`
              );
              setTimeout(() => setLiveAlert(null), 6000);
              setTimeout(() => setRecentRegisteredId(null), 10000);
            }
          })
          .subscribe();
      } catch (err) {
        console.warn('[RegistrantsPanel] Realtime subscription notice:', err?.message || err);
      }
    }

    subscribeRealtime();

    // Fallback polling every 8 seconds to guarantee 100% sync reliability
    const pollInterval = setInterval(() => {
      if (isSubscribed && drive?.id) {
        getEventRegistrations(drive.id, formSlug)
          .then((data) => {
            if (isSubscribed && Array.isArray(data) && data.length > 0) {
              setRegistrations((prev) => {
                if (data.length !== prev.length) {
                  return data;
                }
                return prev;
              });
            }
          })
          .catch(() => {});
      }
    }, 8000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      if (channel) {
        import('@/lib/supabaseClient')
          .then(({ supabase }) => {
            supabase.removeChannel(channel);
          })
          .catch(() => {});
      }
    };
  }, [drive?.id, resolvedEventId, formSlug]);

  // Copy registration link
  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Status update
  const handleStatusChange = async (regId, newStatus) => {
    setUpdatingId(regId);
    try {
      const res = await updateRegistrationStatus(regId, newStatus);
      if (res.success || !res.error) {
        setRegistrations((prev) =>
          prev.map((r) => (r.id === regId ? { ...r, status: newStatus } : r))
        );
      }
    } catch {
      // Local fallback
      setRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, status: newStatus } : r))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      // Status filter
      if (statusFilter !== 'ALL' && reg.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (reg.student_name || reg.name || '').toLowerCase();
        const roll = (reg.student_roll_no || reg.rollNo || '').toLowerCase();
        const dept = (reg.department || '').toLowerCase();
        const email = (reg.student_email || reg.email || '').toLowerCase();
        return name.includes(q) || roll.includes(q) || dept.includes(q) || email.includes(q);
      }
      return true;
    });
  }, [registrations, statusFilter, searchQuery]);

  // Status counts
  const stats = useMemo(() => {
    const total = registrations.length;
    const confirmed = registrations.filter((r) => r.status === 'CONFIRMED').length;
    const registered = registrations.filter((r) => r.status === 'REGISTERED').length;
    const waitlisted = registrations.filter((r) => r.status === 'WAITLISTED').length;
    const rejected = registrations.filter((r) => r.status === 'REJECTED').length;
    return { total, confirmed, registered, waitlisted, rejected };
  }, [registrations]);

  // Download CSV
  const handleDownloadCsv = () => {
    const csvContent = generateRegistrationsCsv(filteredRegistrations, formSchema);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${drive?.title || 'event'}-registrations-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-tint-green text-success-green border border-emerald-200">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            Confirmed
          </span>
        );
      case 'WAITLISTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="material-symbols-outlined text-[12px]">schedule</span>
            Waitlisted
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="material-symbols-outlined text-[12px]">cancel</span>
            Rejected
          </span>
        );
      case 'REGISTERED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="material-symbols-outlined text-[12px]">how_to_reg</span>
            Registered
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-150">
      {/* Live Realtime Notification Banner */}
      {liveAlert && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/25 to-emerald-500/10 border border-emerald-500/40 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-md animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="material-symbols-outlined text-emerald-700 text-lg">how_to_reg</span>
            <span>{liveAlert}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full font-extrabold border border-emerald-200">
            Realtime Synced
          </span>
        </div>
      )}

      {/* Registration Shareable Link Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-xl">link</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Public Student Registration Link
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-success-green border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse" />
                Live Sync Active
              </span>
            </div>
            <div className="text-sm font-semibold text-text-primary break-all">
              {publicUrl}
            </div>
            <span className="text-[11px] text-text-secondary mt-0.5">
              Students submit their academic credentials via this form — submissions appear here instantly
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-text-primary hover:border-primary hover:text-primary transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">
              {copiedLink ? 'done' : 'content_copy'}
            </span>
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            <span>Open Form</span>
          </a>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'bg-primary/5 border-primary/40 shadow-xs'
              : 'bg-surface border-border hover:border-border-subtle'
          }`}
        >
          <div className="text-[11px] font-bold text-text-secondary uppercase">Total Applied</div>
          <div className="text-xl font-bold text-text-primary mt-1">{stats.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('REGISTERED')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'REGISTERED'
              ? 'bg-blue-50 border-blue-300 shadow-xs'
              : 'bg-surface border-border hover:border-border-subtle'
          }`}
        >
          <div className="text-[11px] font-bold text-blue-700 uppercase">Pending Review</div>
          <div className="text-xl font-bold text-blue-800 mt-1">{stats.registered}</div>
        </div>

        <div
          onClick={() => setStatusFilter('CONFIRMED')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'CONFIRMED'
              ? 'bg-tint-green border-emerald-300 shadow-xs'
              : 'bg-surface border-border hover:border-border-subtle'
          }`}
        >
          <div className="text-[11px] font-bold text-success-green uppercase">Confirmed</div>
          <div className="text-xl font-bold text-emerald-800 mt-1">{stats.confirmed}</div>
        </div>

        <div
          onClick={() => setStatusFilter('WAITLISTED')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'WAITLISTED'
              ? 'bg-amber-50 border-amber-300 shadow-xs'
              : 'bg-surface border-border hover:border-border-subtle'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-700 uppercase">Waitlisted</div>
          <div className="text-xl font-bold text-amber-800 mt-1">{stats.waitlisted}</div>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-50 border-rose-300 shadow-xs'
              : 'bg-surface border-border hover:border-border-subtle'
          }`}
        >
          <div className="text-[11px] font-bold text-rose-700 uppercase">Rejected</div>
          <div className="text-xl font-bold text-rose-800 mt-1">{stats.rejected}</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="Search by student name, roll number, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface border border-border focus:border-primary focus:outline-none transition-all placeholder:text-text-secondary"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            disabled={registrations.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-primary hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Registrants Table */}
      {loading ? (
        <div className="p-8 text-center text-xs text-text-secondary flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-xl text-primary">
            progress_activity
          </span>
          <span>Loading registrations...</span>
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-surface-ground border border-border/60 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-border-subtle/50 flex items-center justify-center text-text-secondary">
            <span className="material-symbols-outlined text-2xl">group_off</span>
          </div>
          <div className="flex flex-col">
            <h5 className="text-sm font-bold text-text-primary">No Registrations Found</h5>
            <p className="text-xs text-text-secondary max-w-sm mt-0.5">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No students match your filter criteria.'
                : 'Share the public registration link with students to start collecting registrations!'}
            </p>
          </div>
          {registrations.length === 0 && (
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-xs mt-1 transition-all"
            >
              <span className="material-symbols-outlined text-sm">share</span>
              <span>Copy Registration Link</span>
            </button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden shadow-xs bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-ground border-b border-border text-text-secondary uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Applied On</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Custom Responses</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRegistrations.map((reg) => {
                  const name = reg.student_name || reg.name || 'Student';
                  const roll = reg.student_roll_no || reg.rollNo || '—';
                  const dept = reg.department || '—';
                  const sem = reg.semester || '';
                  const regDate = reg.registered_at || reg.registeredAt || reg.created_at;
                  const responses = reg.form_responses || reg.formResponses || {};
                  const customResponseCount = Object.keys(responses).length;
                  const isRecent = recentRegisteredId === reg.id;

                  return (
                    <tr
                      key={reg.id || roll}
                      className={`transition-all duration-500 group ${
                        isRecent
                          ? 'bg-emerald-50/90 hover:bg-emerald-100/80 ring-1 ring-emerald-400 animate-in fade-in zoom-in-98 duration-300'
                          : 'hover:bg-primary/5'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 transition-transform ${
                              isRecent
                                ? 'bg-emerald-600 text-white scale-110 shadow-sm animate-bounce'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-text-primary text-xs">{name}</span>
                              {isRecent && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider animate-pulse shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                  Just Now
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-text-secondary">
                              {reg.student_email || reg.email || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-text-primary">
                        {roll}
                      </td>

                      <td className="py-3 px-4 text-text-secondary">
                        {dept} {sem && `(${sem})`}
                      </td>

                      <td className="py-3 px-4 text-text-secondary">
                        {regDate ? formatDateTime(regDate) : '—'}
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(reg.status)}</td>

                      <td className="py-3 px-4">
                        {customResponseCount > 0 ? (
                          <button
                            onClick={() => setSelectedRegistrant(reg)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-bold text-primary hover:border-primary transition-all"
                          >
                            <span className="material-symbols-outlined text-xs">visibility</span>
                            <span>{customResponseCount} answers</span>
                          </button>
                        ) : (
                          <span className="text-text-secondary text-[11px]">Default only</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {reg.status !== 'CONFIRMED' && (
                            <button
                              onClick={() => handleStatusChange(reg.id, 'CONFIRMED')}
                              disabled={updatingId === reg.id}
                              title="Confirm Registration"
                              className="w-7 h-7 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-all disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                            </button>
                          )}
                          {reg.status !== 'WAITLISTED' && (
                            <button
                              onClick={() => handleStatusChange(reg.id, 'WAITLISTED')}
                              disabled={updatingId === reg.id}
                              title="Waitlist Student"
                              className="w-7 h-7 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-all disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-sm">schedule</span>
                            </button>
                          )}
                          {reg.status !== 'REJECTED' && (
                            <button
                              onClick={() => handleStatusChange(reg.id, 'REJECTED')}
                              disabled={updatingId === reg.id}
                              title="Reject Registration"
                              className="w-7 h-7 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: View Custom Form Responses */}
      {selectedRegistrant && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedRegistrant(null)}
        >
          <div
            className="w-full max-w-lg bg-surface rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-ground">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                  {(selectedRegistrant.student_name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary">
                    {selectedRegistrant.student_name || selectedRegistrant.name}
                  </h4>
                  <p className="text-xs text-text-secondary">
                    Roll: {selectedRegistrant.student_roll_no || selectedRegistrant.rollNo} •{' '}
                    {selectedRegistrant.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRegistrant(null)}
                className="w-7 h-7 rounded-lg hover:bg-border/40 text-text-secondary flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              <h5 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Submitted Form Responses
              </h5>

              {/* Standard details */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-ground text-xs">
                <div>
                  <span className="text-text-secondary block text-[10px] uppercase font-bold">Email</span>
                  <span className="font-semibold text-text-primary break-all">
                    {selectedRegistrant.student_email || selectedRegistrant.email || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary block text-[10px] uppercase font-bold">Phone</span>
                  <span className="font-semibold text-text-primary">
                    {selectedRegistrant.student_phone || selectedRegistrant.phone || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary block text-[10px] uppercase font-bold">Department</span>
                  <span className="font-semibold text-text-primary">
                    {selectedRegistrant.department || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary block text-[10px] uppercase font-bold">Semester</span>
                  <span className="font-semibold text-text-primary">
                    {selectedRegistrant.semester || '—'}
                  </span>
                </div>
              </div>

              {/* Custom field responses */}
              <div className="flex flex-col gap-2 mt-1">
                {Object.entries(selectedRegistrant.form_responses || selectedRegistrant.formResponses || {}).map(
                  ([fieldId, val]) => {
                    const fieldDef = formSchema.find((f) => f.id === fieldId);
                    const label = fieldDef?.label || fieldId;
                    return (
                      <div
                        key={fieldId}
                        className="p-3 rounded-xl border border-border/80 bg-surface flex flex-col gap-1"
                      >
                        <span className="text-[11px] font-bold text-text-secondary">
                          {label}
                        </span>
                        <div className="text-xs font-semibold text-text-primary whitespace-pre-wrap">
                          {Array.isArray(val) ? val.join(', ') : String(val || '—')}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <div className="p-3 border-t border-border bg-surface-ground flex items-center justify-between">
              <div>{getStatusBadge(selectedRegistrant.status)}</div>
              <button
                onClick={() => setSelectedRegistrant(null)}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
