'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getEventBySlug, submitEventRegistration } from '@/lib/driveClient';
import {
  DEFAULT_FORM_FIELDS,
  getCategoryMeta,
  formatDateTime,
  formatCtcRange,
} from '@/lib/driveUtils';

export default function EventRegistrationClient({ initialEvent, slug }) {
  const [event, setEvent] = useState(initialEvent || null);
  const [loading, setLoading] = useState(!initialEvent);
  const [notFound, setNotFound] = useState(false);

  // Form State — initialized immediately with initialEvent fields so SSR has initial state
  const [formData, setFormData] = useState(() => {
    if (!initialEvent) return {};
    const schema = initialEvent.form_schema || initialEvent.formSchema || DEFAULT_FORM_FIELDS;
    const initialValues = {};
    if (Array.isArray(schema)) {
      schema.forEach((field) => {
        initialValues[field.id] = field.type === 'multi_select' ? [] : '';
      });
    }
    return initialValues;
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Fallback client-side fetch if initialEvent wasn't provided by SSR
  useEffect(() => {
    if (event) return;
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const ev = await getEventBySlug(slug);
        if (isMounted) {
          if (!ev) {
            setNotFound(true);
          } else {
            setEvent(ev);
            const schema = ev.form_schema || ev.formSchema || DEFAULT_FORM_FIELDS;
            const initialValues = {};
            if (Array.isArray(schema)) {
              schema.forEach((field) => {
                initialValues[field.id] = field.type === 'multi_select' ? [] : '';
              });
            }
            setFormData(initialValues);
          }
        }
      } catch {
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [event, slug]);

  // Pre-fill form fields from URL search parameters (e.g. from student app redirect)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const prefill = {};
      ['name', 'roll_no', 'email', 'phone', 'department', 'semester'].forEach((key) => {
        const val = sp.get(key);
        if (val) prefill[key] = val;
      });
      if (Object.keys(prefill).length > 0) {
        setFormData((prev) => ({ ...prev, ...prefill }));
      }
    } catch {}
  }, []);

  const handleInputChange = (fieldId, value) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    if (formErrors[fieldId]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  const handleMultiSelectToggle = (fieldId, option) => {
    const current = Array.isArray(formData[fieldId]) ? formData[fieldId] : [];
    const updated = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];
    handleInputChange(fieldId, updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const schema = event?.form_schema || event?.formSchema || DEFAULT_FORM_FIELDS;
    const errors = {};

    // Validate each field
    schema.forEach((field) => {
      const val = formData[field.id];
      if (field.required) {
        if (
          val === undefined ||
          val === null ||
          (typeof val === 'string' && !val.trim()) ||
          (Array.isArray(val) && val.length === 0)
        ) {
          errors[field.id] = `${field.label || 'This field'} is required`;
        }
      }

      if (field.type === 'email' && val) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          errors[field.id] = 'Please enter a valid email address';
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstErrorField = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrorField}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const customResponses = {};
      schema
        .filter((f) => !f.isDefault)
        .forEach((f) => {
          customResponses[f.id] = formData[f.id] !== undefined ? formData[f.id] : '';
        });

      const payload = {
        event_id: event.id,
        form_slug: slug || event.form_slug || event.formSlug,
        student_name: formData.name || formData.student_name || '',
        student_roll_no: formData.roll_no || formData.student_roll_no || '',
        student_email: formData.email || formData.student_email || '',
        student_phone: formData.phone || formData.student_phone || '',
        department: formData.department || '',
        semester: formData.semester || '',
        form_responses: customResponses,
      };

      const res = await submitEventRegistration(payload);
      if (res.success) {
        setSubmittedReceipt(res.registration || payload);
      } else {
        setSubmitError(res.error || 'Failed to submit registration. Please try again.');
      }
    } catch (err) {
      setSubmitError(err.message || 'Network error submitting registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center mb-4 border border-border-subtle animate-pulse">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">
            progress_activity
          </span>
        </div>
        <h3 className="text-base font-bold text-text-primary">Loading Event Registration...</h3>
        <p className="text-xs text-text-secondary mt-1">Verifying event details and registration schema</p>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-border shadow-xl text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">event_busy</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary">Event Not Found</h2>
          <p className="text-xs text-text-secondary mt-2 leading-relaxed">
            The registration link you requested does not exist or has been unpublished by university administration.
          </p>
          <a
            href="/"
            className="mt-6 px-6 py-2.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md transition-all"
          >
            Return to RIMT Portal
          </a>
        </div>
      </div>
    );
  }

  const categoryMeta = getCategoryMeta(event.category);
  const schema = event.form_schema || event.formSchema || DEFAULT_FORM_FIELDS;

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#181A1F] flex flex-col items-center justify-start pb-16">
      {/* Top University Branding Bar */}
      <header className="w-full bg-[#15151F] text-white py-3.5 px-6 border-b border-white/10 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs">
              <Image
                src="/rimt-logo.png"
                alt="RIMT University"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-[10px] tracking-widest text-[#ffdf9b] uppercase font-bold block">
                RIMT UNIVERSITY • PUNJAB
              </span>
              <span className="text-xs font-bold text-white tracking-tight">
                Official Event &amp; Drive Registration Portal
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium border border-white/15 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Registrations Active</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-2xl px-4 mt-6 sm:mt-10 flex flex-col gap-6">
        {/* Event Hero Card */}
        <div
          className="relative rounded-3xl p-6 sm:p-8 text-white overflow-hidden shadow-2xl border border-white/10"
          style={{
            background:
              'radial-gradient(120% 120% at 85% 15%, rgba(155, 29, 44, 0.45) 0%, rgba(26, 27, 46, 0.75) 45%, rgba(21, 21, 31, 0.98) 100%), linear-gradient(135deg, rgb(21, 21, 31) 0%, rgb(17, 17, 26) 100%)',
          }}
        >
          <div className="flex flex-col gap-3 relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-3 py-0.5 rounded-full text-[11px] font-bold shadow-xs inline-flex items-center gap-1"
                style={{
                  backgroundColor: categoryMeta?.bg || '#F1F5F9',
                  color: categoryMeta?.color || '#475569',
                }}
              >
                <span className="material-symbols-outlined text-xs">
                  {categoryMeta?.icon || 'event'}
                </span>
                {categoryMeta?.label || event.category}
              </span>

              {event.company_name && (
                <span className="px-3 py-0.5 rounded-full bg-white/10 text-white/90 text-[11px] font-semibold border border-white/15">
                  Host: {event.company_name}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {event.title}
            </h1>

            {event.description && (
              <p className="text-xs sm:text-sm text-surface-container-high/90 leading-relaxed max-w-xl">
                {event.description}
              </p>
            )}

            {/* Event Quick Logistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-4 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2 text-surface-container-high/90">
                <span className="material-symbols-outlined text-[#ffdf9b] text-base">
                  calendar_today
                </span>
                <span>
                  <strong>Starts:</strong> {formatDateTime(event.starts_at || event.startsAt)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-surface-container-high/90">
                <span className="material-symbols-outlined text-[#ffdf9b] text-base">pin_drop</span>
                <span>
                  <strong>Venue:</strong> {event.venue || event.meeting_url || event.meetingUrl || 'RIMT University Campus'}
                </span>
              </div>

              {(event.package_max_lpa || event.packageMaxLpa) && (
                <div className="flex items-center gap-2 text-surface-container-high/90">
                  <span className="material-symbols-outlined text-[#ffdf9b] text-base">payments</span>
                  <span>
                    <strong>Package:</strong>{' '}
                    {formatCtcRange(
                      event.package_min_lpa || event.packageMinLpa,
                      event.package_max_lpa || event.packageMaxLpa
                    )}
                  </span>
                </div>
              )}

              {(event.registration_deadline || event.registrationDeadline) && (
                <div className="flex items-center gap-2 text-surface-container-high/90">
                  <span className="material-symbols-outlined text-[#ffdf9b] text-base">
                    timer
                  </span>
                  <span>
                    <strong>Deadline:</strong>{' '}
                    {formatDateTime(event.registration_deadline || event.registrationDeadline)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Success Confirmation Receipt */}
        {submittedReceipt ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-tint-green text-success-green flex items-center justify-center mb-4 shadow-sm border border-emerald-200">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>

            <span className="text-[11px] font-bold text-success-green uppercase tracking-wider">
              Registration Confirmed
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary mt-1">
              You&apos;re Registered!
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-md leading-relaxed">
              Your details have been successfully recorded with the university event coordinators.
              Bring your University ID card on the event date.
            </p>

            {/* Receipt Summary Box */}
            <div className="w-full bg-[#FAF6F0] rounded-2xl p-4 sm:p-5 border border-border/80 mt-6 text-left flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                <span className="text-[10px] uppercase font-bold text-text-secondary">
                  Registration Ref
                </span>
                <span className="font-mono font-bold text-xs text-primary">
                  {submittedReceipt.id || 'REG-' + Math.random().toString(36).substr(2, 8).toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">
                    Student Name
                  </span>
                  <span className="font-bold text-text-primary">
                    {submittedReceipt.student_name}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">
                    Roll Number
                  </span>
                  <span className="font-mono font-bold text-text-primary">
                    {submittedReceipt.student_roll_no}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">
                    Department
                  </span>
                  <span className="font-semibold text-text-primary">
                    {submittedReceipt.department || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">
                    Current Semester
                  </span>
                  <span className="font-semibold text-text-primary">
                    {submittedReceipt.semester || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-xs font-bold text-text-primary hover:border-primary transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>Print Receipt</span>
              </button>

              <button
                onClick={() => {
                  setSubmittedReceipt(null);
                  setFormData({});
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md transition-all"
              >
                <span>Register Another</span>
              </button>
            </div>
          </div>
        ) : (
          /* Dynamic Registration Form */
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-border shadow-xl flex flex-col gap-6"
          >
            <div className="flex flex-col gap-1 pb-4 border-b border-border">
              <h3 className="text-lg font-bold text-text-primary">Candidate Registration Form</h3>
              <p className="text-xs text-text-secondary">
                Please complete the following details accurately to register for {event.title}.
              </p>
            </div>

            {submitError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{submitError}</span>
              </div>
            )}

            {/* Render Fields from Schema */}
            <div className="flex flex-col gap-4">
              {schema.map((field) => {
                const error = formErrors[field.id];
                const value = formData[field.id] !== undefined ? formData[field.id] : '';

                return (
                  <div key={field.id} id={`field-${field.id}`} className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                      <span>
                        {field.label || field.id}
                        {field.required && <span className="text-primary ml-1">*</span>}
                      </span>
                      {field.isDefault && (
                        <span className="text-[10px] font-normal text-text-secondary">
                          Academic Profile
                        </span>
                      )}
                    </label>

                    {/* SELECT TYPE */}
                    {field.type === 'select' ? (
                      <select
                        value={value}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full h-10 px-3 rounded-xl bg-[#FAF6F0] text-xs text-text-primary outline-none border transition-colors ${
                          error ? 'border-primary' : 'border-border focus:border-primary'
                        }`}
                      >
                        <option value="">{field.placeholder || `Select ${field.label}`}</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'multi_select' ? (
                      /* MULTI SELECT TYPE */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-[#FAF6F0] border border-border">
                        {(field.options || []).map((opt) => {
                          const checked = Array.isArray(value) && value.includes(opt);
                          return (
                            <label
                              key={opt}
                              className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleMultiSelectToggle(field.id, opt)}
                                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : field.type === 'textarea' ? (
                      /* TEXTAREA TYPE */
                      <textarea
                        rows={3}
                        value={value}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={field.placeholder || 'Enter your response...'}
                        className={`w-full p-3 rounded-xl bg-[#FAF6F0] text-xs text-text-primary outline-none border transition-colors ${
                          error ? 'border-primary' : 'border-border focus:border-primary'
                        }`}
                      />
                    ) : field.type === 'checkbox' ? (
                      /* CHECKBOX (BOOLEAN) TYPE */
                      <label className="flex items-center gap-2.5 text-xs text-text-primary cursor-pointer p-3 rounded-xl bg-[#FAF6F0] border border-border">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => handleInputChange(field.id, e.target.checked)}
                          className="w-4 h-4 rounded text-primary accent-primary"
                        />
                        <span>{field.placeholder || 'I confirm and agree to participate'}</span>
                      </label>
                    ) : (
                      /* STANDARD INPUT (text, email, phone, number, date, file) */
                      <input
                        type={
                          field.type === 'email'
                            ? 'email'
                            : field.type === 'phone'
                            ? 'tel'
                            : field.type === 'number'
                            ? 'number'
                            : field.type === 'date'
                            ? 'date'
                            : 'text'
                        }
                        value={value}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={field.placeholder || `Enter ${field.label?.toLowerCase() || 'value'}`}
                        className={`w-full h-10 px-3 rounded-xl bg-[#FAF6F0] text-xs text-text-primary outline-none border transition-colors ${
                          error ? 'border-primary' : 'border-border focus:border-primary'
                        }`}
                      />
                    )}

                    {error && (
                      <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">error</span>
                        {error}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Declaration & Submit Button */}
            <div className="pt-4 border-t border-border flex flex-col gap-3">
              <p className="text-[11px] text-text-secondary leading-relaxed">
                By submitting this form, you certify that all entered credentials are correct and
                agree to abide by RIMT University event codes of conduct.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  background:
                    'linear-gradient(135deg, rgb(155, 29, 44) 0%, rgb(110, 21, 33) 100%)',
                }}
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">
                      progress_activity
                    </span>
                    <span>Submitting Registration...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">how_to_reg</span>
                    <span>Submit Event Registration</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-8 text-center text-xs text-text-secondary">
        <p>© 2026 RIMT University. Training &amp; Placement Cell and Event Directorate.</p>
      </footer>
    </div>
  );
}
