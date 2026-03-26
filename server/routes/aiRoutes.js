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
  generateCoPoMapping
} from '../controllers/aiController.js';

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

export default router;
