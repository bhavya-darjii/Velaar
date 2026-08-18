import express from 'express';
import {
  getStudentAnalytics,
  getTeacherAnalytics,
  getHodAnalytics,
  getPrincipalAnalytics,
} from '../controllers/hierarchicalAnalyticsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All routes require a valid Supabase JWT
router.use(requireAuth);

/**
 * Level 1 — Student
 *   Self:       GET /api/hier-analytics/student          (JWT user is the student)
 *   Drill-down: GET /api/hier-analytics/student/:studentId (teacher/parent/HOD/principal)
 */
router.get('/student',             getStudentAnalytics);
router.get('/student/:studentId',  getStudentAnalytics);

/**
 * Level 2 — Teacher
 *   Self:       GET /api/hier-analytics/teacher          (JWT user is the teacher)
 *   Drill-down: GET /api/hier-analytics/teacher/:teacherId (HOD/principal drilldown)
 */
router.get('/teacher',             getTeacherAnalytics);
router.get('/teacher/:teacherId',  getTeacherAnalytics);

/**
 * Level 3 — HOD
 *   GET /api/hier-analytics/hod   (dept inferred from JWT user's department field)
 */
router.get('/hod',                 getHodAnalytics);

/**
 * Level 4 — Principal
 *   GET /api/hier-analytics/principal   (institution inferred from JWT user's institution_id)
 */
router.get('/principal',           getPrincipalAnalytics);

export default router;
