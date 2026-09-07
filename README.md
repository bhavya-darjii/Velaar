# Velaar 🚀

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2.0-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)
![Express](https://img.shields.io/badge/Express-5.2.1-lightgrey.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg)
![Gemini](https://img.shields.io/badge/Gemini-3.5_Flash-orange.svg)
![Vite](https://img.shields.io/badge/Vite-Rolldown-646cff.svg)

**Velaar** is a state-of-the-art, AI-powered academic management and institutional intelligence platform designed to modernize the higher-education workflow from the ground up. By combining Google Gemini generative AI, computer vision (OCR), real-time attendance tracking, and hierarchical analytics, Velaar provides a unified ecosystem for educational institutions—supporting teachers, students, administrators, heads of departments, and institutional leadership.

Built with extreme performance, enterprise scalability, and design excellence in mind, Velaar features a responsive glassmorphic UI, strictly typed TypeScript across frontend and backend, and native PostgreSQL multi-tenant isolation via Supabase.

---

## 📑 Table of Contents

- [Velaar Global AI Copilot](#-velaar-global-ai-copilot)
- [Comprehensive Multi-Role Architecture](#-comprehensive-multi-role-architecture)
- [Smart Attendance System](#-smart-attendance-system)
- [Core Features & AI Capabilities](#-core-features--ai-capabilities)
- [Database & Schema Architecture](#-database--schema-architecture)
  - [Core Database Tables](#core-database-tables)
  - [How to Fetch the Database Schema](#how-to-fetch-the-database-schema)
- [Technology Stack](#️-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Available Scripts](#available-scripts)
  - [Running the Application](#running-the-application)
- [Project Structure](#-project-structure)
- [Developer & Contributing](#-developer--contributing)
- [License](#-license)

---

## 🤖 Velaar Global AI Copilot

The crown jewel of the platform is the **Global AI Copilot**. Integrated seamlessly across every dashboard and layout, the Copilot is context-aware and role-specific:
- **For Educators:** Synthesizes course roadmaps, unit lesson plans, question banks, Bloom's Taxonomy-aligned exam papers, and lecture slides.
- **For Students:** Explains complex concepts, generates interactive flashcards, quizzes, and customized study summaries.
- **For Administrators & HODs:** Queries departmental telemetry, accreditation readiness, faculty workloads, and student risk factors.
- **Resilient AI Key Pool:** Features an automated multi-account LRU (Least Recently Used) key rotation pool to guarantee zero downtime and mitigate rate limits during high concurrency.

---

## 🏢 Comprehensive Multi-Role Architecture

Velaar provides a massive suite of specialized dashboards tailored to every stakeholder in the educational ecosystem:

| Role | Portal Capabilities |
|---|---|
| **👨‍🏫 Teacher Portal** | Automated Lesson Plans, Question Bank Engine, Examination Editor, PPT Generator, Mark Entry, Student Risk Analytics, Lab Manual Builder, CO Attainment & Rubric tracking. |
| **🎓 Student Portal** | Personalized Study Materials, Lecture Vault, Flashcards, Timetable, Exam-taking portal, and QR Attendance Scanner. |
| **👔 HOD Portal** | Departmental Oversight, Course Outcome (CO) Mapping, Faculty Workload, Student Performance Curves, and Meeting Agendas. |
| **👑 Admin Portal** | Institution-level configuration, AI-driven Timetable Generation, Role Invitations, Notice Board Broadcasting, and User Management. |
| **🛡️ Velaar Admin Portal** | Multi-institution super-admin hub, AI token usage telemetry, cost analytics (USD/INR), and platform-wide monitoring. |
| **👨‍👩‍👧 Parent Portal** | Real-time student progress timeline, attendance records, academic alerts, and teacher remarks. |
| **🏛️ Exam Controller & Registrar** | Institutional exam scheduling, hall-ticket generation, mark audits, and transcript validation. |
| **🏫 Principal Portal** | High-level executive dashboard tracking institutional performance, accreditation health, and cross-department KPIs. |

---

## 📅 Smart Attendance System

Say goodbye to manual roll calls. Velaar introduces a lightning-fast, cryptographically secured attendance ecosystem:
- **Teacher Attendance Session:** Teachers initiate live attendance sessions with dynamic QR tokens and configurable auto-expiration.
- **Student Attendance Scanner:** Students scan the live QR code directly via their mobile camera using the built-in HTML5 QR engine.
- **Instant Validation:** Logs are captured in real-time with duplicate-scan prevention and immediate dashboard reflection.

---

## ✨ Core Features & AI Capabilities

- **🧠 Deep AI Content Generation:** Synthesizes syllabi, lesson plans, question banks, lecture slide decks (PPTX), and study resources via Google Gemini.
- **📄 Smart Document Processing:** Upload raw syllabi or curriculum documents in PDF, DOCX, or image format. Integrated **Tesseract.js OCR** and **PDF.js** extract and structure academic units automatically.
- **📝 Examination Editor & Auto-Grading:** Create custom assessments, configure marking patterns (TT1, TT2, Semester End Exams), and automate grading with detailed feedback rubrics.
- **📤 Enterprise Exporting:** Export lesson plans, syllabi, question papers, and slides directly to **DOCX**, **PDF**, and **PPTX** formats.
- **📈 Hierarchical Analytics:** Multi-tiered performance metrics from university level down to individual student course outcomes.
- **🎨 Glassmorphic Interface:** Crafted with custom CSS variables, dark-mode styling, subtle SVG noise textures, and smooth WebGL/CSS micro-animations.

---

## 🗄️ Database & Schema Architecture

Velaar utilizes **PostgreSQL** hosted on **Supabase** as its core database, utilizing Row-Level Security (RLS) and Service Role clients for administrative queries.

For full relational specifications, column data types, constraints, and generated SQL DDL, see the **[Complete Database Schema Documentation](docs/DATABASE_SCHEMA.md)**.

### Core Database Tables

| Table Name | Description | Key Relationships |
|---|---|---|
| **`institutions`** | Multi-tenant educational institutions, colleges, slugs, and branding configs. | Root multi-tenant entity |
| **`users`** | Core user directory across all roles (`student`, `teacher`, `hod`, `admin`, etc.). | `institution_id -> institutions.id` |
| **`courses`** | Academic courses, modules, lesson plans, exam patterns, marks, and roadmaps. | `institution_id -> institutions.id` |
| **`attendance_sessions`**| Live and past teacher attendance sessions with QR tokens and expiration timers. | `course_id -> courses.id` |
| **`attendance_logs`** | Student check-in timestamps and attendance verifications. | `session_id -> attendance_sessions.id`, `course_id -> courses.id` |
| **`exams`** | Created examinations, questions, types, and mark breakdowns. | `course_id -> courses.id`, `teacher_id -> users.id`, `institution_id -> institutions.id` |
| **`marks`** | Student exam submissions, scores, and answer payloads. | `exam_id -> exams.id`, `student_id -> users.id` |
| **`syllabus`** | Extracted and structured unit-by-unit syllabus data. | `course_id -> courses.id`, `teacher_id -> users.id` |
| **`presentation_history`**| Auto-generated slide decks and lecture JSON data. | `course_id -> courses.id`, `teacher_id -> users.id` |
| **`timetable`** | Institutional and departmental semester schedules. | `institution_id -> institutions.id` |
| **`role_invitations`** | Pre-approved role onboarding links for students, teachers, and admins. | `institution_id -> institutions.id` |
| **`ai_logs`** | Token telemetry, cost tracking (USD/INR), and feature analytics. | Standalone telemetry log |

### How to Fetch the Database Schema

You can fetch and inspect the full Velaar database schema using several methods:

#### Method 1: Built-in Automation Script (Recommended)
Velaar includes a built-in CLI tool that queries the live Supabase PostgREST OpenAPI schema, generates an interactive Mermaid ER diagram, full Markdown tables with constraints, and SQL DDL definitions:

```bash
npm run fetch-schema
```

This generates:
- **`docs/DATABASE_SCHEMA.md`** — Comprehensive human-readable schema documentation and ER diagram.
- **`docs/database_schema.json`** — Raw OpenAPI/PostgREST schema JSON for automated toolchains.

#### Method 2: Supabase CLI (TypeScript Types & SQL Dump)
If you have the Supabase CLI installed, you can generate TypeScript type definitions or dump the raw SQL schema directly:

```bash
# Generate TypeScript definitions directly from your Supabase project
npx supabase gen types typescript --project-id <your-project-ref> > frontend/types/database.types.ts

# Dump complete public SQL schema
npx supabase db dump --project-id <your-project-ref> --schema public > schema.sql
```

#### Method 3: Direct PostgreSQL Connection (`pg_dump`)
You can export the public schema using standard PostgreSQL tools with your Supabase database connection string (found in Supabase Dashboard → Settings → Database):

```bash
pg_dump -h db.<your-project-ref>.supabase.co -U postgres -d postgres --schema-only > docs/schema.sql
```

#### Method 4: Supabase Web Dashboard
1. Log in to [supabase.com](https://supabase.com/) and select your Velaar project.
2. Navigate to **Table Editor** to view all tables, rows, and relationships visually.
3. Open **Database → Schema Visualizer** for an interactive graphical ER diagram.
4. Run queries in the **SQL Editor** to inspect catalog tables:
   ```sql
   SELECT table_name, column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_schema = 'public'
   ORDER BY table_name, ordinal_position;
   ```

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 19 + Vite (TypeScript)
- **Routing:** React Router DOM v7
- **Graphics/Animation:** OGL (WebGL) + Canvas
- **Styling:** Vanilla CSS with custom glassmorphism design tokens
- **Data Visualization:** Recharts
- **QR Code Engine:** `html5-qrcode`, `qrcode.react`

### Backend & AI Services
- **Server:** Node.js + Express 5 (TypeScript via `tsx`)
- **AI Engine:** Google Gemini (Multi-key LRU pool via `@google/genai` & REST)
- **Database & Auth:** Supabase (PostgreSQL, Auth, PostgREST API)
- **Document Processing:** PDF.js, `pdf-parse`, `docxtemplater`, `pizzip`, `pptxgenjs`
- **OCR Engine:** `tesseract.js`
- **Security:** Helmet, CORS, Express Rate Limiting

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- A [Supabase](https://supabase.com/) project (PostgreSQL database & Auth)
- A [Google Gemini API Key](https://aistudio.google.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bhavya-darjii/velaar.git
   cd velaar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a single `.env` file in the **root directory**:
   ```env
   # --- GEMINI AI CONFIG ---
   # Single API key or comma-separated LRU key pool
   GOOGLE_API_KEY=your_gemini_api_key
   # Optional: Multi-account pool format: email:key,email:key,...
   # GOOGLE_API_KEYS=acc1@gmail.com:key1,acc2@gmail.com:key2

   # --- SUPABASE CONFIG (Frontend) ---
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # --- SUPABASE CONFIG (Backend / Service Role) ---
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # --- SERVER CONFIG ---
   PORT=5000
   ```

   > 💡 **Note:** Both the Vite frontend and Express server share this unified `.env` file.

### Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Runs Vite frontend (`:5173`) and Express backend (`:5000`) concurrently. |
| `npm run start` | Runs the backend server standalone (`npx tsx backend/index.ts`). |
| `npm run build` | Compiles the production Vite frontend bundle. |
| `npm run preview` | Previews the production frontend build locally. |
| `npm run type-check` | Type-checks both frontend and backend without emitting code. |
| `npm run lint` | Runs ESLint across the codebase. |
| `npm run fetch-schema` | Connects to Supabase and generates `docs/DATABASE_SCHEMA.md` & JSON dump. |
| `npm run set-demo-passwords` | Sets standard demo passwords for staging and test accounts. |
| `npm run remove-demo-passwords`| Cleans up demo accounts from Supabase Auth. |

### Running the Application

```bash
npm run dev
```

- **Frontend Application:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`

---

## 📂 Project Structure

```text
velaar/
├── backend/                        # Express 5 backend (TypeScript)
│   ├── controllers/                # AI, admin, analytics, export controllers
│   ├── data/                       # Static mock / template configurations
│   ├── middleware/                 # Rate limiting, auth verification
│   ├── prompts/                    # Gemini prompt engineering templates
│   ├── routes/                     # Express API route declarations
│   ├── scripts/                    # Maintenance & schema CLI scripts
│   │   ├── fetch-schema.ts         # Live Supabase schema extractor
│   │   ├── set-demo-passwords.ts   # Demo credentials setup
│   │   └── remove-demo-passwords.ts# Demo cleanup
│   ├── services/                   # Backend AI & PDF services
│   ├── supabaseAdmin.ts            # Supabase Service Role client
│   └── index.ts                    # Backend server entry point
├── docs/                           # Architectural plans & documentation
│   ├── DATABASE_SCHEMA.md          # Complete PostgreSQL schema specification
│   ├── database_schema.json        # Raw JSON schema export
│   └── hierarchical_analytics_design.md
├── frontend/                       # React 19 Frontend (TypeScript)
│   ├── components/                 # Reusable UI & role-specific widgets
│   ├── config/                     # Navigation, roles & permissions config
│   ├── context/                    # Auth & global state context providers
│   ├── layouts/                    # Role layouts (Teacher, Student, Admin, etc.)
│   ├── pages/                      # 40+ specialized application views
│   ├── pipeline-features/          # Specialized workflows (Timetable, Exams, etc.)
│   ├── services/                   # Supabase client & frontend AI handlers
│   ├── styles/                     # Layout-specific modular stylesheets
│   ├── App.tsx                     # Main application router
│   ├── index.css                   # Core design tokens & glassmorphic system
│   └── main.tsx                    # React DOM mount point
├── public/                         # Static public assets
├── .env                            # Centralized environment file
├── vercel.json                     # Vercel deployment configuration
├── package.json                    # Project dependencies and npm scripts
└── README.md                       # Main documentation (You are here!)
```

---

## 👨‍💻 Developer & Contributing

**Bhavya Darji**  
*Lead Developer & Architect*

- **GitHub:** [@bhavya-darjii](https://github.com/bhavya-darjii)
- **LinkedIn:** [Bhavya Darji](https://www.linkedin.com/in/bhavya-darji-181573242/)
- **Email:** [bhavyadarji462@gmail.com](mailto:bhavyadarji462@gmail.com)

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/bhavya-darjii/velaar/issues).

---

## 📜 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---
*Built with ❤️ to revolutionize education.*
