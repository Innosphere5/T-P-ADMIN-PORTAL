'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import {
  VALID_SEASONS,
  VALID_COMPENSATION_TYPES,
  VALID_WORK_MODES,
  VALID_STATUSES,
  VALID_DEPARTMENTS,
  validateInternshipOpportunity,
} from '@/lib/internshipValidation';

export default function OpportunityFormModal({
  isOpen,
  onClose,
  initialData = null,
  companies = [],
  onSave,
}) {
  const isEditing = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    company_id: '',
    company_name: '',
    title: '',
    description: '',
    required_skills: [],
    eligible_departments: [],
    duration_months: 6,
    duration_preset: '6',
    season: 'summer',
    compensation_type: 'stipend',
    stipend_amount: '',
    fee_amount: '',
    work_mode: 'onsite',
    location: '',
    seats: '',
    application_deadline: '',
    start_date: '',
    end_date: '',
    status: 'open',
    is_visible: true,
  });

  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isCustomCompany, setIsCustomCompany] = useState(false);

  useEffect(() => {
    if (initialData) {
      const duration = initialData.duration_months || 6;
      const isPreset = [3, 6, 9, 12].includes(Number(duration));

      const matchedCompany = companies.find(
        (c) => c.id === initialData.company_id || c.company_name?.toLowerCase() === initialData.company_name?.toLowerCase()
      );

      setFormData({
        company_id: initialData.company_id || '',
        company_name: initialData.company_name || '',
        title: initialData.title || '',
        description: initialData.description || '',
        required_skills: Array.isArray(initialData.required_skills) ? [...initialData.required_skills] : [],
        eligible_departments: Array.isArray(initialData.eligible_departments) ? [...initialData.eligible_departments] : [],
        duration_months: duration,
        duration_preset: isPreset ? String(duration) : 'custom',
        season: initialData.season || 'summer',
        compensation_type: initialData.compensation_type || 'stipend',
        stipend_amount: initialData.stipend_amount != null ? String(initialData.stipend_amount) : '',
        fee_amount: initialData.fee_amount != null ? String(initialData.fee_amount) : '',
        work_mode: initialData.work_mode || 'onsite',
        location: initialData.location || '',
        seats: initialData.seats != null ? String(initialData.seats) : '',
        application_deadline: initialData.application_deadline || '',
        start_date: initialData.start_date || '',
        end_date: initialData.end_date || '',
        status: initialData.status || 'open',
        is_visible: initialData.is_visible !== undefined ? Boolean(initialData.is_visible) : true,
      });

      setIsCustomCompany(!matchedCompany && Boolean(initialData.company_name));
      setErrors({});
    } else {
      setFormData({
        company_id: companies[0]?.id || '',
        company_name: companies[0]?.company_name || '',
        title: '',
        description: '',
        required_skills: [],
        eligible_departments: [],
        duration_months: 6,
        duration_preset: '6',
        season: 'summer',
        compensation_type: 'stipend',
        stipend_amount: '25000',
        fee_amount: '',
        work_mode: 'onsite',
        location: 'Chandigarh / Mohali',
        seats: '5',
        application_deadline: '',
        start_date: '',
        end_date: '',
        status: 'open',
        is_visible: true,
      });
      setIsCustomCompany(false);
      setErrors({});
    }
  }, [initialData, companies, isOpen]);

  const handleCompanyChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomCompany(true);
      setFormData((prev) => ({ ...prev, company_id: '', company_name: '' }));
    } else {
      setIsCustomCompany(false);
      const comp = companies.find((c) => c.id === val);
      setFormData((prev) => ({
        ...prev,
        company_id: val,
        company_name: comp?.company_name || prev.company_name,
      }));
    }
  };

  const handleAddSkill = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = skillInput.trim().replace(/^,+|,+$/g, '');
      if (val && !formData.required_skills.some((s) => s.toLowerCase() === val.toLowerCase())) {
        setFormData((prev) => ({
          ...prev,
          required_skills: [...prev.required_skills, val],
        }));
        setSkillInput('');
        setErrors((prev) => ({ ...prev, required_skills: null }));
      }
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      required_skills: prev.required_skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleDepartmentToggle = (dept) => {
    setFormData((prev) => {
      const exists = prev.eligible_departments.includes(dept);
      const next = exists
        ? prev.eligible_departments.filter((d) => d !== dept)
        : [...prev.eligible_departments, dept];
      return { ...prev, eligible_departments: next };
    });
  };

  const handleDurationPreset = (preset) => {
    if (preset === 'custom') {
      setFormData((prev) => ({ ...prev, duration_preset: 'custom' }));
    } else {
      setFormData((prev) => ({
        ...prev,
        duration_preset: preset,
        duration_months: Number(preset),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      company_name: formData.company_name.trim(),
      company_id: formData.company_id || null,
      stipend_amount: formData.compensation_type === 'stipend' ? Number(formData.stipend_amount) : null,
      fee_amount: formData.compensation_type === 'paid' ? Number(formData.fee_amount) : null,
      seats: formData.seats ? Number(formData.seats) : null,
      duration_months: Number(formData.duration_months),
    };

    const validation = validateInternshipOpportunity(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setSubmitting(true);
      await onSave?.(validation.sanitized, initialData?.id);
      onClose();
    } catch (err) {
      setErrors({ form: err.message || 'Failed to save opportunity' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Internship Opportunity' : 'Create Internship Opportunity'}
      subtitle="Publish verified corporate opportunities for academic internships."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errors.form && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
            {errors.form}
          </div>
        )}

        {/* Company & Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block font-bold text-text-primary mb-1">
              Company Partner <span className="text-rose-500">*</span>
            </label>
            {!isCustomCompany ? (
              <select
                value={formData.company_id || (companies.length > 0 ? companies[0].id : '__custom__')}
                onChange={handleCompanyChange}
                className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white text-text-primary focus:border-primary focus:outline-none font-medium"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.industry || 'Corporate'})
                  </option>
                ))}
                <option value="__custom__">+ Enter Custom Partner Company</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Oracle India, Tech Mahindra"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white text-text-primary focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomCompany(false)}
                  className="px-2.5 rounded-xl border border-border-subtle hover:bg-slate-50 text-[11px] text-text-secondary whitespace-nowrap"
                >
                  From List
                </button>
              </div>
            )}
            {errors.company_name && (
              <span className="text-[11px] text-rose-600 mt-1 block">{errors.company_name}</span>
            )}
          </div>

          <div>
            <label className="block font-bold text-text-primary mb-1">
              Title / Role <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cloud Engineering Intern"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white text-text-primary focus:border-primary focus:outline-none"
            />
            {errors.title && (
              <span className="text-[11px] text-rose-600 mt-1 block">{errors.title}</span>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block font-bold text-text-primary mb-1">Role Description</label>
          <textarea
            rows={2}
            placeholder="Key responsibilities, learning tracks, and industrial expectations..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-3 rounded-xl border border-border-subtle bg-white text-text-primary focus:border-primary focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Required Skills (Tag Input) */}
        <div>
          <label className="block font-bold text-text-primary mb-1">
            Required Skills <span className="text-rose-500">*</span>
            <span className="text-text-secondary font-normal ml-1.5">(Press Enter or comma to add)</span>
          </label>
          <div className="min-h-[42px] p-2 rounded-xl border border-border-subtle bg-white flex flex-wrap items-center gap-1.5 focus-within:border-primary">
            {formData.required_skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-semibold text-[11px]"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="hover:text-rose-600 focus:outline-none"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              placeholder={formData.required_skills.length === 0 ? 'e.g. Python, Docker, AWS...' : 'Add another skill...'}
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleAddSkill}
              className="flex-1 min-w-[120px] h-7 px-1.5 text-xs text-text-primary focus:outline-none"
            />
          </div>
          {errors.required_skills && (
            <span className="text-[11px] text-rose-600 mt-1 block">{errors.required_skills}</span>
          )}
        </div>

        {/* Duration & Season */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Duration */}
          <div>
            <label className="block font-bold text-text-primary mb-1.5">
              Duration <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[3, 6, 9, 12].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => handleDurationPreset(String(m))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    formData.duration_preset === String(m)
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-white text-text-secondary border-border-subtle hover:bg-slate-50'
                  }`}
                >
                  {m} Mo
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleDurationPreset('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  formData.duration_preset === 'custom'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white text-text-secondary border-border-subtle hover:bg-slate-50'
                }`}
              >
                Custom
              </button>
            </div>
            {formData.duration_preset === 'custom' && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                  placeholder="Months (1–24)"
                  className="w-28 h-9 px-3 rounded-xl border border-border-subtle focus:border-primary focus:outline-none"
                />
                <span className="text-text-secondary font-medium">Months</span>
              </div>
            )}
            {errors.duration_months && (
              <span className="text-[11px] text-rose-600 mt-1 block">{errors.duration_months}</span>
            )}
          </div>

          {/* Season */}
          <div>
            <label className="block font-bold text-text-primary mb-1.5">
              Target Season <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['winter', 'summer', 'spring', 'autumn', 'any'].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setFormData({ ...formData, season: s })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                    formData.season === s
                      ? s === 'winter'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : s === 'summer'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-white text-text-secondary border-border-subtle hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {errors.season && (
              <span className="text-[11px] text-rose-600 mt-1 block">{errors.season}</span>
            )}
          </div>
        </div>

        {/* Compensation Model (Mutually Exclusive) */}
        <div className="p-3.5 rounded-xl bg-surface-container-low/70 border border-border-subtle space-y-3">
          <label className="block font-bold text-text-primary">
            Compensation Model <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'stipend', label: 'Stipend', sub: 'Company pays student' },
              { id: 'non_stipend', label: 'Non-Stipend', sub: 'Unpaid track' },
              { id: 'paid', label: 'Paid (Student Pays)', sub: 'Training fee charged' },
            ].map((type) => (
              <label
                key={type.id}
                onClick={() => setFormData({ ...formData, compensation_type: type.id })}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  formData.compensation_type === type.id
                    ? 'bg-white border-primary shadow-xs ring-1 ring-primary/20'
                    : 'bg-white/60 border-border-subtle hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary">{type.label}</span>
                  <input
                    type="radio"
                    name="compensation_type"
                    checked={formData.compensation_type === type.id}
                    onChange={() => {}}
                    className="text-primary focus:ring-primary"
                  />
                </div>
                <span className="text-[10px] text-text-secondary mt-1">{type.sub}</span>
              </label>
            ))}
          </div>

          {/* Amount inputs depending on compensation type */}
          {formData.compensation_type === 'stipend' && (
            <div>
              <label className="block font-semibold text-text-primary mb-1">
                Monthly Stipend (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-text-secondary">₹</span>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="25000"
                  value={formData.stipend_amount}
                  onChange={(e) => setFormData({ ...formData, stipend_amount: e.target.value })}
                  className="w-full h-10 pl-7 pr-3 rounded-xl border border-border-subtle bg-white font-mono font-bold text-text-primary focus:border-primary focus:outline-none"
                />
              </div>
              {errors.stipend_amount && (
                <span className="text-[11px] text-rose-600 mt-1 block">{errors.stipend_amount}</span>
              )}
            </div>
          )}

          {formData.compensation_type === 'paid' && (
            <div>
              <label className="block font-semibold text-amber-900 mb-1">
                Fee Paid by Student (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-text-secondary">₹</span>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="15000"
                  value={formData.fee_amount}
                  onChange={(e) => setFormData({ ...formData, fee_amount: e.target.value })}
                  className="w-full h-10 pl-7 pr-3 rounded-xl border border-amber-300 bg-amber-50/40 font-mono font-bold text-amber-900 focus:border-amber-600 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-amber-800 mt-1">
                Note: In this track, the scholar pays the partnering organization for certified industrial training.
              </p>
              {errors.fee_amount && (
                <span className="text-[11px] text-rose-600 mt-1 block">{errors.fee_amount}</span>
              )}
            </div>
          )}
        </div>

        {/* Work Mode & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block font-bold text-text-primary mb-1">Work Mode</label>
            <select
              value={formData.work_mode}
              onChange={(e) => setFormData({ ...formData, work_mode: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white text-text-primary focus:border-primary focus:outline-none capitalize font-medium"
            >
              {VALID_WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-text-primary mb-1">Location</label>
            <input
              type="text"
              placeholder="e.g. Mohali, Gurugram, Bengaluru"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white text-text-primary focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Seats, Application Deadline, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-bold text-text-primary mb-1">Open Seats</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 5"
              value={formData.seats}
              onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white font-mono text-text-primary focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-text-primary mb-1">Application Deadline</label>
            <input
              type="date"
              value={formData.application_deadline}
              onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white font-mono text-text-primary focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-text-primary mb-1">Listing Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-border-subtle bg-white text-text-primary focus:border-primary focus:outline-none capitalize font-medium"
            >
              {VALID_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Eligible Departments */}
        <div>
          <label className="block font-bold text-text-primary mb-1.5">
            Eligible Academic Departments
            <span className="text-text-secondary font-normal ml-1.5">(Leave empty for all departments)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {VALID_DEPARTMENTS.map((dept) => {
              const checked = formData.eligible_departments.includes(dept);
              return (
                <label
                  key={dept}
                  className={`p-2 rounded-lg border text-[11px] font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                    checked
                      ? 'bg-primary/5 border-primary text-primary'
                      : 'bg-white border-border-subtle text-text-secondary hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleDepartmentToggle(dept)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="truncate">{dept}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Visibility Toggle */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="oppIsVisible"
            checked={formData.is_visible}
            onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
            className="rounded text-primary focus:ring-primary"
          />
          <label htmlFor="oppIsVisible" className="font-semibold text-text-primary cursor-pointer select-none">
            Visible in Scholar Opportunities Portal
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-border-subtle text-text-secondary hover:bg-surface-container-low font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-white font-bold shadow-md hover:shadow-lg transition-transform hover:scale-[1.01] flex items-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #8B1D2C 0%, #6E1521 100%)' }}
          >
            {submitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>{isEditing ? 'Update Opportunity' : 'Publish Opportunity'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
