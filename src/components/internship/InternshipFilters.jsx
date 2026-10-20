'use client';

import React, { useState, useMemo } from 'react';

const DURATION_PRESETS = [
  { label: 'All Durations', value: '' },
  { label: '3 Months', value: '3' },
  { label: '6 Months', value: '6' },
  { label: '9 Months', value: '9' },
  { label: '12 Months', value: '12' },
  { label: 'Other', value: 'other' },
];

const SEASONS = [
  { label: 'All Seasons', value: '', icon: 'all_inclusive' },
  { label: 'Winter', value: 'winter', icon: 'ac_unit', color: 'sky' },
  { label: 'Summer', value: 'summer', icon: 'wb_sunny', color: 'amber' },
  { label: 'Spring', value: 'spring', icon: 'local_florist', color: 'emerald' },
  { label: 'Autumn', value: 'autumn', icon: 'eco', color: 'rose' },
];

const COMPENSATION_TYPES = [
  { label: 'All Comp', value: '' },
  { label: 'Stipend', value: 'stipend', icon: 'payments', activeClass: 'bg-emerald-600 text-white' },
  { label: 'Non-Stipend', value: 'non_stipend', icon: 'money_off', activeClass: 'bg-slate-700 text-white' },
  { label: 'Paid (Student Pays)', value: 'paid', icon: 'monetization_on', activeClass: 'bg-amber-600 text-white' },
];

const DEPARTMENTS = [
  'BCA',
  'B.Sc IT',
  'B.Sc Cyber Security',
  'B.Sc (Hons) AI & ML',
];

export default function InternshipFilters({
  filters,
  onChange,
  onReset,
  availableSkills = [],
  availableCompanies = [],
  activeTab = 'opportunities',
  totalCount = 0,
  filteredCount = 0,
}) {
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');

  // Active filter count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.q) count++;
    if (filters.skills && filters.skills.length > 0) count += filters.skills.length;
    if (filters.duration) count++;
    if (filters.season) count++;
    if (filters.compensation) count++;
    if (filters.company) count++;
    if (filters.status) count++;
    if (filters.department) count++;
    if (filters.sort && filters.sort !== 'newest') count++;
    return count;
  }, [filters]);

  const handleTextChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const handleToggleSkill = (skill) => {
    const current = Array.isArray(filters.skills) ? [...filters.skills] : [];
    const index = current.indexOf(skill);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(skill);
    }
    onChange({ ...filters, skills: current });
  };

  // Filter available skills based on local search
  const visibleSkills = useMemo(() => {
    let list = availableSkills;
    if (skillSearch.trim()) {
      const q = skillSearch.toLowerCase();
      list = list.filter((s) => s.toLowerCase().includes(q));
    }
    return skillsExpanded ? list : list.slice(0, 8);
  }, [availableSkills, skillSearch, skillsExpanded]);

  return (
    <div className="w-full rounded-2xl p-4 sm:p-6 bg-white/90 backdrop-blur-md border border-white/80 shadow-xs space-y-5">
      {/* ── Top Bar: Search + Quick Dropdowns + View Mode ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
            search
          </span>
          <input
            type="text"
            value={filters.q || ''}
            onChange={(e) => handleTextChange('q', e.target.value)}
            placeholder={
              activeTab === 'opportunities'
                ? 'Search by role, company name, skill, or location...'
                : 'Search by student name, roll number, role, or company...'
            }
            className="w-full h-10 pl-10 pr-9 rounded-xl bg-surface-container-low/80 hover:bg-white text-text-primary placeholder:text-text-secondary/70 text-xs font-medium border border-border-subtle focus:border-primary-container focus:bg-white focus:outline-none transition-all shadow-xs"
          />
          {filters.q && (
            <button
              onClick={() => handleTextChange('q', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              title="Clear search"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* Dropdowns & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Company Dropdown */}
          {availableCompanies.length > 0 && (
            <select
              value={filters.company || ''}
              onChange={(e) => handleTextChange('company', e.target.value)}
              className="h-10 px-3 bg-surface-container-low/80 hover:bg-white text-text-primary rounded-xl text-xs font-medium outline-none border border-border-subtle focus:border-primary-container shadow-xs transition-all cursor-pointer"
            >
              <option value="">All Companies</option>
              {availableCompanies.map((c) => {
                const name = typeof c === 'string' ? c : c.name || c.company_name;
                return (
                  <option key={name} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
          )}

          {/* Department Dropdown */}
          <select
            value={filters.department || ''}
            onChange={(e) => handleTextChange('department', e.target.value)}
            className="h-10 px-3 bg-surface-container-low/80 hover:bg-white text-text-primary rounded-xl text-xs font-medium outline-none border border-border-subtle focus:border-primary-container shadow-xs transition-all cursor-pointer"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Status Dropdown (only for opportunities tab) */}
          {activeTab === 'opportunities' && (
            <select
              value={filters.status || ''}
              onChange={(e) => handleTextChange('status', e.target.value)}
              className="h-10 px-3 bg-surface-container-low/80 hover:bg-white text-text-primary rounded-xl text-xs font-medium outline-none border border-border-subtle focus:border-primary-container shadow-xs transition-all cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
              <option value="filled">Filled</option>
            </select>
          )}

          {/* Sort Dropdown */}
          <select
            value={filters.sort || 'newest'}
            onChange={(e) => handleTextChange('sort', e.target.value)}
            className="h-10 px-3 bg-surface-container-low/80 hover:bg-white text-text-primary rounded-xl text-xs font-medium outline-none border border-border-subtle focus:border-primary-container shadow-xs transition-all cursor-pointer"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="deadline">Sort: Application Deadline</option>
            <option value="duration">Sort: Duration (High → Low)</option>
            <option value="stipend_desc">Sort: Stipend (High → Low)</option>
            <option value="company_asc">Sort: Company (A → Z)</option>
          </select>

          {/* Grid / List View Toggle */}
          <div className="flex bg-surface-container-low/90 p-0.5 rounded-xl border border-border-subtle shadow-xs">
            <button
              onClick={() => handleTextChange('viewMode', 'grid')}
              className={`p-2 rounded-lg transform transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
                filters.viewMode === 'grid'
                  ? 'bg-white shadow-xs text-primary-container border border-white/80'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <span className="material-symbols-outlined text-base">grid_view</span>
            </button>
            <button
              onClick={() => handleTextChange('viewMode', 'list')}
              className={`p-2 rounded-lg transform transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
                filters.viewMode === 'list'
                  ? 'bg-white shadow-xs text-primary-container border border-white/80'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="List View"
              aria-label="List View"
            >
              <span className="material-symbols-outlined text-base">format_list_bulleted</span>
            </button>
          </div>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200/80 transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
              title="Clear all active filters"
            >
              <span className="material-symbols-outlined text-sm">filter_alt_off</span>
              <span>Clear ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Rows: Full-Width Edge-to-Edge Grid Alignment with Fixed-Width Labels ── */}
      <div className="pt-4 border-t border-border-subtle/70 space-y-4 sm:space-y-4.5 w-full">
        {/* Row 1: Compensation (4 Options - Full Width Edge-to-Edge) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
          <div className="w-36 sm:w-40 shrink-0 flex items-center gap-2 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-text-secondary select-none">
            <span className="material-symbols-outlined text-[19px] text-text-secondary/80">paid</span>
            <span>Compensation:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 lg:gap-3 flex-1 w-full">
            {COMPENSATION_TYPES.map((ct) => {
              const active = (filters.compensation || '') === ct.value;
              return (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => handleTextChange('compensation', active && ct.value !== '' ? '' : ct.value)}
                  className={`filter-chip relative w-full inline-flex items-center justify-center gap-2 px-2.5 sm:px-3 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-[13px] xl:text-[14px] font-semibold select-none cursor-pointer border text-center transition-all ${
                    active
                      ? 'filter-chip-active bg-gradient-to-r from-[#8B1D2C] to-[#6E1521] text-white border-transparent shadow-sm'
                      : 'filter-chip-inactive bg-white/95 text-text-primary border-slate-200/90 shadow-2xs hover:bg-[#FDF6F7]'
                  }`}
                >
                  {ct.icon && <span className="material-symbols-outlined text-[18px] sm:text-[19px] shrink-0">{ct.icon}</span>}
                  <span className="whitespace-nowrap">{ct.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Season (5 Options - Full Width Edge-to-Edge) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
          <div className="w-36 sm:w-40 shrink-0 flex items-center gap-2 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-text-secondary select-none">
            <span className="material-symbols-outlined text-[19px] text-text-secondary/80">calendar_month</span>
            <span>Season:</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-2.5 lg:gap-3 flex-1 w-full">
            {SEASONS.map((sn) => {
              const active = (filters.season || '') === sn.value;
              return (
                <button
                  key={sn.value}
                  type="button"
                  onClick={() => handleTextChange('season', active && sn.value !== '' ? '' : sn.value)}
                  className={`filter-chip relative w-full inline-flex items-center justify-center gap-2 px-2 sm:px-2.5 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-[13px] xl:text-[14px] font-semibold select-none cursor-pointer border text-center transition-all ${
                    sn.value === 'autumn' ? 'col-span-2 md:col-span-1 ' : ''
                  }${
                    active
                      ? 'filter-chip-active bg-gradient-to-r from-[#8B1D2C] to-[#6E1521] text-white border-transparent shadow-sm'
                      : 'filter-chip-inactive bg-white/95 text-text-primary border-slate-200/90 shadow-2xs hover:bg-[#FDF6F7]'
                  }`}
                >
                  {sn.icon && <span className="material-symbols-outlined text-[18px] sm:text-[19px] shrink-0">{sn.icon}</span>}
                  <span className="whitespace-nowrap">{sn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Duration (6 Options - Full Width Edge-to-Edge) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
          <div className="w-36 sm:w-40 shrink-0 flex items-center gap-2 text-xs sm:text-[13px] font-bold uppercase tracking-wider text-text-secondary select-none">
            <span className="material-symbols-outlined text-[19px] text-text-secondary/80">schedule</span>
            <span>Duration:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3 flex-1 w-full">
            {DURATION_PRESETS.map((dp) => {
              const active = (filters.duration || '') === dp.value;
              return (
                <button
                  key={dp.value}
                  type="button"
                  onClick={() => handleTextChange('duration', active && dp.value !== '' ? '' : dp.value)}
                  className={`filter-chip relative w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-[13px] xl:text-[14px] font-semibold select-none cursor-pointer border text-center transition-all ${
                    active
                      ? 'filter-chip-active bg-gradient-to-r from-[#8B1D2C] to-[#6E1521] text-white border-transparent shadow-sm'
                      : 'filter-chip-inactive bg-white/95 text-text-primary border-slate-200/90 shadow-2xs hover:bg-[#FDF6F7]'
                  }`}
                >
                  <span className="whitespace-nowrap">{dp.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Skills Filter Chips (derived from live data) ── */}
      {availableSkills.length > 0 && (
        <div className="pt-3 border-t border-border-subtle/60 space-y-3 w-full">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">psychology</span>
                Filter by Skills ({availableSkills.length} available):
              </span>
              {availableSkills.length > 8 && (
                <input
                  type="text"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  placeholder="Find skill..."
                  className="h-7 px-2.5 text-xs rounded-lg bg-surface-container-low border border-border-subtle focus:bg-white focus:outline-none"
                />
              )}
            </div>

            {availableSkills.length > 8 && (
              <button
                type="button"
                onClick={() => setSkillsExpanded(!skillsExpanded)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                <span>{skillsExpanded ? 'Show Less' : `+${availableSkills.length - 8} More`}</span>
                <span className="material-symbols-outlined text-sm">
                  {skillsExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {visibleSkills.map((skill) => {
              const isSelected = Array.isArray(filters.skills) && filters.skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleToggleSkill(skill)}
                  className={`filter-chip relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer border ${
                    isSelected
                      ? 'filter-chip-active bg-primary-container text-white border-primary shadow-xs'
                      : 'filter-chip-inactive bg-slate-50 hover:bg-slate-100 text-text-secondary border-slate-200/80 shadow-2xs'
                  }`}
                >
                  <span>{skill}</span>
                  {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Status Bar / Result Count ── */}
      <div className="pt-3 border-t border-border-subtle/60 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-text-secondary">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] sm:text-[14px]">
            Showing <strong className="font-bold text-text-primary">{filteredCount}</strong> of{' '}
            <strong className="font-bold text-text-primary">{totalCount}</strong>{' '}
            {activeTab === 'opportunities' ? 'opportunities' : 'internships'}
          </span>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs">
              {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
