# Velaar 🚀

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2.0-blue.svg)
![Express](https://img.shields.io/badge/Express-5.2.1-lightgrey.svg)
![Supabase](https://img.shields.io/badge/Supabase-2.x-green.svg)
![Gemini](https://img.shields.io/badge/Gemini-3.5--flash-orange.svg)

**Velaar** is a massive, advanced, AI-powered educational management platform designed to modernize the academic workflow from the ground up. By leveraging cutting-edge Generative AI and OCR technologies, Velaar empowers educational institutions with an ecosystem of specialized tools for teachers, students, administrators, and parents.

Built with extreme performance and user experience in mind, Velaar features a premium glassmorphic UI, ultra-fast optimized loading, and a robust Node.js/Express backend powered by Google Gemini.

---

## 🤖 Velaar Global AI Copilot

The crown jewel of the platform is the **Global AI Copilot**. Integrated seamlessly across every dashboard and layout, the Copilot is context-aware and role-specific. Whether a teacher needs instant help generating a rubric, a student needs a complex topic explained, or an administrator needs to query institutional data, the Copilot acts as a ubiquitous, intelligent assistant ready to streamline any academic task.

---

## 🏢 Comprehensive Multi-Role Architecture

Velaar provides a massive suite of specialized dashboards tailored to every stakeholder in the educational ecosystem:

- **👨‍🏫 Teacher Portal:** A complete suite for educators featuring:
  - Automated Lesson Plan & Question Bank Generation
  - Advanced Examination Editor & AI-powered Question Paper Generator
  - Lecture Overview & PowerPoint Presentation Generator
  - Marks Dashboard & Student Risk Analytics
  - CO Attainment Tracking & Rubric Generator
  - Lab Manual Generator
- **🎓 Student Portal:** A personalized hub featuring:
  - Real-time Study Material & Flashcard generation
  - Seamless Exam-taking interface
  - Attendance scanning via QR code
- **👔 HOD (Head of Department) Portal:** Strategic overview including CO Mapping, Feedback Analytics, and meeting documentation.
- **👑 Admin & VelaarAdmin Portals:** Institutional setup, AI-powered Timetable & Notice Generation, and an Accreditation Hub.
- **👨‍👩‍👧 Parent Portal:** A real-time Progress Timeline to keep parents informed of student performance.
- **🏛️ Exam Controller & Registrar Portals:** Specialized dashboards for secure academic administration.
- **🏫 Principal Portal:** Institutional oversight dashboard.

---

## 📅 Smart Attendance System

Say goodbye to manual roll calls. Velaar introduces a lightning-fast, secure attendance ecosystem:
- **Teacher Attendance Session:** Teachers initialize live attendance sessions from their dashboard with a single click.
- **Student Attendance Scanner:** Students use their mobile devices and the built-in QR scanner to mark themselves present in real-time.

---

## ✨ Core Features & AI Capabilities

- **🧠 Deep AI Content Generation:** Automatically synthesize detailed lesson plans, intelligent question banks, course materials, lecture presentations (PPT), and study resources using Google Gemini 3.5 Flash.
- **📄 Smart Document Processing:** Upload raw syllabi, PDFs, or images. Velaar's built-in OCR (Tesseract.js) and PDF.js engine extract text for automated generation.
- **📝 Advanced Academic Editors:** Rich, interactive interfaces to create, edit, and fine-tune exam papers, lab manuals, and syllabi.
- **📤 Effortless Exporting:** Export finalized exams, lesson plans, and presentations to DOCX, PDF, and PPTX formats.
- **🎨 Premium UI/UX:** A beautiful, responsive interface featuring dynamic glassmorphism aesthetics, smooth animations, and categorized navigation sidebars.
- **🔐 Secure Authentication:** Enterprise-grade security and role-based access control powered by Supabase Auth.

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 19 + Vite
- **Routing:** React Router DOM v7
- **Graphics/Animation:** OGL (WebGL)
- **Styling:** Custom CSS with CSS Variables & Glassmorphic Utilities
- **Charts:** Recharts
- **QR:** html5-qrcode, qrcode.react

### Backend & AI Engine
- **Server:** Node.js + Express 5
- **AI Model:** Google Gemini 3.5 Flash (via REST API)
- **Database & Auth:** Supabase (PostgreSQL + Auth)
- **Document Processing:** PDF.js, PDF-Parse, DocxTemplater, PizZip, pptxgenjs
- **Optical Character Recognition:** Tesseract.js

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- A [Supabase](https://supabase.com/) project
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
   Create a `.env` file in the **root directory** with all keys:
   ```env
   # Gemini AI
   GOOGLE_API_KEY=your_gemini_api_key

   # Supabase (Frontend)
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Supabase (Backend / Server-side)
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

   > ⚠️ **Note:** There is only **one `.env` file** in the root. Both the frontend and the Express backend read from it.

### Running the Application

Velaar uses `concurrently` to run the Vite frontend and Express server simultaneously.

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## 📂 Project Structure

```text
velaar/
├── server/                 # Express backend
│   ├── controllers/        # AI, export, rubric, and analytics controllers
│   ├── routes/             # Express route definitions
│   └── index.js            # Server entry point
├── src/                    # React Frontend
│   ├── components/         # Reusable UI components
│   ├── config/             # Navigation & role config
│   ├── layouts/            # Role-specific layouts (Teacher, Student, Admin, etc.)
│   ├── pages/              # 40+ specialized application views
│   ├── services/           # Supabase & AI service wrappers
│   ├── App.jsx             # Main application router
│   └── index.css           # Global styles and theme variables
├── .env                    # Single centralised environment file
├── vercel.json             # Vercel deployment & security headers config
├── package.json            # Project metadata and scripts
└── README.md               # You are here!
```

---

## 👨‍💻 Developer

**Bhavya Darji**  
*Lead Developer & Architect*

- **GitHub:** [@bhavya-darjii](https://github.com/bhavya-darjii)
- **LinkedIn:** [Bhavya Darji](https://www.linkedin.com/in/bhavya-darji-181573242/)
- **Email:** [bhavyadarji462@gmail.com](mailto:bhavyadarji462@gmail.com)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check the [issues page](https://github.com/bhavya-darjii/velaar/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---
*Built with ❤️ to revolutionize education.*
