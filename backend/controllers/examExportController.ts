/* eslint-disable */
// @ts-nocheck
/**
 * Exam Paper Export Controller.
 * Generates AI-powered exam papers and exports as .docx / .zip.
 */

import PizZip from 'pizzip';
import dotenv from 'dotenv';
dotenv.config();

import { logAiUsage } from '../utils/logAiUsage.js';
import { callGemini } from '../utils/gemini.js';
import { buildExamDocx } from '../utils/examDocxBuilder.js';
import { buildExamTheoryPrompt, buildExamNumericalPrompt } from '../prompts/examPrompts.js';

/** Parse Gemini JSON response — extract from object boundaries */
const parseGeminiJson = (text) => {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1) throw new Error('JSON not found in AI response');
  return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
};

/** Single Gemini AI call for exam generation — returns { json, usage } */
const callExamAI = async (promptText) => {
  const systemInstruction = `You are a strict Universal Academic Exam Specialist.
  YOUR ONLY JOB is to generate EXACTLY the requested JSON structure. No explanations, no markdown. Answer purely based on the context provided in the prompt.`;

  const data = await callGemini({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
  });

  if (data.error) throw new Error('AI generation failed');
  return {
    json: parseGeminiJson(data.candidates[0].content.parts[0].text),
    usage: {
      input: data.usageMetadata?.promptTokenCount || 0,
      output: data.usageMetadata?.candidatesTokenCount || 0,
    },
  };
};

export const exportTemplatedExam = async (req, res) => {
  try {
    const {
      course, examType, pattern, headerConfig, numSets = 1,
      division = 'A', generationMode = 'ai', numericalPrompt = '', pastNumericals = [],
    } = req.body;

    if (!pattern || pattern.length === 0) {
      return res.status(400).json({ error: 'No paper pattern found.' });
    }

    const {
      date, duration, maxMarks, scheme, academicYear, semester,
    } = headerConfig || { date: new Date().toLocaleDateString(), duration: '02.5 Hours', maxMarks: '60', scheme: 'III', academicYear: 'SY', semester: 'IV' };

    const regularExam = headerConfig?.regularExam || `${academicYear || 'SY'} Semester: ${semester || 'IV'}`;

    // Gather syllabus topics
    let topics = [];
    if (course.roadmap?.modules) {
      course.roadmap.modules.forEach(mod => topics.push(...mod.topics.map(t => t.title)));
    } else if (Array.isArray(course.roadmap)) {
      topics = course.roadmap.map(l => l.title);
    } else if (course.roadmap?.[division]) {
      topics = course.roadmap[division].map(l => l.title);
    } else if (course.modules) {
      topics = course.modules.map(m => m.name);
    }
    const topicsList = topics.join(', ');

    const looksLikeExample = numericalPrompt && (
      numericalPrompt.includes('?') || numericalPrompt.length > 50 ||
      numericalPrompt.includes('=') || numericalPrompt.includes('[') ||
      numericalPrompt.includes('adj') || numericalPrompt.includes('graph') ||
      numericalPrompt.includes('node') || /\d/.test(numericalPrompt)
    );

    // Build structure maps (theory vs numerical)
    let theoryStructureMap = {};
    let numericalStructureMap = {};
    let hasTheory = false;
    let hasNumerical = false;

    pattern.forEach((q) => {
      q.subs.forEach(sub => {
        const internalId = `Q${q.id}_${sub.id}`;
        const assignedCo = sub.co ? `CO${sub.co}` : 'Auto';
        const coInstruction = assignedCo === 'Auto'
          ? '[String: Determine the most logical Course Outcome (e.g., CO1, CO2, CO3) that aligns with this question]'
          : assignedCo;

        if (sub.isNumerical) {
          hasNumerical = true;
          numericalStructureMap[internalId] = {
            q: assignedCo === 'Auto'
              ? `[String: MANDATORY mathematical/numerical problem. EVERY numerical must require concrete calculation/algorithmic trace.]`
              : `[String: MANDATORY mathematical/numerical problem SPECIFICALLY addressing ${assignedCo}. EVERY numerical must require concrete calculation/algorithmic trace.]`,
            co: coInstruction,
          };
        } else {
          hasTheory = true;
          theoryStructureMap[internalId] = {
            q: assignedCo === 'Auto'
              ? `[String: Write a ${sub.marks}-mark THEORETICAL/CONCEPTUAL question testing ${sub.bt} concepts about the syllabus topics. Do NOT include calculations.]`
              : `[String: Write a ${sub.marks}-mark THEORETICAL/CONCEPTUAL question testing ${sub.bt} concepts SPECIFICALLY addressing ${assignedCo}. Do NOT include calculations.]`,
            co: coInstruction,
          };
        }
      });
    });

    const generatedBuffers = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (let s = 1; s <= numSets; s++) {
      let aiData = {};

      const bankList = course.question_bank || course.questionBank || course.active_exam || [];
      if (generationMode === 'bank' && bankList.length > 0) {
        // Bank mode — pick from bank, fall back to AI for misses
        let availableBank = [...bankList].sort(() => Math.random() - 0.5);
        let localTheoryMap = {};
        let localNumericalMap = {};
        let hasLocalTheory = false;
        let hasLocalNumerical = false;

        pattern.forEach(q => q.subs.forEach(sub => {
          const internalId = `Q${q.id}_${sub.id}`;
          const targetCo = sub.co ? `CO${sub.co}` : '';
          
          // 1. Try exact match (numerical flag + BT level + CO)
          let matchIndex = availableBank.findIndex(b =>
            Boolean(b.isNumerical) === Boolean(sub.isNumerical) &&
            (!sub.bt || (b.btLevel || '').includes(sub.bt || '')) &&
            (!targetCo || (b.courseOutcome || '').includes(targetCo) || targetCo === 'COAuto')
          );

          // 2. If no exact match, fallback to matching just numerical flag + BT level
          if (matchIndex === -1 && sub.bt) {
            matchIndex = availableBank.findIndex(b =>
              Boolean(b.isNumerical) === Boolean(sub.isNumerical) &&
              (b.btLevel || '').includes(sub.bt)
            );
          }

          // 3. If still no match, fallback to any question of the same type (numerical vs theory)
          if (matchIndex === -1) {
            matchIndex = availableBank.findIndex(b =>
              Boolean(b.isNumerical) === Boolean(sub.isNumerical)
            );
          }

          // 4. If still no match, pick ANY question from the bank
          if (matchIndex === -1 && availableBank.length > 0) {
            matchIndex = 0;
          }

          if (matchIndex !== -1) {
            const selectedQ = availableBank.splice(matchIndex, 1)[0];
            aiData[internalId] = { q: selectedQ.question, co: selectedQ.courseOutcome || (sub.co ? `CO${sub.co}` : 'CO1') };
          } else {
            if (sub.isNumerical) { hasLocalNumerical = true; localNumericalMap[internalId] = numericalStructureMap[internalId]; }
            else { hasLocalTheory = true; localTheoryMap[internalId] = theoryStructureMap[internalId]; }
          }
        }));

        const promises = [];
        let theoryIdx = -1; let numericalIdx = -1;
        if (hasLocalTheory) { theoryIdx = promises.length; promises.push(callExamAI(buildExamTheoryPrompt(localTheoryMap, s, topicsList))); }
        if (hasLocalNumerical) { numericalIdx = promises.length; promises.push(callExamAI(buildExamNumericalPrompt(localNumericalMap, s, numericalPrompt, looksLikeExample, pastNumericals))); }
        if (promises.length > 0) {
          const results = await Promise.all(promises);
          if (hasLocalTheory) { Object.assign(aiData, results[theoryIdx].json); totalInputTokens += results[theoryIdx].usage.input; totalOutputTokens += results[theoryIdx].usage.output; }
          if (hasLocalNumerical) { Object.assign(aiData, results[numericalIdx].json); totalInputTokens += results[numericalIdx].usage.input; totalOutputTokens += results[numericalIdx].usage.output; }
        }
      } else {
        // AI mode — generate all questions
        const promises = [];
        let theoryIdx = -1; let numericalIdx = -1;
        if (hasTheory) { theoryIdx = promises.length; promises.push(callExamAI(buildExamTheoryPrompt(theoryStructureMap, s, topicsList))); }
        if (hasNumerical) { numericalIdx = promises.length; promises.push(callExamAI(buildExamNumericalPrompt(numericalStructureMap, s, numericalPrompt, looksLikeExample, pastNumericals))); }
        const results = await Promise.all(promises);
        if (hasTheory) { Object.assign(aiData, results[theoryIdx].json); totalInputTokens += results[theoryIdx].usage.input; totalOutputTokens += results[theoryIdx].usage.output; }
        if (hasNumerical) { Object.assign(aiData, results[numericalIdx].json); totalInputTokens += results[numericalIdx].usage.input; totalOutputTokens += results[numericalIdx].usage.output; }
      }

      const buffer = await buildExamDocx({ course, date, duration, maxMarks, scheme, regularExam, pattern, aiData });
      generatedBuffers.push({ name: `${course.subjectName || 'Exam'}_${examType}_Set_${s}.docx`, buffer });
    }

    // Fire-and-forget usage log
    if (totalInputTokens > 0 || totalOutputTokens > 0) {
      logAiUsage({
        action: 'generate-exam-paper',
        teacherId: course?.teacherId || 'unknown',
        teacherEmail: course?.teacherEmail || '',
        teacherName: course?.teacherName || course?.taughtBy || 'Unknown',
        courseId: course?.id || '',
        subjectName: course?.subjectName || 'Subject',
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      }).catch(err => console.error('Exam log error:', err));
    }

    if (numSets === 1) {
      res.setHeader('Content-Disposition', `attachment; filename="${generatedBuffers[0].name}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      return res.send(generatedBuffers[0].buffer);
    } else {
      const masterZip = new PizZip();
      generatedBuffers.forEach(b => masterZip.file(b.name, b.buffer.toString('binary'), { binary: true }));
      const zipBuffer = masterZip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
      res.setHeader('Content-Disposition', `attachment; filename="${course.subjectName || 'Exam'}_${examType}_Batch.zip"`);
      res.setHeader('Content-Type', 'application/zip');
      return res.send(zipBuffer);
    }

  } catch (error) {
    console.error('Exam Export Error:', error);
    res.status(500).json({ error: 'Failed to generate exam paper.' });
  }
};

