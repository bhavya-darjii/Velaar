import express from 'express';
import {
  generateLectureRoadmap,
  generateQuestionsFromTopics,
  generateQuestionsFromSyllabus,
  gradeFullExam,
  generateLessonPlan,
  generateSpecificField,
  generateSupplementaryLessonPlan,
  generateDayWiseEnrichment,
  generateCoPoMapping,
  copilotChat,
  classifyCopilotIntent,
  generateLecturePresentation,
  parseSyllabus,
} from '../controllers/aiController.js';
import {
  generateRubric,
  evaluateAnswerScript,
  generateStudyMaterial,
  generateLabManual,
} from '../controllers/rubricController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply AI rate limiter to all AI routes
router.use(aiLimiter);

// ── Generation endpoints accessible with optional auth (personalises context when logged in) ──
router.post('/copilot-chat',            optionalAuth, copilotChat);
router.post('/intent',                  optionalAuth, classifyCopilotIntent);
router.post('/generate-questions-topics', optionalAuth, generateQuestionsFromTopics);
router.post('/generate-lesson-plan',    optionalAuth, generateLessonPlan);
router.post('/generate-roadmap',        optionalAuth, generateLectureRoadmap);
router.post('/parse-syllabus',          optionalAuth, parseSyllabus);

// ── Protected teacher-only routes (require a valid Supabase login) ────────────
router.use(requireAuth);

router.post('/generate-questions-syllabus',   generateQuestionsFromSyllabus);
router.post('/grade-exam',                    gradeFullExam);
router.post('/generate-specific-field',       generateSpecificField);
router.post('/generate-supplementary-plan',   generateSupplementaryLessonPlan);
router.post('/generate-day-wise-enrichment',  generateDayWiseEnrichment);
router.post('/generate-copo-mapping',         generateCoPoMapping);
router.post('/generate-rubric',               generateRubric);
router.post('/evaluate-answer-script',        evaluateAnswerScript);
router.post('/generate-study-material',       generateStudyMaterial);
router.post('/generate-lab-manual',           generateLabManual);
router.post('/generate-lecture-presentation', generateLecturePresentation);

export default router;
