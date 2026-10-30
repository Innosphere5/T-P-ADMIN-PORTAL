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

  // Direct Registration Link (Google Docs / Forms)
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [registrationLinkLabel, setRegistrationLinkLabel] = useState('Google Docs / Form Registration');

  // Custom Form Builder (Dynamic questions shown to students in mobile app)
  const [customForm, setCustomForm] = useState([]);
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);
  const [addNotice, setAddNotice] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddQuestion = () => {
    setIsAdding(true);
    const newId = `f_${Date.now()}`;
    const newNum = customForm.length + 1;
    const newKey = `q_${Math.random().toString(36).substr(2, 6)}`;

    setCustomForm((prev) => [
      ...prev,
      {
        id: newId,
        key: newKey,
        label: `Question ${newNum}`,
        type: 'text',
        required: false,
        helpText: '',
        options: [],
      },
    ]);

    setRecentlyAddedId(newId);
    setAddNotice(`✨ Question #${newNum} added! Edit the question label below.`);

    setTimeout(() => {
      setIsAdding(false);
    }, 600);

    setTimeout(() => {
      setAddNotice('');
    }, 4500);

    setTimeout(() => {
      setRecentlyAddedId((curr) => (curr === newId ? null : curr));
    }, 4000);

    setTimeout(() => {
      const cardEl = document.getElementById(`q-card-${newId}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const labelInput = cardEl.querySelector('input[data-question-label="true"]');
        if (labelInput) {
          labelInput.focus();
          labelInput.select();
        }
      }
    }, 120);
  };

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

      setCustomForm(
        Array.isArray(initialData.customForm)
          ? initialData.customForm
          : Array.isArray(initialData.formSchema)
          ? initialData.formSchema
          : Array.isArray(initialData.form)
          ? initialData.form
          : []
      );

      const firstLink = initialData.registrationLinks && initialData.registrationLinks.length > 0
        ? initialData.registrationLinks[0]
        : null;
      setRegistrationUrl(firstLink?.url || '');
      setRegistrationLinkLabel(firstLink?.label || 'Google Docs / Form Registration');
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
      setRegistrationUrl('');
      setRegistrationLinkLabel('Google Docs / Form Registration');
      setCustomForm([
        {
          id: `f_${Date.now()}_1`,
          key: 'skills',
          label: 'Primary Skills / Tech Stack',
          type: 'text',
          required: true,
          helpText: 'e.g. React Native, Node.js, Python, SQL',
          options: [],
        },
        {
          id: `f_${Date.now()}_2`,
          key: 'statement_of_purpose',
          label: 'Why do you want to participate in this event / drive?',
          type: 'textarea',
          required: false,
          helpText: 'Briefly state your motivation or relevant project experience (optional)',
          options: [],
        },
      ]);
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
    // Compile registration links
    let compiledLinks = initialData?.registrationLinks ? [...initialData.registrationLinks] : [];
    if (registrationUrl.trim()) {
      const existingIdx = compiledLinks.findIndex(
        (l) => l.url === registrationUrl.trim() || l.id === 'link_primary_form'
      );
      const linkEntry = {
        id: existingIdx >= 0 ? compiledLinks[existingIdx].id : `link_${Date.now()}`,
        label: registrationLinkLabel.trim() || 'Google Docs / Form Registration',
        url: registrationUrl.trim(),
        opensAt: null,
        closesAt: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
        enabled: true,
      };
      if (existingIdx >= 0) {
        compiledLinks[existingIdx] = linkEntry;
      } else {
        compiledLinks = [linkEntry, ...compiledLinks];
      }
    }

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
      registrationLinks: compiledLinks,
      customForm: customForm,
      formSchema: customForm,
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
            {
              id: 'compensation',
              label: category === 'COMPANY_RECRUITMENT' ? '3. Compensation' : '3. Rewards / Prizes (Optional)',
              icon: 'payments',
            },
            { id: 'eligibility', label: '4. Eligibility', icon: 'school' },
            { id: 'pipeline', label: '5. Pipeline & SPOC', icon: 'hub' },
            { id: 'form_builder', label: '6. Registration Form Builder', icon: 'dynamic_form' },
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
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary font-semibold"
                  >
                    <option value="COMPANY_RECRUITMENT">🏢 Campus Recruitment Drive (On/Off Campus)</option>
                    <option value="COLLEGE_EVENT">🎉 College Event / Department Function (Freshers, Fest, Annual Day)</option>
                    <option value="COMPETITION">🏆 Department Competition / Hackathon (Contests, Challenges)</option>
                    <option value="WORKSHOP">🎓 Technical Workshop / Seminar (Hands-on, Guest Lectures)</option>
                    <option value="PLACEMENT_ACTIVITY">📋 Placement Activity (Bootcamp, Mock Test, PPT)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-text-secondary uppercase">
                      {category === 'COMPANY_RECRUITMENT' ? 'Company / Corporate Partner *' : 'Host Department / Organiser / Club *'}
                    </label>
                    {category === 'COMPANY_RECRUITMENT' && (
                      <span className="text-[10px] text-primary font-semibold">
                        Or select partner
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={
                        category === 'COMPANY_RECRUITMENT'
                          ? 'e.g. Tata Consultancy Services, Larsen & Toubro, Amazon AWS'
                          : 'e.g. Department of Computer Applications, Cultural Committee, Cyber Club'
                      }
                      className={`w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border transition-colors ${
                        formErrors.companyName ? 'border-primary' : 'border-border-subtle focus:border-primary'
                      }`}
                    />
                    {category === 'COMPANY_RECRUITMENT' && (
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
                    )}
                  </div>
                  {formErrors.companyName && (
                    <span className="text-[11px] text-primary font-semibold">{formErrors.companyName}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary uppercase">
                  {category === 'COMPANY_RECRUITMENT' ? 'Designation / Role Title' : 'Event Theme / Contest Focus / Topic'}
                </label>
                <input
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder={
                    category === 'COMPANY_RECRUITMENT'
                      ? 'e.g. Graduate Engineer Trainee (GET), Full Stack Developer, Systems Analyst'
                      : 'e.g. Annual Freshers Celebration & Talent Hunt, 24-Hour AI Security Prototyping'
                  }
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                />
              </div>

              {/* Dedicated Google Docs / Google Form / Registration Link Section */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-rose-50/30 border border-blue-200/80 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-info-blue text-lg">link</span>
                    <span className="font-bold text-xs text-text-primary">
                      Official Registration Form / Document (Google Docs / Google Form)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-text-secondary leading-normal">
                  Add a Google Docs or Google Form link if required for this drive/event. When students open this drive in their mobile app, they can access this document and submit their registration.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">
                      Portal / Link Label
                    </label>
                    <input
                      value={registrationLinkLabel}
                      onChange={(e) => setRegistrationLinkLabel(e.target.value)}
                      placeholder="e.g. Official Google Docs Registration Form"
                      className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase">
                      Destination URL (Google Docs / Form / Link)
                    </label>
                    <input
                      type="url"
                      value={registrationUrl}
                      onChange={(e) => setRegistrationUrl(e.target.value)}
                      placeholder="https://docs.google.com/forms/d/... or Google Docs URL"
                      className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary font-mono text-[11px]"
                    />
                  </div>
                </div>
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
              {category !== 'COMPANY_RECRUITMENT' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-amber-600 text-base mt-0.5">info</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Optional for Events, Functions &amp; Competitions</span>
                    <span className="text-amber-800 text-[11px]">
                      College events, functions, workshops, and department competitions do not require CTC packages. You can specify a prize pool or leave blank for certificate / general entry.
                    </span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    {category === 'COMPANY_RECRUITMENT' ? 'Minimum CTC (LPA)' : 'Minimum CTC / Prize Pool (Optional)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={packageMinLpa}
                    onChange={(e) => setPackageMinLpa(e.target.value)}
                    placeholder={category === 'COMPANY_RECRUITMENT' ? 'e.g. 7.5' : 'e.g. 0.5 (or leave blank)'}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-text-primary text-xs outline-none border border-border-subtle focus:border-primary"
                  />
                  {formErrors.packageMinLpa && (
                    <span className="text-[11px] text-primary font-semibold">{formErrors.packageMinLpa}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary uppercase">
                    {category === 'COMPANY_RECRUITMENT' ? 'Maximum / Expected CTC (LPA)' : 'Maximum / Grand Prize (Optional)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={packageMaxLpa}
                    onChange={(e) => setPackageMaxLpa(e.target.value)}
                    placeholder={category === 'COMPANY_RECRUITMENT' ? 'e.g. 11.5' : 'e.g. 1.0 (or leave blank)'}
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

          {/* 6. REGISTRATION FORM BUILDER */}
          {activeTab === 'form_builder' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">fact_check</span>
                  <span className="font-bold text-xs text-text-primary">
                    Custom Registration Questionnaire (Shown in Student Mobile App)
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-normal">
                  Configure the custom form questions for this event or drive. When students tap <strong>"Register Now"</strong> in the RIMT Student Mobile App, they will see and complete these questions. Student identity (Name, Roll No, Department, Year, Email) is auto-attached from their verified student profile.
                </p>
              </div>

              {/* Questions List Header */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Event Form Questions
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                    {customForm.length} {customForm.length === 1 ? 'Question' : 'Questions'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  disabled={isAdding}
                  className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer ${
                    isAdding
                      ? 'bg-emerald-700 ring-2 ring-emerald-300 scale-102'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                  title="Add a new custom question for students"
                >
                  <span className="material-symbols-outlined text-sm font-bold">
                    {isAdding ? 'check_circle' : 'add'}
                  </span>
                  <span>{isAdding ? 'Question Added!' : 'Add Question'}</span>
                </button>
              </div>

              {/* Dynamic Added Feedback Banner */}
              {addNotice && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium shadow-2xs transition-all">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-700 text-base">check_circle</span>
                    <span>{addNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddNotice('')}
                    className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              )}

              {customForm.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border-subtle bg-surface-container-low text-center flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-3xl text-text-secondary">description</span>
                  <p className="text-xs font-semibold text-text-primary">No custom questions added yet</p>
                  <p className="text-[11px] text-text-secondary max-w-sm">
                    Students will register using their default verified profile + any attached Google Docs link. Click "Add Question" above to add custom fields.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {customForm.map((field, idx) => (
                    <div
                      key={field.id || idx}
                      id={`q-card-${field.id || idx}`}
                      className={`p-4 rounded-xl border flex flex-col gap-3 shadow-2xs transition-all duration-500 ${
                        recentlyAddedId === field.id
                          ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-400/70 shadow-md'
                          : 'bg-surface-container-low border-border-subtle'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border-subtle/60 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-surface-container text-text-secondary text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-text-primary">
                            {field.label || 'Untitled Question'}
                          </span>
                          {recentlyAddedId === field.id && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                              <span className="material-symbols-outlined text-[12px]">sparkles</span>
                              Just Added
                            </span>
                          )}
                          {field.required && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Required
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...customForm];
                                const temp = copy[idx - 1];
                                copy[idx - 1] = copy[idx];
                                copy[idx] = temp;
                                setCustomForm(copy);
                              }}
                              className="p-1 text-text-secondary hover:text-text-primary rounded"
                              title="Move up"
                            >
                              <span className="material-symbols-outlined text-sm">arrow_upward</span>
                            </button>
                          )}
                          {idx < customForm.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...customForm];
                                const temp = copy[idx + 1];
                                copy[idx + 1] = copy[idx];
                                copy[idx] = temp;
                                setCustomForm(copy);
                              }}
                              className="p-1 text-text-secondary hover:text-text-primary rounded"
                              title="Move down"
                            >
                              <span className="material-symbols-outlined text-sm">arrow_downward</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomForm((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-text-secondary hover:text-rose-600 rounded"
                            title="Delete question"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">
                            Question Label *
                          </label>
                          <input
                            data-question-label="true"
                            value={field.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomForm((prev) =>
                                prev.map((f, i) =>
                                  i === idx
                                    ? {
                                        ...f,
                                        label: val,
                                        key: f.key || val.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 25),
                                      }
                                    : f
                                )
                              );
                            }}
                            placeholder="e.g. Current CGPA, Skills, Team Name, GitHub Profile"
                            className="w-full h-9 px-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">
                            Field Type
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomForm((prev) =>
                                prev.map((f, i) => (i === idx ? { ...f, type: val } : f))
                              );
                            }}
                            className="w-full h-9 px-2 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
                          >
                            <option value="text">Text (Short Answer)</option>
                            <option value="textarea">Paragraph / Essay</option>
                            <option value="number">Number / Score</option>
                            <option value="select">Dropdown (Select)</option>
                            <option value="radio">Multiple Choice (Radio)</option>
                            <option value="checkbox">Checkboxes (Multi-select)</option>
                            <option value="date">Date</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">
                            Help Text / Placeholder
                          </label>
                          <input
                            value={field.helpText || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomForm((prev) =>
                                prev.map((f, i) => (i === idx ? { ...f, helpText: val } : f))
                              );
                            }}
                            placeholder="Optional instructions for students"
                            className="w-full h-8 px-2.5 rounded-lg bg-white border border-border-subtle text-xs text-text-secondary outline-none focus:border-primary"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-4">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-text-primary select-none">
                            <input
                              type="checkbox"
                              checked={!!field.required}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setCustomForm((prev) =>
                                  prev.map((f, i) => (i === idx ? { ...f, required: val } : f))
                                );
                              }}
                              className="rounded text-primary focus:ring-primary"
                            />
                            <span>Required Field</span>
                          </label>
                        </div>
                      </div>

                      {/* Options Editor for Select / Radio / Checkbox */}
                      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                        <div className="pt-2 border-t border-border-subtle/60 flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-text-secondary uppercase">
                            Choice Options (comma-separated)
                          </label>
                          <input
                            value={Array.isArray(field.options) ? field.options.join(', ') : ''}
                            onChange={(e) => {
                              const items = e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              setCustomForm((prev) =>
                                prev.map((f, i) => (i === idx ? { ...f, options: items } : f))
                              );
                            }}
                            placeholder="Option 1, Option 2, Option 3"
                            className="w-full h-8 px-2.5 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(field.options || []).map((opt, oi) => (
                              <span
                                key={oi}
                                className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-border-subtle text-text-primary flex items-center gap-1"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
