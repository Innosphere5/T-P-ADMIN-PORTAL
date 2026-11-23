'use client';

import React, { useState } from 'react';

export default function DriveRegistrationClient({ drive, initialSchema = [] }) {
  const [formData, setFormData] = useState({
    studentName: '',
    rollNo: '',
    department: 'BCA',
    semester: '3rd Year (5th Sem)',
    email: '',
    phone: '',
    cgpa: '',
  });

  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const questions = (initialSchema && initialSchema.length > 0)
    ? initialSchema
    : (drive.customForm || drive.formSchema || []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAnswerChange = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleCheckboxToggle = (key, opt) => {
    const current = Array.isArray(answers[key]) ? [...answers[key]] : [];
    const idx = current.indexOf(opt);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(opt);
    }
    handleAnswerChange(key, current);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const newErrors = {};

    // Validate Student Information
    if (!formData.studentName.trim()) newErrors.studentName = 'Full name is required';
    if (!formData.rollNo.trim()) newErrors.rollNo = 'University roll number is required';
    if (!formData.email.trim() || !formData.email.includes('@')) newErrors.email = 'Valid email address is required';
    if (!formData.phone.trim() || formData.phone.length < 10) newErrors.phone = 'Valid 10-digit phone number is required';

    // Validate Dynamic Questionnaire
    for (const q of questions) {
      const val = answers[q.key];
      if (q.required) {
        if (val === undefined || val === null || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
          newErrors[q.key] = `${q.label} is required`;
        }
      }
      if (q.type === 'number' && val !== undefined && val !== null && val !== '') {
        if (isNaN(Number(val))) newErrors[q.key] = 'Must be a valid number';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/drives/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drive_id: drive.id,
          student_name: formData.studentName.trim(),
          roll_no: formData.rollNo.trim().toUpperCase(),
          department: formData.department,
          semester: formData.semester,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          cgpa: formData.cgpa ? Number(formData.cgpa) : null,
          answers: answers,
          registration_source: 'web_portal',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmissionSuccess(data.registration || {
          id: `reg_${Date.now()}`,
          student_name: formData.studentName,
          roll_no: formData.rollNo,
          registered_at: new Date().toISOString(),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSubmitError(data.error || data.message || 'Failed to submit registration. Please try again.');
      }
    } catch (err) {
      setSubmitError(err.message || 'Network error submitting registration form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const appDeepLink = `rimt://placement?driveId=${drive.id}&openForm=true`;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B] antialiased py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#6B0018] to-[#990024] flex items-center justify-center text-white font-black text-xl shadow-md">
              R
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#6B0018] tracking-tight uppercase">
                RIMT UNIVERSITY
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Training &amp; Placement Cell · Official Registration Portal
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Registrations Live
          </span>
        </div>

        {/* Success Confirmation View */}
        {submissionSuccess ? (
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-200 p-8 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-3xl">
              ✓
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              Registration Confirmed
            </span>
            <h1 className="text-2xl font-black text-gray-900 mt-3 mb-2">
              You’re Officially Registered! 🎉
            </h1>
            <p className="text-sm text-gray-600 max-w-lg mx-auto mb-6">
              Thank you, <strong className="text-gray-900">{formData.studentName}</strong> (Roll: {formData.rollNo.toUpperCase()}). Your form submission for <strong className="text-gray-900">{drive.title}</strong> has been logged in the university placement ledger.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 max-w-md mx-auto text-left text-xs border border-gray-200 space-y-2 mb-6">
              <div className="flex justify-between py-1 border-b border-gray-200/80">
                <span className="text-gray-500">Registration ID</span>
                <span className="font-mono font-bold text-gray-800">{submissionSuccess.id || 'REG-CONFIRMED'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/80">
                <span className="text-gray-500">Candidate</span>
                <span className="font-bold text-gray-800">{formData.studentName} ({formData.department})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/80">
                <span className="text-gray-500">Submission Timestamp</span>
                <span className="text-gray-700">{new Date().toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Status</span>
                <span className="font-bold text-emerald-600">REGISTERED &amp; VERIFIED</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={appDeepLink}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6B0018] text-white font-bold text-sm shadow hover:bg-[#85001F] transition"
              >
                <span>📱 Open in Student Mobile App</span>
              </a>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition"
              >
                <span>🖨️ Print Slip</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Drive Overview Hero Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#6B0018] via-[#85001F] to-[#4A0011] p-6 sm:p-8 text-white relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm text-[#FDE68A] border border-white/20">
                    {drive.category === 'COLLEGE_EVENT' ? 'College Event' : drive.category === 'COMPETITION' ? 'Contest / Hackathon' : 'Campus Recruitment Drive'}
                  </span>
                  {drive.mode && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-black/25 text-white/90">
                      {drive.mode}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
                  {drive.title}
                </h1>

                {drive.companyName && (
                  <p className="text-sm sm:text-base text-gray-200 font-medium">
                    Organizer / Host: <strong className="text-white">{drive.companyName}</strong>
                    {drive.roleTitle ? ` · Focus: ${drive.roleTitle}` : ''}
                  </p>
                )}

                {/* Package / Compensation Pill */}
                {(drive.packageMinLpa || drive.packageMaxLpa) && (
                  <div className="inline-flex items-center gap-2 mt-4 px-3.5 py-1.5 rounded-lg bg-[#E7B94A]/20 border border-[#E7B94A]/50 text-[#FDE68A] text-xs font-bold">
                    <span>💼 CTC Package:</span>
                    <span>
                      {drive.packageMinLpa}
                      {drive.packageMaxLpa ? ` - ${drive.packageMaxLpa}` : ''} LPA
                    </span>
                  </div>
                )}
              </div>

              {/* Drive Details Grid */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-100 bg-gray-50/70 text-xs text-gray-700">
                <div>
                  <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Venue / Location
                  </span>
                  <span className="font-semibold text-gray-900">{drive.venue || drive.meetingUrl || 'RIMT Central Campus'}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Registration Deadline
                  </span>
                  <span className="font-semibold text-red-700">
                    {drive.registrationDeadline ? new Date(drive.registrationDeadline).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Open for batch'}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Eligible Departments
                  </span>
                  <span className="font-semibold text-gray-900">
                    {drive.eligibility?.departments?.join(', ') || 'BCA, B.Sc IT'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {drive.description && (
                <div className="p-6 border-b border-gray-100 text-sm text-gray-600 leading-relaxed">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">About This Opportunity</h3>
                  <p className="whitespace-pre-line">{drive.description}</p>
                </div>
              )}

              {/* App Deep Link Banner */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-800 flex items-center justify-center text-lg shrink-0">
                    📱
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-amber-900">Using a mobile phone?</p>
                    <p className="text-amber-700">Open in the RIMT Student App to auto-fill your credentials with 1 tap.</p>
                  </div>
                </div>
                <a
                  href={appDeepLink}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-sm hover:bg-amber-700 transition shrink-0"
                >
                  Open in Mobile App →
                </a>
              </div>
            </div>

            {/* Error Notice */}
            {submitError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <span className="font-bold">Notice:</span>
                <span>{submitError}</span>
              </div>
            )}

            {/* Main Interactive Registration Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-8">
              {/* Section 1: Candidate Verification */}
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#6B0018] text-white text-xs flex items-center justify-center font-bold">1</span>
                    Student Scholar Information
                  </h2>
                  <span className="text-xs text-gray-500">Official Institutional Identity</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sahil Preet Singh"
                      value={formData.studentName}
                      onChange={(e) => handleInputChange('studentName', e.target.value)}
                      className={`w-full h-11 px-3.5 rounded-xl border text-sm outline-none transition ${
                        errors.studentName ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#6B0018]'
                      }`}
                    />
                    {errors.studentName && <p className="text-xs text-red-600 mt-1">{errors.studentName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      University Roll Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2104592"
                      value={formData.rollNo}
                      onChange={(e) => handleInputChange('rollNo', e.target.value.toUpperCase())}
                      className={`w-full h-11 px-3.5 rounded-xl border text-sm font-mono uppercase outline-none transition ${
                        errors.rollNo ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#6B0018]'
                      }`}
                    />
                    {errors.rollNo && <p className="text-xs text-red-600 mt-1">{errors.rollNo}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Department / Program *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:border-[#6B0018]"
                    >
                      <option value="BCA">BCA (Bachelor of Computer Applications)</option>
                      <option value="B.Sc IT">B.Sc Information Technology</option>
                      <option value="B.Sc Cyber Security">B.Sc Cyber Security</option>
                      <option value="B.Sc (Hons) AI & ML">B.Sc (Hons) AI &amp; ML</option>
                      <option value="MCA">MCA (Master of Computer Applications)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Semester / Batch *
                    </label>
                    <select
                      value={formData.semester}
                      onChange={(e) => handleInputChange('semester', e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:border-[#6B0018]"
                    >
                      <option value="1st Year (1st Sem)">1st Year (1st Sem)</option>
                      <option value="1st Year (2nd Sem)">1st Year (2nd Sem)</option>
                      <option value="2nd Year (3rd Sem)">2nd Year (3rd Sem)</option>
                      <option value="2nd Year (4th Sem)">2nd Year (4th Sem)</option>
                      <option value="3rd Year (5th Sem)">3rd Year (5th Sem)</option>
                      <option value="3rd Year (6th Sem)">3rd Year (6th Sem)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@rimt.ac.in"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full h-11 px-3.5 rounded-xl border text-sm outline-none transition ${
                        errors.email ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#6B0018]'
                      }`}
                    />
                    {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      WhatsApp / Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full h-11 px-3.5 rounded-xl border text-sm outline-none transition ${
                        errors.phone ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-[#6B0018]'
                      }`}
                    />
                    {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Current Cumulative CGPA (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      placeholder="e.g. 8.45"
                      value={formData.cgpa}
                      onChange={(e) => handleInputChange('cgpa', e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#6B0018]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Form Questionnaire (Configured by Admin) */}
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#6B0018] text-white text-xs flex items-center justify-center font-bold">2</span>
                    Drive Requirements &amp; Questionnaire
                  </h2>
                  <span className="text-xs text-gray-500">{questions.length} Questions</span>
                </div>

                <div className="space-y-5">
                  {questions.map((q, idx) => {
                    const val = answers[q.key];
                    const err = errors[q.key];

                    return (
                      <div key={q.id || q.key || idx} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <label className="block text-xs font-bold text-gray-800 mb-1">
                          {idx + 1}. {q.label}
                          {q.required && <span className="text-red-600 font-bold"> *</span>}
                        </label>
                        {q.helpText && (
                          <p className="text-[11px] text-gray-500 mb-2">{q.helpText}</p>
                        )}

                        {/* Text Field */}
                        {q.type === 'text' && (
                          <input
                            type="text"
                            required={q.required}
                            placeholder={q.placeholder || 'Enter your response...'}
                            value={val || ''}
                            onChange={(e) => handleAnswerChange(q.key, e.target.value)}
                            className={`w-full h-10 px-3 rounded-lg border bg-white text-xs outline-none ${
                              err ? 'border-red-500 bg-red-50/20' : 'border-gray-300 focus:border-[#6B0018]'
                            }`}
                          />
                        )}

                        {/* Textarea */}
                        {q.type === 'textarea' && (
                          <textarea
                            rows={3}
                            required={q.required}
                            placeholder={q.placeholder || 'Provide details here...'}
                            value={val || ''}
                            onChange={(e) => handleAnswerChange(q.key, e.target.value)}
                            className={`w-full p-3 rounded-lg border bg-white text-xs outline-none ${
                              err ? 'border-red-500 bg-red-50/20' : 'border-gray-300 focus:border-[#6B0018]'
                            }`}
                          />
                        )}

                        {/* Number Field */}
                        {q.type === 'number' && (
                          <input
                            type="number"
                            required={q.required}
                            placeholder="Enter number..."
                            value={val || ''}
                            onChange={(e) => handleAnswerChange(q.key, e.target.value)}
                            className={`w-full h-10 px-3 rounded-lg border bg-white text-xs outline-none ${
                              err ? 'border-red-500 bg-red-50/20' : 'border-gray-300 focus:border-[#6B0018]'
                            }`}
                          />
                        )}

                        {/* Select Dropdown */}
                        {q.type === 'select' && (
                          <select
                            required={q.required}
                            value={val || ''}
                            onChange={(e) => handleAnswerChange(q.key, e.target.value)}
                            className={`w-full h-10 px-3 rounded-lg border bg-white text-xs outline-none ${
                              err ? 'border-red-500' : 'border-gray-300 focus:border-[#6B0018]'
                            }`}
                          >
                            <option value="">-- Choose an option --</option>
                            {(q.options || []).map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}

                        {/* Radio Options */}
                        {q.type === 'radio' && (
                          <div className="flex flex-col gap-2 mt-2">
                            {(q.options || []).map((opt, oIdx) => (
                              <label key={oIdx} className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                                <input
                                  type="radio"
                                  name={q.key}
                                  value={opt}
                                  checked={val === opt}
                                  onChange={(e) => handleAnswerChange(q.key, e.target.value)}
                                  className="text-[#6B0018] focus:ring-[#6B0018]"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Checkbox Options */}
                        {q.type === 'checkbox' && (
                          <div className="flex flex-col gap-2 mt-2">
                            {(q.options || []).map((opt, oIdx) => {
                              const checked = Array.isArray(val) && val.includes(opt);
                              return (
                                <label key={oIdx} className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleCheckboxToggle(q.key, opt)}
                                    className="rounded text-[#6B0018] focus:ring-[#6B0018]"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {err && <p className="text-xs text-red-600 mt-1.5">{err}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-gray-500">
                  By clicking submit, you confirm that the academic details provided are accurate.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#6B0018] to-[#990024] text-white font-bold text-sm shadow-md hover:from-[#85001F] hover:to-[#B3002B] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Submit Form & Register ✓'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 mt-12 mb-6">
          <p>© RIMT University · Training &amp; Placement Cell · Academic Session 2024–25</p>
        </div>
      </div>
    </div>
  );
}
