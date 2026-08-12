/**
 * AI Controller — thin HTTP handlers only.
 * Extracts request params, calls the service layer, returns response.
 * No prompt strings, no Gemini calls, no business logic here.
 */

import {
  generateRoadmapService,
  generateQuestionsFromTopicsService,
  generateQuestionsFromSyllabusService,
  gradeExamService,
  generateLessonPlanService,
  generateSpecificFieldService,
  generateSupplementaryPlanService,
  generateDayWiseEnrichmentService,
  generateCoPoMappingService,
  copilotChatService,
  classifyIntentService,
  generatePresentationService,
} from '../services/aiGenerationService.js';

/** Extract teacher context from request body */
const getCtx = (req) => ({
  teacherId:    req.body.teacherId || req.user?.id || 'unknown',
  teacherEmail: req.body.teacherEmail || req.user?.email || '',
  teacherName:  req.body.teacherName || '',
  courseId:     req.body.courseId || '',
  subjectName:  req.body.subjectName || '',
});

// ─── 1. Generate Lecture Roadmap ──────────────────────────────────────────────
export const generateLectureRoadmap = async (req, res) => {
  const { syllabusText, totalLectures, acceptedModules } = req.body;
  if (!syllabusText || syllabusText.length < 50) {
    return res.status(400).json({ error: 'Syllabus text is empty or too short' });
  }
  try {
    const result = await generateRoadmapService({ syllabusText, totalLectures, acceptedModules }, getCtx(req));
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: 'Generation failed' });
  }
};

// ─── 2. Generate Questions from Topics ───────────────────────────────────────
export const generateQuestionsFromTopics = async (req, res) => {
  const { completedTopics, examLength, btPreferences, numericalCount, numericalPrompt, pastNumericals } = req.body;
  if (!completedTopics || completedTopics.length === 0) return res.status(200).json([]);
  try {
    const result = await generateQuestionsFromTopicsService(
      { completedTopics, examLength, btPreferences, numericalCount, numericalPrompt, pastNumericals },
      getCtx(req),
    );
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Generation failed' });
  }
};

// ─── 3. Generate Questions from Syllabus ─────────────────────────────────────
export const generateQuestionsFromSyllabus = async (req, res) => {
  const { syllabus, examLength } = req.body;
  try {
    const result = await generateQuestionsFromSyllabusService({ syllabus, examLength }, getCtx(req));
    return res.status(200).json(result);
  } catch {
    return res.status(200).json([]);
  }
};

// ─── 4. Grade Full Exam ───────────────────────────────────────────────────────
export const gradeFullExam = async (req, res) => {
  const { syllabus, examData } = req.body;
  try {
    const result = await gradeExamService({ syllabus, examData }, getCtx(req));
    return res.status(200).json(result);
  } catch {
    return res.status(200).json({ score: 0, feedback: 'Error reading AI response.' });
  }
};

// ─── 5. Generate Lesson Plan ──────────────────────────────────────────────────
export const generateLessonPlan = async (req, res) => {
  const { subjectName, modules } = req.body;
  if (!modules || modules.length === 0) return res.status(400).json({ error: 'No modules provided' });
  try {
    const result = await generateLessonPlanService({ subjectName, modules }, getCtx(req));
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: 'Lesson Plan Generation Error' });
  }
};

// ─── 6. Generate Specific Field ───────────────────────────────────────────────
export const generateSpecificField = async (req, res) => {
  const { type, subjectName, modules } = req.body;
  try {
    const result = await generateSpecificFieldService({ type, subjectName, modules }, getCtx(req));
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: 'Generation failed' });
  }
};

// ─── 7. Generate Supplementary Lesson Plan ────────────────────────────────────
export const generateSupplementaryLessonPlan = async (req, res) => {
  const { subjectName, modules } = req.body;
  if (!modules || modules.length === 0) return res.status(400).json({ error: 'No modules' });
  try {
    const result = await generateSupplementaryPlanService({ subjectName, modules }, getCtx(req));
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: 'Generation failed' });
  }
};

// ─── 8. Generate Day-Wise Enrichment ─────────────────────────────────────────
export const generateDayWiseEnrichment = async (req, res) => {
  const { subjectName, roadmapTitles, textBooks, refBooks } = req.body;
  if (!roadmapTitles || roadmapTitles.length === 0) return res.status(400).json({ error: 'No roadmap titles' });
  try {
    const result = await generateDayWiseEnrichmentService({ subjectName, roadmapTitles, textBooks, refBooks }, getCtx(req));
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: 'Enrichment generation failed' });
  }
};

// ─── 9. Generate CO-PO Mapping ───────────────────────────────────────────────
export const generateCoPoMapping = async (req, res) => {
  const { courseOutcomes, programOutcomes } = req.body;
  try {
    const result = await generateCoPoMappingService({ courseOutcomes, programOutcomes }, getCtx(req));
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: 'CO-PO mapping failed' });
  }
};

// ─── 10. Copilot Chat ─────────────────────────────────────────────────────────
export const copilotChat = async (req, res) => {
  const { messages, userRole, pagePath, pageLabel, pageContext } = req.body;
  if (!messages || messages.length === 0) return res.status(400).json({ error: 'No messages provided' });
  try {
    const result = await copilotChatService({ messages, userRole, pagePath, pageLabel, pageContext }, getCtx(req));
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: 'Copilot chat failed' });
  }
};

// ─── 11. Classify Copilot Intent ─────────────────────────────────────────────
export const classifyCopilotIntent = async (req, res) => {
  const { prompt, context } = req.body;
  try {
    const result = await classifyIntentService({ prompt, context }, getCtx(req));
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: 'Failed to classify intent' });
  }
};

// ─── 12. Generate Lecture Presentation ───────────────────────────────────────
export const generateLecturePresentation = async (req, res) => {
  const { subjectName, lecture, overview, course } = req.body;
  try {
    const result = await generatePresentationService({ subjectName, lecture, overview, course }, getCtx(req));
    return res.status(200).json(result);
  } catch (e) {
    console.error('generateLecturePresentation error:', e);
    return res.status(500).json({ error: e.message || 'Failed to generate presentation' });
  }
};
