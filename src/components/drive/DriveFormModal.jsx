'use client';

import React, { useState, useEffect } from 'react';
import { HIRING_COMPANIES_CATALOG } from '@/lib/placementStats';
import { validateDriveForm, derivePackageTier } from '@/lib/driveUtils';

const DEPARTMENT_OPTIONS = [
  'BCA',
  'B.Sc IT',
  'B.Sc Cyber Security',
  'B.Sc (Hons) AI & ML',
];

const BATCH_OPTIONS = [
  '1st Year (1st Sem)',
  '1st Year (2nd Sem)',
  '2nd Year (3rd Sem)',
  '2nd Year (4th Sem)',
  '3rd Year (5th Sem)',
  '3rd Year (6th Sem)',
];

/**
 * DriveFormModal — Create and Edit Recruitment Drives
 */
export default function DriveFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isEditing = false,
}) {
  // Section tab
  const [activeTab, setActiveTab] = useState('basics');

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('COMPANY_RECRUITMENT');
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('On-campus');
  const [venue, setVenue] = useState('Auditorium 1 & Systems Lab 4');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [packageMinLpa, setPackageMinLpa] = useState('');
  const [packageMaxLpa, setPackageMaxLpa] = useState('');
  const [departments, setDepartments] = useState(['BCA']);
  const [batches, setBatches] = useState(['3rd Year (5th Sem)']);
  const [minCgpa, setMinCgpa] = useState('');
  const [maxBacklogs, setMaxBacklogs] = useState('');
  const [eligibilityNotes, setEligibilityNotes] = useState('');
  const [rounds, setRounds] = useState([
    { name: '1. Online Assessment' },
    { name: '2. Technical Interview' },
    { name: '3. Final HR Assessment' },
  ]);
  const [spocName, setSpocName] = useState('');
  const [spocEmail, setSpocEmail] = useState('');
  const [spocPhone, setSpocPhone] = useState('');
  const [spocOrg, setSpocOrg] = useState('');

  const [formErrors, setFormErrors] = useState({});

  // Reset or pre-fill on open
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setCategory(initialData.category || 'COMPANY_RECRUITMENT');
      setCompanyName(initialData.companyName || '');
      setRoleTitle(initialData.roleTitle || '');
      setDescription(initialData.description || '');
      setMode(initialData.mode || 'On-campus');
      setVenue(initialData.venue || '');
      setMeetingUrl(initialData.meetingUrl || '');
      setStartsAt(initialData.startsAt ? initialData.startsAt.slice(0, 16) : '');
      setEndsAt(initialData.endsAt ? initialData.endsAt.slice(0, 16) : '');
      setRegistrationDeadline(initialData.registrationDeadline ? initialData.registrationDeadline.slice(0, 16) : '');
      setPackageMinLpa(initialData.packageMinLpa ?? '');
      setPackageMaxLpa(initialData.packageMaxLpa ?? '');
      setDepartments(initialData.eligibility?.departments || ['BCA']);
      setBatches(initialData.eligibility?.batches || ['3rd Year (5th Sem)']);
      setMinCgpa(initialData.eligibility?.minCgpa ?? '');
      setMaxBacklogs(initialData.eligibility?.maxBacklogs ?? '');
      setEligibilityNotes(initialData.eligibility?.notes || '');
      setRounds(initialData.rounds && initialData.rounds.length > 0 ? initialData.rounds : [
        { name: '1. Online Assessment' },
        { name: '2. Technical Interview' },
        { name: '3. Final HR Assessment' },
      ]);
      setSpocName(initialData.spoc?.name || '');
      setSpocEmail(initialData.spoc?.email || '');
      setSpocPhone(initialData.spoc?.phone || '');
      setSpocOrg(initialData.spoc?.organisation || '');
    } else {
      setTitle('');
      setCategory('COMPANY_RECRUITMENT');
      setCompanyName('');
      setRoleTitle('');
      setDescription('');
      setMode('On-campus');
      setVenue('Auditorium 1 & Systems Lab 4');
      setMeetingUrl('');
      setStartsAt('');
      setEndsAt('');
      setRegistrationDeadline('');
      setPackageMinLpa('');
      setPackageMaxLpa('');
      setDepartments(['BCA']);
      setBatches(['3rd Year (5th Sem)']);
      setMinCgpa('6.5');
      setMaxBacklogs('0');
      setEligibilityNotes('');
      setRounds([
        { name: '1. Online Assessment' },
        { name: '2. Technical Viva' },
        { name: '3. Final HR Assessment' },
      ]);
      setSpocName('');
      setSpocEmail('');
      setSpocPhone('');
      setSpocOrg('');
    }
    setFormErrors({});
    setActiveTab('basics');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Handle department toggle
  const toggleDepartment = (dept) => {
    if (departments.includes(dept)) {
      setDepartments(departments.filter((d) => d !== dept));
    } else {
      setDepartments([...departments, dept]);
    }
  };

  // Handle batch toggle
  const toggleBatch = (batch) => {
    if (batches.includes(batch)) {
      setBatches(batches.filter((b) => b !== batch));
    } else {
      setBatches([...batches, batch]);
    }
  };

  // Handle company catalog autofill
  const handleSelectCatalogCompany = (companyId) => {
    const comp = HIRING_COMPANIES_CATALOG.find((c) => c.id === companyId);
    if (comp) {
      setCompanyName(comp.name);
      if (!title) setTitle(`${comp.shortName || comp.name} Campus Recruitment 2026`);
      if (comp.spoc) {
        setSpocName(comp.spoc.name || '');
        setSpocEmail(comp.spoc.email || '');
        setSpocPhone(comp.spoc.phone || '');
        setSpocOrg(`${comp.name} TPO Cell`);
      }
      if (comp.baseCtcLpa) {
        setPackageMinLpa(String(comp.baseCtcLpa - 2.5));
        setPackageMaxLpa(String(comp.baseCtcLpa + 3.5));
      }
    }
  };

  // Add / remove rounds
  const handleAddRound = () => {
    setRounds([...rounds, { name: `${rounds.length + 1}. Assessment Round` }]);
  };

  const handleUpdateRound = (index, name) => {
    const updated = [...rounds];
    updated[index] = { ...updated[index], name };
    setRounds(updated);
  };

  const handleRemoveRound = (index) => {
    if (rounds.length <= 1) return;
    setRounds(rounds.filter((_, i) => i !== index));
  };

  const handleSubmit = (saveStatus) => {
    const data = {
      title,
      category,
      companyName,
      roleTitle,
      description,
      mode,
      venue: mode === 'Online' ? '' : venue,
      meetingUrl: mode === 'Online' ? meetingUrl : '',
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
      packageMinLpa,
      packageMaxLpa,
      minCgpa,
      maxBacklogs,
      eligibility: {
        departments,
        batches,
        minCgpa: minCgpa ? Number(minCgpa) : null,
        maxBacklogs: maxBacklogs !== '' ? Number(maxBacklogs) : null,
        notes: eligibilityNotes,
      },
      rounds,
      spoc: {
        name: spocName,
        email: spocEmail,
        phone: spocPhone,
        organisation: spocOrg,
      },
      status: saveStatus,
    };

    const validation = validateDriveForm(data);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      // Switch to first tab that has an error
      if (validation.errors.title || validation.errors.category || validation.errors.companyName) {
        setActiveTab('basics');
      } else if (validation.errors.endsAt || validation.errors.registrationDeadline || validation.errors.mode) {
        setActiveTab('schedule');
      } else if (validation.errors.packageMinLpa || validation.errors.packageMaxLpa) {
        setActiveTab('compensation');
      } else if (validation.errors.minCgpa || validation.errors.maxBacklogs) {
        setActiveTab('eligibility');
      }
      return;
    }

    setFormErrors({});
    onSubmit(data);
  };

  const packageTier = derivePackageTier(Number(packageMaxLpa));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-white/80 z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Specular Highlight */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 bg-surface-hero text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-lg">event_available</span>
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {isEditing ? 'Modify Placement Drive' : 'Schedule New Placement Drive'}
              </h3>
              <p className="text-xs text-surface-container-high/80">
                Institutional Recruitment Schedule &amp; Eligibility Protocol
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-container-high hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 pt-3 border-b border-border-subtle bg-surface-container-low shrink-0 overflow-x-auto gap-2">
          {[
            { id: 'basics', label: '1. Basics', icon: 'info' },
            { id: 'schedule', label: '2. Schedule & Mode', icon: 'schedule' },
            { id: 'compensation', label: '3. Compensation', icon: 'payments' },
            { id: 'eligibility', label: '4. Eligibility', icon: 'school' },
            { id: 'pipeline', label: '5. Pipeline & SPOC', icon: 'hub' },
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

        {/* Form Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* 1. BASICS */}
          {activeTab === 'basics' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  Drive Title *
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. TCS Digital & Ninja Hiring 2026, Google Cloud Specialist Drive"
                  className={`w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border transition-colors ${
                    formErrors.title ? 'border-primary' : 'border-border-subtle focus:border-primary'
                  }`}
                />
                {formErrors.title && (
                  <span className="text-[11px] text-primary font-semibold">{formErrors.title}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                  >
                    <option value="COMPANY_RECRUITMENT">Company Recruitment (On/Off Campus)</option>
                    <option value="UNIVERSITY_EVENT">University Event (T&amp;P Mega Job Fair)</option>
                    <option value="PLACEMENT_ACTIVITY">Placement Activity (Bootcamp, Mock Test, PPT)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-text-secondary uppercase">
                      Company / Organisation *
                    </label>
                    <span className="text-[10px] text-primary font-semibold">
                      Or select partner
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      required={category === 'COMPANY_RECRUITMENT'}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Tata Consultancy Services, Amazon AWS"
                      className={`w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border transition-colors ${
                        formErrors.companyName ? 'border-primary' : 'border-border-subtle focus:border-primary'
                      }`}
                    />
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleSelectCatalogCompany(e.target.value);
                      }}
                      defaultValue=""
                      className="h-10 px-2 rounded-lg bg-surface-container-low border border-border-subtle text-xs text-text-secondary"
                      title="Prefill from partner catalog"
                    >
                      <option value="" disabled>Partner Catalog</option>
                      {HIRING_COMPANIES_CATALOG.map((c) => (
                        <option key={c.id} value={c.id}>{c.shortName || c.name}</option>
                      ))}
                    </select>
                  </div>
                  {formErrors.companyName && (
                    <span className="text-[11px] text-primary font-semibold">{formErrors.companyName}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  Designation / Role Title
                </label>
                <input
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Graduate Engineer Trainee (GET), Full Stack Developer, Systems Analyst"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  Drive Description &amp; Job Overview
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide scope, core job responsibilities, mandatory certifications, or interview protocol..."
                  className="w-full p-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary leading-relaxed font-sans"
                />
              </div>
            </div>
          )}

          {/* 2. SCHEDULE & MODE */}
          {activeTab === 'schedule' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Execution Mode *
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                  >
                    <option value="On-campus">On-campus (University Facilities)</option>
                    <option value="Off-campus">Off-campus (Corporate Headquarters)</option>
                    <option value="Online">Virtual / Online (MS Teams / Zoom)</option>
                    <option value="Hybrid">Hybrid (Online OA + In-person Interview)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    {mode === 'Online' ? 'Meeting URL / Assessment Platform' : 'Campus Venue / Hall Allotment'}
                  </label>
                  {mode === 'Online' ? (
                    <input
                      type="url"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      placeholder="https://teams.microsoft.com/..."
                      className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                    />
                  ) : (
                    <input
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g. Auditorium 1, Systems Lab 4 (West Campus)"
                      className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Drive Start Date &amp; Time (IST) *
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Drive Concluding Time (IST)
                  </label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className={`w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border transition-colors ${
                      formErrors.endsAt ? 'border-primary' : 'border-border-subtle focus:border-primary'
                    }`}
                  />
                  {formErrors.endsAt && (
                    <span className="text-[11px] text-primary font-semibold">{formErrors.endsAt}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Registration Deadline (IST)
                  </label>
                  <input
                    type="datetime-local"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className={`w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border transition-colors ${
                      formErrors.registrationDeadline ? 'border-primary' : 'border-border-subtle focus:border-primary'
                    }`}
                  />
                  {formErrors.registrationDeadline && (
                    <span className="text-[11px] text-primary font-semibold">{formErrors.registrationDeadline}</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-tint-blue/60 border border-blue-200/80 text-xs text-info-blue flex items-center gap-2">
                <span className="material-symbols-outlined text-base">schedule</span>
                <span>
                  All schedules strictly adhere to Indian Standard Time (IST, UTC+05:30).
                </span>
              </div>
            </div>
          )}

          {/* 3. COMPENSATION */}
          {activeTab === 'compensation' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Minimum CTC (LPA)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={packageMinLpa}
                    onChange={(e) => setPackageMinLpa(e.target.value)}
                    placeholder="e.g. 7.5"
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                  />
                  {formErrors.packageMinLpa && (
                    <span className="text-[11px] text-primary font-semibold">{formErrors.packageMinLpa}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Maximum / Expected CTC (LPA)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={packageMaxLpa}
                    onChange={(e) => setPackageMaxLpa(e.target.value)}
                    placeholder="e.g. 11.5"
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                  />
                  {formErrors.packageMaxLpa && (
                    <span className="text-[11px] text-primary font-semibold">{formErrors.packageMaxLpa}</span>
                  )}
                </div>
              </div>

              {packageTier && (
                <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-text-secondary uppercase">
                      Derived Institutional Tier
                    </span>
                    <span className="text-xs text-text-primary font-semibold mt-0.5">
                      Classified automatically from maximum package benchmark
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${packageTier.badgeStyle}`}>
                    {packageTier.label}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 4. ELIGIBILITY */}
          {activeTab === 'eligibility' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Department chips */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  Eligible Academic Departments *
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {DEPARTMENT_OPTIONS.map((dept) => {
                    const isSelected = departments.includes(dept);
                    return (
                      <button
                        type="button"
                        key={dept}
                        onClick={() => toggleDepartment(dept)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-primary text-white shadow-2xs'
                            : 'bg-surface-container-low text-text-secondary border border-border-subtle hover:text-text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {isSelected ? 'check' : 'add'}
                        </span>
                        <span>{dept}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Batches / Semesters */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  Academic Year / Semester Batches
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {BATCH_OPTIONS.map((batch) => {
                    const isSelected = batches.includes(batch);
                    return (
                      <button
                        type="button"
                        key={batch}
                        onClick={() => toggleBatch(batch)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-surface-hero text-white shadow-2xs'
                            : 'bg-surface-container-low text-text-secondary border border-border-subtle hover:text-text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs">
                          {isSelected ? 'check' : 'add'}
                        </span>
                        <span>{batch}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Minimum Cumulative CGPA Cutoff (0.00 – 10.00)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={minCgpa}
                    onChange={(e) => setMinCgpa(e.target.value)}
                    placeholder="e.g. 6.50 (Leave blank for no restriction)"
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                  />
                  {formErrors.minCgpa && (
                    <span className="text-[11px] text-primary font-semibold">{formErrors.minCgpa}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Maximum Permitted Active Backlogs
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maxBacklogs}
                    onChange={(e) => setMaxBacklogs(e.target.value)}
                    placeholder="e.g. 0 (Leave blank for no restriction)"
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                  />
                  {formErrors.maxBacklogs && (
                    <span className="text-[11px] text-primary font-semibold">{formErrors.maxBacklogs}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  Other Criteria &amp; Pre-Requisite Notes
                </label>
                <textarea
                  rows={2}
                  value={eligibilityNotes}
                  onChange={(e) => setEligibilityNotes(e.target.value)}
                  placeholder="e.g. Must have completed Core Java & Database Systems; 10th & 12th percentage ≥ 60%"
                  className="w-full p-2.5 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary font-sans"
                />
              </div>
            </div>
          )}

          {/* 5. PIPELINE & SPOC */}
          {activeTab === 'pipeline' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              {/* Rounds List */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    Recruitment Stages &amp; Assessment Pipeline
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRound}
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>+ Add Stage</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {rounds.map((rnd, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 text-center text-xs font-bold text-text-secondary">
                        {i + 1}
                      </span>
                      <input
                        value={rnd.name}
                        onChange={(e) => handleUpdateRound(i, e.target.value)}
                        placeholder={`Stage ${i + 1} Name`}
                        className="flex-1 h-9 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                      />
                      {rounds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRound(i)}
                          className="p-1 text-text-secondary hover:text-primary"
                          title="Remove stage"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SPOC Liaison */}
              <div className="pt-3 border-t border-border-subtle flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  Company SPOC Liaison &amp; Faculty Coordinator
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-text-secondary uppercase">
                      Liaison Name
                    </label>
                    <input
                      value={spocName}
                      onChange={(e) => setSpocName(e.target.value)}
                      placeholder="e.g. Anand Verma"
                      className="w-full h-9 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-text-secondary uppercase">
                      Organisation / Cell
                    </label>
                    <input
                      value={spocOrg}
                      onChange={(e) => setSpocOrg(e.target.value)}
                      placeholder="e.g. TCS Northern Region TPO Cell"
                      className="w-full h-9 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-text-secondary uppercase">
                      Liaison Email
                    </label>
                    <input
                      type="email"
                      value={spocEmail}
                      onChange={(e) => setSpocEmail(e.target.value)}
                      placeholder="campus.hr@company.com"
                      className="w-full h-9 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-text-secondary uppercase">
                      Contact Phone
                    </label>
                    <input
                      value={spocPhone}
                      onChange={(e) => setSpocPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-9 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-surface-container-low border-t border-border-subtle flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold shadow-2xs"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSubmit('DRAFT')}
              className="px-4 py-2.5 rounded-full bg-white border border-border-subtle text-text-primary text-xs font-semibold hover:bg-surface-container shadow-2xs transition-all"
            >
              Save as Draft
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('PUBLISHED')}
              className="px-5 py-2.5 rounded-full bg-primary text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all"
              style={{
                background: 'linear-gradient(135deg, rgb(155, 29, 44) 0%, rgb(110, 21, 33) 100%)',
              }}
            >
              {isEditing ? 'Save Changes & Publish' : 'Schedule & Publish Drive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
