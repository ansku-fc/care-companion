

# 🏥 Clinical Dashboard — Updated Plan (Phase 1: Core)

A clean, minimal dashboard for a small clinic team (doctors & nurses) with role-based access.

---

## 1. Authentication & Role Management
- Login page for doctors and nurses
- Role-based access: **Doctors** (full access) and **Nurses** (limited permissions)
- User profiles with name, role, and avatar

## 2. Main Dashboard / Home
- Clean sidebar navigation: Dashboard, Calendar, Tasks, Patients, Notes
- **Today's schedule** displayed prominently on the home page
- Overview cards: today's appointments count, pending tasks, patient count
- **Clinical hours status panel** showing hours worked broken down by patient type:
  - Tier 1, Tier 2, Tier 3, Tier 4, Children, Onboarding, Acute, Case Management
  - Visual progress bars or compact chart per category
- Quick-access shortcuts to common actions

## 3. Schedule / Calendar
- **Home page**: condensed today's schedule (list of upcoming appointments)
- **Full calendar page**: weekly and monthly views with a larger, spacious layout
- Create, edit, and delete appointments linked to patients
- Color-coded by type (consultation, follow-up, procedure, etc.)

## 4. Priority Tasks
- Task list with **four categories**:
  - Clinical Review & Interpretation
  - Client Communication
  - Care Coordination
  - Documentation & Reporting
- Tasks can be **assigned to**: a specific patient, another doctor, or a nurse
- Priority levels (urgent, high, medium, low)
- Status tracking (to-do, in progress, done)
- Filter by assignee, category, and priority
- Due dates with overdue indicators

## 5. Patient List & Medical Cards
- Searchable, filterable patient directory
- Each patient has a detailed medical card with:
  - **Basic info**: name, contact, demographics, insurance
  - **File uploads**: lab results, imaging, PDFs, scanned documents
  - **Visit notes & vitals**: per-visit clinical notes and measurements
- **Health overview** organized into **16 body system categories**, each showing a summary status:
  - Senses
  - Nervous System
  - Physical Performance
  - Respiratory System
  - Hormone Function
  - Skin & Mucous Membranes
  - Immunity & Allergies
  - Body Composition & Nutrition
  - Liver Function
  - Mental Health
  - Kidney Function
  - Alcohol & Other Substances
  - Cardiovascular System
  - Cancer Risk
  - Musculoskeletal System
  - Sleep
- Each category can be expanded to view/add detailed notes, findings, and history
- Export health report as PDF

## 6. Clinical Hour Tracking
- Log clinical hours per day tagged by **patient type**: Tier 1–4, Children, Onboarding, Acute, Case Management
- Dashboard widget shows real-time progress per category
- Weekly/monthly summary views

## 7. Personal Notes
- Private notes section per user
- Create, edit, delete, and search notes

---

## Phase 2 (Future)
- WhatsApp & email integration for patient communication
- Advanced analytics and reporting
- Notification system for appointments and overdue tasks

---

## Tech Approach
- **Frontend**: React + Tailwind CSS, clean & minimal white/light theme
- **Backend**: Lovable Cloud (Supabase) for database, auth, file storage, and role management
- **Design**: Spacious layout, data tables, progress indicators, card-based health overview

