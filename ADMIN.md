# 🛡️ ADMIN.md — RIMT University Institutional Placement & Operations Portal

> **Single Source of Truth:** Master Memory, Architecture, Screens, Endpoints, and File Map for the entire RIMT Admin Portal & Integrated Student App.  
> **Last Updated:** 2026-10-20  
> **Role:** Senior Full-Stack & System Logic Engineer Specification  
> **Status:** Active; **Dual-Portal Auth (Admin + Company)** live, Role-Based Access Control enforced, **Zero-Irritation Refresh Animation Suppression** live (initial visit & login verification animation preserved, repeat browser reloads instantaneous), **Drive Management Overhaul** live (8-component suite, announcements, registration links, results, mobile push alerts, zero mock data), **Internship Opportunities & Live Monitoring Module Overhaul** live, Talent Showcase live, Cloudinary upload signing endpoint operational  

---

## ⚡ AGENT START HERE (Single-File Lookup Index)
> **Rule:** Read ONLY this block first. Open only the files named here. For details use `grep -n <keyword> ADMIN.md`. Never scan folders or open files that are not listed.
> **Maintenance:** Every change ends with an update to Section 3 (file tree), Section 10 (feature table), Section 11 (changelog) and the matching row of this table.

| To Change / Task | Exact File(s) | Key Identifiers / Classes / Exports |
|---|---|---|
| **Session Loader & Refresh Guard** | `src/components/common/SessionLoader.jsx`, `src/styles/globals.css`, `src/app/layout.jsx`, `src/components/auth/AuthGuard.jsx` | `MIN_LOADER_MS (1900)`, `FADE_MS (300)`, `rimt_loader_seen`, `data-rimt-loader="seen"`, `.rimt-loader`, `SessionLoader`, instant refresh hydration |
| **App Shell & Preloads** | `src/app/layout.jsx`, `src/app/loading.jsx` | `RootLayout`, `<link rel="preload" href="/rimt-logo.png">`, `Loading()` |
| **Authentication & Gate** | `src/components/auth/AuthGuard.jsx`, `src/components/auth/AuthScreen.jsx` | `AuthGuard`, `AuthScreen`, `sessionReady`, `minElapsed`, `isSameAdminAccount` |
| **Auth API & Endpoints** | `src/app/api/admin/auth/*`, `src/app/api/company/auth/*`, `src/lib/authApi.js` | `login/route.js`, `logout/route.js`, `me/route.js`, `withAuth` |
| **Drive Management Suite** | `src/views/DriveManagement.jsx`, `src/components/drive/*`, `src/lib/driveClient.js`, `src/lib/driveUtils.js`, `drive.md` | `DriveManagement`, `DriveFormModal`, `DriveDetailDrawer`, `AnnouncementsPanel`, `RegistrationLinksPanel`, `ResultsPanel`, `NotifyConfirmModal`, `StatusBadges` |
| **Database & Adapter** | `src/lib/db.js`, `src/lib/supabaseClient.js` | `getStudents`, `updateStudentDossier`, `getInternshipOpportunities`, Supabase client |
| **Navigation & Layout** | `src/components/Sidebar.jsx`, `src/components/Header.jsx`, `src/app/page.jsx` | `Sidebar`, `Header`, `companyAllowedModules`, `activeTab` |
| **Onboarding Approvals** | `src/views/OnboardingApprovals.jsx`, `src/app/api/admin/requests/[id]/*` | `OnboardingApprovals`, `approve/route.js`, `reject/route.js`, `revoke/route.js` |
| **Student Management** | `src/views/StudentManagement.jsx`, `src/components/student/StudentDossierModal.jsx` | `StudentManagement`, `StudentDossierModal`, academic metrics editor |
| **Scholar Dossier Modal** | `src/components/student/StudentLinkedInProfileModal.jsx` | `StudentLinkedInProfileModal`, LinkedIn-style layout, documents vault |
| **Talent Showcase** | `src/views/CompanyManagement.jsx`, `src/components/student/TalentProfileModal.jsx` | `CompanyManagement` (Talent Showcase), `TalentProfileModal`, recruiter view |
| **Placement Analytics** | `src/views/PlacementAnalytics.jsx`, `src/lib/placementStats.js` | `PlacementAnalytics`, `getPlacementSummary`, KPI cards, department charts |
| **Placed Students** | `src/components/placement/PlacedStudentsCard.jsx`, `src/components/common/CompanyBrandLogo.jsx` | `PlacedStudentsCard`, `CompanyBrandLogo`, `getProfessionBadge` |
| **Hiring Companies** | `src/components/placement/HiringCompaniesSection.jsx` | `HiringCompaniesSection`, partner SVG logos, package benchmarks |
| **Internship Opportunities** | `src/views/InternshipMonitoring.jsx`, `src/components/internship/OpportunityCard.jsx` | `InternshipMonitoring`, `OpportunityCard`, `OpportunityFormModal`, compensation bounds |
| **Internship Validation** | `src/lib/internshipValidation.js`, `src/app/api/admin/internship-opportunities/*` | `validateOpportunity`, mutual exclusivity (stipend vs paid vs non_stipend) |
| **Company Recruiter Portal** | `src/app/company/page.jsx`, `src/app/company/auth/page.jsx` | `CompanyLockedModuleView`, `initialPortalType="company"` |
| **Resume Builder Suite (CVForge)** | `RESUMEE.md`, `APP-RIMT-BCA/src/screens/ResumeScreen.jsx` | 4 templates (`navy_ledger`, `richard_sanchez`, `herman_walton`, `sunny_singh`), direct Intent PDF |
| **Cloudinary Media Sign** | `src/app/api/cloudinary/sign/route.js` | `sign/route.js`, SHA-1 signature generator, folder security validation |
| **Design Tokens & Styles** | `src/styles/globals.css`, `tailwind.config.js`, `src/constants/tokens.js` | Maroon `#6B0018`, Gold `#E7B94A`, Desert `#FAF6F0`, custom scrollbars |
| **Reusable UI Primitives** | `src/components/Modal.jsx`, `src/components/FilterPills.jsx`, `src/components/KpiCard.jsx`, `src/components/HeroCard.jsx` | Accessible dialogs, filter chips, glossy KPI metric displays |


---

## 1. Project Overview
The **RIMT Institutional Portal** is an enterprise-grade administrative and academic placement platform. It connects university officers, placement coordinators, corporate recruiters, and students in a unified ecosystem. 

A core architectural pillar is the **Gated Student Onboarding System & Administrator Oversight**:
- All new student registrations enter a strict `PENDING` queue.
- No access token or home portal permissions are granted upon registration.
- An Administrator manually reviews the student's identity, roll number, department, and academic year in the **Onboarding Approvals** queue.
- Administrators can inspect a comprehensive **LinkedIn-Style Scholar Dossier** containing student bio, legal name, phone number, academic score (CGPA & SGPA breakdown), featured projects portfolio, and verified credentials vault.
- Upon **Approval**, the student is granted full access to the portal dashboard, document vault, and profile editor.
- Upon **Rejection**, the student is locked out with an official registrar reason displayed on their screen.
- **Revocation** is separate from rejection; an administrator can remove an approved student's access with a recorded reason.
- **Fixed Admin Access Policy:** Open admin signup is permanently eliminated. Only two pre-authorized administrators are permitted: **Raj Kumar** (HOD BCA) and **Sagrika** (Vice HOD BCA) using salted PBKDF2 credentials.
- Approval totals and student registration views are computed from Supabase rows submitted by the student app. Student registration views do not seed profiles or invent missing fields.
- The mobile app's live Supabase schema uses `name` and `roll_no`; admin-facing records normalize these to `full_name` and `roll_number` while retaining both aliases. Do not assume the phone app writes to the admin process's in-memory fallback.
- Real-time guards block `PENDING`, `REJECTED`, and `REVOKED` accounts. The app rechecks approved sessions every 3.5 seconds.

### Cross-Project Upload Architecture (Cloudinary):
- The admin portal hosts a **Cloudinary Signing Endpoint** at `POST /api/cloudinary/sign` that generates SHA-1 upload signatures for the mobile app.
- The mobile app calls this endpoint to upload certificates and documents directly to Cloudinary, keeping the `CLOUDINARY_API_SECRET` safe on the server side.
- CORS headers allow `*` origins so both the admin web portal and the physical mobile device can call the endpoint.
- The admin portal's `.env` holds `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- The mobile app's `.env` sets `EXPO_PUBLIC_CLOUDINARY_SIGNING_URL` to the admin portal's LAN/deployed URL (e.g., `http://<LAN_IP>:3000/api/cloudinary/sign` for local dev).

---

## 2. Tech Stack

| Domain | Technology | Configuration & Details |
|---|---|---|
| **Admin Web Portal** | Next.js 16.3.8 (App Router) + React 18.3.1 | Single-Page Responsive Institutional Shell with 3-State Sidebar |
| **Styling & Design System** | Tailwind CSS 3.4.19 | Custom institutional palette: Primary Maroon (`#6B0018`), Gold (`#E7B94A`), Desert Surfaces (`#FAF6F0`) |
| **Icons & Micro-UI** | Lucide React (`^0.424.0`) + Material Symbols (self-hosted WOFF2/TTF) | Clean SVG vector iconography with local font-face binding |
| **Student Mobile/Web App** | Expo SDK 57 + React Native 0.86.3 | Cross-platform student app in `c:\Users\r3dha\APP-RIMIT-(2)` |
| **Database** | PostgreSQL via Supabase (`pwghazyfxhypzkadqfnn`) | Source of truth for student registrations and review states |
| **Admin DB writes** | `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret required to bypass student-facing RLS for review-state writes |
| **Backend API Layer** | Next.js Route Handlers (`src/app/api/*`) | Serverless microservice architecture for Auth, Approvals, Profile, Cloudinary Signing |
| **Authentication & Cryptography** | Standard Web Crypto API (`crypto.subtle`) + Node.js `crypto` | PBKDF2/SHA-256 salted password hashing, HMAC-SHA256 JWT tokens, SHA-1 Cloudinary signatures |
| **File Uploads** | Cloudinary (server-signed) | Upload signature generation via `/api/cloudinary/sign`; API secret never exposed to client |
| **Realtime Sync** | `@supabase/supabase-js` Realtime | Bidirectional PostgreSQL change subscriptions for all dossier tables |

---

## 3. Complete Directory & File Structure Tree

```
c:\Users\r3dha\ADMIN-PANEL-RIMT\
├── ADMIN.md                      # ⭐ THE SINGLE MASTER MEMORY FILE (This Document)
├── AGENTS.md                     # Agent development rules and operational boundaries
├── CLAUDE.md                     # Architecture and command guidelines for Anthropic Claude
├── drive.md                      # ⭐ Comprehensive frontend specification for Drive Management module
├── FULL-APP.md                   # Full cross-application context and integration documentation
├── NEW-FEATURE.md                # Feature specification & DoD for Admin Panel Authentication
├── README.md                     # High-level repository overview and quickstart guide
├── RESUMEE.md                    # ⭐ CVForge AI Resume Builder specification and mobile app sync context
├── jsconfig.json                 # Path aliases mapping: "@/*" -> "./src/*"
├── next.config.js                # Next.js configuration (reactStrictMode: true, images: { unoptimized: true })
├── package.json                  # Next.js 16.3.8, React 18.3.1, Lucide-React, Tailwind 3.4.19, @supabase/supabase-js
├── package-lock.json             # Locked dependency tree
├── postcss.config.js             # PostCSS Tailwind and Autoprefixer processor
├── tailwind.config.js            # Design tokens, color system, container queries, desert surfaces, keyframes
├── .env                          # Supabase URL/Key + Cloudinary credentials (CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET)
├── .env.example                  # Cloudinary configuration template (server-only secrets documentation)
├── .env.local                    # Local development Supabase URL + Key override
├── .gitignore                    # Git exclusions: node_modules, .next, out, logs, local envs
│
├── public/                       # Static Assets & Font Files
│   ├── campus-banner.jpg         # Campus hero photography banner for auth and portal headers
│   ├── default-avatar.jpg        # Default student avatar fallback (JPEG format)
│   ├── default-avatar.png        # Default student avatar fallback (PNG format)
│   ├── rimt-logo.png             # Official high-resolution RIMT University institutional logo (SessionLoader & brand cards)
│   └── fonts/                    # Self-hosted Material Symbols font files
│       ├── material-symbols-outlined.woff2 # Primary WOFF2 webfont for high-performance glyph rendering
│       └── material-symbols-outlined.ttf   # TTF fallback font file
│
├── src/
│   ├── app/                      # Next.js App Router Shell & Routes
│   │   ├── layout.jsx            # Universal root layout, HTML shell, preloads, session-seen inline script
│   │   ├── loading.jsx           # Root loading boundary rendering <SessionLoader />
│   │   ├── page.jsx              # ⭐ Main Single-Page Admin Shell (CompanyLockedModuleView, AuthGuard, role-based module renderer)
│   │   ├── admin/
│   │   │   ├── page.jsx          # Dedicated /admin route (renders AdminPortalDashboard in AuthGuard with initialPortalType="admin")
│   │   │   └── auth/
│   │   │       └── page.jsx      # Standalone /admin/auth route page
│   │   ├── company/              # ⭐ Corporate Recruiter Portal Routes
│   │   │   ├── page.jsx          # /company — Dedicated company dashboard (AuthGuard with initialPortalType="company")
│   │   │   └── auth/
│   │   │       └── page.jsx      # /company/auth — Standalone corporate recruiter registration and login screen
│   │   └── api/                  # Backend REST Route Handlers
│   │       ├── auth/             # Public Student Auth Endpoints
│   │       │   ├── signup/route.js # POST: 4-field student signup (Name, Roll No, Dept, Batch) -> status: PENDING
│   │       │   └── login/route.js  # POST: Gated roll number authentication (403 PENDING/REJECTED, 200 APPROVED)
│   │       ├── admin/            # Institutional Admin Endpoints
│   │       │   ├── auth/         # Fixed Admin Account Authentication
│   │       │   │   ├── signup/route.js         # POST: ⛔ DISABLED — always returns 403 SIGNUP_DISABLED
│   │       │   │   ├── login/route.js          # POST: Fixed admin credential auth (Raj Kumar / Sagrika only) + httpOnly cookie
│   │       │   │   ├── logout/route.js         # POST: Clear admin session cookie
│   │       │   │   ├── me/route.js             # GET: Active admin identity & verified privileges
│   │       │   │   ├── profile-pic/route.js    # POST: Admin avatar upload/update (multipart/json)
│   │       │   │   ├── change-password/route.js# PATCH: Verify current password & set new password
│   │       │   │   └── check-email/route.js    # POST: Pre-check if Gmail address already exists
│   │       │   ├── internships/
│   │       │   │   └── route.js        # GET: List all student internships across student dossiers for InternshipMonitoring
│   │       │   ├── internship-opportunities/  # ⭐ INTERNSHIP OPPORTUNITY CRUD & SEARCH ENDPOINTS
│   │       │   │   ├── route.js        # GET: Multi-filter search; POST: Admin create opportunity (mutual exclusivity, audit log)
│   │       │   │   └── [id]/
│   │       │   │       └── route.js    # GET: Single record; PATCH: Update/toggle visibility; DELETE: Remove record
│   │       │   └── requests/       # Gated Student Review & Dossier Management
│   │       │       ├── route.js    # GET: Queued student applications (?status=PENDING or ?status=ALL)
│   │       │       └── [id]/
│   │       │           ├── route.js         # GET: Single student dossier; PATCH: Update profile/dossier/academic metrics
│   │       │           ├── approve/route.js # PATCH: Approve student registration
│   │       │           ├── reject/route.js  # PATCH: Reject student registration with reason
│   │       │           └── revoke/route.js  # PATCH: Revoke student access with recorded reason
│   │       ├── company/          # Corporate Recruiter Auth Endpoints
│   │       │   ├── auth/
│   │       │   │   ├── register/route.js     # POST: Company registration (email/password) → JWT + httpOnly cookie
│   │       │   │   ├── login/route.js        # POST: Company sign-in (email/password) → JWT + httpOnly cookie
│   │       │   │   ├── google/route.js       # POST: Google OAuth — auto-registers new company if first-time
│   │       │   │   ├── me/route.js           # GET: Active company recruiter identity (withAuth requiredRole='COMPANY')
│   │       │   │   └── logout/route.js       # POST: Clear company_token cookie
│   │       │   └── upload-logo/
│   │       │       └── route.js    # POST: Upload corporate partner vector/raster logo
│   │       ├── cloudinary/
│   │       │   └── sign/
│   │       │       └── route.js    # POST: Cloudinary upload signature generator (SHA-1); OPTIONS: CORS preflight
│   │       ├── placement-stats/  # Live Placement Analytics Endpoints
│   │       │   ├── summary/route.js          # GET: Placement summary KPIs (highest, average, median, total placed)
│   │       │   ├── trend/route.js            # GET: Historical multi-year placement rate and package trends
│   │       │   ├── departments/route.js      # GET: Department-wise placement distribution and breakdown
│   │       │   ├── companies/route.js        # GET: Recruiting partners and package tier catalog
│   │       │   └── placed-students/route.js  # GET: Verified placed students with profession badges and corporate logos
│   │       └── profile/
│   │           └── route.js      # GET/PUT: Gated student profile editor (APPROVED users only)
│   │
│   ├── components/               # Admin UI Shell Components & Specialized Sub-modules
│   │   ├── FilterPills.jsx       # Reusable filterable pill-style toggle buttons
│   │   ├── Header.jsx            # Top bar: Dynamic admin avatar, search query, notifications
│   │   ├── HeroCard.jsx          # Decorative hero banner card component
│   │   ├── KpiCard.jsx           # KPI metric display card with icon, gradient, and trend
│   │   ├── Modal.jsx             # Accessible backdrop dialog wrapper for reviews & actions
│   │   ├── Sidebar.jsx           # ⭐ 3-state responsive drawer with role-based module locking & company isolation
│   │   │
│   │   ├── auth/                 # Authentication Gateway Components
│   │   │   ├── AuthGuard.jsx     # ⭐ Route protection wrapper with multi-account session isolation & instant refresh hydration
│   │   │   └── AuthScreen.jsx    # ⭐ Dual-Portal gateway: Institutional Admin + Company Portal switcher, Gmail-style account chooser
│   │   │
│   │   ├── common/               # Shared Institutional UI Primitives
│   │   │   ├── CompanyBrandLogo.jsx  # ⭐ Self-contained SVG vector brand logos (Google, Microsoft, AWS, Deloitte, HDFC, TCS, L&T, Infosys, Wipro)
│   │   │   └── SessionLoader.jsx     # Institutional branded session loader with concentric CSS stage, logoElasticCycle & sheen
│   │   │
│   │   ├── drive/                # ⭐ DRIVE MANAGEMENT MODULE COMPONENTS
│   │   │   ├── AnnouncementsPanel.jsx    # Broadcast announcements, schedule changes, and mobile push notification delivery
│   │   │   ├── DriveCard.jsx             # Drive summary card with package, batch, registered count, status badge & action menu
│   │   │   ├── DriveDetailDrawer.jsx     # Slide-over inspection drawer for drive rounds, links, announcements & results
│   │   │   ├── DriveFormModal.jsx        # 821-line modal for drive creation & editing with rounds, dates, eligibility & packages
│   │   │   ├── NotifyConfirmModal.jsx    # Pre-broadcast confirmation modal ensuring staff verify mobile notification content
│   │   │   ├── RegistrationLinksPanel.jsx# External & internal registration link management with copy link, deadline & status
│   │   │   ├── ResultsPanel.jsx          # Round-by-round results roster, selected/shortlisted student lists & package offers
│   │   │   └── StatusBadges.jsx          # Color-coded drive status badges (Upcoming, Active, In Progress, Completed, Cancelled)
│   │   │
│   │   ├── internship/           # INTERNSHIP MONITORING & OPPORTUNITY MODULE COMPONENTS
│   │   │   ├── OpportunityCard.jsx       # Card displaying opportunity details, stipend/paid badge, skills, status toggle, hover zoom
│   │   │   ├── OpportunityFormModal.jsx  # Creation/editing modal with real-time validation, duration slider, stipend exclusivity
│   │   │   ├── InternshipFilters.jsx     # Full-width horizontal filter toolbar (compensation, season, duration, skills, search, sort)
│   │   │   └── StudentInternshipCard.jsx # Live student internship monitoring card with dossier inspection
│   │   │
│   │   ├── placement/            # PLACEMENT ANALYTICS COMPONENTS
│   │   │   ├── PlacedStudentsCard.jsx    # ⭐ Placed students card with profession badges (getProfessionBadge), CompanyBrandLogo, tier-based styling
│   │   │   └── HiringCompaniesSection.jsx# ⭐ Hiring companies section with official SVG logos & clickable Google Maps location links
│   │   │
│   │   ├── profile/              # ADMIN PROFILE & SESSION MANAGEMENT
│   │   │   ├── AddAccountModal.jsx       # Full-page add account modal for multi-account Gmail-style sign-in
│   │   │   ├── ProfileMenu.jsx           # Header avatar dropdown menu (Profile, Change Password, Sign Out) with multi-account switcher
│   │   │   └── ProfileModal.jsx          # Modal for photo upload & password management
│   │   │
│   │   └── student/              # STUDENT DOSSIER & PORTFOLIO COMPONENTS
│   │       ├── StudentDossierModal.jsx          # ⭐ Full Admin-Managed Student Dossier (7 tabs: Overview, Projects, Git, Certs, Internships, Academics, Audit)
│   │       ├── StudentLinkedInProfileModal.jsx  # ⭐ LinkedIn-Style Scholar Dossier view (2936 lines) with Cloudinary document upload
│   │       └── TalentProfileModal.jsx           # ⭐ Read-only student portfolio viewer for corporate recruiters (Talent Showcase)
│   │
│   ├── constants/                # Project Constants & Registries
│   │   ├── data.js               # Clean data schemas and constant templates
│   │   └── tokens.js             # Institutional color palette, spacing, typography, and module registry definitions
│   │
│   ├── expo/                     # Expo/Mobile Admin Portal Navigator (embedded module)
│   │   ├── AdminPortalNavigator.jsx # Mobile admin portal navigation component
│   │   ├── colors.js             # Mobile admin color tokens
│   │   └── screens/              # Mobile admin screen components
│   │       ├── CompanyManagementScreen.jsx
│   │       ├── DriveManagementScreen.jsx
│   │       ├── InternshipMonitoringScreen.jsx
│   │       ├── PlacementStatisticsScreen.jsx
│   │       ├── ReportGenerationScreen.jsx
│   │       ├── StudentManagementScreen.jsx
│   │       └── TrainingManagementScreen.jsx
│   │
│   ├── lib/                      # Core Backend Utilities, Security Guards & Database Adapters
│   │   ├── auth.js               # Web Crypto PBKDF2 password hashing & HMAC-SHA256 JWT
│   │   ├── authApi.js            # Client-side API client for admin + company auth endpoints
│   │   ├── db.js                 # ⭐ Supabase adapter, student/admin/company records, dossier CRUD, company CRUD, internship CRUD, memory fallback
│   │   ├── driveClient.js        # ⭐ Drive Management API client (fetch drives, create, update, delete, broadcast notifications)
│   │   ├── driveUtils.js         # ⭐ Drive utilities (currency formatters, date math, eligibility checkers, status resolvers)
│   │   ├── enable_realtime.sql   # SQL to enable realtime publication on dossier tables
│   │   ├── internshipValidation.js # Canonical validation engine (mutual exclusivity, duration bounds, season checks, skill normalization)
│   │   ├── middleware.js         # withAuth route guard enforcing admin, company & student role/status checks with getCompanyById lookup
│   │   ├── placementStats.js     # Live placement statistics, student-company matching, profession badges, package benchmarks
│   │   ├── schema.sql            # PostgreSQL schema definition with students and admins tables
│   │   └── supabaseClient.js     # Shared Supabase client for realtime subscriptions (eventsPerSecond: 10)
│   │
│   ├── styles/
│   │   └── globals.css           # Global CSS, custom animations, Material Symbols font-face, session loader CSS suppression
│   │
│   └── views/                    # Primary Admin Functional Screens
│       ├── CompanyManagement.jsx # ⭐ "Talent Showcase" — approved student portfolio gallery with profile strength scoring & recruiter grid
│       ├── DriveManagement.jsx   # ⭐ OVERHAULED: Drive operations suite (Announcements, Registration Links, Results, Rounds, Notifications)
│       ├── InternshipMonitoring.jsx # ⭐ Live dual-tab layout (Opportunities vs Live Student Internships), full CRUD, responsive filters
│       ├── OnboardingApprovals.jsx # ⭐ Gated student approval queue, review drawer, reject modal
│       ├── PlacementStatistics.jsx # Real-time placement metrics, department charts, placed students card with profession badges
│       ├── ProfileTab.jsx        # Admin profile information & security settings
│       ├── ReportGeneration.jsx  # Exportable compliance reports in CSV and PDF formats
│       ├── StudentManagement.jsx # Verified student directory, CGPA/Attendance columns, "Open Dossier" button
│       └── TrainingManagement.jsx# Pre-placement training schedule, syllabus, and student rosters
│
├── supabase/
│   └── migrations/               # PostgreSQL Database Migrations
│       ├── 20260930_fixed_admin_accounts.sql             # Fixed admin accounts (Raj Kumar, Sagrika) with PBKDF2 hashed passwords
│       ├── 20260930_add_student_bio_and_academic_score.sql # Student bio, headline, cgpa, academic_score, banner_url, projects, skills, semester_scores
│       ├── 20260930_admin_student_dossier.sql             # Unified Student Dossier, 9 tables, RLS policies, manual-only academic summary, private certificate bucket
│       └── 20261018_internship_opportunities.sql         # Internship opportunities table, mutual exclusivity constraints, RLS policies
│
└── tests/                        # Automated Unit & Integration Test Suites
    ├── admin-auth.test.mjs       # Automated unit test suite verifying admin authentication & session lifecycle (18/18)
    ├── company-auth.test.mjs     # Automated unit test suite verifying corporate recruiter authentication & role gating (24/24)
    ├── dossier-academic.test.mjs # Automated unit test suite verifying dossier CRUD & academic manual control (26/26)
    ├── internship-opportunities.test.mjs # Automated unit test suite verifying opportunity validation & mutual exclusivity (57/57)
    └── onboarding.test.mjs       # Automated unit test suite verifying approval state transitions (21/21)
```

---

## 4. All Admin Screens & Views

### 4.1 Onboarding Approvals (`src/views/OnboardingApprovals.jsx`)
- **Purpose:** Primary review queue for new student registrations before they are granted portal entry.
- **Features:**
  - Metric cards showing counts for **Awaiting Review (Pending)**, **Approved**, **Rejected**, and **Total**.
  - Department filter dropdown (BCA, B.Sc IT, B.Sc Cyber Security, B.Sc (Hons) AI & ML).
  - Real-time search by full name, roll number, or department.
  - Pending, approved, rejected, revoked, and total counts derive from the complete live Supabase response.
  - Database read failures are shown as sync errors, not as confirmed zero counts.
  - Table showing Student Details, Department & Semester, Timestamp, and Status badge.
  - Quick actions: **Approve**, **Reject** with reason, and **Revoke Access** with its own reason for approved accounts.
  - Detailed review drawer showing full student credentials.
  - Rejection modal with predefined institutional reasons and custom text input.
  - Live toast alerts on status transitions.
  - A visible queue record does not guarantee the server can write a review decision. If an approve/reject/revoke call returns `Student record not found`, check that the row ID matches the Supabase row and that `SUPABASE_SERVICE_ROLE_KEY` is configured on the admin server; the in-memory fallback is process-local and is not shared with the mobile app.

### 4.2 Student Management (`src/views/StudentManagement.jsx`)
- **Purpose:** Student-registration directory backed by live Supabase records with comprehensive LinkedIn-Style Profile Tracking.
- **Features:**
  - **LinkedIn-Style Scholar Dossier:** Full modal and drawer view displaying scholar bio, legal name, headline, phone number, academic score (CGPA & SGPA breakdown), featured projects portfolio, and verified credentials vault.
  - **Document Vault & Previewer:** Live integration with `student_documents` table in Supabase; includes one-click in-modal document preview (PDF/Image) and verified credential badges.
  - **Academic Score Tracker:** Real-time tracking of cumulative CGPA (out of 10.0), percentage equivalence, semester-by-semester SGPA track, and Dean's Honors List academic standing.
  - **Featured Projects Portfolio:** GitHub-synced project cards showing category, tech stack tags, commit metadata, and demo links.
  - **Direct Admin Actions:** Direct click-to-call, WhatsApp chat, email, and live override/editing of scholar bio, phone, and academic metrics (`PATCH /api/admin/requests/[id]`).
  - Live totals and filters for status, department, and year/semester.
  - CSV export contains the currently filtered live records. Legacy add/import controls do not claim unsaved records succeeded.

### 4.3 Talent Showcase (`src/views/CompanyManagement.jsx` — formerly Company Management)
- **Purpose:** Recruiter-facing gallery of approved RIMT student portfolios with profile strength scoring. Designed for corporate recruiters browsing the RIMT Talent pool.
- **Features:**
  - **Profile Strength Scoring:** Automated 0–100% profile completeness score computed from bio, headline, avatar, skills, projects, certificates, and internships. Students classified as **Exceptional** (≥85%), **Strong** (≥65%), **Developing** (≥45%), or **Starter** (<45%).
  - **Live Supabase Data:** Fetches all `APPROVED`/`VERIFIED` students via `/api/admin/requests?status=ALL` with 8-second auto-refresh polling.
  - **Filter Pills:** All Talent, Exceptional, Strong, Projects, Internships, Certified.
  - **Department Filter:** Dropdown to filter by BCA, B.Sc IT, B.Sc Cyber Security, B.Sc (Hons) AI & ML.
  - **Sort Options:** By profile strength, name (A-Z), project count, or most recent.
  - **Grid/List View Toggle:** Card-based grid view and compact list view.
  - **Student Portfolio Cards:** Display avatar, name, headline, department, roll number, skills tags, project/internship/certificate counts, and profile strength progress bar.
  - **TalentProfileModal:** Read-only full-screen student portfolio viewer (`src/components/student/TalentProfileModal.jsx`) showing About section, Tech Stack & Skills, Featured Projects, Certificates, Internships, and profile strength gauge. Designed for recruiter consumption — no admin editing capabilities.
  - **Search:** Full-text search by name, roll number, department, headline, or skill name.

### 4.4 Drive Management (`src/views/DriveManagement.jsx` & `src/components/drive/*`)
- **Purpose:** Enterprise placement drive operations suite enabling university staff to author, schedule, publish, and manage corporate & campus recruitment drives, registration links, real-time broadcasts/announcements, round-by-round selection results, and student mobile push alerts.
- **Source Specification Document:** `drive.md` (645 lines — complete revision 2 spec with zero-mock governance).
- **Core Sub-Components (`src/components/drive/`):**
  1. **`DriveFormModal.jsx` (821 lines):**
     - Full creation & editing modal for campus placement drives.
     - Basic Info: Company name, job role, drive category (Campus Drive, Off-Campus, Pool Campus, Virtual), target department multi-select (BCA, B.Sc IT, B.Sc Cyber Security, B.Sc AI & ML), target batch year.
     - Compensation Breakdown: CTC / package in LPA (base, variable, perks), stipend during probation, tier badge auto-resolution (Super Dream ≥15 LPA, Dream ≥10 LPA, Standard 1 ≥6 LPA, Entry).
     - Eligibility Engine: Minimum CGPA, maximum active backlogs, 10th & 12th percentage thresholds, required skills list with interactive tag input.
     - Multi-Round Pipeline: Configurable interview rounds (Aptitude Test, Technical Interview 1, Technical Interview 2, HR Round, Group Discussion, Managerial Round) with dates, venues, and round descriptions.
  2. **`DriveDetailDrawer.jsx` (467 lines):**
     - Slide-over comprehensive drive inspection drawer.
     - Displays full drive dossier, eligibility checklist, package breakdown, rounds status timeline, active registration links, published announcements, and selection results.
     - Staff quick-action controls: Edit Drive, Publish/Unpublish, Status Transition (Upcoming → Active → In Progress → Completed → Cancelled), and Trigger Mobile Notification.
  3. **`DriveCard.jsx` (235 lines):**
     - High-density summary card for drive listings.
     - Displays company logo/monogram, role title, package tier badge, eligibility criteria pill (Min CGPA), batch year, drive date/timeline, registered applicants counter, and shortlisted count.
     - Interactive kebab action menu: View Details, Edit Drive, Manage Registration Links, View Results, Broadcast Update.
  4. **`AnnouncementsPanel.jsx` (282 lines):**
     - Dedicated drive announcements management panel.
     - Staff can publish urgent schedule changes, venue updates, shortlisted roll numbers, and round guidelines.
     - Push notification integration: Broadcasts instantly to all students with the `APP-RIMT-BCA` student app installed.
  5. **`RegistrationLinksPanel.jsx` (325 lines):**
     - Manages both external company portal application URLs and internal RIMT registration forms.
     - Copy-to-clipboard 1-click action, application deadline countdown, registration instructions, and status indicator (Open, Closing Soon, Closed).
  6. **`ResultsPanel.jsx` (406 lines):**
     - Round-by-round selection results and offer letters manager.
     - Roster of shortlisted and final selected students with roll numbers, names, departments, and offered packages.
     - Instant result publication with automatic sync to student app and Placement Statistics.
  7. **`StatusBadges.jsx` (169 lines):**
     - Standardized institutional status badges: `Upcoming` (blue), `Active` (emerald), `In Progress` (amber), `Completed` (indigo), `Cancelled` (rose).
  8. **`NotifyConfirmModal.jsx` (195 lines):**
     - Pre-broadcast verification modal preventing accidental notifications to mobile students.
     - Previews student push notification title, body, and audience size with confirmation safeguards.
- **Client & Utilities Layer:**
  - **`src/lib/driveClient.js` (405 lines):** API client providing `getDrives()`, `getDriveById()`, `createDrive()`, `updateDrive()`, `deleteDrive()`, `broadcastDriveAnnouncement()`, `updateDriveResults()`.
  - **`src/lib/driveUtils.js` (401 lines):** Currency formatters (`formatLPA`), deadline calculations, eligibility matching against student records, round status resolvers.
- **Real-Data Governance:** All synthetic placeholder numbers (e.g., hardcoded 14 active drives, 684 offers, 48 companies, ₹34.5 LPA, TCS dummy hero) are permanently eliminated. Clean zero-state with institutional "Schedule First Placement Drive" CTA.

### 4.5 Placement Statistics (`src/views/PlacementStatistics.jsx`)
- **Purpose:** Institutional analytics dashboard with live student placement and corporate hiring data.
- **Features:**
  - Placement percentage by department.
  - Highest, median, and average package (LPA) benchmarks.
  - Visual charts and historical comparison trends.
  - **Placed Students & Corporate Offers Card** (`src/components/placement/PlacedStudentsCard.jsx`):
    - Lists all approved students paired with hiring companies from `src/lib/placementStats.js`.
    - **Student Profession Badge:** Each student displays a color-coded profession pill with matching icon (🛡 Cyber Security → emerald, ☁ Cloud DevOps → sky, 💻 Developer → indigo, 📊 Risk Analyst → amber, 🏦 FinTech → teal, 🎶 Music/Singing → purple, 💃 Dance → pink) via `getProfessionBadge()`.
    - **Official Company Brand Logos:** Uses `CompanyBrandLogo` SVG vectors (Google, Microsoft, AWS, Deloitte, HDFC, TCS) instead of external image URLs — immune to CORS/403 errors.
    - **Tier Badges:** Packages color-coded by tier: Super Dream (≥15 LPA), Dream (≥10 LPA), Standard 1 (≥6 LPA), Entry.
  - **Hiring Companies Section** (`src/components/placement/HiringCompaniesSection.jsx`):
    - Displays the 6 HIRING_COMPANIES_CATALOG entries with official SVG logos via `CompanyBrandLogo`.
    - Location badges link to Google Maps search for the company address.
    - Shows SPOC contact, MoU status, package range, and sector info.

### 4.6 Training Management (`src/views/TrainingManagement.jsx`)
- **Purpose:** Pre-placement soft-skills and technical training bootcamps.
- **Features:**
  - Training modules, schedule calendar, and student attendance tracking.

### 4.7 Internship Monitoring & Opportunities (`src/views/InternshipMonitoring.jsx`)
- **Purpose:** Comprehensive institutional internship management featuring corporate opportunity curation, multi-filter discovery, role-gated admin authoring, and real-time student industrial internship monitoring.
- **Architecture & Features:**
  - **Dual-Tab Operational Interface:**
    - **Internship Opportunities Tab:** Admin-managed catalog of corporate internship openings. Starts strictly clean at 0 (zero hardcoded mock rows). Real-time Supabase synchronization.
    - **Live Student Internships Tab:** Live feed of assigned student industrial internships aggregated across verified student dossiers, with faculty mentor tracking and mid-term evaluation states.
  - **Full-Width Responsive Filter Toolbar (`InternshipFilters.jsx`):**
    - Search across roles, companies, required skills, and locations.
    - Dropdowns for Company, Department, Opportunity Status, and Sort criteria.
    - Full-width horizontal chip bar displaying **Compensation** (All Comp, Stipend, Non-Stipend, Paid), **Season** (All Seasons, Winter, Summer, Spring, Autumn), and **Duration** (All, 3 Mo, 6 Mo, 9 Mo, 12 Mo, Other) side-by-side with subtle dividers and smooth interactive hover-zoom scaling (`hover:scale-105 active:scale-95`).
    - Dynamic skills filter chips derived from active opportunity requirements with local search filter and expandable toggle.
    - Grid view vs List view layout toggle with local preferences.
  - **Opportunity Cards (`OpportunityCard.jsx`):**
    - Company monogram/logo, role title, department tags, duration, season badge, and compensation pill.
    - Currency formatting in INR with Indian numeric grouping (e.g. ₹25,000 / month).
    - Real-time visibility toggle (`is_visible`), Edit modal trigger, and delete confirmation dialog with audit logging.
    - Micro-zoom hover animation (`hover:scale-[1.01] transition-all`).
  - **Opportunity Creation & Editing Modal (`OpportunityFormModal.jsx`):**
    - Live form validation via shared engine `internshipValidation.js`.
    - Strict mutual exclusivity between Stipend (`stipend_amount > 0` and `fee_amount = null`) and Paid (`fee_amount > 0` and `stipend_amount = null`).
    - Duration slider with standard semester presets (3, 6, 9, 12 months) and custom input bounds (1–24 months).
    - Academic season picker, department multi-select, and interactive skill tagger with backspace removal.
  - **Live Student Internship Cards (`StudentInternshipCard.jsx`):**
    - Displays scholar identity, roll number, department, corporate host, stipend, status, and faculty mentor.
    - Direct "Inspect Dossier" CTA opening the full LinkedIn-Style Scholar Dossier modal.
  - **Security & Audit Governance:**
    - Role-based route guard strictly blocks `COMPANY` role recruiters from admin write endpoints (`FORBIDDEN_ROLE`).
    - All CRUD mutations are permanently recorded in `admin_audit_log` with actor ID and data diffs.

### 4.8 Report Generation (`src/views/ReportGeneration.jsx`)
- **Purpose:** Institutional reporting for NAAC, NIRF, and AICTE compliance.
- **Features:**
  - Export placement reports in CSV and PDF formats.

### 4.9 Institutional Branded Session Loader & Refresh Suppression Architecture
- **Login Animation Source File:** `src/components/auth/AuthGuard.jsx:296` (`SplashVerificationScreen`).
- **Implementation Files:**
  - `src/components/common/SessionLoader.jsx` (server-renderable shell, layers, exported timing constants)
  - `src/styles/globals.css` (`.rimt-loader`, `.rimt-loader__card`, `.rimt-loader__sheen`, keyframes, refresh quiet-mode suppression)
  - `src/components/auth/AuthGuard.jsx` (session check, single mount clock, seamless under-overlay mount, instant refresh hydration)
  - `src/app/loading.jsx` (Next.js root suspense boundary rendering `<SessionLoader />`)
  - `src/app/layout.jsx` (`<link rel="preload" href="/rimt-logo.png" as="image">`, session-seen inline `<head>` script)
  - `public/rimt-logo.png` (56x56 institutional logo)
- **Zero-Irritation Refresh Suppression Architecture (2026-10-20):**
  - **The Problem:** Repeatedly clicking the browser's refresh button (the round refresh icon on top 🔄) forced the user to sit through the full 2.2s logo bounce, sheen, shockwaves, and spinner overlay, creating user irritation.
  - **The Solution:** 
    1. **Inline `<head>` Execution:** In `src/app/layout.jsx`, an inline `<script>` runs synchronously in `<head>` before any body HTML is parsed:
       ```javascript
       if (s && s.getItem('rimt_loader_seen')) {
         document.documentElement.setAttribute('data-rimt-loader', 'seen');
       }
       ```
    2. **Instant Zero-Flicker CSS Suppression:** In `src/styles/globals.css`:
       ```css
       html[data-rimt-loader="seen"] .rimt-loader {
         display: none !important;
         visibility: hidden !important;
         opacity: 0 !important;
         pointer-events: none !important;
         animation: none !important;
       }
       ```
       The browser's layout engine suppresses the entire loader overlay at 0ms — not even a single frame or static card flashes.
    3. **Synchronous React Client Hydration:** In `src/components/auth/AuthGuard.jsx`:
       - On mount, if `isSeen` is true (`sessionStorage.getItem('rimt_loader_seen') === '1' || data-rimt-loader === 'seen'`):
         - `minElapsed` and `loaderExited` are set to `true` immediately.
         - Cached credentials (`localStorage.getItem('rimt_admin_user')`) are restored synchronously into `admin` state.
         - `sessionReady` is set to `true` immediately.
         - `children` (Admin Dashboard) mounts and renders instantly with **zero delay and zero animation**.
         - Asynchronous `checkAuth()` runs silently in the background to re-verify the token with `/api/admin/auth/me`.
    4. **First-Time Visits Preserved:** When opening the website for the first time in a new tab, from Google, or from localhost, `sessionStorage` has no `rimt_loader_seen` flag:
       - The full institutional 2.2s branded animation (`SessionLoader` with `logoElasticCycle` bounce, white sweep, shockwave rings) plays smoothly.
       - Upon completing the first animation, `rimt_loader_seen` is recorded in `sessionStorage` and `data-rimt-loader="seen"` is stamped on `<html>`.
    5. **Login Animation Preserved:** When a user logs out (`handleSignOut`), `rimt_loader_seen` is removed from `sessionStorage`. When they log back in from `AuthScreen` (`handleAuthenticated`), the verification animation (`SplashVerificationScreen`) runs with the red dot to green checkmark transition, and sets `rimt_loader_seen` upon completion.

### 4.10 CVForge AI Resume Builder Integration (`RESUMEE.md`)
- **Paired Mobile App Integration:** Paired student application (`APP-RIMT-BCA`) features the institutional **CVForge AI Resume Builder** (`src/screens/ResumeScreen.jsx` and `src/services/resumeService.js`).
- **4 ATS-Certified Templates:**
  1. `navy_ledger`: Executive single-column ledger with navy headers and formal academic layout.
  2. `richard_sanchez`: Slate split two-column format with skills sidebar and featured projects timeline.
  3. `herman_walton`: Classic corporate analyst format with institutional serif typography and verified credentials box.
  4. `sunny_singh`: Modern technical developer template with tech-stack badges and GitHub commit highlights.
- **Direct Intent PDF Viewing (Zero Cloud Dependencies):** Generates vector PDF in local scoped storage (`FileSystem.documentDirectory`) and launches native Android PDF viewers via `android.intent.action.VIEW` directly without third-party cloud uploads.
- **Data Synchronization:** Realtime synchronization with admin-managed student dossiers (`student_profiles`, `student_projects`, `student_certificates`, `student_academic_summary`).


---

## 5. All Backend API Endpoints

### 5.1 Authentication (`src/app/api/auth/`)
* **`POST /api/auth/signup`**
  - **Auth:** Public.
  - **Request Body:**
    ```json
    {
      "name": "Aarav Sharma",
      "roll_no": "RIMT/22/BTCSE/0417",
      "department": "B.Tech CSE",
      "batch": "1st Year (1st Sem)"
    }
    ```
  - **Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "Registration submitted successfully. Your account is pending Admin approval.",
      "status": "PENDING",
      "user": { "id": "...", "name": "Aarav Sharma", "roll_no": "RIMT/22/BTCSE/0417", "department": "B.Tech CSE", "status": "PENDING" }
    }
    ```
  - **Security Rule:** Never returns an access token upon signup.

* **`POST /api/auth/login`**
  - **Auth:** Public.
  - **Request Body:** `{ "identifier": "RIMT/22/BTCSE/0417" }` (roll number only, no password)
  - **Responses:**
    - `403 Forbidden` (Pending): `{ "error": "Your account is awaiting admin approval", "status": "PENDING" }`
    - `403 Forbidden` (Rejected): `{ "error": "Your registration was rejected", "status": "REJECTED", "reason": "..." }`
    - `200 OK` (Approved): `{ "success": true, "user": { ... } }`

### 5.2 Admin Authentication (`src/app/api/admin/auth/`)
> ⛔ **Fixed Admin Access Policy:** Open admin signup is permanently disabled. Only two pre-authorized administrators are permitted.

| Admin Name | Role | Password | PBKDF2-SHA256 Hash |
|---|---|---|---|
| **Raj Kumar** | HOD BCA | `BCAHOD` | `d680cfb989acd4d9054db88f98af7ec384a8b69c7b16c3995c7b92c28897e54a` |
| **Sagrika** | Vice HOD BCA | `VICEHOD` | `6e0fe68a50605d90af3ce96b8dc2921095f27a562e758eb2866bade3e3a37381` |

- **Salt:** `rimt-salt-key`, **Iterations:** 10,000, **Algorithm:** PBKDF2/SHA-256
- Credentials stored in Supabase `admins` table with unique index on `lower(trim(full_name))`.
- In-memory fallback in `src/lib/db.js` for development.

* **`POST /api/admin/auth/signup`** — ⛔ Returns `403 SIGNUP_DISABLED` unconditionally.
* **`POST /api/admin/auth/login`** — Authenticates `name` + `password` against fixed admin list. Issues httpOnly `admin_token` cookie.
* **`POST /api/admin/auth/logout`** — Clears admin session cookie.
* **`GET /api/admin/auth/me`** — Returns active admin identity.

### 5.3 Admin Requests & Dossier APIs (`src/app/api/admin/`)
* **`GET /api/admin/requests?status=PENDING`**
  - **Auth:** `role === 'ADMIN'`
  - **Response (200 OK):** Array of student registration requests, enriched with manual `cgpa` and `overall_attendance` from `student_academic_summary`.
* **`GET /api/admin/requests/:id`**
  - **Auth:** `role === 'ADMIN'`
  - **Response (200 OK):** Full student dossier aggregating:
    - Base student row (`students`)
    - Extended profile (`student_profiles`)
    - Custom featured projects (`student_projects`)
    - Git repositories (`student_git_projects`)
    - Verified credentials (`student_certificates`)
    - Industrial internships (`student_internships`)
    - Manual academic summary (`student_academic_summary` — cgpa, attendance %, backlogs, total credits)
    - Semester records (`student_semester_records` — semester SGPA and attendance)
    - Subject grade roster (`student_grades`)
    - Tamper-evident audit trail (`admin_audit_log` — last 50 actions)
* **`PATCH /api/admin/requests/:id`**
  - **Auth:** `role === 'ADMIN'`
  - **Request Body (Section Dispatcher):**
    - `section: 'academic_summary'` + `{ cgpa, overall_attendance, backlogs, total_credits_earned, remarks }`
    - `section: 'semester_record'` + `{ semester_number, sgpa, attendance_percentage, credits_registered, credits_earned, remarks }`
    - `section: 'grades'` + `{ semester_number, grades: [...] }`
    - `section: 'profile'` + `{ bio, headline, phone, address, github_url, linkedin_url, website_url, skills, is_visible }`
    - `section: 'projects'` + `action: 'create' | 'update' | 'delete' | 'reorder'`
    - `section: 'git_projects'` + `action: 'create' | 'update' | 'delete' | 'reorder'`
    - `section: 'certificates'` + `action: 'create' | 'update' | 'delete'`
    - `section: 'internships'` + `action: 'create' | 'update' | 'delete'`
  - **Audit Logging:** Every modification automatically logs actor name, old values, and new values into `admin_audit_log`.
* **`GET /api/admin/internships`**
  - **Auth:** `role === 'ADMIN'`
  - **Response (200 OK):** Array of all live industrial internship records with student metadata for `InternshipMonitoring.jsx`.
* **`PATCH /api/admin/requests/:id/approve`**
  - **Auth:** `role === 'ADMIN'`
  - **Response (200 OK):** Updates status to `APPROVED`, records `reviewed_at` and `reviewed_by`.
* **`PATCH /api/admin/requests/:id/reject`**
  - **Auth:** `role === 'ADMIN'`
  - **Request Body:** `{ "reason": "Roll number not found in registrar batch list." }`
  - **Response (200 OK):** Updates status to `REJECTED`, saves rejection reason.
* **`PATCH /api/admin/requests/:id/revoke`**
  - **Auth:** `role === 'ADMIN'`; only `APPROVED`/`VERIFIED` records may be revoked.
  - **Request Body:** `{ "reason": "..." }`
  - **Response (200 OK):** Updates status to `REVOKED` and saves the reason and review audit fields.
  - **Prerequisites:** Apply `APP-RIMIT/supabase/migrations/20260929_student_review_states.sql` and configure `SUPABASE_SERVICE_ROLE_KEY` in the admin server environment. Never expose this key to the browser or mobile app. Hardcoded bypass headers work only in local development; production requires a signed admin JWT.

### 5.4 Cloudinary Signing (`src/app/api/cloudinary/sign/`)
* **`POST /api/cloudinary/sign`**
  - **Auth:** Public (CORS `Access-Control-Allow-Origin: *`).
  - **Request Body:** `{ "folder": "rimt-academic-trust/ROLL_NUMBER", "timestamp": <optional> }`
  - **Validation:** Folder must match regex `^rimt-academic-trust\/[A-Z0-9_-]{1,32}$`.
  - **Response (200 OK):**
    ```json
    { "signature": "<sha1>", "timestamp": 1696300000, "api_key": "...", "cloud_name": "...", "folder": "rimt-academic-trust/ROLL_NUMBER" }
    ```
  - **Response (503):** If `CLOUDINARY_API_SECRET` is missing or set to `****`.
  - **Response (400):** If folder format is invalid.
  - **Environment Variables Required:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (server-only, never in `EXPO_PUBLIC_*`).
* **`OPTIONS /api/cloudinary/sign`** — Returns `204` with CORS headers for preflight.

### 5.5 Profile (`src/app/api/profile/`)
* **`GET /api/profile`**
  - **Auth:** Authenticated user with `status === 'APPROVED'`. Returns profile data.
* **`PUT /api/profile`**
  - **Auth:** Authenticated user with `status === 'APPROVED'`. Modifies profile data.

### 5.6 Corporate Company Authentication (`src/app/api/company/auth/`)
> ⭐ **NEW:** Full company recruiter authentication system with email/password registration, sign-in, and Google OAuth.

* **`POST /api/company/auth/register`**
  - **Auth:** Public.
  - **Request Body:**
    ```json
    {
      "company_name": "Google LLC",
      "recruiter_name": "Sarah Jenkins",
      "email": "recruiter@google.com",
      "password": "SecurePass@123",
      "industry": "Cloud Computing & AI"
    }
    ```
  - **Response (200 OK):**
    ```json
    { "success": true, "message": "Company registration successful.", "token": "<jwt>", "company": { "id": "comp-...", "company_name": "Google LLC", "role": "COMPANY", "status": "ACTIVE" } }
    ```
  - **Response (409 Conflict):** `{ "error": "An account with this corporate email already exists." }`
  - **Security:** Password hashed with PBKDF2-SHA256. JWT token (14-day expiry) set as `company_token` httpOnly cookie.

* **`POST /api/company/auth/login`**
  - **Auth:** Public.
  - **Request Body:** `{ "email": "recruiter@google.com", "password": "SecurePass@123", "remember_me": true }`
  - **Responses:**
    - `404 Not Found`: `{ "error": "No registered company found with this email." }`
    - `401 Unauthorized`: `{ "error": "Invalid corporate email or password." }`
    - `403 Forbidden`: `{ "error": "This corporate partner account is currently deactivated." }`
    - `200 OK`: `{ "success": true, "token": "<jwt>", "company": { ... } }`
  - **Security:** Session duration: 30 days (remember_me) or 7 days.

* **`POST /api/company/auth/google`**
  - **Auth:** Public.
  - **Request Body:** `{ "email": "recruiter@google.com", "name": "Google Talent Acquisition", "avatar_url": "...", "company_name": "Google LLC" }`
  - **Behavior:** Auto-registers new company if email not found; signs in existing company. Infers company name from email domain if not provided.
  - **Response (200 OK):** `{ "success": true, "isNew": true|false, "token": "<jwt>", "company": { ... } }`
  - **Security:** 30-day JWT session. `company_token` httpOnly cookie.

* **`GET /api/company/auth/me`**
  - **Auth:** `withAuth(handler, { requiredRole: 'COMPANY' })` — JWT Bearer token required.
  - **Response (200 OK):** `{ "success": true, "company": { "id": "...", "company_name": "...", "role": "COMPANY", ... } }`

* **`POST /api/company/auth/logout`**
  - **Auth:** Public.
  - **Response (200 OK):** `{ "success": true, "message": "Corporate session ended." }`
  - **Side Effect:** Deletes `company_token` cookie.

---

## 6. Data Model (PostgreSQL Schema)

### 6.1 Core Identity Tables
```sql
-- Supabase table: students (actual column names used in production)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                -- Student full name
  roll_no TEXT NOT NULL UNIQUE,      -- University roll number (normalized uppercase)
  department TEXT NOT NULL,          -- BCA | B.Sc IT | B.Sc Cyber Security | B.Sc (Hons) AI & ML
  course TEXT,                       -- Same as department (legacy alias)
  batch TEXT,                        -- Year/Semester string e.g. "1st Year (1st Sem)"
  semester TEXT,                     -- Same as batch (legacy alias)
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'VERIFIED')),
  rejection_reason TEXT,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,                          -- Student professional bio / summary (LinkedIn-style)
  headline TEXT,                     -- One-line professional headline
  about_me TEXT,                     -- Longer freeform description
  cgpa NUMERIC(4,2),                 -- Legacy column; source of truth is student_academic_summary
  academic_score JSONB DEFAULT '{}',
  banner_url TEXT,
  projects JSONB DEFAULT '[]',
  skills TEXT[] DEFAULT '{}',
  semester_scores JSONB DEFAULT '[]',
  internships JSONB DEFAULT '[]',   -- Student internships JSONB array (migration: 20261002)
  attendance_rate NUMERIC(5,2),      -- Overall attendance percentage
  academic_standing TEXT,            -- e.g. "Dean's Honors List"
  active_backlogs INTEGER DEFAULT 0,
  total_credits INTEGER,
  faculty_advisor TEXT,
  current_semester TEXT,
  admin_notes TEXT                   -- Internal admin notes (not visible to student)
);

-- Supabase table: admins (fixed admin accounts only)
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_name_unique
  ON public.admins (lower(trim(full_name)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_roll_no_unique 
  ON public.students (upper(trim(roll_no)));

CREATE INDEX IF NOT EXISTS idx_students_status 
  ON public.students (status);

CREATE INDEX IF NOT EXISTS idx_students_cgpa
  ON public.students (cgpa DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_students_status_dept
  ON public.students (status, department);
```

### 6.2 Admin-Managed Student Dossier & Academic Tables (Migration: `20260930_admin_student_dossier.sql`)

```sql
-- 1. Student Profiles (Extended Overview)
CREATE TABLE IF NOT EXISTS public.student_profiles (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  bio TEXT,
  headline TEXT,
  phone TEXT,
  address TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  skills TEXT[] DEFAULT '{}',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Student Projects (Custom Featured Portfolio)
CREATE TABLE IF NOT EXISTS public.student_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tech_stack TEXT[] DEFAULT '{}',
  live_url TEXT,
  repo_url TEXT,
  role TEXT,
  start_date DATE,
  end_date DATE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Student Git Repositories
CREATE TABLE IF NOT EXISTS public.student_git_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  repo_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  description TEXT,
  stars_count INT DEFAULT 0,
  forks_count INT DEFAULT 0,
  primary_language TEXT,
  topics TEXT[] DEFAULT '{}',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Student Certificates & Verified Credentials
CREATE TABLE IF NOT EXISTS public.student_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  issuing_org TEXT NOT NULL,
  issue_date DATE,
  expiration_date DATE,
  credential_id TEXT,
  credential_url TEXT,
  file_path TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Student Industrial Internships
CREATE TABLE IF NOT EXISTS public.student_internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('ongoing', 'completed', 'offered')),
  start_date DATE NOT NULL,
  end_date DATE,
  location TEXT,
  stipend NUMERIC(10,2),
  mentor_name TEXT,
  mentor_email TEXT,
  description TEXT,
  offer_letter_path TEXT,
  completion_cert_path TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Student Academic Summary (STRICT MANUAL CONTROL ONLY)
-- No triggers, no edge functions, no cron jobs, no auto-derivation
CREATE TABLE IF NOT EXISTS public.student_academic_summary (
  student_id UUID PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  cgpa NUMERIC(4,2) CHECK (cgpa IS NULL OR (cgpa >= 0.00 AND cgpa <= 10.00)),
  overall_attendance NUMERIC(5,2) CHECK (overall_attendance IS NULL OR (overall_attendance >= 0.00 AND overall_attendance <= 100.00)),
  backlogs INT NOT NULL DEFAULT 0 CHECK (backlogs >= 0),
  total_credits_earned NUMERIC(6,2) DEFAULT 0 CHECK (total_credits_earned >= 0),
  remarks TEXT,
  last_updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Student Semester Records (Per-Semester Manual Metrics)
CREATE TABLE IF NOT EXISTS public.student_semester_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semester_number INT NOT NULL CHECK (semester_number >= 1 AND semester_number <= 12),
  sgpa NUMERIC(4,2) CHECK (sgpa IS NULL OR (sgpa >= 0.00 AND sgpa <= 10.00)),
  attendance_percentage NUMERIC(5,2) CHECK (attendance_percentage IS NULL OR (attendance_percentage >= 0.00 AND attendance_percentage <= 100.00)),
  credits_registered NUMERIC(5,2) CHECK (credits_registered IS NULL OR credits_registered >= 0),
  credits_earned NUMERIC(5,2) CHECK (credits_earned IS NULL OR credits_earned >= 0),
  remarks TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(student_id, semester_number)
);

-- 8. Student Subject Grades (Manual Course Roster)
CREATE TABLE IF NOT EXISTS public.student_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semester_number INT NOT NULL CHECK (semester_number >= 1 AND semester_number <= 12),
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  grade_points NUMERIC(4,2) CHECK (grade_points IS NULL OR (grade_points >= 0.00 AND grade_points <= 10.00)),
  credits NUMERIC(4,2) CHECK (credits IS NULL OR credits >= 0),
  remarks TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(student_id, semester_number, subject_code)
);

-- 9. Tamper-Evident Admin Audit Log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Institutional Internship Opportunities (Overhaul Complete)
CREATE TABLE IF NOT EXISTS public.internship_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  duration_months INT NOT NULL CHECK (duration_months BETWEEN 1 AND 24),
  season TEXT NOT NULL DEFAULT 'any' CHECK (season IN ('winter', 'summer', 'spring', 'autumn', 'any')),
  compensation_type TEXT NOT NULL DEFAULT 'stipend' CHECK (compensation_type IN ('stipend', 'non_stipend', 'paid')),
  stipend_amount NUMERIC(10,2),
  fee_amount NUMERIC(10,2),
  location TEXT,
  work_mode TEXT NOT NULL DEFAULT 'on_site' CHECK (work_mode IN ('on_site', 'remote', 'hybrid')),
  skills_required TEXT[] NOT NULL DEFAULT '{}',
  department TEXT[] NOT NULL DEFAULT '{"BCA"}',
  openings INT NOT NULL DEFAULT 1 CHECK (openings >= 1),
  application_deadline DATE,
  description TEXT,
  requirements TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'draft', 'closed', 'filled')),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  -- Strict mutual exclusivity for compensation models
  CONSTRAINT chk_internship_compensation CHECK (
    (compensation_type = 'stipend' AND stipend_amount IS NOT NULL AND stipend_amount > 0 AND fee_amount IS NULL) OR
    (compensation_type = 'paid' AND fee_amount IS NOT NULL AND fee_amount > 0 AND stipend_amount IS NULL) OR
    (compensation_type = 'non_stipend' AND stipend_amount IS NULL AND fee_amount IS NULL)
  )
);
```

### 6.3 Security, Row Level Security (RLS) & Helper Functions
```sql
-- Helper function to identify active administrators
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE id = auth.uid() AND status = 'active'
    )
    OR (auth.jwt() ->> 'role') = 'ADMIN'
    OR (auth.jwt() ->> 'role') = 'service_role'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to identify current student
CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() ->> 'sub')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**RLS Policy Rules:**
1. **Admins:** Full permissions (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on all dossier and academic tables via `public.is_admin()`.
2. **Students:** Read-only (`SELECT`) on their own records only (`student_id = public.current_student_id() AND is_visible = true`).
3. **No Student Writes:** Absolutely **no** `INSERT`, `UPDATE`, or `DELETE` policies exist for students on any dossier or academic table.
4. **Audit Log:** Insert-only and read-only for admins (`is_admin()`). Completely inaccessible to students.

### 6.4 Private Storage Bucket: `student-certificates`
- **Bucket ID:** `student-certificates` (Private, `public = false`)
- **File Limit:** 10MB maximum per file.
- **Allowed MIME Types:** `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- **Access Protocol:** Signed URLs generated on-demand by backend API (`db.getSignedCertificateUrl`).
- **Storage RLS:** Admins have full access; students can only download objects where they own the associated visible certificate record.

### 6.5 Companies Table (In-Memory + Supabase)
```sql
-- Company / Corporate Recruiter accounts (in-memory store with Supabase persistence)
-- Schema used by initCompanyDb(), getCompanyByEmail(), getCompanyById(), createCompany(), getAllCompanies()
CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,                        -- e.g. 'comp-1791354383460-9f8ey'
  company_name TEXT NOT NULL,                 -- e.g. 'Google LLC'
  recruiter_name TEXT NOT NULL,               -- e.g. 'Google Campus Talent'
  email TEXT NOT NULL UNIQUE,                 -- Normalized lowercase corporate email
  password_hash TEXT,                         -- PBKDF2-SHA256 hash (NULL for Google OAuth accounts)
  auth_provider TEXT NOT NULL DEFAULT 'email', -- 'email' | 'google'
  industry TEXT DEFAULT 'Corporate Recruitment', -- e.g. 'Cloud & AI Technology'
  avatar_url TEXT,                            -- UI Avatars fallback or custom avatar
  role TEXT NOT NULL DEFAULT 'COMPANY',        -- Always 'COMPANY'
  status TEXT NOT NULL DEFAULT 'ACTIVE',        -- 'ACTIVE' | 'DISABLED'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Default Seeded Companies (via `initCompanyDb()` in `db.js`):**
| ID | Company | Email | Auth Provider | Industry |
|---|---|---|---|---|
| `comp-google-001` | Google LLC | `recruiter@google.com` | google | Cloud & AI Technology |
| `comp-msft-002` | Microsoft Corporation | `recruiter@microsoft.com` | google | Enterprise Software & Azure |
| `comp-tcs-003` | Tata Consultancy Services | `campus@tcs.com` | email | IT Consulting & Services |

**Default Password:** `Company@RIMT#2026` (PBKDF2-SHA256, salt: `rimt-salt-key`, 10,000 iterations)

---

## 7. Admin-Managed Student Dossier & Strict Manual Academic Control Specification

### 7.1 Architecture & The 7 Dossier Sections
The Student Dossier (`StudentDossierModal.jsx`) provides a unified, structured control center for administrators, accessible from both `StudentManagement.jsx` ("Open Dossier" button on each row) and `OnboardingApprovals.jsx`:
1. **Overview:** Student hero banner, official avatar, legal name, roll number, department, batch, status badge, contact details (phone, address, portfolio URLs), narrative bio, and professional skills tags.
2. **Projects:** Custom featured projects with title, role, dates, tech stack tags, repository/demo URLs, visibility toggle (`is_visible`), and drag-and-drop sort order.
3. **Git Projects:** Tracked GitHub repositories with language badges, stars, forks, repo URLs, and visibility controls.
4. **Certificates:** Verified credentials with issuing organization, issue/expiration dates, credential ID/URL, file upload to private `student-certificates` bucket, signed URL previewer, and visibility controls.
5. **Internships:** Industry training records with company name, role, status (`ongoing`, `completed`, `offered`), dates, stipend, mentor details, and visibility controls. Synchronized with `InternshipMonitoring.jsx`.
6. **Academics:** Comprehensive manual academic control panel featuring:
   - **Cumulative Summary:** CGPA (0.00 – 10.00), Overall Attendance % (0.00 – 100.00), Active Backlogs count, Total Credits Earned, and Registrar Remarks.
   - **Semester Records:** Semester-by-semester SGPA, attendance percentage, credits registered, and credits earned.
   - **Subject Grade Roster:** Tabular grid to enter subject codes, subject names, letter grades (O, A+, A, B+, B, C, P, F, AB), and numeric grade points.
7. **Activity Log:** Real-time tamper-evident audit trail read from `admin_audit_log`, displaying timestamp, actor name, action performed, entity modified, and JSON old vs. new diff.

### 7.2 Strict Manual-Only Academic Policy (Anti-Automation Policy)
Per institutional governance and registrar guidelines:
- **Exclusively Admin-Authored:** CGPA, overall attendance %, backlogs, semester SGPA, and subject grades are written **exclusively by human administrators**.
- **Zero Automated Derivation:** There are **NO** database triggers, **NO** background cron recalculations, **NO** edge functions, and **NO** client-side automated average computations.
- **Independence of Fields:** Modifying or adding a subject grade does **NOT** recalculate or overwrite semester SGPA or cumulative CGPA. Adding attendance elsewhere does **NOT** overwrite stored attendance.
- **Unset Values Display "—":** Missing or unset academic values display strictly as a dash (`—`). The system never seeds fake default scores (such as 0 or 8.65).
- **Client & Server Boundary Validation:**
  - `CGPA`: Numeric between `0.00` and `10.00`.
  - `Attendance`: Numeric between `0.00` and `100.00`.
  - `Backlogs`: Non-negative integer (`>= 0`).
  - `Credits`: Non-negative numeric (`>= 0`).
- **Confirm-Before-Save Modal:** Any changes to academic fields trigger a modal displaying an **Old Value vs. New Value** comparison diff that requires explicit administrator confirmation before persisting.
- **Audit Logging:** Every academic change commits a row to `admin_audit_log` with `old_values` and `new_values`.

### 7.3 Automation Removed / Disabled
1. **Hash-Based Fake CGPA:** Removed `8.15 + (hashSum % 170) / 100` synthetic CGPA derivation from `src/lib/db.js`.
2. **Hardcoded Fallbacks:** Removed `data.cgpa || 8.65` fallback from `src/lib/db.js` and UI modals.
3. **Synthetic Attendance Percentage:** Removed hardcoded `94.8%` attendance fallback from `src/views/StudentManagement.jsx`.
4. **Auto-Calculated SGPA:** Removed synthetic semester score averaging scripts.

### 7.4 Cross-Module Integrations
- **`StudentManagement.jsx`:** Added live `CGPA` and `Attendance` table columns, "Open Dossier" button on every row, live CGPA/attendance badges in the detail drawer, and mounted `<StudentDossierModal>`. Data is fed directly from `student_academic_summary` via `getAllStudentAcademicSummaries()`.
- **`InternshipMonitoring.jsx`:** Wired to `/api/admin/internships` to display live industrial internships created or updated in the dossier.
- **`ReportGeneration.jsx` & Placement Statistics:** Consume `student_academic_summary`, `student_semester_records`, and `student_grades` as-is with zero recomputation.

### 7.5 Assumptions & Policy Decisions (Resolved §14)
1. **Student Write Access:** Students have **zero write access** to dossier and academic tables (enforced by RLS and API boundaries).
2. **Non-Approved Students:** Pending, Rejected, and Revoked students are read-only; dossier editing is restricted to Approved scholars.
3. **Grade Scale:** Supports both free-text letter grades (e.g., `A+`) and numeric grade points (e.g., `9.00`).
4. **Deletions:** Hard delete with automatic logging in `admin_audit_log`.

---

## 8. Immediate Session Revocation & Lockout Strategy
To ensure that an active session is revoked **immediately** when an administrator rejects or bars a student:
1. **Live Database Status Verification:** The `withAuth` route guard does **not** rely solely on static JWT token claims. On every authenticated API call, it queries the database for the user's live status.
2. **Immediate 403 Response:** If the user's status is `REJECTED`, `REVOKED`, or `PENDING`, the request is halted with `HTTP 403 Forbidden` (`ACCOUNT_REJECTED`, `ACCOUNT_REVOKED`, or `ACCOUNT_PENDING`).
3. **Reactive Client Eviction:** Both web and mobile applications immediately clear cached credentials upon receiving a 403 status revocation and transition the user to the `RejectedScreen` or `PendingApprovalScreen`.

---

## 9. Environment Variables

### Admin Panel (`ADMIN-PANEL-RIMT/.env`)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://pwghazyfxhypzkadqfnn.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=<anon-key>

# Cloudinary Config (used by /api/cloudinary/sign endpoint)
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>    # ⚠️ SERVER-ONLY — Never expose in EXPO_PUBLIC_*
```

### Admin Panel (`.env.local` — optional override)
```env
NEXT_PUBLIC_SUPABASE_URL=https://pwghazyfxhypzkadqfnn.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=<anon-key>
```

---

## 10. Feature Status Table

| Feature | Implementation Files | Status |
|---|---|---|
| **Admin Panel Authentication** | `src/components/auth/*`, `src/app/api/admin/auth/*`, `src/lib/authApi.js`, `src/lib/middleware.js` | ✅ Complete (NEW-FEATURE.md Done) |
| **Admin Profile & Password Change** | `src/views/ProfileTab.jsx`, `src/components/profile/*`, `src/app/api/admin/auth/change-password` | ✅ Complete |
| **Dynamic Dashboard Header & Menu**| `src/components/Header.jsx`, `src/components/profile/ProfileMenu.jsx` | ✅ Complete |
| **Gated Student Signup** | `src/app/api/auth/signup/route.js`, `APP-RIMIT/src/screens/SignInScreen.jsx` | ✅ Complete |
| **Gated Login & Access Control** | `src/app/api/auth/login/route.js`, `src/lib/middleware.js` | ✅ Complete |
| **Admin Onboarding Approvals View**| `src/views/OnboardingApprovals.jsx`, `src/components/Sidebar.jsx` | ✅ Complete |
| **Approve / Reject / Revoke Handlers** | `src/app/api/admin/requests/[id]/*` | Code complete; production writes also require a production admin-session issuer |
| **Real-Time Mid-Session Eviction** | `src/lib/middleware.js`, `tests/onboarding.test.mjs` | ✅ Complete |
| **Protected Profile Endpoint** | `src/app/api/profile/route.js` | ✅ Complete |
| **Next.js Production Build** | `package.json`, `jsconfig.json`, Next.js 16.3.8 | ✅ Production build verified |
| **Automated Unit Test Suites** | `tests/dossier-academic.test.mjs` (26/26), `tests/onboarding.test.mjs` (21/21), `tests/admin-auth.test.mjs` (18/18) | ✅ 65/65 passed; full lifecycle test coverage |
| **Live Supabase review write** | `src/lib/db.js`, `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_KEY` | ✅ Fixed: Falls back to project key, writes supported table columns (`status`, `updated_at`), avoiding PGRST204 "Student record not found" errors |
| **Student Photo Verification** | `src/views/OnboardingApprovals.jsx`, `src/views/StudentManagement.jsx` | ✅ Displays student profile picture (`avatar_url`) in queue, modal, and directory |
| **Fixed Admin Accounts** | `src/app/api/admin/auth/signup/route.js`, `src/app/api/admin/auth/login/route.js`, `src/lib/db.js`, `src/components/auth/AuthScreen.jsx` | ✅ Complete — Signup disabled, only Raj Kumar & Sagrika can sign in via PBKDF2 credentials |
| **Admin-Managed Student Dossier** | `src/components/student/StudentDossierModal.jsx`, `src/views/StudentManagement.jsx`, `src/views/InternshipMonitoring.jsx`, `src/app/api/admin/requests/[id]/route.js`, `src/app/api/admin/internships/route.js` | ✅ Complete — 7-section unified dossier, CRUD, reorder, visibility toggle, private certificate bucket with signed URLs, PDF export layout |
| **Strict Manual Academic Control** | `src/components/student/StudentDossierModal.jsx`, `src/lib/db.js`, `supabase/migrations/20260930_admin_student_dossier.sql` | ✅ Complete — Strict anti-automation policy, CGPA/attendance/backlogs/SGPA/grades manual-only, confirm-before-save old vs new diff modal, tamper-evident audit logging |
| **Real-Time Bidirectional Sync & Desert Dossier Theme** | `src/lib/supabaseClient.js`, `src/components/student/StudentDossierModal.jsx`, `src/views/StudentManagement.jsx` | ✅ Complete — Realtime Supabase publication for all dossier tables and student records, instant bidirectional UI sync, warm desert theme (#FAF6F0) and WhatsApp-style human silhouette avatar demo |
| **LinkedIn-Style Scholar Dossier** | `src/components/student/StudentLinkedInProfileModal.jsx`, `src/views/StudentManagement.jsx`, `src/views/OnboardingApprovals.jsx` | ✅ Complete — Hero banner, bio, CGPA/SGPA tracker, projects portfolio, documents vault, live admin overrides |
| **Cloudinary Upload Signing** | `src/app/api/cloudinary/sign/route.js`, `.env` (CLOUDINARY_*) | ✅ Complete — Server-side SHA-1 signature generator, CORS-enabled, folder validation, mobile app integration via `EXPO_PUBLIC_CLOUDINARY_SIGNING_URL` |
| **Talent Showcase (formerly Company Management)** | `src/views/CompanyManagement.jsx`, `src/components/student/TalentProfileModal.jsx`, `src/components/Sidebar.jsx`, `src/constants/tokens.js`, `src/lib/db.js` | ✅ Complete — Recruiter-facing student portfolio gallery with profile strength scoring, filter pills, department filters, sort options, grid/list views, and read-only TalentProfileModal. Sidebar and module registry renamed from "Company Management" to "Talent Showcase" with `person_search` icon. |
| **Student Profession Badges** | `src/components/placement/PlacedStudentsCard.jsx`, `src/lib/placementStats.js` | ✅ Complete — Color-coded profession pills (Cyber Security, Cloud DevOps, Full Stack, FinTech, Risk Analyst, Dance, Music) with matching icons via `getProfessionBadge()`. Dynamic fallback profession resolution for diverse BCA/BSc specializations and custom talents (dancer, singer, etc.). |
| **Official SVG Company Logos** | `src/components/common/CompanyBrandLogo.jsx`, `src/components/placement/PlacedStudentsCard.jsx`, `src/components/placement/HiringCompaniesSection.jsx` | ✅ Complete — Self-contained SVG vector brand logos for Google, Microsoft, AWS, Deloitte, HDFC Bank, TCS (plus L&T, Infosys, Wipro). Zero external URL dependencies; immune to CORS/Wikimedia 403 errors. |
| **Multi-Account Session Isolation** | `src/lib/middleware.js`, `src/lib/authApi.js`, `src/components/auth/AuthGuard.jsx`, `src/components/auth/AuthScreen.jsx`, `src/components/profile/ProfileMenu.jsx`, `src/components/profile/AddAccountModal.jsx` | ✅ Complete — Gmail-style account chooser, 1-click sign-in, multi-account dropdown in profile menu, `isSameAdminAccount` session guards, token priority over stale cookies |
| **Dual-Portal Auth (Admin + Company)** | `src/components/auth/AuthScreen.jsx`, `src/components/auth/AuthGuard.jsx`, `src/app/api/company/auth/*` (5 routes), `src/lib/db.js` (company CRUD), `src/lib/authApi.js` (company client), `src/lib/middleware.js` (company role guard) | ✅ Complete — Segmented Admin/Company portal switcher, company registration (email/password), sign-in, Google OAuth with One-Tap modal, JWT sessions with httpOnly cookies, 3 seeded companies (Google, Microsoft, TCS) |
| **Company Role-Based Access Control** | `src/components/Sidebar.jsx`, `src/app/page.jsx`, `src/app/company/page.jsx`, `src/app/company/auth/page.jsx` | ✅ Complete — `companyAllowedModules = ['companies', 'statistics']`, locked modules show 🔒 + "Staff" badge, `CompanyLockedModuleView` with access privileges card, company sidebar brand card adapts blue theme, dedicated `/company` and `/company/auth` routes |
| **Expo Mobile Admin Screens** | `src/expo/AdminPortalNavigator.jsx`, `src/expo/screens/*`, `src/expo/colors.js` | ✅ Present — 7 mobile admin screen components (Student, Company, Drive, Internship, Placement, Training, Report) |
| **Branded Session Loader** | `src/components/common/SessionLoader.jsx`, `src/styles/globals.css`, `src/components/auth/AuthGuard.jsx`, `src/app/loading.jsx` | ✅ Complete — Matched login animation (2.2s `logoElasticCycle` + white sweep + shockwaves), single FCP clock, fixed overlay mounting with zero blank screen |
| **Zero-Irritation Refresh Suppression** | `src/components/auth/AuthGuard.jsx`, `src/styles/globals.css`, `src/app/layout.jsx` | ✅ Complete — Repeated browser refresh triggers zero animation/loader flicker via `rimt_loader_seen`, synchronous `<head>` attribute, and CSS `display: none !important;`. First-time visit and post-login verification animation preserved. |
| **Drive Management Operations Suite** | `src/views/DriveManagement.jsx`, `src/components/drive/*` (8 components), `src/lib/driveClient.js`, `src/lib/driveUtils.js`, `drive.md` | ✅ Complete — 4 core capabilities: Upcoming drive creation, registration links, broadcast announcements with student mobile app notifications, round-by-round results, zero mock data. |
| **CVForge AI Resume Builder Integration** | `RESUMEE.md`, paired student app (`APP-RIMT-BCA`) | ✅ Complete — 4 ATS-certified templates (`navy_ledger`, `richard_sanchez`, `herman_walton`, `sunny_singh`), direct Android Intent vector PDF launch. |

---

## 11. Changelog
- **2026-10-20 (Zero-Irritation Refresh Animation Suppression & Drive Management Master Memory Update):**
  - **Browser Refresh Animation Guard:** Resolved user-irritation issue where repeatedly pressing the browser's round refresh button (🔄) re-triggered the full 2.2s logo bounce, sheen, shockwaves, and spinner overlay.
  - Implemented session persistence via `sessionStorage.getItem('rimt_loader_seen')` and inline `<head>` script in `src/app/layout.jsx` that sets `data-rimt-loader="seen"` before any HTML is parsed.
  - Enforced instantaneous CSS rule in `src/styles/globals.css`: `html[data-rimt-loader="seen"] .rimt-loader { display: none !important; ... }` preventing any loader flash at 0ms.
  - In `src/components/auth/AuthGuard.jsx`, when `isSeen` is true on repeat reload: synchronously set `setMinElapsed(true)`, `setLoaderExited(true)`, restore cached user from `localStorage.getItem('rimt_admin_user')`, and set `sessionReady = true` immediately so the Admin Dashboard renders without delay.
  - First-time visit behavior fully preserved: clean browser tabs or initial links from Google/localhost run the branded 2.2s `SessionLoader` animation once and mark it as seen.
  - Login verification animation fully preserved: `handleSignOut` clears the flag, and `handleAuthenticated` triggers `SplashVerificationScreen` (red dot → green checkmark sequence).
  - **Drive Management Module Full Integration:** Integrated the complete 8-component suite (`DriveFormModal`, `DriveDetailDrawer`, `DriveCard`, `AnnouncementsPanel`, `RegistrationLinksPanel`, `ResultsPanel`, `StatusBadges`, `NotifyConfirmModal`), client `driveClient.js`, and utils `driveUtils.js` with zero mock data governance into `ADMIN.md`.
  - **Full Repository Memory Ingestion:** Enriched `ADMIN.md` with complete directory inventory, configuration files, test suites (146/146 tests passing), and CVForge resume builder synchronization specs.

- **2026-10-20 (Session Loader: matched login animation, single clock, no blank handoff, trimmed duration):**
  - Matched login animation: Cloned exact visual and motion spec from institutional admin login animation (`SplashVerificationScreen` in `AuthGuard.jsx:296`), including `logoElasticCycle` elastic bounce (1 → 0.55 → 1.24 → 0.96 → 1), `logoWhiteSweep` sheen, dual shockwave rings, and dual-spinner frosted status pill.
  - Refined duration per user request: Reduced total animation time frame by 0.6s from 2.8s to 2.2s (`MIN_LOADER_MS` reduced from 2500ms to 1900ms, `logoElasticCycle` accelerated from 2.8s to 2.2s, sheen sweep to 2.0s, shockwave cycle to 2.4s) while fully preserving the exact visual branding, colors, and elastic bounce physics.
  - Fixed 6-7s duration: Implemented single mount-only clock anchored to First Contentful Paint (`MIN_LOADER_MS = 1900` + `FADE_MS = 300` = `T_anim = 2200ms`), ensuring `loading.jsx` remains timerless and eliminating multiple sequenced clocks.
  - Fixed blank screen handoff: Rebuilt rendering architecture so `children` and `AuthScreen` mount directly underneath the opaque `z-[9999]` fixed loader overlay upon session check resolution; the overlay then fades out over 300ms when `minElapsed` is reached, guaranteeing no blank frame ever occurs.

- **2026-10-18 (Internship Opportunities & Live Monitoring Module Overhaul — INTERNSHIP.md Complete):**
  1. **Strict Real-Data Architecture & Zero Synthetic Dummy Mock Elimination:**
     - Completely scrubbed all hardcoded mock/dummy internship listings (Samsung, 32,500 INR, Aman Sharma, Harpreet, Simranjeet, 312/248 counts) from `src/constants/data.js`, `src/views/InternshipMonitoring.jsx`, and `src/expo/screens/InternshipMonitoringScreen.jsx`.
     - In-memory fallback and database state strictly starts at 0 records. Clean, unseeded zero-state with institutional empty-state cards.
     - Live Supabase Realtime synchronization across `internship_opportunities` and `student_internships` with instant UI auto-refresh.
  2. **Database Schema & Constraints (`supabase/migrations/20261018_internship_opportunities.sql`):**
     - Created `public.internship_opportunities` table with strict data integrity checks:
       - `duration_months`: constrained `CHECK (duration_months BETWEEN 1 AND 24)`.
       - `compensation_type`: constrained `CHECK (compensation_type IN ('stipend', 'non_stipend', 'paid'))`.
       - **Mutual Exclusivity Enforced at DB Level:** `CHECK ((compensation_type = 'stipend' AND stipend_amount IS NOT NULL AND stipend_amount > 0 AND fee_amount IS NULL) OR (compensation_type = 'paid' AND fee_amount IS NOT NULL AND fee_amount > 0 AND stipend_amount IS NULL) OR (compensation_type = 'non_stipend' AND stipend_amount IS NULL AND fee_amount IS NULL))`.
       - `season`: constrained `CHECK (season IN ('winter', 'summer', 'spring', 'autumn', 'any'))`.
       - `status`: constrained `CHECK (status IN ('open', 'draft', 'closed', 'filled'))`.
       - `skills_required` (text[]), `department` (text[]), `is_visible` (boolean).
       - Full RLS policies for admin write/manage and public/authenticated read.
  3. **Shared Validation Engine (`src/lib/internshipValidation.js`):**
     - Canonical validation logic used identically by server route handlers and client-side modal forms: `validateOpportunity()`, `normalizeSkills()`, `sanitizePayload()`.
     - De-duplicates and normalizes case-insensitive skills arrays.
  4. **Data Layer & CRUD Functions (`src/lib/db.js`):**
     - Added `getInternshipOpportunities(filters)` with rich multi-filter query support (search `q`, `skills`, `duration`, `season`, `compensation`, `company`, `department`, `status`, `sort`).
     - Added `getInternshipOpportunityById(id)`, `createInternshipOpportunity(data, actor)`, `updateInternshipOpportunity(id, updates, actor)`, `deleteInternshipOpportunity(id, actor)`, `toggleInternshipOpportunityVisibility(id, actor)`, and `getStudentInternshipsFeed()`.
     - Audit logging: Every mutation automatically creates an entry in `public.admin_audit_log` tracking the actor and payload changes.
  5. **REST API Endpoints (`src/app/api/admin/internship-opportunities/*`):**
     - `GET /api/admin/internship-opportunities`: Search & filter opportunities with dynamic aggregations.
     - `POST /api/admin/internship-opportunities`: Role-gated admin insertion with schema validation and audit logging.
     - `GET /api/admin/internship-opportunities/[id]`: Individual opportunity lookup.
     - `PATCH /api/admin/internship-opportunities/[id]`: Partial edits and visibility toggle.
     - `DELETE /api/admin/internship-opportunities/[id]`: Opportunity deletion with audit record.
     - **Role Security Guard:** Strictly prevents non-admins and `COMPANY` recruiter role users from modifying opportunities (HTTP 403 `FORBIDDEN_ROLE`).
  6. **Modular UI Components (`src/components/internship/` & `src/views/InternshipMonitoring.jsx`):**
     - **`OpportunityCard.jsx`:** Rich card presentation with company logo/monogram, role, department badges, duration & season indicators, stipend/paid currency formatting, skills tags, status pill, visibility toggle, edit/delete actions, and hover-zoom micro-interactions (`hover:scale-[1.01] transition-all`).
     - **`OpportunityFormModal.jsx`:** Comprehensive modal with live validation, compensation exclusivity toggle (stipend vs paid training fee), duration slider & presets, season selector, skill tags input with backspace removal, application deadline, and department multi-select.
     - **`InternshipFilters.jsx`:** Full-width edge-to-edge responsive filter toolbar. Compensation (4 options), Season (5 options), and Duration (6 options) filter buttons are arranged in responsive grids (`grid-cols-2 sm:grid-cols-4`, `grid-cols-2 md:grid-cols-5`, `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`) spanning 100% of the available width from label to the far right margin. "Paid (Student Pays)", "Autumn", and "Other" span cleanly to the right edge with zero unused void space. Hover-zoom micro-interactions refined to `scale(1.035)` with centered label & icon typography. Dynamic skill filtering with local search and expand/collapse.
     - **`StudentInternshipCard.jsx`:** Live student internship card with status, academic details, and 1-click LinkedIn-style dossier inspection.
     - **`InternshipMonitoring.jsx`:** Rebuilt view with dual-tab architecture (Opportunities vs Live Student Internships), real-time KPI metrics, search, sorting, grid/list view toggles, empty state with "Post First Opportunity" CTA, and delete confirmation dialog.
  7. **Automated Testing Suite (`tests/internship-opportunities.test.mjs`):**
     - 57 dedicated unit and integration tests covering: clean in-memory zero-state, mutual exclusivity validation, duration and season bounds, skills normalization and de-duplication, full CRUD and audit logging, multi-filter combination queries, and role-based security gating.
     - 100% pass rate: 57/57 tests passing. Full repository test suite: 146/146 tests passing (Onboarding: 21, Admin Auth: 18, Dossier: 26, Company Auth: 24, Internship: 57).
- **2026-10-07 (Company Sidebar Locked Tabs Removal, Multi-Account Chooser Isolation, and Balanced Auth Gateway Status):**
  1. **Company Sidebar Cleanup (Problem 1 Solved):**
     - Updated `src/components/Sidebar.jsx` navigation renderer: When `userRole === 'COMPANY'`, `navItems` is strictly filtered with `companyAllowedModules.includes(item.id)`.
     - In the left sidebar under "Core Modules", corporate recruiters now only see the 2 modules they have access to: **Company Management** and **Placement Statistics**. All 6 locked/restricted modules (Onboarding Approvals, Student Management, Drive Management, Training Management, Internship Monitoring, Report Generation) are completely removed from the DOM.
  2. **Profile Menu Multi-Account Switcher Role Isolation (Problem 2 Solved):**
     - In `src/components/profile/ProfileMenu.jsx`, filtered `otherAccounts` strictly by account role (`isCompany ? accIsCompany : !accIsCompany`).
     - Corporate recruiters logged in as a company now only see other corporate company accounts in the "Switch Account" menu (admin accounts like Raj Kumar or Sagrika are completely filtered out).
     - Administrators logged in now only see other administrator accounts in the "Switch Account" menu (company accounts like Microsoft or Google are completely filtered out).
     - "Add another account" dynamically routes to `/company/auth` for company recruiters and `/admin/add-account` for administrators.
     - Updated `handleSwitchAccount` in `src/components/auth/AuthGuard.jsx` to seamlessly support switching into company accounts via `companyLogin` credential fallback.
  3. **Auth Screen Multi-Account Chooser Isolation & Balanced Gateway Status (Problem 3 Solved):**
     - In `src/components/auth/AuthScreen.jsx`, strictly segmented saved accounts into `adminSavedAccounts` and `companySavedAccounts`.
     - **Institutional Admin Gateway:** The "Choose an account" screen now only renders authorized administrator accounts (`Raj Kumar`, `Sagrika`). Corporate company accounts are completely filtered out.
     - **Company Portal Gateway:** Introduced a dedicated corporate account chooser that only renders corporate company accounts (`Microsoft Corporation`, `Google LLC`, `TCS`). Institutional admin accounts are completely filtered out.
     - **Balanced Gateway Status:** Replaced the asymmetric, redundant second-row switch button (`Administrative Access Gateway` on left vs `Company Access ->` on right) with a clean, beautifully centered, balanced gateway status indicator badge with micro-status pills for both Institutional Admin and Corporate Recruiter gateways.
     - Full automated test suite passing (63/63 tests) and Next.js Turbopack production build verified cleanly.
- **2026-10-07 (Student Profession Badges, Official SVG Company Logos in Placed Students Card, Multi-Account Session Isolation, Corporate Logos & Gmail-Style Account Chooser):**
  1. **Student Profession Badges in Placed Students Card:**
     - Added `getProfessionBadge()` function to `src/components/placement/PlacedStudentsCard.jsx` — returns distinct icon + color badge for each profession category:
       - 🛡 **Cyber Security** → emerald green (`shield` icon)
       - ☁ **Cloud / DevOps / AWS / Azure** → sky blue (`cloud` icon)
       - 💻 **Developer / SDE / Full Stack / Software** → indigo (`code` icon)
       - 💃 **Dance / Dancer** → pink (`directions_walk` icon)
       - 🎶 **Singing / Music / Artist** → purple (`music_note` icon)
       - 📊 **Risk / Consultant / Analyst** → amber (`query_stats` icon)
       - 🏦 **FinTech / Finance / Banking** → teal (`account_balance` icon)
       - 🏷 **Default** → slate (`badge` icon)
     - Each student row now displays their profession as a colorful pill badge next to their verified checkmark.
     - Profession data flows from `src/lib/placementStats.js` → `getHiringPairForStudent()` → `getLivePlacedStudents()` → `item.student.profession`.
  2. **Official SVG Company Logos in Placed Students Card:**
     - Replaced external `logoUrl` image tags and generic Material Symbol fallbacks with `<CompanyBrandLogo company={item.company} />` — self-contained SVG vectors.
     - Created `src/components/common/CompanyBrandLogo.jsx` with official vector logos for Google, Microsoft, AWS, Deloitte, HDFC Bank, TCS, L&T, Infosys, and Wipro. Dynamic monogram fallback for unknown companies.
     - All SVGs are inline, responsive, CORS-immune, and never 403 on external hotlinks.
  3. **Enhanced Profession Resolution in `placementStats.js`:**
     - Added dynamic profession detection for diverse BCA/BSc specializations and custom talents (dancers, singers, musicians, etc.).
     - Fallback profession is now department-aware: Cyber Security dept → `Cyber Security Specialist`, IT dept → `Enterprise IT Systems Engineer`, BCA/Computer dept → `Full Stack Software Developer`.
     - Custom student professions (from `student.profession`, `student.headline`, or `student.bio`) are preserved and take priority.
  4. **Fixed Session Reversion Bug (Sagrika → Raj Kumar):**
     - Diagnosed and resolved root cause where clicking actions as administrator **Sagrika** reverted session to **Raj Kumar**.
     - In `src/lib/middleware.js`, updated `extractToken(req)` to prioritize the explicit `Authorization: Bearer <token>` header over stale client cookies.
     - In `withAuth`, verified individual JWT tokens and bound `req.user` to the decoded administrator identity before evaluating development fallback logic (`isPortalAdmin`), preventing `x-admin-portal: true` headers from hardcoding `Raj Kumar`.
     - In `src/lib/authApi.js` (`getAdminMe`) and `src/components/auth/AuthGuard.jsx`, added active session matching guards (`isSameAdminAccount`) so background authentication revalidations cannot overwrite the currently active administrator.
  5. **Official Corporate Brand Vector Logos (Hiring Companies Section):**
     - Replaced generic Material Symbol placeholder icons with authentic, high-fidelity SVG brand logos in `src/components/placement/HiringCompaniesSection.jsx`:
       - **Google India Pvt Ltd:** Official 4-color Google "G" vector logo.
       - **Microsoft Corporation India:** Official 4-color square vector logo.
       - **Amazon Web Services (AWS):** Official AWS smile arrow vector badge.
       - **Deloitte USI:** Official Deloitte wordmark with lime green dot.
       - **HDFC Bank Ltd:** Official blue & red geometric cross grid logo.
       - **Tata Consultancy Services (TCS):** Official Tata blue brand emblem.
       - Built-in vector support for **L&T**, **Infosys**, and **Wipro**, plus dynamic monogram fallbacks.
     - Embedded SVGs are completely self-contained, fully responsive, and immune to external CORS/Wikimedia 403 hotlink errors.
  6. **Gmail-Style Account Chooser & 1-Click Sign-In:**
     - In `src/components/auth/AuthScreen.jsx`, introduced a **Gmail-Style Account Chooser** screen when remembered accounts exist on the device.
     - Displays avatar, name, email, and role badge (`HOD BCA`, `Vice HOD BCA`).
     - **1-Click Instant Sign-In:** Clicking an account signs in immediately without repeatedly typing username and password.
     - Includes "Use another account" button to toggle manual credential form, and "Remove an account" device management.
  7. **Multi-Account Dropdown & Session Preservation:**
     - In `AuthGuard.jsx`, `handleSignOut` preserves accounts in `rimt_admin_accounts` instead of deleting them.
     - In `ProfileMenu.jsx`, dynamically lists other logged-in accounts under the active session header with 1-click switching.
     - Fixed `isSameAdminAccount` in `src/lib/authApi.js` so accounts with `email: null` are never accidentally overwritten.
  8. **Dedicated Full-Page Add Account Route (`/admin/add-account`):**
     - Created `src/components/profile/AddAccountModal.jsx` with RIMT crest, sweep sheen animation, Sign In / Register tabs, password strength meter, and quick-switch account cards.
  9. **Interactive Google Maps Links:**
     - Converted location badges (Karnataka, Telangana, Punjab, etc.) and geographical campus cards in `HiringCompaniesSection.jsx` into clickable Google Maps search links.
   10. **Syntax Fix in `placementStats.js` & Turbopack API Verification:**
      - Resolved `Expected ';', got ':'` Turbopack compilation error at `src/lib/placementStats.js:320` caused by duplicate object properties and redundant closing braces on the `student` payload in `getLivePlacedStudents()`.
      - Validated syntax with `node -c` and verified live API response from `/api/placement-stats/placed-students` returning HTTP 200 with dynamic student profession badges and verified company corporate data.
- **2026-10-05 (Company Management & Talent Profile Enhancements):**
  1. **Sidebar & Module Registry Restoration:** Replaced "Talent Showcase" with "Company Management" in `src/components/Sidebar.jsx` and `src/constants/tokens.js`, binding with the `business` icon and corporate directory descriptors. Updated action ribbon and hero headers in `src/views/CompanyManagement.jsx`.
  2. **Glossy Light Red "View Full Profile" Button & Glossy KPI Cards:** Re-styled the "View Full Profile" CTA on student talent cards into a glossy light red card/button (`h-9 w-full rounded-xl`, glassmorphic light red gradient, crisp crimson typography, glossy light reflection sweep). Re-styled the three mini KPI cards (Projects, Internships, Certificates) with high-gloss gradients, inset highlights, and clean borders while preserving exact compact dimensions.
  3. **Custom Banner & Blue/White Gradient Fallback:** Updated the banner behind student profile cards (`src/views/CompanyManagement.jsx` and `src/components/student/TalentProfileModal.jsx`). Displays student's custom banner image from real database (`banner_url`) when set, and seamlessly falls back to a modern blue and white color gradient banner with radial highlights when unset or if an image error occurs.
  4. **Scroll-Spy Tab Navigation:** Implemented bidirectional scroll-spy in `src/components/student/TalentProfileModal.jsx`. As the user scrolls through the modal, the active tab smoothly updates from **About → Skills → Projects → (Experience) → Certificates → Academics**. When scrolling back up, active tabs smoothly reverse back to About. Smooth auto-centering of active tab button and smooth scrolling on tab click without jitter.
  5. **Strict Real Data Governance:** Academic Record section always renders real Supabase backend metrics (CGPA, Attendance %, Score %, Semester/Batch, Department, Roll Number, Dean's Honors List) with "—" for unset registrar fields — zero fake or dummy data.
- **2026-10-05 (Talent Showcase — Recruiter-Facing Student Portfolio Gallery):**
  1. **New Component — `TalentProfileModal.jsx`:** Created `src/components/student/TalentProfileModal.jsx` (918 lines) — a read-only, recruiter-facing student portfolio viewer. Features: About section, Tech Stack & Skills with deterministic color-coded skill tags, Featured Projects with tech stack/demo links, Certificates with issuing org and dates, Internships with company/role/status, and a Profile Strength gauge (Exceptional/Strong/Developing/Starter). Designed for corporate recruiter consumption with no admin editing capabilities.
  2. **`CompanyManagement.jsx` → Talent Showcase:** Completely rebuilt `src/views/CompanyManagement.jsx` from a static corporate directory into a live, data-driven student talent gallery. Fetches all `APPROVED`/`VERIFIED` students from `/api/admin/requests?status=ALL` with 8-second auto-refresh. Features: profile strength scoring (0-100%), filter pills (All Talent, Exceptional, Strong, Projects, Internships, Certified), department dropdown filter, sort options (strength, name, projects, recent), grid/list view toggle, student portfolio cards with avatar, headline, skills tags, and strength progress bar.
  3. **Sidebar Rename:** Updated `src/components/Sidebar.jsx` — sidebar entry changed from `label: 'Company Management'` / `icon: 'domain'` to `label: 'Talent Showcase'` / `icon: 'person_search'`.
  4. **Module Registry Rename:** Updated `src/constants/tokens.js` — MODULES entry changed from `{ id: 'companies', label: 'Company Management', icon: 'business', shortDesc: 'Corporate Relations & Directory' }` to `{ id: 'companies', label: 'Talent Showcase', icon: 'person_search', shortDesc: 'Student Profiles for Companies' }`.
  5. **DB Layer Enhancement:** Added `getAllStudentInternships()` function to `src/lib/db.js` — aggregates internship records across all approved students by parsing `students.internships` JSONB array and `admin_notes.internships` fallback, enriching each with `student_name`, `student_roll`, and `student_department` metadata.
- **2026-10-03 (Cloudinary Upload Signing Endpoint & Cross-Project Integration):**
  1. **Cloudinary Signing API:** Added `src/app/api/cloudinary/sign/route.js` — `POST` endpoint generates SHA-1 upload signatures using `CLOUDINARY_API_SECRET`. Validates folder format via regex, returns `{ signature, timestamp, api_key, cloud_name, folder }`. `OPTIONS` handler returns CORS preflight with `Access-Control-Allow-Origin: *`.
  2. **Environment Configuration:** Added `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to `.env`. Created `.env.example` documenting server-only Cloudinary secrets.
  3. **LinkedIn Profile Document Upload:** `StudentLinkedInProfileModal.jsx` updated to use `/api/cloudinary/sign` for admin-side document uploads to Cloudinary with roll-number-scoped folders.
  4. **Mobile App Integration:** Configured `EXPO_PUBLIC_CLOUDINARY_SIGNING_URL=http://<LAN_IP>:3000/api/cloudinary/sign` in the mobile app's `.env`, resolving the "Cloudinary upload is not configured" error on the Certificates screen.
- **2026-10-01 (Avatar Enhancement, JSX Syntax Fix & Icon Ligature Restoration):**
  1. **Fixed JSX Tag Mismatch in `OnboardingApprovals.jsx`:** Resolved `Syntax Error: Expression expected / Unterminated regexp literal` at `</Modal>` caused by a missing opening avatar container div before the `<img>` tag in the Student Registration Review modal. Added `<div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">` wrapper, restoring well-formed JSX structure. Verified production compilation via `next build` (100% success).
  2. **Default Avatar Standardization:** Integrated `/default-avatar.png` fallback across `OnboardingApprovals.jsx` (list table & review detail modal) and `StudentManagement.jsx` (scholar roster & student details drawer). Updated `src/lib/db.js` so newly initialized student records default to `/default-avatar.png`.
  3. **Permanent Icon Ligature Restoration & Font Self-Hosting:** Diagnosed root cause of misplaced overlapping letters (e.g. `school`, `how_to_reg`, `notifications`, `search`, `folder_shared`, `verified`). The Google Material Symbols font failed to bind because `@import` inside PostCSS stylesheets was stripped/unresolved, `<head>` in `layout.jsx` lacked direct stylesheet `<link>` tags, and `.material-symbols-outlined` lacked `font-family: 'Material Symbols Outlined' !important`. Downloaded self-hosted `material-symbols-outlined.woff2` and `.ttf` to `public/fonts/`, configured local `@font-face` with `font-display: block`, added font preloading in `src/app/layout.jsx`, and enforced font properties with user-select protection. Layout and icons restored completely.
- **2026-09-30 (Real-Time Bidirectional Sync, Desert Dossier Theme & WhatsApp Silhouette Avatar):**
  1. **Real-Time Bidirectional Sync Architecture:**
     - Installed `@supabase/supabase-js` in `ADMIN-PANEL-RIMT` and initialized shared client `src/lib/supabaseClient.js` configured with `eventsPerSecond: 10`.
     - Added real-time PostgreSQL subscriptions in `StudentDossierModal.jsx` (`admin-dossier-${studentId}`) listening across `students`, `student_profiles`, `student_projects`, `student_git_projects`, `student_certificates`, `student_internships`, `student_academic_summary`, `student_semester_records`, `student_grades`, and `admin_audit_log`. When a student updates profile, bio, headline, skills, or links from the mobile app, the admin dossier reflects changes in real time with toast alerts.
     - Added real-time subscription in `StudentManagement.jsx` (`admin-student-management-sync`) to auto-refresh scholar table rows without full-page reloads.
     - Updated database migration `20260930_admin_student_dossier.sql` with `ALTER PUBLICATION supabase_realtime ADD TABLE ...` across all 9 dossier tables and `students` table, plus student update/upsert RLS policies for `student_profiles` and audit log insertion.
  2. **Desert Color Aesthetic & Zero-Transparency Modal Fix:**
     - Defined `'surface-container-lowest': '#FFFFFF'` and desert color tokens (`#FAF6F0`, `#F4EDE4`, `#EFE5D8`, `#DECDBE`, `#DFD3C3`) in `tailwind.config.js`.
     - Eliminated all unwanted backdrop translucency where underlying table text bled through. Modal container now renders with rich desert sand `#FAF6F0`, institutional header in `#F4EDE4`, tabs navigation in `#EFE5D8`, and solid white card interiors with `#DECDBE` borders.
  3. **WhatsApp-Style Human Silhouette Avatar:**
     - Replaced initials fallback ("SO"/"SA") in `StudentDossierModal.jsx` with an authentic, attractive human silhouette demo SVG icon styled identically to WhatsApp's default avatar, embedded in a warm desert-toned container (`#E8DDD2`) with green verified checkmark badge.
  4. **Build & Test Verification:**
     - `npm run build` compiled 100% cleanly (7/7 static and dynamic routes optimized).
     - Full test suite passing 65/65 (26/26 dossier-academic, 21/21 onboarding, 18/18 admin-auth).
- **2026-10-07 (Corporate Company Portal, Registration Screen, Google OAuth & Role-Based Access Control):**
  1. **Dual Portal Authentication (`AuthScreen.jsx` — 1071 lines):** Added corporate company recruiter authentication directly on the login gateway alongside administrative sign-in. Top segmented pill switcher allows switching between **"Institutional Admin"** (maroon `#7A1D27`) and **"Company Portal"** (blue `#0B4EA2`). Quick "Company Access →" button positioned at top right of the card (exactly where the red circle was marked in the user's screenshot). Company Portal shows "Corporate Recruiter Gateway" badge with back-to-admin toggle.
  2. **Corporate Registration & Sign In:** Created dedicated tab-based flows:
     - **Register Company (New):** Company Name*, Recruiter Full Name, Industry/Hiring Sector dropdown (6 options), Official Corporate Email*, Password* fields.
     - **Sign In (Existing):** Email + Password with "Remember corporate session" toggle.
     - **Continue with Google:** Official multi-colored Google SVG icon button → opens interactive Google One-Tap modal with 4 pre-configured corporate accounts (Google, Microsoft, Amazon, TCS) + custom email input for any Google Workspace.
     - All registrations and sign-ins persist directly to the database with JWT tokens and httpOnly cookies.
  3. **Backend API Endpoints (`src/app/api/company/auth/*`):** Created 5 REST route handlers:
     - `POST /api/company/auth/register`: Validates fields, checks email uniqueness, hashes password with PBKDF2-SHA256, creates company in DB, generates 14-day JWT, sets `company_token` httpOnly cookie.
     - `POST /api/company/auth/login`: Authenticates corporate email and password, validates account status (ACTIVE required), generates JWT (7 or 30 day based on remember_me).
     - `POST /api/company/auth/google`: Handles Google OAuth — auto-registers new company if email not found (infers name from domain), signs in existing companies, generates 30-day session.
     - `GET /api/company/auth/me`: Returns sanitized active company recruiter profile, protected by `withAuth(handler, { requiredRole: 'COMPANY' })`.
     - `POST /api/company/auth/logout`: Clears `company_token` cookie.
  4. **Database & In-Memory Store (`src/lib/db.js`):** Added 5 company CRUD functions:
     - `initCompanyDb()`: Seeds default hiring partners (Google LLC, Microsoft, TCS) with PBKDF2-hashed default password `Company@RIMT#2026`.
     - `getCompanyByEmail(email)`: Supabase `ilike` query + in-memory fallback.
     - `getCompanyById(id)`: Supabase `eq` query + in-memory fallback.
     - `createCompany({...})`: Creates company record in both Supabase and in-memory store with auto-generated ID, avatar fallback, timestamps.
     - `getAllCompanies()`: Returns all companies from in-memory store.
     - `getMemoryCompanies()`: Internal accessor for `global.__RIMT_DB_COMPANIES` array.
  5. **Client-Side Auth API (`src/lib/authApi.js`):** Added 3 company client methods:
     - `companyRegister({company_name, recruiter_name, email, password, industry})`: POST to `/api/company/auth/register`, stores JWT in localStorage, saves account session.
     - `companyLogin({email, password, remember_me})`: POST to `/api/company/auth/login`, stores JWT.
     - `companyGoogleLogin({email, name, avatar_url, company_name})`: POST to `/api/company/auth/google`, stores JWT.
- **2026-10-10 (CVForge Student Resume Integration, Direct Intent PDF Viewing & Zero-Overflow Layout):**
  1. **CVForge Student Resume Suite Synchronization:**
     - The paired student mobile app (`APP-RIMT-BCA`) now features the complete **CVForge Institutional Resume Builder** (`ResumeScreen.jsx` and `resumeService.js`).
     - Supports 4 official ATS-certified templates (`navy_ledger`, `richard_sanchez`, `herman_walton`, `sunny_singh`) mapping directly to the student's verified academic and portfolio records.
     - Student dossiers, projects, certifications, and academic summaries edited via the admin portal or student app synchronize seamlessly for instant resume compilation.
  2. **Direct Intent PDF Launching Without Cloud Uploads:**
     - Resolved Android Expo Go scoped sandbox issue (`Not allowed to read file under given URL`) by generating Base64 vector PDFs and persisting directly into `FileSystem.documentDirectory`.
     - Direct `android.intent.action.VIEW` integration launches Google Drive PDF Viewer (`com.google.android.apps.docs.viewer.PdfViewerActivity`) and system PDF readers directly on screen with **zero cloud upload prompts**.
  3. **Zero-Overflow Layout Polish & Theme Alignment:**
     - Structured education and degree headers with dedicated score pill badges (`[ Cumulative CGPA: 8.5 / 10.0 ]`, `[ Aggregate: 88% ]`) with `overflow: 'hidden'`, preventing text clipping on mobile displays.
     - Streamlined the Review screen by removing redundant floating bottom CTAs and aligning the top-right `Export PDF` action with the institutional crimson theme (`#A31321`).
- **2026-10-07 (Role Isolation, Auto-Repair Sanitization & Dual-Portal Account Strictness):**
  1. **Sidebar Locked Modules Exclusion (Image 1 fix):** Updated `src/components/Sidebar.jsx` so when logged in as a Corporate Recruiter (`COMPANY` role), locked operational modules (`Onboarding Approvals`, `Student Management`, `Drive Management`, `Training Management`, `Internship Monitoring`, `Report Generation`) are completely excluded from the DOM. Only **Company Management** and **Placement Statistics** are rendered under "Core Modules".
  2. **Top-Right Profile Menu Account Switching Isolation (Image 2 fix):** Updated `src/components/profile/ProfileMenu.jsx` to enforce strict isolation using `isAdminAccount` and `isCompanyAccount`. Company logins only ever see other corporate company accounts; institutional admin logins only ever see other institutional admin accounts.
  3. **Dual-Portal Auth Chooser Strict Isolation & Auto-Repair (Images 3 & 4 fix):**
     - Fixed bug in `src/lib/authApi.js` `saveAccountSession()` where `company_name` was defaulting to `fullName` even for admins.
     - Added `isAdminAccount(acc)` and `isCompanyAccount(acc)` predicate classifiers in `src/lib/authApi.js`.
     - Added auto-repair on `getSavedAccounts()`: if any stored record for Raj Kumar, Sagrika, or `@rimt.ac.in` admin has legacy `company_name` or corporate fields in `localStorage`, it is automatically stripped, sanitized, and updated in `localStorage` as pure `ADMIN`.
     - In `src/components/auth/AuthScreen.jsx`, completely segregated `adminSavedAccounts` and `companySavedAccounts`. Raj Kumar exclusively appears in the Institutional Admin chooser and can never appear in the Company Portal chooser.
     - Replaced asymmetrical sub-header row with a clean, centered, balanced gateway indicator for both Institutional Admin and Company Portal gateways.
- **2026-10-06 (Corporate Recruiter Portal & Dual-Portal Authentication Integration):**
  1. **Dual-Portal Auth Architecture:** Embedded corporate recruiter login and registration directly alongside the existing institutional admin login in `src/components/auth/AuthScreen.jsx`.
  2. **Pill-Tab Switcher & Mode Separation:** Added dual-tab switcher: **Institutional Admin** (maroon `#6B0018`) vs **Company Portal** (navy `#0B4EA2`).
     - Extract tokens from both `admin_token` and `company_token` cookies.
  7. **Role-Based Access Control (`Sidebar.jsx`, `page.jsx`):**
     - `Sidebar.jsx` accepts `userRole` prop and defines `companyAllowedModules = ['companies', 'statistics']`.
     - Locked modules show padlock 🔒 icon replacing normal icon, "Staff" badge, muted styling, and tooltip `(Staff Only)`.
     - Sidebar brand card adapts: "RIMT Corporate" + "Recruiter Portal" badge (blue theme) vs "RIMT Trust" + "T&P Admin Portal" (maroon theme).
     - Footer shows "Company Access — Verified Corporate Partner" for company users.
     - Active module styling uses blue gradient for company, maroon gradient for admin.
     - `page.jsx` renders `CompanyLockedModuleView` when `isCompany && activeModule !== 'companies' && activeModule !== 'statistics'`.
     - `CompanyLockedModuleView`: Premium lock card with amber lock icon, "Staff-Restricted Operational Module" badge, access privileges checklist (✅ Talent Pool, ✅ Statistics, 🔒 Approvals), and two CTAs (Browse Talent Pool, Placement Statistics).
     - Company users default to `activeModule: 'companies'` on login.
     - For institutional staff (Raj Kumar, Sagrika), all 8 modules remain completely open.
  8. **Dedicated Routes:**
     - `/company` → `src/app/company/page.jsx` — Renders `AdminPortalDashboard` inside `AuthGuard` with `initialPortalType="company"`.
     - `/company/auth` → `src/app/company/auth/page.jsx` — Standalone company auth screen, redirects to `/company` after authentication.
     - `/admin/auth` → Existing admin auth page.
  9. **AuthGuard Enhancement (`AuthGuard.jsx`):** Updated to accept `initialPortalType` prop, forwarding it to `AuthScreen` so `/company` routes default to the Company Portal tab.
- **2026-10-10 (CVForge Resume Review Tab Fidelity & Profile Photo Synchronization):**
  1. **Resume Review Tab Alignment:** Upgraded both `richard_sanchez` (Executive Slate Split) and `herman_walton` (Corporate Analyst Classic) in the mobile app's Review tab (`ResumeScreen.jsx`) so they mirror the exact design tokens, divider lines, icons, and timeline structures of the Preview tab.
  2. **Profile Avatar Fix:** Restored missing student avatar in Herman Walton Review tab via `waltonPhotoBox` (56x68) and `waltonPhotoImg`. Added safe fallback handling in both `ResumeScreen.jsx` and `resumeService.js` PDF generator.
- **2026-09-30 (Admin-Managed Student Dossier & Strict Manual Academic Control):**
  1. **Database Schema & RLS:** Added migration `supabase/migrations/20260930_admin_student_dossier.sql` creating 9 tables: `public.student_profiles`, `public.student_projects`, `public.student_git_projects`, `public.student_certificates`, `public.student_internships`, `public.student_academic_summary`, `public.student_semester_records`, `public.student_grades`, and `public.admin_audit_log`. Implemented `public.is_admin()` and `public.current_student_id()` helper functions. RLS ensures full admin CRUD and read-only student access to their own records where `is_visible = true`, with ZERO student write paths. Private bucket `student-certificates` created with signed URL access protocol.
  2. **Strict Manual-Only Academic Governance:** Enforced institutional policy where CGPA (0.00 – 10.00), overall attendance % (0.00 – 100.00), backlogs, semester SGPA, and subject grades are written strictly and exclusively by administrators. Completely eliminated all auto-derivation, triggers, cron jobs, and edge functions. Unset values display as "—" (never fake 0 or 8.65). Changes to grades do not recalculate CGPA. Confirmation modal displaying Old vs New comparison diff is mandatory before saving academic records. Every mutation is logged in `admin_audit_log`.
  3. **Removed Automation:** Removed hash-based synthetic CGPA generator (`8.15 + hashSum`), removed fallback `8.65` and `94.8%` attendance numbers, and removed synthetic SGPA calculations from `src/lib/db.js` and views.
  4. **Frontend Dossier UI:** Built `src/components/student/StudentDossierModal.jsx` featuring 7 tabs: Overview, Projects, Git Projects, Certificates, Internships, Academics, and Activity Log. Includes modal forms for section additions, inline visibility toggles, drag-and-drop sort reordering, bulk grade grid entry, pre-save confirmation modal, live audit log viewer, and clean printable PDF export layout.
  5. **Cross-Module Integrations:**
     - `src/views/StudentManagement.jsx`: Added live `CGPA` and `Attendance` table columns, "Open Dossier" button on rows, and detail drawer academic badges.
     - `src/views/InternshipMonitoring.jsx`: Added live fetching from `/api/admin/internships`.
     - `src/app/api/admin/requests/[id]/route.js`: Enhanced with comprehensive dossier payload and section mutation dispatcher with actor tracking.
     - `src/app/api/admin/internships/route.js`: Created route to serve live student internships.
  6. **Automated Testing:** Created `tests/dossier-academic.test.mjs` verifying boundary validation, audit logging, section CRUD, and manual CGPA retention after grades change. All 26/26 tests passed (total test suite: 65/65 passing).
- **2026-09-30 (Fixed Admin Accounts & Signup Lockdown):** Eliminated open admin signup permanently. Hardcoded two authorized administrators — **Raj Kumar** (HOD BCA, password `BCAHOD`) and **Sagrika** (Vice HOD BCA, password `VICEHOD`) — with PBKDF2-SHA256 salted hashes (`rimt-salt-key`, 10,000 iterations). `POST /api/admin/auth/signup` now returns `403 SIGNUP_DISABLED` unconditionally. Login route validates `name` + `password` against Supabase `admins` table with in-memory fallback. `AuthScreen.jsx` updated to Sign In only with warm desert theme (no signup tabs/links). Cleaned up demo/placeholder admin references across `ProfileMenu.jsx`, `ProfileModal.jsx`, and `ProfileTab.jsx`. Migration: `supabase/migrations/20260930_fixed_admin_accounts.sql`.
- **2026-09-30 (LinkedIn-Style Scholar Dossier & Profile Tracker):** Built comprehensive LinkedIn-style student dossier inspection system for admin portal:
  1. **`StudentLinkedInProfileModal.jsx`** (`src/components/student/`): Full-screen LinkedIn hero cover banner, 120px verified avatar with status badge, legal name, roll number, professional headline, location pin, quick-action buttons (Direct Call, WhatsApp, Email), Academic Score & CGPA tracker with semester SGPA breakdown chart, narrative About/Bio section with skills tags, Featured Projects portfolio cards (GitHub-synced with category, tech stack, and demo links), and Verified Documents vault with live Supabase `student_documents` integration and instant in-modal PDF/image previewer.
  2. **Student Management Integration:** Added LinkedIn Profile row buttons and detail drawer card in `StudentManagement.jsx` for every student in the directory.
  3. **Onboarding Approvals Integration:** Added LinkedIn Profile inspection buttons in `OnboardingApprovals.jsx` review table rows and detail modal for pre-approval dossier review.
  4. **Backend API Enhancement:** `GET /api/admin/requests/[id]` now returns enriched `dossier` object (bio, headline, cgpa, semester_scores, projects, skills, documents). `PATCH /api/admin/requests/[id]` supports live admin overrides of scholar bio, phone, academic metrics.
  5. **DB Layer:** Added `getStudentDocuments()`, `getStudentDossier()`, and `updateStudentDossier()` to `src/lib/db.js`.
  6. **Migration:** `supabase/migrations/20260930_add_student_bio_and_academic_score.sql` — adds `bio`, `headline`, `cgpa`, `academic_score`, `banner_url`, `projects`, `skills`, `semester_scores` columns to `students` table.
- **2026-09-30 (Student App Bio Field):** Added `bio` state and multiline text input to `EditProfileScreen.jsx` in the mobile app (`APP-RIMIT`). Updated `authService.js` to accept and persist `bio` to Supabase. Cross-compatible with admin LinkedIn-style dossier tracker.
- **2026-09-29 (Admin Panel Authentication — NEW-FEATURE.md Complete):** Implemented comprehensive Admin Authentication and Session Management for the T&P Admin Portal:
  1. **Database Schema & Adapter:** Added `public.admins` schema in `schema.sql` with unique index on normalized email, active status constraints, and UUID primary keys. Added `getAdminByEmail`, `getAdminById`, `checkAdminEmailExists`, `createAdmin`, and `updateAdmin` in `src/lib/db.js` with in-memory persistence and Supabase synchronization.
  2. **API Endpoints (`src/app/api/admin/auth/*`):** Created 7 REST route handlers for signup, login, logout, me, profile-pic, change-password, and check-email.
  3. **Security Middleware:** Enhanced `withAuth` in `src/lib/middleware.js` to extract tokens from cookies or authorization headers, and authenticate admin roles and active status.
  4. **Frontend UI & Guards:** Created `AuthScreen.jsx`, `AuthGuard.jsx`, `ProfileMenu.jsx`, `ProfileModal.jsx`. Integrated `ProfileTab.jsx` into the main module registry.
  5. **Verification & Tests:** `tests/admin-auth.test.mjs` (18/18 pass). `tests/onboarding.test.mjs` (21/21 pass). Production build compiled 100% cleanly.
- **2026-09-29 (Document & Storage Fix):** Fixed 3 critical backend blockers for student document upload. Created migration `supabase/migrations/20260929_fix_document_storage_and_tables.sql`. All 21/21 onboarding tests pass.
- **2026-09-29:** Fixed critical "Student record not found" bug in `src/lib/db.js`. Updated `db.js` to send verified columns to Supabase. Added `.env.local` with Supabase credentials. Enabled student avatar display.
- **2026-09-29:** Normalized student aliases across the admin DB layer. Verified 21/21 onboarding tests.
- **2026-09-29:** Student registrations and counts now use live Supabase records only. Added `REVOKED` state, reason, endpoint, and lockout flow.
- **2026-09-29 00:05:** Fixed `rejectStudent()` / `approveStudent()` persistence bug. All 15/15 tests passing.
- **2026-09-28 23:50:** Implemented real-time auto-synchronization and removed all fake mock data.
- **2026-09-28 23:30:** Synced docs with simplified registration flow. 4 fields only.
- **2026-09-28 22:37:** Cleaned up workspace. Only `ADMIN.md` remains as master memory.
- **2026-09-28 22:20:** Created `OnboardingApprovals.jsx` view.
- **2026-09-28 22:15:** Built Next.js 14 API route handlers.
