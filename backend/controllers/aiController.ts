/**
 * AI Controller — thin HTTP handlers only.
 * Extracts request params, calls the service layer, returns response.
 * No prompt strings, no Gemini calls, no business logic here.
 *
 * SECURITY: getCtx() reads identity from req.user (JWT-verified by requireAuth middleware).
 * Never trust req.body for teacherId/teacherEmail — clients can spoof those.
 */

import { Request, Response } from 'express';
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
  parseSyllabusService,
} from '../services/aiGenerationService.js';

interface TeacherCtx {
  teacherId: string;
  teacherEmail: string;
  teacherName: string;
  courseId: string;
  subjectName: string;
  [key: string]: unknown;
}

/**
 * Extract teacher context from the VERIFIED JWT user only.
 * Body fields teacherId/teacherEmail are intentionally ignored
 * to prevent any logged-in user from spoofing another teacher's identity.
 * courseId/subjectName are non-sensitive metadata so they can come from the body.
 */
const getCtx = (req: Request): TeacherCtx => ({
  teacherId:    req.user?.id    ?? 'unknown',
  teacherEmail: req.user?.email ?? '',
  teacherName:  '',                                   // fetched server-side in logAiUsage if needed
  courseId:     typeof req.body.courseId === 'string'    ? req.body.courseId    : '',
  subjectName:  typeof req.body.subjectName === 'string' ? req.body.subjectName : '',
});

// ─── 1. Generate Lecture Roadmap ──────────────────────────────────────────────
export const generateLectureRoadmap = async (req: Request, res: Response): Promise<void> => {
  const { syllabusText, totalLectures, acceptedModules } = req.body as {
    syllabusText?: string; totalLectures?: number; acceptedModules?: unknown;
  };
  if (!syllabusText || syllabusText.length < 50) {
    res.status(400).json({ error: 'Syllabus text is empty or too short' });
    return;
  }
  try {
    const result = await generateRoadmapService({ syllabusText, totalLectures, acceptedModules }, getCtx(req));
    res.status(200).json(result);
  } catch (err) {
    console.error('[aiController] generateLectureRoadmap error:', err);
    res.status(500).json({ error: 'Generation failed' });
  }
};

// ─── 2. Generate Questions from Topics ───────────────────────────────────────
export const generateQuestionsFromTopics = async (req: Request, res: Response): Promise<void> => {
  const { completedTopics, examLength, btPreferences, numericalCount, numericalPrompt, pastNumericals } = req.body as {
    completedTopics?: unknown[]; examLength?: number; btPreferences?: unknown[];
    numericalCount?: number; numericalPrompt?: string; pastNumericals?: unknown[];
  };
  if (!completedTopics || completedTopics.length === 0) { res.status(200).json([]); return; }
  try {
    const result = await generateQuestionsFromTopicsService(
      { completedTopics, examLength, btPreferences, numericalCount, numericalPrompt, pastNumericals },
      getCtx(req),
    );
    res.status(200).json(result);
  } catch (err) {
    console.error('[aiController] generateQuestionsFromTopics error:', err);
    res.status(500).json({ error: 'Generation failed' });
  }
};

// ─── 3. Generate Questions from Syllabus ─────────────────────────────────────
export const generateQuestionsFromSyllabus = async (req: Request, res: Response): Promise<void> => {
  const { syllabus, examLength } = req.body as { syllabus?: unknown; examLength?: number };
  try {
    const result = await generateQuestionsFromSyllabusService({ syllabus, examLength }, getCtx(req));
    res.status(200).json(result);
  } catch {
    res.status(200).json([]);
  }
};

// ─── 4. Grade Full Exam ───────────────────────────────────────────────────────
export const gradeFullExam = async (req: Request, res: Response): Promise<void> => {
  const { syllabus, examData } = req.body as { syllabus?: unknown; examData?: unknown };
  try {
    const result = await gradeExamService({ syllabus, examData }, getCtx(req));
    res.status(200).json(result);
  } catch {
    res.status(200).json({ score: 0, feedback: 'Error reading AI response.' });
  }
};

// ─── 5. Generate Lesson Plan ──────────────────────────────────────────────────
export const generateLessonPlan = async (req: Request, res: Response): Promise<void> => {
  const { subjectName, modules } = req.body as { subjectName?: string; modules?: unknown[] };
  if (!modules || modules.length === 0) { res.status(400).json({ error: 'No modules provided' }); return; }
  try {
    const result = await generateLessonPlanService({ subjectName, modules }, getCtx(req));
    res.status(200).json(result);
  } catch (err) {
    console.error('[aiController] generateLessonPlan error:', err);
    res.status(500).json({ error: 'Lesson Plan Generation Error' });
  }
};

// ─── 6. Generate Specific Field ───────────────────────────────────────────────
export const generateSpecificField = async (req: Request, res: Response): Promise<void> => {
  const { type, subjectName, modules } = req.body as { type?: string; subjectName?: string; modules?: unknown[] };
  try {
    const result = await generateSpecificFieldService({ type, subjectName, modules }, getCtx(req));
    res.status(200).json(result);
  } catch (err) {
    console.error('[aiController] generateSpecificField error:', err);
    res.status(500).json({ error: 'Generation failed' });
  }
};

// ─── 7. Generate Supplementary Lesson Plan ────────────────────────────────────
export const generateSupplementaryLessonPlan = async (req: Request, res: Response): Promise<void> => {
  const { subjectName, modules } = req.body as { subjectName?: string; modules?: unknown[] };
  if (!modules || modules.length === 0) { res.status(400).json({ error: 'No modules' }); return; }
  try {
    const result = await generateSupplementaryPlanService({ subjectName, modules }, getCtx(req));
    res.status(200).json(result);
  } catch (err) {
    console.error('[aiController] generateSupplementaryLessonPlan error:', err);
    res.status(500).json({ error: 'Generation failed' });
  }
};

// ─── 8. Generate Day-Wise Enrichment ─────────────────────────────────────────
export const generateDayWiseEnrichment = async (req: Request, res: Response): Promise<void> => {
  const { subjectName, roadmapTitles, textBooks, refBooks } = req.body as {
    subjectName?: string; roadmapTitles?: unknown[]; textBooks?: unknown[]; refBooks?: unknown[];
  };
  if (!roadmapTitles || roadmapTitles.length === 0) { res.status(400).json({ error: 'No roadmap titles' }); return; }
  try {
    const result = await generateDayWiseEnrichmentService({ subjectName, roadmapTitles, textBooks, refBooks }, getCtx(req));
    res.status(200).json(result);
  } catch (err) {
    console.error('[aiController] generateDayWiseEnrichment error:', err);
    res.status(500).json({ error: 'Enrichment generation failed' });
  }
};

// ─── 9. Generate CO-PO Mapping ───────────────────────────────────────────────
export const generateCoPoMapping = async (req: Request, res: Response): Promise<void> => {
  const { courseOutcomes, programOutcomes } = req.body as { courseOutcomes?: unknown[]; programOutcomes?: any[] };
  try {
    const result = await generateCoPoMappingService({ courseOutcomes, programOutcomes }, getCtx(req));
    res.status(200).json(result);
  } catch (err) {
    console.error('[aiController] generateCoPoMapping error:', err);
    res.status(500).json({ error: 'CO-PO mapping failed' });
  }
};

// ─── 10. Copilot Chat ─────────────────────────────────────────────────────────
export const copilotChat = async (req: Request, res: Response): Promise<void> => {
  const { messages, userRole, pagePath, pageLabel, pageContext } = req.body as {
    messages?: unknown[]; userRole?: string; pagePath?: string; pageLabel?: string; pageContext?: unknown;
  };
  if (!messages || messages.length === 0) { res.status(400).json({ error: 'No messages provided' }); return; }
  try {
    const result = await copilotChatService({ messages, userRole, pagePath, pageLabel, pageContext }, getCtx(req));
    res.status(200).json(result);
  } catch (err) {
    console.error('[aiController] copilotChat error:', err);
    res.status(500).json({ error: 'Copilot chat failed' });
  }
};

// ─── 11. Classify Copilot Intent ─────────────────────────────────────────────
export const classifyCopilotIntent = async (req: Request, res: Response): Promise<void> => {
  const { prompt, context } = req.body as { prompt?: string; context?: unknown };
  try {
    const result = await classifyIntentService({ prompt, context }, getCtx(req));
    res.status(200).json(result);
  } catch (err) {
    console.error('[aiController] classifyCopilotIntent error:', err);
    res.status(500).json({ error: 'Failed to classify intent' });
  }
};

// ─── 12. Generate Lecture Presentation ───────────────────────────────────────
export const generateLecturePresentation = async (req: Request, res: Response): Promise<void> => {
  const { subjectName, lecture, overview, course } = req.body as {
    subjectName?: string; lecture?: unknown; overview?: unknown; course?: unknown;
  };
  try {
    const result = await generatePresentationService({ subjectName, lecture, overview, course }, getCtx(req));
    res.status(200).json(result);
  } catch (err) {
    console.error('[aiController] generateLecturePresentation error:', err);
    res.status(500).json({ error: 'Failed to generate presentation', details: err instanceof Error ? err.message : String(err) });
  }
};

// ─── 13. Parse Syllabus ───────────────────────────────────────────────────────
export const parseSyllabus = async (req: Request, res: Response): Promise<void> => {
  const { rawText } = req.body as { rawText?: string };
  if (!rawText || rawText.trim().length < 50) {
    res.status(400).json({ error: 'Syllabus text is empty or too short' });
    return;
  }
  try {
    const result = await parseSyllabusService({ rawText }, getCtx(req));
    res.status(200).json(result);
  } catch (err) {
    console.error('[aiController] parseSyllabus error:', err);
    res.status(500).json({ error: 'Failed to parse syllabus', details: err instanceof Error ? err.message : String(err) });
  }
};
