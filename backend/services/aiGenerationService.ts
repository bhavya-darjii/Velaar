/* eslint-disable */
// @ts-nocheck
/**
 * AI Generation Service.
 * Business logic layer: builds prompts, calls Gemini, parses responses, logs usage.
 * Controllers call these — they never touch callGemini or logAiUsage directly.
 */

import { callGemini } from '../utils/gemini.js';
import { logAiUsage } from '../utils/logAiUsage.js';
import {
  buildRoadmapPrompt, roadmapSystem,
  buildTheoryQuestionsPrompt, theoryQuestionsSystem,
  buildNumericalQuestionsPrompt, numericalQuestionsSystem,
  buildSyllabusQuestionsPrompt,
  buildGradeExamPrompt,
  buildLessonPlanPrompt,
  buildSpecificFieldPrompt,
  buildSupplementaryPlanPrompt,
  buildDayWiseEnrichmentPrompt,
  buildCoPoMappingPrompt,
  buildCopilotSystemPrompt,
  copilotIntentSystem,
  buildPresentationPrompt,
  presentationSystem,
  buildSyllabusParserPrompt,
  syllabusParserSystem,
} from '../prompts/aiPrompts.js';

/** Shared context passed from controller to service to logAiUsage */
type Ctx = { teacherId: string; teacherEmail: string; teacherName: string; courseId: string; subjectName: string; [key: string]: unknown; };

/** Shared: parse JSON from Gemini text response robustly */
const parseJson = (text: string) => {
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (err: any) {
    // 1. If error provides exact position of unexpected character after JSON, slice up to that position
    const posMatch = err?.message?.match(/at position (\d+)/);
    if (posMatch) {
      try {
        return JSON.parse(clean.slice(0, parseInt(posMatch[1], 10)).trim());
      } catch (_) { /* continue to next strategy */ }
    }

    // 2. Bracket counting: find the balanced root { ... } object
    const start = clean.indexOf('{');
    if (start !== -1) {
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let i = start; i < clean.length; i++) {
        const c = clean[i];
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (!inStr) {
          if (c === '{') depth++;
          else if (c === '}') {
            depth--;
            if (depth === 0) {
              try {
                return JSON.parse(clean.slice(start, i + 1));
              } catch (_) { break; }
            }
          }
        }
      }
    }

    // 3. Fallback regex
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_) { /* throw original err */ }
    }
    throw err;
  }
};

/** Shared: parse JSON array robustly (handles wrapped objects) */
const parseJsonArray = (text) => {
  const match = text.match(/\[[\s\S]*\]/);
  if (match) return JSON.parse(match[0]);
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const parsed = JSON.parse(objMatch[0]);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
    if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
    return [parsed];
  }
  return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
};

// --- Roadmap ---------------------------------------------------------
export const generateRoadmapService = async (
  { syllabusText, totalLectures, acceptedModules }: { syllabusText?: string; totalLectures?: number; acceptedModules?: unknown },
  ctx: Ctx,
) => {
  const prompt = buildRoadmapPrompt(syllabusText, totalLectures, acceptedModules);
  const data = await callGemini({
    // roadmapSystem is cached by Gemini — static rules not re-billed on repeat calls.
    systemInstruction: { parts: [{ text: roadmapSystem }] },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  if (data.error || !data.candidates?.[0]) throw new Error('AI generation failed');
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'generate-roadmap', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
  return {
    roadmap: parseJson(data.candidates[0].content.parts[0].text),
    usage: { input: usage.promptTokenCount, output: usage.candidatesTokenCount },
  };
};

// --- Questions from topics ---------------------------------------------------------
export const generateQuestionsFromTopicsService = async ({
  completedTopics, examLength, btPreferences = [], numericalCount = 0, numericalPrompt = '', pastNumericals = [],
}: {
  completedTopics: unknown[];
  examLength?: number;
  btPreferences?: unknown[];
  numericalCount?: number;
  numericalPrompt?: string;
  pastNumericals?: unknown[];
}, ctx: Ctx) => {
  const syllabusTopicsStr = completedTopics.join(', ');
  const prefText = btPreferences.length > 0
    ? `PRIORITY: Give strong preference to generating questions with these BT Levels: [${btPreferences.join(', ')}]. However, include a few from other levels to maintain a realistic exam balance.`
    : 'Provide a balanced mix of all BT levels.';
  const numTheory = Math.max(0, examLength - numericalCount);
  const numNumerical = Math.min(examLength, numericalCount);

  /** Call Gemini and log — used for each sub-call */
  const callAI = async (promptText, systemInstructionText) => {
    const data = await callGemini({
      systemInstruction: { parts: [{ text: systemInstructionText }] },
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    const usage = data.usageMetadata || {};
    await logAiUsage({ action: 'generate-questions-topics', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
    if (data.error) throw new Error(data.error.message || 'Gemini API Error');
    if (!data.candidates?.[0]) throw new Error(data.promptFeedback?.blockReason ? `Blocked: ${data.promptFeedback.blockReason}` : 'No AI response');
    return parseJsonArray(data.candidates[0].content.parts[0].text);
  };

  let theoryQuestions = [];
  let numericalQuestions = [];

  if (numTheory > 0) {
    theoryQuestions = await callAI(buildTheoryQuestionsPrompt(syllabusTopicsStr, numTheory, prefText), theoryQuestionsSystem);
  }

  if (numNumerical > 0) {
    const isFullExample = numericalPrompt && (numericalPrompt.includes('?') || numericalPrompt.length > 50 || numericalPrompt.includes('=') || numericalPrompt.includes('[') || /\d/.test(numericalPrompt));
    const fetched = await callAI(buildNumericalQuestionsPrompt(numNumerical, numericalPrompt, isFullExample, pastNumericals), numericalQuestionsSystem);
    if (Array.isArray(fetched)) numericalQuestions = fetched.map(q => ({ ...q, isNumerical: true }));
  }

  let combined = [
    ...(Array.isArray(theoryQuestions) ? theoryQuestions : []),
    ...(Array.isArray(numericalQuestions) ? numericalQuestions : []),
  ];
  if (combined.length > 1 && numTheory > 0 && numNumerical > 0) {
    combined = combined.sort(() => Math.random() - 0.5);
  }
  return combined;
};

// --- Questions from syllabus ---------------------------------------------------------
export const generateQuestionsFromSyllabusService = async (
  { syllabus, examLength }: { syllabus?: unknown; examLength?: number },
  ctx: Ctx,
) => {
  const poolSize = Math.max(examLength * 5, 20);
  const data = await callGemini({
    contents: [{ parts: [{ text: buildSyllabusQuestionsPrompt(syllabus, poolSize) }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'generate-questions-syllabus', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
  if (data.error || !data.candidates) return [];
  return parseJson(data.candidates[0].content.parts[0].text);
};

// --- Grade exam ---------------------------------------------------------
export const gradeExamService = async (
  { syllabus, examData }: { syllabus?: unknown; examData?: unknown },
  ctx: Ctx,
) => {
  const data = await callGemini({
    contents: [{ parts: [{ text: buildGradeExamPrompt(syllabus, examData) }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'grade-exam', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
  if (data.error || !data.candidates) return { score: 0, feedback: 'AI Grading failed.' };
  const result = parseJson(data.candidates[0].content.parts[0].text);
  if (result.score > 10) result.score = 10;
  return result;
};

// --- Lesson plan ---------------------------------------------------------
export const generateLessonPlanService = async (
  { subjectName, modules }: { subjectName?: string; modules?: unknown[] },
  ctx: Ctx,
) => {
  const moduleNames = modules.map(m => m.name || `Unit ${m.id}`).join(', ');
  const moduleTexts = modules.map(m => `Unit ${m.id}: ${m.name}\n${m.extractedText || ''}`).join('\n\n');
  const data = await callGemini({
    contents: [{ parts: [{ text: buildLessonPlanPrompt(subjectName, moduleNames, moduleTexts) }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'generate-lesson-plan', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx, subjectName: subjectName || ctx.subjectName });
  if (data.error || !data.candidates?.[0]) throw new Error('Lesson plan generation failed');
  return parseJson(data.candidates[0].content.parts[0].text);
};

// --- Specific field ---------------------------------------------------------
export const generateSpecificFieldService = async (
  { type, subjectName, modules }: { type?: string; subjectName?: string; modules?: unknown[] },
  ctx: Ctx,
) => {
  const prompt = buildSpecificFieldPrompt(type, subjectName, modules);
  const data = await callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'generate-specific-field', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx, subjectName: subjectName || ctx.subjectName });
  if (!data.candidates?.[0]) throw new Error('Specific field generation failed');
  const result = parseJson(data.candidates[0].content.parts[0].text);
  return type === 'unit' ? result : result.result;
};

// --- Supplementary plan ---------------------------------------------------------
export const generateSupplementaryPlanService = async (
  { subjectName, modules }: { subjectName?: string; modules?: unknown[] },
  ctx: Ctx,
) => {
  const moduleNames = modules.map((m, i) => `Module ${i + 1}: ${m.name}`).join('\\n');
  const moduleTexts = modules.map(m => `Unit ${m.id}: ${m.name}\\n${m.extractedText || ''}`).join('\\n\\n');
  const data = await callGemini({
    contents: [{ parts: [{ text: buildSupplementaryPlanPrompt(subjectName, modules, moduleNames, moduleTexts) }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'generate-supplementary-plan', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx, subjectName: subjectName || ctx.subjectName });
  if (!data.candidates?.[0]) throw new Error('Supplementary plan generation failed');
  return parseJson(data.candidates[0].content.parts[0].text);
};

// --- Day-wise enrichment ---------------------------------------------------------
export const generateDayWiseEnrichmentService = async (
  { subjectName, roadmapTitles, textBooks = [], refBooks = [] }: { subjectName?: string; roadmapTitles?: unknown[]; textBooks?: unknown[]; refBooks?: unknown[] },
  ctx: Ctx,
) => {
  const topicsList = roadmapTitles.map((t, i) => `${i + 1}. ${t}`).join('\\n');
  const allBooks = [...textBooks, ...refBooks].map((b, i) => `B${i + 1}: ${b}`).join('\\n');
  const data = await callGemini({
    contents: [{ parts: [{ text: buildDayWiseEnrichmentPrompt(subjectName, topicsList, allBooks, roadmapTitles.length) }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'generate-day-wise-enrichment', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx, subjectName: subjectName || ctx.subjectName });
  if (!data.candidates?.[0]) throw new Error('Enrichment generation failed');
  const result = JSON.parse(data.candidates[0].content.parts[0].text);
  return result.enrichment;
};

// --- CO-PO mapping ---------------------------------------------------------
export const generateCoPoMappingService = async (
  { courseOutcomes, programOutcomes }: { courseOutcomes?: unknown[]; programOutcomes?: any[] },
  ctx: Ctx,
) => {
  const coText = courseOutcomes.map((co, i) => `CO${i + 1}: ${co.description}`).join('\n');
  const poText = programOutcomes.map((po, i) => {
    const poLabel = typeof po === 'string' ? po : (po.code || `PO${i + 1}`);
    const poDesc = typeof po === 'string' ? po : (po.title || '');
    return `${poLabel}: ${poDesc}`;
  }).join('\n');
  const data = await callGemini({
    contents: [{ parts: [{ text: buildCoPoMappingPrompt(coText, poText) }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'generate-copo-mapping', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
  if (!data.candidates?.[0]) throw new Error('CO-PO mapping failed');
  const result = parseJson(data.candidates[0].content.parts[0].text);
  return result.mapping;
};

// --- Copilot chat ---------------------------------------------------------
export const copilotChatService = async (
  { messages, userRole = 'teacher', pagePath = '', pageLabel = '', pageContext = {} }: { messages?: any[]; userRole?: string; pagePath?: string; pageLabel?: string; pageContext?: unknown },
  ctx: Ctx,
) => {
  const systemPrompt = buildCopilotSystemPrompt(ctx, userRole, pagePath, pageLabel, pageContext);
  const formattedContents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
  const data = await callGemini({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: formattedContents,
  });
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'copilot-chat', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
  if (data.error || !data.candidates?.[0]) throw new Error('Copilot generation failed');
  return { reply: data.candidates[0].content.parts[0].text };
};

// --- Copilot intent ---------------------------------------------------------
export const classifyIntentService = async (
  { prompt, context }: { prompt?: string; context?: unknown },
  ctx: Ctx,
) => {
  const data = await callGemini({
    systemInstruction: { parts: [{ text: copilotIntentSystem }] },
    contents: [{ parts: [{ text: `User text: "${prompt}"\nCourse Context: ${JSON.stringify(context)}` }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'classify-intent', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
  if (data.error || !data.candidates?.[0]) throw new Error('Intent classification failed');
  return parseJson(data.candidates[0].content.parts[0].text);
};

// --- Lecture presentation ---------------------------------------------------------
export const generatePresentationService = async (
  { subjectName, lecture, overview, course }: { subjectName?: string; lecture?: unknown; overview?: unknown; course?: unknown },
  ctx: Ctx,
) => {
  const prompt = buildPresentationPrompt(subjectName, lecture, overview, course);
  const data = await callGemini({
    systemInstruction: { parts: [{ text: presentationSystem }] },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  if (data.error || !data.candidates?.[0]) {
    console.error("Gemini Raw Error Data:", JSON.stringify(data, null, 2));
    throw new Error('Presentation generation failed');
  }
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'generate-lecture-presentation', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
  return parseJson(data.candidates[0].content.parts[0].text);
};

// --- Syllabus Parser ---------------------------------------------------------

/** Patterns that identify non-teachable administrative sections mistakenly parsed as modules */
const NON_MODULE_PATTERNS = [
  /prerequisite/i,
  /course\s+outline/i,
  /course\s+overview/i,
  /course\s+introduction/i,
  /introduction\s+to\s+(the\s+)?course/i,
  /course\s+conclusion/i,
  /conclusion\s+&?\s*summary/i,
  /^conclusion$/i,
  /^summary$/i,
  /reference(s)?$/i,
  /bibliography/i,
  /recommended\s+book/i,
  /text\s*book/i,
  /appendix/i,
  /preamble/i,
  /general\s+info/i,
];

const filterModules = (modules: any[]): any[] => {
  if (!Array.isArray(modules)) return modules;
  return modules.filter((m) => {
    const name = (m.name || '').trim();
    // Must have a non-zero hour count (or hours not specified — keep it)
    if (typeof m.hoursPerModule === 'number' && m.hoursPerModule === 0) return false;
    // Must not match any administrative section pattern
    if (NON_MODULE_PATTERNS.some((re) => re.test(name))) return false;
    return true;
  });
};

export const parseSyllabusService = async (
  { rawText }: { rawText: string },
  ctx: Ctx,
) => {
  if (!rawText || rawText.trim().length < 50) throw new Error('Syllabus text too short');
  const prompt = buildSyllabusParserPrompt(rawText);
  const data = await callGemini({
    systemInstruction: { parts: [{ text: syllabusParserSystem }] },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  if (data.error || !data.candidates?.[0]) throw new Error('Syllabus parsing failed');
  const usage = data.usageMetadata || {};
  await logAiUsage({ action: 'parse-syllabus', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
  const parsed = parseJson(data.candidates[0].content.parts[0].text);
  // Post-process: strip any administrative sections mistakenly returned as modules
  if (parsed?.modules) {
    parsed.modules = filterModules(parsed.modules);
  }
  return {
    parsed,
    usage: { input: usage.promptTokenCount, output: usage.candidatesTokenCount },
  };
};
