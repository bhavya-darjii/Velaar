// Wrapper service to connect to our secure Node.js backend
const rawBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const API_URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/ai` : `${BASE_URL}/api/ai`;

export const generateLectureRoadmap = async (syllabusText, totalLectures, acceptedModules) => {
  try {
    const res = await fetch(`${API_URL}/generate-roadmap`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syllabusText, totalLectures, acceptedModules })
    });
    return await res.json();
  } catch (error) {
    console.error("Roadmap Generation Error:", error);
    return { roadmap: [], usage: null };
  }
};

export const generateQuestionsFromTopics = async (completedTopics, examLength, btPreferences = []) => {
  try {
    const res = await fetch(`${API_URL}/generate-questions-topics`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedTopics, examLength, btPreferences })
    });
    return await res.json();
  } catch (error) {
    console.error("Topic Exam Gen Error:", error);
    return [];
  }
};

export const generateQuestionsFromSyllabus = async (syllabus, examLength) => {
  try {
    const res = await fetch(`${API_URL}/generate-questions-syllabus`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syllabus, examLength })
    });
    return await res.json();
  } catch (error) {
    console.error("Generation Error:", error);
    return [];
  }
};

export const gradeFullExam = async (syllabus, examData) => {
  try {
    const res = await fetch(`${API_URL}/grade-exam`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syllabus, examData })
    });
    return await res.json();
  } catch (error) {
    console.error("Grading error:", error);
    return { score: 0, feedback: "Error reading API response." };
  }
};

export const generateLessonPlan = async (subjectName, modules) => {
  try {
    const res = await fetch(`${API_URL}/generate-lesson-plan`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectName, modules })
    });
    return await res.json();
  } catch (error) {
    console.error("Lesson Plan Generation Error:", error);
    return null;
  }
};

export const generateSpecificField = async (type, subjectName, modules) => {
  try {
    const res = await fetch(`${API_URL}/generate-specific-field`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, subjectName, modules })
    });
    return await res.json();
  } catch (error) {
    console.error("Single Gen Error", error);
    return null;
  }
};

export const generateSupplementaryLessonPlan = async (subjectName, modules) => {
  try {
    const res = await fetch(`${API_URL}/generate-supplementary-plan`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectName, modules })
    });
    return await res.json();
  } catch (error) {
    console.error("Suppl Gen Error", error);
    return null;
  }
};

export const generateDayWiseEnrichment = async (subjectName, roadmapTitles, textBooks = [], refBooks = []) => {
  try {
    const res = await fetch(`${API_URL}/generate-day-wise-enrichment`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectName, roadmapTitles, textBooks, refBooks })
    });
    return await res.json();
  } catch (error) {
    console.error("DayWise Enrichment Error", error);
    return null;
  }
};

export const generateCoPoMapping = async (courseOutcomes, programOutcomes) => {
  try {
    const res = await fetch(`${API_URL}/generate-copo-mapping`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseOutcomes, programOutcomes })
    });
    return await res.json();
  } catch (error) {
    console.error("CoPoMapping Error", error);
    return null;
  }
};