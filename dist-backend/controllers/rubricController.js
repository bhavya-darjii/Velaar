import { logAiUsage } from '../utils/logAiUsage.js';
import { callGemini } from '../utils/gemini.js';
/**
 * Read identity from JWT-verified user only — never from req.body.
 */
const getCtx = (req) => ({
    teacherId: req.user?.id ?? 'unknown',
    teacherEmail: req.user?.email ?? '',
    teacherName: '',
    courseId: typeof req.body.courseId === 'string' ? req.body.courseId : '',
    subjectName: typeof req.body.subjectName === 'string' ? req.body.subjectName : '',
});
const parseText = (data) => {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text)
        throw new Error('Empty response from AI');
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};
const getUsage = (data) => ({
    inputTokens: data?.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
});
export const generateRubric = async (req, res) => {
    const { questionPaper = '', examTitle = '', totalMarks = 100, } = req.body;
    const ctx = getCtx(req);
    const prompt = `
    Role: University Examination Moderator.
    Generate a detailed marking rubric for this question paper.

    Exam: ${examTitle}
    Total Marks: ${totalMarks}
    Question Paper:
    ${questionPaper.substring(0, 20000)}

    For each sub-question provide:
    - Step-by-step marks allocation
    - Common mistakes to watch for
    - Partial marking guidelines

    Return ONLY valid JSON:
    {
      "examTitle": "${examTitle}",
      "totalMarks": ${totalMarks},
      "rubrics": [{
        "questionNum": "1a",
        "maxMarks": 5,
        "steps": [{ "criterion": "...", "marks": 2 }],
        "commonMistakes": ["..."],
        "partialMarking": "..."
      }],
      "moderatorNotes": "..."
    }
  `;
    try {
        const data = await callGemini({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
        });
        const result = JSON.parse(parseText(data));
        await logAiUsage({ action: 'generate-rubric', ...getUsage(data), ...ctx });
        res.status(200).json(result);
    }
    catch (err) {
        console.error('[rubricController] generateRubric error:', err);
        res.status(500).json({ error: 'Rubric generation failed' });
    }
};
export const evaluateAnswerScript = async (req, res) => {
    const { questionPaper = '', rubric = '', answerImages = [], studentName = 'Student', } = req.body;
    const ctx = getCtx(req);
    const parts = [{ text: `
    Role: Expert Exam Evaluator for engineering colleges.
    Grade this student's answer script against the question paper and rubric.

    Student: ${studentName}
    Question Paper: ${questionPaper.substring(0, 8000)}
    Marking Rubric: ${JSON.stringify(rubric).substring(0, 8000)}

    Analyze the attached answer script images. For each question:
    - Assign marks with justification
    - Map to relevant COs
    - Flag areas needing teacher review

    Return ONLY valid JSON:
    {
      "studentName": "${studentName}",
      "totalMarks": 0,
      "maxMarks": 100,
      "questionGrades": [{ "questionNum": "1", "marksAwarded": 4, "maxMarks": 5, "coMapping": "CO1", "feedback": "...", "needsReview": false }],
      "overallFeedback": "...",
      "confidenceScore": 85
    }
  ` }];
    for (const img of answerImages.slice(0, 10)) {
        if (img.base64 && img.mimeType) {
            parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64.replace(/^data:[^;]+;base64,/, '') } });
        }
    }
    try {
        const data = await callGemini({ contents: [{ parts }] });
        const result = JSON.parse(parseText(data));
        await logAiUsage({ action: 'evaluate-answer-script', ...getUsage(data), ...ctx });
        res.status(200).json(result);
    }
    catch (err) {
        console.error('[rubricController] evaluateAnswerScript error:', err);
        res.status(500).json({ error: 'Answer script evaluation failed' });
    }
};
export const generateStudyMaterial = async (req, res) => {
    const { subjectName = '', syllabusTopics = [], weakCOs = [], mode = 'exam-ready', } = req.body;
    const ctx = getCtx(req);
    const prompt = `
    Role: Engineering Study Material Author.
    Mode: ${mode === 'eli5' ? "Explain Like I'm 5 — simple analogies" : 'Exam-ready — concise, formula-heavy'}

    Subject: ${subjectName}
    Topics: ${JSON.stringify(syllabusTopics)}
    Weak COs to target: ${JSON.stringify(weakCOs)}

    Return ONLY valid JSON:
    {
      "subjectName": "${subjectName}",
      "mode": "${mode}",
      "sections": [{ "title": "...", "content": "...", "keyFormulas": ["..."], "coTags": ["CO1"] }],
      "practiceQuestions": [{ "question": "...", "co": "CO1", "difficulty": "medium" }],
      "flashcards": [{ "front": "...", "back": "..." }]
    }
  `;
    try {
        const data = await callGemini({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
        });
        const result = JSON.parse(parseText(data));
        await logAiUsage({ action: 'generate-study-material', ...getUsage(data), ...ctx });
        res.status(200).json(result);
    }
    catch (err) {
        console.error('[rubricController] generateStudyMaterial error:', err);
        res.status(500).json({ error: 'Study material generation failed' });
    }
};
export const generateLabManual = async (req, res) => {
    const { experiments = [], subjectName = '', } = req.body;
    const ctx = getCtx(req);
    const prompt = `
    Role: Engineering Lab Manual Author.
    Subject: ${subjectName}
    Experiments: ${JSON.stringify(experiments)}

    For each experiment generate: Aim, Theory, Procedure, Sample Code (if applicable), Expected Output, Viva Questions, Assessment Rubric.

    Return ONLY valid JSON:
    {
      "subjectName": "${subjectName}",
      "experiments": [{
        "title": "...",
        "aim": "...",
        "theory": "...",
        "procedure": ["..."],
        "sampleCode": "...",
        "expectedOutput": "...",
        "vivaQuestions": ["..."],
        "rubric": [{ "criterion": "...", "marks": 5 }]
      }]
    }
  `;
    try {
        const data = await callGemini({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
        });
        const result = JSON.parse(parseText(data));
        await logAiUsage({ action: 'generate-lab-manual', ...getUsage(data), ...ctx });
        res.status(200).json(result);
    }
    catch (err) {
        console.error('[rubricController] generateLabManual error:', err);
        res.status(500).json({ error: 'Lab manual generation failed' });
    }
};
