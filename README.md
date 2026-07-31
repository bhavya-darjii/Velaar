# Velaar 🚀

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2.0-blue.svg)
![Express](https://img.shields.io/badge/Express-5.2.1-lightgrey.svg)
![Firebase](https://img.shields.io/badge/Firebase-12.8.0-orange.svg)

**Velaar** is a massive, advanced, AI-powered educational management platform designed to modernize the academic workflow from the ground up. By leveraging bleeding-edge Generative AI and OCR technologies, Velaar empowers educational institutions with an ecosystem of specialized tools for teachers, students, administrators, and parents.

Built with extreme performance and user experience in mind, Velaar features a premium glassmorphic UI, ultra-fast optimized loading, a robust Node.js/Express backend, and a dedicated Python engine for heavy document parsing and AI inference.

---

## 🤖 Velaar Global AI Copilot

The crown jewel of the platform is the **Global AI Copilot**. Integrated seamlessly across every dashboard and layout, the Copilot is context-aware and role-specific. Whether a teacher needs instant help generating a rubric, a student needs a complex topic explained, or an administrator needs to query institutional data, the Copilot acts as a ubiquitous, intelligent assistant ready to streamline any academic task.

---

## 🏢 Comprehensive Multi-Role Architecture

Velaar provides a massive suite of specialized dashboards tailored to every stakeholder in the educational ecosystem:

- **👨‍🏫 Teacher Portal:** A complete suite for educators featuring:
  - Automated Lesson Plan & Question Bank Generation
  - Advanced Examination Editor & Answer Evaluator
  - Automated Rubric Generator & CO Attainment tracking
  - Predictive Student Risk Analytics
  - Lab Manual Generator & Assignment Hub
- **🎓 Student Portal:** A personalized hub featuring:
  - Real-time Study Material & Flashcard generation
  - Seamless Assignment Submissions & Exam taking
  - Direct Feedback forms and performance analytics
- **👔 HOD (Head of Department) Portal:** Strategic overview including Course Mapping, Feedback Analytics, and Meeting Minutes documentation.
- **👑 Admin & VelaarAdmin Portals:** Institutional setup, AI-powered Timetable Generation, Notice Generation, and an Accreditation Hub for compliance.
- **👨‍👩‍👧 Parent Portal:** A real-time Progress Timeline and dashboard to keep parents continuously informed of student performance.
- **🏛️ Exam Controller & Registrar Portals:** Specialized dashboards designed specifically for secure academic administration and record-keeping.

---

## 📅 Smart Attendance System

Say goodbye to manual roll calls. Velaar introduces a lightning-fast, secure attendance ecosystem:
- **Teacher Attendance Session:** Teachers can initialize live attendance sessions directly from their dashboard with a single click.
- **Student Attendance Scanner:** Students simply use their mobile devices and the built-in scanner to securely mark themselves present in real-time, feeding data directly into the institutional analytics engine.

---

## ✨ Core Features & AI Capabilities

- **🧠 Deep AI Content Generation:** Automatically synthesize detailed lesson plans, intelligent question banks, course materials, and study resources using deep Google GenAI integration.
- **📄 Smart Document Processing:** Upload raw syllabi, PDFs, or images. Velaar's built-in Python parsing engine and OCR (Tesseract.js) flawlessly extract text, diagrams, and structures for automated generation.
- **📝 Advanced Academic Editors:** Rich, interactive interfaces to create, edit, and fine-tune exam papers, lab manuals, and syllabi.
- **📤 Effortless Exporting:** Export your finalized exams and lesson plans seamlessly to DOCX and PDF formats, maintaining perfect pixel-fidelity and styling.
- **🎨 Premium UI/UX & Ultra-Fast Loading:** A beautiful, responsive interface featuring dynamic visuals, deep glassmorphism aesthetics, and native Dark/Light mode support. Optimized initial payloads using WebP imagery and Low-Quality Image Placeholders (LQIP) embedded via Base64 CSS gradients guarantee an instant, flash-free render.
- **🔐 Secure Authentication:** Enterprise-grade security and role-based access control powered by Firebase.

---

## 🛠️ Technology Stack

Velaar is built using a modern, scalable, and highly performant tech stack.

### Frontend
- **Framework:** React 19 + Vite (Rolldown)
- **Routing:** React Router DOM v7
- **Graphics/Animation:** OGL (WebGL)
- **Styling:** Custom CSS with CSS Variables & Glassmorphic Utilities

### Backend & AI Engine
- **Server:** Node.js + Express 5
- **AI Integration:** Google GenAI SDK (`@google/genai`)
- **Database & Auth:** Firebase
- **Document Processing:** PDF.js, PDF-Parse, DocxTemplater, PizZip
- **Optical Character Recognition:** Tesseract.js
- **Heavy Processing Engine:** Python (custom scripts for specialized AI generation and complex PDF layouts)

---

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [Python](https://www.python.org/downloads/) (v3.10+ recommended for the Python Engine)
- A Firebase Project (for Auth/Firestore)
- Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/velaar.git
   cd velaar
   ```

2. **Install Node dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory and add your keys:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   GOOGLE_GENAI_API_KEY=your_gemini_api_key
   # Add any other required environment variables here
   ```

4. **Install Python dependencies (if applicable)**
   Navigate to the `python_engine` directory and install required pip packages:
   ```bash
   cd python_engine
   pip install -r requirements.txt
   cd ..
   ```

### Running the Application

Velaar uses `concurrently` to run both the Vite frontend and Express server simultaneously.

```bash
npm run dev
```

The application will start on `http://localhost:5173/`, and the server will listen on its configured port.

---

## 📂 Project Structure

```text
velaar/
├── server/                 # Express backend, Controllers (aiController, exportController)
├── python_engine/          # Python scripts for specialized AI & PDF parsing
├── src/                    # React Frontend
│   ├── components/         # Reusable UI components
│   ├── layouts/            # Role-specific layouts (Teacher, Student, Admin, etc.)
│   ├── pages/              # 40+ specialized application views mapped to user roles
│   ├── App.jsx             # Main application router and role-based redirect logic
│   └── index.css           # Global styles and theme variables
├── .env.example            # Example environment variables
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
Feel free to check the [issues page](https://github.com/your-username/velaar/issues).

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
