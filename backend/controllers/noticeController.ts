import { Request, Response } from 'express';
import { callGemini as callGeminiPool } from '../utils/gemini.js';

type GeminiResponse = {
  error?: { message: string };
  candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

const callGemini = (payload: Record<string, unknown>) => callGeminiPool(payload) as Promise<GeminiResponse>;

export const generateNotice = async (req: Request, res: Response): Promise<void> => {
  const {
    idea = '', template = 'general',
    language = 'English', collegeName = 'Engineering College',
  } = req.body as { idea?: string; template?: string; language?: string; collegeName?: string };

  const prompt = `
    Role: College Administration Officer.
    Draft a formal college notice/circular.

    College: ${collegeName}
    Template type: ${template}
    Language: ${language}
    Rough idea: ${idea.substring(0, 5000)}

    Include reference number placeholder, proper salutation, body, and signature block.

    Return ONLY valid JSON:
    {
      "title": "...",
      "referenceNo": "VELAAR/2025/...",
      "body": "Full notice text with proper formatting",
      "audience": ["students", "teachers"],
      "hindiTranslation": "..."
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    if (data.error) { res.status(500).json({ error: 'Notice generation failed' }); return; }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const result = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    res.status(200).json(result);
  } catch (err) {
    console.error('[noticeController] generateNotice error:', err);
    res.status(500).json({ error: 'Notice generation failed' });
  }
};

export const generateMeetingMinutes = async (req: Request, res: Response): Promise<void> => {
  const {
    notes = '', department = '',
    date = new Date().toISOString().split('T')[0],
  } = req.body as { notes?: string; department?: string; date?: string };

  const prompt = `
    Role: Department Meeting Secretary.
    Generate structured Minutes of Meeting from these notes.

    Department: ${department}
    Date: ${date}
    Notes: ${notes.substring(0, 15000)}

    Return ONLY valid JSON:
    {
      "title": "...",
      "date": "${date}",
      "attendees": ["..."],
      "agenda": [{ "item": "...", "discussion": "..." }],
      "actionItems": [{ "action": "...", "owner": "...", "deadline": "..." }],
      "nextMeeting": "..."
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    if (data.error) { res.status(500).json({ error: 'Meeting minutes generation failed' }); return; }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const result = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    res.status(200).json(result);
  } catch (err) {
    console.error('[noticeController] generateMeetingMinutes error:', err);
    res.status(500).json({ error: 'Meeting minutes generation failed' });
  }
};
