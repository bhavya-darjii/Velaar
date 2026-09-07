/* eslint-disable */
// @ts-nocheck
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import MeshBackground from './components/shared/MeshBackground';
import GlobalCopilot from './components/shared/GlobalCopilot';
import { CopilotProvider } from './context/CopilotContext';
import FullLayoutSkeleton from './components/skeletons/FullLayoutSkeleton';
import AuthLoadingScreen from './components/shared/AuthLoadingScreen';
import { extractGoogleAvatarUrl, cacheTeacherAvatar } from './utils/avatarUtils';

import LoginPage from './pages/auth/LoginPage';
import TeacherLayout from './layouts/TeacherLayout';
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';
import HodLayout from './layouts/HodLayout';
import ParentLayout from './layouts/ParentLayout';
import PrincipalLayout from './layouts/PrincipalLayout';
import TeacherHome from './pages/teacher/TeacherHome';
import LessonPlanPage from './pages/teacher/LessonPlanPage';
import QuestionBankPage from './pages/teacher/QuestionBankPage';
import ExaminationPage from './pages/teacher/ExaminationPage';
import ExaminationEditor from './pages/teacher/ExaminationEditor';
import CourseGeneratorPage from './pages/teacher/CourseGeneratorPage';
import LectureOverview from './pages/teacher/LectureOverview';
import CourseAnalytics from './pages/teacher/CourseAnalytics';
import AttendanceSession from './pages/teacher/AttendanceSession';
import TeacherProfile from './pages/teacher/TeacherProfile';
import MarksDashboard from './pages/teacher/MarksDashboard';
import EditMarks from './pages/teacher/EditMarks';
import StudentAnalytics from './pages/teacher/StudentAnalytics';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDashboardSkeleton from './components/skeletons/AdminDashboardSkeleton';
import HodDashboard from './pages/hod/HodDashboard';
import RegistrarDashboard from './pages/registrar/RegistrarDashboard';
import SetupInstitutionPage from './pages/setup/SetupInstitutionPage';
import VelaarAdminDashboard from './pages/admin/VelaarAdminDashboard';
import ExamControllerDashboard from './pages/examcontroller/ExamControllerDashboard';
import PrincipalDashboard from './pages/principal/PrincipalDashboard';
import ParentPortal from './pages/parent/ParentPortal';
import ProgressTimeline from './pages/parent/ProgressTimeline';
import StudentDashboard from './pages/student/StudentDashboard';
import AttendanceScanner from './pages/student/AttendanceScanner';
import LectureVault from './pages/student/LectureVault';
import PendingPage from './pages/auth/PendingPage';
import PendingPageSkeleton from './components/skeletons/PendingPageSkeleton';
import StudentDashboardSkeleton from './components/skeletons/StudentDashboardSkeleton';
import NotFoundPage from './pages/shared/NotFoundPage';

function App() {
  const [authResolved, setAuthResolved] = useState(false);
  const [initialUser, setInitialUser] = useState(undefined);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    const checkUser = async (session) => {
      if (!session?.user) {
        if (mounted) {
          setInitialUser(null);
          setUserRole(null);
          localStorage.removeItem('cachedUserRole');
          setAuthResolved(true);
        }
        return;
      }
      
      const user = session.user;

      // Pre-cache Google account avatar so all teacher/faculty views have 0ms load time
      const gAvatar = extractGoogleAvatarUrl(user);
      if (gAvatar) {
        cacheTeacherAvatar(gAvatar);
      }

      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single();

        let role = userData ? (userData.user_type || 'pending') : 'pending';

        if (role === 'pending' && user.email) {
          const { data: inviteData } = await supabase
            .from('role_invitations')
            .select('*')
            .eq('email', user.email.toLowerCase())
            .single();

          if (inviteData) {
            role = inviteData.user_type || 'pending';
            const updatePayload = {
              user_type: role,
              institution_id: inviteData.institution_id || null,
              college_name: inviteData.college_name || null,
            };
            if (inviteData.semester) updatePayload.semester = inviteData.semester;
            if (inviteData.division) updatePayload.division = String(inviteData.division).trim().toUpperCase();

            await supabase.from('users').update(updatePayload).eq('id', user.id);
            await supabase.from('role_invitations').delete().eq('email', user.email.toLowerCase());
            
            window.location.href = '/';
            return;
          }
        }

        if (mounted) {
          setInitialUser(user);
          setUserRole(role);
          localStorage.setItem('cachedUserRole', role);
        }
      } catch (e) {
        console.error('Offline or error fetching role', e);
        if (mounted) {
          const cachedRole = localStorage.getItem('cachedUserRole') || 'teacher';
          setInitialUser(user);
          setUserRole(cachedRole);
        }
      }
      
      if (mounted) setAuthResolved(true);
    };

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUser(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const RootRedirect = () => {
    if (!initialUser) return <LoginPage />;
    if (!userRole) return <AuthLoadingScreen />;
    if (userRole === 'admin')           return <Navigate to="/admin"           replace />;
    if (userRole === 'student')         return <Navigate to="/student"         replace />;
    if (userRole === 'hod')             return <Navigate to="/hod"             replace />;
    if (userRole === 'registrar')       return <Navigate to="/registrar"       replace />;
    if (userRole === 'setup')           return <Navigate to="/setup"           replace />;
    if (userRole === 'velaarAdmin')     return <Navigate to="/velaar-admin"    replace />;
    if (userRole === 'examController')  return <Navigate to="/exam-controller" replace />;
    if (userRole === 'principal')       return <Navigate to="/principal"       replace />;
    if (userRole === 'parent')          return <Navigate to="/parent"          replace />;
    if (userRole === 'teacher')         return <Navigate to="/teacher"         replace />;
    if (userRole === 'pending')         return <Navigate to="/pending"         replace />;
    return <Navigate to="/pending" replace />;
  };

  return (
    <Router>
      <CopilotProvider>
        <div className="app-layout">
          <div className="mesh-background-wrapper">
            <MeshBackground />
          </div>

          {authResolved ? (
            <div className="content-layer">
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<RootRedirect />} />

                {/* Admin nested routes */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<AdminDashboard />} />
                </Route>

                {/* HOD nested routes */}
                <Route path="/hod" element={
                  <ProtectedRoute allowedRoles={['hod']}>
                    <HodLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<HodDashboard />} />
                </Route>

                {/* Student nested routes */}
                <Route path="/student" element={
                  <ProtectedRoute allowedRoles={['student']} fallback={<StudentDashboardSkeleton />}>
                    <StudentLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<StudentDashboard />} />
                  <Route path="attendance" element={<AttendanceScanner />} />
                  <Route path="lecture-vault" element={<LectureVault />} />
                  <Route path="lecture-vault/:subjectSlug" element={<LectureVault />} />
                </Route>

                {/* Parent nested routes */}
                <Route path="/parent" element={
                  <ProtectedRoute allowedRoles={['parent']}>
                    <ParentLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<ParentPortal />} />
                  <Route path="progress" element={<ProgressTimeline />} />
                </Route>

                {/* Principal nested routes */}
                <Route path="/principal" element={
                  <ProtectedRoute allowedRoles={['principal']}>
                    <PrincipalLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<PrincipalDashboard />} />
                </Route>

                <Route path="/registrar" element={
                  <ProtectedRoute allowedRoles={['registrar']}>
                    <RegistrarDashboard />
                  </ProtectedRoute>
                } />

                {/* Teacher nested routes */}
                <Route path="/teacher" element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <TeacherLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<TeacherHome />} />
                  <Route path="lesson-plan" element={<LessonPlanPage />} />
                  <Route path="attendance" element={<AttendanceSession />} />
                  <Route path="question-bank" element={<QuestionBankPage />} />
                  <Route path="examination" element={<ExaminationPage />} />
                  <Route path="examination/:examId" element={<ExaminationEditor />} />
                  <Route path="examination/editor" element={<ExaminationEditor />} />
                  <Route path="lecture-overview" element={<LectureOverview />} />
                  <Route path="lecture-overview/:lectureId" element={<LectureOverview />} />
                  <Route path="course-analytics" element={<CourseAnalytics />} />
                  <Route path="profile" element={<TeacherProfile />} />
                  <Route path="marks" element={<MarksDashboard />} />
                  <Route path="marks/edit" element={<MarksDashboard />} />
                  <Route path="marks/edit/:examId" element={<EditMarks />} />
                  <Route path="student-analytics" element={<StudentAnalytics />} />
                  <Route path="student-risk" element={<StudentAnalytics />} />
                  <Route path="create-course" element={<CourseGeneratorPage />} />
                </Route>

                <Route path="/setup" element={
                  <ProtectedRoute allowedRoles={['setup']}>
                    <SetupInstitutionPage />
                  </ProtectedRoute>
                } />

                <Route path="/velaar-admin" element={
                  <ProtectedRoute allowedRoles={['velaarAdmin']}>
                    <VelaarAdminDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/exam-controller" element={
                  <ProtectedRoute allowedRoles={['examController']}>
                    <ExamControllerDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/pending" element={
                  <ProtectedRoute allowedRoles={['pending']} fallback={<AuthLoadingScreen />}>
                    <PendingPage />
                  </ProtectedRoute>
                } />

                {/* Catch-all fallback for undefined routes */}
                <Route path="*" element={initialUser ? <NotFoundPage userRole={userRole} /> : <Navigate to="/" replace />} />
              </Routes>

              {userRole !== 'pending' && <GlobalCopilot userRole={userRole} />}
            </div>
          ) : (
            <div className="content-layer">
              <AuthLoadingScreen />
            </div>
          )}
        </div>
      </CopilotProvider>
    </Router>
  );
}

export default App;
