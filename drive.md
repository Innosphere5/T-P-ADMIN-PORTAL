# drive.md — Drive Management Module: Frontend Specification

> **Project:** RIMT University Institutional Placement & Operations Portal (Admin Panel)
> **Module:** Drive Management (`src/views/DriveManagement.jsx`)
> **Prepared:** 2026-10-13 · **Revision 2** · **Evidence base:** `ADMIN.md` (self-declared "Last Updated: 2026-10-07") + the requirements stated by the project owner + **3 screenshots of the live admin panel (Drive Management ×2, Student Management ×1)**
> **Document type:** Analysis and specification only. **No source file, backend, or database has been modified.**
>
> **Revision 2 changes (owner request):**
> 1. The spec now matches the **real look of the current screen** (screenshots) — new §3.6, §5.9.
> 2. **All dummy data on the Drive Management screen is to be removed temporarily** (14 active drives, 684 offers, 48 companies, ₹34.5 LPA, the TCS hero, the four drive cards, all tab counts, etc.). Full inventory in §3.7; replacement behaviour in §5.10. The owner will connect the backend and supply real data later, so §5.11 lists the exact "data slots" to wire.
> 3. The new design must **keep the existing theme** (dark maroon hero, pastel gradient KPI cards, pill badges, maroon/gold actions) — nothing new is introduced.

---

## 0. How to read this document

Every statement is tagged so a developer or AI agent can tell evidence from opinion:

| Tag | Meaning |
|---|---|
| **[CONFIRMED]** | Stated explicitly in `ADMIN.md`. |
| **[REQUIREMENT]** | Stated by the project owner in the task brief. |
| **[RECOMMENDATION]** | My proposal, derived from the existing conventions. Not a fact about the current code. |
| **[UNVERIFIED]** | Plausible but not established by the materials. Must be checked in the real code before relying on it. |
| **[SCREENSHOT]** | Observed directly in the screenshots supplied by the owner (Revision 2). |

### 0.1 Materials that were NOT available (limitations)

1. ~~Screenshots were not accessible.~~ **Resolved in Revision 2:** three screenshots were supplied (Drive Management top, Drive Management scrolled showing drive cards, Student Management for reference). Visual statements are tagged **[SCREENSHOT]**. Exact hex values/spacing still need confirmation in browser DevTools (colours quoted here are read from the images and are approximate).
2. **No source code was provided.** Only `ADMIN.md`. All file-level statements come from that document's directory tree and descriptions. Line counts, props, state shape, and actual API calls inside `DriveManagement.jsx` are unknown.
3. **The student app repository was not provided**, so its notification screen, push-token handling, and navigation are unknown.
4. `ADMIN.md` was supplied twice in the brief (identical content); it is treated as a single source.

---

## 1. Project context

- **[CONFIRMED]** The admin panel is a **Next.js 16.3.8 (App Router) + React 18.3.1** app, styled with **Tailwind CSS 3.4.19**, using the institutional palette Primary Maroon `#6B0018`, Gold `#E7B94A`, Desert Surfaces `#FAF6F0`. Icons are Lucide React plus self-hosted Material Symbols (WOFF2/TTF).
- **[CONFIRMED]** The panel is a **single-page shell** (`src/app/page.jsx`) that renders one view per module, with a 3-state responsive sidebar (`src/components/Sidebar.jsx`) and a module registry in `src/constants/tokens.js`.
- **[CONFIRMED]** Admin access is restricted to two fixed administrators (HOD BCA and Vice HOD BCA). A separate **Company** role exists and may only access `companies` and `statistics` modules (`companyAllowedModules`). Drive Management is therefore **staff-only**.
- **[CONFIRMED]** The paired student app is **Expo SDK 57 + React Native 0.86.3**, using the same Supabase project. Students must be `APPROVED` to use the app; the app re-checks approved sessions every 3.5 seconds.
- **[CONFIRMED]** The backend is Next.js Route Handlers in `src/app/api/*` plus `src/lib/db.js` (Supabase adapter with in-memory fallback) and `src/lib/middleware.js` (`withAuth`).
- **[CONFIRMED]** Project-wide governance rule repeated across the document: **no fake/dummy data**; unset values show `—`; read failures show as sync errors, not as zero counts.

---

## 2. Objective and scope

### 2.1 Objective **[REQUIREMENT]**

Rework Drive Management so that university staff can publish and run company recruitment drives, university drives, and placement activities, and keep students informed. Four capabilities were requested:

| ID | Capability (owner's wording, normalised) |
|---|---|
| **A** | Create and manage upcoming drives / events. |
| **B** | Create and view **registration links** per drive. |
| **C** | Publish **announcements**, including schedule changes. |
| **D** | Communicate **results** to students. |
| **Cross-cutting** | When a drive/announcement/result is published, students who have the app installed should receive a **notification** in the app. |

### 2.2 In scope (frontend only)

- Redesign/extension of `DriveManagement.jsx` and any new presentational components it needs.
- Forms, validation, previews, confirmation dialogs, status indicators, and loading/empty/error/success states.
- A thin **client-side service layer** that calls whatever API exists (see §8).
- Honest representation of notification state (never claiming delivery that was not confirmed).

### 2.3 Out of scope

- **Any** change to `src/app/api/*`, `src/lib/db.js`, `src/lib/middleware.js`, `src/lib/auth.js`, `src/lib/schema.sql`, `enable_realtime.sql`, `supabase/migrations/*`, RLS, storage buckets, or backend configuration.
- Any change to the student app. Student-side notification rendering is a separate integration.
- Redesign of the design system, sidebar, auth, or other modules.
- The mobile admin screen `src/expo/screens/DriveManagementScreen.jsx` (see Q8).

---

## 3. Existing implementation analysis

### 3.1 What `ADMIN.md` says about Drive Management **[CONFIRMED]**

| Item | Documented fact |
|---|---|
| View file | `src/views/DriveManagement.jsx` — "Upcoming and active campus drives". |
| Purpose (§4.4) | "Placement drive scheduling and applicant tracking." |
| Features (§4.4) | Drive dates, job descriptions, compensation breakdown, eligibility criteria; registered applicant list and shortlisted student counters. |
| Mock data | `src/constants/data.js` is described as "Mock data for drives, student records, and training modules". |
| Mobile admin | `src/expo/screens/DriveManagementScreen.jsx` exists as one of 7 mobile admin screens. |
| Role access | Drive Management is excluded from the Company role's sidebar. |
| API | **No drive-related endpoint is documented** in §5 (Backend API Endpoints). |
| Schema | **No drive, registration, announcement, result, or notification table is documented** in §6. |
| Notifications | `Header.jsx` is described as having "notifications" in the top bar (admin side). **No student notification mechanism is documented anywhere** (no push-token table, no notification endpoint, no notifications screen in the student app). |

### 3.2 Reasonable inferences **[UNVERIFIED — verify in code]**

1. **[SCREENSHOT — now confirmed visually]** The screen shows hard-coded sample content (e.g. "14 Active Drives Scheduled", "684 Total Offers Extended", TCS/Infosys/Wipro/Amazon cards). It almost certainly comes from `src/constants/data.js` or literals inside `DriveManagement.jsx` (**[UNVERIFIED]** exact location). It conflicts with the project's "zero fake or dummy data" rule, which is why it is being removed (§3.7).
2. Applicant and shortlist counters ("320 registered • 142 in Round 2", "410 Submissions", "86 Active in Stage 3") are dummy values for the same reason.
3. The module's `id` in `src/constants/tokens.js` is unknown (only `companies` and `statistics` IDs are documented). Do not assume `drives`.
4. Because there are no documented drive endpoints or tables, **drives cannot currently be persisted or shared with the student app** through documented infrastructure.

### 3.3 Reusable building blocks **[CONFIRMED to exist]**

| Asset | Path | Reuse for |
|---|---|---|
| Accessible dialog wrapper | `src/components/Modal.jsx` | Create/edit drive, confirm-before-notify, delete confirmation. |
| Filter pills | `src/components/FilterPills.jsx` | Status filtering. |
| KPI card | `src/components/KpiCard.jsx` | Summary metrics row. |
| Hero banner | `src/components/HeroCard.jsx` | Module header. |
| Company SVG logos | `src/components/common/CompanyBrandLogo.jsx` | Drive cards (has monogram fallback for unknown companies). |
| Company catalog | `HIRING_COMPANIES_CATALOG` in `src/lib/placementStats.js` (6 entries; SPOC, MoU status, package range, sector) | Optional company picker/prefill. Read-only use. |
| Package tier badges | Super Dream ≥15 LPA, Dream ≥10, Standard 1 ≥6, Entry (in Placement Statistics) | Display of package range. |
| Department list | BCA, B.Sc IT, B.Sc Cyber Security, B.Sc (Hons) AI & ML (Onboarding Approvals filter) | Eligibility department chips. |
| Student list API | `GET /api/admin/requests?status=ALL` (admin-authenticated; returns students enriched with `cgpa`, `overall_attendance`) | Student picker for results; eligibility preview. **Read-only use of an existing endpoint.** |
| Patterns | Toast alerts (Onboarding Approvals); search + department filter (Onboarding/Student Management); CSV export of filtered rows (Student Management); 8-second polling (Talent Showcase); Supabase Realtime client `src/lib/supabaseClient.js` (Student Management / Dossier); drawer/modal detail views; **old-vs-new confirm-before-save diff modal** (Student Dossier) | Same interaction vocabulary for Drive Management. |
| Admin identity | `GET /api/admin/auth/me`, client helpers in `src/lib/authApi.js` | "Published by" attribution. |

### 3.4 Items that need visual/code confirmation before implementation

- ~~Current layout of the Drive Management screen~~ — **answered by screenshots, see §3.6.**
- Whether the screen already has a "Create Drive" button/form and what fields it has. **[SCREENSHOT]** The page-title row has buttons at the top-right that are cut off in the screenshots (one maroon button visible behind the sticky header). Their labels/behaviour must be confirmed in code.
- ~~Whether registration/shortlist counters are mock.~~ — **Yes, they are dummy (§3.7).**
- How `page.jsx` mounts the view and passes props (e.g., `userRole`, search query from `Header.jsx`).
- Whether new Material Symbols icon names render correctly (the project previously had a ligature-rendering failure; the font was self-hosted to fix it).

### 3.5 Inconsistencies found in `ADMIN.md` (affect how safely this spec can be executed)

1. **Module naming conflict:** the Feature Status table calls `CompanyManagement.jsx` "Talent Showcase", but later changelog entries (2026-10-05 and 2026-10-07) say the sidebar was restored to "Company Management". Do not rely on that label; it does not affect Drive Management but confirms the doc is not fully current.
2. **Student app repo naming:** the Tech Stack lists `c:\Users\r3dha\APP-RIMIT-(2)`, a migration path references `APP-RIMIT/...`, and the 2026-10-10 changelog references `APP-RIMT-BCA`. It is unclear which repository is the live student app.
3. **Department values:** the signup example uses `"B.Tech CSE"`, while filters list BCA / B.Sc IT / B.Sc Cyber Security / B.Sc (Hons) AI & ML. Eligibility department chips must use the values actually stored in `students.department`.
4. **Changelog chronology** is out of order (e.g., 2026-10-10 entries before 2026-10-07), and the header says last updated 2026-10-07. Treat dates as approximate.
5. **Security note:** `ADMIN.md` contains the administrators' plaintext passwords and hashes. This spec deliberately does not reproduce them. Consider removing them from the document before sharing it with any tool or contractor.

### 3.6 Visual audit of the current screen **[SCREENSHOT]**

**App shell (shared by every module — do not change):**

| Element | What the screenshots show |
|---|---|
| Sidebar | Light grey-white panel. Top: logo tile + "RIMT Trust" with green online dot and a pink-gradient pill "T&P ADMIN PORTAL". Label "CORE MODULES". Items are rounded white cards with a **pastel-tinted rounded icon tile** each: Onboarding Approvals, Student Management, Company Management, **Drive Management**, Training Management, Internship Monitoring, Placement Statistics, Report Generation. |
| Active item | **Maroon gradient** card, white text, white icon tile, small white dot at the right edge. |
| Hover | Item lifts to a white card and a dark tooltip with the module name appears (visible on Student Management). |
| Sidebar footer | "System Active · Academic Yr 2024-25" with green status dot (this label is static text; see §3.7 item 14). |
| Top bar | Rounded search pill "Search students, companies, drives…", bell icon with maroon unread dot, user chip "Raj Kumar · HOD BCA" with avatar, green presence dot and chevron. |
| Page background | Very light cool grey (approx. `#F5F5F9`), not the desert tone — the *shell* is cool grey, the *accents* are maroon/gold. |

**Drive Management page (top to bottom):**

1. **Page title row** — "Placement Drive Management" (large, bold) + grey pill "2024-25 Series"; action buttons at the right (partly hidden in the screenshots).
2. **Hero card** — near-black/dark-maroon gradient, rounded-2xl. Left: small eyebrow "NEXT UPCOMING ON-CAMPUS DRIVE" with a gold dot, a "Flagship Tier-1" outline pill, a very large white title ("TCS Digital & Ninja Hiring 2025"), a green "Verified Drive" badge, then an icon row (calendar + date/time, pin + venue, banknote + CTC) and an icon line with the registered-candidate count. Right: a translucent inner panel "COMPANY LIAISON" (name + organisation) and a **gold/amber pill button** "Manage Round 2 →".
3. **Four KPI cards** — equal width, rounded-2xl, **soft pastel gradients** (pink, green, blue, yellow), each with a coloured rounded icon tile at top-left, a white pill badge at top-right (trend / label), a big number with a small coloured unit chip, a bold label and a small coloured-dot caption.
4. **Tab/filter row** — pill tabs "All Drives (n) · Active / Ongoing (n) · Upcoming (n) · Completed (n) · Archived" (selected = maroon filled pill, others = soft grey pills) + a white floating panel at the right with "Filter by company, CTC…" input and a two-icon list/grid view toggle.
5. **Drive cards (full-width rows)** — one per drive, each with its own pastel gradient (pink TCS, blue Infosys, yellow Wipro, green Amazon). Left: company logo tile; centre: title + status pill (e.g. "In Progress", "Registration Open", "Round 3 Ongoing", "Offer Rollout Phase") + type pill ("Campus Drive", "Pan-Campus Pooled", "National Grid", "High Package Tier"); a meta line with ₹ icon + CTC, mortarboard icon + eligibility, people icon + registration count; below it a **stage pipeline** of small chips joined by arrows (done = green with check, ongoing = blue/amber with icon, upcoming = grey). Right: a small label/value block (INTERVIEW PANEL / ASSESSMENT DATE / INTERVIEW MODE / PLACEMENT STATUS) and a white **"Manage Drive ›"** button.

**Reference pattern — Student Management page (already wired to real data):** dark hero with a "Live registration records" badge and a "SUPABASE STATUS SYNC" pill; KPI cards with a **"Live database"** pill, real numbers (7 / 7 / 0 / 0) and captions like "Current Supabase records"; search + year/semester + department selects + Export; status pills with real counts ("All Students (7)", "Approved (7)", "Pending (0)"…). **Drive Management should adopt this exact "live data / sync status" vocabulary** once connected.

### 3.7 Dummy-data inventory (to be removed) **[SCREENSHOT]**

Everything below is hard-coded sample content visible on the Drive Management screen. Per the owner, it is removed **temporarily**; the owner will re-introduce real values from the backend later.

| # | Location | Dummy content seen | Remove / replace with |
|---|---|---|---|
| 1 | Hero eyebrow + title | "Next Upcoming On-Campus Drive", "TCS Digital & Ninja Hiring 2025", "Flagship Tier-1", "Verified Drive" | Hero kept (same dark card), content replaced by the neutral empty hero (§5.10). |
| 2 | Hero meta | "Oct 14, 2025 • 09:00 AM IST", "Auditorium 1 & Lab 4 (West Campus)", "₹7.5 – ₹11.5 LPA", "320 Eligible Candidates Registered" | `—` placeholders / hidden when no drive. |
| 3 | Hero liaison panel | "Anand Verma (Lead Campus HR) · TCS Northern Region TPO Cell" | "—" liaison, panel kept for layout. |
| 4 | Hero button | "Manage Round 2" | Disabled "Create Drive" / "No drive to manage" (§5.10). |
| 5 | KPI 1 | "14 Active · Active Drives Scheduled · +3 this week · 2024–25 Campus Series" | `—` + "No data yet". |
| 6 | KPI 2 | "684 Validated · Total Offers Extended · +18.4% YoY · Avg ₹6.8 LPA CTC" | `—` ; remove trend chip. |
| 7 | KPI 3 | "48 Registered · Visiting Companies · 8 Fortune 500 · Across 12 Core Sectors" | `—` ; remove "8 Fortune 500" chip. |
| 8 | KPI 4 | "₹34.5 LPA · Highest Package Offered · Trust Record · Atlassian Corp (Offered)" | `—` ; remove company name. |
| 9 | Tab counts | "All Drives (48) · Active / Ongoing (14) · Upcoming (18) · Completed (16)" | Counts removed or shown as `(—)`; tabs themselves kept. |
| 10 | Drive card — TCS | "In Progress", "Campus Drive", "₹7.5 – 11.5 LPA", "B.Tech CSE / IT • CGPA ≥ 6.5", "320 registered • 142 in Round 2", stages OA / Tech Viva / Managerial HR / Final Rollout, "Auditorium 1 (Panel 1–8) Oct 14, 09:00 AM IST" | Whole card removed. |
| 11 | Drive card — Infosys | "Infosys SpringBoard Recruitment", "Registration Open", "Pan-Campus Pooled", "₹6.5 – 9.5 LPA", "B.Tech & MCA • CGPA ≥ 7.0 • No Active Backlogs", "Closes in 48 hours", "410 Candidates Registered", "Oct 19, 2025" | Whole card removed. |
| 12 | Drive card — Wipro | "Wipro Elite National Talent Hunt", "Round 3 Ongoing", "National Grid", "₹5.5 – 7.0 LPA", "86 Active in Stage 3", "Virtual MS Teams Panels · Today, Concluding 5:30 PM" | Whole card removed. |
| 13 | Drive card — Amazon (and any cards below the fold) | "Amazon WOW & FTE Software Dev", "Offer Rollout Phase", "High Package Tier", "₹28.0 LPA", "SDE-1 • 14 Shortlisted for Offers", "Final HR Round Completed", "PLACEMENT STATUS" | Whole card removed. **Check below the fold in code for further hard-coded cards.** |
| 14 | Static labels with a year | "2024-25 Series" (page title pill), "Academic Yr 2024-25" (sidebar footer), dates in **2025** while today is **2026-10-13** | Title pill: show only if derived from data/config, else hide. Sidebar footer belongs to the shared shell — **flag, do not change here.** |

**Not dummy — keep untouched:** sidebar, top bar, search, bell, user chip, page title text, tab names, filter placeholder, view toggle, layout, colours.

**Also remove from the data layer (frontend only):** the drive sample array/objects that feed these items in `src/constants/data.js` *(only the drive entries; other modules' mock data must stay)* and any inline literals in `DriveManagement.jsx`. If the owner prefers to keep the arrays for later reference, stop **importing** them into the view instead of deleting them.

---

## 4. Functional requirements

Priority key: **M** = must, **S** = should, **C** = could. "Backend-dependent" items are detailed in §8.

### 4.1 A — Drive creation and management

| ID | Requirement | Pri |
|---|---|---|
| A1 | Admin can create a drive with the fields in §5.4. Drafts can be saved without publishing. | M |
| A2 | Admin can edit, duplicate, cancel, and mark a drive completed. Hard delete only for drafts. | M |
| A3 | Drive list with search (title/company/role), status filter pills, category filter, department filter, sort (date, recently updated). | M |
| A4 | Drive detail view (drawer or modal) showing all information, eligibility, registration, announcements, results. | M |
| A5 | Client-side validation: required fields, date logic (end ≥ start, registration deadline ≤ drive start), https URLs, numeric ranges (package min ≤ max, CGPA 0.00–10.00, backlogs ≥ 0). | M |
| A6 | Category support covering the owner's three scopes: **Company Recruitment**, **University Event**, **Placement Activity** (e.g., pre-placement talk, workshop, mock test). | M |
| A7 | Eligibility: department chips, batch/semester, minimum CGPA, maximum backlogs, free-text notes. Unset = "No restriction" (not 0). | M |
| A8 | Eligibility preview (count of matching approved students). Unset CGPA must be treated as **unknown**, never as 0 or ineligible. | C |
| A9 | Edits to a **published** drive show an old-vs-new diff and ask whether to notify students (see C2). | S |
| A10 | CSV export of the current filtered drive list. | C |

### 4.2 B — Registration links

| ID | Requirement | Pri |
|---|---|---|
| B1 | Admin can add one or more registration links per drive: label, URL (https), opens-at (optional), closes-at/deadline, enabled/disabled toggle. | M |
| B2 | Registration section in the drive detail: list links with status (Not yet open / Open / Closed / Disabled — derived from dates and toggle), **Copy**, **Open in new tab**, **Edit**, **Disable**. | M |
| B3 | Registration status badge visible on the drive list. | M |
| B4 | Registrant and shortlist counters display `—` when the source is not available (e.g., an external form). They must never show invented numbers. | M |
| B5 | If an internal registration source exists (see Q3), show a registrant table with search and CSV export. | C (backend-dependent) |
| B6 | Links are presented to students inside the app only through the notification/drive payload; the admin UI must not promise that students can see a link unless the integration confirms it. | M |

> **Interpretation note [RECOMMENDATION]:** "Create registration links" is treated as *admin enters/manages a link* (e.g., Google Form, company portal URL). Generating a system-hosted registration page or tracked token needs backend work and is **not** assumed. See Q3.

### 4.3 C — Announcements and schedule updates

| ID | Requirement | Pri |
|---|---|---|
| C1 | Admin can publish an announcement: title, message, type (**General**, **Schedule Change**, **Instruction**, **Registration Reminder**), optional drive link, optional priority (Normal / Important). | M |
| C2 | **Schedule Change** helper: when date/time/venue of a published drive changes, pre-fill an announcement with old → new values. Admin must confirm before publishing. | S |
| C3 | Announcement timeline inside each drive, plus a module-level "All announcements" feed for announcements not tied to a drive. | M |
| C4 | Draft / Published states; edit and retract (retract = mark withdrawn in the admin list; whether students' copies disappear is backend/app-dependent). | S |
| C5 | Character limits and preview of how the text will appear (title + body snippet) before sending. | S |

### 4.4 D — Results

| ID | Requirement | Pri |
|---|---|---|
| D1 | Results section per drive with stages (e.g., **Shortlisted**, **Round cleared**, **Final selected / Offer**, **Not selected**), each holding a list of students. | M |
| D2 | Add students by searching approved students (name / roll number) via the existing student list endpoint, or paste roll numbers with a validation report (matched / not found / duplicates). | S |
| D3 | Result entries are **admin-authored only**; nothing is auto-derived. Unset result shows `—`. | M |
| D4 | Result announcement composer with confirm-before-publish showing audience (who will be told) and message preview. | M |
| D5 | Decision needed (Q6): result visibility — personal message per student vs. list visible to all registrants. UI must support personal vs. broadcast targeting if backend allows. | M (blocked by Q6) |
| D6 | CSV export of result lists. | C |

### 4.5 Notifications (cross-cutting)

| Event | Triggered from | Suggested audience | Confirm dialog shows |
|---|---|---|---|
| **New drive** | "Publish & Notify" on a drive | Approved students matching eligibility (default) or all approved students (toggle) | Audience description, title, body preview |
| **Registration opened / reminder** | Registration section | Same as drive audience | Link label, deadline |
| **Schedule change** | Edit of published drive or C1 | Drive audience (registrants if known) | Old → new diff |
| **General announcement** | Announcements tab | Selected audience | Preview |
| **Result published** | Results tab | Students in the result stage(s) | Count + stage + preview |

Rules **[RECOMMENDATION]**:

1. Notification is an **explicit admin action** with a confirmation dialog, never a silent side effect of saving.
2. Show a per-event **notification status**: `Not sent`, `Sending…`, `Accepted by server`, `Delivered to N` (only if the API returns a count), `Failed` (with message), or `Unknown / Not connected`. The UI must never display "Students notified" unless the API response confirms it.
3. Guard against **double-sends**: disable the action while in flight, show the last-sent timestamp, and require an extra confirmation to re-send.
4. Audience is limited to students with status `APPROVED`/`VERIFIED`, consistent with the project's access gating (pending/rejected/revoked students cannot use the app).

---

## 5. UI/UX specification

All visuals follow the existing admin panel: maroon primary, gold accent, white cards with soft borders, solid (non-translucent) modal surfaces (a past bug let table text bleed through modals). **Revision 2:** §5.9 documents the exact look seen in the screenshots; every new element must be built from that vocabulary. No new design system. (`ADMIN.md` lists desert `#FAF6F0` as the surface token, but the screenshots show a cool light-grey page background; trust the live app/DevTools over the doc.)

### 5.1 Module layout (top to bottom)

1. **Page title row** (keep as in the screenshot): "Placement Drive Management" + series pill (only if data-driven) + action buttons (primary **+ New Drive** in maroon).
2. **Hero card** (dark maroon/black, same structure as the current "Next Upcoming On-Campus Drive" hero): shows the nearest upcoming *real* drive when one exists; otherwise the neutral empty hero (§5.10).
3. **KPI row** — keep the **same four pastel gradient cards** (pink / green / blue / yellow) and their positions. Metrics, once real data exists, may stay as the current four (*Active Drives Scheduled*, *Total Offers Extended*, *Visiting Companies*, *Highest Package Offered*) or be re-pointed to *Upcoming*, *Registration Open*, *Closing in 7 days*, *Results Pending/Published* — **owner to decide**; either way values come from the loaded list and a failed load shows a sync-error state instead of `0`.
4. **Toolbar:** keep the existing pill tabs (All Drives · Active / Ongoing · Upcoming · Completed · Archived) and the "Filter by company, CTC…" box with list/grid toggle. Additional filters (category, department, Draft/Registration Open/Closed/Results Published/Cancelled, sort, Export CSV) are added **inside the same floating white panel style**, not as a new bar.
5. **Drive list:** the screenshot shows **full-width row cards with a stage pipeline**; keep that as the default view, with the toggle switching to a compact list/grid (Talent Showcase convention). Each card: company logo (`CompanyBrandLogo` or monogram), title, category tag, date/time, mode/venue, package range with tier badge (when set), registration status badge, last-notified indicator, and **View** / **Edit** actions.
6. **Drive detail drawer/modal** (same pattern as the Student Dossier): header with title, status, primary actions (Edit, Publish & Notify, Cancel drive), then tabs (§5.2).
7. **Secondary tab at module level:** **Drives | Announcements** — "Announcements" shows the cross-drive feed and composer for general notices.

### 5.2 Drive detail tabs

| Tab | Contents |
|---|---|
| **Overview** | Description, role, mode/venue, schedule, package, rounds, SPOC, attachments (if any). |
| **Eligibility** | Department chips, batch, min CGPA, max backlogs, notes, optional eligibility count with "CGPA unset → unknown" handling. |
| **Registration** | Link manager (B1–B3), deadline countdown, counters (`—` if unavailable), registrant table if supported. |
| **Announcements** | Timeline for this drive, composer, Schedule Change helper. |
| **Results** | Stage-wise lists, student picker, result composer, export. |
| **Notifications** | Log of notify actions from this UI session/API: event type, time, admin name, audience size, status. Shows "Not connected" if no API. |

### 5.3 Forms and dialogs

- **Create/Edit Drive** uses `Modal`. Group fields into sections (Basics, Schedule, Package, Eligibility, Rounds & Contact). Save as Draft / Save & Publish. Inline field errors; focus moves to the first invalid field.
- **Publish & Notify confirm** (modeled on the Dossier confirm-before-save modal): audience summary, message preview, editable notification title/body, "I understand students will be notified" checkbox for new-drive and result events.
- **Schedule change confirm:** old-vs-new table, optional auto-drafted announcement.
- **Destructive actions** (cancel drive, delete draft, retract announcement) require a confirm dialog; cancelling a published drive offers "Notify students" as a separate checkbox, off by default.

### 5.4 Drive fields **[RECOMMENDATION]**

| Field | Type | Req. | Notes |
|---|---|---|---|
| Title | text | ✔ | |
| Category | select | ✔ | Company Recruitment / University Event / Placement Activity |
| Company / organisation | text + optional catalog picker | ✔ for Company Recruitment | Logo via `CompanyBrandLogo`, monogram fallback |
| Role / position | text | | |
| Description | multiline | ✔ | Plain text; render safely (no raw HTML) |
| Mode | select | ✔ | On-campus / Off-campus / Online / Hybrid |
| Venue or meeting link | text / URL | | Required by mode |
| Drive start / end | date-time | ✔ | Timezone: see Q9 |
| Registration deadline | date-time | ✔ if registration used | ≤ drive start |
| Package (LPA) min / max | number | | Display tier badge only when set; never default to 0 |
| Departments | multi-select chips | | Values must match `students.department` |
| Batch / semester | multi-select | | Match `students.batch` strings |
| Min CGPA | number 0.00–10.00 | | Blank = no restriction |
| Max backlogs | integer ≥ 0 | | Blank = no restriction |
| Other criteria | multiline | | |
| Selection rounds | ordered list | | Name + optional date |
| Required documents | tags | | |
| SPOC name / email / phone | text | | |
| Attachment (JD) | file | optional | See §8.4 |
| Status | derived/controlled | | Draft, Published, Cancelled, Completed (stored lifecycle) |
| Published by / at | read-only | | From admin identity |

### 5.5 Status model **[RECOMMENDATION]**

- **Lifecycle (set by admin):** `Draft` → `Published` → `Completed` or `Cancelled`.
- **Derived display badges (computed from dates/toggles in the UI):** `Upcoming`, `Registration Open`, `Registration Closed`, `In Progress`, `Results Published`.
- Derived badges are display-only. Whether the backend also stores them is unknown.

### 5.6 States

| State | Behavior |
|---|---|
| Loading | Skeleton cards/rows; toolbar disabled. |
| Empty (no drives) | Illustration-free empty card with "Create your first drive" button. |
| Empty (filters) | "No drives match" with Clear filters. |
| Error | Sync-error banner with Retry; KPIs show `—`, not `0` (project rule). |
| Not connected (current temporary state) | Show the §5.10 layout: pastel KPI cards with `—`, empty hero, empty-state card, no drive cards. Banner "Drive service is not connected. Changes cannot be saved or sent." Actions needing the backend are disabled with an explanatory tooltip. |
| Saving / sending | Button spinner + disabled; prevent double submit. |
| Success | Toast (same style as Onboarding Approvals) stating exactly what the server confirmed. |
| Failure | Toast + inline message; form data preserved. |

### 5.7 Responsive and accessibility

- Use the existing breakpoints and the 3-state sidebar behavior; drawers become full-screen sheets on small screens; tables become stacked cards.
- Wide tables scroll inside their own container, not the page.
- All dialogs via the accessible `Modal` (focus trap, Esc to close, labelled title). Verify `Modal.jsx` actually traps focus before relying on it.
- Status is conveyed by text + icon, not color alone. Toasts use `aria-live="polite"`. Form errors are tied to inputs with `aria-describedby`.
- Date/time inputs are keyboard operable and always show the timezone.

### 5.8 Admin workflow (happy path)

1. **New Drive** → fill form → **Save Draft**.
2. Add **registration link** + deadline.
3. **Publish & Notify** → review audience/message → confirm → status badge shows server-confirmed result.
4. If plans change → edit date → diff modal → optional **Schedule Change** announcement → confirm.
5. After the drive → **Results** tab → add shortlisted/selected students → **Publish results** → confirm → status.
6. Mark drive **Completed**.

### 5.9 Theme-match rules (from the screenshots) **[SCREENSHOT + RECOMMENDATION]**

Every new or changed element must reuse these patterns. Colours are read from the images (approximate) — confirm in DevTools / `tailwind.config.js` and reuse the existing tokens rather than hard-coding.

| Pattern | Rule |
|---|---|
| Primary colour | Institutional maroon (`#6B0018` per `ADMIN.md`) for selected tabs, active sidebar item, primary buttons. Maroon **gradient** on the active sidebar card. |
| Accent | Gold/amber pill button on the dark hero (`#E7B94A` family) for the hero's main action. |
| Hero | Dark near-black/maroon gradient, `rounded-2xl`, white text, translucent inner panel on the right, eyebrow in small uppercase tracking-wide text with a coloured dot, outline pill for tier. |
| KPI cards | Equal width, `rounded-2xl`, 1px soft border, pastel gradient backgrounds: **pink ≈ `#FCF1F3`, green ≈ `#EFFBF5`, blue ≈ `#EDF4FE`, yellow ≈ `#FDF9E6`** fading to white; coloured rounded icon tile (maroon / green / blue / amber); white pill badge top-right; large bold number + small uppercase unit chip; bold label; small coloured-dot caption. |
| Status pills | Small rounded-full pills with a leading dot or icon: green = in progress / done, blue = registration open / ongoing, amber = needs attention / high tier, pink-red = high-package tier, grey = neutral type tags. Text + icon always present (not colour alone). |
| Tabs | Rounded-full pills; selected = filled maroon with white text; unselected = soft grey/white with grey text; count in brackets. |
| Drive row cards | White-to-pastel gradient by status family, `rounded-2xl`, generous padding; logo tile at left; right-aligned small uppercase label + bold value; white `rounded-xl` "Manage Drive ›" button with chevron. |
| Stage chips | Small rounded chips joined by arrow icons; done = green + check icon, current = tinted + icon (hourglass / phone), future = grey. |
| Buttons | Primary maroon filled; secondary white with subtle shadow; hero action gold. Icon + label, chevron/arrow for navigation actions. |
| Typography | Bold, large page title; uppercase tracking-wide micro-labels; no new fonts. |
| Icons | Existing Lucide / self-hosted Material Symbols only (verify ligatures render — R11). |
| Surfaces | Cool light-grey page background, white floating panels with soft shadow, solid modal surfaces. |
| Data-status vocabulary | Reuse Student Management's **"Live database"** pill and **"… status sync"** pill style for the connected state; add a **"Not connected"** variant in the same shape for the temporary state. |

### 5.10 Temporary "no data" state (replaces the dummy data) **[REQUIREMENT + RECOMMENDATION]**

Goal: the screen looks exactly like the current design, but contains **no invented values**. When the owner later connects the backend, real values drop into the same slots with no layout change.

| Zone | Temporary behaviour |
|---|---|
| Page title row | Title unchanged. Series pill hidden (or shows only a configured/derived value). Action buttons unchanged; any button that needs the backend is disabled with tooltip "Drive service not connected". |
| Hero | Same dark hero. Eyebrow: **"NEXT UPCOMING ON-CAMPUS DRIVE"**. Title: **"No upcoming drive scheduled"**. Sub-text: "Create a drive to see it here." Date / venue / CTC / registered rows show `—` (or are hidden). Liaison panel shows "COMPANY LIAISON — `—`". Gold button becomes **"+ Create Drive"** (disabled while not connected). Remove "Verified Drive" and "Flagship Tier-1" badges. |
| KPI cards | Keep all four pastel cards and icons. Number = `—`. Unit chip kept (ACTIVE / VALIDATED / REGISTERED …) or hidden. Caption = "No data yet". **Remove** trend/claim chips (+3 this week, +18.4% YoY, 8 Fortune 500, Trust Record, Atlassian Corp). Top-right pill shows a neutral **"Not connected"** (or "Awaiting data"). |
| Tabs | All tabs rendered; counts hidden or shown as `(—)`. Selected tab stays "All Drives". |
| Filter panel | Rendered, inputs disabled or functional but with nothing to filter; view toggle works. |
| Drive list | **No cards.** Show one empty-state card in the same rounded-2xl style: icon tile, "No drives yet", sub-text "Drives added by the T&P team will appear here.", and a **"+ Create Drive"** button. If a filter is active and nothing matches: "No drives match your filters" + **Clear filters**. |
| Banner | Optional slim banner above the list, same pill style: "Drive service is not connected. Changes cannot be saved or sent." (shown only while no API exists, per §5.6 *Not connected*). |
| Errors | If the API exists but fails: sync-error banner + Retry; KPIs `—`, never `0`. |

Rules:
1. **No placeholder numbers, names, companies, logos or dates** may be displayed as if real. `—` is the only stand-in (project convention).
2. Do **not** hide the whole layout; the owner needs to see the final structure while the backend is pending.
3. Do **not** store sample drives in `localStorage`/memory (see §8.3). A clearly labelled non-persistent "Preview mode" for design review is the only exception and must be off by default.
4. Keep the markup/props for hero, KPI cards, drive cards and stage chips in the component code (fed by an empty array / null) so connecting the backend is a data change, not a redesign.

### 5.11 Data slots to wire later (for the owner's backend work) **[RECOMMENDATION]**

Each removed dummy item maps to one field the backend/API must supply. Names are illustrative (see Appendix A).

| UI slot | Future source | Derivation notes |
|---|---|---|
| Hero drive | Nearest `Published` drive with `startsAt ≥ now`, ordered by `startsAt` | Hero shows empty state when none. |
| Hero date / venue / CTC | `startsAt`, `venue`, `packageMinLpa`–`packageMaxLpa` | Show `—` if unset; never `0`. |
| Hero "registered" line | `registrations` count (or `—` if external form) | See B4. |
| Hero "Verified Drive" badge | A verified flag set by admin (**[UNVERIFIED]** whether such a field is wanted) | Hidden unless the field exists. |
| Hero liaison | `spoc.name`, `spoc.organisation` | `—` if unset. |
| Hero button label | Current round name (e.g. "Manage Round 2") | Falls back to "Manage Drive". |
| KPI 1 — Active drives | Count of drives in lifecycle `Published` and in progress | "+N this week" only if API provides a comparison. |
| KPI 2 — Total offers | Count of results at stage "Final selected / Offer" | Average CTC chip only if computable from real offers. |
| KPI 3 — Visiting companies | Distinct `companyName` across drives | "Fortune 500"/sector chips only if a company-catalogue field exists (`HIRING_COMPANIES_CATALOG` has sector data). |
| KPI 4 — Highest package | Max `packageMaxLpa` among offered results | Company name caption only from real offer data. |
| Tab counts | Counts per derived status (All / Active / Upcoming / Completed / Archived) | Hide until loaded. |
| Drive row card | One real `Drive` object (Appendix A) | Status pill and type pill from `status` + `category`; eligibility line from `eligibility`; registration count; stage chips from `rounds`; right-hand block label chosen by stage (Interview Panel / Assessment Date / Interview Mode / Placement Status). |
| Series pill / academic year | Config or derived from drive dates | Not hard-coded. |

---

## 6. Frontend file and component mapping

### 6.1 Existing files (from `ADMIN.md`) and expected involvement

| Path | Status | Responsibility / Planned involvement |
|---|---|---|
| `src/views/DriveManagement.jsx` | **Modify (primary)** | Current drive screen. Content/props **unknown — inspect first**. |
| `src/constants/data.js` | Read; likely stop consuming drive mock data | Contains mock drive data. Do not delete other mock data used by other modules. |
| `src/constants/tokens.js` | Inspect; avoid change | Module registry; confirm Drive Management entry (label, icon, `shortDesc`). Only change copy if the owner asks. |
| `src/components/Sidebar.jsx` | **Do not modify** | Already staff-only handling for Company role. Verify Drive Management remains hidden for `COMPANY`. |
| `src/app/page.jsx` | Inspect only | How the view is mounted; must keep `CompanyLockedModuleView` guard intact. |
| `src/components/Modal.jsx`, `FilterPills.jsx`, `KpiCard.jsx`, `HeroCard.jsx` | Reuse as-is | Do not alter shared behavior; if a variant is needed, wrap it. |
| `src/components/common/CompanyBrandLogo.jsx` | Reuse | Company logo/monogram. |
| `src/lib/placementStats.js` | Read-only reuse | `HIRING_COMPANIES_CATALOG` for company prefill. **Do not edit** (feeds Placement Statistics). |
| `src/lib/authApi.js` | Read/consume | Admin session/token handling. Prefer **not** adding drive methods here (it is the auth client). |
| `src/lib/supabaseClient.js` | Possible consume | Only if a drives table with Realtime exists and RLS allows admin reads. Unknown. |
| `src/views/OnboardingApprovals.jsx`, `StudentManagement.jsx`, `CompanyManagement.jsx` | Reference only | Copy interaction patterns (toasts, filters, CSV export, polling), do not edit. |
| `src/components/student/StudentDossierModal.jsx` | Reference only | Tabbed modal + confirm-before-save diff pattern. |
| `src/styles/globals.css`, `tailwind.config.js` | Avoid change | Use existing tokens; if a token is missing, note it rather than redefine. |
| `src/expo/screens/DriveManagementScreen.jsx` | **Out of scope** unless Q8 says otherwise | Mobile admin screen. |

### 6.2 Proposed new frontend files **[RECOMMENDATION — none of these exist today]**

Names are suggestions; align with team convention after inspecting the code.

| Proposed path | Purpose |
|---|---|
| `src/components/drive/DriveCard.jsx` | List/grid card. |
| `src/components/drive/DriveFormModal.jsx` | Create/edit form with validation. |
| `src/components/drive/DriveDetailDrawer.jsx` | Tabbed detail view. |
| `src/components/drive/RegistrationLinksPanel.jsx` | Link manager. |
| `src/components/drive/AnnouncementsPanel.jsx` | Timeline + composer + schedule-change helper. |
| `src/components/drive/ResultsPanel.jsx` | Stage lists, student picker, composer. |
| `src/components/drive/NotifyConfirmModal.jsx` | Shared confirm-before-send dialog with preview and audience. |
| `src/components/drive/StatusBadges.jsx` | Lifecycle + derived badges, notification status chip. |
| `src/lib/driveClient.js` *(client-side only)* | Thin fetch wrapper around whatever drive API exists; centralises error mapping and the "Not connected" detection. **Contains no server logic.** |
| `src/lib/driveUtils.js` *(pure functions)* | Validation, derived-status computation, date formatting, diff builder. |

If `DriveManagement.jsx` is large, keep it as the orchestrator and push UI into the components above to avoid a repeat of very large files (e.g., `StudentLinkedInProfileModal.jsx` is documented at 2,936 lines).

### 6.3 Must-not-touch (backend boundary)

`src/app/api/**`, `src/lib/db.js`, `src/lib/middleware.js`, `src/lib/auth.js`, `src/lib/schema.sql`, `src/lib/enable_realtime.sql`, `supabase/migrations/**`, `.env*`, and the student app repository.

---

## 7. Frontend-only implementation plan

### Phase 0 — Verification (no code changes)
1. Read `DriveManagement.jsx`, `data.js`, `tokens.js`, `page.jsx`, `Sidebar.jsx`, `Modal.jsx`, `FilterPills.jsx`, `KpiCard.jsx`.
2. ~~Obtain screenshots~~ — received (Revision 2); layout recorded in §3.6. Still locate where the dummy data lives (`data.js` vs. inline literals) and note the hidden top-right buttons.
3. In the running app, inspect the browser Network tab for any existing drive or notification calls; check `src/app/api` for undocumented routes (read-only).
4. Ask the backend/student-app owner for the answers in Q1–Q4 (**blocking**).
5. Confirm the Material Symbols icons you intend to use render.

### Phase 1 — Foundations
1. Create `driveUtils.js` (validation, derived status, diff) and `driveClient.js` (API wrapper with "Not connected" detection).
2. **Remove all dummy data listed in §3.7** (hero TCS drive, liaison, four KPI values and chips, tab counts, TCS/Infosys/Wipro/Amazon cards, any further hard-coded cards). Replace with the §5.10 temporary empty state, keeping hero/KPI/card components intact and fed with empty data.
3. Confirm visually (against the original screenshots) that sidebar, top bar, colours, card shapes and spacing are unchanged.

### Phase 2 — Drive CRUD UI (A)
1. KPI row, toolbar, filters, card grid/list, search.
2. `DriveFormModal` with validation; draft vs. publish.
3. `DriveDetailDrawer` with Overview and Eligibility tabs.

### Phase 3 — Registration (B)
1. `RegistrationLinksPanel`, status badges, copy/open actions, deadline handling, `—` counters.

### Phase 4 — Announcements (C)
1. `AnnouncementsPanel`, module-level feed, Schedule Change helper with old-vs-new diff.

### Phase 5 — Results (D)
1. `ResultsPanel`, student picker using the existing student list endpoint, paste-and-validate roll numbers, composer, export.

### Phase 6 — Notification workflow
1. `NotifyConfirmModal`, per-event status chip, send-state handling, double-send guard, Notifications tab/log.
2. Wire to the real API **only if** Q1–Q2 confirm one exists; otherwise ship in "Not connected" mode with actions disabled and clear messaging.

### Phase 7 — Hardening
1. Responsive pass (sidebar collapsed/expanded/mobile), keyboard and screen-reader pass, long-text and many-record tests.
2. Confirm Company role cannot reach the module.
3. Run `npm run build` (documented as verified in the project) and fix any warnings.

---

## 8. Dependencies and limitations

### 8.1 Requirement-by-requirement dependency matrix

| Requirement | What the frontend can do alone | Needs backend / student app (not part of this task) |
|---|---|---|
| A — Drive CRUD | All UI, validation, forms, filtering | **Persistence.** No drive table/endpoint is documented. Without it, drives cannot be saved or shared. |
| B — Registration links | UI to enter/manage/copy/open links, deadline logic | Storing links; any registrant tracking; link visibility inside the student app. |
| C — Announcements | Composer, preview, timeline UI | Storing announcements; delivering them; showing them in the app. |
| D — Results | Student picker (existing read endpoint), composer, export | Storing results; per-student delivery; privacy enforcement. |
| Notifications | Compose, preview, confirm, status display | **Delivery.** No push-token storage, notification endpoint, or student notification screen is documented. OS push (e.g., Expo push) vs. in-app inbox is undecided. |
| Audit trail | Display "published by" | `admin_audit_log` exists but is written by backend; no documented drive logging. |
| Eligibility count | Client-side comparison using `cgpa` from the student list endpoint | Accuracy depends on registrar-entered CGPA being present. |

### 8.2 Existing APIs the frontend may call **[CONFIRMED]**

- `GET /api/admin/requests?status=ALL` — students (approved/verified subset for pickers).
- `GET /api/admin/auth/me` — current admin identity.
- Admin authentication uses a bearer token with priority over cookies (documented fix); use the same helpers as other views.

No documented endpoint exists for drives, announcements, registrations, results, or notifications.

### 8.3 Handling a missing backend

If Q1 reveals no API: build the full UI against `driveClient.js`, detect 404/501/network failure, and show **"Not connected"** instead of pretending success. Do **not** persist drives in `localStorage` or in-memory fake data presented as real, because it would violate the project's no-fake-data policy and mislead admins into believing students were informed. A clearly labeled, non-persistent "Preview mode" is acceptable for design review only.

### 8.4 Attachments (optional)

`POST /api/cloudinary/sign` is public and validates folders against `^rimt-academic-trust\/[A-Z0-9_-]{1,32}$`. A folder such as `rimt-academic-trust/DRIVES` would satisfy the pattern, so JD uploads could technically reuse it without backend edits. Defer unless the owner requests attachments; the endpoint was designed for student documents, and storing the resulting URL still needs drive persistence.

### 8.5 Limitations to state to stakeholders

- A frontend-only deliverable can **prepare and present** notifications but cannot **guarantee** delivery.
- Counters for external-form registrations cannot be known to the panel.
- Eligibility previews depend on data completeness; unset CGPA is unknown.

---

## 9. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | No backend for drives/notifications → feature appears complete but nothing reaches students | "Not connected" mode; status chip shows only confirmed states; align with backend owner early (Q1–Q2). |
| R2 | Duplicate notifications (double-click, retry) spam all students | Disable in flight, show last-sent time, extra confirm to re-send. |
| R3 | Wrong audience (e.g., unapproved students, ineligible departments) | Restrict to approved; show audience summary in confirm modal; default to eligible-only. |
| R4 | Mock data left in place, violating no-fake-data governance | **Confirmed present (§3.7).** Remove all listed items; search the code for leftover literals (company names, "LPA", "2025", "320", "684"); verify counters show `—`. |
| R14 | Removing dummy data accidentally changes the look (hero/KPI/cards disappear, spacing shifts) | Keep components and markup; feed them empty data; compare against the screenshots (§5.9–5.10). |
| R15 | Hard-coded 2024-25 / 2025 dates make the portal look stale in 2026 | Derive from data/config; flag shared sidebar footer for the owner. |
| R5 | Eligibility logic treats missing CGPA as 0 | Treat as unknown; show "—". |
| R6 | Timezone confusion on dates/deadlines | Show timezone everywhere; clarify Q9. |
| R7 | Shared component regressions (`Modal`, `FilterPills`, `KpiCard`) | Wrap instead of modify; smoke-test other modules. |
| R8 | Role leakage to Company users | Keep sidebar exclusion and `CompanyLockedModuleView`; test both roles. |
| R9 | Large single-file component | Split into `src/components/drive/*`. |
| R10 | Unsafe rendering of admin-entered text/URLs | Render text as plain text; validate https; `rel="noopener noreferrer"` on external links. |
| R11 | Icon ligature failure for new icons | Verify icon names in the self-hosted font. |
| R12 | Result privacy (students seeing others' outcomes) | Resolve Q6 before building list visibility. |
| R13 | `ADMIN.md` outdated/inconsistent (§3.5) | Verify against code before implementation. |

---

## 10. Acceptance criteria

### Functional
- [ ] **Dummy data removal:** none of the items in §3.7 is visible anywhere on the screen or in the shipped bundle for this view (no TCS/Infosys/Wipro/Amazon cards, no 14 / 684 / 48 / ₹34.5 LPA, no tab counts, no liaison name, no trend chips).
- [ ] **Temporary state:** hero, four KPI cards, tabs, filter panel and empty-state card render per §5.10 with `—` placeholders and a "Not connected" indication.
- [ ] Drive list loads from the real source, showing loading, empty, and sync-error states; KPIs never show `0` on failure.
- [ ] No mock drive data is displayed as real.
- [ ] Admin can create (draft/published), edit, duplicate, cancel, complete a drive; delete only drafts.
- [ ] All form validations in A5 work and block invalid saves with clear messages.
- [ ] Search, category, department, status filters and sorting work together; filter-empty state is distinct from no-data state.
- [ ] Registration links can be added, edited, disabled, copied, and opened in a new tab; status is derived correctly from dates and toggle.
- [ ] Registrant/shortlist counters show `—` when unavailable.
- [ ] Announcements can be composed, previewed, published, and viewed in the drive timeline and the module feed.
- [ ] Editing a published drive's schedule shows an old-vs-new diff and offers a Schedule Change announcement.
- [ ] Results can be assigned to students by search/paste, with a validation report for unmatched or duplicate roll numbers.
- [ ] Every notify action shows a confirmation with audience, preview, and requires explicit confirmation.
- [ ] Notification status reflects only what the API confirmed; "Not connected" is shown when applicable.
- [ ] Double-send is prevented while in flight and re-sends require extra confirmation.

### Non-functional
- [ ] Visual style matches the existing panel exactly (§5.9): dark maroon hero, pastel gradient KPI cards, maroon pill tabs, gold hero button, rounded-2xl cards, solid modals, existing badges and toasts.
- [ ] Side-by-side with the original screenshots, only the data (not the design) has changed.
- [ ] Works at mobile, tablet, desktop widths and with all three sidebar states; no horizontal page scroll.
- [ ] Keyboard-only operation works; focus is trapped in dialogs and returned on close; Esc closes.
- [ ] Status never relies on color alone; toasts are announced to assistive tech.
- [ ] Company-role users cannot see or reach Drive Management.
- [ ] No changes to backend files listed in §6.3 or to other modules' behavior.
- [ ] `npm run build` succeeds; existing automated suites (documented as 65/65) are unaffected.
- [ ] No console errors/warnings introduced; external links use `rel="noopener noreferrer"`.

### Manual validation scenarios
1. Create → publish → confirm dialog → success/failure state is accurate.
2. Backend unreachable → "Not connected" shown; no false success.
3. Edit date after publishing → diff → optional announcement.
4. Registration closes by deadline → badge flips without reload (or after refresh, as designed).
5. Student with unset CGPA → not counted as ineligible; shown as unknown.
6. Log in as Company → Drive Management absent; direct navigation shows the locked view.
7. 100+ drives and very long titles/descriptions render without layout breakage.
8. Fresh load with no backend: the page shows the §5.10 empty state, nothing flashes dummy values before rendering, and no console errors appear.

---

## 11. Unresolved questions

**Blocking (answer before building Phase 6):**

1. **Is there any API/table for drives, announcements, registrations, results?** None is documented. Who owns it, and what are the endpoint paths and payload shapes? (The shapes in this spec are illustrative and must be reconciled.)
2. **How does the student app receive notifications?** In-app inbox (polling/Realtime) or OS push (Expo push tokens)? Is there already a notification screen in the student app? Which repository is the live student app (`APP-RIMIT-(2)`, `APP-RIMIT`, or `APP-RIMT-BCA`)?
3. **What does "create registration link" mean?** Admin pastes an external URL (assumed here), or the system should generate/track registrations itself?

**Important (affect design, not blockers):**

4. **Audience:** all approved students, or only those matching eligibility (department/batch/CGPA)? Can admins override per notification?
5. **Who can publish?** Both fixed admins equally? Is approval or two-person review needed for results?
6. **Result visibility:** private per-student message, or a list visible to all registrants (or all students)?
7. **Edits and retractions:** if a drive is cancelled or an announcement withdrawn, should students' earlier notifications be updated or removed?
8. **Mobile admin parity:** should `src/expo/screens/DriveManagementScreen.jsx` receive the same changes now or later?
9. **Timezone and date format** for display and deadlines (assumed single institutional timezone; not stated).
10. **Company role:** should corporate recruiters ever see or create their own drives? (Currently excluded.)
11. ~~Existing screen look~~ — **answered by the screenshots (§3.6).** Remaining: what do the cut-off buttons in the page-title row do, and should the four KPI metrics stay as the current four or change to the Upcoming / Registration Open / Closing soon / Results set (§5.1)?
12. **Placement Statistics linkage:** should published results feed the Placed Students card or statistics? Not assumed; those currently derive from `placementStats.js` and must not be altered by this work.

---

## Appendix A — Illustrative client data shapes (for the UI; to be reconciled with the real API)

```js
// Drive (UI model)
{
  id, title, category,            // 'COMPANY_RECRUITMENT' | 'UNIVERSITY_EVENT' | 'PLACEMENT_ACTIVITY'
  companyName, roleTitle, description,
  mode, venue, meetingUrl,
  startsAt, endsAt, registrationDeadline,
  packageMinLpa, packageMaxLpa,   // null when unset (never 0)
  eligibility: { departments: [], batches: [], minCgpa: null, maxBacklogs: null, notes: '' },
  rounds: [{ name, date }],
  spoc: { name, email, phone },
  status,                         // 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED'
  registrationLinks: [{ id, label, url, opensAt, closesAt, enabled }],
  announcements: [{ id, type, title, message, priority, status, publishedAt, publishedBy }],
  results: [{ stage, students: [{ rollNo, name }], publishedAt }],
  notifications: [{ event, sentAt, sentBy, audienceCount, status, error }],
  createdBy, createdAt, updatedAt
}
```

## Appendix B — Notification status chip values

`NOT_SENT` · `SENDING` · `ACCEPTED` (server accepted, delivery unknown) · `DELIVERED(n)` (only if API returns n) · `FAILED(reason)` · `NOT_CONNECTED`
