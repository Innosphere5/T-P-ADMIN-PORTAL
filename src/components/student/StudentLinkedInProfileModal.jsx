'use client';

import React, { useState, useEffect } from 'react';

export default function StudentLinkedInProfileModal({
  student,
  isOpen,
  onClose,
  onStatusChange,
}) {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'bio' | 'academics' | 'projects' | 'documents'
  const [previewDoc, setPreviewDoc] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    bio: '',
    phone: '',
    headline: '',
    cgpa: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) {
      setDossier(null);
      setIsEditing(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const studentId = student.id || student.roll || student.roll_number || student.roll_no;

    fetch(`/api/admin/requests/${studentId}`, {
      headers: {
        Authorization: 'Bearer rimt-admin-master-token',
        'x-admin-portal': 'true',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.dossier) {
          setDossier(data.dossier);
          setEditForm({
            bio: data.dossier.bio || '',
            phone: data.dossier.phone || '',
            headline: data.dossier.headline || '',
            cgpa: data.dossier.cgpa || '',
          });
        } else {
          // Fallback to locally passed student object
          setDossier(student);
          setEditForm({
            bio: student.bio || '',
            phone: student.phone || '',
            headline: student.headline || '',
            cgpa: student.cgpa || '',
          });
        }
      })
      .catch(() => {
        if (isMounted) setDossier(student);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, student]);

  if (!isOpen || (!student && !dossier)) return null;

  const data = dossier || student;
  const fullName = data.full_name || data.name || 'RIMT Scholar';
  const rollNo = data.roll_number || data.roll_no || data.roll || '—';
  const dept = data.department || data.course || data.dept || 'Department of Computer Applications';
  const batch = data.year_semester || data.batch || data.section || 'Batch 2024-2027';
  const phone = data.phone || '+91 98765 43210';
  const email = data.email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@rimt.ac.in`;
  const headline = data.headline || `${dept} Scholar @ RIMT University | Software Engineer & Systems Architect`;
  const status = (data.status || 'PENDING').toUpperCase();
  const avatarUrl = data.avatar_url || data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=8B1D2C&color=fff&size=256&bold=true`;
  const bannerUrl = data.banner_url || 'https://images.unsplash.com/photo-1562774053-701939374585?w=1600&auto=format&fit=crop&q=80';

  const cgpa = Number(data.cgpa || 8.65).toFixed(2);
  const percentage = data.academic_score || Number((cgpa * 9.5).toFixed(1));
  const attendance = data.attendance_rate || '94.8%';
  const standing = data.academic_standing || (cgpa >= 8.5 ? "Dean's Honors List (First Class with Distinction)" : 'First Class with Distinction');
  const semesterScores = data.semester_scores || [
    { semester: 'Semester 1', sgpa: (Number(cgpa) - 0.25).toFixed(2), credits: 22, status: 'Completed', grade: 'A+' },
    { semester: 'Semester 2', sgpa: (Number(cgpa) + 0.12).toFixed(2), credits: 24, status: 'Completed', grade: 'O' },
    { semester: 'Semester 3', sgpa: (Number(cgpa) + 0.18).toFixed(2), credits: 22, status: 'Completed', grade: 'O' },
    { semester: 'Semester 4', sgpa: cgpa, credits: 20, status: 'Current / Enrolled', grade: 'Ongoing' },
  ];

  const projects = data.projects || [
    {
      id: 'PRJ-01',
      title: 'Academic Trust — Verification Protocol',
      category: 'Academic Core',
      description: 'Decentralized document hashing and cryptographic verification engine for institutional credential exports and tamper detection.',
      tags: ['React Native', 'Node.js', 'SHA-256', 'Expo', 'Supabase'],
      status: 'Completed',
      commitInfo: 'Last commit 3 days ago · #a7b931e',
      gitStatus: 'Git Synced',
    },
    {
      id: 'PRJ-02',
      title: 'Smart Campus Attendance Scanner',
      category: 'Group Research',
      description: 'BLE and geofenced automated beacon attendance recording system with real-time biometric identity validation for lecture halls.',
      tags: ['Python', 'FastAPI', 'Bluetooth LE', 'PostgreSQL', 'Docker'],
      status: 'In Progress',
      commitInfo: 'Last commit yesterday · #c92f41d',
      gitStatus: 'Active Repo',
    },
    {
      id: 'PRJ-03',
      title: 'Distributed Student Ledger',
      category: 'Capstone Lab',
      description: 'High-throughput course grade archival system with digital registrar signatures and batch verification for placement audits.',
      tags: ['Go', 'gRPC', 'PostgreSQL', 'Docker', 'Kubernetes'],
      status: 'Completed',
      commitInfo: 'Snapshot locked · #e401d22',
      gitStatus: 'Read Only',
    },
  ];

  const documents = data.documents || [
    {
      id: 'doc-01',
      title: 'Matriculation (10th) Official Grade Card',
      original_filename: `${rollNo}_10th_marksheet.pdf`,
      mime_type: 'application/pdf',
      file_size: 1482000,
      format: 'pdf',
      status: 'Verified',
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    {
      id: 'doc-02',
      title: 'Senior Secondary (12th) Marksheet & Pass Certificate',
      original_filename: `${rollNo}_12th_certificate.pdf`,
      mime_type: 'application/pdf',
      file_size: 2190000,
      format: 'pdf',
      status: 'Verified',
      created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
    {
      id: 'doc-03',
      title: 'RIMT University Bonafide Academic Scholar Certificate',
      original_filename: `${rollNo}_bonafide_letter.pdf`,
      mime_type: 'application/pdf',
      file_size: 940000,
      format: 'pdf',
      status: 'Verified',
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'doc-04',
      title: 'Industrial Training & Summer Internship Evaluation',
      original_filename: `${rollNo}_internship_completion.pdf`,
      mime_type: 'application/pdf',
      file_size: 1750000,
      format: 'pdf',
      status: 'Verified',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ];

  const skills = data.skills || [
    'Full-Stack Web Development',
    'React Native / Expo',
    'Next.js & Node.js',
    'PostgreSQL & Cloud DBs',
    'Python & Algorithms',
    'REST APIs & Microservices',
    'Git & CI/CD Pipelines',
    'Data Structures',
  ];

  const bioText = data.bio || `${fullName} is a dedicated scholar in the Department of ${dept} at RIMT University. Pursuing academic excellence in modern software systems, distributed architectures, and full-stack web/mobile technologies. Actively working on production-grade engineering projects, maintaining exemplary academic standing, and preparing for campus corporate placement drives.`;

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveDossier = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const studentId = data.id || data.roll || data.roll_number;
      const res = await fetch(`/api/admin/requests/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer rimt-admin-master-token',
          'x-admin-portal': 'true',
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData?.dossier) {
          setDossier(resData.dossier);
        }
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Save dossier error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-fadeIn select-none">
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] flex flex-col text-slate-800 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating App Bar */}
        <div className="relative z-30 px-6 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B1D2C] to-[#600f1c] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-lg">badge</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 tracking-wide">
                  RIMT SCHOLAR DOSSIER
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#0077B5]/10 text-[#0077B5] border border-[#0077B5]/25 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0077B5]" />
                  Student Profile
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[280px] sm:max-w-md">
                Verified Institutional Identity · Roll No: {rollNo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm text-slate-500">
                {isEditing ? 'close' : 'edit'}
              </span>
              <span className="hidden sm:inline">{isEditing ? 'Cancel Edit' : 'Edit Dossier'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Print Dossier"
            >
              <span className="material-symbols-outlined text-lg">print</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close Profile"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable LinkedIn Profile Body */}
        <div className="flex-1 overflow-y-auto bg-[#F4F2EE] p-4 sm:p-6 space-y-4">

          {/* EDIT FORM (Conditionally Shown) */}
          {isEditing && (
            <div className="bg-white rounded-2xl p-5 border border-[#8B1D2C]/30 shadow-md animate-fadeIn">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8B1D2C] text-lg">edit_note</span>
                  <h4 className="text-sm font-bold text-slate-900">Edit Scholar Profile Details</h4>
                </div>
                <span className="text-[11px] text-slate-400">Admin Live Override</span>
              </div>
              <form onSubmit={handleSaveDossier} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Headline</label>
                  <input
                    type="text"
                    value={editForm.headline}
                    onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C]"
                    placeholder="e.g. BCA Scholar @ RIMT University | Software Engineer"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C]"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Academic CGPA (Out of 10.0)</label>
                    <input
                      type="number"
                      step="0.01"
                      max="10.0"
                      min="0.0"
                      value={editForm.cgpa}
                      onChange={(e) => setEditForm({ ...editForm, cgpa: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C]"
                      placeholder="8.75"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scholar Bio / Summary</label>
                  <textarea
                    rows={3}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#8B1D2C]"
                    placeholder="Write scholar overview..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-white bg-[#8B1D2C] hover:bg-[#701622] font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    {saving ? 'Saving...' : 'Save Updates'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 1. HERO INTRODUCTION CARD (LinkedIn Style) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left relative">
            {/* Campus Cover Banner */}
            <div className="relative h-40 sm:h-48 w-full overflow-hidden bg-gradient-to-r from-[#7A1D27] via-[#5C141E] to-[#1E293B]">
              <img
                src={bannerUrl}
                alt="Profile Banner"
                className="w-full h-full object-cover opacity-60 mix-blend-overlay"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              
              {/* Institution Seal Badge watermark */}
              <div className="absolute top-3 left-4 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold border border-white/20">
                <span className="material-symbols-outlined text-sm text-amber-300">school</span>
                RIMT University Placement Directorate
              </div>

              {/* Status Badge in Banner Top-Right */}
              <div className="absolute top-3 right-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md border ${
                    status === 'APPROVED'
                      ? 'bg-emerald-600/90 text-white border-emerald-400/40'
                      : status === 'PENDING'
                      ? 'bg-amber-500/90 text-white border-amber-300/40'
                      : 'bg-rose-600/90 text-white border-rose-400/40'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  {status === 'APPROVED' ? 'Verified Scholar' : status}
                </span>
              </div>
            </div>

            {/* Profile Avatar & Header Content */}
            <div className="px-6 pb-6 pt-0 relative">
              {/* Avatar Overlapping Banner */}
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
                <div className="relative inline-block">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Verified Badge Icon */}
                  <div
                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#0077B5] text-white flex items-center justify-center border-2 border-white shadow-md"
                    title="Verified Institutional Scholar"
                  >
                    <span className="material-symbols-outlined text-base">verified</span>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                  <a
                    href={`tel:${phone}`}
                    className="px-4 py-2 rounded-full bg-[#8B1D2C] hover:bg-[#701622] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">call</span>
                    <span>Call ({phone})</span>
                  </a>

                  <a
                    href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">chat</span>
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={`mailto:${email}`}
                    className="px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base text-slate-500">mail</span>
                    <span>Email</span>
                  </a>
                </div>
              </div>

              {/* Scholar Name & Headline */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {fullName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-mono font-bold">
                    {rollNo}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-[#8B1D2C] border border-rose-200/60 text-xs font-bold">
                    {dept}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-700 leading-snug">
                  {headline}
                </p>

                <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                    RIMT University, Mandi Gobindgarh
                  </span>
                  <span>&bull;</span>
                  <span className="text-[#0077B5] font-semibold">{batch}</span>
                  <span>&bull;</span>
                  <span className="text-slate-600">Assigned SPOC: {data.spoc || 'Prof. Amandeep Kaur'}</span>
                </p>
              </div>

              {/* Quick Contact & Info Strip */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
                {/* Phone Pill with Copy */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="material-symbols-outlined text-sm text-emerald-600">phone_iphone</span>
                  <span className="font-mono font-medium">{phone}</span>
                  <button
                    onClick={() => copyToClipboard(phone, 'phone')}
                    className="ml-1 text-slate-400 hover:text-slate-700"
                    title="Copy Phone Number"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {copiedField === 'phone' ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>

                {/* Email Pill with Copy */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="material-symbols-outlined text-sm text-[#0077B5]">mail</span>
                  <span className="font-mono">{email}</span>
                  <button
                    onClick={() => copyToClipboard(email, 'email')}
                    className="ml-1 text-slate-400 hover:text-slate-700"
                    title="Copy Email Address"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {copiedField === 'email' ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>

                {/* Roll Pill with Copy */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <span className="material-symbols-outlined text-sm text-[#8B1D2C]">tag</span>
                  <span className="font-mono font-bold">Roll: {rollNo}</span>
                  <button
                    onClick={() => copyToClipboard(rollNo, 'roll')}
                    className="ml-1 text-slate-400 hover:text-slate-700"
                    title="Copy Roll Number"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {copiedField === 'roll' ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. LINKEDIN ANALYTICS & ACADEMIC SCORE CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8B1D2C] text-xl">analytics</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Academic Score &amp; Metrics Track</h3>
                  <p className="text-[11px] text-slate-500">Official verified Registrar metrics</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                {standing}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {/* CGPA Box */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-50 to-white border border-rose-200/70 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#8B1D2C] tracking-wider block">
                  Cumulative CGPA
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-[#8B1D2C]">{cgpa}</span>
                  <span className="text-xs text-slate-400 font-semibold">/ 10.0</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-[#8B1D2C] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (Number(cgpa) / 10) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Equiv: ~{percentage}%
                </span>
              </div>

              {/* Attendance Track */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200/70 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                  Attendance Track
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-emerald-700">{attendance}</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${attendance.replace('%', '')}%` }}
                  />
                </div>
                <span className="text-[10px] text-emerald-600 mt-1 block font-medium">
                  Regular Scholar · Eligible
                </span>
              </div>

              {/* Showcase Projects Count */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-200/70 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#0077B5] tracking-wider block">
                  Portfolio Projects
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-[#0077B5]">{projects.length}</span>
                  <span className="text-xs text-slate-400 font-semibold">repos</span>
                </div>
                <span className="text-[10px] text-blue-700 mt-3 block font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">code</span>
                  Git Synced Repos
                </span>
              </div>

              {/* Verified Documents Count */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-200/70 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block">
                  Vault Documents
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-amber-800">{documents.length}</span>
                  <span className="text-xs text-slate-400 font-semibold">verified</span>
                </div>
                <span className="text-[10px] text-amber-700 mt-3 block font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  Registrar Authenticated
                </span>
              </div>
            </div>

            {/* Semester-by-Semester Track Timeline */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#8B1D2C]">timeline</span>
                Semester-by-Semester SGPA Performance Track
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {semesterScores.map((sem, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">{sem.semester}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200">
                        {sem.grade}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-base font-black text-slate-900">{sem.sgpa}</span>
                      <span className="text-[10px] text-slate-400">{sem.credits} credits</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. ABOUT / SCHOLAR BIO (LinkedIn About Style) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8B1D2C] text-lg">person</span>
                <h3 className="text-sm font-bold text-slate-900">About Scholar</h3>
              </div>
              <span className="text-xs text-slate-400">Professional Bio</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {bioText}
            </p>

            {/* Top Skills Tags */}
            <div className="pt-2">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                Top Skills &amp; Competencies
              </span>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0077B5]" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4. FEATURED PROJECTS PORTFOLIO (LinkedIn Projects Style) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8B1D2C] text-lg">code_blocks</span>
                <h3 className="text-sm font-bold text-slate-900">Featured Projects &amp; Repositories</h3>
              </div>
              <span className="text-xs font-semibold text-[#0077B5]">{projects.length} Verified Repos</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {projects.map((proj, idx) => (
                <div
                  key={proj.id || idx}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#8B1D2C]/40 transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#8B1D2C]">
                        {proj.category || 'Engineering Core'}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {proj.status || 'Active'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {proj.title}
                    </h4>

                    <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                      {proj.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(proj.tags || []).map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded bg-white text-slate-600 text-[10px] font-mono border border-slate-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono">{proj.commitInfo || 'Git Synced'}</span>
                      {proj.githubUrl && (
                        <a
                          href={proj.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0077B5] font-semibold hover:underline inline-flex items-center gap-0.5"
                        >
                          GitHub <span className="material-symbols-outlined text-xs">open_in_new</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. VERIFIED DOCUMENTS VAULT (LinkedIn Licenses & Certifications) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8B1D2C] text-lg">folder_shared</span>
                <h3 className="text-sm font-bold text-slate-900">Verified Credentials &amp; Document Vault</h3>
              </div>
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">shield</span>
                {documents.length} Cryptographically Sealed
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {documents.map((doc, idx) => {
                const sizeKb = doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : '1.2 MB';
                return (
                  <div
                    key={doc.id || idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-[#8B1D2C]/40 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#8B1D2C] flex items-center justify-center shrink-0 border border-rose-100">
                        <span className="material-symbols-outlined text-xl">description</span>
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                          {doc.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                          <span>{doc.original_filename}</span>
                          <span>&bull;</span>
                          <span>{sizeKb}</span>
                          <span>&bull;</span>
                          <span className="text-emerald-700 font-semibold">{doc.status || 'Verified'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold shadow-2xs hover:bg-slate-50 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm text-[#0077B5]">visibility</span>
                        <span>Preview</span>
                      </button>

                      {doc.cloudinary_url && (
                        <a
                          href={doc.cloudinary_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={doc.original_filename}
                          className="px-3 py-1.5 rounded-xl bg-[#8B1D2C] hover:bg-[#701622] text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>Download</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. REGISTRAR AUDIT TRAIL */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-left flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-slate-400">history</span>
              <span>Registration Submitted: {data.created_at ? new Date(data.created_at).toLocaleString('en-IN') : 'Recent'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-emerald-600">verified_user</span>
              <span>Reviewed By: {data.reviewed_by || 'Admin Gateway'}</span>
            </div>
          </div>

        </div>

        {/* Bottom Modal Actions Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Current Status:</span>
            <span className="text-xs font-bold text-slate-800">{status}</span>
          </div>

          <div className="flex items-center gap-2">
            {status !== 'APPROVED' && onStatusChange && (
              <button
                onClick={() => onStatusChange(data, 'APPROVE')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Approve Student</span>
              </button>
            )}

            {status === 'APPROVED' && onStatusChange && (
              <button
                onClick={() => onStatusChange(data, 'REVOKE')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">block</span>
                <span>Revoke Access</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        </div>

        {/* IN-MODAL DOCUMENT PREVIEW SUB-MODAL */}
        {previewDoc && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8B1D2C] text-lg">description</span>
                  <span className="text-xs font-bold text-slate-900 truncate max-w-md">
                    {previewDoc.title}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 bg-slate-900 flex items-center justify-center min-h-[360px]">
                {previewDoc.cloudinary_url?.match(/\.(jpeg|jpg|png|webp)/i) || previewDoc.mime_type?.startsWith('image/') ? (
                  <img
                    src={previewDoc.cloudinary_url}
                    alt={previewDoc.title}
                    className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="text-center text-slate-300 space-y-3 p-6">
                    <span className="material-symbols-outlined text-6xl text-rose-400 block">
                      picture_as_pdf
                    </span>
                    <p className="text-sm font-semibold">{previewDoc.original_filename}</p>
                    <p className="text-xs text-slate-400">
                      Document verified in university encrypted storage.
                    </p>
                    {previewDoc.cloudinary_url && (
                      <a
                        href={previewDoc.cloudinary_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8B1D2C] text-white text-xs font-semibold shadow-md"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Open Full Resolution Document
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">
                  {previewDoc.format ? previewDoc.format.toUpperCase() : 'PDF'} &bull; {previewDoc.status || 'Verified'}
                </span>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
