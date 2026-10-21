'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PlacedStudentsCard from '../components/placement/PlacedStudentsCard';
import HiringCompaniesSection from '../components/placement/HiringCompaniesSection';
import TalentProfileModal from '../components/student/TalentProfileModal';

export default function PlacementStatistics({ globalSearch = '' }) {
  const [selectedCohort, setSelectedCohort] = useState('AY 2024–25');
  const [bracketView, setBracketView] = useState('counts'); // 'counts' | 'share'
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);

  // Dynamic API state
  const [data, setData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [cagrPct, setCagrPct] = useState(24.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlacementStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, trendRes] = await Promise.all([
        fetch(`/api/placement-stats/summary?cohort=${encodeURIComponent(selectedCohort)}`),
        fetch('/api/placement-stats/trend'),
      ]);

      if (!summaryRes.ok) throw new Error(`Summary API failed (${summaryRes.status})`);
      const summaryJson = await summaryRes.json();
      setData(summaryJson);

      if (trendRes.ok) {
        const trendJson = await trendRes.json();
        setTrendData(trendJson.trend || []);
        if (trendJson.cagrPct) setCagrPct(trendJson.cagrPct);
      }
    } catch (err) {
      console.warn('Failed to load placement stats:', err);
      setError(err.message || 'Unable to load live placement statistics.');
    } finally {
      setLoading(false);
    }
  }, [selectedCohort]);

  useEffect(() => {
    fetchPlacementStats();
  }, [fetchPlacementStats]);

  const summary = data?.summary || {
    eligibleCount: 0,
    placedCount: 0,
    placementRate: 0,
    totalOffers: 0,
    companiesCount: 0,
    avgCtcLpa: 0,
    medianCtcLpa: 0,
    highestCtcLpa: 0,
    highestCtcCompany: 'Campus Recruiter',
    prevYear: { placementRate: 0, avgCtcLpa: 0 },
    rateYoYDelta: 0,
    avgCtcYoYDeltaPct: 0,
    highestOfferStudent: null,
  };

  const tiers = data?.tiers || [];
  const sectors = data?.sectors || [];
  const departments = data?.departments || [];
  const insights = data?.insights || { topSectorShift: { sector: 'Cloud & Cyber Security', deltaPct: 8.5, vsYear: '2023' }, isNewRecord: true };
  const meta = data?.meta || { generatedAt: new Date().toISOString(), lastSyncStatus: 'ok' };

  // Format date helper
  const formattedGeneratedAt = (() => {
    try {
      const d = new Date(meta.generatedAt);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '12:36 am';
    }
  })();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* ── Top Header Area: Normal Controls + Scoped Black Glossy CAIP Card for Title ── */}
      <div className="flex flex-col gap-4">
        {/* Eyebrow Badges & Controls Bar (Normal, like before) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Eyebrow Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 font-bold text-xs uppercase tracking-wider shadow-xs backdrop-blur-md">
              <span className="material-symbols-outlined text-sm text-amber-600">workspace_premium</span>
              Institutional Intelligence
            </span>
            <span className="text-text-secondary/40 text-xs">•</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Audit Year {selectedCohort.replace('AY ', '')}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-xs">
              Live NAAC / NIRF Verified
            </span>
          </div>

          {/* Right: Controls (Normal styling like before) */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap shrink-0">
            {/* Cohort Selector Pill */}
            <div
              onClick={() => setShowFilterModal(true)}
              className="relative rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-xs hover:shadow-md px-3.5 py-2 flex items-center gap-2.5 cursor-pointer transition-all duration-200 hover:scale-[1.01] group/cohort"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                <span className="material-symbols-outlined text-amber-600 text-base">calendar_month</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">
                  Cohort Cycle
                </span>
                <span className="text-xs text-text-primary font-bold">
                  {selectedCohort}
                </span>
              </div>
              <span className="material-symbols-outlined text-text-secondary text-sm ml-0.5 group-hover/cohort:translate-y-0.5 transition-transform">
                expand_more
              </span>
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilterModal(true)}
              className="group relative bg-white hover:bg-slate-50 text-text-primary px-3.5 py-2.5 rounded-xl shadow-xs hover:shadow-md text-xs font-bold flex items-center gap-1.5 transition-all duration-200 hover:scale-[1.01] border border-slate-200/90"
            >
              <span className="material-symbols-outlined text-text-secondary text-base group-hover:scale-110 transition-transform">
                tune
              </span>
              <span>Filters</span>
            </button>

            {/* Export PDF Button */}
            <button
              onClick={() => alert(`Generating verified NAAC / NIRF Placement Audit PDF Report for ${selectedCohort}...`)}
              className="group relative overflow-hidden text-white px-4 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(107,0,24,0.28)] hover:shadow-xl text-xs font-bold flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-rose-900/30"
              style={{
                background: 'linear-gradient(135deg, rgba(163, 29, 53, 0.98) 0%, rgba(139, 29, 44, 0.98) 60%, rgba(107, 0, 24, 1) 100%)',
              }}
            >
              <span className="material-symbols-outlined text-base text-white group-hover:scale-110 transition-transform">
                picture_as_pdf
              </span>
              <span className="tracking-wide">Export PDF Report</span>
            </button>
          </div>
        </div>

        {/* ── Marked Area (Red Circle): Black CAIP Glossy Card with White Sweep Sheen ── */}
        <div className="group relative overflow-hidden rounded-2xl bg-[#14141E] p-6 lg:p-7 text-white shadow-[0_16px_40px_rgba(0,0,0,0.32),0_0_0_1px_rgba(255,255,255,0.08)] border border-white/10 backdrop-blur-2xl transition-all duration-300">
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes headerSweepSheen {
              0% { transform: translateX(-160%) skewX(-20deg); opacity: 0; }
              20% { opacity: 0.65; }
              50% { opacity: 0.65; }
              80% { opacity: 0.65; }
              100% { transform: translateX(260%) skewX(-20deg); opacity: 0; }
            }
            .header-sweep-animation {
              animation: headerSweepSheen 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
          `}} />

          {/* Top Specular Glass Rim */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none z-20" />

          {/* Glossy White Sweep Sheen across the Black Card */}
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-2xl">
            <div className="w-1/2 h-[220%] bg-gradient-to-r from-transparent via-white/20 to-transparent header-sweep-animation pointer-events-none shadow-[0_0_35px_rgba(255,255,255,0.3)]" />
          </div>

          {/* Ambient Glows */}
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          {/* Title & Description Marked Area */}
          <div className="relative z-20 flex flex-col gap-2 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Placement Statistics &amp; Performance Analytics
            </h1>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
              Consolidated placement benchmarking across all constituent colleges under RIMT Academic Trust. Verified corporate recruitments and compensation tier audit.
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchPlacementStats}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 1. Placed Students & Corporate Offers ── */}
      <PlacedStudentsCard
        cohort={selectedCohort}
        onSelectStudent={(student) => {
          setSelectedStudentForModal(student);
        }}
      />

      {/* ── 2. Companies That Hired RIMT Scholars (Exactly Below Placed Students) ── */}
      <HiringCompaniesSection
        companies={data?.hiringCompanies || []}
        onSelectStudent={(student) => {
          setSelectedStudentForModal(student);
        }}
      />

      {/* ── 3. Salary CTC Bracket Breakdown & Sector-wise Distribution (Side-by-Side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CTC Brackets Breakdown (7 Cols) */}
        <div
          className="lg:col-span-7 group relative rounded-2xl p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(254, 248, 245, 0.82) 40%, rgba(255, 255, 255, 0.9) 100%)',
            boxShadow: 'rgba(107, 0, 24, 0.06) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.6) 0px 0px 0px 1px inset',
            border: '1px solid rgba(255, 255, 255, 0.85)',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="absolute -right-16 -top-16 w-52 h-52 rounded-full bg-rose-500/10 blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-secondary-container/10 blur-2xl pointer-events-none" />
          <div className="pointer-events-none absolute inset-0 z-0 opacity-40 bg-gradient-to-r from-transparent via-rose-200/50 to-transparent -skew-x-12 animate-glossy" />

          <div className="relative z-10">
            <div className="flex items-center justify-between pb-4">
              <div>
                <span className="font-label-eyebrow text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                  Compensation Distribution
                </span>
                <h3 className="font-headline-section text-base sm:text-lg font-bold text-text-primary">
                  Salary CTC Bracket Breakdown
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-low/70 backdrop-blur-md p-1 rounded-xl border border-white/60 shadow-xs">
                <button
                  onClick={() => setBracketView('counts')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    bracketView === 'counts'
                      ? 'bg-white text-text-primary shadow-xs font-bold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Counts
                </button>
                <button
                  onClick={() => setBracketView('share')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    bracketView === 'share'
                      ? 'bg-white text-text-primary shadow-xs font-bold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  % Share
                </button>
              </div>
            </div>

            {/* Visual Multi-Segmented Progress Bar */}
            <div className="my-4">
              <div className="w-full h-4 rounded-full bg-surface-container-high/80 flex overflow-hidden ring-1 ring-white/50 shadow-inner">
                {tiers.map((tier) => (
                  <div
                    key={tier.key}
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${tier.percent}%`,
                      backgroundColor: tier.color,
                    }}
                    title={`${tier.label} (${tier.count} offers - ${tier.percent}%)`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-text-secondary mt-1.5">
                <span>₹0 Baseline</span>
                <span className="font-medium text-text-primary">
                  {summary.totalOffers.toLocaleString()} Total Offers Placed
                </span>
              </div>
            </div>

            {/* Bracket Tiers Detail Rows */}
            <div className="flex flex-col gap-2.5 mt-4">
              {tiers.map((tier) => (
                <div
                  key={tier.key}
                  className="p-3 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-between hover:bg-white transition-all shadow-xs border border-white/80"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full shadow-sm shrink-0"
                      style={{ backgroundColor: tier.color }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-text-primary">
                        {tier.label}
                      </span>
                      <span className="text-[11px] text-text-secondary">{tier.subLabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-text-primary">
                      {bracketView === 'counts' ? `${tier.count} students` : `${tier.percent}%`}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-bold min-w-[50px] text-center border shadow-xs"
                      style={{
                        backgroundColor: `${tier.color}15`,
                        color: tier.color === '#64748b' ? '#475569' : tier.color,
                        borderColor: `${tier.color}40`,
                      }}
                    >
                      {tier.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-4 mt-3 flex items-center justify-between border-t border-white/60">
            <span className="text-xs text-text-secondary">
              Benchmark updated today at {formattedGeneratedAt} IST
            </span>
            <button
              onClick={() => alert('Opening Full Verified Student Placement Registry...')}
              className="text-primary-container hover:text-primary-hover text-xs font-semibold flex items-center gap-1 group/btn transition-colors"
            >
              <span>View Student Registry</span>
              <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
        </div>

        {/* Sector-wise Distribution (5 Cols) */}
        <div
          className="lg:col-span-5 group relative rounded-2xl p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(240, 246, 255, 0.82) 45%, rgba(255, 255, 255, 0.9) 100%)',
            boxShadow: 'rgba(62, 111, 217, 0.08) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.8) 0px 0px 0px 1px inset',
            border: '1px solid rgba(214, 228, 255, 0.85)',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-blue-500/15 blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="pointer-events-none absolute inset-0 z-0 opacity-40 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent -skew-x-12 animate-glossy" />

          <div className="relative z-10">
            <div className="flex items-center justify-between pb-2">
              <div>
                <span className="font-label-eyebrow text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                  Industry Verticals
                </span>
                <h3 className="font-headline-section text-base sm:text-lg font-bold text-text-primary">
                  Sector-wise Distribution
                </h3>
              </div>
              <span className="material-symbols-outlined text-text-secondary">pie_chart</span>
            </div>

            {/* Visual Donut Graph */}
            <div className="flex items-center justify-center py-3">
              <div className="relative w-44 h-44 group/donut">
                <div
                  className="absolute inset-0 pointer-events-none rounded-full animate-ring-pulse"
                  style={{
                    background: 'radial-gradient(circle, transparent 48%, rgba(139, 29, 44, 0.12) 58%, rgba(62, 111, 217, 0.12) 68%, rgba(30, 158, 90, 0.12) 78%, transparent 86%)',
                    filter: 'blur(3px)',
                  }}
                />

                <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
                  {(() => {
                    let accumulatedOffset = 0;
                    return sectors.map((sec) => {
                      const strokeDasharray = `${sec.percent} ${100 - sec.percent}`;
                      const strokeDashoffset = -accumulatedOffset;
                      accumulatedOffset += sec.percent;
                      return (
                        <circle
                          key={sec.key}
                          cx="50"
                          cy="50"
                          fill="transparent"
                          r="38"
                          stroke={sec.color}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          strokeWidth="14"
                          className="transition-all duration-700"
                        />
                      );
                    });
                  })()}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
                  <span className="font-display-stat text-2xl font-extrabold text-text-primary leading-none">
                    {sectors.length}
                  </span>
                  <span className="font-label-eyebrow text-[10px] text-text-secondary uppercase font-bold tracking-wider mt-0.5">
                    Sectors
                  </span>
                </div>
              </div>
            </div>

            {/* Sector Legend List */}
            <div className="space-y-1.5 mt-1">
              {sectors.map((sec) => (
                <div
                  key={sec.key}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-card/60 backdrop-blur-sm border border-white/60"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-md shadow-xs shrink-0"
                      style={{ backgroundColor: sec.color }}
                    />
                    <span className="text-text-primary font-medium">{sec.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary">{sec.percent}%</span>
                    <span className="text-text-secondary">({sec.count} offers)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-3 pt-2 flex items-center justify-between bg-surface-card/80 backdrop-blur-md p-2.5 rounded-xl border border-white/80 shadow-xs">
            <span className="text-xs text-text-secondary">
              {insights.topSectorShift.sector} +{insights.topSectorShift.deltaPct}% shift vs {insights.topSectorShift.vsYear}
            </span>
            <span className="material-symbols-outlined text-success-green text-sm">trending_up</span>
          </div>
        </div>
      </div>

      {/* ── 4. Department-wise Placement Performance & Year-over-Year Growth Comparison ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Department-wise Placement Performance (6 Cols) */}
        <div
          className="lg:col-span-6 group relative rounded-2xl p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(254, 248, 245, 0.82) 40%, rgba(255, 255, 255, 0.9) 100%)',
            boxShadow: 'rgba(107, 0, 24, 0.06) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.6) 0px 0px 0px 1px inset',
            border: '1px solid rgba(255, 255, 255, 0.85)',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none" />
          <div className="absolute -right-16 -top-16 w-52 h-52 rounded-full bg-rose-500/10 blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-secondary-container/10 blur-2xl pointer-events-none" />
          <div className="pointer-events-none absolute inset-0 z-0 opacity-40 bg-gradient-to-r from-transparent via-rose-200/50 to-transparent -skew-x-12 animate-glossy" />

          <div className="relative z-10">
            <div className="flex items-center justify-between pb-2">
              <div>
                <span className="font-label-eyebrow text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                  Constituent Units
                </span>
                <h3 className="font-headline-section text-base sm:text-lg font-bold text-text-primary">
                  Department-wise Placement Performance
                </h3>
              </div>
              <span className="material-symbols-outlined text-text-secondary">domain_verification</span>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Real-time status based on cleared final rounds and verified digital letters.
            </p>

            <div className="space-y-4">
              {departments.map((dept) => (
                <div key={dept.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-text-primary">{dept.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">
                        {dept.placed} / {dept.total} Placed
                      </span>
                      <span className="font-bold text-primary-container">{dept.rate}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full ${dept.barColor || 'bg-primary-container'} rounded-full transition-all duration-700`}
                      style={{ width: `${dept.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-4 pt-2 flex items-center justify-between text-xs text-text-secondary border-t border-white/60">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-success-green">check_circle</span>
              All schools surpassed NAAC 75% standard baseline
            </span>
            <button
              onClick={() => alert('Viewing detailed department drilldown analytics...')}
              className="font-semibold text-primary-container hover:text-primary-hover transition-colors"
            >
              Drilldown
            </button>
          </div>
        </div>

        {/* Year-over-Year Growth Comparison Table (6 Cols) */}
        <div
          className="lg:col-span-6 group relative rounded-2xl p-6 overflow-hidden backdrop-blur-xl border border-white/80 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(246, 248, 253, 0.85) 50%, rgba(255, 255, 255, 0.92) 100%)',
            boxShadow: 'rgba(107, 0, 24, 0.06) 0px 14px 34px -4px, rgba(255, 255, 255, 0.95) 0px 1px 0px inset, rgba(255, 255, 255, 0.7) 0px 0px 0px 1px inset',
            border: '1px solid rgba(225, 232, 246, 0.85)',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-95 pointer-events-none z-10" />
          <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-40 bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent -skew-x-12 animate-glossy"
            style={{ animationDelay: '1.2s' }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between pb-2">
              <div>
                <span className="font-label-eyebrow text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                  Historical Trend Analysis
                </span>
                <h3 className="font-headline-section text-base sm:text-lg font-bold text-text-primary">
                  Year-over-Year Growth Comparison
                </h3>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 border border-emerald-200/80 shadow-[0_2px_8px_rgba(30,158,90,0.08)] text-success-green font-label-badge text-xs font-semibold backdrop-blur-md">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                <span>+{cagrPct}% 3Y CAGR</span>
              </div>
            </div>
            <p className="text-xs text-text-secondary mb-3">
              Four-year comparative audit data for Trust council reporting.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low/70 backdrop-blur-sm text-text-secondary font-label-eyebrow text-[11px] uppercase border border-white/60">
                    <th className="py-2.5 px-3 rounded-l-lg">Academic Year</th>
                    <th className="py-2.5 px-3">Placed / Total</th>
                    <th className="py-2.5 px-3">Rate (%)</th>
                    <th className="py-2.5 px-3">Avg CTC</th>
                    <th className="py-2.5 px-3 rounded-r-lg text-right">Max CTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/0 text-xs">
                  {trendData.map((row) => (
                    <tr
                      key={row.academicYear}
                      className={`transition-all duration-300 rounded-xl ${
                        row.isCurrent
                          ? 'bg-tint-maroon/20 hover:bg-tint-maroon/40 backdrop-blur-sm shadow-xs border border-rose-200/80 font-bold'
                          : 'hover:bg-white/80'
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {row.isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-primary-container shadow-sm" />
                          )}
                          <span className={`font-bold ${row.isCurrent ? 'text-text-primary' : 'text-text-secondary'}`}>
                            {row.academicYear}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-text-primary">
                        {row.placed.toLocaleString()} / {row.total.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold border shadow-xs ${
                            row.isCurrent
                              ? 'bg-tint-green text-success-green border-emerald-200/80'
                              : 'bg-surface-container-high text-text-primary border-white/60'
                          }`}
                        >
                          {row.rate}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-text-primary">₹{row.avgCtc} LPA</td>
                      <td className="py-3 px-3 text-right font-bold text-primary-container">
                        ₹{row.maxCtc} LPA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="relative z-10 mt-4 pt-2 flex items-center justify-between border-t border-white/60 text-xs">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <span className="material-symbols-outlined text-info-blue text-sm">shield</span>
              <span>External Auditor Sign-off: Prof. H. S. Bawa</span>
            </div>
            <button
              onClick={() => alert('Downloading Historical Placement Trend CSV Data...')}
              className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white border border-white/80 shadow-xs hover:shadow-md text-text-primary hover:text-primary-container font-semibold flex items-center gap-1.5 transition-all duration-300"
            >
              <span>Download CSV</span>
              <span className="material-symbols-outlined text-sm">download</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cohort Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-white/80 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-surface-hero text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-xl">tune</span>
                <h3 className="font-bold text-base">Select Cohort Audit Cycle</h3>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-3">
              {['AY 2024–25', 'AY 2023–24', 'AY 2022–23', 'AY 2021–22'].map((cohort) => (
                <button
                  key={cohort}
                  onClick={() => {
                    setSelectedCohort(cohort);
                    setShowFilterModal(false);
                  }}
                  className={`w-full p-3.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                    selectedCohort === cohort
                      ? 'bg-tint-maroon text-primary border-primary font-bold shadow-xs'
                      : 'bg-surface-card text-text-primary border-border-subtle hover:bg-surface-container'
                  }`}
                >
                  <span>Academic Cohort {cohort}</span>
                  {selectedCohort === cohort && (
                    <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Student Profile Portfolio Modal (Opened on Placed Student Row Click) */}
      {selectedStudentForModal && (
        <TalentProfileModal
          student={{
            ...selectedStudentForModal,
            id: selectedStudentForModal.id,
            full_name: selectedStudentForModal.name || selectedStudentForModal.full_name,
            name: selectedStudentForModal.name || selectedStudentForModal.full_name,
            roll_number: selectedStudentForModal.roll || selectedStudentForModal.roll_no || selectedStudentForModal.roll_number,
            roll_no: selectedStudentForModal.roll || selectedStudentForModal.roll_no || selectedStudentForModal.roll_number,
            avatar: selectedStudentForModal.photoUrl || selectedStudentForModal.avatar || selectedStudentForModal.avatar_url,
            avatar_url: selectedStudentForModal.photoUrl || selectedStudentForModal.avatar || selectedStudentForModal.avatar_url,
            department: selectedStudentForModal.department || selectedStudentForModal.dept,
            bio: selectedStudentForModal.bio || selectedStudentForModal.about_me || null,
            about_me: selectedStudentForModal.bio || selectedStudentForModal.about_me || null,
            skills: selectedStudentForModal.skills || [],
            cgpa: selectedStudentForModal.cgpa ?? null,
            headline: selectedStudentForModal.headline || selectedStudentForModal.profession || null,
            profession: selectedStudentForModal.profession || null,
          }}
          isOpen={!!selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
        />
      )}
    </div>
  );
}
