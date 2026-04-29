import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import Plasma from './components/Plasma/Plasma';
import FullLayoutSkeleton from './components/FullLayoutSkeleton';


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
  const [plasmaColor, setPlasmaColor] = useState('#ea580c');
  const [authResolved, setAuthResolved] = useState(false);
  const [initialUser, setInitialUser] = useState(undefined); // undefined = not yet known

  useEffect(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--plasma-color').trim();
    if (color) setPlasmaColor(color);
  }, []);

  // Global one-time auth listener — fires before rendering any routes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setInitialUser(user);
      setAuthResolved(true);
    });
    return () => unsub();
  }, []);

  return (
    <Router>
      <div className="app-layout">

        {/* GLOBAL PLASMA BACKGROUND — always visible, even during auth check */}
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
          <Plasma
            color={plasmaColor}
            speed={2.1}
            direction="forward"
            scale={3}
            opacity={1}
            mouseInteractive={true}
          />
        </div>

        {/* Render routes immediately — TeacherLayout owns the single skeleton */}
        {authResolved ? (
          <div className="content-layer">
            <Routes>
              {/* Smart root: if logged in go to teacher dashboard, else show login */}
              <Route path="/" element={initialUser ? <Navigate to="/teacher" replace /> : <LoginPage />} />

              {/* Teacher Dashboard nested routes */}
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
        ) : <FullLayoutSkeleton />}

      </div>
    </Router>
  );
}

export default App;