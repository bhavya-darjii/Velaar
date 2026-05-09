// Wrapper service to connect to our secure Node.js backend.
// Every request now includes teacher context so the server can log AI usage accurately.

import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const rawBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const API_URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/ai` : `${BASE_URL}/api/ai`;

// ─── Teacher context cache (fetched once per session) ─────────────────────────
let _cachedCtx = null;
let _pendingCourseId = '';
let _pendingSubjectName = '';

const getTeacherContext = async () => {
  if (_cachedCtx) {
    // Ensure pending updates apply if they happened while cached
    _cachedCtx.courseId = _pendingCourseId || _cachedCtx.courseId;
    _cachedCtx.subjectName = _pendingSubjectName || _cachedCtx.subjectName;
    return _cachedCtx;
  }

  const user = auth.currentUser;
  if (!user) return {};

  let teacherName  = user.displayName || '';

  try {
    if (!teacherName) {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      if (userSnap.exists()) {
        const d = userSnap.data();
        teacherName = d.fullName || d.name || d.taughtBy || '';
      }
    }
  } catch (_) { /* silent */ }

  _cachedCtx = {
    teacherId:    user.uid,
    teacherEmail: user.email || '',
    teacherName,
    courseId:     _pendingCourseId,
    subjectName:  _pendingSubjectName,
  };
  return _cachedCtx;
};

// Allow other components to inject the active course/subject into context
export const setAiContextCourse = (courseId, subjectName) => {
  _pendingCourseId = courseId || '';
  _pendingSubjectName = subjectName || '';
  
  if (_cachedCtx) {
    _cachedCtx.courseId    = _pendingCourseId;
    _cachedCtx.subjectName = _pendingSubjectName;
  }
};

// Invalidate cache on sign-out
export const clearAiContext = () => { _cachedCtx = null; };

// ─── Shared fetch helper ──────────────────────────────────────────────────────
const aiPost = async (endpoint, body) => {
  const ctx = await getTeacherContext();
  const res = await fetch(`${API_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, ...ctx }),
  });
  return res.json();
};

// ─── Public API functions ─────────────────────────────────────────────────────

export const generateLectureRoadmap = async (syllabusText, totalLectures, acceptedModules) => {
  try {
    return await aiPost('generate-roadmap', { syllabusText, totalLectures, acceptedModules });
  } catch (error) {
    console.error("Roadmap Generation Error:", error);
    return { roadmap: [], usage: null };
  }
};

export const generateQuestionsFromTopics = async (completedTopics, examLength, btPreferences = [], numericalCount = 0, numericalPrompt = "", pastNumericals = []) => {
  try {
    return await aiPost('generate-questions-topics', { completedTopics, examLength, btPreferences, numericalCount, numericalPrompt, pastNumericals });
  } catch (error) {
    console.error("Topic Exam Gen Error:", error);
    return [];
  }
};

export const generateQuestionsFromSyllabus = async (syllabus, examLength) => {
  try {
    return await aiPost('generate-questions-syllabus', { syllabus, examLength });
  } catch (error) {
    console.error("Generation Error:", error);
    return [];
  }
};

export const gradeFullExam = async (syllabus, examData) => {
  try {
    return await aiPost('grade-exam', { syllabus, examData });
  } catch (error) {
    console.error("Grading error:", error);
    return { score: 0, feedback: "Error reading API response." };
  }
};

export const generateLessonPlan = async (subjectName, modules) => {
  try {
    return await aiPost('generate-lesson-plan', { subjectName, modules });
  } catch (error) {
    console.error("Lesson Plan Generation Error:", error);
    return null;
  }
};

export const generateSpecificField = async (type, subjectName, modules) => {
  try {
    return await aiPost('generate-specific-field', { type, subjectName, modules });
  } catch (error) {
    console.error("Single Gen Error", error);
    return null;
  }
};

export const generateSupplementaryLessonPlan = async (subjectName, modules) => {
  try {
    return await aiPost('generate-supplementary-plan', { subjectName, modules });
  } catch (error) {
    console.error("Suppl Gen Error", error);
    return null;
  }
};

export const generateDayWiseEnrichment = async (subjectName, roadmapTitles, textBooks = [], refBooks = []) => {
  try {
    return await aiPost('generate-day-wise-enrichment', { subjectName, roadmapTitles, textBooks, refBooks });
  } catch (error) {
    console.error("DayWise Enrichment Error", error);
    return null;
  }
};

export const generateCoPoMapping = async (courseOutcomes, programOutcomes) => {
  try {
    return await aiPost('generate-copo-mapping', { courseOutcomes, programOutcomes });
  } catch (error) {
    console.error("CoPoMapping Error", error);
    return null;
  }
};