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

export const generateNotice = async (req, res) => {
  const { idea = '', template = 'general', language = 'English', collegeName = 'Engineering College' } = req.body;

  const prompt = `
    Role: College Administration Officer.
    Draft a formal college notice/circular.

    College: ${collegeName}
    Template type: ${template}
    Language: ${language}
    Rough idea: ${idea}

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

    if (data.error) return res.status(500).json({ error: data.error.message });
    const result = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());
    return res.status(200).json(result);
  } catch (error) {
    console.error('Notice Error:', error);
    return res.status(500).json({ error: 'Notice generation failed' });
  }
};

export const generateMeetingMinutes = async (req, res) => {
  const { notes = '', department = '', date = new Date().toISOString().split('T')[0] } = req.body;

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

    if (data.error) return res.status(500).json({ error: data.error.message });
    const result = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());
    return res.status(200).json(result);
  } catch (error) {
    console.error('MoM Error:', error);
    return res.status(500).json({ error: 'Meeting minutes generation failed' });
  }
};
