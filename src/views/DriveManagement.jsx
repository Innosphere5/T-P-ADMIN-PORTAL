'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DriveCard from '@/components/drive/DriveCard';
import DriveFormModal from '@/components/drive/DriveFormModal';
import DriveDetailDrawer from '@/components/drive/DriveDetailDrawer';
import NotifyConfirmModal from '@/components/drive/NotifyConfirmModal';
import {
  getDrives,
  createDrive,
  updateDrive,
  deleteDrive,
  duplicateDrive,
  cancelDrive,
  completeDrive,
  saveRegistrationLink,
  deleteRegistrationLink,
  addAnnouncement,
  updateResults,
  dispatchNotification,
  fetchApprovedStudents,
} from '@/lib/driveClient';
import {
  deriveDriveStatus,
  generateDrivesCsv,
  formatDateTime,
  formatCtcRange,
  computeScheduleDiff,
} from '@/lib/driveUtils';

/**
 * DriveManagement — Primary T&P Placement Drive Operations View
 * Conforms strictly to ADMIN.md & drive.md:
 * - ZERO hardcoded dummy data (no fake TCS/Infosys/Wipro/Amazon cards or fabricated metrics)
 * - Temporary empty state when no drives are loaded (§5.10)
 * - Dynamic hero card displaying the nearest real upcoming drive when available
 * - Four pastel gradient KPI cards computing live statistics or displaying "—" / "Not connected"
 * - Full CRUD with validation (Draft & Published), Registration link manager, Announcements, Results, and Notification workflow
 * - CSV exports for drive schedules and stage candidate rosters
 */
export default function DriveManagement({ globalSearch = '' }) {
  // Drives state & connectivity
  const [drivesList, setDrivesList] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [approvedStudents, setApprovedStudents] = useState([]);

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState(null);

  // Filters & Views
  const [activeTabModule, setActiveTabModule] = useState('drives'); // 'drives' | 'announcements'
  const [activeStatusFilter, setActiveStatusFilter] = useState('all'); // 'all' | 'ongoing' | 'upcoming' | 'completed' | 'archived'
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('agenda'); // 'agenda' | 'table'

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDrive, setEditingDrive] = useState(null);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [scheduleDiff, setScheduleDiff] = useState(null);

  // Notification Modal State
  const [notifyModalState, setNotifyModalState] = useState({
    isOpen: false,
    driveId: null,
    event: 'NEW_DRIVE',
    audienceEstimate: 0,
    defaultTitle: '',
    defaultBody: '',
    isSending: false,
  });

  // Show a temporary toast
  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Load drives & approved students on mount
  const refreshDrives = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getDrives();
      setDrivesList(res.drives || []);
      setIsConnected(res.connected);
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDrives();
    fetchApprovedStudents()
      .then((st) => setApprovedStudents(st))
      .catch(() => {});
  }, [refreshDrives]);

  // Combined search term
  const effectiveSearch = (globalSearch || searchFilter).toLowerCase().trim();

  // Filtered drives
  const filteredDrives = useMemo(() => {
    return drivesList.filter((drive) => {
      const statusInfo = deriveDriveStatus(drive);

      // Status pill filter
      if (activeStatusFilter === 'ongoing' && statusInfo.type !== 'ongoing') return false;
      if (activeStatusFilter === 'upcoming' && statusInfo.type !== 'upcoming') return false;
      if (activeStatusFilter === 'completed' && statusInfo.type !== 'completed') return false;
      if (activeStatusFilter === 'archived' && statusInfo.type !== 'draft' && statusInfo.type !== 'cancelled') return false;

      // Category filter
      if (categoryFilter !== 'ALL' && drive.category !== categoryFilter) return false;

      // Department filter
      if (departmentFilter !== 'ALL') {
        const depts = drive.eligibility?.departments || [];
        if (depts.length > 0 && !depts.includes(departmentFilter)) return false;
      }

      // Search matching
      if (effectiveSearch) {
        const titleMatch = (drive.title || '').toLowerCase().includes(effectiveSearch);
        const compMatch = (drive.companyName || '').toLowerCase().includes(effectiveSearch);
        const roleMatch = (drive.roleTitle || '').toLowerCase().includes(effectiveSearch);
        const venueMatch = (drive.venue || '').toLowerCase().includes(effectiveSearch);
        const ctcMatch = formatCtcRange(drive.packageMinLpa, drive.packageMaxLpa).toLowerCase().includes(effectiveSearch);

        if (!titleMatch && !compMatch && !roleMatch && !venueMatch && !ctcMatch) {
          return false;
        }
      }
      return true;
    });
  }, [drivesList, activeStatusFilter, categoryFilter, departmentFilter, effectiveSearch]);

  // Status counts for tabs
  const tabCounts = useMemo(() => {
    let ongoing = 0;
    let upcoming = 0;
    let completed = 0;
    let archived = 0;

    for (const d of drivesList) {
      const s = deriveDriveStatus(d);
      if (s.type === 'ongoing') ongoing++;
      else if (s.type === 'upcoming') upcoming++;
      else if (s.type === 'completed') completed++;
      else if (s.type === 'draft' || s.type === 'cancelled') archived++;
    }

    return {
      all: drivesList.length,
      ongoing,
      upcoming,
      completed,
      archived,
    };
  }, [drivesList]);

  // Dynamic Nearest Upcoming Drive for Hero
  const nearestUpcomingDrive = useMemo(() => {
    const upcomingList = drivesList.filter((d) => {
      const st = deriveDriveStatus(d);
      return st.type === 'upcoming' || st.type === 'ongoing';
    });

    if (upcomingList.length === 0) return null;

    // Sort by startsAt ascending
    return [...upcomingList].sort((a, b) => {
      if (!a.startsAt) return 1;
      if (!b.startsAt) return -1;
      return new Date(a.startsAt) - new Date(b.startsAt);
    })[0];
  }, [drivesList]);

  // KPI Calculations (data-driven or "—")
  const kpiMetrics = useMemo(() => {
    if (drivesList.length === 0) {
      return {
        activeDrives: '—',
        totalOffers: '—',
        visitingCompanies: '—',
        highestPackage: '—',
        highestCompany: '',
      };
    }

    // Active drives count
    const activeCount = drivesList.filter((d) => deriveDriveStatus(d).type === 'ongoing').length;

    // Total offers extended across all results
    let offersCount = 0;
    for (const d of drivesList) {
      const res = d.results || [];
      for (const r of res) {
        if (r.stage === 'Final Selected / Offer' || r.stage === 'Offer') {
          offersCount += (r.students || []).length;
        }
      }
    }

    // Visiting companies count
    const uniqueCompanies = new Set(
      drivesList.map((d) => (d.companyName || '').trim().toLowerCase()).filter(Boolean)
    );

    // Highest package
    let maxPkg = 0;
    let maxComp = '';
    for (const d of drivesList) {
      if (d.packageMaxLpa && Number(d.packageMaxLpa) > maxPkg) {
        maxPkg = Number(d.packageMaxLpa);
        maxComp = d.companyName || d.title;
      }
    }

    return {
      activeDrives: activeCount > 0 ? activeCount : drivesList.length > 0 ? tabCounts.upcoming : '—',
      totalOffers: offersCount > 0 ? offersCount : '—',
      visitingCompanies: uniqueCompanies.size > 0 ? uniqueCompanies.size : '—',
      highestPackage: maxPkg > 0 ? `₹${maxPkg.toFixed(1)} LPA` : '—',
      highestCompany: maxComp ? `${maxComp} (Benchmark)` : '',
    };
  }, [drivesList, tabCounts]);

  // All Announcements across all drives for the secondary feed
  const allAnnouncementsFeed = useMemo(() => {
    const list = [];
    for (const drive of drivesList) {
      const anns = drive.announcements || [];
      for (const a of anns) {
        list.push({ ...a, driveTitle: drive.title, driveId: drive.id });
      }
    }
    return list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [drivesList]);

  // Handle Create / Edit Submission
  const handleSaveDriveForm = async (formData) => {
    if (editingDrive) {
      // Check for schedule difference (C2 helper)
      const diffs = computeScheduleDiff(editingDrive, formData);

      const res = await updateDrive(editingDrive.id, formData);
      if (res.success) {
        await refreshDrives();
        setShowCreateModal(false);
        setEditingDrive(null);
        showToast(`Drive "${formData.title}" updated successfully.`);

        if (diffs.length > 0 && formData.status === 'PUBLISHED') {
          // Open detail modal directly on announcements tab with diff
          setScheduleDiff(diffs);
          setSelectedDrive(res.drive);
        }
      } else {
        alert(res.error || 'Failed to update drive');
      }
    } else {
      const res = await createDrive(formData);
      if (res.success) {
        await refreshDrives();
        setShowCreateModal(false);
        showToast(`Drive "${formData.title}" scheduled successfully.`);

        // If published, offer notification confirm modal
        if (formData.status === 'PUBLISHED') {
          const matchingEligible = approvedStudents.filter((st) => {
            const depts = formData.eligibility?.departments || [];
            if (depts.length > 0 && !depts.includes(st.department || 'BCA')) return false;
            return true;
          });

          setNotifyModalState({
            isOpen: true,
            driveId: res.drive.id,
            event: 'NEW_DRIVE',
            audienceEstimate: matchingEligible.length > 0 ? matchingEligible.length : approvedStudents.length,
            defaultTitle: `Campus Recruitment Drive: ${formData.title}`,
            defaultBody: `The T&P Cell has published an official campus recruitment drive for ${formData.companyName || formData.title}. Minimum package: ${formatCtcRange(formData.packageMinLpa, formData.packageMaxLpa)}. Review eligibility and register on the student portal.`,
            isSending: false,
          });
        }
      } else {
        alert(res.error || 'Failed to create drive');
      }
    }
  };

  // Duplicate Drive
  const handleDuplicate = async (driveId) => {
    const res = await duplicateDrive(driveId);
    if (res.success) {
      await refreshDrives();
      showToast('Drive duplicated as draft.');
    } else {
      alert(res.error || 'Failed to duplicate drive');
    }
  };

  // Cancel Drive
  const handleCancelDrive = async (driveId, reason) => {
    const res = await cancelDrive(driveId, reason);
    if (res.success) {
      await refreshDrives();
      if (selectedDrive?.id === driveId) setSelectedDrive(res.drive);
      showToast('Drive marked as cancelled.');
    }
  };

  // Complete Drive
  const handleCompleteDrive = async (driveId) => {
    const res = await completeDrive(driveId);
    if (res.success) {
      await refreshDrives();
      if (selectedDrive?.id === driveId) setSelectedDrive(res.drive);
      showToast('Drive marked as completed.');
    }
  };

  // Registration links CRUD
  const handleSaveLink = async (driveId, linkData) => {
    const res = await saveRegistrationLink(driveId, linkData);
    if (res.success) {
      await refreshDrives();
      if (selectedDrive?.id === driveId) setSelectedDrive(res.drive);
      showToast('Registration link saved.');
    }
  };

  const handleDeleteLink = async (driveId, linkId) => {
    const res = await deleteRegistrationLink(driveId, linkId);
    if (res.success) {
      await refreshDrives();
      if (selectedDrive?.id === driveId) setSelectedDrive(res.drive);
      showToast('Registration link deleted.');
    }
  };

  // Announcements
  const handlePublishAnnouncement = async (driveId, annData) => {
    const res = await addAnnouncement(driveId, annData);
    if (res.success) {
      await refreshDrives();
      if (selectedDrive?.id === driveId) setSelectedDrive(res.drive);
      setScheduleDiff(null);
      showToast('Announcement posted to candidate timeline.');
    }
  };

  // Results update
  const handleUpdateResults = async (driveId, stageName, students) => {
    const res = await updateResults(driveId, stageName, students);
    if (res.success) {
      await refreshDrives();
      if (selectedDrive?.id === driveId) setSelectedDrive(res.drive);
      showToast(`Roster updated for ${stageName}.`);
    }
  };

  // Trigger Notification Modal
  const handleTriggerNotify = (driveId, params) => {
    setNotifyModalState({
      isOpen: true,
      driveId,
      event: params.event || 'GENERAL',
      audienceEstimate: params.audienceCount || approvedStudents.length,
      defaultTitle: params.defaultTitle || '',
      defaultBody: params.defaultBody || '',
      isSending: false,
    });
  };

  // Confirm and dispatch notification
  const handleConfirmNotification = async (payload) => {
    setNotifyModalState((prev) => ({ ...prev, isSending: true }));
    const res = await dispatchNotification({
      driveId: notifyModalState.driveId,
      event: payload.event,
      audienceCount: payload.audienceCount,
      messageTitle: payload.title,
      messageBody: payload.body,
      adminName: 'Raj Kumar (HOD BCA)',
    });

    setNotifyModalState((prev) => ({ ...prev, isOpen: false, isSending: false }));
    await refreshDrives();

    if (selectedDrive?.id === notifyModalState.driveId) {
      const refreshed = drivesList.find((d) => d.id === notifyModalState.driveId);
      if (refreshed) setSelectedDrive(refreshed);
    }

    if (res.success) {
      showToast(res.message || 'Notification dispatched.');
    } else {
      showToast(res.message || 'Notification recorded in session log.', 'warning');
    }
  };

  // Export full drives CSV
  const handleExportDrivesCsv = () => {
    if (filteredDrives.length === 0) {
      alert('No drives currently match to export.');
      return;
    }
    const csv = generateDrivesCsv(filteredDrives);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RIMT_Placement_Drives_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-surface-hero text-white border-white/20'
          }`}
        >
          <span className="material-symbols-outlined text-sm text-emerald-400">
            {toastMessage.type === 'warning' ? 'warning' : 'check_circle'}
          </span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. Top Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-label-eyebrow text-[11px] text-text-secondary uppercase tracking-wider font-bold">
              MODULE 03 • T&amp;P OPERATIONS
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-tint-maroon text-primary border border-rose-200/80">
              {drivesList.length > 0 ? 'LIVE CYCLE' : 'AWAITING DATA'}
            </span>
            {!isConnected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Service Standby
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline-page text-2xl lg:text-3xl text-text-primary tracking-tight font-extrabold">
              Placement Drive Management
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExportDrivesCsv}
            disabled={filteredDrives.length === 0}
            className="group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-label-button text-xs font-semibold text-text-primary shadow-xs hover:shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden border border-white/80 disabled:opacity-40 disabled:pointer-events-none"
            style={{
              background: 'linear-gradient(rgb(248, 249, 250) 0%, rgb(233, 236, 239) 48%, rgb(221, 225, 230) 100%)',
              boxShadow: 'rgba(255, 255, 255, 0.9) 0px 1px 1px 0px inset, rgba(0, 0, 0, 0.08) 0px -1px 2px 0px inset, rgba(0, 0, 0, 0.06) 0px 2px 6px 0px',
            }}
          >
            <div className="pointer-events-none absolute inset-0 z-0 opacity-40 bg-gradient-to-r from-transparent via-white/80 to-transparent -skew-x-12 animate-glossy" />
            <span className="material-symbols-outlined text-lg text-text-secondary group-hover:text-text-primary transition-colors relative z-10">
              file_download
            </span>
            <span className="relative z-10 font-semibold tracking-tight text-text-primary">
              Export Drive Schedule
            </span>
          </button>

          <button
            onClick={() => {
              setEditingDrive(null);
              setShowCreateModal(true);
            }}
            className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-label-button text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden border border-white/25"
            style={{
              background: 'linear-gradient(rgb(155, 29, 44) 0%, rgb(126, 18, 32) 52%, rgb(94, 11, 22) 100%)',
              boxShadow: 'rgba(255, 255, 255, 0.45) 0px 1px 1px 0px inset, rgba(0, 0, 0, 0.35) 0px -1px 2px 0px inset, rgba(103, 13, 24, 0.45) 0px 4px 14px',
            }}
          >
            <div className="pointer-events-none absolute inset-0 z-0 opacity-40 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-glossy" />
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
            <span className="material-symbols-outlined text-lg relative z-10">
              add
            </span>
            <span className="relative z-10 tracking-wide font-bold">
              + Create New Drive
            </span>
          </button>
        </div>
      </div>

      {/* 2. Dark Hero Card (§5.10: Dynamic when drive exists; Neutral empty hero when no drive scheduled) */}
      {nearestUpcomingDrive ? (
        /* DYNAMIC HERO: Displays nearest real upcoming drive */
        <div
          onClick={() => setSelectedDrive(nearestUpcomingDrive)}
          className="group relative overflow-hidden rounded-2xl p-6 lg:p-8 text-white shadow-2xl border border-white/10 bg-surface-hero cursor-pointer select-none transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.015] hover:-translate-y-1 hover:shadow-2xl hover:z-20 active:scale-[0.99]"
          style={{
            background: 'radial-gradient(120% 120% at 85% 15%, rgba(139, 29, 44, 0.32) 0%, rgba(26, 27, 46, 0.65) 45%, rgba(21, 21, 31, 0.98) 100%), linear-gradient(135deg, rgb(21, 21, 31) 0%, rgb(17, 17, 26) 100%)',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 20px 45px -10px, rgba(255, 255, 255, 0.12) 0px 1px 0px inset',
          }}
        >
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary/30 blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="w-32 h-[250%] bg-gradient-to-r from-transparent via-white/10 to-transparent absolute -top-1/2 left-0 animate-hero-sweep pointer-events-none" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col gap-3 max-w-3xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#ffdf9b] ring-4 ring-[#ffdf9b]/20 animate-pulse" />
                <span className="font-label-eyebrow text-[11px] tracking-widest text-[#ffdf9b] uppercase font-bold">
                  NEXT UPCOMING ON-CAMPUS DRIVE
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15 text-xs font-semibold backdrop-blur-md">
                  {nearestUpcomingDrive.category === 'UNIVERSITY_EVENT' ? 'University Event' : 'Flagship Recruitment'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex flex-wrap items-center gap-3">
                  {nearestUpcomingDrive.title}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-green/20 text-success-green border border-success-green/30 text-xs font-semibold shadow-xs backdrop-blur-md">
                    <span className="material-symbols-outlined text-sm font-bold">verified</span>
                    Verified Drive
                  </span>
                </h2>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs lg:text-sm text-surface-container-high/90 mt-2 relative z-10">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-[#ffdf9b]">calendar_today</span>
                    {formatDateTime(nearestUpcomingDrive.startsAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-[#ffdf9b]">pin_drop</span>
                    {nearestUpcomingDrive.venue || nearestUpcomingDrive.meetingUrl || 'T&P Main Campus'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                    <span className="material-symbols-outlined text-base text-[#ffdf9b]">payments</span>
                    {formatCtcRange(nearestUpcomingDrive.packageMinLpa, nearestUpcomingDrive.packageMaxLpa)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-[#ffdf9b]">link</span>
                    {(nearestUpcomingDrive.registrationLinks || []).length > 0
                      ? `${nearestUpcomingDrive.registrationLinks.length} Active Link(s)`
                      : 'External Application Form'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex lg:flex-col items-center sm:items-start lg:items-end justify-between gap-4 pt-2 lg:pt-0">
              <div className="hidden sm:flex flex-col lg:items-end bg-white/5 p-3.5 rounded-xl border border-white/10 backdrop-blur-md">
                <span className="font-label-eyebrow text-[10px] text-[#ffdf9b]/90 uppercase tracking-wider font-semibold">
                  Company Liaison
                </span>
                <span className="text-sm font-bold text-white mt-0.5">
                  {nearestUpcomingDrive.spoc?.name || 'T&P Coordination Cell'}
                </span>
                <span className="text-xs text-surface-container-high/70">
                  {nearestUpcomingDrive.spoc?.organisation || nearestUpcomingDrive.companyName || 'RIMT University'}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDrive(nearestUpcomingDrive);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#ffdf9b] text-[#251a00] font-label-button text-xs font-bold hover:bg-[#efc050] transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                <span>Manage Drive</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* NEUTRAL EMPTY HERO (§5.10): Shown when no drives are scheduled */
        <div
          className="group relative overflow-hidden rounded-2xl p-6 lg:p-8 text-white shadow-2xl border border-white/10 bg-surface-hero select-none"
          style={{
            background: 'radial-gradient(120% 120% at 85% 15%, rgba(139, 29, 44, 0.22) 0%, rgba(26, 27, 46, 0.65) 45%, rgba(21, 21, 31, 0.98) 100%), linear-gradient(135deg, rgb(21, 21, 31) 0%, rgb(17, 17, 26) 100%)',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 20px 45px -10px, rgba(255, 255, 255, 0.12) 0px 1px 0px inset',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col gap-3 max-w-3xl">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#ffdf9b]/60 ring-4 ring-[#ffdf9b]/10" />
                <span className="font-label-eyebrow text-[11px] tracking-widest text-[#ffdf9b]/90 uppercase font-bold">
                  NEXT UPCOMING ON-CAMPUS DRIVE
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
                  No upcoming drive scheduled
                </h2>
                <p className="text-xs text-surface-container-high/80 mt-1">
                  Create a drive to schedule dates, publish eligibility criteria, and open registration.
                </p>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-surface-container-high/70 mt-3">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-gray-500">calendar_today</span>
                    Date: —
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-gray-500">pin_drop</span>
                    Venue: —
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-gray-500">payments</span>
                    CTC: —
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-gray-500">group</span>
                    Eligible Candidates: —
                  </span>
                </div>
              </div>
            </div>

            <div className="flex lg:flex-col items-center sm:items-start lg:items-end justify-between gap-4 pt-2 lg:pt-0">
              <div className="hidden sm:flex flex-col lg:items-end bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="font-label-eyebrow text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                  Company Liaison
                </span>
                <span className="text-xs font-semibold text-gray-300 mt-0.5">—</span>
              </div>

              <button
                onClick={() => {
                  setEditingDrive(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#ffdf9b] text-[#251a00] font-label-button text-xs font-bold hover:bg-[#efc050] transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                <span>+ Create Drive</span>
                <span className="material-symbols-outlined text-base">add</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Four Pastel KPI Cards (§5.10: Clean data-driven or "—" placeholders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Active Drives Scheduled */}
        <div
          className="group relative rounded-2xl p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg select-none flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(253, 242, 244, 0.85) 50%, rgba(255, 255, 255, 0.9) 100%)',
            boxShadow: 'rgba(107, 0, 24, 0.08) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset',
            border: '1px solid rgba(250, 210, 216, 0.8)',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primaryHover flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-[22px]">calendar_month</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border border-rose-200/80 shadow-2xs text-primary font-label-badge text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{isConnected ? 'Live Records' : 'Standby'}</span>
            </div>
          </div>

          <div className="relative z-10 mt-5 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-display-stat text-3xl text-text-primary tracking-tight font-extrabold">
                {kpiMetrics.activeDrives}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-primary border border-rose-100">
                Active
              </span>
            </div>
            <span className="font-semibold text-text-primary text-sm mt-1">Active Drives Scheduled</span>
            <span className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
              {drivesList.length > 0 ? 'Current Placement Cycle' : 'No data yet'}
            </span>
          </div>
        </div>

        {/* KPI 2: Total Offers Extended */}
        <div
          className="group relative rounded-2xl p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg select-none flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(240, 253, 244, 0.85) 50%, rgba(255, 255, 255, 0.9) 100%)',
            boxShadow: 'rgba(30, 158, 90, 0.08) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset',
            border: '1px solid rgba(205, 238, 216, 0.85)',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-success-green flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 border border-emerald-200/80 shadow-2xs text-success-green font-label-badge text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-success-green" />
              <span>{isConnected ? 'Live Records' : 'Standby'}</span>
            </div>
          </div>

          <div className="relative z-10 mt-5 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-display-stat text-3xl text-text-primary tracking-tight font-extrabold">
                {kpiMetrics.totalOffers}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-success-green border border-emerald-100">
                Offers
              </span>
            </div>
            <span className="font-semibold text-text-primary text-sm mt-1">Total Offers Extended</span>
            <span className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success-green" />
              {kpiMetrics.totalOffers !== '—' ? 'Validated outcome roster' : 'No data yet'}
            </span>
          </div>
        </div>

        {/* KPI 3: Visiting Companies */}
        <div
          className="group relative rounded-2xl p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg select-none flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(239, 246, 255, 0.85) 50%, rgba(255, 255, 255, 0.9) 100%)',
            boxShadow: 'rgba(62, 111, 217, 0.08) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset',
            border: '1px solid rgba(204, 221, 251, 0.85)',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-info-blue flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-[22px]">apartment</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border border-blue-200/80 shadow-2xs text-info-blue font-label-badge text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-info-blue" />
              <span>{isConnected ? 'Live Records' : 'Standby'}</span>
            </div>
          </div>

          <div className="relative z-10 mt-5 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-display-stat text-3xl text-text-primary tracking-tight font-extrabold">
                {kpiMetrics.visitingCompanies}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-info-blue border border-blue-100">
                Partners
              </span>
            </div>
            <span className="font-semibold text-text-primary text-sm mt-1">Visiting Companies</span>
            <span className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-info-blue" />
              {kpiMetrics.visitingCompanies !== '—' ? 'Across corporate tiers' : 'No data yet'}
            </span>
          </div>
        </div>

        {/* KPI 4: Highest Package Offered */}
        <div
          className="group relative rounded-2xl p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg select-none flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(254, 252, 232, 0.85) 50%, rgba(255, 255, 255, 0.9) 100%)',
            boxShadow: 'rgba(239, 192, 80, 0.1) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset',
            border: '1px solid rgba(252, 229, 191, 0.85)',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-[22px]">military_tech</span>
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border border-amber-200/80 shadow-2xs text-amber-800 font-label-badge text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>{isConnected ? 'Live Records' : 'Standby'}</span>
            </div>
          </div>

          <div className="relative z-10 mt-5 flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="font-display-stat text-3xl text-text-primary tracking-tight font-extrabold">
                {kpiMetrics.highestPackage}
              </span>
            </div>
            <span className="font-semibold text-text-primary text-sm mt-1">Highest Package Offered</span>
            <span className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {kpiMetrics.highestCompany || 'No data yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Module Level Switch: Drives Roster vs All Announcements Feed */}
      <div className="flex items-center gap-3 border-b border-border-subtle pb-2">
        <button
          onClick={() => setActiveTabModule('drives')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTabModule === 'drives'
              ? 'bg-primary text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary bg-white border border-border-subtle'
          }`}
        >
          <span className="material-symbols-outlined text-sm">view_agenda</span>
          <span>Placement Drives Roster ({drivesList.length})</span>
        </button>

        <button
          onClick={() => setActiveTabModule('announcements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTabModule === 'announcements'
              ? 'bg-primary text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary bg-white border border-border-subtle'
          }`}
        >
          <span className="material-symbols-outlined text-sm">campaign</span>
          <span>Official Circulars Feed ({allAnnouncementsFeed.length})</span>
        </button>
      </div>

      {activeTabModule === 'drives' ? (
        <>
          {/* 4. Filter Pills & Search Section */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Filter Pill Tabs with real counts */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: `All Drives (${tabCounts.all})` },
                { id: 'ongoing', label: `Active / Ongoing (${tabCounts.ongoing})` },
                { id: 'upcoming', label: `Upcoming (${tabCounts.upcoming})` },
                { id: 'completed', label: `Completed (${tabCounts.completed})` },
                { id: 'archived', label: `Draft / Archived (${tabCounts.archived})` },
              ].map((tab) => {
                const isSelected = activeStatusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveStatusFilter(tab.id)}
                    className={`group relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-label-button text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden whitespace-nowrap ${
                      isSelected
                        ? 'text-white shadow-md border border-white/30 font-semibold'
                        : 'text-text-secondary hover:text-text-primary backdrop-blur-md border border-white/80 shadow-2xs'
                    }`}
                    style={
                      isSelected
                        ? {
                            background: 'linear-gradient(135deg, rgb(139, 29, 44) 0%, rgb(110, 21, 33) 100%)',
                            boxShadow: 'rgba(107, 0, 24, 0.3) 0px 4px 12px, rgba(255, 255, 255, 0.35) 0px 1px 1px inset',
                          }
                        : {
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(235, 238, 243, 0.9) 100%)',
                          }
                    }
                  >
                    {isSelected && (
                      <div className="pointer-events-none absolute inset-0 z-0 opacity-40 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-glossy" />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Search & Filters Bar */}
            <div
              className="group relative rounded-2xl p-2 px-3 overflow-hidden backdrop-blur-xl border border-white/80 shadow-md flex items-center justify-between gap-3 flex-wrap"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(240, 246, 255, 0.78) 45%, rgba(255, 255, 255, 0.88) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
              }}
            >
              <div className="relative w-44 sm:w-56">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary text-base">
                  search
                </span>
                <input
                  className="w-full h-9 pl-8 pr-3 bg-white/90 text-text-primary placeholder:text-text-secondary rounded-lg font-body-sm text-xs shadow-2xs outline-none focus:bg-white transition-all"
                  placeholder="Filter by company, CTC..."
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 px-2.5 bg-white/90 text-text-primary rounded-lg text-xs outline-none border border-border-subtle"
                title="Filter by category"
              >
                <option value="ALL">All Categories</option>
                <option value="COMPANY_RECRUITMENT">Campus Recruitment</option>
                <option value="UNIVERSITY_EVENT">University Event</option>
                <option value="PLACEMENT_ACTIVITY">Placement Activity</option>
              </select>

              {/* Department Filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="h-9 px-2.5 bg-white/90 text-text-primary rounded-lg text-xs outline-none border border-border-subtle"
                title="Filter by department"
              >
                <option value="ALL">All Departments</option>
                <option value="BCA">BCA</option>
                <option value="B.Sc IT">B.Sc IT</option>
                <option value="B.Sc Cyber Security">B.Sc Cyber Security</option>
                <option value="B.Sc (Hons) AI & ML">B.Sc (Hons) AI &amp; ML</option>
              </select>

              {/* View Switcher */}
              <div className="bg-white/80 rounded-lg p-1 shadow-2xs flex items-center gap-1 relative z-10 border border-white/60">
                <button
                  onClick={() => setViewMode('agenda')}
                  className={`p-1 rounded transition-colors ${
                    viewMode === 'agenda' ? 'bg-surface-container-high text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  }`}
                  title="Card Agenda View"
                >
                  <span className="material-symbols-outlined text-base">view_agenda</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1 rounded transition-colors ${
                    viewMode === 'table' ? 'bg-surface-container-high text-text-primary' : 'text-text-secondary hover:text-text-primary'
                  }`}
                  title="Table Rows View"
                >
                  <span className="material-symbols-outlined text-base">table_rows</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. Drive List Section */}
          {isLoading ? (
            /* Skeleton Loading State */
            <div className="flex flex-col gap-4 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-white/70 border border-border-subtle shadow-xs" />
              ))}
            </div>
          ) : filteredDrives.length === 0 ? (
            /* Empty States (§5.10) */
            drivesList.length === 0 ? (
              /* No drives in database/session */
              <div
                className="p-12 rounded-2xl bg-white border border-border-subtle shadow-md flex flex-col items-center justify-center text-center gap-3.5"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 251, 0.85) 100%)',
                }}
              >
                <div className="w-16 h-16 rounded-2xl bg-tint-maroon text-primary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-3xl">event_busy</span>
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                  <h3 className="font-bold text-base text-text-primary">
                    No Placement Drives Scheduled Yet
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Drives scheduled by the T&amp;P coordination team will appear here. You can create a new drive, specify eligibility criteria, and open registration.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingDrive(null);
                    setShowCreateModal(true);
                  }}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white font-label-button text-xs font-semibold hover:bg-primary-hover shadow-md hover:shadow-lg transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgb(155, 29, 44) 0%, rgb(110, 21, 33) 100%)',
                  }}
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>+ Create First Placement Drive</span>
                </button>
              </div>
            ) : (
              /* Filter resulted in 0 matches */
              <div className="p-10 rounded-2xl bg-white border border-border-subtle shadow-sm flex flex-col items-center justify-center text-center gap-2">
                <span className="material-symbols-outlined text-3xl text-text-secondary">search_off</span>
                <p className="font-bold text-sm text-text-primary">No drives match your filters</p>
                <p className="text-xs text-text-secondary">
                  Try clearing your search terms, category, or department filters.
                </p>
                <button
                  onClick={() => {
                    setSearchFilter('');
                    setCategoryFilter('ALL');
                    setDepartmentFilter('ALL');
                    setActiveStatusFilter('all');
                  }}
                  className="mt-2 px-4 py-2 rounded-lg bg-surface-container text-text-primary text-xs font-semibold hover:bg-surface-container-high transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )
          ) : viewMode === 'table' ? (
            /* Table Rows View */
            <div className="rounded-2xl border border-border-subtle overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-border-subtle text-[11px] text-text-secondary uppercase font-bold">
                    <th className="p-4 pl-6">Company &amp; Drive</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">CTC Package</th>
                    <th className="p-4">Start Date</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrives.map((drive) => (
                    <DriveCard
                      key={drive.id}
                      drive={drive}
                      onSelect={(d) => setSelectedDrive(d)}
                      viewMode="table"
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Card Agenda View */
            <div className="flex flex-col gap-4">
              {filteredDrives.map((drive) => (
                <DriveCard
                  key={drive.id}
                  drive={drive}
                  onSelect={(d) => setSelectedDrive(d)}
                  viewMode="agenda"
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Module Secondary Tab: ALL ANNOUNCEMENTS FEED */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-text-primary">
                Official Placement Notices &amp; Circulars Timeline
              </h3>
              <p className="text-xs text-text-secondary">
                Consolidated university feed of all guidelines, instructions, and schedule updates
              </p>
            </div>
          </div>

          {allAnnouncementsFeed.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-border-subtle text-center flex flex-col items-center gap-2 shadow-xs">
              <span className="material-symbols-outlined text-3xl text-text-secondary">campaign</span>
              <p className="font-bold text-sm text-text-primary">No circulars posted across drives</p>
              <p className="text-xs text-text-secondary">
                Notices composed inside individual drives will aggregate here in real-time.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {allAnnouncementsFeed.map((ann) => (
                <div
                  key={ann.id}
                  className="p-5 rounded-2xl bg-white border border-border-subtle shadow-xs flex flex-col gap-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-tint-maroon text-primary border border-rose-200">
                        {ann.driveTitle}
                      </span>
                      <span className="font-bold text-sm text-text-primary">{ann.title}</span>
                    </div>
                    <span className="text-xs text-text-secondary shrink-0">
                      {formatDateTime(ann.publishedAt)}
                    </span>
                  </div>

                  <p className="text-xs text-text-primary whitespace-pre-line leading-relaxed pl-1">
                    {ann.message}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50 text-[11px] text-text-secondary">
                    <span>Published by: {ann.publishedBy || 'HOD BCA Office'}</span>
                    <button
                      onClick={() => {
                        const targetDrive = drivesList.find((d) => d.id === ann.driveId);
                        if (targetDrive) setSelectedDrive(targetDrive);
                      }}
                      className="text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Open Drive Details</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Create / Edit Drive Modal */}
      <DriveFormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingDrive(null);
        }}
        onSubmit={handleSaveDriveForm}
        initialData={editingDrive}
        isEditing={Boolean(editingDrive)}
      />

      {/* MODAL 2: Full Drive Detail Drawer */}
      <DriveDetailDrawer
        drive={selectedDrive}
        isOpen={Boolean(selectedDrive)}
        onClose={() => {
          setSelectedDrive(null);
          setScheduleDiff(null);
        }}
        onEdit={(d) => {
          setSelectedDrive(null);
          setEditingDrive(d);
          setShowCreateModal(true);
        }}
        onDuplicate={handleDuplicate}
        onCancel={handleCancelDrive}
        onComplete={handleCompleteDrive}
        onSaveLink={handleSaveLink}
        onDeleteLink={handleDeleteLink}
        onPublishAnnouncement={handlePublishAnnouncement}
        onUpdateResults={handleUpdateResults}
        onTriggerNotify={handleTriggerNotify}
        prefilledScheduleDiff={scheduleDiff}
      />

      {/* MODAL 3: Student Notification Confirm Modal */}
      <NotifyConfirmModal
        isOpen={notifyModalState.isOpen}
        onClose={() => setNotifyModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmNotification}
        event={notifyModalState.event}
        drive={drivesList.find((d) => d.id === notifyModalState.driveId)}
        audienceEstimate={notifyModalState.audienceEstimate}
        defaultTitle={notifyModalState.defaultTitle}
        defaultBody={notifyModalState.defaultBody}
        isSending={notifyModalState.isSending}
        isBackendConnected={isConnected}
      />
    </div>
  );
}
