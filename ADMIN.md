# 🛡️ AGENT.hd — RIMT University Institutional Placement & Operations Portal

> **Single Source of Truth:** Master Memory, Architecture, Screens, Endpoints, and File Map for the entire RIMT Admin Portal & Integrated Student App.  
> **Last Updated:** 2026-09-30  
> **Role:** Senior Full-Stack & System Logic Engineer Specification  
> **Status:** Active; fixed admin authorization active, LinkedIn profile tracker live  

---

## 1. Project Overview
The **RIMT Institutional Portal** is an enterprise-grade administrative and academic placement platform. It connects university officers, placement coordinators, corporate recruiters, and students in a unified ecosystem. 

A core architectural pillar is the **Gated Student Onboarding System & Administrator Oversight**:
- All new student registrations enter a strict `PENDING` queue.
- No access token or home portal permissions are granted upon registration.
- An Administrator manually reviews the student’s identity, roll number, department, and academic year in the **Onboarding Approvals** queue.
- Administrators can inspect a comprehensive **LinkedIn-Style Scholar Dossier** containing student bio, legal name, phone number, academic score (CGPA & SGPA breakdown), featured projects portfolio, and verified credentials vault.
- Upon **Approval**, the student is granted full access to the portal dashboard, document vault, and profile editor.
- Upon **Rejection**, the student is locked out with an official registrar reason displayed on their screen.
- **Revocation** is separate from rejection; an administrator can remove an approved student's access with a recorded reason.
- **Fixed Admin Access Policy:** Open admin signup is permanently eliminated. Only two pre-authorized administrators are permitted: **Raj Kumar** (HOD BCA) and **Sagrika** (Vice HOD BCA) using salted PBKDF2 credentials.
- Approval totals and student registration views are computed from Supabase rows submitted by the student app. Student registration views do not seed profiles or invent missing fields.
- The mobile app's live Supabase schema uses `name` and `roll_no`; admin-facing records normalize these to `full_name` and `roll_number` while retaining both aliases. Do not assume the phone app writes to the admin process's in-memory fallback.
- Real-time guards block `PENDING`, `REJECTED`, and `REVOKED` accounts. The app rechecks approved sessions every 3.5 seconds.

---

## 2. Tech Stack

| Domain | Technology | Configuration & Details |
|---|---|---|
| **Admin Web Portal** | Next.js 14.2.15 (App Router) + React 18.3.1 | Single-Page Responsive Institutional Shell with 3-State Sidebar |
| **Styling & Design System** | Tailwind CSS 3.4.6 | Custom institutional palette: Primary Maroon (`#6B0018`), Gold (`#E7B94A`), Surfaces |
| **Icons & Micro-UI** | Lucide React (`^0.424.0`) + Material Symbols | Clean SVG vector iconography |
| **Student Mobile/Web App** | Expo SDK 57 + React Native 0.86.3 | Cross-platform student app in `c:\Users\r3dha\OneDrive\Desktop\APP-RIMIT` |
| **Database** | PostgreSQL via Supabase (`pwghazyfxhypzkadqfnn`) | Source of truth for student registrations and review states |
| **Admin DB writes** | `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret required to bypass student-facing RLS for review-state writes |
| **Backend API Layer** | Next.js 14 Route Handlers (`src/app/api/*`) | Serverless microservice architecture for Auth, Approvals, Profile |
| **Authentication & Cryptography** | Standard Web Crypto API (`crypto.subtle`) | PBKDF2/SHA-256 salted password hashing & HMAC-SHA256 JWT tokens |

---

## 3. Complete Directory & File Structure Tree

```
c:\Users\r3dha\OneDrive\Desktop\ADMIN-PANEL-RIMT\
├── AGENT.hd                      # ⭐ THE SINGLE MASTER MEMORY FILE (This Document)
├── jsconfig.json                 # Path aliases mapping: "@/*" -> "./src/*"
├── next.config.js                # Next.js configuration
├── package.json                  # Next.js, React, Lucide-React, Tailwind dependencies
├── package-lock.json             # Locked dependency tree
├── postcss.config.js             # PostCSS Tailwind processor
├── tailwind.config.js            # Design tokens, color system, and container queries
├── README.md                     # High-level repository readme
├── NEW-FEATURE.md                # Feature specification & DoD for Admin Panel Authentication
│
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── layout.jsx            # Universal root layout, HTML shell, and typography imports
│   │   ├── page.jsx              # Main Single-Page Admin Shell orchestrating active module views & AuthGuard
│   │   ├── admin/
│   │   │   └── auth/
│   │   │       └── page.jsx      # Standalone /admin/auth route page
│   │   └── api/                  # Backend REST Route Handlers
│   │       ├── auth/
│   │       │   ├── signup/route.js # POST: 4-field registration (Name, Roll No, Dept, Year) -> status: PENDING (no token)
│   │       │   └── login/route.js  # POST: Gated roll number check (403 PENDING/REJECTED, 200 APPROVED)
│   │       ├── admin/
│   │       │   ├── auth/
│   │       │   │   ├── signup/route.js         # POST: ⛔ DISABLED — always returns 403 SIGNUP_DISABLED
│   │       │   │   ├── login/route.js          # POST: Fixed admin credential auth (Raj Kumar / Sagrika only) + httpOnly session cookie
│   │       │   │   ├── logout/route.js         # POST: Clear admin session cookie
│   │       │   │   ├── me/route.js             # GET: Active admin identity & verified privileges
│   │       │   │   ├── profile-pic/route.js    # POST: Admin avatar upload/update (multipart/json)
│   │       │   │   ├── change-password/route.js# PATCH: Verify current password & set new password
│   │       │   │   └── check-email/route.js    # POST: Pre-check if Gmail address already exists
│   │       │   ├── internships/
│   │       │   │   └── route.js        # GET: List all student internships for InternshipMonitoring
│   │       │   └── requests/
│   │       │       ├── route.js    # GET: Queued student applications (?status=PENDING)
│   │       │       └── [id]/
│   │       │           ├── route.js         # GET: Single student application details & full dossier; PATCH: Update profile/dossier/academic metrics with audit trail
│   │       │           ├── approve/route.js # PATCH: Approve student -> status: APPROVED
│   │       │           ├── reject/route.js  # PATCH: Reject student -> status: REJECTED + reason
│   │       │           └── revoke/route.js  # PATCH: Revoke student access -> status: REVOKED
│   │       └── profile/
│   │           └── route.js      # GET/PUT: Gated student profile editor (APPROVED users only)
│   │
│   ├── lib/                      # Core Backend Utilities & Security Guards
│   │   ├── auth.js               # Web Crypto PBKDF2 password hashing & HMAC-SHA256 JWT
│   │   ├── authApi.js            # Client-side API client for admin auth endpoints
│   │   ├── db.js                 # Supabase adapter, student/admin records, and memory fallback
│   │   ├── middleware.js         # withAuth route guard enforcing admin & student role and status checks
│   │   └── schema.sql            # PostgreSQL schema definition with students and admins tables
│   │
│   ├── components/               # Admin UI Shell Components
│   │   ├── Header.jsx            # Top bar: Dynamic admin avatar, search query, notifications
│   │   ├── Sidebar.jsx           # 3-state responsive drawer with Onboarding Approvals badge count
│   │   ├── Modal.jsx             # Accessible backdrop dialog wrapper for reviews & actions
│   │   ├── auth/
│   │   │   ├── AuthScreen.jsx    # Sign In only (no signup) with warm desert theme & fixed admin credentials
│   │   │   └── AuthGuard.jsx     # Route protection wrapper preventing unauthenticated dashboard access
│   │   ├── profile/
│   │   │   ├── ProfileMenu.jsx   # Header avatar dropdown menu (Profile, Change Password, Sign Out)
│   │   │   └── ProfileModal.jsx  # Modal for photo upload & password management
│   │   └── student/
│   │       ├── StudentLinkedInProfileModal.jsx  # ⭐ LinkedIn-Style Scholar Dossier view
│   │       └── StudentDossierModal.jsx          # ⭐ Full Admin-Managed Student Dossier (7 tabs: Overview, Projects, Git, Certs, Internships, Academics, Audit)
│   │
│   ├── views/                    # Primary Admin Functional Screens
│   │   ├── OnboardingApprovals.jsx # ⭐ Gated student approval queue, review drawer, reject modal
│   │   ├── StudentManagement.jsx # Verified student directory, CGPA/Attendance columns, "Open Dossier" button
│   │   ├── CompanyManagement.jsx # Corporate recruiter roster and packages
│   │   ├── DriveManagement.jsx   # Upcoming and active campus drives
│   │   ├── PlacementStatistics.jsx # Real-time placement metrics and department charts
│   │   ├── TrainingManagement.jsx # Pre-placement training schedule and rosters
│   │   ├── InternshipMonitoring.jsx # Student industrial internship tracking
│   │   ├── ReportGeneration.jsx  # Exportable reports
│   │   └── ProfileTab.jsx        # Admin profile information & security settings
│   │
│   ├── constants/                # Data and Design Constants
│   │   ├── data.js               # Mock data for companies, drives, and student records
│   │   └── tokens.js             # Color palette, spacing, and typography definitions
│   │
│   └── styles/
│       └── globals.css           # Global CSS and custom animations
│
├── supabase/
│   └── migrations/
│       ├── 20260930_fixed_admin_accounts.sql             # Fixed admin accounts (Raj Kumar, Sagrika) with PBKDF2 hashed passwords
│       └── 20260930_add_student_bio_and_academic_score.sql # Student bio, headline, cgpa, academic_score, banner_url, projects, skills, semester_scores
│
└── tests/
    ├── onboarding.test.mjs       # Automated unit test suite verifying approval state transitions
    └── admin-auth.test.mjs       # Automated unit test suite verifying admin authentication & session lifecycle
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

### 4.3 Company Management (`src/views/CompanyManagement.jsx`)
- **Purpose:** Directory of recruiting corporate partners.
- **Features:**
  - Company tier categorization (Dream, Super Dream, Core, IT Services).
  - HR contact details, past recruitment numbers, and average compensation offered.

### 4.4 Drive Management (`src/views/DriveManagement.jsx`)
- **Purpose:** Placement drive scheduling and applicant tracking.
- **Features:**
  - Drive dates, job descriptions, compensation breakdown, and eligibility criteria.
  - Registered applicant list and shortlisted student counters.

### 4.5 Placement Statistics (`src/views/PlacementStatistics.jsx`)
- **Purpose:** Institutional analytics dashboard.
- **Features:**
  - Placement percentage by department.
  - Highest, median, and average package (LPA) benchmarks.
  - Visual charts and historical comparison trends.

### 4.6 Training Management (`src/views/TrainingManagement.jsx`)
- **Purpose:** Pre-placement soft-skills and technical training bootcamps.
- **Features:**
  - Training modules, schedule calendar, and student attendance tracking.

### 4.7 Internship Monitoring (`src/views/InternshipMonitoring.jsx`)
- **Purpose:** 6-month industrial internship tracking.
- **Features:**
  - Assigned mentor faculty, mid-term evaluations, and compliance reports.

### 4.8 Report Generation (`src/views/ReportGeneration.jsx`)
- **Purpose:** Institutional reporting for NAAC, NIRF, and AICTE compliance.
- **Features:**
  - Export placement reports in CSV and PDF formats.

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

### 5.4 Profile (`src/app/api/profile/`)
* **`GET /api/profile`**
  - **Auth:** Authenticated user with `status === 'APPROVED'`. Returns profile data.
* **`PUT /api/profile`**
  - **Auth:** Authenticated user with `status === 'APPROVED'`. Modifies profile data.

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
  cgpa NUMERIC(4,2),                 -- Legacy column; source of truth is student_academic_summary
  academic_score JSONB DEFAULT '{}',
  banner_url TEXT,
  projects JSONB DEFAULT '[]',
  skills TEXT[] DEFAULT '{}',
  semester_scores JSONB DEFAULT '[]'
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

## 9. Feature Status Table

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
| **Next.js Production Build** | `package.json`, `jsconfig.json`, Next.js 14.2.35 | ✅ Production build verified |
| **Automated Unit Test Suites** | `tests/dossier-academic.test.mjs` (26/26), `tests/onboarding.test.mjs` (21/21), `tests/admin-auth.test.mjs` (18/18) | ✅ 65/65 passed; full lifecycle test coverage |
| **Live Supabase review write** | `src/lib/db.js`, `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_KEY` | ✅ Fixed: Falls back to project key, writes supported table columns (`status`, `updated_at`), avoiding PGRST204 "Student record not found" errors |
| **Student Photo Verification** | `src/views/OnboardingApprovals.jsx`, `src/views/StudentManagement.jsx` | ✅ Displays student profile picture (`avatar_url`) in queue, modal, and directory |
| **Fixed Admin Accounts** | `src/app/api/admin/auth/signup/route.js`, `src/app/api/admin/auth/login/route.js`, `src/lib/db.js`, `src/components/auth/AuthScreen.jsx` | ✅ Complete — Signup disabled, only Raj Kumar & Sagrika can sign in via PBKDF2 credentials |
| **Admin-Managed Student Dossier** | `src/components/student/StudentDossierModal.jsx`, `src/views/StudentManagement.jsx`, `src/views/InternshipMonitoring.jsx`, `src/app/api/admin/requests/[id]/route.js`, `src/app/api/admin/internships/route.js` | ✅ Complete — 7-section unified dossier, CRUD, reorder, visibility toggle, private certificate bucket with signed URLs, PDF export layout |
| **Strict Manual Academic Control** | `src/components/student/StudentDossierModal.jsx`, `src/lib/db.js`, `supabase/migrations/20260930_admin_student_dossier.sql` | ✅ Complete — Strict anti-automation policy, CGPA/attendance/backlogs/SGPA/grades manual-only, confirm-before-save old vs new diff modal, tamper-evident audit logging |
| **Real-Time Bidirectional Sync & Desert Dossier Theme** | `src/lib/supabaseClient.js`, `src/components/student/StudentDossierModal.jsx`, `src/views/StudentManagement.jsx` | ✅ Complete — Realtime Supabase publication for all dossier tables and student records, instant bidirectional UI sync, warm desert theme (#FAF6F0) and WhatsApp-style human silhouette avatar demo |
| **LinkedIn-Style Scholar Dossier** | `src/components/student/StudentLinkedInProfileModal.jsx`, `src/views/StudentManagement.jsx`, `src/views/OnboardingApprovals.jsx` | ✅ Complete — Hero banner, bio, CGPA/SGPA tracker, projects portfolio, documents vault, live admin overrides |

---

## 10. Changelog
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
- **2026-10-01 (Avatar Enhancement, JSX Syntax Fix & Icon Ligature Restoration):**
  1. **Fixed JSX Tag Mismatch in `OnboardingApprovals.jsx`:** Resolved `Syntax Error: Expression expected / Unterminated regexp literal` at `</Modal>` caused by a missing opening avatar container div before the `<img>` tag in the Student Registration Review modal. Added `<div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">` wrapper, restoring well-formed JSX structure. Verified production compilation via `next build` (100% success).
  2. **Default Avatar Standardization:** Integrated `/default-avatar.png` fallback across `OnboardingApprovals.jsx` (list table & review detail modal) and `StudentManagement.jsx` (scholar roster & student details drawer). Updated `src/lib/db.js` so newly initialized student records default to `/default-avatar.png`.
  3. **Permanent Icon Ligature Restoration & Font Self-Hosting:** Diagnosed root cause of misplaced overlapping letters (e.g. `school`, `how_to_reg`, `notifications`, `search`, `folder_shared`, `verified`). The Google Material Symbols font failed to bind because `@import` inside PostCSS stylesheets was stripped/unresolved, `<head>` in `layout.jsx` lacked direct stylesheet `<link>` tags, and `.material-symbols-outlined` lacked `font-family: 'Material Symbols Outlined' !important`. Downloaded self-hosted `material-symbols-outlined.woff2` and `.ttf` to `public/fonts/`, configured local `@font-face` with `font-display: block`, added font preloading in `src/app/layout.jsx`, and enforced font properties with user-select protection. Layout and icons restored completely.
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
  2. **API Endpoints (`src/app/api/admin/auth/*`):** Created 7 REST route handlers:
     - `POST /api/admin/auth/signup`: Validates official Gmail (`@gmail.com`), enforces password policy (min 8 chars, 1 uppercase, 1 digit, 1 special symbol), detects duplicate email (409 Conflict), hashes password using Web Crypto PBKDF2, issues session JWT and sets httpOnly `admin_token` cookie.
     - `POST /api/admin/auth/login`: Authenticates Gmail + password, prevents enumeration, updates `last_login_at`, and issues httpOnly cookie + Bearer token.
     - `POST /api/admin/auth/logout`: Clears session cookies server-side.
     - `GET /api/admin/auth/me`: Returns sanitized active admin identity.
     - `POST /api/admin/auth/profile-pic`: Handles base64/multipart image upload with MIME & size validation.
     - `PATCH /api/admin/auth/change-password`: Verifies current password before updating to new secure hash.
     - `POST /api/admin/auth/check-email`: Pre-checks if an email exists for instant UI feedback.
  3. **Security Middleware:** Enhanced `withAuth` in `src/lib/middleware.js` to extract tokens from cookies or authorization headers, and authenticate admin roles and active status.
  4. **Frontend UI & Guards:**
     - Created `AuthScreen.jsx` with institutional RIMT maroon styling, Sign In / Sign Up tabs, inline validation, and demo credentials fill button.
     - Created `AuthGuard.jsx` to wrap dashboard routes with zero dashboard flash for unauthenticated visitors.
     - Created `ProfileMenu.jsx` and `ProfileModal.jsx` for dynamic header avatar display, profile inspection, photo upload, password change, and sign out.
     - Integrated `ProfileTab.jsx` into the main module registry.
  5. **Verification & Tests:** Created `tests/admin-auth.test.mjs` (18/18 tests pass). Existing `tests/onboarding.test.mjs` (21/21 tests pass). Production build `npm run build` compiled 100% cleanly.
- **2026-09-29 (Document & Storage Fix):** Fixed 3 critical backend blockers for student document upload (PDF/DOCX): (1) Supabase bucket `student-media` rejected `application/pdf` with HTTP 415 — fixed by setting `allowed_mime_types = null`; (2) Missing `SELECT` + `INSERT` RLS policies on `storage.objects` caused 403 on upload and download — added full CRUD policies; (3) `student_documents` metadata table was not created in live DB (PGRST205) — created migration at `supabase/migrations/20260929_fix_document_storage_and_tables.sql`. Client-side: enabled `copyToCacheDirectory: true` for Android file read permissions, added streaming binary upload fallback, added local device vault persistence when remote storage is unavailable, and improved MIME type detection for DOCX viewers. Replaced real student PII in API docs and quick-test pills with dummy data. All 21/21 onboarding tests pass.
- **2026-09-29:** Fixed critical "Student record not found" bug in `src/lib/db.js` where approving, rejecting, or revoking a student from the live Supabase queue failed. The issue was caused by: (1) `getAdminWriteHeaders()` requiring `SUPABASE_SERVICE_ROLE_KEY` without falling back to `SUPABASE_KEY` (authorized under RLS), and (2) sending non-existent table columns (`reviewed_by`, `reviewed_at`, `rejection_reason`, etc.) to Supabase, which triggered PGRST204 errors and returned `null` (causing 404 toast). Updated `db.js` to send verified columns (`status`, `updated_at`) to Supabase and keep review metadata in sync. Added `.env.local` with Supabase credentials. Enabled student avatar/photo display in `OnboardingApprovals.jsx` (list table & detail modal) and `StudentManagement.jsx`. All 21/21 onboarding unit tests pass.
- **2026-09-29:** Normalized student aliases across the admin DB layer (`name`/`full_name`, `roll_no`/`roll_number`, and department/year aliases), added a legacy mobile-format lookup regression test, and verified 21/21 onboarding tests. This confirms local lookup/state behavior only; it does not prove production Supabase writes. If a visible queue row returns `Student record not found` on review, verify the row ID and server `SUPABASE_SERVICE_ROLE_KEY` first. Existing admin UI/design must be preserved unless explicitly requested.
- **2026-09-29:** Student registrations and counts now use live Supabase records only; the directory no longer displays seeded student details or fabricated KPIs. Added a separate `REVOKED` state, reason, endpoint, and lockout flow. Admin bypass headers are development-only. Live review writes require the migration and server-only key; production also needs an admin-session issuer.
- **2026-09-29 00:05:00+05:30:** Fixed critical bug in `db.js` where `rejectStudent()` was not persisting `rejection_reason` to Supabase (only saved in memory), and `approveStudent()` was not persisting `reviewed_by`/`reviewed_at` audit trail to Supabase. Both functions now send complete PATCH payloads including rejection_reason, reviewed_by, and reviewed_at to the cloud database. All 15/15 tests passing.
- **2026-09-28 23:50:00+05:30:** Implemented real-time auto-synchronization and removed all fake mock data. Root cause of API failure (`ReferenceError: token is not defined` in `middleware.js`) identified and fixed with `extractToken(req)`. Fixed UUID regex query bug in `db.js` so hyphenated roll numbers are correctly queried via `roll_no=ilike.*`. Removed hardcoded mock student records (`Gurpreet Singh`, `Navjot Kaur`, etc.) from `db.js` and removed `loadFallbackData` from `OnboardingApprovals.jsx`. Added live 3.5s background polling and "Live DB Sync Active" indicator in the admin UI.
- **2026-09-28 23:30:00+05:30:** Synced `AGENT.hd` with simplified registration flow. Registration now requires only 4 fields (Name, Roll Number, Department, Year/Semester) — email and password removed. Updated data model docs to match actual Supabase column names (`name`, `roll_no`, `course`, `batch`, `semester`). Department filter in `OnboardingApprovals.jsx` aligned to: BCA, B.Sc IT, B.Sc Cyber Security, B.Sc (Hons) AI & ML. API docs updated to reflect roll-number-only login.
- **2026-09-28 22:37:00+05:30:** Cleaned up `APP-RIMIT` workspace: removed duplicate files (`Agent.md`, `BRAIN.hd`, `BRAIN.md`). Both workspaces now use only `AGENT.hd` (capital AGENT) as the single master memory file. All 15 unit tests confirmed passing (0 failures).
- **2026-09-28 22:34:00+05:30:** Consolidated all administrative memory, technical documentation, API specifications, and screen architectures into this single master file: `AGENT.hd`. Removed redundant duplicate files (`Brain.md`, `BRAIN.hd`, `Agent.md`) as requested.
- **2026-09-28 22:20:00+05:30:** Created `OnboardingApprovals.jsx` view with status counters, detail drawer, and rejection modal with predefined remarks. Added navigation item in `Sidebar.jsx`.
- **2026-09-28 22:15:00+05:30:** Built Next.js 14 API route handlers (`/api/auth/signup`, `/api/auth/login`, `/api/admin/requests`, `/api/profile`) with PBKDF2 password encryption and live database status guards.
