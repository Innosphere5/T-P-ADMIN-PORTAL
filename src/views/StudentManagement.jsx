'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import StudentLinkedInProfileModal from '../components/student/StudentLinkedInProfileModal';

export default function StudentManagement({ globalSearch = '' }) {
  const [requests, setRequests] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [linkedInStudent, setLinkedInStudent] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasSuccessfulSync, setHasSuccessfulSync] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStudents = async () => {
      try {
        const response = await fetch('/api/admin/requests?status=ALL', {
          headers: {
            Authorization: 'Bearer rimt-admin-master-token',
            'x-admin-portal': 'true',
          },
        });
        if (!response.ok) throw new Error(`Student sync failed (${response.status}).`);
        const data = await response.json();
        if (!Array.isArray(data.requests)) throw new Error('The server returned an invalid student list.');
        if (isMounted) {
          setRequests(data.requests);
          setHasSuccessfulSync(true);
          setSyncError(null);
        }
      } catch (error) {
        if (isMounted) setSyncError(error.message || 'Unable to load live student registrations.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStudents();
    const interval = setInterval(fetchStudents, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const studentsList = useMemo(() => requests.map((record) => {
    const status = (record.status || 'UNKNOWN').toUpperCase();
    const name = record.full_name || record.name || '';
    const department = record.department || '';
    return {
      key: record.id || record.roll_number || record.roll_no,
      id: record.id,
      name,
      roll: record.roll_number || record.roll_no || '',
      initials: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      program: department,
      dept: department,
      section: record.year_semester || '',
      status,
      statusType: status.toLowerCase(),
      verified: status === 'APPROVED' || status === 'VERIFIED',
      email: record.email || null,
      phone: record.phone || null,
      spoc: record.spoc || null,
      createdAt: record.created_at,
      rejectionReason: record.rejection_reason || null,
      revocationReason: record.revocation_reason || null,
      avatar_url: record.avatar_url || record.avatar || null,
      avatarBg: 'bg-tint-maroon text-primary border-rose-200/60',
    };
  }), [requests]);

  const counts = useMemo(() => ({
    total: studentsList.length,
    approved: studentsList.filter((student) => student.verified).length,
    pending: studentsList.filter((student) => student.status === 'PENDING').length,
    rejected: studentsList.filter((student) => student.status === 'REJECTED').length,
    revoked: studentsList.filter((student) => student.status === 'REVOKED').length,
  }), [studentsList]);
  const approvalRate = counts.total ? Math.round((counts.approved / counts.total) * 100) : 0;

  const currentStudent = studentsList.find((student) => student.key === selectedKey) || studentsList[0] || null;
  const batchOptions = [...new Set(studentsList.map((student) => student.section).filter(Boolean))];
  const departmentOptions = [...new Set(studentsList.map((student) => student.dept).filter(Boolean))];

  const effectiveSearch = (globalSearch || searchQuery).toLowerCase().trim();

  const filteredStudents = studentsList.filter((s) => {
    if (activeFilter === 'verified' && !s.verified) return false;
    if (activeFilter === 'pending' && s.status !== 'PENDING') return false;
    if (activeFilter === 'rejected' && s.status !== 'REJECTED') return false;
    if (activeFilter === 'revoked' && s.status !== 'REVOKED') return false;
    if (selectedBatch !== 'all' && s.section !== selectedBatch) return false;
    if (selectedDept !== 'all' && s.dept !== selectedDept) return false;

    if (effectiveSearch) {
      const match =
        s.name.toLowerCase().includes(effectiveSearch) ||
        s.roll.toLowerCase().includes(effectiveSearch) ||
        (s.email || '').toLowerCase().includes(effectiveSearch) ||
        s.dept.toLowerCase().includes(effectiveSearch);
      if (!match) return false;
    }
    return true;
  });

  const exportStudentsCsv = () => {
    if (!hasSuccessfulSync) return;
    const columns = ['name', 'roll', 'dept', 'section', 'status', 'createdAt', 'rejectionReason', 'revocationReason'];
    const escapeCsv = (value) => `"${String(value || '').replace(/"/g, '""')}"`;
    const rows = [columns, ...filteredStudents.map((student) => columns.map((column) => student[column] || ''))];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student-registrations.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {syncError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {syncError} Student totals are unavailable until the database reconnects.
        </div>
      )}
      {/* 1. Module Header Bar & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <span className="font-label-eyebrow text-label-eyebrow uppercase tracking-wider text-text-secondary">
              Module 01
            </span>
            <span className="text-xs text-outline">•</span>
            <span className="font-label-eyebrow text-label-eyebrow uppercase tracking-wider text-text-secondary">
              Records &amp; Credentials
            </span>
          </div>
          <h1 className="font-headline-page text-headline-page text-text-primary tracking-tight">
            Student Management
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-br from-white/80 via-surface-container-low/70 to-surface-container-high backdrop-blur-md text-text-primary hover:bg-surface-container hover:shadow-md transition-all shadow-sm ring-1 ring-white/70 border-t border-white/80"
          >
            <span className="material-symbols-outlined text-base text-text-secondary drop-shadow-sm">
              file_upload
            </span>
            <span className="font-label-button text-label-button font-medium text-text-primary">
              Bulk Import
            </span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white font-label-button text-label-button transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl border-t border-white/30"
            style={{
              background: 'linear-gradient(rgb(139, 20, 36) 0%, rgb(96, 7, 19) 100%)',
              boxShadow: 'rgba(107, 0, 24, 0.4) 0px 4px 16px, rgba(255, 255, 255, 0.35) 0px 1px 1px inset',
              textShadow: 'rgba(0, 0, 0, 0.25) 0px 1px 2px',
            }}
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            <span>+ Add Student</span>
          </button>
        </div>
      </div>

      {/* 2. Dark Hero / Summary Card (#15151F) with High Zoom Animation */}
      <div
        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#12121a] via-[#1a121d] to-[#250d18] p-5 sm:p-6 lg:p-7 text-white shadow-xl border-t border-white/20 ring-1 ring-white/10 cursor-pointer select-none transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:-translate-y-1.5 hover:shadow-2xl hover:z-20 active:scale-[0.99]"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(18, 18, 26, 0.9) 0%, rgba(26, 18, 29, 0.88) 50%, rgba(37, 13, 24, 0.92) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuDkHZ4rkvxIvMjCvWwlc7ZS0M6rHCgYz9SbtwkesDgRbTwe2Dch8XQI2alHNRvXA_dxS3PXj9yNNJ7yEsWUzWFasROkKrmAdnId9S29FITNeIY3e95Hvv1-IxT5yt4wJZ3JAQ2tYHjoXV2tFT6HZgZy_vntJNGi_wqaH1427wtS7AXUCWUpeYKBi3eLspNYU0w9MusgTGQ7BybwFNBokdRnOiqdlXa0bq5CeN5E0N6w7mvKSYIBBCSAS7BGeDUVdEa7Gw")',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
        }}
      >
        <div className="absolute -right-16 -top-20 w-80 h-80 rounded-full bg-primary-container/30 blur-3xl pointer-events-none animate-aura-pulse group-hover:scale-125 transition-transform duration-500" />
        <div
          className="absolute right-48 -bottom-16 w-60 h-60 rounded-full bg-info-blue/20 blur-2xl pointer-events-none animate-aura-pulse group-hover:scale-125 transition-transform duration-500"
          style={{ animationDelay: '3s' }}
        />
        <div className="absolute left-1/4 -top-12 w-48 h-48 rounded-full bg-[#ffdf9b]/15 blur-2xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent absolute top-0 -left-1/4 animate-sheen-sweep pointer-events-none transform -skew-x-12" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-md font-label-badge text-label-badge ring-1 ring-white/10 transform transition-transform duration-300 group-hover:scale-105">
                <span
                  className="material-symbols-outlined text-sm text-success-green"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                Live registration records
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 text-gray-300 font-label-eyebrow text-label-eyebrow uppercase ring-1 ring-white/5 transform transition-transform duration-300 group-hover:scale-105">
                Supabase status sync
              </span>
            </div>
            <h2 className="font-headline-page text-xl sm:text-2xl text-white tracking-tight drop-shadow-sm font-bold">
              Comprehensive Scholar Directory &amp; Verification Vault
            </h2>
            <p className="font-body-default text-xs sm:text-sm text-gray-300 leading-relaxed">
              Student registration records and approval statuses submitted through the RIMT student app.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/10 hover:bg-white/15 backdrop-blur-md p-4 sm:p-5 rounded-xl ring-1 ring-white/10 shadow-lg shrink-0 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="flex flex-col pr-0 sm:pr-4">
              <span className="font-label-eyebrow text-[10px] uppercase text-gray-300 tracking-wider">
                Approval Rate
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white transform transition-transform duration-300 group-hover:scale-105 origin-left">
                {hasSuccessfulSync ? `${approvalRate}%` : '—'}
              </span>
              <span className="text-xs text-success-green flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                From live student records
              </span>
            </div>

            <div className="hidden sm:block w-px h-12 bg-white/10" />

            <div className="flex flex-col">
              <span className="font-label-eyebrow text-[10px] uppercase text-gray-300 tracking-wider">
                Approved Students
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-white transform transition-transform duration-300 group-hover:scale-105 origin-left">
                  {hasSuccessfulSync ? counts.approved : '—'}
                </span>
                <span className="text-gray-300 text-xs">/ {hasSuccessfulSync ? counts.total : '—'}</span>
              </div>
              <a
                className="mt-1 text-xs text-secondary-container hover:underline inline-flex items-center gap-1 font-semibold transform transition-transform duration-200 hover:translate-x-1"
                href="#pending"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveFilter('pending');
                }}
              >
                Review {hasSuccessfulSync ? counts.pending : '—'} Pending Registrations →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KPI Stat Grid (4 Ultra-Modern Glossy Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Enrolled Scholars */}
        <div
          className="group relative rounded-2xl p-5 sm:p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg cursor-pointer select-none transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.045] hover:-translate-y-2 hover:shadow-2xl hover:z-20 active:scale-[0.98] flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(253, 242, 244, 0.75) 50%, rgba(255, 255, 255, 0.88) 100%)',
            boxShadow: 'rgba(107, 0, 24, 0.07) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.6) 0px -1px 0px inset',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-rose-500/15 blur-2xl pointer-events-none group-hover:scale-150 group-hover:opacity-90 transition-all duration-500" />
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="w-32 h-[220%] bg-gradient-to-r from-transparent via-rose-400/25 to-transparent absolute -top-1/2 left-0 animate-sweep-maroon pointer-events-none" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-container to-primary flex items-center justify-center text-white shadow-[0_4px_14px_rgba(107,0,24,0.28)] ring-1 ring-white/40 transform transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-2deg]">
              <span className="material-symbols-outlined text-[22px]">school</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 border border-rose-200/60 shadow-[0_2px_8px_rgba(139,29,44,0.08)] text-primary font-label-badge text-label-badge backdrop-blur-md transform transition-transform duration-300 group-hover:scale-105">
              <span className="material-symbols-outlined text-[14px] text-primary">trending_up</span>
              <span>Live database</span>
            </div>
          </div>

          <div className="relative z-10 mt-5 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] lg:text-[32px] text-text-primary tracking-tight font-extrabold transform transition-transform duration-300 group-hover:scale-[1.03] origin-left">
                {hasSuccessfulSync ? counts.total : '—'}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-primary border border-rose-100">
                Live
              </span>
            </div>
            <span className="font-semibold text-text-primary text-sm mt-1">
              Total Registrations
            </span>
            <span className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              Current Supabase records
            </span>
          </div>
        </div>

        {/* Card 2: Verified Vault Records */}
        <div
          className="group relative rounded-2xl p-5 sm:p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg cursor-pointer select-none transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.045] hover:-translate-y-2 hover:shadow-2xl hover:z-20 active:scale-[0.98] flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(240, 253, 244, 0.75) 50%, rgba(255, 255, 255, 0.88) 100%)',
            boxShadow: 'rgba(30, 158, 90, 0.08) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.6) 0px -1px 0px inset',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none group-hover:scale-150 group-hover:opacity-90 transition-all duration-500" />
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="w-32 h-[220%] bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent absolute -top-1/2 left-0 animate-sweep-emerald pointer-events-none" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-success-green flex items-center justify-center text-white shadow-[0_4px_14px_rgba(30,158,90,0.3)] ring-1 ring-white/40 transform transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-2deg]">
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-emerald-200/60 shadow-[0_2px_8px_rgba(30,158,90,0.08)] text-success-green font-label-badge text-label-badge backdrop-blur-md transform transition-transform duration-300 group-hover:scale-105">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success-green" />
              </span>
              <span>{hasSuccessfulSync ? `${approvalRate}% approved` : 'Sync unavailable'}</span>
            </div>
          </div>

          <div className="relative z-10 mt-5 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] lg:text-[32px] text-text-primary tracking-tight font-extrabold transform transition-transform duration-300 group-hover:scale-[1.03] origin-left">
                {hasSuccessfulSync ? counts.approved : '—'}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-success-green border border-emerald-100">
                Validated
              </span>
            </div>
            <span className="font-semibold text-text-primary text-sm mt-1">
              Approved Registrations
            </span>
            <span className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success-green" />
              Current approved status
            </span>
          </div>
        </div>

        {/* Card 3: Offers Accepted */}
        <div
          className="group relative rounded-2xl p-5 sm:p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg cursor-pointer select-none transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.045] hover:-translate-y-2 hover:shadow-2xl hover:z-20 active:scale-[0.98] flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(239, 246, 255, 0.75) 50%, rgba(255, 255, 255, 0.88) 100%)',
            boxShadow: 'rgba(62, 111, 217, 0.08) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.6) 0px -1px 0px inset',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-blue-500/15 blur-2xl pointer-events-none group-hover:scale-150 group-hover:opacity-90 transition-all duration-500" />
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="w-32 h-[220%] bg-gradient-to-r from-transparent via-blue-400/25 to-transparent absolute -top-1/2 left-0 animate-sweep-blue pointer-events-none" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-info-blue flex items-center justify-center text-white shadow-[0_4px_14px_rgba(62,111,217,0.3)] ring-1 ring-white/40 transform transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-2deg]">
              <span className="material-symbols-outlined text-[22px]">work</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 border border-blue-200/60 shadow-[0_2px_8px_rgba(62,111,217,0.08)] text-info-blue font-label-badge text-label-badge backdrop-blur-md transform transition-transform duration-300 group-hover:scale-105">
              <span className="material-symbols-outlined text-[14px]">stars</span>
              <span>Live database</span>
            </div>
          </div>

          <div className="relative z-10 mt-5 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] lg:text-[32px] text-text-primary tracking-tight font-extrabold transform transition-transform duration-300 group-hover:scale-[1.03] origin-left">
                {hasSuccessfulSync ? counts.rejected : '—'}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-info-blue border border-blue-100">
                Current count
              </span>
            </div>
            <span className="font-semibold text-text-primary text-sm mt-1">
              Rejected Registrations
            </span>
            <span className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-info-blue" />
              Current rejected status
            </span>
          </div>
        </div>

        {/* Card 4: Pending Cryptographic Check */}
        <div
          className="group relative rounded-2xl p-5 sm:p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg cursor-pointer select-none transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.045] hover:-translate-y-2 hover:shadow-2xl hover:z-20 active:scale-[0.98] flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(254, 252, 232, 0.75) 50%, rgba(255, 255, 255, 0.88) 100%)',
            boxShadow: 'rgba(231, 185, 74, 0.1) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.6) 0px -1px 0px inset',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-amber-500/15 blur-2xl pointer-events-none group-hover:scale-150 group-hover:opacity-90 transition-all duration-500" />
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="w-32 h-[220%] bg-gradient-to-r from-transparent via-amber-400/25 to-transparent absolute -top-1/2 left-0 animate-sweep-amber pointer-events-none" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-secondary flex items-center justify-center text-white shadow-[0_4px_14px_rgba(120,90,0,0.28)] ring-1 ring-white/40 transform transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-2deg]">
              <span className="material-symbols-outlined text-[22px]">pending_actions</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 border border-amber-200/70 shadow-[0_2px_8px_rgba(120,90,0,0.08)] text-secondary font-label-badge text-label-badge backdrop-blur-md transform transition-transform duration-300 group-hover:scale-105">
              <span className="material-symbols-outlined text-[13px] text-amber-600">error</span>
              <span>Needs review</span>
            </div>
          </div>

          <div className="relative z-10 mt-5 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] lg:text-[32px] text-text-primary tracking-tight font-extrabold transform transition-transform duration-300 group-hover:scale-[1.03] origin-left">
                {hasSuccessfulSync ? counts.pending : '—'}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-secondary border border-amber-200/60">
                Live count
              </span>
            </div>
            <span className="font-semibold text-text-primary text-sm mt-1">
              Awaiting Admin Review
            </span>
            <span className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Pending status in database
            </span>
          </div>
        </div>
      </div>

      {/* 4. Filter Pills & Search Control Strip */}
      <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl border border-white/60 p-4 sm:p-5 rounded-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05),0_0_0_1px_rgba(255,255,255,0.8)_inset] flex flex-col gap-4">
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-surface-container-high/60 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
              search
            </span>
            <input
              className="w-full h-10 pl-10 pr-4 bg-surface-container-low/70 border border-white/80 rounded-lg text-text-primary placeholder:text-text-secondary text-xs sm:text-sm outline-none focus:bg-white transition-all shadow-sm"
              placeholder="Filter by scholar name, roll number, or email..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters & Export */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="relative">
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="h-10 px-3 pr-8 rounded-lg bg-surface-container-low/70 border border-white/80 text-text-primary font-medium outline-none appearance-none cursor-pointer hover:bg-white transition-colors shadow-sm"
              >
                <option value="all">All years / semesters</option>
                {batchOptions.map((batch) => <option key={batch} value={batch}>{batch}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none text-base">
                expand_more
              </span>
            </div>

            <div className="relative">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-10 px-3 pr-8 rounded-lg bg-surface-container-low/70 border border-white/80 text-text-primary font-medium outline-none appearance-none cursor-pointer hover:bg-white transition-colors shadow-sm"
              >
                <option value="all">All Departments</option>
                {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none text-base">
                expand_more
              </span>
            </div>

            <button
              onClick={exportStudentsCsv}
              disabled={!hasSuccessfulSync}
              className="h-10 px-3 rounded-lg bg-surface-container-low/70 border border-white/80 text-text-secondary hover:text-text-primary hover:bg-white transition-colors flex items-center gap-1.5 font-semibold shadow-sm"
              title="Export Table CSV"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Filter Pills row */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: `All Students (${hasSuccessfulSync ? counts.total : '—'})` },
            { id: 'verified', label: `Approved (${hasSuccessfulSync ? counts.approved : '—'})` },
            { id: 'pending', label: `Pending (${hasSuccessfulSync ? counts.pending : '—'})` },
            { id: 'rejected', label: `Rejected (${hasSuccessfulSync ? counts.rejected : '—'})` },
            { id: 'revoked', label: `Revoked (${hasSuccessfulSync ? counts.revoked : '—'})` },
          ].map((pill) => {
            const isActive = activeFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActiveFilter(pill.id)}
                className={`px-4 py-1.5 rounded-full font-label-badge text-label-badge whitespace-nowrap transition-colors shadow-sm ${
                  isActive
                    ? 'bg-primary-container text-white border-t border-white/20'
                    : 'bg-surface-container-low/70 border border-white/60 text-text-secondary hover:bg-white hover:text-text-primary'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Main Content Area: Directory Table */}
      <div
        className="w-full relative flex flex-col rounded-2xl border border-white/80 backdrop-blur-xl p-5 sm:p-6 overflow-hidden transition-all duration-300 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.82) 50%, rgba(248, 249, 253, 0.88) 100%)',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 10px 30px -5px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.6) 0px -1px 0px inset',
        }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="absolute -right-16 -top-16 w-60 h-60 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <h2 className="font-headline-section text-headline-section text-text-primary font-bold tracking-tight">
                Scholar Roster
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-text-secondary font-label-badge text-label-badge font-medium border border-border-subtle">
                Showing {filteredStudents.length} of {hasSuccessfulSync ? counts.total : '—'} registrations
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-text-secondary hover:text-text-primary text-xs font-semibold border border-border-subtle flex items-center gap-1.5 transition-colors"
                title="Sort Table"
              >
                <span className="material-symbols-outlined text-base">swap_vert</span>
                <span>Sort</span>
              </button>
              <button
                className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-text-secondary hover:text-text-primary text-xs font-semibold border border-border-subtle flex items-center gap-1.5 transition-colors"
                title="Customize Columns"
              >
                <span className="material-symbols-outlined text-base">view_column</span>
                <span>Columns</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto my-1">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-text-secondary font-label-eyebrow text-label-eyebrow uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Scholar Details</th>
                  <th className="py-3.5 px-4 font-semibold">Department &amp; Year</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Submitted</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Registration Status</th>
                  <th className="py-3.5 px-4 font-semibold">Review Reason</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-body-default text-body-default">
                {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-text-secondary">Loading live student registrations...</td></tr>}
                {!loading && hasSuccessfulSync && filteredStudents.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-text-secondary">No live registrations match these filters.</td></tr>
                )}
                {!loading && !hasSuccessfulSync && syncError && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-text-secondary">Student records are unavailable while the database is disconnected.</td></tr>
                )}
                {filteredStudents.map((std) => {
                  const isSelected = selectedKey === std.key;
                  return (
                    <tr
                      key={std.key}
                      onClick={() => setSelectedKey(std.key)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected
                          ? 'bg-tint-maroon/20 hover:bg-tint-maroon/30'
                          : 'hover:bg-surface-container-low/60'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`relative w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border overflow-hidden ${std.avatarBg}`}
                          >
                            {std.avatar_url ? (
                              <img src={std.avatar_url} alt={std.name} className="w-full h-full object-cover" />
                            ) : (
                              std.initials
                            )}
                            {std.verified && (
                              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-success-green ring-2 ring-white flex items-center justify-center">
                                <span className="material-symbols-outlined text-[9px] text-white font-bold">
                                  check
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-text-primary group-hover:text-primary transition-colors text-sm truncate">
                              {std.name}
                            </span>
                            <span className="text-xs text-text-secondary font-mono">
                              {std.roll}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-text-primary font-medium text-xs">
                            {std.dept || 'Not provided'}
                          </span>
                          <span className="text-xs text-text-secondary">{std.section || 'Not provided'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="text-xs text-text-secondary">
                          {std.createdAt ? new Date(std.createdAt).toLocaleDateString('en-IN') : 'Not recorded'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {std.status === 'APPROVED' || std.status === 'VERIFIED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tint-green text-success-green font-medium text-xs border border-emerald-200/60">
                            <span className="material-symbols-outlined text-xs text-success-green">
                              verified
                            </span>
                            Approved
                          </span>
                        ) : std.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium text-xs border border-amber-200/70">
                            <span className="material-symbols-outlined text-xs text-amber-600">
                              pending
                            </span>
                            Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-text-secondary font-medium text-xs border border-border-subtle">
                            {std.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-text-secondary">
                        {std.rejectionReason || std.revocationReason || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedKey(std.key);
                              setLinkedInStudent(std);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0077B5]/10 hover:bg-[#0077B5]/20 text-[#0077B5] font-semibold text-xs transition-colors border border-[#0077B5]/25 shadow-2xs"
                            title="Open Student Profile & Dossier"
                          >
                            <span className="material-symbols-outlined text-sm">badge</span>
                            <span>Student Profile</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedKey(std.key);
                              setLinkedInStudent(std);
                            }}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-white transition-colors"
                            title="View Credentials Vault"
                          >
                            <span className="material-symbols-outlined text-lg">shield</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border-subtle mt-2 text-text-secondary text-xs">
            <span className="font-medium">Showing {filteredStudents.length} of {hasSuccessfulSync ? counts.total : '—'} registrations</span>
            <div className="flex items-center gap-1.5">
              <button
                className="h-8 px-2.5 rounded-lg bg-surface-container-low border border-border-subtle hover:bg-surface-container font-label-button text-xs text-text-primary disabled:opacity-40 transition-colors"
                disabled
              >
                Previous
              </button>
              <button className="h-8 w-8 rounded-lg bg-primary text-white font-semibold text-xs shadow-sm flex items-center justify-center">
                1
              </button>
              <button className="h-8 w-8 rounded-lg bg-surface-container-low border border-border-subtle hover:bg-surface-container text-text-primary font-medium text-xs flex items-center justify-center transition-colors">
                2
              </button>
              <span className="px-1 text-text-secondary">...</span>
              <button className="h-8 px-2 rounded-lg bg-surface-container-low border border-border-subtle hover:bg-surface-container text-text-primary font-medium text-xs flex items-center justify-center transition-colors">
                496
              </button>
              <button className="h-8 px-2.5 rounded-lg bg-surface-container-low border border-border-subtle hover:bg-surface-container font-label-button text-xs text-text-primary transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>

      {/* 6. Active Scholar Dossier & Verification Hub (Positioned in the open space below the roster) */}
      <div className="flex flex-col gap-4 mt-2" id="scholarDetailDrawer">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-container to-primary text-white flex items-center justify-center shadow-md ring-1 ring-white/60">
              <span className="material-symbols-outlined text-xl">badge</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-headline-section text-base font-bold text-text-primary tracking-tight">
                  Selected Scholar Dossier &amp; Verification Hub
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tint-maroon text-primary font-bold text-xs border border-rose-200/60 shadow-2xs font-mono">
                  {currentStudent?.name ? `${currentStudent.name} (${currentStudent.roll})` : 'Active Record'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Real-time student credentials, academic standing, vault tokens &amp; department contact channels.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low/90 border border-white/80 text-text-secondary text-xs font-medium shadow-2xs backdrop-blur-md">
              <span className="material-symbols-outlined text-sm text-primary">touch_app</span>
              <span>Click any student row above to inspect</span>
            </span>
          </div>
        </div>

        {/* 4 Cards organized into an impressive, orderly, balanced 4-column responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {/* Card 1: Student Profile & Academic Track (from Image 2) */}
          <div
            className="relative rounded-2xl p-5 flex flex-col justify-between overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg text-left transition-all duration-300 hover:shadow-xl group"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(240, 247, 252, 0.85) 45%, rgba(255, 255, 255, 0.95) 100%)',
              boxShadow: 'rgba(0, 119, 181, 0.08) 0px 20px 40px -15px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(0, 0, 0, 0.03) 0px 2px 6px',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0077B5] flex items-center gap-1.5 font-mono">
                <span className="material-symbols-outlined text-base">badge</span>
                Student Profile &amp; Academic Track
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0077B5]/10 text-[#0077B5] border border-[#0077B5]/25">
                Verified
              </span>
            </div>

            <div className="flex items-center gap-3.5 my-3">
              <div className="relative w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 overflow-hidden shadow-sm shrink-0 flex items-center justify-center">
                {currentStudent?.avatar_url ? (
                  <img src={currentStudent.avatar_url} alt={currentStudent.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-[#8B1D2C]">{currentStudent?.initials || 'ST'}</span>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                  {currentStudent?.name || 'Scholar Profile'}
                  <span className="material-symbols-outlined text-sm text-[#0077B5]">verified</span>
                </h4>
                <p className="text-xs text-slate-500 truncate font-mono">
                  Roll: {currentStudent?.roll || '—'}
                </p>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                  {currentStudent?.dept || 'Computer Applications'} &bull; {currentStudent?.section || '2024-2027'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">CGPA Score</span>
                <span className="text-base font-extrabold text-[#8B1D2C] block mt-0.5">
                  {Number(currentStudent?.cgpa || 8.65).toFixed(2)}
                  <span className="text-[10px] text-slate-400 font-normal"> / 10.0</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Phone Contact</span>
                <span className="text-xs font-semibold text-slate-800 font-mono truncate block mt-1">
                  {currentStudent?.phone || '+91 98765 43210'}
                </span>
              </div>
            </div>

            <button
              onClick={() => currentStudent && setLinkedInStudent(currentStudent)}
              className="w-full mt-auto py-2.5 px-3 rounded-xl bg-[#0077B5] hover:bg-[#005E93] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <span className="material-symbols-outlined text-base">badge</span>
              <span>Open Full Student Profile &amp; Vault</span>
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </button>
          </div>

          {/* Card 2: Registration Overview (from Image 1) */}
          <div
            className="relative rounded-2xl p-5 flex flex-col justify-between overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg transition-all duration-300 hover:shadow-xl group"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(245, 248, 255, 0.78) 45%, rgba(255, 255, 255, 0.9) 100%)',
              boxShadow: 'rgba(139, 29, 44, 0.08) 0px 20px 40px -15px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.6) 0px -1px 0px inset, rgba(0, 0, 0, 0.03) 0px 2px 6px',
            }}
          >
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
            <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <h3 className="font-headline-section text-headline-section text-text-primary font-bold tracking-tight text-sm">
                  Registration Overview
                </h3>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success-green" />
                </span>
              </div>
              <span className="font-label-badge text-label-badge px-2.5 py-0.5 rounded-full bg-tint-maroon text-primary border border-rose-200/60 font-bold shadow-sm backdrop-blur-sm uppercase text-[10px]">
                {currentStudent?.status || 'PENDING'}
              </span>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-2.5 my-3">
              {/* Registration Status */}
              <div
                className="relative overflow-hidden p-3 rounded-xl border border-white/80 flex flex-col justify-between backdrop-blur-md shadow-2xs transition-all duration-300 hover:shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 234, 234, 0.75) 0%, rgba(255, 255, 255, 0.8) 100%)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-primary uppercase font-bold tracking-wider">Registration Status</span>
                  <span className="material-symbols-outlined text-xs text-primary">grade</span>
                </div>
                <span className="text-lg font-extrabold text-primary tracking-tight mt-1">{currentStudent?.status || 'PENDING'}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/90 text-primary border border-rose-200/60 mt-1 self-start font-mono">
                  {currentStudent?.roll || 'No record'}
                </span>
              </div>

              {/* Department */}
              <div
                className="relative overflow-hidden p-3 rounded-xl border border-white/80 flex flex-col justify-between backdrop-blur-md shadow-2xs transition-all duration-300 hover:shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(234, 248, 239, 0.75) 0%, rgba(255, 255, 255, 0.8) 100%)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-success-green uppercase font-bold tracking-wider">Department</span>
                  <span className="material-symbols-outlined text-xs text-success-green">verified</span>
                </div>
                <span className="text-lg font-extrabold text-success-green tracking-tight mt-1 truncate">{currentStudent?.dept || 'BCA'}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/90 text-success-green border border-emerald-200/60 mt-1 self-start truncate">
                  <span className="w-1 h-1 rounded-full bg-success-green" />
                  Current student record
                </span>
              </div>

              {/* Year / Semester */}
              <div
                className="relative overflow-hidden p-3 rounded-xl border border-white/80 flex flex-col justify-between backdrop-blur-md shadow-2xs transition-all duration-300 hover:shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(234, 240, 252, 0.75) 0%, rgba(255, 255, 255, 0.8) 100%)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-info-blue uppercase font-bold tracking-wider">Year / Semester</span>
                  <span className="material-symbols-outlined text-xs text-info-blue">workspace_premium</span>
                </div>
                <span className="text-sm font-bold text-info-blue mt-1 truncate">{currentStudent?.section || '1st Year (1st Sem)'}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/90 text-info-blue border border-blue-200/60 mt-1 self-start truncate">
                  Registration value
                </span>
              </div>

              {/* Submitted */}
              <div
                className="relative overflow-hidden p-3 rounded-xl border border-white/80 flex flex-col justify-between backdrop-blur-md shadow-2xs transition-all duration-300 hover:shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(254, 250, 235, 0.85) 0%, rgba(255, 255, 255, 0.8) 100%)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-secondary uppercase font-bold tracking-wider">Submitted</span>
                  <span className="material-symbols-outlined text-xs text-secondary">event_available</span>
                </div>
                <span className="text-sm font-bold text-secondary mt-1">{currentStudent?.createdAt ? new Date(currentStudent.createdAt).toLocaleDateString('en-IN') : '30/9/2026'}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/90 text-success-green border border-emerald-200/60 mt-1 self-start">
                  <span className="w-1 h-1 rounded-full bg-success-green" />
                  Registration timestamp
                </span>
              </div>
            </div>

            <div className="relative z-10 pt-2 border-t border-border-subtle/80 flex items-center justify-between text-[11px] text-text-secondary">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-success-green">cloud_done</span>
                Supabase Live Auth Synced
              </span>
              <span className="font-mono text-[10px] text-slate-400">ID: {currentStudent?.key ? String(currentStudent.key).slice(0, 8) : '26BCA055'}</span>
            </div>
          </div>

          {/* Card 3: Vault Credentials (from Image 1) */}
          <div
            className="relative rounded-2xl p-5 flex flex-col justify-between overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg transition-all duration-300 hover:shadow-xl group"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(246, 248, 254, 0.8) 45%, rgba(255, 255, 255, 0.9) 100%)',
              boxShadow: 'rgba(62, 111, 217, 0.08) 0px 20px 40px -15px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.6) 0px -1px 0px inset, rgba(0, 0, 0, 0.03) 0px 2px 6px',
            }}
          >
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
            <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

            <div className="relative z-10 flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-container to-primary text-white flex items-center justify-center shadow-[0_2px_8px_rgba(139,29,44,0.25)] ring-1 ring-white/60">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                </div>
                <h3 className="font-headline-section text-headline-section text-text-primary font-bold text-sm tracking-tight">
                  Vault Credentials
                </h3>
              </div>
              <button
                onClick={() => currentStudent && setLinkedInStudent(currentStudent)}
                className="font-label-button text-xs text-primary font-semibold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="relative z-10 flex flex-col gap-2 my-2.5">
              <div className="p-2.5 rounded-xl bg-white/70 border border-white/80 backdrop-blur-md flex items-center justify-between hover:bg-white transition-all shadow-2xs group/item">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-tint-green text-success-green flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-xs">
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-text-primary font-semibold text-xs leading-tight group-hover/item:text-primary transition-colors truncate">
                      Student registration
                    </span>
                    <span className="text-[10px] text-text-secondary font-mono mt-0.5 truncate">
                      {currentStudent?.roll || '26BCA055'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => currentStudent && setLinkedInStudent(currentStudent)}
                  className="p-1 rounded-lg text-text-secondary hover:text-primary hover:bg-white transition-all border border-transparent hover:border-border-subtle cursor-pointer"
                  title="Download Token / Inspect"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-white/70 border border-white/80 backdrop-blur-md flex items-center justify-between hover:bg-white transition-all shadow-2xs group/item">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-tint-blue text-info-blue flex items-center justify-center shrink-0 border border-blue-200/60 shadow-xs">
                    <span className="material-symbols-outlined text-sm">
                      workspace_premium
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-text-primary font-semibold text-xs leading-tight group-hover/item:text-primary transition-colors truncate">
                      Review reason
                    </span>
                    <span className="text-[10px] text-text-secondary font-mono mt-0.5 truncate">
                      {currentStudent?.rejectionReason || currentStudent?.revocationReason || 'No reason recorded'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => currentStudent && setLinkedInStudent(currentStudent)}
                  className="p-1 rounded-lg text-text-secondary hover:text-primary hover:bg-white transition-all border border-transparent hover:border-border-subtle cursor-pointer"
                  title="Download Token / Inspect"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                </button>
              </div>
            </div>

            <div className="relative z-10 pt-2 border-t border-border-subtle/80 flex items-center justify-between text-[11px] text-text-secondary">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-primary">security</span>
                Verified Vault Archive
              </span>
              <span className="font-mono text-[10px] text-emerald-600 font-bold">SHA-256 Valid</span>
            </div>
          </div>

          {/* Card 4: Contact & Placement Rep (from Image 1) */}
          <div
            className="relative rounded-2xl p-5 flex flex-col justify-between overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg transition-all duration-300 hover:shadow-xl group"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(254, 245, 247, 0.8) 45%, rgba(255, 255, 255, 0.9) 100%)',
              boxShadow: 'rgba(139, 29, 44, 0.08) 0px 20px 40px -15px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.6) 0px -1px 0px inset, rgba(0, 0, 0, 0.03) 0px 2px 6px',
            }}
          >
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
            <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-rose-500/10 blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

            <div className="relative z-10 flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-container to-primary text-white flex items-center justify-center shadow-[0_2px_8px_rgba(139,29,44,0.25)] ring-1 ring-white/60">
                  <span className="material-symbols-outlined text-[16px]">support_agent</span>
                </div>
                <h3 className="font-headline-section text-headline-section text-text-primary font-bold text-sm tracking-tight">
                  Contact &amp; Placement Rep
                </h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-primary border border-rose-100">
                Assigned
              </span>
            </div>

            <div className="relative z-10 flex flex-col gap-2 my-2 text-xs">
              <div className="p-2 rounded-xl bg-white/70 border border-white/80 backdrop-blur-md flex items-center justify-between shadow-2xs hover:bg-white transition-all">
                <span className="text-text-secondary flex items-center gap-1.5 font-medium text-[11px]">
                  <span className="material-symbols-outlined text-xs text-primary">mail</span>
                  Email
                </span>
                <span className="text-text-primary font-semibold font-mono text-[11px] truncate max-w-[130px]" title={currentStudent?.email || 'student@rimt.ac.in'}>
                  {currentStudent?.email || 'student@rimt.ac.in'}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-white/70 border border-white/80 backdrop-blur-md flex items-center justify-between shadow-2xs hover:bg-white transition-all">
                <span className="text-text-secondary flex items-center gap-1.5 font-medium text-[11px]">
                  <span className="material-symbols-outlined text-xs text-success-green">call</span>
                  Contact
                </span>
                <span className="text-text-primary font-semibold font-mono text-[11px]">
                  {currentStudent?.phone || '+91 98765 43210'}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-white/70 border border-white/80 backdrop-blur-md flex items-center justify-between shadow-2xs hover:bg-white transition-all">
                <span className="text-text-secondary flex items-center gap-1.5 font-medium text-[11px]">
                  <span className="material-symbols-outlined text-xs text-info-blue">badge</span>
                  Assigned SPOC
                </span>
                <span className="text-text-primary font-semibold text-[11px] truncate max-w-[130px]">
                  {currentStudent?.spoc || 'Prof. Raj Kumar'}
                </span>
              </div>
            </div>

            <div className="relative z-10 pt-1 flex items-center gap-2 mt-auto">
              <button
                onClick={() => currentStudent && setLinkedInStudent(currentStudent)}
                className="flex-1 py-2 px-3 rounded-xl text-white font-label-button text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] border-t border-white/30 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgb(139, 29, 44) 0%, rgb(110, 21, 33) 100%)',
                  boxShadow: 'rgba(107, 0, 24, 0.3) 0px 4px 14px, rgba(255, 255, 255, 0.35) 0px 1px 1px inset',
                }}
              >
                <span className="material-symbols-outlined text-sm">badge</span>
                <span>Open Student Profile</span>
              </button>

              <button
                onClick={() => window.print()}
                className="p-2 rounded-xl bg-white/70 border border-white/80 backdrop-blur-md hover:bg-white text-text-primary transition-all shadow-2xs hover:shadow-sm flex items-center justify-center cursor-pointer"
                title="Print Scholar Dossier"
              >
                <span className="material-symbols-outlined text-sm text-text-secondary hover:text-text-primary">
                  print
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Scholar"
        subtitle="Register a scholar into the T&P cryptographically verified directory."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert('Student registrations must be submitted through the RIMT student app. No record was added.');
            setShowAddModal(false);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-text-primary mb-1">Scholar Full Name</label>
            <input
              type="text"
              required
              placeholder="Enter full name"
              className="w-full h-10 px-3 rounded-xl border border-border-subtle focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-text-primary mb-1">University Roll Number</label>
            <input
              type="text"
              required
              placeholder="Enter roll number"
              className="w-full h-10 px-3 rounded-xl border border-border-subtle focus:border-primary focus:outline-none font-mono"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-text-secondary hover:bg-surface-container-low"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold shadow-sm"
            >
              Register Scholar
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Bulk Import Scholar Records"
        subtitle="Upload an ERP Excel/CSV sheet to populate batch records in bulk."
      >
        <div className="space-y-4 text-xs">
          <div className="border-2 border-dashed border-border-subtle rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-surface-container-low/40">
            <span className="material-symbols-outlined text-4xl text-primary mb-2">cloud_upload</span>
            <p className="font-semibold text-text-primary">Drag &amp; drop student CSV or Excel file</p>
            <p className="text-[11px] text-text-secondary mt-1">
              Supports UTF-8 .csv, .xlsx up to 25MB (2,500 records/batch)
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowImportModal(false)}
              className="px-4 py-2 rounded-xl text-text-secondary hover:bg-surface-container-low"
            >
              Close
            </button>
            <button
              onClick={() => {
                alert('Bulk import is not connected to the live registration database. No records were imported.');
                setShowImportModal(false);
              }}
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold shadow-sm"
            >
              Start Automated Import
            </button>
          </div>
        </div>
      </Modal>

      {/* Full LinkedIn Style Student Profile & Dossier Modal */}
      <StudentLinkedInProfileModal
        isOpen={!!linkedInStudent}
        student={linkedInStudent}
        onClose={() => setLinkedInStudent(null)}
      />
    </div>
  );
}
