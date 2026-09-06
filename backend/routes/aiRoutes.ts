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
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply AI rate limiter + auth to all AI routes
router.use(aiLimiter);
router.use(requireAuth);

router.post('/generate-roadmap',            generateLectureRoadmap);
router.post('/generate-questions-topics',   generateQuestionsFromTopics);
router.post('/generate-questions-syllabus', generateQuestionsFromSyllabus);
router.post('/grade-exam',                  gradeFullExam);
router.post('/generate-lesson-plan',        generateLessonPlan);
router.post('/generate-specific-field',     generateSpecificField);
router.post('/generate-supplementary-plan', generateSupplementaryLessonPlan);
router.post('/generate-day-wise-enrichment',generateDayWiseEnrichment);
router.post('/generate-copo-mapping',       generateCoPoMapping);
router.post('/copilot-chat',                copilotChat);
router.post('/generate-rubric',             generateRubric);
router.post('/evaluate-answer-script',      evaluateAnswerScript);
router.post('/generate-study-material',     generateStudyMaterial);
router.post('/generate-lab-manual',         generateLabManual);
router.post('/intent',                      classifyCopilotIntent);
router.post('/generate-lecture-presentation', generateLecturePresentation);
router.post('/parse-syllabus',               parseSyllabus);

export default router;
