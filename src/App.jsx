import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import LiquidChrome from './components/LiquidChrome';

import LoginPage from './pages/LoginPage';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherHome from './pages/TeacherHome';
import ExamsPage from './pages/ExamsPage';
import StudentDashboard from './pages/StudentDashboard';
import SyllabusUpload from './components/CourseGenerator';

function App() {
  return (
    <Router>
      <div className="app-layout">
        
        {/* BACKGROUND LAYER (Stays fixed behind every page) */}
        <div className="background-layer">
          <LiquidChrome
            baseColor={[0.1, 0.1, 0.3]}
            speed={1}
            amplitude={0.13}
            interactive={true}
          />
        </div>

        {/* CONTENT LAYER (Switches based on the URL) */}
        <div className="content-layer">
          <Routes>
            {/* When the app starts ('/'), show Login Page */}
            <Route path="/" element={<LoginPage />} />
            
            {/* Teacher Dashboard nested routes */}
            <Route path="/teacher" element={<TeacherLayout />}>
              <Route index element={<TeacherHome />} />
              <Route path="exams" element={<ExamsPage />} />
              <Route path="create-course" element={<SyllabusUpload />} />
            </Route>

            <Route path="/student" element={<StudentDashboard />} />
          </Routes>
        </div>

      </div>
    </Router>
  );
}

export default App;