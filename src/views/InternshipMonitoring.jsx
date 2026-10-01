'use client';

import React, { useState, useMemo } from 'react';
import HeroCard from '../components/HeroCard';
import KpiCard from '../components/KpiCard';
import FilterPills from '../components/FilterPills';
import Modal from '../components/Modal';
import { INTERNSHIPS_DATA } from '../constants/data';

export default function InternshipMonitoring({ globalSearch = '' }) {
  const [internships, setInternships] = useState(INTERNSHIPS_DATA);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetch('/api/admin/internships', {
      headers: {
        Authorization: 'Bearer rimt-admin-master-token',
        'x-admin-portal': 'true',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.internships && Array.isArray(data.internships) && data.internships.length > 0) {
          const mapped = data.internships.map((item) => ({
            id: item.id,
            studentName: item.student_name || 'Scholar Intern',
            roll: item.roll_no || 'RIMT Scholar',
            company: item.company_name,
            role: item.role_title,
            stipend: item.stipend ? `₹${Number(item.stipend).toLocaleString('en-IN')} / month` : 'Stipend undisclosed',
            duration: item.start_date ? `${item.start_date} to ${item.is_ongoing ? 'Present' : (item.end_date || '—')}` : '6 Months',
            mentor: 'Faculty Placement Mentor',
            progress: item.status === 'completed' ? 100 : (item.status === 'ongoing' ? 65 : 20),
            status: item.status === 'completed' ? 'Completed' : (item.status === 'ongoing' ? 'Ongoing' : 'Terminated'),
            statusType: item.status,
            category: item.status === 'completed' ? 'completed' : 'ongoing',
            certificateVerified: true,
            certificateHash: 'Verified Institutional Record',
          }));
          setInternships([...mapped, ...INTERNSHIPS_DATA]);
        }
      })
      .catch(() => {});
  }, []);

  const [newInternship, setNewInternship] = useState({
    studentName: '',
    roll: '',
    company: '',
    role: 'Software Development Intern',
    stipend: '₹35,000 / month',
    duration: '6 Months (Jan–Jun 2025)',
    mentor: 'Dr. Monika Aggarwal (RIMT)',
  });

  const filterPills = [
    { id: 'all', label: 'All Internships', count: internships.length, icon: 'assignment' },
    { id: 'ongoing', label: 'Ongoing 6-Month Track', count: internships.filter(i => i.category === 'ongoing').length, icon: 'pending' },
    { id: 'completed', label: 'Completed & Evaluated', count: internships.filter(i => i.category === 'completed').length, icon: 'check_circle' },
    { id: 'at-risk', label: 'At Risk (Low Attendance)', count: internships.filter(i => i.category === 'at-risk').length, icon: 'warning' },
  ];

  const filteredInternships = useMemo(() => {
    return internships.filter(item => {
      const matchesFilter =
        activeFilter === 'all' ? true : item.category === activeFilter;
      const q = globalSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.studentName.toLowerCase().includes(q) ||
        item.roll.toLowerCase().includes(q) ||
        item.company.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q) ||
        item.mentor.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [internships, activeFilter, globalSearch]);

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!newInternship.studentName || !newInternship.company) return;

    const created = {
      id: `int-${Date.now()}`,
      studentName: newInternship.studentName,
      roll: newInternship.roll || 'RIMT-21-CSE-999',
      company: newInternship.company,
      role: newInternship.role,
      stipend: newInternship.stipend,
      duration: newInternship.duration,
      mentor: newInternship.mentor,
      progress: 10,
      status: 'Ongoing',
      statusType: 'ongoing',
      category: 'ongoing',
      certificateVerified: false,
      certificateHash: 'Verification In-Progress',
    };

    setInternships([created, ...internships]);
    setShowAssignModal(false);
    setNewInternship({
      studentName: '',
      roll: '',
      company: '',
      role: 'Software Development Intern',
      stipend: '₹35,000 / month',
      duration: '6 Months (Jan–Jun 2025)',
      mentor: 'Dr. Monika Aggarwal (RIMT)',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="font-bold text-primary uppercase tracking-wider text-[11px]">Module 06</span>
            <span>•</span>
            <span>Experiential Learning &amp; Industry Internships</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Internship Monitoring &amp; Mentor Verification
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex-1 sm:flex-initial h-10 px-5 rounded-full text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #8B1D2C 0%, #6E1521 100%)',
              boxShadow: '0 4px 14px rgba(139, 29, 44, 0.35)',
            }}
          >
            <span className="material-symbols-outlined text-base">assignment_add</span>
            <span>+ Assign Internship</span>
          </button>
        </div>
      </div>

      {/* 2. Glossy Dark Hero Card */}
      <HeroCard
        badgeText="Mandatory 8th Semester Industry Track"
        badgeIcon="business_center"
        secondaryBadge="AY 2024–25 Evaluated"
        title="312 Active Internships • 92% Mentor-Assigned"
        description="Live tracking of semester-long industrial internships, stipend disbursements, bi-weekly progress logs, and official certificate authentications."
        metrics={[
          {
            label: 'Total Active',
            value: '312',
            caption: '98% Corporate Placed',
            captionIcon: 'verified',
          },
          {
            label: 'Mentor Mapping',
            value: '92.4%',
            caption: 'Assigned Faculty Guides',
            captionIcon: 'support_agent',
          },
        ]}
      />

      {/* 3. Four Glossy KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          variant="maroon"
          icon="assignment"
          trend="+38 vs 2024"
          trendIcon="trending_up"
          value="312"
          badgeText="Interns"
          title="Total Internships Logged"
          subtitle="6-Month Credit Track"
        />
        <KpiCard
          variant="amber"
          icon="timelapse"
          trend="In Evaluation"
          trendIcon="schedule"
          value="248"
          badgeText="Active"
          title="Currently Active"
          subtitle="Bi-Weekly Reports In Review"
        />
        <KpiCard
          variant="emerald"
          icon="verified"
          trend="Credits Awarded"
          trendIcon="check"
          value="58"
          badgeText="Concluded"
          title="Successfully Completed"
          subtitle="Verified Certificates Issued"
        />
        <KpiCard
          variant="blue"
          icon="attach_money"
          trend="Max ₹50k (Samsung)"
          trendIcon="trending_up"
          value="₹32,500"
          badgeText="Avg"
          title="Average Monthly Stipend"
          subtitle="Direct Corporate Payout"
        />
      </div>

      {/* 4. Filter Pills */}
      <FilterPills
        pills={filterPills}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
      />

      {/* 5. Main Internship Records List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredInternships.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-2xl p-5 bg-white border border-border-subtle shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            {/* Specular highlight */}
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-tint-blue text-info-blue flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200/60 shadow-xs">
                    {item.studentName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="font-bold text-base text-text-primary group-hover:text-primary transition-colors truncate">
                      {item.studentName}
                    </h3>
                    <span className="text-xs text-text-secondary font-mono">
                      {item.roll}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    item.status === 'Completed'
                      ? 'bg-tint-green text-success-green border border-emerald-200/60'
                      : item.status.includes('Risk')
                      ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              {/* Company & Role details */}
              <div className="mt-4 p-3 rounded-xl bg-surface-container-low/70 border border-border-subtle space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">Visiting Employer</span>
                  <span className="font-bold text-text-primary">{item.company}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">Assigned Role</span>
                  <span className="font-semibold text-text-primary">{item.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">Monthly Stipend</span>
                  <span className="font-bold text-primary">{item.stipend}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-medium">Faculty Mentor</span>
                  <span className="font-semibold text-text-primary truncate max-w-[180px]">
                    {item.mentor}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">Internship Progress</span>
                  <span className="font-bold text-text-primary">{item.progress}% Concluded</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-surface-container-low overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.progress === 100
                        ? 'bg-success-green'
                        : item.progress < 60
                        ? 'bg-rose-500'
                        : 'bg-primary'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
              <span className="text-text-secondary font-mono text-[11px]">
                {item.duration}
              </span>
              <button
                onClick={() => setSelectedInternship(item)}
                className="font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>Certificate &amp; Logs</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Internship Evaluation & Certificate Modal */}
      {selectedInternship && (
        <Modal
          isOpen={!!selectedInternship}
          onClose={() => setSelectedInternship(null)}
          title={`Internship Evaluation: ${selectedInternship.studentName}`}
          subtitle={`${selectedInternship.company} • ${selectedInternship.role}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#15151F] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Progress Completion</span>
                <h4 className="text-xl font-extrabold text-[#FFDF9B]">
                  {selectedInternship.progress}% Concluded
                </h4>
                <p className="text-xs text-gray-300 mt-0.5">{selectedInternship.duration}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase font-bold">Stipend Verified</span>
                <h4 className="text-base font-bold text-success-green">{selectedInternship.stipend}</h4>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low border border-border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-semibold">Faculty Mentor Guide:</span>
                <span className="font-bold text-text-primary">{selectedInternship.mentor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-semibold">Certificate Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    selectedInternship.certificateVerified
                      ? 'bg-tint-green text-success-green'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedInternship.certificateVerified ? 'Cryptographically Sealed' : 'Pending Mentor Review'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary font-semibold">Verification Hash:</span>
                <span className="font-mono text-text-primary text-[11px]">{selectedInternship.certificateHash}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setSelectedInternship(null)}
                className="px-4 py-2 rounded-xl text-text-secondary hover:bg-surface-container-low"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`Dispatched verified completion certificate for ${selectedInternship.studentName}!`);
                  setSelectedInternship(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold shadow-sm"
              >
                Approve &amp; Issue Final Credits
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Internship Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Industrial Internship"
        subtitle="Map a student to corporate internship and faculty supervisor."
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-text-primary mb-1">Scholar Name</label>
              <input
                type="text"
                required
                value={newInternship.studentName}
                onChange={(e) => setNewInternship({ ...newInternship, studentName: e.target.value })}
                placeholder="e.g. Manpreet Kaur"
                className="w-full h-10 px-3 rounded-xl border border-border-subtle focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-text-primary mb-1">Roll Number</label>
              <input
                type="text"
                value={newInternship.roll}
                onChange={(e) => setNewInternship({ ...newInternship, roll: e.target.value })}
                placeholder="RIMT-21-CSE-210"
                className="w-full h-10 px-3 rounded-xl border border-border-subtle focus:border-primary focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-text-primary mb-1">Hiring Organization</label>
              <input
                type="text"
                required
                value={newInternship.company}
                onChange={(e) => setNewInternship({ ...newInternship, company: e.target.value })}
                placeholder="e.g. Microsoft IDC"
                className="w-full h-10 px-3 rounded-xl border border-border-subtle focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-text-primary mb-1">Monthly Stipend</label>
              <input
                type="text"
                value={newInternship.stipend}
                onChange={(e) => setNewInternship({ ...newInternship, stipend: e.target.value })}
                placeholder="₹40,000 / month"
                className="w-full h-10 px-3 rounded-xl border border-border-subtle focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-text-primary mb-1">Designated Faculty Mentor</label>
            <input
              type="text"
              value={newInternship.mentor}
              onChange={(e) => setNewInternship({ ...newInternship, mentor: e.target.value })}
              placeholder="Prof. J. K. Singla"
              className="w-full h-10 px-3 rounded-xl border border-border-subtle focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="px-4 py-2 rounded-xl text-text-secondary hover:bg-surface-container-low"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold shadow-md hover:shadow-lg transition-transform hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #8B1D2C 0%, #6E1521 100%)' }}
            >
              Register &amp; Map Mentor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
