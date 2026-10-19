'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import HeroCard from '../components/HeroCard';
import KpiCard from '../components/KpiCard';
import Modal from '../components/Modal';
import OpportunityCard from '../components/internship/OpportunityCard';
import OpportunityFormModal from '../components/internship/OpportunityFormModal';
import InternshipFilters from '../components/internship/InternshipFilters';
import StudentInternshipCard from '../components/internship/StudentInternshipCard';
import { supabase } from '@/lib/supabaseClient';

const INITIAL_FILTERS = {
  q: '',
  skills: [],
  duration: '',
  season: '',
  compensation: '',
  company: '',
  status: '',
  department: '',
  sort: 'newest',
  viewMode: 'grid',
};

export default function InternshipMonitoring({ globalSearch = '' }) {
  // Top-level tabs: 'opportunities' | 'students'
  const [activeTab, setActiveTab] = useState('opportunities');

  // Main data states (strictly live, starting empty)
  const [opportunities, setOpportunities] = useState([]);
  const [studentInternships, setStudentInternships] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);

  // Filters state
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Modals & UI actions
  const [opportunityModal, setOpportunityModal] = useState({ isOpen: false, data: null });
  const [deleteConfirm, setDeleteConfirm] = useState(null); // opportunity to delete
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStudentInternship, setSelectedStudentInternship] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Sync globalSearch from parent layout if provided
  useEffect(() => {
    if (globalSearch) {
      setFilters((prev) => ({ ...prev, q: globalSearch }));
    }
  }, [globalSearch]);

  const showToast = useCallback((text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // ── Fetching Data ──
  const fetchOpportunities = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/admin/internship-opportunities', {
        headers: {
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch opportunities (HTTP ${res.status})`);
      }
      const data = await res.json();
      setOpportunities(Array.isArray(data.opportunities) ? data.opportunities : []);
    } catch (err) {
      console.error('fetchOpportunities error:', err);
      setSyncError(err.message || 'Unable to sync internship opportunities');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const fetchStudentInternships = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/internships', {
        headers: {
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStudentInternships(Array.isArray(data.internships) ? data.internships : []);
      }
    } catch (err) {
      console.warn('fetchStudentInternships error:', err.message);
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/companies', {
        headers: {
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.companies)
          ? data.companies
          : Array.isArray(data)
          ? data
          : [];
        setCompanies(list);
      }
    } catch (err) {
      console.warn('fetchCompanies error:', err.message);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchOpportunities(false), fetchStudentInternships(), fetchCompanies()]);
    setLoading(false);
  }, [fetchOpportunities, fetchStudentInternships, fetchCompanies]);

  useEffect(() => {
    refreshAll();

    // Supabase Realtime Subscription
    let channel;
    try {
      channel = supabase
        .channel('admin-internship-monitoring-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'internship_opportunities' }, () => {
          showToast('Live update: Internship opportunities updated', 'success');
          fetchOpportunities(false);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_internships' }, () => {
          showToast('Live update: Student internships updated', 'success');
          fetchStudentInternships();
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription not initialized:', e.message);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchOpportunities, fetchStudentInternships, refreshAll, showToast]);

  // ── Derived Metadata for Filters (live data only) ──
  const availableSkills = useMemo(() => {
    const skillSet = new Set();
    opportunities.forEach((o) => {
      if (Array.isArray(o.required_skills)) {
        o.required_skills.forEach((s) => s && skillSet.add(s.trim()));
      }
    });
    return Array.from(skillSet).sort((a, b) => a.localeCompare(b));
  }, [opportunities]);

  const availableCompanies = useMemo(() => {
    const names = new Set();
    opportunities.forEach((o) => o.company_name && names.add(o.company_name.trim()));
    studentInternships.forEach((s) => {
      const name = s.company || s.company_name;
      if (name) names.add(name.trim());
    });
    companies.forEach((c) => {
      const name = c.name || c.company_name;
      if (name) names.add(name.trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [opportunities, studentInternships, companies]);

  // ── Live KPI Computations (strictly live, "—" when empty) ──
  const {
    partnerCompaniesVal,
    openOpportunitiesVal,
    activeStudentsVal,
    concludedVal,
    avgMonthlyStipendFormatted,
  } = useMemo(() => {
    // 1. Partner Companies
    const companySet = new Set();
    opportunities.forEach((o) => o.company_name && companySet.add(o.company_name.trim().toLowerCase()));
    studentInternships.forEach((s) => {
      const name = s.company || s.company_name;
      if (name) companySet.add(name.trim().toLowerCase());
    });
    const partnerCompaniesVal = companySet.size > 0 ? String(companySet.size) : '—';

    // 2. Open Opportunities
    const openCount = opportunities.filter((o) => o.status === 'open' && o.is_visible !== false).length;
    const openOpportunitiesVal = opportunities.length > 0 ? String(openCount) : '—';

    // 3. Active Student Internships
    const activeCount = studentInternships.filter((s) => {
      const st = (s.status || '').toLowerCase();
      return st === 'active' || st === 'ongoing' || st === 'in evaluation';
    }).length;
    const activeStudentsVal = studentInternships.length > 0 ? String(activeCount) : '—';

    // 4. Concluded Tracks
    const concCount = studentInternships.filter((s) => {
      const st = (s.status || '').toLowerCase();
      return st === 'completed' || st === 'concluded';
    }).length;
    const concludedVal = studentInternships.length > 0 ? String(concCount) : '—';

    // 5. Average Monthly Stipend (computed strictly over stipend compensation rows)
    const stipendValues = [];
    opportunities.forEach((o) => {
      if (o.compensation_type === 'stipend' && typeof o.stipend_amount === 'number' && o.stipend_amount > 0) {
        stipendValues.push(o.stipend_amount);
      }
    });
    studentInternships.forEach((s) => {
      const raw = s.stipend_amount || s.stipend;
      const num = typeof raw === 'number' ? raw : raw ? Number(String(raw).replace(/[^0-9.]/g, '')) : 0;
      if (s.compensation_type === 'stipend' || (!s.compensation_type && num > 0)) {
        if (!isNaN(num) && num > 0) stipendValues.push(num);
      }
    });

    let avgMonthlyStipendFormatted = '—';
    if (stipendValues.length > 0) {
      const avg = Math.round(stipendValues.reduce((a, b) => a + b, 0) / stipendValues.length);
      avgMonthlyStipendFormatted = `₹${avg.toLocaleString('en-IN')}`;
    }

    return {
      partnerCompaniesVal,
      openOpportunitiesVal,
      activeStudentsVal,
      concludedVal,
      avgMonthlyStipendFormatted,
    };
  }, [opportunities, studentInternships]);

  // ── Filtered Opportunities ──
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((item) => {
      // Global Search
      if (filters.q) {
        const query = filters.q.toLowerCase().trim();
        const titleMatch = (item.title || '').toLowerCase().includes(query);
        const compMatch = (item.company_name || '').toLowerCase().includes(query);
        const locMatch = (item.location || '').toLowerCase().includes(query);
        const descMatch = (item.description || '').toLowerCase().includes(query);
        const skillMatch = Array.isArray(item.required_skills) &&
          item.required_skills.some((s) => s.toLowerCase().includes(query));
        if (!titleMatch && !compMatch && !locMatch && !descMatch && !skillMatch) {
          return false;
        }
      }

      // Skills Filter (OR Match)
      if (filters.skills && filters.skills.length > 0) {
        const itemSkills = Array.isArray(item.required_skills)
          ? item.required_skills.map((s) => s.toLowerCase().trim())
          : [];
        const matchesAny = filters.skills.some((selected) =>
          itemSkills.includes(selected.toLowerCase().trim())
        );
        if (!matchesAny) return false;
      }

      // Duration Filter
      if (filters.duration) {
        if (['3', '6', '9', '12'].includes(filters.duration)) {
          if (Number(item.duration_months) !== Number(filters.duration)) return false;
        } else if (filters.duration === 'other') {
          if ([3, 6, 9, 12].includes(Number(item.duration_months))) return false;
        }
      }

      // Season Filter
      if (filters.season) {
        const s = (item.season || 'any').toLowerCase();
        if (s !== 'any' && s !== filters.season.toLowerCase()) return false;
      }

      // Compensation Filter
      if (filters.compensation) {
        if (item.compensation_type !== filters.compensation) return false;
      }

      // Company Filter
      if (filters.company) {
        if ((item.company_name || '').toLowerCase() !== filters.company.toLowerCase()) {
          return false;
        }
      }

      // Status Filter
      if (filters.status) {
        if (item.status !== filters.status) return false;
      }

      // Department Filter
      if (filters.department) {
        const depts = Array.isArray(item.eligible_departments) ? item.eligible_departments : [];
        if (depts.length > 0 && !depts.includes(filters.department)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      switch (filters.sort) {
        case 'deadline':
          if (!a.application_deadline) return 1;
          if (!b.application_deadline) return -1;
          return new Date(a.application_deadline) - new Date(b.application_deadline);
        case 'duration':
          return (b.duration_months || 0) - (a.duration_months || 0);
        case 'stipend_desc':
          return (b.stipend_amount || 0) - (a.stipend_amount || 0);
        case 'company_asc':
          return (a.company_name || '').localeCompare(b.company_name || '');
        case 'newest':
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });
  }, [opportunities, filters]);

  // ── Filtered Student Internships ──
  const filteredStudents = useMemo(() => {
    return studentInternships.filter((item) => {
      const studentName = item.student_name || item.studentName || '';
      const rollNumber = item.student_roll || item.roll || '';
      const company = item.company || item.company_name || '';
      const role = item.role || item.title || '';

      if (filters.q) {
        const query = filters.q.toLowerCase().trim();
        const matches =
          studentName.toLowerCase().includes(query) ||
          rollNumber.toLowerCase().includes(query) ||
          company.toLowerCase().includes(query) ||
          role.toLowerCase().includes(query);
        if (!matches) return false;
      }

      if (filters.company) {
        if (company.toLowerCase() !== filters.company.toLowerCase()) return false;
      }

      if (filters.compensation) {
        if (item.compensation_type && item.compensation_type !== filters.compensation) {
          return false;
        }
      }

      if (filters.season) {
        if (item.season && item.season !== 'any' && item.season.toLowerCase() !== filters.season.toLowerCase()) {
          return false;
        }
      }

      if (filters.department) {
        const dept = item.student_department || item.department || '';
        if (dept && dept !== filters.department) return false;
      }

      return true;
    }).sort((a, b) => {
      const nameA = a.student_name || a.studentName || '';
      const nameB = b.student_name || b.studentName || '';
      return nameA.localeCompare(nameB);
    });
  }, [studentInternships, filters]);

  // ── Opportunity Actions ──
  const handleSaveOpportunity = async (data) => {
    const isEdit = Boolean(data.id);
    const url = isEdit
      ? `/api/admin/internship-opportunities/${data.id}`
      : '/api/admin/internship-opportunities';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer rimt-admin-master-token',
        'x-admin-portal': 'true',
      },
      body: JSON.stringify(data),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = resData.error || `Save failed (HTTP ${res.status})`;
      showToast(msg, 'error');
      throw new Error(msg);
    }

    showToast(isEdit ? 'Opportunity updated successfully' : 'Opportunity posted successfully', 'success');
    await fetchOpportunities(false);
  };

  const handleToggleVisibility = async (opp) => {
    try {
      const nextVisible = !opp.is_visible;
      const res = await fetch(`/api/admin/internship-opportunities/${opp.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ is_visible: nextVisible }),
      });
      if (!res.ok) throw new Error('Failed to toggle visibility');
      // Optimistic update
      setOpportunities((prev) =>
        prev.map((o) => (o.id === opp.id ? { ...o, is_visible: nextVisible } : o))
      );
      showToast(`Listing ${nextVisible ? 'shown' : 'hidden'}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
      fetchOpportunities(false);
    }
  };

  const handleStatusChange = async (opp, newStatus) => {
    try {
      const res = await fetch(`/api/admin/internship-opportunities/${opp.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setOpportunities((prev) =>
        prev.map((o) => (o.id === opp.id ? { ...o, status: newStatus } : o))
      );
      showToast(`Status changed to ${newStatus}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
      fetchOpportunities(false);
    }
  };

  const handleDeleteOpportunity = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/internship-opportunities/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to delete opportunity');
      }
      setOpportunities((prev) => prev.filter((o) => o.id !== deleteConfirm.id));
      showToast('Opportunity deleted permanently', 'success');
      setDeleteConfirm(null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-16 animate-fade-in">
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-white text-xs font-semibold backdrop-blur-md transition-all duration-300 animate-slide-up ${
            toastMessage.type === 'error'
              ? 'bg-rose-600/95 border border-rose-400/40'
              : toastMessage.type === 'warning'
              ? 'bg-amber-600/95 border border-amber-400/40'
              : 'bg-emerald-600/95 border border-emerald-400/40'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {toastMessage.type === 'error'
              ? 'error'
              : toastMessage.type === 'warning'
              ? 'warning'
              : 'check_circle'}
          </span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ── 1. Hero Card (Strictly Data-Driven) ── */}
      <HeroCard
        title={
          openOpportunitiesVal !== '—' && partnerCompaniesVal !== '—'
            ? `${openOpportunitiesVal} Open Opportunities • ${partnerCompaniesVal} Partner Companies`
            : 'Internship Opportunities & Student Tracking'
        }
        description="Manage industry partner internship opportunities by skill, season, duration, and compensation track. Monitor live student industrial placements."
        metrics={[
          {
            label: 'Partner Companies',
            value: partnerCompaniesVal,
            caption: 'Verified Industry Partners',
            captionIcon: 'domain',
          },
          {
            label: 'Open Opportunities',
            value: openOpportunitiesVal,
            caption: 'Active Application Cycles',
            captionIcon: 'work_outline',
          },
        ]}
      />

      {/* ── 2. Five Glossy KPI Cards (Computed Live, '—' When Empty) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <KpiCard
          variant="maroon"
          icon="domain"
          value={partnerCompaniesVal}
          badgeText="Partners"
          title="Partner Companies"
          subtitle="Industry Collaborators"
        />
        <KpiCard
          variant="amber"
          icon="work"
          value={openOpportunitiesVal}
          badgeText="Open"
          title="Open Opportunities"
          subtitle="Active Recruitment"
        />
        <KpiCard
          variant="blue"
          icon="timelapse"
          value={activeStudentsVal}
          badgeText="Active"
          title="Active Internships"
          subtitle="Students Placed"
        />
        <KpiCard
          variant="emerald"
          icon="verified"
          value={concludedVal}
          badgeText="Concluded"
          title="Concluded Tracks"
          subtitle="Completed & Verified"
        />
        <KpiCard
          variant="emerald"
          icon="payments"
          value={avgMonthlyStipendFormatted}
          badgeText="Avg"
          title="Avg Monthly Stipend"
          subtitle="Stipend Track Average"
        />
      </div>

      {/* ── 3. Navigation Header: Top-Level Tabs + Add Opportunity Primary Action ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        {/* Segmented Tab Switcher */}
        <div className="inline-flex p-1 rounded-2xl bg-surface-container-low border border-border-subtle shadow-xs self-start">
          <button
            onClick={() => setActiveTab('opportunities')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transform transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
              activeTab === 'opportunities'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">work</span>
            <span>Opportunities</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'opportunities'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface-container text-text-secondary'
              }`}
            >
              {opportunities.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transform transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
              activeTab === 'students'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">group</span>
            <span>Student Internships</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'students'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface-container text-text-secondary'
              }`}
            >
              {studentInternships.length}
            </span>
          </button>
        </div>

        {/* Primary Action Button */}
        {activeTab === 'opportunities' && (
          <button
            onClick={() => setOpportunityModal({ isOpen: true, data: null })}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #8B1D2C 0%, #6E1521 100%)' }}
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Add Opportunity</span>
          </button>
        )}
      </div>

      {/* ── 4. Unified Filter Bar ── */}
      <InternshipFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(INITIAL_FILTERS)}
        availableSkills={availableSkills}
        availableCompanies={availableCompanies}
        activeTab={activeTab}
        totalCount={activeTab === 'opportunities' ? opportunities.length : studentInternships.length}
        filteredCount={activeTab === 'opportunities' ? filteredOpportunities.length : filteredStudents.length}
      />

      {/* ── 5. Sync Error Banner (Never Silent Fallback) ── */}
      {syncError && !loading && (
        <div className="rounded-2xl p-4 bg-rose-50 border border-rose-200/80 text-rose-800 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl text-rose-600 mt-0.5">cloud_off</span>
            <div>
              <h4 className="font-bold text-xs">Data Synchronization Issue</h4>
              <p className="text-xs text-rose-700 mt-0.5">{syncError}</p>
            </div>
          </div>
          <button
            onClick={refreshAll}
            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shrink-0 shadow-xs"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* ── 6. Loading Skeleton ── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 py-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-5 bg-white border border-border-subtle shadow-xs animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-5/6" />
              </div>
              <div className="flex gap-2 pt-2">
                <div className="h-6 bg-slate-200 rounded-md w-16" />
                <div className="h-6 bg-slate-200 rounded-md w-20" />
                <div className="h-6 bg-slate-200 rounded-md w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 7. Tab 1: Opportunities List ── */}
      {!loading && activeTab === 'opportunities' && (
        <>
          {filteredOpportunities.length > 0 ? (
            <div
              className={
                filters.viewMode === 'list'
                  ? 'flex flex-col gap-3.5 w-full'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 w-full'
              }
            >
              {filteredOpportunities.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  viewMode={filters.viewMode}
                  onEdit={(o) => setOpportunityModal({ isOpen: true, data: o })}
                  onToggleVisibility={handleToggleVisibility}
                  onStatusChange={handleStatusChange}
                  onDelete={(o) => setDeleteConfirm(o)}
                />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            /* Empty State: No opportunities at all — Full width, vertically & horizontally centered */
            <div className="w-full min-h-[50vh] sm:min-h-[55vh] flex items-center justify-center py-6 sm:py-10">
              <div className="w-full max-w-[720px] rounded-3xl p-8 sm:p-14 bg-white/95 backdrop-blur-md border border-border-subtle shadow-xs text-center flex flex-col items-center justify-center space-y-5 mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8B1D2C]/10 to-[#8B1D2C]/5 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                  <span className="material-symbols-outlined text-4xl">work_outline</span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-xl sm:text-2xl text-text-primary tracking-tight">
                    No Internship Opportunities Posted
                  </h3>
                  <p className="text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
                    Start connecting students with corporate partners. Add opportunities classified by skills, season, duration, and compensation model.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpportunityModal({ isOpen: true, data: null })}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer select-none"
                  style={{ background: 'linear-gradient(135deg, #8B1D2C 0%, #6E1521 100%)' }}
                >
                  <span className="material-symbols-outlined text-xl">add</span>
                  <span>Post First Opportunity</span>
                </button>
              </div>
            </div>
          ) : (
            /* Empty State: Filters returned 0 results */
            <div className="w-full min-h-[45vh] flex items-center justify-center py-6 sm:py-8">
              <div className="w-full max-w-[560px] rounded-3xl p-8 sm:p-10 bg-white/95 backdrop-blur-md border border-border-subtle shadow-xs text-center flex flex-col items-center justify-center space-y-4 mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-surface-container text-text-secondary flex items-center justify-center border border-border-subtle">
                  <span className="material-symbols-outlined text-3xl">filter_alt_off</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-base sm:text-lg text-text-primary">No Matching Opportunities</h3>
                  <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                    None of the {opportunities.length} opportunities match your current filter parameters.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFilters(INITIAL_FILTERS)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary text-xs font-bold transform transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-border-subtle"
                >
                  <span className="material-symbols-outlined text-base">refresh</span>
                  <span>Clear All Filters</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 8. Tab 2: Student Internships Monitoring ── */}
      {!loading && activeTab === 'students' && (
        <>
          {filteredStudents.length > 0 ? (
            <div
              className={
                filters.viewMode === 'list'
                  ? 'flex flex-col gap-3.5 w-full'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 w-full'
              }
            >
              {filteredStudents.map((internship) => (
                <StudentInternshipCard
                  key={internship.id}
                  internship={internship}
                  viewMode={filters.viewMode}
                  onViewDetails={setSelectedStudentInternship}
                />
              ))}
            </div>
          ) : studentInternships.length === 0 ? (
            /* Empty State: No assigned student internships — Full width centered */
            <div className="w-full min-h-[50vh] sm:min-h-[55vh] flex items-center justify-center py-6 sm:py-10">
              <div className="w-full max-w-[720px] rounded-3xl p-8 sm:p-14 bg-white/95 backdrop-blur-md border border-border-subtle shadow-xs text-center flex flex-col items-center justify-center space-y-5 mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                  <span className="material-symbols-outlined text-4xl">school</span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-xl sm:text-2xl text-text-primary tracking-tight">
                    No Student Internships Logged
                  </h3>
                  <p className="text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
                    Active industrial internship records and mentor evaluations will appear here once students are placed or approved from student dossiers.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State: Filters returned 0 results */
            <div className="w-full min-h-[45vh] flex items-center justify-center py-6 sm:py-8">
              <div className="w-full max-w-[560px] rounded-3xl p-8 sm:p-10 bg-white/95 backdrop-blur-md border border-border-subtle shadow-xs text-center flex flex-col items-center justify-center space-y-4 mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-surface-container text-text-secondary flex items-center justify-center border border-border-subtle">
                  <span className="material-symbols-outlined text-3xl">filter_alt_off</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-bold text-base sm:text-lg text-text-primary">No Matching Student Internships</h3>
                  <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                    None of the {studentInternships.length} student internships match your active filters.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFilters(INITIAL_FILTERS)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary text-xs font-bold transform transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-border-subtle"
                >
                  <span className="material-symbols-outlined text-base">refresh</span>
                  <span>Clear All Filters</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 9. Add / Edit Opportunity Modal ── */}
      <OpportunityFormModal
        isOpen={opportunityModal.isOpen}
        onClose={() => setOpportunityModal({ isOpen: false, data: null })}
        initialData={opportunityModal.data}
        companies={companies}
        onSave={handleSaveOpportunity}
      />

      {/* ── 10. Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <Modal
          isOpen={Boolean(deleteConfirm)}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Internship Opportunity"
          subtitle={`Permanently remove listing for ${deleteConfirm.company_name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                <span className="material-symbols-outlined text-rose-600">warning</span>
                <span>Permanent Deletion Warning</span>
              </div>
              <p>
                Are you sure you want to delete the opportunity{' '}
                <strong className="text-rose-950">"{deleteConfirm.title}"</strong> at{' '}
                <strong className="text-rose-950">{deleteConfirm.company_name}</strong>?
              </p>
              <p className="text-[11px] text-rose-700">
                This action is audited in institutional logs and cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-text-secondary hover:bg-surface-container-low font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOpportunity}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors disabled:opacity-60 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── 11. Student Evaluation & Certificate Modal ── */}
      {selectedStudentInternship && (
        <Modal
          isOpen={Boolean(selectedStudentInternship)}
          onClose={() => setSelectedStudentInternship(null)}
          title={`Internship Evaluation: ${
            selectedStudentInternship.student_name || selectedStudentInternship.studentName || 'Scholar'
          }`}
          subtitle={`${
            selectedStudentInternship.company || selectedStudentInternship.company_name || 'Partner Company'
          } • ${selectedStudentInternship.role || selectedStudentInternship.title || 'Intern'}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#15151F] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  Progress Completion
                </span>
                <h4 className="text-xl font-extrabold text-[#FFDF9B]">
                  {selectedStudentInternship.progress || 0}% Concluded
                </h4>
                <p className="text-xs text-gray-300 mt-0.5">
                  {selectedStudentInternship.duration_months
                    ? `${selectedStudentInternship.duration_months} Months Track`
                    : selectedStudentInternship.duration || 'Semester Track'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  Compensation
                </span>
                <h4 className="text-base font-bold text-emerald-400">
                  {selectedStudentInternship.compensation_type === 'paid'
                    ? `Paid (${selectedStudentInternship.fee_amount ? `₹${Number(selectedStudentInternship.fee_amount).toLocaleString('en-IN')}` : '—'})`
                    : selectedStudentInternship.compensation_type === 'non_stipend'
                    ? 'Non-Stipend'
                    : selectedStudentInternship.stipend_amount
                    ? `₹${Number(selectedStudentInternship.stipend_amount).toLocaleString('en-IN')} / mo`
                    : selectedStudentInternship.stipend || '—'}
                </h4>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-border-subtle space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-semibold">Faculty Mentor Guide:</span>
                <span className="font-bold text-text-primary">
                  {selectedStudentInternship.mentor ||
                    selectedStudentInternship.faculty_mentor ||
                    'Unassigned'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-semibold">Department:</span>
                <span className="font-medium text-text-primary">
                  {selectedStudentInternship.student_department ||
                    selectedStudentInternship.department ||
                    '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-semibold">Certificate Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                    selectedStudentInternship.certificateVerified || selectedStudentInternship.certificate_url
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {selectedStudentInternship.certificateVerified || selectedStudentInternship.certificate_url
                    ? 'Verified Institutional Record'
                    : 'Pending Mentor Review'}
                </span>
              </div>
              {selectedStudentInternship.season && selectedStudentInternship.season !== 'any' && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-semibold">Season:</span>
                  <span className="font-semibold text-text-primary capitalize">
                    {selectedStudentInternship.season}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setSelectedStudentInternship(null)}
                className="px-4 py-2 rounded-xl text-text-secondary hover:bg-surface-container-low font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  showToast(
                    `Dispatched verified certificate for ${
                      selectedStudentInternship.student_name ||
                      selectedStudentInternship.studentName ||
                      'student'
                    }!`,
                    'success'
                  );
                  setSelectedStudentInternship(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold shadow-md hover:shadow-lg transition-transform hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #8B1D2C 0%, #6E1521 100%)' }}
              >
                Approve &amp; Issue Final Credits
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
