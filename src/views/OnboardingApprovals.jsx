'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle,
  RefreshCw,
  GraduationCap,
  Calendar,
  Building2,
  FileCheck
} from 'lucide-react';
import Modal from '../components/Modal';
import StudentLinkedInProfileModal from '../components/student/StudentLinkedInProfileModal';

export default function OnboardingApprovals({ globalSearch = '' }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | 'ALL'
  const [localSearch, setLocalSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [linkedInStudent, setLinkedInStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [studentToReject, setStudentToReject] = useState(null);
  const [studentToRevoke, setStudentToRevoke] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [revocationReason, setRevocationReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [hasSuccessfulSync, setHasSuccessfulSync] = useState(false);

  const fetchRequests = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsLiveSyncing(true);

    try {
      const res = await fetch('/api/admin/requests?status=ALL', {
        headers: {
          'Authorization': 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
      });
      if (!res.ok) throw new Error(`Registration sync failed (${res.status}).`);
      const data = await res.json();
      if (!Array.isArray(data.requests)) throw new Error('The server returned an invalid registration list.');
      setRequests(data.requests);
      setHasSuccessfulSync(true);
      setSyncError(null);
    } catch (err) {
      console.warn('Real-time API error in fetchRequests:', err);
      setSyncError(err.message || 'Unable to sync live registrations.');
    } finally {
      if (!isSilent) setLoading(false);
      setTimeout(() => setIsLiveSyncing(false), 500);
    }
  };

  useEffect(() => {
    fetchRequests(false);

    // Real-time automatic synchronization with database every 3.5 seconds
    const interval = setInterval(() => {
      fetchRequests(true);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Approve action
  const handleApprove = async (student) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/requests/${student.id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.request) {
        throw new Error(data.error || `Approval failed (${res.status}).`);
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === student.id
            ? { ...r, ...data.request }
            : r
        )
      );

      showToast(`Student ${data.request.full_name || data.request.name} (${data.request.roll_number || data.request.roll_no}) approved! They can now log in.`, 'success');
      if (showDetailModal) setShowDetailModal(false);
    } catch (err) {
      showToast(err.message || 'Unable to approve this registration.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject action
  const handleInitiateReject = (student) => {
    setStudentToReject(student);
    setRejectionReason('Registration details do not match university enrollment registrar records.');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!studentToReject) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/requests/${studentToReject.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.request) {
        throw new Error(data.error || `Rejection failed (${res.status}).`);
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === studentToReject.id
            ? { ...r, ...data.request }
            : r
        )
      );

      showToast(`Registration for ${data.request.full_name || data.request.name} rejected. User has been locked out.`, 'success');
      setShowRejectModal(false);
      setStudentToReject(null);
      if (showDetailModal) setShowDetailModal(false);
    } catch (err) {
      showToast(err.message || 'Unable to reject this registration.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateRevoke = (student) => {
    setStudentToRevoke(student);
    setRevocationReason('');
    setShowRevokeModal(true);
  };

  const handleConfirmRevoke = async () => {
    if (!studentToRevoke || !revocationReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/requests/${studentToRevoke.id}/revoke`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ reason: revocationReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.request) {
        throw new Error(data.error || `Revocation failed (${res.status}).`);
      }

      setRequests((prev) => prev.map((record) => (
        record.id === studentToRevoke.id ? { ...record, ...data.request } : record
      )));
      showToast(`Access for ${data.request.full_name || data.request.name} was revoked.`, 'success');
      setShowRevokeModal(false);
      setStudentToRevoke(null);
      if (showDetailModal) setShowDetailModal(false);
    } catch (err) {
      showToast(err.message || 'Unable to revoke student access.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Counts
  const counts = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === 'PENDING').length,
      approved: requests.filter((r) => r.status === 'APPROVED' || r.status === 'VERIFIED').length,
      rejected: requests.filter((r) => r.status === 'REJECTED').length,
      revoked: requests.filter((r) => r.status === 'REVOKED').length,
      total: requests.length,
    };
  }, [requests]);

  // Filtering
  const filteredRequests = useMemo(() => {
    const query = (localSearch || globalSearch).toLowerCase().trim();
    return requests.filter((req) => {
      // Tab filter
      if (activeTab !== 'ALL' && req.status !== activeTab) return false;

      // Department filter
      const department = (req.department || '').toLowerCase();
      if (selectedDept !== 'all' && !department.includes(selectedDept.toLowerCase())) {
        return false;
      }

      // Search query
      if (query) {
        const matchName = (req.full_name || req.name || '').toLowerCase().includes(query);
        const matchRoll = (req.roll_number || req.roll_no || '').toLowerCase().includes(query);
        const matchDept = department.includes(query);
        return matchName || matchRoll || matchDept;
      }

      return true;
    });
  }, [requests, activeTab, selectedDept, localSearch, globalSearch]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-white transition-all transform animate-in slide-in-from-bottom duration-300 ${
            toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toastMessage.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/30 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">
                Student Onboarding Approvals
              </h1>
              <p className="text-xs sm:text-sm text-outline">
                Gated review queue: All new student signups require manual verification before gaining portal access.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className={`w-2 h-2 rounded-full ${syncError ? 'bg-rose-600' : isLiveSyncing ? 'bg-emerald-400 scale-125' : 'bg-emerald-600 animate-pulse'} transition-all`} />
            <span>{syncError ? 'Database sync unavailable' : 'Live DB Sync Active'}</span>
          </div>
          <button
            onClick={() => fetchRequests(false)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-outline-variant/40 bg-surface text-on-surface hover:bg-surface-variant/40 transition flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <div
          onClick={() => setActiveTab('PENDING')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'PENDING'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30'
              : 'bg-white border-outline-variant/30 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Awaiting Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-on-surface">{hasSuccessfulSync ? counts.pending : '—'}</div>
          <p className="text-xs text-outline mt-1">Pending admin decision</p>
        </div>

        <div
          onClick={() => setActiveTab('APPROVED')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'APPROVED'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30'
              : 'bg-white border-outline-variant/30 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Approved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-on-surface">{hasSuccessfulSync ? counts.approved : '—'}</div>
          <p className="text-xs text-outline mt-1">Full app access granted</p>
        </div>

        <div
          onClick={() => setActiveTab('REJECTED')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'REJECTED'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/30'
              : 'bg-white border-outline-variant/30 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Rejected</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-on-surface">{hasSuccessfulSync ? counts.rejected : '—'}</div>
          <p className="text-xs text-outline mt-1">Blocked / Disallowed</p>
        </div>

        <div
          onClick={() => setActiveTab('ALL')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'ALL'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/30'
              : 'bg-white border-outline-variant/30 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Total Recorded</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-on-surface">{hasSuccessfulSync ? counts.total : '—'}</div>
          <p className="text-xs text-outline mt-1">All applications</p>
        </div>

        <div
          onClick={() => setActiveTab('REVOKED')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'REVOKED'
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/30'
              : 'bg-white border-outline-variant/30 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Revoked</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-on-surface">{hasSuccessfulSync ? counts.revoked : '—'}</div>
          <p className="text-xs text-outline mt-1">Access removed</p>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            placeholder="Search student by name, roll no, or department..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-variant/20 border border-outline-variant/40 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium bg-surface-variant/20 border border-outline-variant/40 rounded-xl text-on-surface focus:outline-hidden"
          >
            <option value="all">All Departments</option>
            <option value="BCA">BCA</option>
            <option value="B.Sc IT">B.Sc IT</option>
            <option value="B.Sc Cyber Security">B.Sc Cyber Security</option>
            <option value="B.Sc (Hons) AI & ML">B.Sc (Hons) AI & ML</option>
          </select>

          {/* Quick tab pills */}
          <div className="flex items-center bg-surface-variant/30 p-1 rounded-xl">
            {['PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'ALL'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === tab
                    ? 'bg-white shadow-xs text-primary'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {tab === 'PENDING' ? `Pending (${hasSuccessfulSync ? counts.pending : '—'})` : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table / Requests List */}
      <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        {syncError && (
          <div role="alert" className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">
            {syncError} Displayed totals may be out of date until the database reconnects.
          </div>
        )}
        {loading ? (
          <div className="p-12 text-center text-outline flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm">Fetching student requests from secure server...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center text-outline flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-variant/40 flex items-center justify-center text-outline">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-on-surface">No Requests Found</h3>
            <p className="text-xs max-w-sm">
              {activeTab === 'PENDING'
                ? (syncError ? 'Unable to load pending registrations while the database is unavailable.' : 'All student signups have been reviewed! There are no pending approvals in the queue.')
                : 'No registration records match the current filter or search criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-variant/20 border-b border-outline-variant/30 text-xs font-bold text-outline uppercase tracking-wider">
                  <th className="py-3.5 px-4">Student Details</th>
                  <th className="py-3.5 px-4">Academic Program</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-4">Approval Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredRequests.map((student) => {
                  const isPending = student.status === 'PENDING';
                  const isApproved = student.status === 'APPROVED';
                  const isRejected = student.status === 'REJECTED';
                  const isRevoked = student.status === 'REVOKED';

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-surface-variant/10 transition group"
                    >
                      {/* Name & Roll */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                            <img
                              src={student.avatar_url || student.avatar || '/default-avatar.png'}
                              alt={student.full_name || 'Student photo'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-on-surface flex items-center gap-2">
                              {student.full_name}
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowDetailModal(true);
                                }}
                                className="text-xs text-primary hover:underline font-normal opacity-0 group-hover:opacity-100 transition"
                              >
                                View full detail
                              </button>
                            </div>
                            <div className="text-xs text-outline flex items-center gap-2 mt-0.5">
                              <span className="font-mono bg-surface-variant/40 px-1.5 py-0.5 rounded text-[11px]">
                                {student.roll_number}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dept & Year */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-on-surface text-xs sm:text-sm">
                          {student.department}
                        </div>
                        <div className="text-xs text-outline mt-0.5 flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-outline" />
                          {student.year_semester}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-4 px-4 text-xs text-outline">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-outline" />
                          {student.created_at ? new Date(student.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }) : 'Not recorded'}
                        </div>
                        <div className="text-[11px] text-outline/80 mt-0.5">
                          {student.created_at ? new Date(student.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Pending Approval
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                        {isRevoked && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <ShieldCheck className="w-3 h-3" />
                            Revoked
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLinkedInStudent(student);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-[#0077B5] bg-[#0077B5]/10 hover:bg-[#0077B5]/20 border border-[#0077B5]/25 transition shadow-2xs flex items-center gap-1.5 font-bold text-xs cursor-pointer"
                            title="Inspect Complete Student Profile & Vault Documents"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Student Profile</span>
                          </button>

                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleApprove(student)}
                                disabled={actionLoading}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleInitiateReject(student)}
                                disabled={actionLoading}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          ) : isApproved ? (
                            <button
                              onClick={() => handleInitiateRevoke(student)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 transition disabled:opacity-50"
                            >
                              Revoke Access
                            </button>
                          ) : isRejected || isRevoked ? (
                            <button
                              onClick={() => handleApprove(student)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition"
                            >
                              Re-Approve
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Detail Modal */}
      {showDetailModal && selectedStudent && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Student Registration Review"
          maxWidth="max-w-xl"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-variant/20 border border-outline-variant/30">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                <img
                  src={selectedStudent.avatar_url || selectedStudent.avatar || '/default-avatar.png'}
                  alt={selectedStudent.full_name || 'Student photo'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface">{selectedStudent.full_name}</h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      selectedStudent.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedStudent.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedStudent.status === 'REVOKED'
                        ? 'bg-slate-100 text-slate-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedStudent.status}
                  </span>
                </div>
                <div className="text-xs text-outline mt-1 font-mono">{selectedStudent.roll_number}</div>
              </div>
            </div>

            {/* LinkedIn Profile Deep Dive Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setLinkedInStudent(selectedStudent);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0077B5] hover:bg-[#005E93] text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Full Student Dossier &amp; Vault Documents</span>
              </button>
            </div>

            {/* Field Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-surface rounded-xl border border-outline-variant/30">
                <span className="text-outline uppercase text-[10px] font-bold">Roll Number</span>
                <p className="font-semibold text-on-surface mt-1 font-mono">{selectedStudent.roll_number}</p>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-outline-variant/30">
                <span className="text-outline uppercase text-[10px] font-bold">Department</span>
                <p className="font-semibold text-on-surface mt-1">{selectedStudent.department}</p>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-outline-variant/30">
                <span className="text-outline uppercase text-[10px] font-bold">Year / Semester</span>
                <p className="font-semibold text-on-surface mt-1">{selectedStudent.year_semester}</p>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-outline-variant/30">
                <span className="text-outline uppercase text-[10px] font-bold">Registration Timestamp</span>
                <p className="font-semibold text-on-surface mt-1">
                  {new Date(selectedStudent.created_at).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Rejection notice if present */}
            {selectedStudent.rejection_reason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <span className="font-bold">Prior Rejection Reason:</span>
                <p className="mt-1">{selectedStudent.rejection_reason}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/30">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-outline hover:bg-surface-variant/30 transition"
              >
                Close
              </button>
              <button
                onClick={() => selectedStudent.status === 'APPROVED' ? handleInitiateRevoke(selectedStudent) : handleInitiateReject(selectedStudent)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition"
              >
                {selectedStudent.status === 'APPROVED' ? 'Revoke Access' : 'Reject Student'}
              </button>
              <button
                onClick={() => handleApprove(selectedStudent)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                Approve Student
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && studentToReject && (
        <Modal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Reject Student Registration"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800">
                <p className="font-bold">Student will be immediately barred from logging in.</p>
                <p className="mt-0.5">
                  The reason entered below will be displayed directly to{' '}
                  <span className="font-semibold">{studentToReject.full_name}</span> upon login attempt.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Roll number does not exist in registrar records, or incorrect department."
                className="w-full p-3 text-xs bg-surface-variant/20 border border-outline-variant/40 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              />
            </div>

            {/* Quick Reason Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-outline font-semibold">Quick reasons:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Roll number not in registrar batch list',
                  'Department mismatch',
                  'Duplicate student registration',
                  'Incorrect academic year/semester',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className="text-[11px] px-2.5 py-1 bg-surface-variant/30 hover:bg-surface-variant/60 rounded-lg text-outline hover:text-on-surface transition text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-outline hover:bg-surface-variant/30 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5"
              >
                <UserX className="w-3.5 h-3.5" />
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showRevokeModal && studentToRevoke && (
        <Modal
          isOpen={showRevokeModal}
          onClose={() => setShowRevokeModal(false)}
          title="Revoke Student Access"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800">
              Access for <span className="font-semibold">{studentToRevoke.full_name || studentToRevoke.name}</span> will be removed after the database confirms the change.
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                Reason for revocation
              </label>
              <textarea
                rows={3}
                value={revocationReason}
                onChange={(event) => setRevocationReason(event.target.value)}
                placeholder="Enter the reason for removing student access."
                className="w-full p-3 text-xs bg-surface-variant/20 border border-outline-variant/40 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-outline hover:bg-surface-variant/30 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={actionLoading || !revocationReason.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white transition disabled:opacity-50"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Full LinkedIn Style Student Profile & Dossier Modal */}
      <StudentLinkedInProfileModal
        isOpen={!!linkedInStudent}
        student={linkedInStudent}
        onClose={() => setLinkedInStudent(null)}
        onStatusChange={(targetStudent, action) => {
          setLinkedInStudent(null);
          if (action === 'APPROVE') handleApprove(targetStudent);
          if (action === 'REVOKE') handleInitiateRevoke(targetStudent);
        }}
      />
    </div>
  );
}
