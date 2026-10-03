# CONTEXT.md — RIMT T&P Admin Portal: Admin-Controlled Student Records

> **Audience:** Antigravity IDE agent (and human reviewers).
> **Purpose:** Single source of truth for the change set described below. Read fully before touching code.
> **Scope of this change:** (A) Admin can Create/Read/Update/Delete a student's full profile "dossier" (bio, projects, Git projects, project certificates, internships, etc.). (B) Admin has **manual-only** control over academic metrics (CGPA, attendance, grades). Nothing is auto-calculated.

---

## 0. Knowledge Sources & Search Protocol (READ THIS FIRST)

This project's full documentation lives in **two files**. They are the **primary knowledge base** and the first place to look for anything about the project.

| File | Contains | Use it for |
|------|----------|-----------|
| `ADMIN.md` | Everything about the **Admin Panel** (T&P Web Admin Portal): modules, pages, components, routes, tables, RLS, API/actions, env, business rules | Any task touching the admin side |
| `APP.md` | Everything about the **Student App**: screens, flows, tables it reads/writes, auth, storage, business rules | Any task touching the student side, or how student data reaches the admin |
| `CONTEXT.md` (this file) | The specification for the current change set | What to build and the rules to follow |

### 0.1 The rule: docs first, folders last

**Do NOT crawl or grep the whole project tree to "get oriented."** All project data is already written in `ADMIN.md` and `APP.md`. Answer from them first. This saves time, avoids wrong assumptions from stale or unrelated files, and keeps the analysis consistent.

### 0.2 Mandatory workflow for every task

1. **Read `CONTEXT.md`** (scope, non-goals, rules).
2. **Open `ADMIN.md` and/or `APP.md`** depending on the task. If the task crosses both sides (e.g. student data entered by admin and shown in the app), read both.
3. **Search inside those files** for the relevant term (table name, route, component, module, status value, env var, business rule). Use the file's headings and table of contents to jump straight to the section.
4. **Analyze and answer using only what those files say**, and cite where it came from (e.g. "ADMIN.md → *Student Management* → *Data model*").
5. **Only then** write or change code, touching the minimum number of files.

When the user asks you to analyze something ("check how X works", "find where Y is stored", "what does Z affect"), **do that analysis inside `ADMIN.md` / `APP.md`**, not by scanning the repository.

### 0.3 What if the answer is NOT in ADMIN.md / APP.md?

Follow this escalation order and stop as soon as you have the answer:

1. **Re-search the docs** with synonyms and related terms (e.g. `cgpa` → `academic`, `summary`, `grade`; `student` → `scholar`, `registration`; `approve` → `status`, `onboarding`). Check both files, since the item may be documented on the other side.
2. **Targeted lookup in code**, never a full-tree scan. Go directly to the single most likely file or folder implied by the docs (for example the module's page component or its migration file), and read only that.
3. **Ask the user** one short, specific question if it is still ambiguous. Do not guess table names, column names or business rules.
4. **State assumptions explicitly** in your reply if you must proceed.

### 0.4 Keep the docs accurate (write back)

- If you had to go to code because the docs were missing something, **add that finding to the correct file** (`ADMIN.md` or `APP.md`) under the right section, so the next search finds it in the docs.
- After completing this change set, **update `ADMIN.md` and `APP.md`** with: new tables, new routes/actions, new components, RLS policies added, automation removed/disabled, and new business rules (especially "academic data is manual-only").
- If the docs and the code **disagree**, the running code and the database schema are the source of truth for *current behavior*. Flag the mismatch to the user and fix the doc. Do not silently pick one.
- Never delete existing documentation. Add or edit only the parts that changed. Keep the same heading style and tone.

### 0.5 Quick reference for the agent

- Need a table, column, RLS policy or status value? → search `ADMIN.md` / `APP.md`.
- Need to know what the student app reads or writes? → `APP.md`.
- Need to know an admin route, action or module? → `ADMIN.md`.
- Need the spec for this change? → the rest of this `CONTEXT.md`.
- Not documented anywhere? → follow §0.3, then update the docs per §0.4.

---

## 1. Product Overview

**App:** RIMT Academic Trust — *T&P (Training & Placement) Web Admin Portal*
**Dev URL:** `http://localhost:3000`
**Primary user:** Admin / HOD (logged in as an HOD, e.g. "HOD BCA").
**Companion app:** RIMT *student app* (students sign up there; records land in this portal for approval).
**Backend:** Supabase (the UI explicitly shows "SUPABASE STATUS SYNC" and "Live DB Sync Active"). Postgres + Auth + Storage + RLS.

### Existing sidebar modules (observed from UI — do not remove or rename)

| # | Module | Notes |
|---|--------|-------|
| 1 | Onboarding Approvals | Gated review queue. Statuses: Awaiting Review, Approved, Rejected, Revoked, Total Recorded. Search + Department filter + status tabs. |
| 2 | **Student Management** | **Main target of this change.** Hero banner "Comprehensive Scholar Directory & Verification Vault", stat cards (Total / Approved / Rejected / Awaiting), filter bar (name/roll/email, year/semester, department, Export), status tabs (All / Approved / Pending / Rejected / Revoked), buttons **Bulk Import** and **+ Add Student**. |
| 3 | Company Management | Out of scope. |
| 4 | Drive Management | Out of scope. |
| 5 | Training Management | Out of scope. |
| 6 | Internship Monitoring | Should later read from the new `student_internships` table (see §9). |
| 7 | Placement Statistics | Out of scope; must not break. |
| 8 | Report Generation | Should later read admin-entered academics (see §9). |

Global chrome that must stay intact: top search bar ("Search students, companies, drives..."), notification bell, profile chip (avatar initials, name, role), "System Active — Academic Yr 2024-25" footer badge.

### Visual language (match it)
- Primary: deep maroon/crimson (active nav pill, primary buttons). Dark hero cards with maroon-tinted gradient.
- Soft pastel gradient stat cards (rose, mint, sky, amber) with small pill badges ("Live database", "100% approved", "Needs review").
- Rounded-2xl cards, soft shadows, pill tabs, uppercase micro-labels with letter-spacing, bold large numerals.
- Font appears to be Inter-like sans-serif.
- Reuse existing components/tokens. **Do not introduce a new UI library or restyle unrelated screens.**

---

## 2. Goals

### Goal A — Admin-managed student dossier
For every student, the admin can view and edit, from one organized place:
1. **Bio / profile** (personal + academic identity, about/summary, skills, social links)
2. **Projects**
3. **Git projects** (repository links and metadata)
4. **Project certificates** (uploaded files + metadata)
5. **Internships**
6. Optionally: certifications/courses, achievements (only if trivial to add with the same pattern; otherwise leave as a follow-up)

"Organized document" = a structured, sectioned **Student Dossier** view: one page per student, with collapsible/tabbed sections, each section listing entries that can be added, edited, reordered, hidden, deleted, and exported (PDF/print view).

### Goal B — Manual academic control (no automation)
Admin manually enters/edits per student:
- **CGPA** (and optionally per-semester SGPA)
- **Attendance** (overall % and per-semester / per-subject if used)
- **Grades** (per subject, per semester)

**Hard rule: these values are NEVER computed, derived, synced, or overwritten by cron jobs, DB triggers, edge functions, or student-app writes.** The admin's saved value is the truth. Students get **read-only** access to their own academic data.

---

## 3. Non-Goals (do NOT do these)

- No auto-calculation of CGPA from grades. No auto-calculation of attendance from logs. No "recalculate" buttons, triggers, generated columns, or scheduled jobs for these fields.
- No redesign of Onboarding Approvals, Company, Drive, Training, Placement Statistics.
- No schema changes to existing tables beyond additive columns/FKs strictly needed.
- No hardcoded/mock data in production paths. UI must reflect the live Supabase data (the current screens display real counts such as 3 approved students).
- No exposing service-role keys to the browser.

---

## 4. Tech Stack — Verify Before Coding

The screenshots confirm **Supabase** and a web app on port 3000 (likely React/Next.js). **The agent must first look in `ADMIN.md` / `APP.md` (see §0), and only for gaps inspect the repo** (`package.json`, `app/` or `src/`, existing Supabase client, existing data-fetching pattern) and follow whatever is already used (Next.js App Router vs Pages, React Query/SWR vs plain fetch, Tailwind vs CSS modules, TypeScript vs JS). Do not assume; do not mix patterns.

**Discovery checklist (do first, report findings in the PR description):**
- [ ] Framework + router type
- [ ] Supabase client setup (browser client vs server client), env var names
- [ ] Existing `students` / `profiles` / registration table name and columns (status field values: pending, approved, rejected, revoked)
- [ ] How admin role is determined today (role column, JWT claim, allow-list)
- [ ] Existing RLS policies
- [ ] Existing Student Management page/component files and the data hook it uses
- [ ] Existing UI kit (buttons, modals, tabs, toasts, tables)

---

## 5. Roles & Permissions Matrix

| Resource | Admin / HOD | Student (own row) | Other students | Anonymous |
|---|---|---|---|---|
| Profile/bio | CRUD | Read (write only if product owner enables; default: **read-only**) | none | none |
| Projects / Git projects / certificates / internships | CRUD | Read | none | none |
| CGPA / attendance / grades | **CRUD (sole writer)** | **Read only** | none | none |
| Audit log | Read | none | none | none |

Enforcement must be **server-side via Supabase RLS** and not only hidden buttons in the UI.

Admin check (choose the mechanism already used in the repo; recommended pattern):

```sql
-- helper: true if current auth user is an admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid() and a.is_active = true
  );
$$;
```
If an equivalent already exists (role column, `profiles.role = 'admin'`, JWT claim), **reuse it** rather than adding `admin_users`.

---

## 6. Data Model (additive migration)

> Names are proposals. Map `student_id` FKs to the **actual existing student table's primary key** discovered in §4. Put SQL in a new timestamped migration file under the repo's migrations folder (e.g. `supabase/migrations/<timestamp>_admin_student_dossier.sql`). Never edit past migrations.

### 6.1 Profile / bio (extend or companion table)

If the existing student table already has bio-ish columns, add only what's missing; otherwise create a 1:1 companion table.

```sql
create table if not exists public.student_profiles (
  student_id      uuid primary key references public.students(id) on delete cascade,
  bio             text,
  headline        text,
  skills          text[]  default '{}',
  linkedin_url    text,
  github_url      text,
  portfolio_url   text,
  resume_url      text,
  updated_by      uuid references auth.users(id),
  updated_at      timestamptz not null default now()
);
```

### 6.2 Projects

```sql
create table if not exists public.student_projects (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  title         text not null,
  description   text,
  tech_stack    text[] default '{}',
  live_url      text,
  start_date    date,
  end_date      date,
  is_visible    boolean not null default true,
  sort_order    int not null default 0,
  created_by    uuid references auth.users(id),
  updated_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.student_projects (student_id, sort_order);
```

### 6.3 Git projects

```sql
create table if not exists public.student_git_projects (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  repo_name     text not null,
  repo_url      text not null,
  description   text,
  primary_language text,
  stars         int,
  is_visible    boolean not null default true,
  sort_order    int not null default 0,
  created_by    uuid references auth.users(id),
  updated_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint git_url_format check (repo_url ~* '^https?://')
);
create index on public.student_git_projects (student_id, sort_order);
```
Admin enters these manually. Optional later: a "Fetch from GitHub" helper that only **pre-fills the form** (admin still reviews and saves). It must never write silently.

### 6.4 Project certificates

```sql
create table if not exists public.student_certificates (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  project_id    uuid references public.student_projects(id) on delete set null,
  title         text not null,
  issuer        text,
  issue_date    date,
  credential_id text,
  credential_url text,
  file_path     text,          -- Supabase Storage object path
  file_mime     text,
  is_visible    boolean not null default true,
  created_by    uuid references auth.users(id),
  updated_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.student_certificates (student_id);
```
**Storage:** private bucket `student-certificates`, path convention `{student_id}/{certificate_id}/{filename}`. Allowed: PDF, PNG, JPG; max ~5 MB. Serve via short-lived signed URLs. Storage RLS mirrors the table rules (admin write; student read own).

### 6.5 Internships

```sql
create table if not exists public.student_internships (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  company_name  text not null,
  role_title    text not null,
  location      text,
  mode          text check (mode in ('onsite','remote','hybrid')),
  start_date    date,
  end_date      date,
  is_ongoing    boolean not null default false,
  stipend       numeric,
  description   text,
  offer_letter_path text,
  completion_certificate_path text,
  status        text not null default 'ongoing'
                check (status in ('ongoing','completed','terminated')),
  created_by    uuid references auth.users(id),
  updated_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.student_internships (student_id);
```

### 6.6 Academic records — **manual only**

```sql
-- One row per student per semester. Every value is typed in by the admin.
create table if not exists public.student_semester_records (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(id) on delete cascade,
  semester        int  not null check (semester between 1 and 12),
  academic_year   text,                              -- e.g. '2024-25'
  sgpa            numeric(4,2) check (sgpa between 0 and 10),
  attendance_pct  numeric(5,2) check (attendance_pct between 0 and 100),
  remarks         text,
  updated_by      uuid references auth.users(id),
  updated_at      timestamptz not null default now(),
  unique (student_id, semester)
);

create table if not exists public.student_grades (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  semester      int  not null,
  subject_code  text,
  subject_name  text not null,
  credits       numeric(3,1),
  grade         text,                                -- free text: 'A+', 'B', 'O', 'F' ...
  grade_points  numeric(4,2),
  updated_by    uuid references auth.users(id),
  updated_at    timestamptz not null default now(),
  unique (student_id, semester, subject_name)
);

-- Overall values (admin-entered, NOT derived from the tables above).
create table if not exists public.student_academic_summary (
  student_id          uuid primary key references public.students(id) on delete cascade,
  cgpa                numeric(4,2) check (cgpa between 0 and 10),
  overall_attendance  numeric(5,2) check (overall_attendance between 0 and 100),
  backlogs            int check (backlogs >= 0),
  updated_by          uuid references auth.users(id),
  updated_at          timestamptz not null default now()
);
```

**Manual-only guarantees (must all hold):**
- No `GENERATED ALWAYS AS` columns, no triggers, no DB functions, no cron, no edge functions that write `cgpa`, `sgpa`, `attendance_pct`, `overall_attendance`, or `grade*`.
- `student_academic_summary.cgpa` is independent of `student_grades`. Changing a grade must **not** change CGPA.
- If a legacy auto-compute job/trigger exists in the repo, **list it in the PR and disable it** (do not silently delete; comment out or gate behind an off-by-default flag and note it).
- The student app must have **no write path** to these tables.

### 6.7 Audit log (required for admin-controlled academic data)

```sql
create table if not exists public.admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users(id),
  student_id  uuid,
  table_name  text not null,
  record_id   text,
  action      text not null check (action in ('insert','update','delete')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
```
A generic **audit trigger** (`AFTER INSERT/UPDATE/DELETE`, `SECURITY DEFINER`) is allowed on the tables in §6.1–6.6 because it only *records* changes and never modifies academic values.

### 6.8 `updated_at` housekeeping
A simple `BEFORE UPDATE` trigger that sets `updated_at = now()` and `updated_by = auth.uid()` is allowed (it stamps metadata only).

---

## 7. Row Level Security (RLS)

Enable RLS on **every** new table. Pattern (repeat per table):

```sql
alter table public.student_projects enable row level security;

create policy "admin full access" on public.student_projects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "student reads own" on public.student_projects
  for select to authenticated
  using (student_id = public.current_student_id() and is_visible = true);
```

- `public.current_student_id()` = helper returning the student row id for `auth.uid()` (adapt to existing mapping).
- For `student_semester_records`, `student_grades`, `student_academic_summary`: **no student INSERT/UPDATE/DELETE policy at all** (select-own only).
- Never use the service-role key in client code. Any privileged server action goes through a server route/action that re-checks `is_admin()`.
- Test with three identities: admin, student A, student B (B must not read A).

---

## 8. Backend / API Layer

Follow the repo's existing pattern (Supabase client calls, Next route handlers, or server actions). Every mutation must:
1. Verify session + `is_admin()` server-side.
2. Validate input with a schema (Zod or the repo's existing validator).
3. Write via Supabase, stamping `updated_by`.
4. Return a typed result `{ ok: true, data } | { ok: false, error }`.
5. Trigger cache revalidation/refetch of the affected student view.

Suggested surface (adapt naming/style to repo):

| Operation | Purpose |
|---|---|
| `getStudentDossier(studentId)` | One call returns profile + all sections + academic summary + semester records + grades |
| `upsertStudentProfile(studentId, payload)` | Bio/headline/skills/links |
| `create/update/delete/reorder` for `projects`, `git_projects`, `certificates`, `internships` | Section CRUD (+ `is_visible`, `sort_order`) |
| `uploadCertificateFile(studentId, certId, file)` | Storage upload, returns path |
| `upsertAcademicSummary(studentId, {cgpa, overall_attendance, backlogs})` | Manual CGPA/attendance |
| `upsertSemesterRecord(studentId, semester, {sgpa, attendance_pct, remarks})` | Per-semester |
| `upsertGrades(studentId, semester, rows[])` | Bulk grade grid save (transactional) |
| `exportStudentDossier(studentId, format)` | PDF/print view |
| `getAuditLog(studentId, filters)` | Read-only history |

**Validation rules**
- CGPA/SGPA: 0–10, max 2 decimals. Attendance: 0–100, max 2 decimals.
- URLs must be `http(s)`. GitHub URL should match `github.com/<owner>/<repo>` when the field is Git repo (warn, don't hard-fail, for self-hosted Git).
- End date ≥ start date. If `is_ongoing`, end date must be empty.
- Trim strings; cap `bio` (e.g. 2,000 chars) and descriptions (e.g. 1,500).
- Reject files over size limit or wrong MIME.

---

## 9. Frontend Specification

### 9.1 Student Management page (existing) — additive changes only
- Keep hero banner, stat cards, filter bar, tabs, Bulk Import, Add Student, Export.
- Student list rows/cards get an action: **"Open Dossier"** (row click or button) → navigates to the student's dossier page/drawer.
- Optional compact columns in the list: CGPA, Attendance (read from `student_academic_summary`; show "—" if not entered, **never a fake 0**).
- Only **Approved** students get editable academic data by default. For Pending/Rejected/Revoked, show dossier read-only with a status banner (confirm with product owner if this restriction is wanted; default ON).

### 9.2 Student Dossier (new) — the "organized document"
Route suggestion: `/students/[id]` (or drawer/modal if the app uses that pattern).

Layout:
- **Sticky header:** avatar/initials, name, roll no, department, year/semester, approval status badge, "Last updated by X at T", **Export PDF** button.
- **Left rail / tabs (sections):** `Overview · Projects · Git Projects · Certificates · Internships · Academics · Activity Log`
- Each section = a card with title, count badge, **+ Add** button, and an ordered list of entries.
- Entry actions: Edit, Hide/Show (`is_visible`), Delete (confirm dialog), drag-to-reorder (or up/down arrows as fallback).
- Forms open in modal/side sheet, with inline validation, disabled Save until valid, loading state, success/error toast.
- Unsaved-changes guard when leaving a dirty form.

**Overview:** bio (textarea with counter), headline, skills (tag input), social links, resume upload.

**Academics tab (critical):**
- Top card "Academic Summary": editable **CGPA**, **Overall Attendance %**, **Backlogs**. Banner text: *"These values are entered manually by the admin and are not calculated automatically."*
- **Semester table:** rows = semesters; editable SGPA, Attendance %, Remarks.
- **Grades grid:** per semester, editable rows (Subject code, name, credits, grade, grade points), add/remove row, **Save semester** (bulk upsert, transactional).
- Show `updated_by` / `updated_at` next to each block.
- Confirmation modal when changing CGPA or attendance: shows old → new value, requires clicking **Confirm change**. (Audit log records it.)

**Activity Log tab:** table of audit entries (who, when, table, action, old → new diff summary), filterable, read-only.

### 9.3 UX states (every section)
Loading skeletons, empty state with CTA ("No projects added yet — Add project"), error state with retry, optimistic update only where rollback is implemented.

### 9.4 Accessibility / responsiveness
Keyboard-navigable forms, labels on all inputs, focus trap in modals, min 44px touch targets, works from 1280px down to tablet width.

---

## 10. Integration With Other Modules

- **Internship Monitoring:** read from `student_internships` (status, dates, company). Read-only there; edits happen in the dossier (or link out to it).
- **Report Generation:** academic reports read `student_academic_summary`, `student_semester_records`, `student_grades` exactly as stored. No recomputation.
- **Placement Statistics:** must keep working; if it currently reads CGPA from somewhere else, point it at `student_academic_summary` only after confirming values match, and note it in the PR.
- **Student app (companion):** exposes read-only views of the student's own dossier. No writes to admin-controlled tables. If the student app currently writes any of these fields, remove that write path and report it.

---

## 11. Implementation Plan (execute in this order, one PR/commit group per phase)

1. **Discovery** — complete the §4 checklist; write findings to the PR description.
2. **Schema + RLS + audit** — one migration per concern (`dossier tables`, `academic tables`, `audit`). Include down/rollback notes.
3. **Kill automation** — locate and disable any auto CGPA/attendance/grade logic (search: `cgpa`, `attendance`, `grade`, triggers, cron, edge functions, `rpc`).
4. **Backend layer** — server actions/routes + validation + `getStudentDossier`.
5. **Dossier UI: shell + Overview + Projects + Git Projects.**
6. **Certificates (with Storage) + Internships.**
7. **Academics tab** (summary, semester table, grades grid, confirm modal).
8. **Activity log tab + Export PDF.**
9. **Wire-ups** — list columns in Student Management, Internship Monitoring, Report Generation.
10. **QA pass** — §12 checklist.

Keep commits small and reversible. Do not refactor unrelated files.

---

## 12. Acceptance Criteria / Test Checklist

**Dossier**
- [ ] Admin can add, edit, hide, reorder, delete entries in Projects, Git Projects, Certificates, Internships.
- [ ] Certificate file uploads to private bucket and opens via signed URL; wrong type/size is rejected.
- [ ] Bio/skills/links save and persist after refresh.
- [ ] Export produces a clean, printable dossier.

**Manual academics**
- [ ] Admin can set CGPA, overall attendance, backlogs, per-semester SGPA/attendance, and grades.
- [ ] Changing a grade does **not** change CGPA. Adding attendance data elsewhere does **not** change stored attendance.
- [ ] Values remain unchanged after 24h / restart (no job overwrites them).
- [ ] Out-of-range input (CGPA 11, attendance -5) is rejected client- and server-side.
- [ ] Unset values display "—", not 0.
- [ ] Every academic change creates an audit log row with old and new values.

**Security**
- [ ] Student A cannot read Student B's rows; students cannot write any dossier/academic table (verify with real queries, not UI).
- [ ] Non-admin authenticated user calling admin actions gets a 403-style failure.
- [ ] No service-role key in the client bundle.

**Regression**
- [ ] Onboarding Approvals counts/filters unchanged (currently: 3 approved, 0 pending/rejected/revoked in the sample data).
- [ ] Student Management stats, filters, tabs, Bulk Import, Add Student, Export still work.
- [ ] No console errors; type-check and lint pass; build succeeds.

---

## 13. Rules of Engagement for the Agent

0. **Docs first.** Follow §0: search `ADMIN.md` / `APP.md` before touching the file tree, and write new findings back into them.
1. **Inspect before writing.** Match existing conventions (naming, folder structure, styling, data fetching), using the docs to find them.
2. **Additive, minimal diffs.** Don't rename or delete existing tables, routes, or components.
3. **Server-side enforcement first,** UI second.
4. **No mock data** and no placeholder numbers in shipped UI.
5. **No silent automation** touching academic fields — ever.
6. **Secrets stay in env vars;** never commit keys.
7. **Ask / flag, don't guess,** when a table or column name is ambiguous: state the assumption in the PR description.
8. After each phase, summarize: files changed, migrations added, how to test, known gaps.

---

## 14. Open Questions (confirm with the product owner; defaults in bold)

1. Can students edit their own bio/links? **No — read-only.**
2. Should Pending/Rejected/Revoked students be editable? **No — read-only.**
3. Multiple admins/HODs with department scoping (HOD BCA sees only BCA)? **Yes if a department field exists; scope RLS by department, otherwise all admins see all.**
4. Grade scale (10-point vs letter grades)? **Support both via free-text `grade` + numeric `grade_points`.**
5. Soft delete vs hard delete for dossier entries? **Hard delete with audit log entry.**

---

## 15. Glossary

- **Dossier:** the organized, per-student document that aggregates all admin-managed records.
- **Manual-only:** value is written exclusively by an admin action; no code path computes or overwrites it.
- **Approved student:** registration status = approved in Onboarding Approvals.

---

## 16. FINAL STEP — Update ADMIN.md and APP.md (MANDATORY, DO THIS LAST)

Once all work is finished and tested, the **last thing** the agent does is update `ADMIN.md` and `APP.md` with the latest changes, so these files always hold the current state of the project. The next AI session will rely on them instead of scanning the repo, so an outdated doc means wrong answers later.

**Do not end the task until both files are updated.**

### 16.1 What to write into `ADMIN.md`
- **Database:** every new table, column, index, function, trigger, RLS policy, storage bucket (dossier tables, academic tables, audit log, `is_admin()` / `current_student_id()` helpers, `student-certificates` bucket).
- **Routes / pages / components:** Student Dossier page, its tabs (Overview, Projects, Git Projects, Certificates, Internships, Academics, Activity Log), new forms/modals, changes to the Student Management list ("Open Dossier", CGPA/Attendance columns).
- **Backend actions/APIs:** every new function (e.g. `getStudentDossier`, `upsertAcademicSummary`, `upsertGrades`, certificate upload) with inputs, outputs, validation rules and who may call it.
- **Business rules:** state clearly that **CGPA, attendance and grades are manual-only** (admin is the sole writer, no auto-calculation anywhere), plus the confirm-before-change flow and audit logging.
- **Automation removed/disabled:** list every trigger, cron job, edge function or code path that was turned off, with file names.
- **Integrations changed:** Internship Monitoring, Report Generation, Placement Statistics, and how they now read data.
- **Assumptions, open questions and decisions** taken from §14.

### 16.2 What to write into `APP.md`
- Which new tables/fields the student app now **reads** (read-only): profile/bio, projects, Git projects, certificates, internships, academic summary, semester records, grades.
- Confirmation that the student app has **no write path** to admin-controlled data, and any old write path that was removed.
- Any student-app screens, queries or components changed or that still need changing.
- How student-visible data respects `is_visible` and RLS ("student reads own only").

### 16.3 How to update
1. Open each file, find the matching section using its headings (per §0), and **edit that section in place**. Create a new section only if none exists.
2. Keep the existing heading style, tone and format. **Never delete existing documentation**; correct only what changed.
3. Add a short entry to a **Changelog** section at the bottom of each file (create it if missing):
   `- YYYY-MM-DD — <what changed> — <files/tables touched>`
4. Make sure names in the docs match the code and migrations exactly (table, column, route, function names).
5. If something is planned but not done, mark it clearly as `TODO` or `Not implemented`. Do not document it as finished.

### 16.4 Completion checklist
- [ ] `ADMIN.md` updated with all changes above
- [ ] `APP.md` updated with all changes above
- [ ] Changelog entry added to both files
- [ ] Docs match the final code and database schema
- [ ] Final reply to the user summarizes what was changed in each doc
