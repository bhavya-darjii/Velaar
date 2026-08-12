import dotenv from 'dotenv';
dotenv.config();

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

export const generateTimetable = async (req, res) => {
  const {
    department = '',
    teachers = [],
    rooms = [],
    constraints = {},
    workingDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    slotsPerDay = 6,
  } = req.body;

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

    if (data.error) return res.status(500).json({ error: data.error.message });
    const result = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());
    return res.status(200).json(result);
  } catch (error) {
    console.error('Timetable Error:', error);
    return res.status(500).json({ error: 'Timetable generation failed' });
  }
};
