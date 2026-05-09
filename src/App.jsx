import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import Plasma from './components/Plasma/Plasma';
import FullLayoutSkeleton from './components/skeletons/FullLayoutSkeleton';


import LoginPage from './pages/auth/LoginPage';
import TeacherLayout from './layouts/TeacherLayout';
import TeacherHome from './pages/teacher/TeacherHome';
import QuestionBankPage from './pages/teacher/QuestionBankPage';
import LessonPlanPage from './pages/teacher/LessonPlanPage';
import ExaminationPage from './pages/teacher/ExaminationPage';
import ExaminationEditor from './pages/teacher/ExaminationEditor';
import StudentDashboard from './pages/student/StudentDashboard';
import CourseGeneratorPage from './pages/teacher/CourseGeneratorPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  const [plasmaColor, setPlasmaColor] = useState('#ea580c');
  const [authResolved, setAuthResolved] = useState(false);
  const [initialUser, setInitialUser] = useState(undefined); // undefined = not yet known
  const [userRole, setUserRole] = useState(null); // 'admin' | 'teacher' | 'student' | null

  useEffect(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--plasma-color').trim();
    if (color) setPlasmaColor(color);
  }, []);

  // Global one-time auth listener — fires before rendering any routes
  // Also fetches the user's role so root "/" can redirect correctly
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setInitialUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          setUserRole(snap.exists() ? (snap.data().userType || 'teacher') : 'teacher');
        } catch {
          setUserRole('teacher');
        }
      } else {
        setUserRole(null);
      }
      setAuthResolved(true);
    });
    return () => unsub();
  }, []);

  // Smart root redirect: based on the actual role stored in Firestore
  const RootRedirect = () => {
    if (!initialUser) return <LoginPage />;
    if (userRole === 'admin')   return <Navigate to="/admin"   replace />;
    if (userRole === 'student') return <Navigate to="/student" replace />;
    return <Navigate to="/teacher" replace />;
  };

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
              {/* Smart root: role-aware redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* Admin Dashboard */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />

              {/* Teacher Dashboard nested routes */}
              <Route path="/teacher" element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <TeacherLayout />
                </ProtectedRoute>
              }>
                <Route index element={<TeacherHome />} />
                <Route path="questionbank" element={<QuestionBankPage />} />
                <Route path="lesson-plan" element={<LessonPlanPage />} />
                <Route path="examination" element={<ExaminationPage />} />
                <Route path="examination/:examId" element={<ExaminationEditor />} />
                {/* Developer Note: Append all NEW navigation tabs perfectly above this line */}
                <Route path="create-course" element={<CourseGeneratorPage />} />
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