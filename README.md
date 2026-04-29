# Velaar 🚀

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2.0-blue.svg)
![Express](https://img.shields.io/badge/Express-5.2.1-lightgrey.svg)
![Firebase](https://img.shields.io/badge/Firebase-12.8.0-orange.svg)

**Velaar** is an advanced, AI-powered platform designed specifically to modernize and streamline the workflow for educators. By leveraging bleeding-edge Generative AI and OCR technologies, Velaar empowers teachers to automatically generate comprehensive lesson plans, intelligent question banks, and perfectly formatted examinations from raw syllabi, PDFs, and document images.

Built with performance and user experience in mind, Velaar features a premium glassmorphic UI, a robust Node.js/Express backend, and a dedicated Python engine for heavy document parsing and AI inference.

---

## ✨ Key Features

- **🧠 AI-Powered Content Generation:** Automatically synthesize detailed lesson plans and intelligent question banks using Google GenAI integration.
- **📄 Smart Document Processing:** Upload PDFs or images. Velaar's built-in Python parsing engine and OCR (Tesseract.js) flawlessly extract text, diagrams, and structures.
- **📝 Advanced Examination Editor:** A rich, interactive interface to create, edit, and fine-tune exam papers.
- **📤 Effortless Exporting:** Export your finalized exams and lesson plans seamlessly to DOCX and PDF formats, maintaining perfect pixel-fidelity and styling.
- **🎨 Premium UI/UX:** A beautiful, responsive interface featuring dynamic visuals, glassmorphism aesthetics, and native Dark/Light mode support.
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
│   ├── components/         # Reusable UI components (CourseGenerator, etc.)
│   ├── layouts/            # Page layouts (TeacherLayout)
│   ├── pages/              # Main application pages (TeacherHome, ExaminationEditor, etc.)
│   ├── App.jsx             # Main application router
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
