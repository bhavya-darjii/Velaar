const API_KEY = import.meta.env.GOOGLE_API_KEY;

export const gradeStudentAnswer = async (syllabus, question, studentAnswer) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;

  const prompt = `
    You are 'Velaar', an AI teaching assistant. 
    
    CONTEXT (SYLLABUS): "${syllabus}"
    QUESTION: "${question}"
    STUDENT ANSWER: "${studentAnswer}"

    TASK:
    1. Grade the answer on a scale of 0 to 10.
    2. Provide constructive feedback (max 2 sentences).
    3. Flag if the answer seems suspicious.

    OUTPUT FORMAT:
    Return ONLY a raw JSON object with these fields:
    { "score": number, "feedback": "string", "is_suspicious": boolean }
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("API Error:", data.error);
      alert(`Error: ${data.error.message}`);
      return null;
    }

    if (!data.candidates || data.candidates.length === 0) return null;

    const textResult = data.candidates[0].content.parts[0].text;
    const cleanJson = textResult.replace(/```json|```/g, '').trim();
    
    const rawObject = JSON.parse(cleanJson);

    // --- THE FIX: HANDLE MISSING LABELS ---
    // Sometimes AI calls it 'Feedback' (Capital F) or 'explanation'
    // We explicitly look for ANY of these and save it as 'feedback'
    const normalizedResult = {
      score: rawObject.score,
      feedback: rawObject.feedback || rawObject.Feedback || rawObject.explanation || rawObject.comment || "No feedback provided.",
      is_suspicious: rawObject.is_suspicious || rawObject.suspicious || false
    };

    console.log("AI Response:", normalizedResult); // Check your Console (F12) to see this!
    return normalizedResult;

  } catch (error) {
    console.error("Parsing Error:", error);
    alert("Error reading AI response. Check console.");
    return null;
  }
};