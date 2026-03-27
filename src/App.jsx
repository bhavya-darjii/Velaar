import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import LiquidChrome from './components/LiquidChrome';

import LoginPage from './pages/LoginPage';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherHome from './pages/TeacherHome';
import ExamsPage from './pages/ExamsPage';
import LessonPlanPage from './pages/LessonPlanPage';
import ExaminationPage from './pages/ExaminationPage';
import ExaminationEditor from './pages/ExaminationEditor';
import StudentDashboard from './pages/StudentDashboard';
import SyllabusUpload from './components/CourseGenerator';
import ProtectedRoute from './components/ProtectedRoute';

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
            
            {/* Teacher Dashboard nested routes safely mapped into ProtectedRoute block */}
            <Route path="/teacher" element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherLayout />
              </ProtectedRoute>
            }>
              <Route index element={<TeacherHome />} />
              <Route path="questionbank" element={<ExamsPage />} />
              <Route path="lesson-plan" element={<LessonPlanPage />} />
              <Route path="examination" element={<ExaminationPage />} />
              <Route path="examination/:examId" element={<ExaminationEditor />} />
              {/* Developer Note: Append all NEW navigation tabs perfectly above this line */}
              <Route path="create-course" element={<SyllabusUpload />} />
            </Route>

            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </div>

      </div>
    </Router>
  );
}

export default App;