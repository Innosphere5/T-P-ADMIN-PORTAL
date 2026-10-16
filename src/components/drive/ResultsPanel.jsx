'use client';

import React, { useState, useEffect } from 'react';
import { fetchApprovedStudents } from '@/lib/driveClient';
import { generateResultsCsv } from '@/lib/driveUtils';

/**
 * ResultsPanel — Stage-wise candidate selection roster & results publishing
 */
export default function ResultsPanel({ drive, onUpdateResults, onTriggerNotify }) {
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStage, setSelectedStage] = useState('Final Selected / Offer');

  // Student search / select state
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkRollText, setBulkRollText] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkReport, setBulkReport] = useState(null);

  // Fetch approved students on mount
  useEffect(() => {
    let mounted = true;
    setLoadingStudents(true);
    fetchApprovedStudents()
      .then((data) => {
        if (mounted) {
          setApprovedStudents(data);
          setLoadingStudents(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingStudents(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const results = drive?.results || [];
  const currentStageRecord = results.find((r) => r.stage === selectedStage) || {
    stage: selectedStage,
    students: [],
    publishedAt: null,
  };
  const stageStudents = currentStageRecord.students || [];

  // Filtered approved students matching search
  const searchResults = approvedStudents.filter((st) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    const name = (st.name || st.full_name || '').toLowerCase();
    const roll = (st.roll_no || st.roll_number || '').toLowerCase();
    return name.includes(q) || roll.includes(q);
  });

  const handleAddStudent = (student) => {
    const roll = student.roll_no || student.roll_number;
    if (stageStudents.some((s) => (s.roll_no || s.roll_number) === roll)) {
      return; // Already in this stage
    }

    const updated = [
      ...stageStudents,
      {
        id: student.id,
        name: student.name || student.full_name,
        roll_no: roll,
        department: student.department || student.course || 'BCA',
        cgpa: student.cgpa || student.academic_score?.cgpa || null,
      },
    ];
    onUpdateResults(selectedStage, updated);
    setSearchQuery('');
  };

  const handleRemoveStudent = (roll) => {
    const updated = stageStudents.filter((s) => (s.roll_no || s.roll_number) !== roll);
    onUpdateResults(selectedStage, updated);
  };

  const handleBulkProcess = (e) => {
    e.preventDefault();
    if (!bulkRollText.trim()) return;

    const lines = bulkRollText
      .split(/[\n,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const matched = [];
    const notFound = [];
    const duplicates = [];

    const existingRolls = new Set(stageStudents.map((s) => (s.roll_no || s.roll_number || '').toUpperCase()));

    for (const roll of lines) {
      if (existingRolls.has(roll)) {
        duplicates.push(roll);
        continue;
      }
      const match = approvedStudents.find(
        (s) => (s.roll_no || s.roll_number || '').toUpperCase() === roll
      );
      if (match) {
        matched.push({
          id: match.id,
          name: match.name || match.full_name,
          roll_no: match.roll_no || match.roll_number,
          department: match.department || match.course || 'BCA',
          cgpa: match.cgpa || match.academic_score?.cgpa || null,
        });
        existingRolls.add(roll);
      } else {
        notFound.push(roll);
      }
    }

    setBulkReport({ matched: matched.length, notFound, duplicates });

    if (matched.length > 0) {
      onUpdateResults(selectedStage, [...stageStudents, ...matched]);
    }
  };

  const handleExportCsv = () => {
    const csvContent = generateResultsCsv(drive, selectedStage);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${drive.title}_${selectedStage}_Results.csv`.replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePublishResultsNotification = () => {
    if (stageStudents.length === 0) {
      alert('Please add at least one candidate before publishing results.');
      return;
    }

    onTriggerNotify({
      event: 'RESULTS_PUBLISHED',
      stage: selectedStage,
      audienceCount: stageStudents.length,
      defaultTitle: `Official Results Released: ${selectedStage} • ${drive.title}`,
      defaultBody: `Congratulations to all candidates. Official institutional outcomes for ${selectedStage} in ${drive.title} have been verified and released on the portal.`,
    });
  };

  const stagesList = ['Shortlisted', 'Round Cleared', 'Final Selected / Offer', 'Not Selected'];

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header & Stage Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex flex-col">
          <h4 className="text-sm font-bold text-text-primary">
            Official Placement Results &amp; Offer Roster
          </h4>
          <p className="text-xs text-text-secondary">
            Manage stage-wise student outcomes, shortlist selections, and letters of intent
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-white text-xs font-semibold text-text-primary hover:bg-surface-container shadow-2xs transition-colors"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePublishResultsNotification}
            disabled={stageStudents.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-white font-label-button text-xs font-semibold hover:bg-primary-hover shadow-xs transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-sm">send</span>
            <span>Publish Results &amp; Notify</span>
          </button>
        </div>
      </div>

      {/* Stage Selection Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {stagesList.map((stg) => {
          const rec = results.find((r) => r.stage === stg);
          const count = rec?.students?.length || 0;
          const isActive = selectedStage === stg;
          return (
            <button
              key={stg}
              onClick={() => {
                setSelectedStage(stg);
                setBulkReport(null);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-low text-text-secondary hover:text-text-primary border border-border-subtle'
              }`}
            >
              <span>{stg}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-surface-container text-text-secondary'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add Candidates Control: Search or Bulk Paste */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-text-primary uppercase tracking-wider">
            Add Candidates to &quot;{selectedStage}&quot;
          </span>

          <button
            onClick={() => setShowBulkPaste(!showBulkPaste)}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">
              {showBulkPaste ? 'search' : 'format_list_bulleted'}
            </span>
            <span>{showBulkPaste ? 'Switch to Name Search' : 'Bulk Roll Number Paste'}</span>
          </button>
        </div>

        {!showBulkPaste ? (
          /* Live Approved Student Search Picker */
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-base">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search approved students by scholar name or roll number..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-border-subtle text-xs text-text-primary outline-none focus:border-primary shadow-2xs"
            />

            {searchQuery && (
              <div className="absolute top-10 inset-x-0 bg-white rounded-xl shadow-xl border border-border-subtle max-h-56 overflow-y-auto z-20 flex flex-col divide-y divide-border-subtle">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-center text-xs text-text-secondary">
                    No approved student found matching &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  searchResults.slice(0, 10).map((st) => {
                    const roll = st.roll_no || st.roll_number;
                    const isAdded = stageStudents.some((s) => (s.roll_no || s.roll_number) === roll);
                    return (
                      <div
                        key={st.id}
                        className="p-2.5 px-3 flex items-center justify-between hover:bg-surface-container-low transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-text-primary">
                            {st.name || st.full_name}
                          </span>
                          <span className="text-[11px] text-text-secondary">
                            {roll} • {st.department || 'BCA'} {st.cgpa ? `• CGPA ${st.cgpa}` : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddStudent(st)}
                          disabled={isAdded}
                          className={`px-2.5 py-1 rounded text-xs font-semibold ${
                            isAdded
                              ? 'bg-surface-container text-text-secondary cursor-not-allowed'
                              : 'bg-primary text-white hover:bg-primary-hover shadow-2xs'
                          }`}
                        >
                          {isAdded ? 'Added' : '+ Add'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ) : (
          /* Bulk Roll Number Paste Box */
          <form onSubmit={handleBulkProcess} className="flex flex-col gap-2">
            <textarea
              rows={3}
              value={bulkRollText}
              onChange={(e) => setBulkRollText(e.target.value)}
              placeholder="Paste roll numbers separated by commas or line breaks: e.g. RIMT/22/BCA/0101, RIMT/22/BCA/0102..."
              className="w-full p-2.5 rounded-lg bg-white border border-border-subtle text-xs font-mono text-text-primary outline-none focus:border-primary"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-secondary">
                Matches against {approvedStudents.length} live approved student records
              </span>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-2xs"
              >
                Validate &amp; Add Candidates
              </button>
            </div>

            {bulkReport && (
              <div className="p-2.5 rounded-lg bg-white border border-border-subtle text-xs flex flex-col gap-1">
                <span className="font-bold text-success-green">
                  ✓ Successfully added {bulkReport.matched} student(s)
                </span>
                {bulkReport.notFound.length > 0 && (
                  <span className="text-primary font-medium">
                    ⚠ Not found in approved register ({bulkReport.notFound.length}):{' '}
                    {bulkReport.notFound.join(', ')}
                  </span>
                )}
                {bulkReport.duplicates.length > 0 && (
                  <span className="text-text-secondary">
                    ℹ Already in this stage: {bulkReport.duplicates.join(', ')}
                  </span>
                )}
              </div>
            )}
          </form>
        )}
      </div>

      {/* Selected Candidates Table */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-text-secondary px-1">
          <span className="font-semibold">
            {stageStudents.length} candidate(s) in {selectedStage}
          </span>
          {currentStageRecord.publishedAt && (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">verified</span>
              Published
            </span>
          )}
        </div>

        {stageStudents.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface-container-low border border-dashed border-border-subtle text-center flex flex-col items-center gap-1">
            <span className="material-symbols-outlined text-2xl text-text-secondary">person_search</span>
            <p className="text-xs font-semibold text-text-primary">No candidates placed in this stage yet</p>
            <p className="text-[11px] text-text-secondary">
              Use search or paste roll numbers above to populate the official outcome roster.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border-subtle overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low border-b border-border-subtle text-[11px] text-text-secondary uppercase font-bold">
                  <th className="p-3 pl-4">Scholar Name</th>
                  <th className="p-3">Roll Number</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Academic Score</th>
                  <th className="p-3 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {stageStudents.map((st, i) => {
                  const roll = st.roll_no || st.roll_number;
                  return (
                    <tr key={i} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="p-3 pl-4 font-bold text-text-primary">
                        {st.name || st.full_name}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-text-secondary">
                        {roll}
                      </td>
                      <td className="p-3 text-text-primary">{st.department || 'BCA'}</td>
                      <td className="p-3">
                        <span className="font-semibold text-text-primary">
                          {st.cgpa ? `CGPA ${st.cgpa}` : '—'}
                        </span>
                      </td>
                      <td className="p-3 text-right pr-4">
                        <button
                          onClick={() => handleRemoveStudent(roll)}
                          className="p-1 rounded hover:bg-rose-50 text-text-secondary hover:text-primary transition-colors"
                          title="Remove student"
                        >
                          <span className="material-symbols-outlined text-base">remove_circle_outline</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
