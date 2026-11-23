# 📱 AGENT.hd — RIMT Student Application Master Memory

> **Single Source of Truth:** Complete architecture, screens, services, and file map for the RIMT University Student App.  
> **Last Updated:** 2026-09-29  
> **Role:** Senior Full-Stack & System Logic Engineer Specification  
> **Status:** Active; production admin review writes require migration, server key, and signed admin session  

---

## 1. Project Overview
`APP-RIMIT` is the student-facing Expo (React Native) mobile and web application for RIMT University. It provides students with access to academic credentials, training documents, project portfolios, and placement opportunities.

### Gated Onboarding Architecture:
1. **Registration:** Student enters Full Name, Roll Number, Department, and Year/Semester (4 fields only — no email, no password). The app reports success only after Supabase confirms the `PENDING` insert. Local storage caches confirmed rows but is never an authority for account status.
  - **Shared record contract:** The app writes Supabase `students.name` and `students.roll_no` (plus department/course and batch/semester aliases). The paired admin portal must normalize these to its `full_name` and `roll_number` aliases. The app and admin server do not share process-local memory.
2. **Review State:** The student is redirected to the **`PendingApprovalScreen`**, which shows their submitted details, onboarding timeline steps, and a live "Check Approval Status" refresher.
3. **Admin Decision (via `ADMIN-PANEL-RIMT`):**
   - **Approved:** Admin clicks "Approve Student" in the Admin Portal. The student's status becomes `APPROVED`, granting direct entry into the Home Dashboard, Profile Editing, and Document Vault.
   - **Rejected:** Admin clicks "Reject Student" with an explanation. The student is barred from logging in and shown the **`RejectedScreen`** with the registrar's remarks and contact channels.
  - **Revoked:** Admin removes access from an approved student with a separate reason. The app blocks sign-in and evicts an active dashboard session on its next live status check.
4. **Session Guard:** On app launch and every 3.5 seconds while approved, the app checks live Supabase status. Cached approval cannot override a rejected, revoked, pending, missing, or unreadable record.

---

## 2. Tech Stack

| Domain | Technology | Details |
|---|---|---|
| **Framework** | Expo SDK 57 (React Native 0.86.3) | Cross-platform mobile & web app |
| **Navigation** | Custom screen state in `App.jsx` | Status-aware routing (PENDING/REJECTED/APPROVED) |
| **Database** | PostgreSQL via Supabase (`pwghazyfxhypzkadqfnn`) | Cloud relational storage with RLS |
| **Auth Service** | `authService.js` | Supabase-authoritative signup/login/status checks; local cache is non-authoritative |
| **State Management** | React Context (`AuthContext.js`) | Global auth state with status guards |
| **Storage** | AsyncStorage + localStorage (web) | Cross-platform persistent storage adapter |
| **Paired Admin Portal** | `ADMIN-PANEL-RIMT` (Next.js 14) | Admin approval/rejection queue, API routes |

---

## 3. Complete Directory & File Structure

```
c:\Users\r3dha\OneDrive\Desktop\APP-RIMIT\
├── AGENT.hd                      # ⭐ THE SINGLE MASTER MEMORY FILE (This Document)
├── AGENTS.md                     # Expo/React Native project rules for AI agents
├── App.jsx                       # Root component: SafeArea + AuthProvider + MainNavigator
├── app.json                      # Expo SDK 57 configuration
├── package.json                  # Dependencies: expo, react-native, @supabase/supabase-js, etc.
├── index.js                      # Expo entry point (registerRootComponent)
├── eslint.config.js              # ESLint configuration
├── .env                          # Supabase URL + Anon Key
│
├── src/
│   ├── context/
│   │   └── AuthContext.js        # React Context with gated session management & live status guard
│   │
│   ├── services/
│   │   ├── authService.js        # Full auth lifecycle: signUp, signIn, checkStatus, signOut, updateProfile
│   │   ├── documentService.js    # Document download & management service
│   │   └── supabase.js           # Supabase client initialization from env vars
│   │
│   ├── screens/
│   │   ├── SignInScreen.jsx      # ⭐ 4-field registration form (Name, Roll No, Dept, Year) + login with status routing
│   │   ├── PendingApprovalScreen.jsx # ⭐ "Awaiting Admin Review" screen with live status polling
│   │   ├── RejectedScreen.jsx    # ⭐ "Access Denied" screen with rejection reason display
│   │   ├── HomeScreen.jsx        # Protected dashboard (APPROVED only) — placement stats & quicklinks
│   │   ├── ProfileScreen.jsx     # Academic profile viewer
│   │   ├── EditProfileScreen.jsx # Protected profile editor (APPROVED only)
│   │   ├── ProjectsScreen.jsx    # Student project portfolio
│   │   ├── CredentialsScreen.jsx # Credential & certificate vault
│   │   ├── DownloadsScreen.jsx   # Offline document cache
│   │   └── OnboardingScreen.jsx  # First-launch campus guide carousel
│   │
│   ├── components/
│   │   └── BottomNav.jsx         # Floating bottom navigation bar (visible on auth'd screens)
│   │
│   ├── theme/
│   │   └── tokens.js             # Design system: Colors, Radii, Typography, Spacing
│   │
│   └── utils/
│       └── fileUtils.js          # File handling utilities for image uploads
│
├── supabase/
│   ├── schema.sql                # Original database schema
│   └── schema_gated_onboarding.sql # Gated onboarding migration with status field & indexes
│
└── assets/                       # Static assets (icons, splash, etc.)
```

---

## 4. All Screens & Views

### 4.1 SignInScreen (`src/screens/SignInScreen.jsx`)
- **Purpose:** Unified login & registration interface.
- **Login Mode:** Roll Number only (no password). On submit:
  - `APPROVED` → navigates to `HomeScreen`
  - `PENDING` → navigates to `PendingApprovalScreen` with student data
  - `REJECTED` / `REVOKED` → navigates to `RejectedScreen` with the recorded reason
- **Register Mode:** 4-field form (Full Name, Roll Number, Department, Year/Semester).
  - **Departments available:** BCA, B.Sc IT, B.Sc Cyber Security, B.Sc (Hons) AI & ML
  - On success → creates PENDING student, navigates to `OnboardingScreen`

### 4.2 PendingApprovalScreen (`src/screens/PendingApprovalScreen.jsx`)
- **Purpose:** Informs user their account is under administrative review.
- **Features:**
  - Displays submitted student details (name, roll number, department, etc.)
  - Visual onboarding timeline showing current review step
  - "Check Approval Status" button that polls Supabase for status changes
  - If status changes to `APPROVED` → auto-navigates to `HomeScreen`
  - If status changes to `REJECTED` → redirects to `RejectedScreen`
  - Back to Sign In button for re-authentication

### 4.3 RejectedScreen (`src/screens/RejectedScreen.jsx`)
- **Purpose:** Displays official rejection notice from university administration.
- **Features:**
  - Student identity display
  - Rejection reason from admin (stored in `rejection_reason` column)
  - Contact support channels (registrar email, phone)
  - Back to Sign In button

### 4.4 HomeScreen (`src/screens/HomeScreen.jsx`)
- **Purpose:** Protected main dashboard (APPROVED users only).
- **Features:** Placement stats, quick links, notifications, academic feed.

### 4.5 ProfileScreen (`src/screens/ProfileScreen.jsx`)
- **Purpose:** Academic profile display with credentials and department info.

### 4.6 EditProfileScreen (`src/screens/EditProfileScreen.jsx`)
- **Purpose:** Protected profile editor (APPROVED only). Allows modifying name, phone, department, avatar.

### 4.7 ProjectsScreen (`src/screens/ProjectsScreen.jsx`)
- **Purpose:** Student project portfolio with media attachments.

### 4.8 CredentialsScreen (`src/screens/CredentialsScreen.jsx`)
- **Purpose:** Certificate and credential vault with verification badges.

### 4.9 DownloadsScreen (`src/screens/DownloadsScreen.jsx`)
- **Purpose:** Offline document cache for downloaded training materials.

### 4.10 OnboardingScreen (`src/screens/OnboardingScreen.jsx`)
- **Purpose:** First-launch campus guide carousel introducing app features.

---

## 5. Authentication & Session Flow

### 5.1 AuthContext (`src/context/AuthContext.js`)
**Provides:**
- `currentStudent` — Active authenticated student (only if APPROVED)
- `signIn({ rollNo })` — Gated login with status check (roll number only, no password)
- `signUp(data)` — Registration → PENDING (no session created)
- `signOut()` — Clears session from storage
- `updateProfile(profile)` — Profile mutations (APPROVED only)
- `refreshStatus()` — Re-checks Supabase connection health
- `checkStatusForStudent({ rollNo })` — Polls live approval status

**Critical Status Guard on Init:**
```javascript
// On app launch, cached identity is revalidated against Supabase:
const live = await checkStudentApprovalStatus({ rollNo: savedStudent.roll_no });
if (live.status === 'APPROVED') setCurrentStudent(live.student);
else await signOutStudent();
```

### 5.2 AuthService (`src/services/authService.js`)
**Key functions:**
- `signUpStudent({ name, rollNo, department, yearSemester })` — Requires all four fields and a confirmed Supabase insert. **Never creates a session. No email or password required.**
- `signInStudent({ rollNo })` — Queries Supabase only; local cached rows cannot grant or override access. Only grants session for `APPROVED`/`VERIFIED`.
- `checkStudentApprovalStatus({ rollNo })` — Live status query; distinguishes pending, rejected, revoked, approved, missing, and error states.
- `getActiveScholar()` — Reads cached session from AsyncStorage.
- `signOutStudent()` — Clears all cached auth data.
- `normalizeRollNo(rollNo)` — Trims and uppercases roll number for consistent matching.
- `signUpStudent()` writes only the mobile app's deployed Supabase schema (`name`, `roll_no`, department/course, batch/semester, status). Keep this aligned with the admin portal's record normalizer; do not add columns unless they exist in the deployed schema or a migration is applied.
- If a student can register but the admin action reports `Student record not found`, distinguish status lookup from admin review write failure. Verify the student row in the same Supabase project and have the admin operator check its server-side service-role key; local app storage cannot repair or replace the cloud row.

---

## 6. Data Model (Students Table)

```sql
-- Supabase table: students (column names use snake_case)
-- Note: The actual Supabase table uses `name`, `roll_no`, `course`, `batch`, `semester`
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
  avatar_url TEXT
);
```

> **Important:** No email or password columns are required. Students are identified solely by their `roll_no`.

---

## 7. Navigation Flow Diagram

```
App Launch
  └── AuthContext.initAuth()
      ├── Live database confirms APPROVED? → HomeScreen
       ├── No session? → SignInScreen
      └── Live status not APPROVED or unreadable? → signOut → SignInScreen

SignInScreen
  ├── Login → signIn()
  │    ├── status: APPROVED → HomeScreen (session created)
  │    ├── status: PENDING → PendingApprovalScreen (no session)
  │    ├── status: REJECTED → RejectedScreen (no session)
  │    └── status: REVOKED → RejectedScreen (no session)
  └── Register → signUp()
       └── status: PENDING → OnboardingScreen → PendingApprovalScreen

PendingApprovalScreen
  └── "Check Status" button → checkStudentApprovalStatus()
       ├── APPROVED → auto-navigate to HomeScreen
      ├── REJECTED → redirect to RejectedScreen
      └── REVOKED → redirect to access-revoked state
```

---

## 8. Feature Status

| Feature | Implementation Files | Status |
|---|---|---|
| **Gated Student Signup** | `src/services/authService.js`, `src/screens/SignInScreen.jsx` | ✅ Complete |
| **Gated Login (Status Check)** | `src/services/authService.js`, `src/context/AuthContext.js` | ✅ Complete |
| **Pending Approval Screen** | `src/screens/PendingApprovalScreen.jsx` | ✅ Complete |
| **Rejected Screen** | `src/screens/RejectedScreen.jsx` | ✅ Complete |
| **Live Status Polling** | `src/services/authService.js` (checkStudentApprovalStatus) | ✅ Complete |
| **Session Auto-Eviction** | `src/context/AuthContext.js` | ✅ Complete |
| **Protected Home Dashboard** | `src/screens/HomeScreen.jsx` | ✅ Complete |
| **Protected Profile Editor** | `src/screens/EditProfileScreen.jsx` | ✅ Complete |
| **Bottom Navigation** | `src/components/BottomNav.jsx` | ✅ Complete |
| **Supabase-Confirmed Signup** | `src/services/authService.js`, `src/services/supabase.js` | ✅ Complete; local-only inserts are not reported as submitted |
| **Profile Photo Upload on Signup** | `src/screens/SignInScreen.jsx`, `src/services/authService.js` | ✅ Complete; students can attach profile photo via `expo-image-picker` on signup for admin verification |
| **Revoked Account Lockout** | `src/services/authService.js`, `src/context/AuthContext.js`, `App.jsx` | ✅ Client logic complete; admin writes require migration, server-only key, and production admin authentication |

---

## 9. Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://pwghazyfxhypzkadqfnn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## 10. Changelog
- **2026-09-29 (Memory Sync & PII Sanitization):** Replaced real student PII in SignInScreen demo quick-test pills with generic dummy data (`RIMT/22/BTCSE/0417 - Aarav Sharma` and `RIMT/23/BBA/0512 - Priya Kaur`). Re-synced master project memory with paired `ADMIN-PANEL-RIMT`, which completed the Admin Panel Authentication module (`NEW-FEATURE.md` Done, 18/18 admin auth unit tests passed, 21/21 onboarding unit tests passed, Next.js production build verified 7/7 pages optimized).
- **2026-09-29:** Added profile photo selection directly into the scholar registration signup form in `SignInScreen.jsx` via `expo-image-picker`. Students can upload/preview their profile photo on signup, and `signUpStudent` in `authService.js` stores the photo URL / base64 image into Supabase `students.avatar_url`. This allows administrators on the paired admin portal to visually verify and approve the student. Linting verified with 0 errors.
- **2026-09-29:** Documented the cross-project Supabase record contract and alias mapping: phone signup stores `name`/`roll_no`, while the admin adapter exposes `full_name`/`roll_number` aliases. The admin's new regression test passes for legacy mobile-shaped records (21/21 onboarding suite); this is not an end-to-end cloud-write test. Preserve the existing admin UI when addressing integration problems.
- **2026-09-29:** Signup and status checks now require live Supabase confirmation; local caches cannot grant account access. Approved sessions are polled for changes, and `REVOKED` accounts route to the access-denied screen. Admin writes require the shared schema migration and server-only service key; production admin actions also need signed admin authentication.
- **2026-09-29 00:05:00+05:30:** Fixed critical bug in admin panel's `db.js` where `rejectStudent()` was not persisting `rejection_reason` to Supabase cloud (only saved in-memory), and `approveStudent()` was not persisting `reviewed_by`/`reviewed_at`. Both functions now send complete PATCH payloads to cloud DB. Expo lint: 0 errors, 5 warnings. Admin tests: 15/15 pass.
- **2026-09-28 23:50:00+05:30:** Implemented real-time approval detection on `PendingApprovalScreen.jsx` with automatic 3.5s background polling — students are automatically redirected to the dashboard the instant an administrator approves them on the website, or kicked to `RejectedScreen` if rejected. Added strict unauthorized access gate in `App.jsx` (`handleNavigate`): attempts to access protected screens without `APPROVED`/`VERIFIED` status show an alert and are blocked. Restricted `BottomNav` so it only mounts for approved scholars on dashboard screens.
- **2026-09-28 23:30:00+05:30:** Updated `AGENT.hd` to reflect simplified registration flow. Registration now requires only 4 fields (Full Name, Roll Number, Department, Year/Semester) — email and password have been fully removed from the signup form and `authService.js`. Updated data model docs to match actual Supabase column names (`name`, `roll_no`, `course`, `batch`, `semester`). Departments locked to: BCA, B.Sc IT, B.Sc Cyber Security, B.Sc (Hons) AI & ML. Both Admin Panel `AGENT.hd` and App `AGENT.hd` are now in sync.
- **2026-09-28 23:05:00+05:30:** Fixed `[runtime not ready]: TypeError: Cannot read property 'fontSize' of undefined` crash on app launch. Root cause: `PendingApprovalScreen.jsx` and `RejectedScreen.jsx` attempted to access `Typography.bodyMedium.fontSize`, `Typography.caption.fontSize`, and `Typography.titleLarge.fontSize` which were not present in `src/theme/tokens.js`. Added missing `bodyMedium`, `bodySmall`, `bodySm`, `caption`, and `titleLarge` to `Typography`, added shorthand `Spacing` tokens (`xs`, `sm`, `md`, `lg`, `xl`, `xxl`) and `Radii.pill` in `tokens.js`. Hardened both screens with optional chaining and explicit fallbacks. All linters and tests passing.
- **2026-09-28 22:37:00+05:30:** Consolidated all memory into this single `AGENT.hd`. Removed duplicate files: `Agent.md`, `BRAIN.hd`, `BRAIN.md`. Only `AGENT.hd` remains as the master memory file for the student app.
- **2026-09-28 22:25:00+05:30:** Created gated onboarding screens (`PendingApprovalScreen`, `RejectedScreen`), status-aware `AuthContext`, and `authService` with dual Supabase + local storage layer.
- **2026-09-28 22:15:00+05:30:** Initial project memory system setup.
