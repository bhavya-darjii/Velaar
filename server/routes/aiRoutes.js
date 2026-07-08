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
  copilotChat
} from '../controllers/aiController.js';
import {
  generateRubric,
  evaluateAnswerScript,
  generateStudyMaterial,
  generateLabManual,
} from '../controllers/rubricController.js';

const router = express.Router();

router.post('/generate-roadmap', generateLectureRoadmap);
router.post('/generate-questions-topics', generateQuestionsFromTopics);
router.post('/generate-questions-syllabus', generateQuestionsFromSyllabus);
router.post('/grade-exam', gradeFullExam);
router.post('/generate-lesson-plan', generateLessonPlan);
router.post('/generate-specific-field', generateSpecificField);
router.post('/generate-supplementary-plan', generateSupplementaryLessonPlan);
router.post('/generate-day-wise-enrichment', generateDayWiseEnrichment);
router.post('/generate-copo-mapping', generateCoPoMapping);
router.post('/copilot-chat', copilotChat);
router.post('/generate-rubric', generateRubric);
router.post('/evaluate-answer-script', evaluateAnswerScript);
router.post('/generate-study-material', generateStudyMaterial);
router.post('/generate-lab-manual', generateLabManual);

export default router;
