# ASSUMPTIONS.md — Drive Management Implementation

**Generated:** 2026-10-24  
**Spec Reference:** `supabase/migrations/DRIVE_MANAGEMENT_AGENT.md`

---

## 1. Repo Layout & Structure
- **Web Admin Portal (`ADMIN-PANEL-RIMT`)**:
  - Framework: Next.js 16 (App Router), React 18, Tailwind CSS.
  - State & Backend: Supabase Client (`@supabase/supabase-js` v2.117.2), Next.js API Route Handlers.
  - Validation: `zod` (v3).
  - Port: Runs locally on `http://localhost:3000` (`npm run dev`).
- **Student Mobile Application (`APP-RIMT-BCA`)**:
  - Framework: React Native 0.86.3, Expo 57, React 19.
  - Storage: `@react-native-async-storage/async-storage` v2.2.0.
  - Supabase: Realtime and Database client.
  - Design Tokens: Consistent design system defined in `src/constants/theme.js` (`Colors`, `Spacing`, `Radii`).

---

## 2. Package Manager & Execution Scripts
- Package Manager: `npm`.
- Test Runner: Native Node.js ESM test suite (`npm test`, executing `tests/*.test.mjs`).
- Database Migrations: Pure SQL files tracked under `ADMIN-PANEL-RIMT/supabase/migrations/`.

---

## 3. Supabase Client Setup
- URL: `https://pwghazyfxhypzkadqfnn.supabase.co`
- Web Client: `ADMIN-PANEL-RIMT/src/lib/supabaseClient.js`
- Mobile Client: `APP-RIMT-BCA/src/services/supabaseClient.js`
- Service Key Guard: Client bundles never expose service-role keys. Privileged functions execute via `SECURITY DEFINER` Postgres functions.

---

## 4. Auth & Roles
- **Admins**:
  - Authenticated via table `public.admins` with status `'ACTIVE'` and role `'ADMIN'` or `'SUPER_ADMIN'`.
  - Web sessions issue standard HMAC-SHA256 JWT tokens verified by `src/lib/auth.js` and `src/lib/middleware.js`.
  - Database function `public.is_admin()` checks:
    1. `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`
    2. `auth.role() = 'service_role'`
    3. Exists in `public.admins` where `(id = auth.uid() OR lower(email) = lower(auth.jwt()->>'email')) AND lower(status) = 'active'`.
- **Students**:
  - Records stored in `public.students`.
  - Database function `public.current_student_id()` resolves `s.id` from `public.students` where `s.id = auth.uid()` or matching email/session.

---

## 5. `students` Table Field Mapping
The existing `public.students` table schema specifies:
- Identity: `id` (UUID), `full_name` (alias `name`), `roll_number` (alias `roll_no`), `email`, `phone`.
- Branch / Department: `department` (alias `course`). Examples: `"BCA"`, `"B.Sc Cyber Security"`, `"B.Sc IT"`.
- Year / Semester: `semester` (alias `year_semester`, `batch`). Examples: `"1st Year (1st Sem)"`, `"3rd Year (5th Sem)"`.
- Status: `status` (`'PENDING'`, `'APPROVED'`, `'REJECTED'`, `'REVOKED'`).
- RLS and query mapping:
  - Branch filter maps to `department` or `course`.
  - Year filter checks `semester` or `year_semester`.

---

## 6. Existing Drive & Event Code
- **Database Tables**:
  - `public.placement_drives`: Stores company recruitment, college events, department functions, hackathons/competitions, workshops.
  - `public.drive_registrations`: Stores student registrations, links, and form answers.
- **Admin UI**:
  - `src/views/DriveManagement.jsx`: Primary drive management view.
  - `src/components/drive/DriveFormModal.jsx`: Drive creator & editor with form builder tab.
  - `src/components/drive/RegistrationLinksPanel.jsx`: Live applicant roster with Realtime updates and CSV export.
  - `src/lib/driveClient.js` & `src/lib/driveUtils.js`: Service layer for drive operations.
- **Mobile UI**:
  - `APP-RIMT-BCA/src/screens/PlacementScreen.jsx`: Drives tab with category filters, dynamic cards, Google Docs redirection, and registration workflow.
  - `APP-RIMT-BCA/src/services/driveService.js`: Mobile client for fetching drives and caching registrations.

---

## 7. Added Dependencies Justification
- **`zod`**:
  - Installed in `ADMIN-PANEL-RIMT`.
  - Rationale: Mandatory per Section 6 of `DRIVE_MANAGEMENT_AGENT.md` for building runtime answer validation (`buildAnswerSchema(fields)`), strict key rejection (`.strict()`), number coercion, and payload size bounds.

---

## 8. Ordered Execution Plan
1. **Phase 1: Migration** — Create `supabase/migrations/20261024_drive_management_forms.sql` with `drives`, `drive_forms`, `notifications`, RLS policies, `publish_drive`, and `register_for_drive`.
2. **Phase 2: Shared Schema Module & Unit Tests** — Create `src/lib/drives/schema.js` and `tests/drives-schema.test.mjs` verifying schema validation, answer types, and compatibility assertions. Run unit tests.
3. **Phase 3: API Route Handlers** — Implement all required Admin routes (`/api/admin/drives/*`) and Student routes (`/api/drives/*`, `/api/notifications/*`).
4. **Phase 4: Admin Portal UI** — Enhance `DriveManagement.jsx` and `DriveFormModal.jsx` with Form Builder tab, live preview, compatibility checks, copy shareable link, dynamic registration roster, and CSV export.
5. **Phase 5: Student Mobile App (`APP-RIMT-BCA`)** — Complete dynamic form modal in `PlacementScreen.jsx`, verify Google Docs external redirection, student credentials recording, and already-registered state.
6. **Phase 6: In-App Notifications & Deep Links & Web Fallback** — Add in-app notification center, `app/drives/[slug]/page.jsx` web fallback, and `.well-known` mobile association files.
7. **Phase 7: Hardening & Documentation** — Complete `docs/drive-management/API.md`, `MANUAL_STEPS.md`, test checklist, and final report.
