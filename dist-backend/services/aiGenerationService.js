/* eslint-disable */
// @ts-nocheck
/**
 * AI Generation Service.
 * Business logic layer: builds prompts, calls Gemini, parses responses, logs usage.
 * Controllers call these — they never touch callGemini or logAiUsage directly.
 */
import { callGemini } from '../utils/gemini.js';
import { logAiUsage } from '../utils/logAiUsage.js';
import { buildRoadmapPrompt, roadmapSystem, buildTheoryQuestionsPrompt, theoryQuestionsSystem, buildNumericalQuestionsPrompt, numericalQuestionsSystem, buildSyllabusQuestionsPrompt, buildGradeExamPrompt, buildLessonPlanPrompt, buildSpecificFieldPrompt, buildSupplementaryPlanPrompt, buildDayWiseEnrichmentPrompt, buildCoPoMappingPrompt, buildCopilotSystemPrompt, copilotIntentSystem, buildPresentationPrompt, presentationSystem, } from '../prompts/aiPrompts.js';
/** Shared: parse JSON from Gemini text response */
const parseJson = (text) => {
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
};
/** Shared: parse JSON array robustly (handles wrapped objects) */
const parseJsonArray = (text) => {
    const match = text.match(/\[[\s\S]*\]/);
    if (match)
        return JSON.parse(match[0]);
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
        const parsed = JSON.parse(objMatch[0]);
        if (Array.isArray(parsed))
            return parsed;
        if (parsed.questions && Array.isArray(parsed.questions))
            return parsed.questions;
        if (parsed.data && Array.isArray(parsed.data))
            return parsed.data;
        return [parsed];
    }
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
};
// --- Roadmap ---------------------------------------------------------
export const generateRoadmapService = async ({ syllabusText, totalLectures, acceptedModules }, ctx) => {
    const prompt = buildRoadmapPrompt(syllabusText, totalLectures, acceptedModules);
    const data = await callGemini({
        // roadmapSystem is cached by Gemini — static rules not re-billed on repeat calls.
        systemInstruction: { parts: [{ text: roadmapSystem }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
    });
    if (data.error || !data.candidates?.[0])
        throw new Error('AI generation failed');
    const usage = data.usageMetadata || {};
    await logAiUsage({ action: 'generate-roadmap', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
    return {
        roadmap: parseJson(data.candidates[0].content.parts[0].text),
        usage: { input: usage.promptTokenCount, output: usage.candidatesTokenCount },
    };
};
// --- Q-estions from topics ---------------------------------------------------------
export const generateQuestionsFromTopicsService = async ({ completedTopics, examLength, btPreferences = [], numericalCount = 0, numericalPrompt = '', pastNumericals = [], }, ctx) => {
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
        if (data.error)
            throw new Error(data.error.message || 'Gemini API Error');
        if (!data.candidates?.[0])
            throw new Error(data.promptFeedback?.blockReason ? `Blocked: ${data.promptFeedback.blockReason}` : 'No AI response');
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
        if (Array.isArray(fetched))
            numericalQuestions = fetched.map(q => ({ ...q, isNumerical: true }));
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
// --- Q-estions from syllab-s ---------------------------------------------------------
export const generateQuestionsFromSyllabusService = async ({ syllabus, examLength }, ctx) => {
    const poolSize = Math.max(examLength * 5, 20);
    const data = await callGemini({
        contents: [{ parts: [{ text: buildSyllabusQuestionsPrompt(syllabus, poolSize) }] }],
        generationConfig: { responseMimeType: 'application/json' },
    });
    const usage = data.usageMetadata || {};
    await logAiUsage({ action: 'generate-questions-syllabus', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
    if (data.error || !data.candidates)
        return [];
    return parseJson(data.candidates[0].content.parts[0].text);
};
// --- 4. Grade exam ---------------------------------------------------------
export const gradeExamService = async ({ syllabus, examData }, ctx) => {
    const data = await callGemini({
        contents: [{ parts: [{ text: buildGradeExamPrompt(syllabus, examData) }] }],
        generationConfig: { responseMimeType: 'application/json' },
    });
    const usage = data.usageMetadata || {};
    await logAiUsage({ action: 'grade-exam', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
    if (data.error || !data.candidates)
        return { score: 0, feedback: 'AI Grading failed.' };
    const result = parseJson(data.candidates[0].content.parts[0].text);
    if (result.score > 10)
        result.score = 10;
    return result;
};
// --- Lesson plan ---------------------------------------------------------
export const generateLessonPlanService = async ({ subjectName, modules }, ctx) => {
    const moduleNames = modules.map(m => m.name || `Unit ${m.id}`).join(', ');
    const moduleTexts = modules.map(m => `Unit ${m.id}: ${m.name}\n${m.extractedText || ''}`).join('\n\n');
    const data = await callGemini({
        contents: [{ parts: [{ text: buildLessonPlanPrompt(subjectName, moduleNames, moduleTexts) }] }],
        generationConfig: { responseMimeType: 'application/json' },
    });
    const usage = data.usageMetadata || {};
    await logAiUsage({ action: 'generate-lesson-plan', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx, subjectName: subjectName || ctx.subjectName });
    if (data.error || !data.candidates?.[0])
        throw new Error('Lesson plan generation failed');
    return parseJson(data.candidates[0].content.parts[0].text);
};
// --- 6. Specific field ---------------------------------------------------------
export const generateSpecificFieldService = async ({ type, subjectName, modules }, ctx) => {
    const prompt = buildSpecificFieldPrompt(type, subjectName, modules);
    const data = await callGemini({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
    });
    const usage = data.usageMetadata || {};
    await logAiUsage({ action: 'generate-specific-field', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx, subjectName: subjectName || ctx.subjectName });
    if (!data.candidates?.[0])
        throw new Error('Specific field generation failed');
    const result = parseJson(data.candidates[0].content.parts[0].text);
    return type === 'unit' ? result : result.result;
};
// --- 7. S-pplementary plan ---------------------------------------------------------
export const generateSupplementaryPlanService = async ({ subjectName, modules }, ctx) => {
    const moduleNames = modules.map((m, i) => `Module ${i + 1}: ${m.name}`).join('\\n');
    const moduleTexts = modules.map(m => `Unit ${m.id}: ${m.name}\\n${m.extractedText || ''}`).join('\\n\\n');
    const data = await callGemini({
        contents: [{ parts: [{ text: buildSupplementaryPlanPrompt(subjectName, modules, moduleNames, moduleTexts) }] }],
        generationConfig: { responseMimeType: 'application/json' },
    });
    const usage = data.usageMetadata || {};
    await logAiUsage({ action: 'generate-supplementary-plan', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx, subjectName: subjectName || ctx.subjectName });
    if (!data.candidates?.[0])
        throw new Error('Supplementary plan generation failed');
    return parseJson(data.candidates[0].content.parts[0].text);
};
// --- 8. Day-wise enrichment ---------------------------------------------------------
export const generateDayWiseEnrichmentService = async ({ subjectName, roadmapTitles, textBooks = [], refBooks = [] }, ctx) => {
    const topicsList = roadmapTitles.map((t, i) => `${i + 1}. ${t}`).join('\\n');
    const allBooks = [...textBooks, ...refBooks].map((b, i) => `B${i + 1}: ${b}`).join('\\n');
    const data = await callGemini({
        contents: [{ parts: [{ text: buildDayWiseEnrichmentPrompt(subjectName, topicsList, allBooks, roadmapTitles.length) }] }],
        generationConfig: { responseMimeType: 'application/json' },
    });
    const usage = data.usageMetadata || {};
    await logAiUsage({ action: 'generate-day-wise-enrichment', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx, subjectName: subjectName || ctx.subjectName });
    if (!data.candidates?.[0])
        throw new Error('Enrichment generation failed');
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    return result.enrichment;
};
// --- 9. CO-PO mapping ---------------------------------------------------------
export const generateCoPoMappingService = async ({ courseOutcomes, programOutcomes }, ctx) => {
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
    if (!data.candidates?.[0])
        throw new Error('CO-PO mapping failed');
    const result = parseJson(data.candidates[0].content.parts[0].text);
    return result.mapping;
};
// --- Copilot chat ---------------------------------------------------------
export const copilotChatService = async ({ messages, userRole = 'teacher', pagePath = '', pageLabel = '', pageContext = {} }, ctx) => {
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
    if (data.error || !data.candidates?.[0])
        throw new Error('Copilot generation failed');
    return { reply: data.candidates[0].content.parts[0].text };
};
// --- Copilot intent ---------------------------------------------------------
export const classifyIntentService = async ({ prompt, context }, ctx) => {
    const data = await callGemini({
        systemInstruction: { parts: [{ text: copilotIntentSystem }] },
        contents: [{ parts: [{ text: `User text: "${prompt}"\nCourse Context: ${JSON.stringify(context)}` }] }],
        generationConfig: { responseMimeType: 'application/json' },
    });
    const usage = data.usageMetadata || {};
    await logAiUsage({ action: 'classify-intent', inputTokens: usage.promptTokenCount || 0, outputTokens: usage.candidatesTokenCount || 0, ...ctx });
    if (data.error || !data.candidates?.[0])
        throw new Error('Intent classification failed');
    return parseJson(data.candidates[0].content.parts[0].text);
};
// --- Lect-re presentation ---------------------------------------------------------
export const generatePresentationService = async ({ subjectName, lecture, overview, course }, ctx) => {
    const prompt = buildPresentationPrompt(subjectName, lecture, overview, course);
    const data = await callGemini({
        // presentationSystem goes into systemInstruction — Gemini implicitly caches this
        // across repeated calls, so the large static rules are not re-charged every click.
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
