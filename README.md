# Velaar

<div align="center">

**Enterprise Higher Education AI Academic Management & RAG Platform**

[![Private & Proprietary](https://img.shields.io/badge/Status-Private%20%26%20Proprietary-red?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-19.2-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![pgvector](https://img.shields.io/badge/pgvector-Vector_Search-336791?style=for-the-badge)](https://github.com/pgvector/pgvector)
[![Gemini](https://img.shields.io/badge/Gemini-AI_Copilot-orange?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Global AI Copilot](#global-ai-copilot)
- [RAG Architecture](#rag-architecture)
- [Multi-Role Institutional Matrix](#multi-role-institutional-matrix)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [License](#license)
- [Author & Contact](#author--contact)

---

## Overview

**Velaar** is an enterprise academic management and institutional intelligence platform designed to modernize higher-education workflows. By integrating Google Gemini generative AI, **Retrieval-Augmented Generation (RAG)** via PostgreSQL `pgvector`, computer vision attendance verification, and multi-tier institutional telemetry, Velaar unifies academic operations across educators, students, heads of departments, and executive leadership.

Built with strict TypeScript safety across both frontend and backend, Velaar delivers a high-performance glassmorphic interface, row-level multi-tenant database security, and resilient AI key management.

---

## Features

- **Global Academic Copilot**: Context-aware AI assistant grounded in institutional syllabi and course materials via semantic vector retrieval.
- **Retrieval-Augmented Generation (RAG)**: Document indexing and similarity search using 768-dimensional embeddings (`text-embedding-004`) stored in Supabase PostgreSQL with `pgvector`.
- **Hierarchical Role Matrix**: Role-segregated environments for Students, Faculty, Department Heads (HODs), and Institutional Administrators.
- **Smart Attendance System**: Computer-vision OCR attendance sheet verification with anomaly detection and historical absentee tracking.
- **Automated Academic Content Synthesis**: Lesson plans, Bloom's Taxonomy-aligned examination papers, and lecture summaries generated with verifiable document citations.
- **Multi-Account AI Key Pool**: Automated Least-Recently-Used (LRU) key rotation pool guaranteeing high API availability and mitigating rate limits during campus peak hours.
- **Accreditation Readiness Telemetry**: Departmental metrics, faculty workload evaluations, and student performance diagnostics.

---

## Global AI Copilot

The platform incorporates a unified, context-aware Copilot accessible throughout every academic dashboard:
- **For Educators**: Drafts course roadmaps, generates unit exam papers, synthesizes lesson plans, and prepares classroom lecture slides citing uploaded syllabus materials.
- **For Students**: Breaks down difficult textbook concepts, generates personalized study flashcards, and provides practice exam quizzes with exact source document references.
- **For Administrators & HODs**: Queries institutional metrics, faculty scheduling balance, student performance indicators, and accreditation compliance.
- **Precise Citation Gate**: Every synthesized response includes source attribution referencing specific institutional documents.

---

## RAG Architecture

```
┌───────────────────────┐
│ Course Documents / PDF │
└───────────┬───────────┘
            │ 1. Text Extraction & Chunking
            ▼
┌───────────────────────┐
│ Gemini Embedding API  │ ──> text-embedding-004 (768 Dimensions)
└───────────┬───────────┘
            │ 2. Vector Indexing
            ▼
┌───────────────────────┐
│ Supabase (pgvector)   │ ──> Match Threshold Cosine Distance
└───────────┬───────────┘
            │ 3. Semantic Vector Search
            ▼
┌───────────────────────┐
│ Gemini 2.5 Flash LLM  │ ──> Grounded Generation with Citations
└───────────────────────┘
```

---

## Multi-Role Institutional Matrix

| Role | Key Capabilities |
|---|---|
| Students | Study Copilot, interactive flashcards, assignment submissions, attendance records |
| Faculty | Exam paper generation, syllabus synthesis, lecture slides, OCR attendance verification |
| Heads of Department | Faculty workload balance, course progress tracking, departmental analytics |
| Administrators | Multi-tenant user provisioning, accreditation compliance reports, AI key pool management |

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend Framework | React 19, TypeScript, Vite |
| Backend Server | Node.js, Express 5, TypeScript |
| Database & Vectors | Supabase (PostgreSQL 15+ with `pgvector` extension) |
| Artificial Intelligence | Google Gemini (`gemini-2.5-flash`), `text-embedding-004` |
| Document Processing | docx, docxtemplater, file-saver |
| Security & Middleware | Express Rate Limit, CORS, Row Level Security (RLS) |

---

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Supabase account with PostgreSQL and `pgvector` enabled
- Google Gemini API key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bhavya-darjii/velaar.git
   cd velaar
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Environment Variables

Create a `.env` file in the project root:

```env
# Frontend Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000/api

# Backend Configuration
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEYS=key1,key2,key3
```

### Running the Application

```bash
# Start frontend and backend concurrently
npm run dev

# Run TypeScript type verification
npm run type-check

# Run test RAG retrieval query
npm run test-rag
```

The application will be accessible at `http://localhost:5173`.

---

## Project Structure

```
velaar/
├── src/                      # React Frontend Application
│   ├── components/           # UI components, layout shell, and AI Copilot
│   ├── contexts/             # AuthContext and role permission providers
│   ├── pages/                # Dashboards (Student, Faculty, HOD, Admin)
│   ├── services/             # Supabase client and backend API integration
│   └── types/                # System-wide TypeScript contracts
├── server/                   # Express Backend Application
│   ├── controllers/          # Copilot, RAG, and academic route handlers
│   ├── routes/               # API endpoint declarations
│   ├── services/             # Vector indexing and Gemini rotation pool
│   └── server.ts             # Express entry point
├── package.json              # Unified project scripts & dependencies
└── vite.config.ts            # Vite configuration
```

---

## License

**Copyright © 2026 Bhavya Darji. All Rights Reserved.**

This project and its underlying source code are **confidential, private, and proprietary**. Unauthorized copying, modification, distribution, public display, or commercial use of this software, via any medium, is strictly prohibited without explicit prior written authorization from the copyright holder.

---

## Author & Contact

**Bhavya Darji**  
- **Portfolio:** [bhavya-darji.vercel.app](https://bhavya-darji.vercel.app/)  
- **GitHub:** [@bhavya-darjii](https://github.com/bhavya-darjii)  
- **LinkedIn:** [Bhavya Darji](https://www.linkedin.com/in/bhavya-darji-181573242/)  
- **Email:** [bhavyadarji462@gmail.com](mailto:bhavyadarji462@gmail.com)

---

<p align="center">Made with ❤️ by <a href="https://bhavya-darji.vercel.app/" target="_blank" rel="noopener noreferrer"><strong>Bhavya Darji</strong></a></p>\n