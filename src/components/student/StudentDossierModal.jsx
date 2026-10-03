'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function StudentDossierModal({
  student,
  isOpen,
  onClose,
  onUpdated,
}) {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'projects' | 'git_projects' | 'certificates' | 'internships' | 'academics' | 'activity_log'
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals inside dossier
  const [activeModal, setActiveModal] = useState(null); // 'edit_profile' | 'add_project' | 'edit_project' | 'add_git' | 'edit_git' | 'add_cert' | 'edit_cert' | 'add_internship' | 'edit_internship' | 'confirm_academic'
  const [activeItem, setActiveItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, id, title }

  // Form states
  const [profileForm, setProfileForm] = useState({
    bio: '',
    headline: '',
    skills: [],
    skillInput: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    resume_url: '',
  });

  const [projectForm, setProjectForm] = useState({
    id: null,
    title: '',
    description: '',
    tech_stack: '',
    live_url: '',
    start_date: '',
    end_date: '',
    is_visible: true,
  });

  const [gitForm, setGitForm] = useState({
    id: null,
    repo_name: '',
    repo_url: '',
    description: '',
    primary_language: 'TypeScript',
    stars: 0,
    is_visible: true,
  });

  const [certForm, setCertForm] = useState({
    id: null,
    title: '',
    issuer: '',
    issue_date: '',
    credential_id: '',
    credential_url: '',
    file_path: '',
    is_visible: true,
  });

  const [internshipForm, setInternshipForm] = useState({
    id: null,
    company_name: '',
    role_title: '',
    location: '',
    mode: 'onsite',
    start_date: '',
    end_date: '',
    is_ongoing: false,
    stipend: '',
    status: 'ongoing',
    description: '',
  });

  // Academic Summary Form
  const [academicSummaryForm, setAcademicSummaryForm] = useState({
    cgpa: '',
    overall_attendance: '',
    backlogs: '',
  });
  const [pendingAcademicSave, setPendingAcademicSave] = useState(null);

  // Semester Records
  const [semesterRecords, setSemesterRecords] = useState([]);
  const [activeSemForGrades, setActiveSemForGrades] = useState(1);
  const [gradesRows, setGradesRows] = useState([]);

  // Audit filter
  const [auditFilter, setAuditFilter] = useState('all');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const studentId = student?.id || student?.roll || student?.roll_number || student?.roll_no;

  // Load Dossier Data
  const fetchDossier = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        headers: {
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.dossier || json.request || student;
        setDossier(data);
        syncFormsFromDossier(data);
      } else {
        setDossier(student);
        syncFormsFromDossier(student);
      }
    } catch {
      setDossier(student);
      syncFormsFromDossier(student);
    } finally {
      setLoading(false);
    }
  };

  const syncFormsFromDossier = (data) => {
    const prof = data.profile || {};
    setProfileForm({
      bio: prof.bio || data.bio || '',
      headline: prof.headline || data.headline || '',
      skills: (Array.isArray(prof.skills) && prof.skills.length > 0)
        ? prof.skills
        : (Array.isArray(data.skills) ? data.skills : []),
      skillInput: '',
      linkedin_url: prof.linkedin_url || data.linkedin_url || '',
      github_url: prof.github_url || data.github_url || '',
      portfolio_url: prof.portfolio_url || data.portfolio_url || '',
      resume_url: prof.resume_url || data.resume_url || '',
    });

    const acad = data.academic_summary || {};
    setAcademicSummaryForm({
      cgpa: acad.cgpa != null ? String(acad.cgpa) : (data.cgpa != null ? String(data.cgpa) : ''),
      overall_attendance: acad.overall_attendance != null ? String(acad.overall_attendance) : (data.overall_attendance != null ? String(data.overall_attendance) : ''),
      backlogs: acad.backlogs != null ? String(acad.backlogs) : (data.backlogs != null ? String(data.backlogs) : ''),
    });

    // Populate semester records (1 to 8 by default)
    const storedSems = data.semester_records || [];
    const fullSems = [];
    for (let sem = 1; sem <= 8; sem++) {
      const match = storedSems.find((s) => s.semester === sem);
      fullSems.push({
        semester: sem,
        sgpa: match?.sgpa != null ? String(match.sgpa) : '',
        attendance_pct: match?.attendance_pct != null ? String(match.attendance_pct) : '',
        remarks: match?.remarks || '',
        academic_year: match?.academic_year || `Semester ${sem}`,
        updated_at: match?.updated_at || null,
      });
    }
    setSemesterRecords(fullSems);

    // Grades for active semester
    const allGrades = data.grades || [];
    const currentSemGrades = allGrades.filter((g) => g.semester === activeSemForGrades);
    setGradesRows(currentSemGrades.length > 0 ? currentSemGrades : [
      { subject_code: '', subject_name: '', credits: '', grade: '', grade_points: '' },
    ]);
  };

  useEffect(() => {
    if (!isOpen || !student) {
      setDossier(null);
      return;
    }

    fetchDossier();

    const targetId = student?.id || student?.roll || student?.roll_number || student?.roll_no;
    const channelId = `admin-dossier-${String(targetId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        const studentId = student?.id;
        const studentRoll = student?.roll || student?.roll_number || student?.roll_no;
        if (
          payload.new?.id === studentId ||
          payload.old?.id === studentId ||
          payload.new?.roll_no === studentRoll ||
          payload.old?.roll_no === studentRoll
        ) {
          showToast('Live update: Student details updated in real time');
          fetchDossier();
          if (onUpdated) onUpdated();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_profiles' }, (payload) => {
        const studentId = student?.id;
        if (payload.new?.student_id === studentId || payload.old?.student_id === studentId) {
          showToast('Live update: Student profile & portfolio updated in real time');
          fetchDossier();
          if (onUpdated) onUpdated();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_projects' }, (payload) => {
        const studentId = student?.id;
        if (!payload.new?.student_id || payload.new?.student_id === studentId || payload.old?.student_id === studentId) {
          showToast('Live update: Student projects updated');
          fetchDossier();
          if (onUpdated) onUpdated();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_git_projects' }, (payload) => {
        const studentId = student?.id;
        if (!payload.new?.student_id || payload.new?.student_id === studentId || payload.old?.student_id === studentId) {
          fetchDossier();
          if (onUpdated) onUpdated();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_certificates' }, (payload) => {
        const studentId = student?.id;
        if (!payload.new?.student_id || payload.new?.student_id === studentId || payload.old?.student_id === studentId) {
          fetchDossier();
          if (onUpdated) onUpdated();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_internships' }, (payload) => {
        const studentId = student?.id;
        if (!payload.new?.student_id || payload.new?.student_id === studentId || payload.old?.student_id === studentId) {
          fetchDossier();
          if (onUpdated) onUpdated();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_academic_summary' }, () => {
        showToast('Live update: Student academic summary updated');
        fetchDossier();
        if (onUpdated) onUpdated();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_semester_records' }, () => {
        fetchDossier();
        if (onUpdated) onUpdated();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_grades' }, () => {
        fetchDossier();
        if (onUpdated) onUpdated();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_audit_log' }, () => {
        fetchDossier();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, student]);

  // Update grades rows when active semester changes
  useEffect(() => {
    if (dossier) {
      const allGrades = dossier.grades || [];
      const currentSemGrades = allGrades.filter((g) => g.semester === activeSemForGrades);
      setGradesRows(currentSemGrades.length > 0 ? currentSemGrades : [
        { subject_code: '', subject_name: '', credits: '', grade: '', grade_points: '' },
      ]);
    }
  }, [activeSemForGrades, dossier]);

  // Filtered Audit logs — must be above the early-return to keep hook count stable
  const filteredAuditLogs = useMemo(() => {
    const d = dossier || student;
    const logs = d?.audit_logs || [];
    if (auditFilter === 'all') return logs;
    return logs.filter((l) => l.table_name === auditFilter);
  }, [dossier, student, auditFilter]);

  if (!isOpen || !student) return null;

  const data = dossier || student;
  const fullName = data.full_name || data.name || 'RIMT Scholar';
  const rollNo = data.roll_number || data.roll_no || '—';
  const dept = data.department || data.course || 'Academic Department';
  const batch = data.year_semester || data.batch || 'Enrolled Scholar';
  const status = (data.status || 'PENDING').toUpperCase();
  const isApproved = status === 'APPROVED' || status === 'VERIFIED';
  const lastUpdated = data.academic_summary?.updated_at || data.updated_at || data.created_at;

  // Handler for Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({
          type: 'profile',
          data: {
            bio: profileForm.bio,
            headline: profileForm.headline,
            skills: profileForm.skills,
            linkedin_url: profileForm.linkedin_url,
            github_url: profileForm.github_url,
            portfolio_url: profileForm.portfolio_url,
            resume_url: profileForm.resume_url,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to update student profile');
      showToast('Student profile & bio updated successfully');
      setActiveModal(null);
      await fetchDossier();
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handler for Academic Summary Submit -> Trigger Confirm Modal
  const handleAcademicSummarySubmit = (e) => {
    e.preventDefault();
    if (!isApproved) {
      showToast('Only approved students can have their academic scores edited.', 'error');
      return;
    }
    const oldCgpa = data.academic_summary?.cgpa != null ? Number(data.academic_summary.cgpa) : (data.cgpa != null ? Number(data.cgpa) : null);
    const oldAtt = data.academic_summary?.overall_attendance != null ? Number(data.academic_summary.overall_attendance) : null;
    const oldBacklogs = data.academic_summary?.backlogs != null ? Number(data.academic_summary.backlogs) : null;

    setPendingAcademicSave({
      cgpa: academicSummaryForm.cgpa ? Number(academicSummaryForm.cgpa) : null,
      overall_attendance: academicSummaryForm.overall_attendance ? Number(academicSummaryForm.overall_attendance) : null,
      backlogs: academicSummaryForm.backlogs ? parseInt(academicSummaryForm.backlogs, 10) : 0,
      oldCgpa,
      oldAtt,
      oldBacklogs,
    });
    setActiveModal('confirm_academic');
  };

  // Confirmed Academic Summary Save
  const handleConfirmAcademicSave = async () => {
    if (!pendingAcademicSave) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({
          type: 'academic_summary',
          data: {
            cgpa: pendingAcademicSave.cgpa,
            overall_attendance: pendingAcademicSave.overall_attendance,
            backlogs: pendingAcademicSave.backlogs,
          },
        }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to save academic summary');
      }
      showToast('Manual academic summary saved and recorded in audit log');
      setActiveModal(null);
      setPendingAcademicSave(null);
      await fetchDossier();
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Single Semester Record
  const handleSaveSemesterRecord = async (semIndex) => {
    if (!isApproved) {
      showToast('Only approved students can have semester scores edited.', 'error');
      return;
    }
    const sem = semesterRecords[semIndex];
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({
          type: 'semester_record',
          data: {
            semester: sem.semester,
            sgpa: sem.sgpa ? Number(sem.sgpa) : null,
            attendance_pct: sem.attendance_pct ? Number(sem.attendance_pct) : null,
            remarks: sem.remarks,
            academic_year: sem.academic_year,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to update semester record');
      showToast(`Semester ${sem.semester} record updated successfully`);
      await fetchDossier();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Grades for Active Semester (Bulk Save)
  const handleSaveGrades = async () => {
    if (!isApproved) {
      showToast('Only approved students can have grades edited.', 'error');
      return;
    }
    setSaving(true);
    try {
      const filtered = gradesRows.filter((r) => r.subject_name?.trim());
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify({
          type: 'grades',
          data: {
            semester: activeSemForGrades,
            rows: filtered.map((r) => ({
              subject_code: r.subject_code,
              subject_name: r.subject_name,
              credits: r.credits ? Number(r.credits) : null,
              grade: r.grade,
              grade_points: r.grade_points ? Number(r.grade_points) : null,
            })),
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to save grades grid');
      showToast(`Semester ${activeSemForGrades} grades saved. (CGPA unchanged per manual guarantee)`);
      await fetchDossier();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Section CRUD Generic Dispatches
  const handleSaveProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = Boolean(projectForm.id);
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer rimt-admin-master-token', 'x-admin-portal': 'true' },
        body: JSON.stringify({
          type: 'project',
          action: isEdit ? 'update' : 'create',
          data: projectForm,
        }),
      });
      if (!res.ok) throw new Error('Failed to save project');
      showToast(isEdit ? 'Project updated' : 'Project added');
      setActiveModal(null);
      await fetchDossier();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGitProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = Boolean(gitForm.id);
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer rimt-admin-master-token', 'x-admin-portal': 'true' },
        body: JSON.stringify({
          type: 'git_project',
          action: isEdit ? 'update' : 'create',
          data: gitForm,
        }),
      });
      if (!res.ok) throw new Error('Failed to save Git repository');
      showToast(isEdit ? 'Git repository updated' : 'Git repository added');
      setActiveModal(null);
      await fetchDossier();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCertificate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = Boolean(certForm.id);
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer rimt-admin-master-token', 'x-admin-portal': 'true' },
        body: JSON.stringify({
          type: 'certificate',
          action: isEdit ? 'update' : 'create',
          data: certForm,
        }),
      });
      if (!res.ok) throw new Error('Failed to save certificate');
      showToast(isEdit ? 'Certificate updated' : 'Certificate added');
      setActiveModal(null);
      await fetchDossier();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInternship = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isEdit = Boolean(internshipForm.id);
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer rimt-admin-master-token', 'x-admin-portal': 'true' },
        body: JSON.stringify({
          type: 'internship',
          action: isEdit ? 'update' : 'create',
          data: internshipForm,
        }),
      });
      if (!res.ok) throw new Error('Failed to save internship');
      showToast(isEdit ? 'Internship updated' : 'Internship added');
      setActiveModal(null);
      await fetchDossier();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer rimt-admin-master-token', 'x-admin-portal': 'true' },
        body: JSON.stringify({
          type: deleteConfirm.type,
          action: 'delete',
          data: { id: deleteConfirm.id },
        }),
      });
      if (!res.ok) throw new Error('Failed to delete item');
      showToast(`${deleteConfirm.title} deleted successfully`);
      setDeleteConfirm(null);
      await fetchDossier();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Visibility
  const handleToggleVisibility = async (type, item) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer rimt-admin-master-token', 'x-admin-portal': 'true' },
        body: JSON.stringify({
          type,
          action: 'update',
          data: { id: item.id, is_visible: !item.is_visible },
        }),
      });
      showToast(`Visibility toggled to ${!item.is_visible ? 'Visible' : 'Hidden'}`);
      await fetchDossier();
    } catch {
      showToast('Failed to toggle visibility', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintDossier = () => {
    window.print();
  };


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[92vh] print:max-h-none print:w-full bg-[#FAF6F0] rounded-2xl shadow-2xl border border-[#DECDBE] flex flex-col overflow-hidden text-text-primary">
        
        {/* Toast Alert Notification */}
        {toast && (
          <div
            className={`absolute top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg font-medium text-xs flex items-center gap-2 border transition-all ${
              toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* 1. STICKY INSTITUTIONAL HEADER */}
        <div className="sticky top-0 z-30 bg-[#F4EDE4] border-b border-[#DECDBE] px-5 py-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Student Avatar - WhatsApp-Style Human Demo Silhouette */}
            <div className="relative w-12 h-12 rounded-xl bg-[#E8DDD2] flex items-center justify-center border border-[#DECDBE] shadow-sm shrink-0 overflow-hidden">
              {data.avatar_url ? (
                <img src={data.avatar_url} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#DFD3C3] text-[#7A6B5D]">
                  <svg className="w-8 h-8 translate-y-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
              {isApproved && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success-green ring-2 ring-[#F4EDE4] flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>
                </span>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight truncate">
                  {fullName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-tint-maroon text-primary border border-rose-200">
                  {dept}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isApproved
                      ? 'bg-tint-green text-success-green border-emerald-200'
                      : status === 'PENDING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <span className="font-mono font-medium">{rollNo}</span>
                <span>•</span>
                <span>{batch}</span>
                {lastUpdated && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline text-[11px]">
                      Last updated: {new Date(lastUpdated).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrintDossier}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFE5D8] hover:bg-[#E5D9CB] border border-[#DECDBE] text-text-primary font-semibold text-xs transition-colors shadow-2xs"
              title="Export official dossier to printable PDF"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-600 hover:text-text-primary hover:bg-[#EFE5D8] transition-colors"
              title="Close dossier"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Read-Only Status Banner if student is not APPROVED */}
        {!isApproved && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-sm">lock</span>
              <span>
                <strong>Read-Only Mode:</strong> This student’s registration status is <strong>{status}</strong>. Academic scores and records can only be entered and modified once an administrator approves their onboarding application.
              </span>
            </div>
          </div>
        )}

        {/* 2. NAVIGATION TABS (7 SECTIONS) */}
        <div className="bg-[#EFE5D8] px-4 sm:px-6 border-b border-[#DECDBE] flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'overview', label: 'Overview', icon: 'person', count: null },
            { id: 'projects', label: 'Projects', icon: 'deployed_code', count: (data.projects || []).length },
            { id: 'git_projects', label: 'Git Projects', icon: 'code', count: (data.git_projects || []).length },
            { id: 'certificates', label: 'Certificates', icon: 'verified', count: (data.certificates || []).length },
            { id: 'internships', label: 'Internships', icon: 'work', count: (data.internships || []).length },
            { id: 'academics', label: 'Academics', icon: 'school', count: null, highlight: true },
            { id: 'activity_log', label: 'Activity Log', icon: 'history', count: (data.audit_logs || []).length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary text-primary bg-[#FAF6F0] font-bold shadow-2xs'
                    : 'border-transparent text-stone-600 hover:text-stone-900 hover:border-stone-400'
                }`}
              >
                <span className={`material-symbols-outlined text-base ${isActive ? 'text-primary' : 'text-stone-500'}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-primary text-white' : 'bg-[#E2D6C7] text-stone-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.highlight && !tab.count && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Manual-only records" />
                )}
              </button>
            );
          })}
        </div>

        {/* 3. SCROLLABLE TAB CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#FAF6F0]">

          {/* TAB 1: OVERVIEW (Bio, Headline, Skills, Links) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Scholar Overview &amp; Bio</h3>
                  <p className="text-xs text-text-secondary">Official student biography, professional headline, skills, and portfolio links.</p>
                </div>
                <button
                  onClick={() => setActiveModal('edit_profile')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white font-semibold text-xs shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>Edit Overview</span>
                </button>
              </div>

              {/* Bio card */}
              <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Professional Headline</h4>
                <p className="text-sm font-semibold text-text-primary">{profileForm.headline || 'No headline set'}</p>

                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary pt-2">Biography &amp; Summary</h4>
                <p className="text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {profileForm.bio || 'No biography has been recorded for this student.'}
                </p>
              </div>

              {/* Skills Tags */}
              <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Verified Professional Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {profileForm.skills && profileForm.skills.length > 0 ? (
                    profileForm.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-low text-text-primary border border-border-subtle text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-text-secondary italic">No skills tagged yet. Click Edit Overview to add tags.</span>
                  )}
                </div>
              </div>

              {/* Verified Links Grid */}
              <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Official Portfolios &amp; Links</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                    <span className="material-symbols-outlined text-[#0A66C2]">link</span>
                    <span className="font-semibold text-text-secondary">LinkedIn:</span>
                    {profileForm.linkedin_url ? (
                      <a href={profileForm.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                        {profileForm.linkedin_url}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not specified</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                    <span className="material-symbols-outlined text-slate-800">code</span>
                    <span className="font-semibold text-text-secondary">GitHub:</span>
                    {profileForm.github_url ? (
                      <a href={profileForm.github_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                        {profileForm.github_url}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not specified</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                    <span className="material-symbols-outlined text-indigo-600">language</span>
                    <span className="font-semibold text-text-secondary">Portfolio:</span>
                    {profileForm.portfolio_url ? (
                      <a href={profileForm.portfolio_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                        {profileForm.portfolio_url}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not specified</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low border border-border-subtle">
                    <span className="material-symbols-outlined text-rose-600">description</span>
                    <span className="font-semibold text-text-secondary">Resume:</span>
                    {profileForm.resume_url ? (
                      <a href={profileForm.resume_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                        {profileForm.resume_url}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not specified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Featured Academic &amp; Capstone Projects</h3>
                  <p className="text-xs text-text-secondary">Admin-managed project records, tech stack tags, live links, and visibility control.</p>
                </div>
                <button
                  onClick={() => {
                    setProjectForm({
                      id: null,
                      title: '',
                      description: '',
                      tech_stack: '',
                      live_url: '',
                      start_date: '',
                      end_date: '',
                      is_visible: true,
                    });
                    setActiveModal('add_project');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white font-semibold text-xs shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Project</span>
                </button>
              </div>

              {(!data.projects || data.projects.length === 0) ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border-subtle bg-surface-container-lowest text-text-secondary text-xs">
                  No projects recorded yet. Click &quot;Add Project&quot; to create the first verified project entry.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.projects.map((project) => (
                    <div
                      key={project.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        project.is_visible ? 'border-border-subtle bg-surface-container-lowest' : 'border-slate-200 bg-slate-50/70 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-text-primary">{project.title}</h4>
                            {!project.is_visible && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 text-slate-600">
                                Hidden
                              </span>
                            )}
                          </div>
                          {project.start_date && (
                            <span className="text-[11px] text-text-secondary font-mono">
                              {project.start_date} {project.end_date ? `to ${project.end_date}` : '(Ongoing)'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleVisibility('project', project)}
                            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-container"
                            title={project.is_visible ? 'Hide from student portal' : 'Make visible to student'}
                          >
                            <span className="material-symbols-outlined text-base">
                              {project.is_visible ? 'visibility' : 'visibility_off'}
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setProjectForm({
                                id: project.id,
                                title: project.title,
                                description: project.description || '',
                                tech_stack: Array.isArray(project.tech_stack) ? project.tech_stack.join(', ') : (project.tech_stack || ''),
                                live_url: project.live_url || '',
                                start_date: project.start_date || '',
                                end_date: project.end_date || '',
                                is_visible: project.is_visible,
                              });
                              setActiveModal('edit_project');
                            }}
                            className="p-1 rounded text-text-secondary hover:text-primary hover:bg-surface-container"
                            title="Edit project"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'project', id: project.id, title: project.title })}
                            className="p-1 rounded text-text-secondary hover:text-rose-600 hover:bg-rose-50"
                            title="Delete project"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>

                      {project.description && (
                        <p className="text-xs text-text-secondary mt-2 line-clamp-2">{project.description}</p>
                      )}

                      {project.tech_stack && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {(Array.isArray(project.tech_stack) ? project.tech_stack : String(project.tech_stack).split(',')).map((t, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-text-primary font-medium">
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {project.live_url && (
                        <div className="mt-3 pt-2 border-t border-border-subtle">
                          <a
                            href={project.live_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                            <span>{project.live_url}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GIT PROJECTS */}
          {activeTab === 'git_projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Source Repositories (Git Projects)</h3>
                  <p className="text-xs text-text-secondary">Official code repositories, star metrics, and language metadata.</p>
                </div>
                <button
                  onClick={() => {
                    setGitForm({
                      id: null,
                      repo_name: '',
                      repo_url: '',
                      description: '',
                      primary_language: 'JavaScript',
                      stars: 0,
                      is_visible: true,
                    });
                    setActiveModal('add_git');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white font-semibold text-xs shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Git Repo</span>
                </button>
              </div>

              {(!data.git_projects || data.git_projects.length === 0) ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border-subtle bg-surface-container-lowest text-text-secondary text-xs">
                  No Git repositories recorded yet. Click &quot;Add Git Repo&quot; to link source code projects.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.git_projects.map((repo) => (
                    <div
                      key={repo.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        repo.is_visible ? 'border-border-subtle bg-surface-container-lowest' : 'border-slate-200 bg-slate-50/70 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-700 text-lg">code</span>
                          <div>
                            <h4 className="text-sm font-bold text-text-primary">{repo.repo_name}</h4>
                            <span className="text-[11px] text-text-secondary">{repo.primary_language || 'Code'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleVisibility('git_project', repo)}
                            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-container"
                            title={repo.is_visible ? 'Hide' : 'Show'}
                          >
                            <span className="material-symbols-outlined text-base">
                              {repo.is_visible ? 'visibility' : 'visibility_off'}
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setGitForm({
                                id: repo.id,
                                repo_name: repo.repo_name,
                                repo_url: repo.repo_url,
                                description: repo.description || '',
                                primary_language: repo.primary_language || 'JavaScript',
                                stars: repo.stars || 0,
                                is_visible: repo.is_visible,
                              });
                              setActiveModal('edit_git');
                            }}
                            className="p-1 rounded text-text-secondary hover:text-primary hover:bg-surface-container"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'git_project', id: repo.id, title: repo.repo_name })}
                            className="p-1 rounded text-text-secondary hover:text-rose-600 hover:bg-rose-50"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>

                      {repo.description && (
                        <p className="text-xs text-text-secondary mt-2 line-clamp-2">{repo.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-subtle text-xs">
                        <a
                          href={repo.repo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary font-medium hover:underline inline-flex items-center gap-1 truncate"
                        >
                          <span className="material-symbols-outlined text-xs">link</span>
                          <span className="truncate">{repo.repo_url}</span>
                        </a>
                        {repo.stars != null && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                            ★ {repo.stars}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Verified Project &amp; Skill Certificates</h3>
                  <p className="text-xs text-text-secondary">Official institutional certifications stored in student-certificates vault.</p>
                </div>
                <button
                  onClick={() => {
                    setCertForm({
                      id: null,
                      title: '',
                      issuer: '',
                      issue_date: '',
                      credential_id: '',
                      credential_url: '',
                      file_path: '',
                      is_visible: true,
                    });
                    setActiveModal('add_cert');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white font-semibold text-xs shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Certificate</span>
                </button>
              </div>

              {(!data.certificates || data.certificates.length === 0) ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border-subtle bg-surface-container-lowest text-text-secondary text-xs">
                  No verified certificates recorded yet. Click &quot;Add Certificate&quot; to attach verifiable credentials.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        cert.is_visible ? 'border-border-subtle bg-surface-container-lowest' : 'border-slate-200 bg-slate-50/70 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-tint-green text-success-green flex items-center justify-center border border-emerald-200">
                            <span className="material-symbols-outlined text-base">verified</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-text-primary">{cert.title}</h4>
                            <span className="text-[11px] text-text-secondary">{cert.issuer || 'Institutional Authority'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleVisibility('certificate', cert)}
                            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-container"
                          >
                            <span className="material-symbols-outlined text-base">
                              {cert.is_visible ? 'visibility' : 'visibility_off'}
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setCertForm({
                                id: cert.id,
                                title: cert.title,
                                issuer: cert.issuer || '',
                                issue_date: cert.issue_date || '',
                                credential_id: cert.credential_id || '',
                                credential_url: cert.credential_url || '',
                                file_path: cert.file_path || '',
                                is_visible: cert.is_visible,
                              });
                              setActiveModal('edit_cert');
                            }}
                            className="p-1 rounded text-text-secondary hover:text-primary hover:bg-surface-container"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'certificate', id: cert.id, title: cert.title })}
                            className="p-1 rounded text-text-secondary hover:text-rose-600 hover:bg-rose-50"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border-subtle text-xs text-text-secondary">
                        {cert.issue_date && <span>Issued: {cert.issue_date}</span>}
                        {cert.credential_id && <span className="font-mono">ID: {cert.credential_id}</span>}
                        {cert.credential_url && (
                          <a href={cert.credential_url} target="_blank" rel="noreferrer" className="text-primary hover:underline ml-auto">
                            Verify URL
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: INTERNSHIPS */}
          {activeTab === 'internships' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Industrial Internships &amp; Work Experience</h3>
                  <p className="text-xs text-text-secondary">Tracks 6-month industrial attachments, corporate roles, and stipend packages.</p>
                </div>
                <button
                  onClick={() => {
                    setInternshipForm({
                      id: null,
                      company_name: '',
                      role_title: '',
                      location: '',
                      mode: 'onsite',
                      start_date: '',
                      end_date: '',
                      is_ongoing: false,
                      stipend: '',
                      status: 'ongoing',
                      description: '',
                    });
                    setActiveModal('add_internship');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white font-semibold text-xs shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Internship</span>
                </button>
              </div>

              {(!data.internships || data.internships.length === 0) ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border-subtle bg-surface-container-lowest text-text-secondary text-xs">
                  No internships recorded yet. Click &quot;Add Internship&quot; to log industrial training.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.internships.map((internship) => (
                    <div
                      key={internship.id}
                      className="p-4 rounded-2xl border border-border-subtle bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-tint-maroon text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          <span className="material-symbols-outlined text-lg">business</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-text-primary">{internship.role_title}</h4>
                            <span className="text-xs text-text-secondary">@</span>
                            <span className="text-sm font-semibold text-primary">{internship.company_name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                internship.status === 'completed'
                                  ? 'bg-tint-green text-success-green'
                                  : internship.status === 'ongoing'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {internship.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary mt-1">
                            {internship.location && <span>📍 {internship.location} ({internship.mode})</span>}
                            {internship.start_date && (
                              <span>
                                📅 {internship.start_date} to {internship.is_ongoing ? 'Present' : (internship.end_date || '—')}
                              </span>
                            )}
                            {internship.stipend && <span>💰 ₹{Number(internship.stipend).toLocaleString('en-IN')}/mo</span>}
                          </div>
                          {internship.description && (
                            <p className="text-xs text-text-secondary mt-2">{internship.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setInternshipForm({
                              id: internship.id,
                              company_name: internship.company_name,
                              role_title: internship.role_title,
                              location: internship.location || '',
                              mode: internship.mode || 'onsite',
                              start_date: internship.start_date || '',
                              end_date: internship.end_date || '',
                              is_ongoing: Boolean(internship.is_ongoing),
                              stipend: internship.stipend != null ? String(internship.stipend) : '',
                              status: internship.status || 'ongoing',
                              description: internship.description || '',
                            });
                            setActiveModal('edit_internship');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-text-primary text-xs font-semibold border border-border-subtle"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'internship', id: internship.id, title: internship.company_name })}
                          className="p-1 rounded text-text-secondary hover:text-rose-600 hover:bg-rose-50"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: ACADEMICS (CRITICAL: MANUAL ONLY - NO AUTOMATION) */}
          {activeTab === 'academics' && (
            <div className="space-y-6">
              
              {/* Mandatory Policy Banner */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-700 text-lg mt-0.5">warning</span>
                <div className="space-y-1">
                  <span className="font-bold block text-sm">Manual-Only Academic Guarantee (No Auto-Calculation)</span>
                  <p className="text-amber-800 leading-relaxed">
                    Per university registrar policy, <strong>CGPA, attendance percentages, and subject grades are entered exclusively by university administrators</strong>. These values are never computed, recalculated, or overwritten by cron jobs, automated triggers, or student-app submissions. The admin&apos;s saved score is the single source of truth.
                  </p>
                </div>
              </div>

              {/* CARD 1: OVERALL ACADEMIC SUMMARY */}
              <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Cumulative Academic Standing</h3>
                    <span className="text-xs text-text-secondary">Official university metrics recorded in student_academic_summary</span>
                  </div>
                  {data.academic_summary?.updated_at && (
                    <span className="text-[11px] text-text-secondary">
                      Last edited: {new Date(data.academic_summary.updated_at).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <form onSubmit={handleAcademicSummarySubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* CGPA */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-secondary block">
                      Cumulative CGPA (0.00 – 10.00)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        placeholder="—"
                        disabled={!isApproved}
                        value={academicSummaryForm.cgpa}
                        onChange={(e) => setAcademicSummaryForm({ ...academicSummaryForm, cgpa: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-border-subtle font-mono text-base font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      />
                      <span className="text-xs text-text-secondary font-mono">/ 10.0</span>
                    </div>
                    <span className="text-[11px] text-text-secondary block">
                      {academicSummaryForm.cgpa ? `Equiv: ${(Number(academicSummaryForm.cgpa) * 9.5).toFixed(1)}%` : 'No CGPA entered (—)'}
                    </span>
                  </div>

                  {/* Attendance */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-secondary block">
                      Overall Attendance % (0 – 100)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="—"
                        disabled={!isApproved}
                        value={academicSummaryForm.overall_attendance}
                        onChange={(e) => setAcademicSummaryForm({ ...academicSummaryForm, overall_attendance: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-border-subtle font-mono text-base font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      />
                      <span className="text-xs text-text-secondary font-mono">%</span>
                    </div>
                    <span className="text-[11px] text-text-secondary block">
                      {academicSummaryForm.overall_attendance ? `${academicSummaryForm.overall_attendance}% aggregate` : 'No attendance recorded (—)'}
                    </span>
                  </div>

                  {/* Backlogs */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-secondary block">
                      Active Backlogs (Arrears)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      disabled={!isApproved}
                      value={academicSummaryForm.backlogs}
                      onChange={(e) => setAcademicSummaryForm({ ...academicSummaryForm, backlogs: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest border border-border-subtle font-mono text-base font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                    <span className="text-[11px] text-text-secondary block">
                      {Number(academicSummaryForm.backlogs) === 0 ? 'Clear academic standing' : `${academicSummaryForm.backlogs} active backlogs`}
                    </span>
                  </div>

                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={!isApproved || saving}
                      className="px-5 py-2 rounded-xl bg-primary text-white font-semibold text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>Save Academic Summary (Confirm Modal)</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* CARD 2: SEMESTER RECORDS TABLE */}
              <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Semester-by-Semester Progression</h3>
                    <span className="text-xs text-text-secondary">Admin entered SGPA and attendance rates for Semesters 1 through 8.</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-container-low text-text-secondary uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Semester</th>
                        <th className="py-2.5 px-3">SGPA (0.00 – 10.00)</th>
                        <th className="py-2.5 px-3">Attendance %</th>
                        <th className="py-2.5 px-3">Official Remarks</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle font-medium">
                      {semesterRecords.map((sem, idx) => (
                        <tr key={sem.semester} className="hover:bg-surface-container-low/50">
                          <td className="py-2.5 px-3 font-semibold text-text-primary whitespace-nowrap">
                            Semester {sem.semester}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="10"
                              placeholder="—"
                              disabled={!isApproved}
                              value={sem.sgpa}
                              onChange={(e) => {
                                const next = [...semesterRecords];
                                next[idx].sgpa = e.target.value;
                                setSemesterRecords(next);
                              }}
                              className="w-24 px-2 py-1 rounded bg-surface-container-low border border-border-subtle font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="—"
                                disabled={!isApproved}
                                value={sem.attendance_pct}
                                onChange={(e) => {
                                  const next = [...semesterRecords];
                                  next[idx].attendance_pct = e.target.value;
                                  setSemesterRecords(next);
                                }}
                                className="w-20 px-2 py-1 rounded bg-surface-container-low border border-border-subtle font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                              />
                              <span className="text-text-secondary">%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder="e.g. Regular pass, Distinction"
                              disabled={!isApproved}
                              value={sem.remarks}
                              onChange={(e) => {
                                const next = [...semesterRecords];
                                next[idx].remarks = e.target.value;
                                setSemesterRecords(next);
                              }}
                              className="w-full min-w-[140px] px-2 py-1 rounded bg-surface-container-low border border-border-subtle text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              disabled={!isApproved || saving}
                              onClick={() => handleSaveSemesterRecord(idx)}
                              className="px-2.5 py-1 rounded bg-surface-container-low hover:bg-surface-container text-text-primary text-xs font-semibold border border-border-subtle disabled:opacity-40 transition-colors"
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CARD 3: COURSE GRADES GRID */}
              <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Subject Course Grades Grid</h3>
                    <span className="text-xs text-text-secondary">
                      Bulk-save letter grades &amp; credits for each course. (Independent of CGPA)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-text-secondary">Semester:</label>
                    <select
                      value={activeSemForGrades}
                      onChange={(e) => setActiveSemForGrades(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-border-subtle text-xs font-bold text-text-primary focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-container-low text-text-secondary uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Subject Code</th>
                        <th className="py-2.5 px-3">Subject Name</th>
                        <th className="py-2.5 px-3">Credits</th>
                        <th className="py-2.5 px-3">Grade</th>
                        <th className="py-2.5 px-3">Grade Points</th>
                        <th className="py-2.5 px-3 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {gradesRows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="e.g. BCA-201"
                              disabled={!isApproved}
                              value={row.subject_code || ''}
                              onChange={(e) => {
                                const next = [...gradesRows];
                                next[idx].subject_code = e.target.value;
                                setGradesRows(next);
                              }}
                              className="w-28 px-2 py-1 rounded bg-surface-container-low border border-border-subtle font-mono text-xs uppercase"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="Course title"
                              disabled={!isApproved}
                              value={row.subject_name || ''}
                              onChange={(e) => {
                                const next = [...gradesRows];
                                next[idx].subject_name = e.target.value;
                                setGradesRows(next);
                              }}
                              className="w-full min-w-[160px] px-2 py-1 rounded bg-surface-container-low border border-border-subtle text-xs font-semibold"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="4.0"
                              disabled={!isApproved}
                              value={row.credits != null ? String(row.credits) : ''}
                              onChange={(e) => {
                                const next = [...gradesRows];
                                next[idx].credits = e.target.value;
                                setGradesRows(next);
                              }}
                              className="w-16 px-2 py-1 rounded bg-surface-container-low border border-border-subtle font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              placeholder="A+, O, B"
                              disabled={!isApproved}
                              value={row.grade || ''}
                              onChange={(e) => {
                                const next = [...gradesRows];
                                next[idx].grade = e.target.value;
                                setGradesRows(next);
                              }}
                              className="w-16 px-2 py-1 rounded bg-surface-container-low border border-border-subtle font-bold text-xs uppercase"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              placeholder="9.0"
                              disabled={!isApproved}
                              value={row.grade_points != null ? String(row.grade_points) : ''}
                              onChange={(e) => {
                                const next = [...gradesRows];
                                next[idx].grade_points = e.target.value;
                                setGradesRows(next);
                              }}
                              className="w-20 px-2 py-1 rounded bg-surface-container-low border border-border-subtle font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              disabled={!isApproved || gradesRows.length <= 1}
                              onClick={() => {
                                const next = gradesRows.filter((_, i) => i !== idx);
                                setGradesRows(next);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 disabled:opacity-20"
                            >
                              <span className="material-symbols-outlined text-base">remove_circle</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={!isApproved}
                    onClick={() => {
                      setGradesRows([
                        ...gradesRows,
                        { subject_code: '', subject_name: '', credits: '', grade: '', grade_points: '' },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-low text-text-primary text-xs font-semibold hover:bg-surface-container border border-border-subtle"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Add Subject Row</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isApproved || saving}
                    onClick={handleSaveGrades}
                    className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    Save Semester {activeSemForGrades} Grades (Bulk Save)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ACTIVITY LOG (AUDIT TRAIL) */}
          {activeTab === 'activity_log' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Administrative Audit Trail</h3>
                  <p className="text-xs text-text-secondary">Immutable log of all changes made to this scholar&apos;s records.</p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-secondary font-medium">Filter:</label>
                  <select
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-low border border-border-subtle text-xs font-semibold text-text-primary"
                  >
                    <option value="all">All Tables</option>
                    <option value="student_academic_summary">Academic Summary</option>
                    <option value="student_semester_records">Semester Records</option>
                    <option value="student_grades">Grades</option>
                    <option value="student_profiles">Profile / Bio</option>
                    <option value="student_projects">Projects</option>
                    <option value="student_certificates">Certificates</option>
                    <option value="student_internships">Internships</option>
                  </select>
                </div>
              </div>

              {filteredAuditLogs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border-subtle bg-surface-container-lowest text-text-secondary text-xs">
                  No audit log entries recorded for this filter.
                </div>
              ) : (
                <div className="rounded-2xl border border-border-subtle bg-surface-container-lowest overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-container-low text-text-secondary uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-4">Timestamp</th>
                        <th className="py-2.5 px-4">Action</th>
                        <th className="py-2.5 px-4">Category / Table</th>
                        <th className="py-2.5 px-4">Diff Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle font-mono text-[11px]">
                      {filteredAuditLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-surface-container-low/40">
                          <td className="py-2.5 px-4 whitespace-nowrap text-text-secondary font-sans text-xs">
                            {new Date(log.created_at).toLocaleDateString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                                log.action === 'insert'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : log.action === 'delete'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-sky-50 text-sky-700'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-text-primary font-semibold font-sans text-xs whitespace-nowrap">
                            {log.table_name}
                          </td>
                          <td className="py-2.5 px-4 text-text-secondary max-w-md truncate">
                            {log.new_data ? JSON.stringify(log.new_data) : (log.old_data ? `Deleted: ${JSON.stringify(log.old_data)}` : '—')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* 4. MODALS & FORMS OVERLAYS */}

        {/* Modal: Edit Overview */}
        {activeModal === 'edit_profile' && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle shadow-2xl max-w-lg w-full p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <h3 className="font-bold text-text-primary text-sm">Edit Scholar Overview</h3>
                <button onClick={() => setActiveModal(null)} className="p-1 rounded text-text-secondary hover:text-text-primary">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Professional Headline</label>
                  <input
                    type="text"
                    value={profileForm.headline}
                    onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. BCA Scholar @ RIMT University | Full-Stack Developer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-text-secondary">Biography &amp; Summary</label>
                    <span className="text-[10px] text-text-secondary">{profileForm.bio.length} / 2000 chars</span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={2000}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Describe academic focus, research interests, and technical capabilities..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Skills (type and press Enter)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={profileForm.skillInput}
                      onChange={(e) => setProfileForm({ ...profileForm, skillInput: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = profileForm.skillInput.trim();
                          if (val && !profileForm.skills.includes(val)) {
                            setProfileForm({
                              ...profileForm,
                              skills: [...profileForm.skills, val],
                              skillInput: '',
                            });
                          }
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-container-low border border-border-subtle text-xs"
                      placeholder="e.g. React Native, PostgreSQL, Python"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = profileForm.skillInput.trim();
                        if (val && !profileForm.skills.includes(val)) {
                          setProfileForm({
                            ...profileForm,
                            skills: [...profileForm.skills, val],
                            skillInput: '',
                          });
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-surface-container font-semibold text-xs text-text-primary"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {profileForm.skills.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-surface-container-low border border-border-subtle text-[11px] flex items-center gap-1">
                        {s}
                        <button
                          type="button"
                          onClick={() => setProfileForm({ ...profileForm, skills: profileForm.skills.filter((_, i) => i !== idx) })}
                          className="hover:text-rose-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={profileForm.linkedin_url}
                      onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">GitHub URL</label>
                    <input
                      type="url"
                      value={profileForm.github_url}
                      onChange={(e) => setProfileForm({ ...profileForm, github_url: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Portfolio URL</label>
                    <input
                      type="url"
                      value={profileForm.portfolio_url}
                      onChange={(e) => setProfileForm({ ...profileForm, portfolio_url: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Resume URL</label>
                    <input
                      type="url"
                      value={profileForm.resume_url}
                      onChange={(e) => setProfileForm({ ...profileForm, resume_url: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3.5 py-1.5 rounded-xl border border-border-subtle font-semibold text-text-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 rounded-xl bg-primary text-white font-semibold shadow-sm hover:bg-primary/90"
                  >
                    Save Overview
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Project Add/Edit */}
        {(activeModal === 'add_project' || activeModal === 'edit_project') && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <h3 className="font-bold text-text-primary text-sm">
                  {activeModal === 'add_project' ? 'Add Verified Project' : 'Edit Project Entry'}
                </h3>
                <button onClick={() => setActiveModal(null)} className="p-1 rounded text-text-secondary hover:text-text-primary">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveProject} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Project Title *</label>
                  <input
                    type="text"
                    required
                    value={projectForm.title}
                    onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Tech Stack (comma separated)</label>
                  <input
                    type="text"
                    placeholder="React Native, Node.js, PostgreSQL"
                    value={projectForm.tech_stack}
                    onChange={(e) => setProjectForm({ ...projectForm, tech_stack: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Live Demo / Repository URL</label>
                  <input
                    type="url"
                    value={projectForm.live_url}
                    onChange={(e) => setProjectForm({ ...projectForm, live_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Start Date</label>
                    <input
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">End Date</label>
                    <input
                      type="date"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="prjVisible"
                    checked={projectForm.is_visible}
                    onChange={(e) => setProjectForm({ ...projectForm, is_visible: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="prjVisible" className="text-text-primary font-medium">Visible to student on companion app</label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => setActiveModal(null)} className="px-3.5 py-1.5 rounded-xl border border-border-subtle">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-xl bg-primary text-white font-semibold">
                    Save Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Git Project Add/Edit */}
        {(activeModal === 'add_git' || activeModal === 'edit_git') && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <h3 className="font-bold text-text-primary text-sm">
                  {activeModal === 'add_git' ? 'Add Git Repository' : 'Edit Git Repository'}
                </h3>
                <button onClick={() => setActiveModal(null)} className="p-1 rounded text-text-secondary hover:text-text-primary">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveGitProject} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Repository Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. rimt-ai-ledger"
                    value={gitForm.repo_name}
                    onChange={(e) => setGitForm({ ...gitForm, repo_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Repository URL * (http:// or https://)</label>
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/rimt/project"
                    value={gitForm.repo_url}
                    onChange={(e) => setGitForm({ ...gitForm, repo_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Primary Language</label>
                    <input
                      type="text"
                      placeholder="TypeScript, Python"
                      value={gitForm.primary_language}
                      onChange={(e) => setGitForm({ ...gitForm, primary_language: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Stars Count</label>
                    <input
                      type="number"
                      min="0"
                      value={gitForm.stars}
                      onChange={(e) => setGitForm({ ...gitForm, stars: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={gitForm.description}
                    onChange={(e) => setGitForm({ ...gitForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => setActiveModal(null)} className="px-3.5 py-1.5 rounded-xl border border-border-subtle">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-xl bg-primary text-white font-semibold">
                    Save Repository
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Certificate Add/Edit */}
        {(activeModal === 'add_cert' || activeModal === 'edit_cert') && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <h3 className="font-bold text-text-primary text-sm">
                  {activeModal === 'add_cert' ? 'Add Verified Certificate' : 'Edit Certificate'}
                </h3>
                <button onClick={() => setActiveModal(null)} className="p-1 rounded text-text-secondary hover:text-text-primary">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveCertificate} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Certificate Title *</label>
                  <input
                    type="text"
                    required
                    value={certForm.title}
                    onChange={(e) => setCertForm({ ...certForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Issuing Authority / Organization</label>
                  <input
                    type="text"
                    placeholder="e.g. AWS, Oracle, Google Cloud, RIMT"
                    value={certForm.issuer}
                    onChange={(e) => setCertForm({ ...certForm, issuer: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={certForm.issue_date}
                      onChange={(e) => setCertForm({ ...certForm, issue_date: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Credential ID</label>
                    <input
                      type="text"
                      placeholder="CERT-12345"
                      value={certForm.credential_id}
                      onChange={(e) => setCertForm({ ...certForm, credential_id: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Verification URL</label>
                  <input
                    type="url"
                    value={certForm.credential_url}
                    onChange={(e) => setCertForm({ ...certForm, credential_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => setActiveModal(null)} className="px-3.5 py-1.5 rounded-xl border border-border-subtle">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-xl bg-primary text-white font-semibold">
                    Save Certificate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Internship Add/Edit */}
        {(activeModal === 'add_internship' || activeModal === 'edit_internship') && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <h3 className="font-bold text-text-primary text-sm">
                  {activeModal === 'add_internship' ? 'Add Industrial Internship' : 'Edit Internship Entry'}
                </h3>
                <button onClick={() => setActiveModal(null)} className="p-1 rounded text-text-secondary hover:text-text-primary">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveInternship} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    value={internshipForm.company_name}
                    onChange={(e) => setInternshipForm({ ...internshipForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Role / Job Title *</label>
                  <input
                    type="text"
                    required
                    value={internshipForm.role_title}
                    onChange={(e) => setInternshipForm({ ...internshipForm, role_title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-subtle"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Gurugram, Chandigarh"
                      value={internshipForm.location}
                      onChange={(e) => setInternshipForm({ ...internshipForm, location: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Mode</label>
                    <select
                      value={internshipForm.mode}
                      onChange={(e) => setInternshipForm({ ...internshipForm, mode: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle"
                    >
                      <option value="onsite">Onsite</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Start Date</label>
                    <input
                      type="date"
                      value={internshipForm.start_date}
                      onChange={(e) => setInternshipForm({ ...internshipForm, start_date: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">End Date</label>
                    <input
                      type="date"
                      disabled={internshipForm.is_ongoing}
                      value={internshipForm.end_date}
                      onChange={(e) => setInternshipForm({ ...internshipForm, end_date: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle disabled:opacity-40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Monthly Stipend (₹)</label>
                    <input
                      type="number"
                      placeholder="25000"
                      value={internshipForm.stipend}
                      onChange={(e) => setInternshipForm({ ...internshipForm, stipend: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-secondary mb-1">Status</label>
                    <select
                      value={internshipForm.status}
                      onChange={(e) => setInternshipForm({ ...internshipForm, status: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-container-low border border-border-subtle font-bold"
                    >
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="internOngoing"
                    checked={internshipForm.is_ongoing}
                    onChange={(e) => setInternshipForm({ ...internshipForm, is_ongoing: e.target.checked, end_date: e.target.checked ? '' : internshipForm.end_date })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="internOngoing" className="text-text-primary font-medium">Currently ongoing internship</label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => setActiveModal(null)} className="px-3.5 py-1.5 rounded-xl border border-border-subtle">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-xl bg-primary text-white font-semibold">
                    Save Internship
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: CONFIRM MANUAL ACADEMIC CHANGE (Mandatory Spec Guarantee) */}
        {activeModal === 'confirm_academic' && pendingAcademicSave && (
          <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-amber-200 shadow-2xl max-w-md w-full p-5 space-y-4">
              <div className="flex items-center gap-2.5 text-amber-800">
                <span className="material-symbols-outlined text-2xl">verified_user</span>
                <h3 className="font-bold text-sm sm:text-base">Confirm Manual Academic Update</h3>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                You are about to record an official administrative change to this scholar&apos;s academic standing. This change will be permanently logged in the audit trail.
              </p>

              <div className="rounded-xl border border-border-subtle bg-surface-container-low p-3 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border-subtle">
                  <span className="text-text-secondary">CGPA:</span>
                  <div className="font-mono font-bold flex items-center gap-1.5">
                    <span className="text-slate-400 line-through">{pendingAcademicSave.oldCgpa != null ? pendingAcademicSave.oldCgpa : '—'}</span>
                    <span className="text-primary">→</span>
                    <span className="text-emerald-700">{pendingAcademicSave.cgpa != null ? pendingAcademicSave.cgpa : '—'}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-border-subtle">
                  <span className="text-text-secondary">Attendance:</span>
                  <div className="font-mono font-bold flex items-center gap-1.5">
                    <span className="text-slate-400 line-through">{pendingAcademicSave.oldAtt != null ? `${pendingAcademicSave.oldAtt}%` : '—'}</span>
                    <span className="text-primary">→</span>
                    <span className="text-emerald-700">{pendingAcademicSave.overall_attendance != null ? `${pendingAcademicSave.overall_attendance}%` : '—'}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-text-secondary">Active Backlogs:</span>
                  <div className="font-mono font-bold flex items-center gap-1.5">
                    <span className="text-slate-400 line-through">{pendingAcademicSave.oldBacklogs != null ? pendingAcademicSave.oldBacklogs : '—'}</span>
                    <span className="text-primary">→</span>
                    <span className="text-emerald-700">{pendingAcademicSave.backlogs != null ? pendingAcademicSave.backlogs : '0'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setPendingAcademicSave(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-border-subtle text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleConfirmAcademicSave}
                  className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary/90"
                >
                  Confirm Change &amp; Audit Log
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirm Deletion */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-rose-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <span className="material-symbols-outlined">warning</span>
                <span>Confirm Deletion</span>
              </div>
              <p className="text-xs text-text-secondary">
                Are you sure you want to delete <strong>{deleteConfirm.title}</strong>? An audit log entry will be recorded.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-border-subtle text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDeleteItem}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-sm hover:bg-rose-700"
                >
                  Delete Entry
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
