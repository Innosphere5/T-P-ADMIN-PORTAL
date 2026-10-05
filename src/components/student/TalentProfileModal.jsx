'use client';

import React, { useState, useEffect, useRef } from 'react';

/* ══════════════════════════════════════════════════════════════
   TalentProfileModal — Read-Only Student Portfolio Viewer
   Designed for Corporate Recruiters browsing RIMT Talent Showcase
   ══════════════════════════════════════════════════════════════ */

/* ── Helpers ── */
function parseJsonField(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) return p;
    } catch { /* fallback */ }
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function getInitials(name) {
  return (name || '')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/* ── Profile Strength ── */
function computeStrength(d) {
  let s = 0;
  if (d.bio || d.about_me) s += 15;
  if (d.headline) s += 10;
  if (d.avatar_url) s += 10;
  const skills = parseJsonField(d.skills);
  if (skills.length >= 2) s += 15;
  else if (skills.length === 1) s += 8;
  const projects = parseJsonField(d.projects);
  if (projects.length >= 2) s += 20;
  else if (projects.length === 1) s += 14;
  const certs = parseJsonField(d.documents || d.certificates);
  if (certs.length >= 1) s += 15;
  const internships = parseJsonField(d.internships);
  if (internships.length >= 1) s += 15;
  return { pct: s, skills, projects, certs, internships };
}

function strengthMeta(pct) {
  if (pct >= 85) return { label: 'Exceptional', gradient: 'from-emerald-500 to-teal-400', text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
  if (pct >= 65) return { label: 'Strong', gradient: 'from-blue-500 to-indigo-400', text: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' };
  if (pct >= 45) return { label: 'Developing', gradient: 'from-amber-500 to-orange-400', text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' };
  return { label: 'Starter', gradient: 'from-slate-400 to-slate-300', text: 'text-slate-600', bg: 'bg-slate-50', dot: 'bg-slate-400' };
}

/* ── Skill Color Palette (deterministic by name) ── */
const SKILL_PALETTES = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/70' },
  { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200/70' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/70' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/70' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/70' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200/70' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200/70' },
  { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200/70' },
];
function skillPalette(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return SKILL_PALETTES[Math.abs(h) % SKILL_PALETTES.length];
}

/* ═══════════════════════════════════════════
   SECTION COMPONENTS
   ═══════════════════════════════════════════ */

function SectionHeader({ icon, title, count, children }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px] text-slate-600">{icon}</span>
        </div>
        <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">{title}</h3>
        {count !== undefined && (
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SectionCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
        border: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
    >
      {children}
    </div>
  );
}

/* ── About Section ── */
function AboutSection({ bio, aboutMe }) {
  const text = bio || aboutMe;
  return (
    <SectionCard>
      <SectionHeader icon="person" title="About" />
      {text ? (
        <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">{text}</p>
      ) : (
        <p className="text-[13px] text-slate-400 italic">No summary bio provided yet.</p>
      )}
    </SectionCard>
  );
}

/* ── Skills Section ── */
function SkillsSection({ skills }) {
  const hasSkills = skills && skills.length > 0;
  return (
    <SectionCard>
      <SectionHeader icon="code" title="Tech Stack &amp; Skills" count={hasSkills ? skills.length : 0} />
      {hasSkills ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, i) => {
            const name = typeof skill === 'string' ? skill : skill?.name || '';
            if (!name) return null;
            const p = skillPalette(name);
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-transform duration-200 hover:scale-105 ${p.bg} ${p.text} ${p.border}`}
              >
                {name}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="py-4 text-center text-slate-400 text-xs">
          No technical skills listed yet.
        </div>
      )}
    </SectionCard>
  );
}

/* ── Projects Section (GitHub-Style) ── */
function ProjectsSection({ projects }) {
  const hasProjects = projects && projects.length > 0;
  return (
    <SectionCard>
      <SectionHeader icon="folder_open" title="Projects" count={hasProjects ? projects.length : 0} />
      {!hasProjects ? (
        <div className="py-4 text-center text-slate-400 text-xs">
          No featured projects uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
        {projects.map((proj, i) => {
          const title = proj.title || 'Untitled Project';
          const desc = proj.description || proj.about || '';
          const tags = parseJsonField(proj.tech_stack || proj.tags);
          const github = proj.github_url || proj.githubUrl;
          const live = proj.live_url || proj.liveUrl;
          const logo = proj.logo_url || proj.logoUrl;
          const category = proj.category || proj.categoryLabel || '';
          const status = proj.status || '';

          return (
            <div
              key={proj.id || i}
              className="group rounded-xl p-4 transition-all duration-200 hover:shadow-md"
              style={{
                background: 'linear-gradient(135deg, rgba(248,250,252,0.8) 0%, rgba(241,245,249,0.6) 100%)',
                border: '1px solid rgba(226,232,240,0.7)',
              }}
            >
              <div className="flex items-start gap-3">
                {/* Project Icon/Logo */}
                {logo ? (
                  <img src={logo} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-[18px]">terminal</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* Title Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[14px] font-bold text-slate-800 leading-snug">{title}</h4>
                    {status && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {status}
                      </span>
                    )}
                  </div>

                  {/* Category */}
                  {category && (
                    <span className="text-[11px] text-slate-400 font-medium">{category}</span>
                  )}

                  {/* Description */}
                  {desc && (
                    <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">{desc}</p>
                  )}

                  {/* Tech Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.slice(0, 8).map((t, j) => {
                        const tagName = typeof t === 'string' ? t : t?.name || '';
                        return (
                          <span key={j} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                            {tagName}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Links */}
                  {(github || live) && (
                    <div className="flex items-center gap-3 mt-2.5">
                      {github && (
                        <a
                          href={github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                          </svg>
                          Source Code
                        </a>
                      )}
                      {live && (
                        <a
                          href={live}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          Live Demo
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
    </SectionCard>
  );
}

/* ── Internships Section ── */
function InternshipsSection({ internships }) {
  if (!internships || internships.length === 0) return null;
  return (
    <SectionCard>
      <SectionHeader icon="work" title="Experience & Internships" count={internships.length} />
      <div className="space-y-0">
        {internships.map((item, i) => {
          const company = item.company || item.organization || 'Company';
          const role = item.role || item.position || item.title || 'Intern';
          const duration = item.duration || '';
          const desc = item.description || '';
          const certUrl = item.certificate_url || item.url || null;
          const initial = company.charAt(0).toUpperCase();

          return (
            <div key={item.id || i} className="relative flex gap-4 py-3.5">
              {/* Timeline Line */}
              {i < internships.length - 1 && (
                <div className="absolute left-[19px] top-[52px] bottom-0 w-px bg-slate-200" />
              )}
              {/* Company Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold shrink-0 border border-slate-200/70 z-10">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[14px] font-bold text-slate-800">{role}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[12px] font-semibold text-slate-600">{company}</span>
                  {duration && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] text-slate-400">{duration}</span>
                    </>
                  )}
                </div>
                {desc && (
                  <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed line-clamp-3">{desc}</p>
                )}
                {certUrl && (
                  <a
                    href={certUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    View Certificate
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ── Certificates Section ── */
function toCloudinaryImageUrl(url) {
  if (!url) return null;
  // Cloudinary can serve PDFs as images by changing the extension
  if (/res\.cloudinary\.com/.test(url) && /\.pdf(\?|$)/i.test(url)) {
    return url.replace(/\.pdf(\?|$)/i, '.jpg$1');
  }
  return url;
}

function CertificatesSection({ certificates }) {
  const hasCerts = certificates && certificates.length > 0;
  const [previewUrl, setPreviewUrl] = useState(null);

  return (
    <>
      <SectionCard>
        <SectionHeader icon="workspace_premium" title="Uploaded Certificates &amp; Documents" count={hasCerts ? certificates.length : 0} />
        {!hasCerts ? (
          <div className="py-4 text-center text-slate-400 text-xs">
            No verified certificates uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {certificates.map((cert, i) => {
            const title = cert.title || 'Certificate';
            const issuer = cert.issuer || '';
            const date = formatDate(cert.issue_date || cert.created_at);
            const credId = cert.credential_id || '';
            const rawUrl = cert.cloudinary_url || cert.url || null;

            // Convert Cloudinary PDF URLs to image URLs for rendering
            const displayUrl = toCloudinaryImageUrl(rawUrl);
            // Determine if we can display as an image
            const canShowAsImage = !!displayUrl;

            return (
              <div
                key={cert.id || i}
                className="group rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer"
                style={{
                  border: '1px solid rgba(226,232,240,0.8)',
                  background: '#fff',
                }}
                onClick={() => displayUrl && setPreviewUrl(displayUrl)}
              >
                {/* Certificate Image Preview */}
                {canShowAsImage ? (
                  <div className="relative w-full h-44 bg-slate-50 overflow-hidden">
                    <img
                      src={displayUrl}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        // If image fails, show fallback icon
                        e.target.style.display = 'none';
                        e.target.parentElement.classList.add('flex', 'items-center', 'justify-center');
                        const fallback = document.createElement('span');
                        fallback.className = 'material-symbols-outlined text-4xl text-amber-400';
                        fallback.style.fontVariationSettings = "'FILL' 1";
                        fallback.textContent = 'military_tech';
                        e.target.parentElement.appendChild(fallback);
                      }}
                    />
                    {/* Verified Badge */}
                    <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-md">
                      <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      VERIFIED
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                        zoom_in
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-32 bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                  </div>
                )}

                {/* Certificate Info */}
                <div className="p-3">
                  <h4 className="text-[13px] font-bold text-slate-800 leading-snug line-clamp-1">{title}</h4>
                  {issuer && <p className="text-[11px] text-slate-500 mt-0.5">{issuer}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    {credId && (
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">ID: {credId}</span>
                    )}
                    {date && <span className="text-[10px] text-slate-400">{date}</span>}
                  </div>
                  {displayUrl && (
                    <button
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(displayUrl); }}
                    >
                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                      View Certificate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </SectionCard>

      {/* Full-Screen Certificate Preview Overlay — always renders as <img> */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
            style={{ animation: 'modalSlideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <span className="text-[13px] font-bold text-slate-700">Certificate Preview</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  Open Original
                </a>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="w-8 h-8 rounded-full bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center border border-slate-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Content — always use <img> to avoid ACL/iframe issues */}
            <div className="flex items-center justify-center bg-slate-100 p-4" style={{ maxHeight: 'calc(90vh - 56px)', overflow: 'auto' }}>
              <img
                src={previewUrl}
                alt="Certificate"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Academics Quick Card ── */
function AcademicsCard({ data }) {
  const dept = data.department || data.course || '';
  const batch = data.current_semester || data.year_semester || data.batch || data.semester || '';
  const rollNo = data.roll_no || data.roll_number || data.roll || '';
  const hasCgpa = data.cgpa !== null && data.cgpa !== undefined && !isNaN(Number(data.cgpa));
  const hasAttendance = data.attendance_rate !== null && data.attendance_rate !== undefined && data.attendance_rate !== '';
  const hasStanding = !!data.academic_standing;
  const hasScore = data.academic_score !== null && data.academic_score !== undefined;

  const cgpa = hasCgpa ? Number(data.cgpa).toFixed(2) : '—';
  const attendance = hasAttendance
    ? (String(data.attendance_rate).includes('%') ? data.attendance_rate : `${data.attendance_rate}%`)
    : '—';

  return (
    <SectionCard>
      <SectionHeader icon="school" title="Academic Record" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-3 rounded-xl bg-slate-50/80 border border-slate-100">
          <div className="text-xl font-extrabold text-slate-800 tracking-tight">{cgpa}</div>
          <div className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">CGPA</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-slate-50/80 border border-slate-100">
          <div className="text-xl font-extrabold text-slate-800 tracking-tight">
            {hasScore ? `${Number(data.academic_score).toFixed(1)}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">Score</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-slate-50/80 border border-slate-100">
          <div className="text-xl font-extrabold text-slate-800 tracking-tight">{attendance}</div>
          <div className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">Attendance</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-slate-50/80 border border-slate-100">
          <div className="text-xl font-extrabold text-slate-800 tracking-tight truncate px-1">
            {batch || 'Current'}
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">Semester</div>
        </div>
      </div>
      {/* Institutional Details */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-slate-400">account_balance</span>
          <span className="font-semibold text-slate-700">RIMT University</span>
          {dept && <span>· {dept}</span>}
        </div>
        {rollNo && (
          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
            Roll: {rollNo}
          </span>
        )}
      </div>
      {hasStanding && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
          <span className="material-symbols-outlined text-emerald-600 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          <span className="text-[12px] font-semibold text-emerald-700">{data.academic_standing}</span>
        </div>
      )}
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════
   MAIN MODAL COMPONENT
   ═══════════════════════════════════════════ */
export default function TalentProfileModal({ student, isOpen, onClose }) {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('overview');
  const scrollRef = useRef(null);

  // Section refs for scroll-into-view
  const aboutRef = useRef(null);
  const skillsRef = useRef(null);
  const projectsRef = useRef(null);
  const internshipsRef = useRef(null);
  const certificatesRef = useRef(null);
  const academicsRef = useRef(null);

  // Stable student ref to avoid re-fetch on parent re-renders
  const studentRef = useRef(student);
  const studentId = student?.id || student?.roll || student?.roll_number || student?.roll_no || null;
  if (student) studentRef.current = student;

  /* ── Fetch Full Dossier — keyed on studentId, not the object ── */
  useEffect(() => {
    if (!isOpen || !studentId) {
      setDossier(null);
      setActiveNav('overview');
      return;
    }

    let mounted = true;
    setLoading(true);

    fetch(`/api/admin/requests/${studentId}`, {
      headers: {
        Authorization: 'Bearer rimt-admin-master-token',
        'x-admin-portal': 'true',
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted) return;
        setDossier(data?.dossier || studentRef.current);
      })
      .catch(() => {
        if (mounted) setDossier(studentRef.current);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [isOpen, studentId]);

  /* ── Lock body scroll ── */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEsc);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  /* ── Normalize Data ── */
  const d = dossier || student || {};
  const fullName = d.full_name || d.name || 'RIMT Scholar';
  const rollNo = d.roll_number || d.roll_no || d.roll || '—';
  const dept = d.department || d.course || '';
  const batch = d.year_semester || d.batch || d.semester || '';
  const headline = d.headline || (dept ? `${dept} Scholar · RIMT University` : 'RIMT University Scholar');
  const bio = d.bio || d.about_me || '';
  const email = d.email || '';
  const phone = d.phone || '';
  const avatarUrl = d.avatar_url || d.avatar || null;
  const bannerUrl = d.banner_url || d.banner || d.cover_url || null;
  const location = d.location || 'RIMT University, Mandi Gobindgarh, Punjab';

  const strength = computeStrength(d);
  const meta = strengthMeta(strength.pct);

  const hasInternships = strength.internships && strength.internships.length > 0;

  const navItems = [
    { id: 'overview', label: 'About', icon: 'person', ref: aboutRef },
    { id: 'skills', label: 'Skills', icon: 'code', ref: skillsRef },
    { id: 'projects', label: 'Projects', icon: 'folder_open', ref: projectsRef },
    ...(hasInternships ? [{ id: 'internships', label: 'Experience', icon: 'work', ref: internshipsRef }] : []),
    { id: 'certificates', label: 'Certificates', icon: 'workspace_premium', ref: certificatesRef },
    { id: 'academics', label: 'Academics', icon: 'school', ref: academicsRef },
  ];

  const isClickScrolling = useRef(false);
  const clickTimeoutRef = useRef(null);
  const tabsContainerRef = useRef(null);

  /* ── Scroll Spy: Automatically update active tab on scroll ── */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || loading) return;

    const handleScroll = () => {
      if (isClickScrolling.current) return;

      const containerRect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Bottom reached -> activate Academics (last tab)
      if (scrollTop + clientHeight >= scrollHeight - 35) {
        const last = navItems[navItems.length - 1];
        if (last && last.id !== activeNav) {
          setActiveNav(last.id);
        }
        return;
      }

      // Check each section position relative to container
      const threshold = 130;
      let currentSectionId = navItems[0]?.id || 'overview';

      for (let i = 0; i < navItems.length; i++) {
        const item = navItems[i];
        const el = item.ref?.current;
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const topRelativeToContainer = rect.top - containerRect.top;

        if (topRelativeToContainer <= threshold) {
          currentSectionId = item.id;
        }
      }

      setActiveNav((prev) => (prev !== currentSectionId ? currentSectionId : prev));
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [navItems, loading, activeNav]);

  /* ── Keep active tab in view horizontally ── */
  useEffect(() => {
    if (!tabsContainerRef.current) return;
    const btn = tabsContainerRef.current.querySelector(`[data-tab-id="${activeNav}"]`);
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeNav]);

  /* ── Scroll to section smoothly on click ── */
  const scrollToSection = (navId) => {
    setActiveNav(navId);
    isClickScrolling.current = true;
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 650);

    const refMap = {
      overview: aboutRef,
      skills: skillsRef,
      projects: projectsRef,
      internships: internshipsRef,
      certificates: certificatesRef,
      academics: academicsRef,
    };
    const target = refMap[navId]?.current;
    if (target && scrollRef.current) {
      const container = scrollRef.current;
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const relativeTop = targetRect.top - containerRect.top + container.scrollTop - 15;
      container.scrollTo({ top: Math.max(0, relativeTop), behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Modal Container */}
      <div
        className="relative z-10 w-full max-w-[760px] max-h-[92vh] mx-4 flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: '#f8f9fb',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)',
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* ── Inline Animation Keyframes ── */}
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(24px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          .talent-shimmer {
            background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0) 100%);
            background-size: 200% 100%;
            animation: shimmer 3s ease-in-out infinite;
          }
        `}</style>

        {/* ═══ HEADER: Banner + Avatar + Identity ═══ */}
        <div className="relative shrink-0">
          {/* Banner */}
          <div className="h-[135px] relative overflow-hidden">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'block';
                  }
                }}
              />
            ) : null}
            <div
              className={`w-full h-full relative ${bannerUrl ? 'hidden' : 'block'}`}
              style={{
                background: `
                  radial-gradient(120% 140% at 85% 0%, rgba(59,130,246,0.28) 0%, transparent 55%),
                  radial-gradient(90% 120% at 0% 100%, rgba(255,255,255,0.18) 0%, transparent 60%),
                  linear-gradient(135deg, #8A1228 0%, #A31D35 55%, #6E0E20 100%)
                `,
              }}
            >
              {/* Subtle inner sheen */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/15 pointer-events-none" />
            </div>

            {/* Subtle shine */}
            <div className="talent-shimmer absolute inset-0 pointer-events-none" />
            {/* Gradient Fade */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#f8f9fb] to-transparent pointer-events-none" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/30 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/50 flex items-center justify-center transition-all z-20"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>

          {/* Avatar + Identity (overlapping banner) */}
          <div className="relative px-6 -mt-14 z-10 flex items-end gap-4">
            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="w-24 h-24 rounded-2xl object-cover border-[4px] border-[#f8f9fb] shadow-lg shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#8B1D2C] to-[#6E1521] flex items-center justify-center text-white text-2xl font-bold border-[4px] border-[#f8f9fb] shadow-lg shrink-0">
                {getInitials(fullName)}
              </div>
            )}

            {/* Name + Headline */}
            <div className="pb-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[20px] font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                  {fullName}
                </h2>
                {strength.pct >= 65 && (
                  <span
                    className="material-symbols-outlined text-blue-500 text-lg"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    title="Verified strong profile"
                  >
                    verified
                  </span>
                )}
              </div>
              <p className="text-[13px] text-slate-500 mt-0.5 leading-snug truncate">{headline}</p>
            </div>
          </div>

          {/* Meta Row: Roll, Dept, Location, Strength */}
          <div className="px-6 mt-3 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-slate-200/80">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <span className="material-symbols-outlined text-[14px] text-slate-400">badge</span>
              {rollNo}
            </span>
            {dept && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <span className="material-symbols-outlined text-[14px] text-slate-400">school</span>
                {dept}
              </span>
            )}
            {batch && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <span className="material-symbols-outlined text-[14px] text-slate-400">calendar_today</span>
                {batch}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
              RIMT University, Punjab
            </span>

            {/* Profile Strength Pill */}
            <div className="ml-auto flex items-center gap-2">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${meta.bg} ${meta.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                {strength.pct}% · {meta.label}
              </div>
            </div>
          </div>

          {/* ── Section Nav Tabs ── */}
          <div
            ref={tabsContainerRef}
            className="px-6 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2 border-b border-slate-200/60 bg-white/70 backdrop-blur-md"
          >
            {navItems.map((nav) => {
              const isActive = activeNav === nav.id;
              return (
                <button
                  key={nav.id}
                  data-tab-id={nav.id}
                  onClick={() => scrollToSection(nav.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all duration-200 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A31D35] focus-visible:ring-offset-2 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-500 hover:text-[#A31D35] hover:bg-[#FDECEF]'
                  }`}
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(135deg, #A31D35 0%, #8A1228 100%)',
                          boxShadow: '0 8px 20px -6px rgba(138, 18, 40, .55), inset 0 1px 0 rgba(255, 255, 255, .35)',
                        }
                      : {}
                  }
                >
                  <span
                    className={`material-symbols-outlined text-[15px] transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#A31D35]'
                    }`}
                  >
                    {nav.icon}
                  </span>
                  <span>{nav.label}</span>
                </button>
              );
            })}

            {/* Contact buttons on the right */}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-[14px]">mail</span>
                  Email
                </a>
              )}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-[14px]">call</span>
                  Call
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ═══ SCROLLABLE CONTENT BODY ═══ */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-slate-700 animate-spin" />
              <p className="text-[13px] text-slate-400 font-medium">Loading full profile...</p>
            </div>
          )}

          {/* Content Sections */}
          {!loading && (
            <div className="px-6 py-5 space-y-4">

              {/* Profile Strength Visual */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
                  border: '1px solid rgba(226,232,240,0.8)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Profile Readiness</span>
                  <span className={`text-[13px] font-extrabold ${meta.text}`}>{strength.pct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${meta.gradient} transition-all duration-1000 ease-out`}
                    style={{ width: `${strength.pct}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                  {[
                    { label: 'Projects', count: strength.projects.length, icon: 'folder_open' },
                    { label: 'Skills', count: strength.skills.length, icon: 'code' },
                    { label: 'Internships', count: strength.internships.length, icon: 'work' },
                    { label: 'Certificates', count: strength.certs.length, icon: 'workspace_premium' },
                  ].map((item) => (
                    <span key={item.label} className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <span className="material-symbols-outlined text-[13px] text-slate-400">{item.icon}</span>
                      <span className="font-bold text-slate-700">{item.count}</span> {item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* About */}
              <div ref={aboutRef}>
                <AboutSection bio={d.bio} aboutMe={d.about_me} />
              </div>

              {/* Skills */}
              <div ref={skillsRef}>
                <SkillsSection skills={strength.skills} />
              </div>

              {/* Projects */}
              <div ref={projectsRef}>
                <ProjectsSection projects={strength.projects} />
              </div>

              {/* Internships (Experience) */}
              {hasInternships && (
                <div ref={internshipsRef}>
                  <InternshipsSection internships={strength.internships} />
                </div>
              )}

              {/* Certificates */}
              <div ref={certificatesRef}>
                <CertificatesSection certificates={strength.certs} />
              </div>

              {/* Academics */}
              <div ref={academicsRef}>
                <AcademicsCard data={d} />
              </div>

              {/* Footer */}
              <div className="text-center py-4 border-t border-slate-200/60">
                <p className="text-[11px] text-slate-400">
                  Profile curated by RIMT University Training & Placement Cell
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
