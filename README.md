# RIMT Academic Trust — Training & Placement (T&P) Administration Portal

An enterprise-grade, institutional **Training & Placement Administration Portal** built with **Next.js 16**, **React 18**, **Tailwind CSS**, and **Supabase PostgreSQL / Realtime**, fully integrated with the student mobile ecosystem (**Expo React Native**).

---

## 🏛️ System Architecture

```
T-P-ADMIN-PORTAL/
├── docs/                   # Institutional documentation & system architecture guides
│   ├── ADMIN.md            # Administrative operational workflows & permissions
│   ├── AGENTS.md           # Backend agent protocols & pipelines
│   ├── CLAUDE.md           # Assistant development guidelines
│   ├── FULL-APP.md         # Full-stack system specifications
│   ├── RESUMEE.md          # Automated resume scoring & ATS parser docs
│   └── drive.md            # Placement drive lifecycle & live registration engine
├── public/                 # Static brand assets & logos
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, and API routes)
│   │   ├── api/            # Serverless backend APIs (Auth, Drives, Registrations, FCM, Stats)
│   │   ├── register/[slug] # Public student drive registration portal
│   │   ├── admin/          # Admin dashboard & accounts
│   │   └── company/        # Corporate recruiter portal
│   ├── components/         # Modular UI component library
│   │   ├── auth/           # RBAC & authentication guards
│   │   ├── drive/          # Drive drawers, form builders, and live registrant rosters
│   │   ├── internship/     # Corporate internship listings & credit monitoring
│   │   └── placement/      # Placement conversion charts & corporate cards
│   ├── lib/                # Database clients, auth APIs, FCM admin & utility engines
│   ├── styles/             # Global Tailwind stylesheets
│   └── views/              # Core administrative dashboard views
├── supabase/
│   └── migrations/         # PostgreSQL database schemas, triggers, and RLS policies
└── tests/                  # Automated ESM unit test suites (95 passing tests)
```

---

## ⚡ Core Features

1. **Recruitment Drive Management & Live Registration Engine**:
   - Create, schedule, and publish campus recruitment drives.
   - Dynamic Form Builder supporting custom qualification questions, backlogs, and CGPA constraints.
   - Real-time registrant rosters with instant Supabase Realtime synchronization.
   - Deduplicated, authoritative single-dispatch FCM push notifications.

2. **Student & Scholar Dossiers**:
   - Real-time approval/rejection verification workflows.
   - Instant live session invalidation guard for revoked or rejected scholars.
   - Detailed academic, project, certificate, and internship tracking.

3. **Corporate Partner Directory & Recruitment Portal**:
   - Partner directory with Tier-1 MNC categorizations, active MoUs, and SPOC contact mapping.
   - Corporate login and candidate talent pool exploration.

4. **Institutional Analytics & NAAC Compliance**:
   - Real-time placement rates, package distribution charts, and department conversion rates.
   - One-click CSV and report export generation.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.x or higher
- Supabase project credentials (URL & Anon/Service Role Key)

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Required variables:
```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your_anon_key
NEXT_PUBLIC_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

### 5. Run Automated Tests
```bash
npm run test
```
Executes all 5 test suites (95 unit tests) covering Onboarding, Admin Auth, Corporate Auth, Drive Registrations, and Single-Dispatch FCM deduplication.

---

## 📚 Documentation

For in-depth guides and architectural references, see the [`docs/`](./docs) directory:
- [Administrative Workflows & Permissions](./docs/ADMIN.md)
- [Drive Management & Registration Architecture](./docs/drive.md)
- [Resume & ATS Parsing Engine](./docs/RESUMEE.md)
- [Full Application Specification](./docs/FULL-APP.md)
