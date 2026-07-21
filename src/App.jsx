import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import MeshBackground from './components/shared/MeshBackground';
import GlobalCopilot from './components/shared/GlobalCopilot';
import { CopilotProvider } from './context/CopilotContext';
import FullLayoutSkeleton from './components/skeletons/FullLayoutSkeleton';
import AuthLoadingScreen from './components/shared/AuthLoadingScreen';

import LoginPage from './pages/auth/LoginPage';
import TeacherLayout from './layouts/TeacherLayout';
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';
import HodLayout from './layouts/HodLayout';
import ParentLayout from './layouts/ParentLayout';
import TeacherHome from './pages/teacher/TeacherHome';
import QuestionBankPage from './pages/teacher/QuestionBankPage';
import LessonPlanPage from './pages/teacher/LessonPlanPage';
import ExaminationPage from './pages/teacher/ExaminationPage';
import ExaminationEditor from './pages/teacher/ExaminationEditor';
import CourseGeneratorPage from './pages/teacher/CourseGeneratorPage';
import AttendanceSession from './pages/teacher/AttendanceSession';
import TeacherProfile from './pages/teacher/TeacherProfile';
import MarksDashboard from './pages/teacher/MarksDashboard';
import EditMarks from './pages/teacher/EditMarks';
import SyllabusPage from './pages/teacher/SyllabusPage';
import LearningResourcesPage from './pages/teacher/LearningResourcesPage';
import TimetablePage from './pages/teacher/TimetablePage';
import NoticePage from './pages/teacher/NoticePage';
import EventPage from './pages/teacher/EventPage';
import AboutUsPage from './pages/teacher/AboutUsPage';
import AnswerEvaluator from './pages/teacher/AnswerEvaluator';
import RubricGenerator from './pages/teacher/RubricGenerator';
import COAttainment from './pages/teacher/COAttainment';
import StudentRiskAnalytics from './pages/teacher/StudentRiskAnalytics';
import LabManualGenerator from './pages/teacher/LabManualGenerator';
import AssignmentHub from './pages/teacher/AssignmentHub';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import TimetableGenerator from './pages/admin/TimetableGenerator';
import NoticeGenerator from './pages/admin/NoticeGenerator';
import AccreditationHub from './pages/admin/AccreditationHub';
import AdminDashboardSkeleton from './components/skeletons/AdminDashboardSkeleton';
import HodDashboard from './pages/hod/HodDashboard';
import CourseMapping from './pages/hod/CourseMapping';
import FeedbackAnalytics from './pages/hod/FeedbackAnalytics';
import MeetingMinutes from './pages/hod/MeetingMinutes';
import RegistrarDashboard from './pages/registrar/RegistrarDashboard';
import SetupInstitutionPage from './pages/setup/SetupInstitutionPage';
import VelaarAdminDashboard from './pages/admin/VelaarAdminDashboard';
import ExamControllerDashboard from './pages/examcontroller/ExamControllerDashboard';
import ParentPortal from './pages/parent/ParentPortal';
import ProgressTimeline from './pages/parent/ProgressTimeline';
import StudentDashboard from './pages/student/StudentDashboard';
import StudyMaterialGenerator from './pages/student/StudyMaterialGenerator';
import FlashcardViewer from './pages/student/FlashcardViewer';
import FeedbackForm from './pages/student/FeedbackForm';
import AssignmentSubmission from './pages/student/AssignmentSubmission';
import AttendanceScanner from './pages/student/AttendanceScanner';
import PendingPage from './pages/auth/PendingPage';
import PendingPageSkeleton from './components/skeletons/PendingPageSkeleton';
import StudentDashboardSkeleton from './components/skeletons/StudentDashboardSkeleton';

function App() {
  const [authResolved, setAuthResolved] = useState(false);
  const [initialUser, setInitialUser] = useState(undefined);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setInitialUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          const role = snap.exists() ? (snap.data().userType || 'pending') : 'pending';
          setUserRole(role);
          localStorage.setItem('cachedUserRole', role);
        } catch (e) {
          console.error('Offline or error fetching role', e);
          const cachedRole = localStorage.getItem('cachedUserRole') || 'teacher';
          setUserRole(cachedRole);
        }
      } else {
        setUserRole(null);
        localStorage.removeItem('cachedUserRole');
      }
      setAuthResolved(true);
    });
    return () => unsub();
  }, []);

  const RootRedirect = () => {
    if (!initialUser) return <LoginPage />;
    if (userRole === 'admin')           return <Navigate to="/admin"           replace />;
    if (userRole === 'student')         return <Navigate to="/student"         replace />;
    if (userRole === 'hod')             return <Navigate to="/hod"             replace />;
    if (userRole === 'registrar')       return <Navigate to="/registrar"       replace />;
    if (userRole === 'setup')           return <Navigate to="/setup"           replace />;
    if (userRole === 'velaarAdmin')     return <Navigate to="/velaar-admin"    replace />;
    if (userRole === 'examController')  return <Navigate to="/exam-controller" replace />;
    if (userRole === 'parent')          return <Navigate to="/parent"          replace />;
    if (userRole === 'teacher')         return <Navigate to="/teacher"         replace />;
    if (userRole === 'pending')         return <Navigate to="/pending"         replace />;
    return <Navigate to="/pending" replace />;
  };

  return (
    <Router>
      <CopilotProvider>
        <div className="app-layout">
          <MeshBackground />

          {authResolved ? (
            <div className="content-layer">
              <Routes>
                <Route path="/" element={<RootRedirect />} />

                {/* Admin nested routes */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']} fallback={<AdminDashboardSkeleton />}>
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<AdminDashboard />} />
                  <Route path="timetable-generator" element={<TimetableGenerator />} />
                  <Route path="notice-generator" element={<NoticeGenerator />} />
                  <Route path="accreditation" element={<AccreditationHub />} />
                </Route>

                {/* HOD nested routes */}
                <Route path="/hod" element={
                  <ProtectedRoute allowedRoles={['hod']}>
                    <HodLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<HodDashboard />} />
                  <Route path="mapping" element={<CourseMapping />} />
                  <Route path="feedback-analytics" element={<FeedbackAnalytics />} />
                  <Route path="meeting-minutes" element={<MeetingMinutes />} />
                  <Route path="timetable-generator" element={<TimetableGenerator />} />
                </Route>

                {/* Student nested routes */}
                <Route path="/student" element={
                  <ProtectedRoute allowedRoles={['student']} fallback={<StudentDashboardSkeleton />}>
                    <StudentLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<StudentDashboard />} />
                  <Route path="study-material" element={<StudyMaterialGenerator />} />
                  <Route path="flashcards" element={<FlashcardViewer />} />
                  <Route path="assignments" element={<AssignmentSubmission />} />
                  <Route path="feedback" element={<FeedbackForm />} />
                  <Route path="attendance" element={<AttendanceScanner />} />
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
                  <Route path="questionbank" element={<QuestionBankPage />} />
                  <Route path="lesson-plan" element={<LessonPlanPage />} />
                  <Route path="examination" element={<ExaminationPage />} />
                  <Route path="examination/:examId" element={<ExaminationEditor />} />
                  <Route path="attendance" element={<AttendanceSession />} />
                  <Route path="profile" element={<TeacherProfile />} />
                  <Route path="marks" element={<MarksDashboard />} />
                  <Route path="marks/edit/:examId" element={<EditMarks />} />
                  <Route path="answer-evaluator" element={<AnswerEvaluator />} />
                  <Route path="rubric-generator" element={<RubricGenerator />} />
                  <Route path="co-attainment" element={<COAttainment />} />
                  <Route path="student-risk" element={<StudentRiskAnalytics />} />
                  <Route path="lab-manual" element={<LabManualGenerator />} />
                  <Route path="assignment-hub" element={<AssignmentHub />} />
                  <Route path="syllabus" element={<SyllabusPage />} />
                  <Route path="learning-resources" element={<LearningResourcesPage />} />
                  <Route path="timetable" element={<TimetablePage />} />
                  <Route path="notice" element={<NoticePage />} />
                  <Route path="event" element={<EventPage />} />
                  <Route path="about" element={<AboutUsPage />} />
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
              </Routes>

              <GlobalCopilot userRole={userRole} />
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
