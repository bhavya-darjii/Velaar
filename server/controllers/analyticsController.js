import dotenv from 'dotenv';
dotenv.config();

import { logAiUsage } from '../utils/logAiUsage.js';

const API_KEY = process.env.GOOGLE_API_KEY;

const callGemini = async (bodyPayload) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });
  return response.json();
};

const getCtx = (req) => ({
  teacherId: req.body.teacherId || req.body.userId || 'unknown',
  teacherEmail: req.body.teacherEmail || req.body.userEmail || '',
  teacherName: req.body.teacherName || req.body.userName || '',
  courseId: req.body.courseId || '',
  subjectName: req.body.subjectName || '',
});

export const calculateCoAttainment = async (req, res) => {
  const { marksData = [], courseOutcomes = [], threshold = 60 } = req.body;
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
    });

    if (data.error) return res.status(500).json({ error: data.error.message });
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }
    const textResult = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(textResult.replace(/```json/g, '').replace(/```/g, '').trim());

    await logAiUsage({
      action: 'co-attainment',
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      ...ctx,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('CO Attainment Error:', error);
    return res.status(500).json({ error: 'CO Attainment calculation failed' });
  }
};

export const predictStudentRisk = async (req, res) => {
  const { students = [] } = req.body;
  const ctx = getCtx(req);

  const prompt = `
    Role: Academic Risk Analyst for engineering colleges.
    Task: Analyze student data and predict at-risk students BEFORE they fail.

    Student Data: ${JSON.stringify(students).substring(0, 25000)}

    For each student, compute a Risk Score (0-100, higher = more at risk) based on:
    - Attendance patterns (consecutive absences weighted heavily)
    - Marks trends (TT1 vs TT2 decline)
    - Engagement indicators

    Return ONLY valid JSON:
    {
      "students": [{
        "studentId": "id",
        "studentName": "name",
        "riskScore": 75,
        "factors": ["Missed 5 consecutive lectures", "TT1 score below 40%"],
        "intervention": "Recommend tutorial sessions for Module 3"
      }],
      "departmentSummary": "Brief overview",
      "highRiskCount": 3
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    if (data.error) return res.status(500).json({ error: data.error.message });
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }
    const textResult = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(textResult.replace(/```json/g, '').replace(/```/g, '').trim());

    await logAiUsage({
      action: 'student-risk',
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      ...ctx,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Student Risk Error:', error);
    return res.status(500).json({ error: 'Student risk prediction failed' });
  }
};

export const analyzeFeedback = async (req, res) => {
  const { feedbackResponses = [] } = req.body;

  const prompt = `
    Role: NLP Analyst for student feedback in engineering education.
    Analyze these feedback responses and extract themes, sentiment, and actionable insights.

    Feedback: ${JSON.stringify(feedbackResponses).substring(0, 25000)}

    Return ONLY valid JSON:
    {
      "overallSentiment": "positive|neutral|negative",
      "sentimentScore": 72,
      "themes": [{ "theme": "Lab equipment", "count": 12, "sentiment": "negative", "examples": ["..."] }],
      "teacherRankings": [{ "teacherName": "...", "score": 4.2, "strengths": ["..."], "improvements": ["..."] }],
      "recommendations": ["..."]
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    if (data.error) return res.status(500).json({ error: data.error.message });
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }
    const textResult = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(textResult.replace(/```json/g, '').replace(/```/g, '').trim());
    return res.status(200).json(result);
  } catch (error) {
    console.error('Feedback Analysis Error:', error);
    return res.status(500).json({ error: 'Feedback analysis failed' });
  }
};

export const generateAccreditationReport = async (req, res) => {
  const { institutionData = {}, reportType = 'SAR' } = req.body;

  const prompt = `
    Role: NBA/NAAC Accreditation Report Writer.
    Generate a ${reportType} draft section based on institutional data.

    Data: ${JSON.stringify(institutionData).substring(0, 20000)}

    Return ONLY valid JSON:
    {
      "reportType": "${reportType}",
      "sections": [{ "title": "...", "content": "..." }],
      "strengths": ["..."],
      "weaknesses": ["..."],
      "actionPlan": [{ "action": "...", "owner": "...", "deadline": "..." }]
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    if (data.error) return res.status(500).json({ error: data.error.message });
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }
    const textResult = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(textResult.replace(/```json/g, '').replace(/```/g, '').trim());
    return res.status(200).json(result);
  } catch (error) {
    console.error('Accreditation Report Error:', error);
    return res.status(500).json({ error: 'Accreditation report generation failed' });
  }
};
