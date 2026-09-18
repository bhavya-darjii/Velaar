# Velaar 🚀

![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2.0-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)
![Express](https://img.shields.io/badge/Express-5.2.1-lightgrey.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg)
![pgvector](https://img.shields.io/badge/pgvector-Vector_Search-336791.svg)
![Gemini](https://img.shields.io/badge/Gemini-3.5_Flash-orange.svg)
![Embeddings](https://img.shields.io/badge/Embeddings-text--embedding--004-8e44ad.svg)
![RAG](https://img.shields.io/badge/RAG-Enabled-success.svg)
![Vite](https://img.shields.io/badge/Vite-Rolldown-646cff.svg)

**Velaar** is an enterprise-grade, AI-powered academic management and institutional intelligence platform designed to modernize the higher-education workflow from the ground up. By combining Google Gemini generative AI, **Retrieval-Augmented Generation (RAG)** via PostgreSQL `pgvector`, computer vision (OCR), real-time attendance tracking, and hierarchical analytics, Velaar provides a unified ecosystem for educational institutions—supporting teachers, students, administrators, heads of departments, and institutional leadership.

Built with extreme performance, enterprise scalability, and design excellence in mind, Velaar features a responsive glassmorphic UI, strictly typed TypeScript across frontend and backend, and native PostgreSQL multi-tenant isolation via Supabase.

---

## 📑 Table of Contents

- [Velaar Global AI Copilot](#-velaar-global-ai-copilot)
- [Retrieval-Augmented Generation (RAG) Architecture](#-retrieval-augmented-generation-rag-architecture)
  - [How RAG Works in Velaar](#how-rag-works-in-velaar)
  - [Grounded AI Generation Pipelines](#grounded-ai-generation-pipelines)
  - [Vector Database & Schema (pgvector)](#vector-database--schema-pgvector)
  - [RAG REST API Endpoints](#rag-rest-api-endpoints)
- [Comprehensive Multi-Role Architecture](#-comprehensive-multi-role-architecture)
- [Smart Attendance System](#-smart-attendance-system)
- [Core Features & AI Capabilities](#-core-features--ai-capabilities)
- [Database & Schema Architecture](#-database--schema-architecture)
  - [Core Database Tables](#core-database-tables)
  - [How to Fetch the Database Schema](#how-to-fetch-the-database-schema)
  - [Setting up the RAG Vector Store](#setting-up-the-rag-vector-store)
- [Technology Stack](#️-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database & RAG Setup](#database--rag-setup)
  - [Environment Variables](#environment-variables)
  - [Available Scripts](#available-scripts)
  - [Running the Application](#running-the-application)
- [Project Structure](#-project-structure)
- [Developer & Contributing](#-developer--contributing)
- [License](#-license)

---

## 🤖 Velaar Global AI Copilot

The crown jewel of the platform is the **Global AI Copilot**. Integrated seamlessly across every dashboard and layout, the Copilot is context-aware, role-specific, and grounded with live RAG document retrieval:
- **For Educators:** Synthesizes course roadmaps, unit lesson plans, question banks, Bloom's Taxonomy-aligned exam papers, and lecture slides—grounded directly in uploaded syllabus and reference notes.
- **For Students:** Explains complex concepts, generates interactive flashcards, quizzes, and customized study summaries with precise document citations.
- **For Administrators & HODs:** Queries departmental telemetry, accreditation readiness, faculty workloads, and student risk factors.
- **Source Attribution:** Copilot responses cite their source documents (e.g., `(Source: Module 3 Notes.pdf)`).
- **Resilient AI Key Pool:** Features an automated multi-account LRU (Least Recently Used) key rotation pool to guarantee zero downtime and mitigate rate limits during high concurrency.

---

## 🧠 Retrieval-Augmented Generation (RAG) Architecture

Velaar implements an enterprise-grade **Retrieval-Augmented Generation (RAG)** pipeline powered by Google Gemini embeddings and Supabase PostgreSQL with the `pgvector` extension. 

### Why RAG in Higher Education?
Traditional LLM prompt stuffing truncates large academic syllabi and textbooks, risking omissions and factual hallucinations. Velaar's RAG pipeline transforms uploaded syllabi, lecture notes, lab manuals, and textbooks into a searchable vector knowledge base, retrieving only the most semantically relevant paragraphs for every AI prompt.

### How RAG Works in Velaar

```
                                  DOCUMENT INGESTION PIPELINE
[Teacher Uploads PDF] ──► [pdfController] ──► [PDF Text Extraction]
                                                      │
                                                      ▼ (Fire-and-forget background task)
                                             [Text Chunking Engine]
                                      (500-word sliding windows, 50-word overlap)
                                                      │
                                                      ▼
                                         [Gemini text-embedding-004]
                                            (768-dimensional vectors)
                                                      │
                                                      ▼
                                       [Supabase: document_chunks]
                                  (HNSW Cosine Vector Index, multi-tenant scoped)

────────────────────────────────────────────────────────────────────────────────────────

                                  SEMANTIC RETRIEVAL & GENERATION
[User Action / Query] ──► [embedText(query)] ──► [match_chunks RPC] (Cosine Distance <=>)
                                                         │
                                                         ▼
                                            [Top-K Relevant Chunks]
                                          (Grounded with source metadata)
                                                         │
                                                         ▼
                                          [Injected into Gemini Prompt]
                                                         │
                                                         ▼
                                        [Factual, Grounded Generation]
                                      (With explicit source citations)
```

1. **Automatic Ingestion:** When a teacher uploads a syllabus or lecture document, text is extracted via `pdf-parse` or OCR. In the background (fire-and-forget), the backend segments the text into semantically cohesive 500-word chunks with a 50-word overlap.
2. **High-Dimensional Embeddings:** Each chunk is converted into a 768-dimensional vector embedding using Google's `text-embedding-004` model.
3. **Multi-Tenant Vector Store:** Vectors and text chunks are stored in the PostgreSQL `document_chunks` table, scoped by `institution_id`, `course_id`, and `teacher_id`.
4. **HNSW Fast Similarity Search:** An Approximate Nearest Neighbor (ANN) index using Hierarchical Navigable Small World (HNSW) graphs enables sub-millisecond cosine distance lookups (`vector_cosine_ops`).
5. **Context Injection:** When an AI operation is initiated, the user query or task is embedded, top matching chunks are retrieved via the `match_chunks` RPC function, and injected under a structured `=== RETRIEVED KNOWLEDGE ===` block in the Gemini prompt.

### Grounded AI Generation Pipelines

All primary AI generation workflows in Velaar are augmented with RAG:

| Generation Flow | Grounding Mechanism | Output Benefit |
|---|---|---|
| **Global AI Copilot** | Retrieves top-5 relevant chunks from course documents for every question | Factual, syllabus-aligned answers with explicit `(Source: filename.pdf)` citations |
| **Course Roadmap Generator** | Retrieves syllabus chapters, topics, and objectives | Week-by-week lecture milestones reflecting actual course curriculum |
| **Theory Questions Engine** | Matches Bloom's Taxonomy cognitive levels to course modules | Exam-ready short and long answer questions grounded in lecture content |
| **Numerical Questions Engine** | Retrieves mathematical formulas, sample calculations, and problem sets | Realistic engineering/mathematics numericals with step-by-step solutions |
| **Lesson Plan Generator** | Retrieves specific unit concepts and pedagogical guidelines | Practical, day-wise lecture plans with aligned learning objectives |
| **Presentation Deck Generator** | Ingests lecture outlines and key takeaways | Beautiful 16:9 slide decks (PPTX) reflecting textbook definitions |

### Vector Database & Schema (pgvector)

The RAG pipeline operates on Supabase PostgreSQL using the official `vector` extension:

```sql
-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Create document_chunks table
create table document_chunks (
  id             uuid primary key default gen_random_uuid(),
  institution_id text,
  course_id      text,
  teacher_id     text,
  source_type    text,   -- 'syllabus' | 'textbook' | 'lecture_note' | 'lab_manual'
  source_name    text,   -- original file name
  chunk_index    int,
  content        text not null,
  embedding      vector(768),  -- Gemini text-embedding-004 output dimension
  created_at     timestamptz default now()
);

-- 3. HNSW index for ultra-fast cosine similarity retrieval
create index on document_chunks using hnsw (embedding vector_cosine_ops);

-- 4. match_chunks: RPC function to return top-K most similar chunks
create or replace function match_chunks(
  query_embedding   vector(768),
  match_count       int default 5,
  filter_course_id  text default null,
  filter_teacher_id text default null,
  min_similarity    float default 0.3
)
returns table (
  id          uuid,
  content     text,
  source_name text,
  source_type text,
  similarity  float
)
language sql stable as $$
  select
    id,
    content,
    source_name,
    source_type,
    1 - (embedding <=> query_embedding) as similarity
  from document_chunks
  where
    (filter_course_id  is null or course_id  = filter_course_id) and
    (filter_teacher_id is null or teacher_id = filter_teacher_id) and
    (1 - (embedding <=> query_embedding) >= min_similarity)
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

### RAG REST API Endpoints

All RAG endpoints are protected by authentication (`requireAuth`) and the dedicated `aiLimiter` rate limiter:

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `POST` | `/api/rag/ingest` | Manually ingest text into the vector knowledge base | `{ text: string, sourceName?: string, sourceType?: string, courseId?: string }` |
| `POST` | `/api/rag/query` | Perform semantic vector search and retrieve top-K chunks | `{ query: string, courseId?: string, topK?: number }` |
| `DELETE` | `/api/rag/clear` | Wipe document chunks for the requesting teacher/course | `{ courseId?: string }` |

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
- **📚 RAG-Grounded Intelligence:** Eliminates LLM hallucinations by retrieving exact course document excerpts via `pgvector`.
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
| **`document_chunks`** | Vector embeddings (768-dim) and text chunks for document grounding (RAG). | `course_id -> courses.id`, `teacher_id -> users.id`, `institution_id -> institutions.id` |
| **`attendance_sessions`**| Live and past teacher attendance sessions with QR tokens and expiration timers. | `course_id -> courses.id` |
| **`attendance_logs`** | Student check-in timestamps and attendance verifications. | `session_id -> attendance_sessions.id`, `course_id -> courses.id` |
| **`exams`** | Created examinations, questions, types, and mark breakdowns. | `course_id -> courses.id`, `teacher_id -> users.id`, `institution_id -> institutions.id` |
| **`marks`** | Student exam submissions, scores, and answer payloads. | `exam_id -> exams.id`, `student_id -> users.id` |
| **`syllabus`** | Extracted and structured unit-by-unit syllabus data. | `course_id -> courses.id`, `teacher_id -> users.id` |
| **`presentation_history`**| Auto-generated slide decks and lecture JSON data. | `course_id -> courses.id`, `teacher_id -> users.id` |
| **`timetable`** | Institutional and departmental semester schedules. | `institution_id -> institutions.id` |
| **`role_invitations`** | Pre-approved role onboarding links for students, teachers, and admins. | `institution_id -> institutions.id` |
| **`ai_logs`** | Token telemetry, cost tracking (USD/INR), and feature analytics. | Standalone telemetry log |

### Setting up the RAG Vector Store

To enable vector embeddings and semantic search in your Supabase database:
1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)** and select your project.
2. Navigate to **SQL Editor**.
3. Copy and run the SQL script provided in the [Vector Database & Schema (pgvector)](#vector-database--schema-pgvector) section above.
4. Verify that `document_chunks` appears in your **Table Editor** and `match_chunks` appears under **Database → Functions**.

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
```bash
# Generate TypeScript definitions directly from your Supabase project
npx supabase gen types typescript --project-id <your-project-ref> > frontend/types/database.types.ts

# Dump complete public SQL schema
npx supabase db dump --project-id <your-project-ref> --schema public > schema.sql
```

#### Method 3: Direct PostgreSQL Connection (`pg_dump`)
```bash
pg_dump -h db.<your-project-ref>.supabase.co -U postgres -d postgres --schema-only > docs/schema.sql
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
- **Vector Embeddings:** Google Gemini `text-embedding-004` (768 dimensions)
- **Vector Database:** PostgreSQL `pgvector` with HNSW cosine distance index (`vector_cosine_ops`)
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

### Database & RAG Setup

1. Log in to your **Supabase Dashboard** and open the **SQL Editor**.
2. Run the SQL script from the [Vector Database & Schema (pgvector)](#vector-database--schema-pgvector) section:
   - Enables the `vector` extension
   - Creates the `document_chunks` table
   - Builds the HNSW cosine similarity index
   - Creates the `match_chunks` semantic retrieval RPC function

### Environment Variables

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
│   ├── controllers/                # AI, RAG, admin, analytics, export controllers
│   │   ├── aiController.ts
│   │   ├── pdfController.ts        # PDF parsing with auto-RAG ingestion
│   │   ├── ragController.ts        # RAG ingest, query, clear endpoints
│   │   └── ...
│   ├── data/                       # Static mock / template configurations
│   ├── middleware/                 # Rate limiting, auth verification
│   ├── prompts/                    # Gemini prompt engineering templates (RAG-injected)
│   ├── routes/                     # Express API route declarations
│   │   ├── aiRoutes.ts
│   │   ├── ragRoutes.ts            # /api/rag route declarations
│   │   └── ...
│   ├── scripts/                    # Maintenance & schema CLI scripts
│   │   ├── fetch-schema.ts         # Live Supabase schema extractor
│   │   ├── set-demo-passwords.ts   # Demo credentials setup
│   │   └── remove-demo-passwords.ts# Demo cleanup
│   ├── services/                   # Backend AI, PDF & vector services
│   │   ├── aiGenerationService.ts  # Prompt construction & Gemini execution
│   │   └── ragService.ts           # Chunking, Gemini embeddings & pgvector search
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
<p align="center">Made with ❤️ by <a href="https://bhavya-darji.vercel.app/" target="_blank" rel="noopener noreferrer"><strong>Bhavya Darji</strong></a></p>
