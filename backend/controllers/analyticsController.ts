import { Request, Response } from 'express';
import { callGemini } from '../utils/gemini.js';
import { logAiUsage } from '../utils/logAiUsage.js';

interface GeminiResponse {
  error?: { message: string };
  candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

interface TeacherCtx {
  teacherId: string;
  teacherEmail: string;
  teacherName: string;
  courseId: string;
  subjectName: string;
}

/**
 * Extract teacher context from the VERIFIED JWT user only.
 * Never trust body fields for identity — prevents teacher ID spoofing.
 */
const getCtx = (req: Request): TeacherCtx => ({
  teacherId:    req.user?.id ?? 'unknown',
  teacherEmail: req.user?.email ?? '',
  teacherName:  '',
  courseId:     typeof req.body.courseId === 'string' ? req.body.courseId : '',
  subjectName:  typeof req.body.subjectName === 'string' ? req.body.subjectName : '',
});

const parseGeminiText = (data: GeminiResponse): string => {
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from AI');
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const getUsage = (data: GeminiResponse) => ({
  inputTokens:  data?.usageMetadata?.promptTokenCount  ?? 0,
  outputTokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
});

export const calculateCoAttainment = async (req: Request, res: Response): Promise<void> => {
  const { marksData = [], courseOutcomes = [], threshold = 60 } = req.body as {
    marksData?: unknown[]; courseOutcomes?: unknown[]; threshold?: number;
  };
  const ctx = getCtx(req);

  const prompt = `
    Role: NBA/NAAC Accreditation Expert for Engineering Colleges in India.
    Task: Calculate Course Outcome (CO) attainment from marks data.

    Course Outcomes: ${JSON.stringify(courseOutcomes)}
    Student Marks Data (with CO mapping): ${JSON.stringify(marksData).substring(0, 25000)}
    Attainment Threshold: ${threshold}% of students must meet target marks.

    For each CO, calculate:
    1. Direct attainment percentage (0-100)
    2. Number of students above threshold
    3. Gap analysis if below 60% target
    4. Suggested improvement actions

    Return ONLY valid JSON:
    {
      "coResults": [{ "co": "CO1", "attainment": 72, "studentsAboveThreshold": 28, "totalStudents": 40, "status": "attained|gap", "gapAnalysis": "...", "suggestions": ["..."] }],
      "overallAttainment": 68,
      "nbaReady": true,
      "summary": "Brief executive summary"
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }) as GeminiResponse;

    const result = JSON.parse(parseGeminiText(data));
    await logAiUsage({ action: 'co-attainment', ...getUsage(data), ...ctx });
    res.status(200).json(result);
  } catch (err) {
    console.error('[analyticsController] calculateCoAttainment error:', err);
    res.status(500).json({ error: 'CO attainment calculation failed' });
  }
};

export const predictStudentRisk = async (req: Request, res: Response): Promise<void> => {
  const { students = [], courseData = {} } = req.body as { students?: unknown[]; courseData?: unknown };
  const ctx = getCtx(req);

  const prompt = `
    Role: Educational Data Analyst specializing in student performance prediction.
    Analyze student data and identify at-risk students.

    Student Data: ${JSON.stringify(students).substring(0, 30000)}
    Course Context: ${JSON.stringify(courseData)}

    For each student assess:
    1. Risk level: high/medium/low
    2. Risk factors (attendance, marks, engagement)
    3. Specific intervention recommendations

    Return ONLY valid JSON:
    {
      "riskSummary": { "high": 5, "medium": 10, "low": 25 },
      "students": [{ "id": "...", "name": "...", "riskLevel": "high", "riskScore": 85, "factors": ["..."], "interventions": ["..."] }],
      "classInsights": "Overall class health summary"
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }) as GeminiResponse;

    const result = JSON.parse(parseGeminiText(data));
    await logAiUsage({ action: 'student-risk', ...getUsage(data), ...ctx });
    res.status(200).json(result);
  } catch (err) {
    console.error('[analyticsController] predictStudentRisk error:', err);
    res.status(500).json({ error: 'Risk prediction failed' });
  }
};

export const analyzeFeedback = async (req: Request, res: Response): Promise<void> => {
  const { feedback = [], subject = '' } = req.body as { feedback?: string[]; subject?: string };
  const ctx = getCtx(req);

  const prompt = `
    Role: Educational Quality Analyst.
    Analyze student feedback responses for a college subject.

    Subject: ${subject}
    Feedback Responses: ${JSON.stringify(feedback).substring(0, 20000)}

    Provide:
    1. Sentiment analysis (positive/negative/neutral percentages)
    2. Top themes mentioned
    3. Common complaints and praise
    4. Actionable improvement suggestions

    Return ONLY valid JSON:
    {
      "sentiment": { "positive": 65, "neutral": 20, "negative": 15 },
      "themes": [{ "theme": "...", "frequency": 12, "sentiment": "positive" }],
      "topPraise": ["..."],
      "topComplaints": ["..."],
      "recommendations": ["..."],
      "overallScore": 7.2
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }) as GeminiResponse;

    const result = JSON.parse(parseGeminiText(data));
    await logAiUsage({ action: 'feedback-analysis', ...getUsage(data), ...ctx });
    res.status(200).json(result);
  } catch (err) {
    console.error('[analyticsController] analyzeFeedback error:', err);
    res.status(500).json({ error: 'Feedback analysis failed' });
  }
};

export const generateAccreditationReport = async (req: Request, res: Response): Promise<void> => {
  const { institutionData = {}, accreditationType = 'NBA' } = req.body as {
    institutionData?: unknown; accreditationType?: string;
  };
  const ctx = getCtx(req);

  const prompt = `
    Role: ${accreditationType} Accreditation Consultant for Indian Engineering Colleges.
    Generate a comprehensive accreditation readiness report.

    Institution Data: ${JSON.stringify(institutionData).substring(0, 20000)}
    Accreditation Type: ${accreditationType}

    Evaluate all criteria and provide:
    1. Score for each criterion
    2. Gaps and missing evidence
    3. Priority action items
    4. Timeline recommendations

    Return ONLY valid JSON:
    {
      "accreditationType": "${accreditationType}",
      "overallReadiness": 72,
      "criteria": [{ "name": "...", "score": 75, "maxScore": 100, "gaps": ["..."], "evidence": ["..."] }],
      "priorityActions": [{ "action": "...", "timeline": "1 month", "impact": "high" }],
      "summary": "Executive summary"
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }) as GeminiResponse;

    const result = JSON.parse(parseGeminiText(data));
    await logAiUsage({ action: 'accreditation-report', ...getUsage(data), ...ctx });
    res.status(200).json(result);
  } catch (err) {
    console.error('[analyticsController] generateAccreditationReport error:', err);
    res.status(500).json({ error: 'Accreditation report generation failed' });
  }
};
