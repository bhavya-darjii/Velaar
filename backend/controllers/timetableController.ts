import { Request, Response } from 'express';
import { callGemini as callGeminiPool } from '../utils/gemini.js';

type GeminiResponse = {
  error?: { message: string };
  candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
};

const callGemini = (payload: Record<string, unknown>) => callGeminiPool(payload) as Promise<GeminiResponse>;

export const generateTimetable = async (req: Request, res: Response): Promise<void> => {
  const {
    department = '',
    teachers = [],
    rooms = [],
    constraints = {},
    workingDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    slotsPerDay = 6,
  } = req.body as {
    department?: string;
    teachers?: unknown[];
    rooms?: unknown[];
    constraints?: unknown;
    workingDays?: string[];
    slotsPerDay?: number;
  };

  const prompt = `
    Role: College Timetable Scheduler.
    Generate a conflict-free weekly timetable.

    Department: ${department}
    Teachers: ${JSON.stringify(teachers).substring(0, 8000)}
    Rooms: ${JSON.stringify(rooms).substring(0, 4000)}
    Constraints: ${JSON.stringify(constraints)}
    Working Days: ${workingDays.join(', ')}
    Slots per day: ${slotsPerDay}

    Avoid: back-to-back overload, room double-booking, teacher clashes.
    Include break periods.

    Return ONLY valid JSON:
    {
      "department": "${department}",
      "schedule": [{
        "day": "Mon",
        "slots": [{ "time": "9:00-10:00", "subject": "...", "teacher": "...", "room": "...", "type": "lecture|lab" }]
      }],
      "conflicts": [],
      "warnings": ["..."]
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    if (data.error) { res.status(500).json({ error: 'Timetable generation failed' }); return; }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const result = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    res.status(200).json(result);
  } catch (err) {
    console.error('[timetableController] generateTimetable error:', err);
    res.status(500).json({ error: 'Timetable generation failed' });
  }
};
