const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// --- 1. ROADMAP GENERATOR (Splits Syllabus into Lectures across Modules) ---
export const generateLectureRoadmap = async (syllabusText, totalLectures, acceptedModules) => {
  // SAFETY CHECK: If text is missing or too short, stop immediately.
  if (!syllabusText || syllabusText.length < 50) {
    console.error("Syllabus text is empty or too short!");
    return { roadmap: [], usage: null };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const prompt = `
    Role: Academic Curriculum Planner.
    Task: You are critically required to break the entire provided syllabus EXACTLY into ${totalLectures} scheduled lectures.
    
    CRITICAL INSTRUCTIONS: 
    1. Base your roadmap STRICTLY on the provided text. Cover absolutely ALL modules provided in chronological order.
    2. You MUST generate EXACTLY ${totalLectures} lectures. No more, no less.
    3. If there are fewer lectures than modules, you MUST seamlessly combine multiple modules or topics into single lectures to safely compress and accommodate all content. Do not omit any core topics.
    4. Keep track of which module each lecture belongs to. You MUST select the "moduleName" EXACTLY from this provided list of accepted module names: [${acceptedModules}]. Do not abbreviate or invent names. If multiple topics are grouped into one lecture, designate the primary one.
    5. Do NOT hallucinate topics not present in the text.
    
    Syllabus Text: 
    "${syllabusText.substring(0, 30000)}" 
    
    Output Format: return ONLY a raw JSON array of objects matching this schema:
    [
      {
        "lectureNum": 1,
        "moduleName": "e.g., Exactly matching the accepted string",
        "title": "Topic Name",
        "description": "Brief summary.",
        "checklist": ["Point 1", "Point 2", "Point 3"]
      }
    ]
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" } // Forces pure JSON output
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Gemini Error:", data.error.message);
      return { roadmap: [], usage: null };
    }

    if (!data.candidates || !data.candidates[0]) {
      return { roadmap: [], usage: null };
    }

    const textResult = data.candidates[0].content.parts[0].text;
    const usage = data.usageMetadata;

    return {
      roadmap: JSON.parse(textResult),
      usage: {
        input: usage.promptTokenCount,
        output: usage.candidatesTokenCount,
      },
    };
  } catch (error) {
    console.error("Roadmap Generation Error:", error);
    return { roadmap: [], usage: null };
  }
};

// --- 2. TOPIC-SPECIFIC EXAM GENERATOR ---
export const generateQuestionsFromTopics = async (completedTopics, examLength, btPreferences = []) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
  
  if (!completedTopics || completedTopics.length === 0) return [];
  
  const topicsList = completedTopics.join(", ");

  // Handle BT preferences logically
  const prefText = btPreferences.length > 0 
    ? `PRIORITY: Give strong preference to generating questions with these BT Levels: [${btPreferences.join(", ")}]. However, include a few from other levels to maintain a realistic exam balance.`
    : `Provide a balanced mix of all BT levels.`;

  const prompt = `
    Role: Academic Exam Setter.
    Task: Create exactly ${examLength} exam questions.
    Constraint: You must ONLY ask questions based on these specific topics: [${topicsList}].
    
    CRITICAL INSTRUCTIONS:
    1. Do NOT ask about anything else outside of the provided topics.
    2. Classify each question according to Bloom's Taxonomy (BT) Levels.
    3. Use ONLY these exact abbreviations: R (Remember), U (Understand), Ap (Apply), An (Analyze), E (Evaluate), C (Create).
    4. Assign a Course Outcome (CO) to each question based on logical topic groupings. Use the format "CO1", "CO2", "CO3", etc.
    5. ${prefText}

    Output Format: return ONLY a raw JSON array of objects.
    Example: 
    [
      { "question": "Define artificial intelligence.", "courseOutcome": "CO1", "btLevel": "R" },
      { "question": "Use DFID to evaluate a real-world problem.", "courseOutcome": "CO3", "btLevel": "Ap" }
    ]
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" } // Forces pure JSON output
      }),
    });

    const data = await response.json();
    
    if (data.error || !data.candidates) return [];

    const textResult = data.candidates[0].content.parts[0].text;
    return JSON.parse(textResult);
  } catch (error) {
    console.error("Topic Exam Gen Error:", error);
    return [];
  }
};

// --- 3. GENERIC SYLLABUS EXAM GENERATOR (Legacy/Fallback) ---
export const generateQuestionsFromSyllabus = async (syllabus, examLength) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const poolSize = Math.max(examLength * 5, 20);

  const prompt = `
    Context: "${syllabus}"
    Task: Generate ${poolSize} distinct, conceptual exam questions based on this syllabus.
    Output Format: Return ONLY a raw JSON array of strings. 
    Example: ["Question 1?", "Question 2?"]
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    const data = await response.json();

    if (data.error || !data.candidates) return [];

    const textResult = data.candidates[0].content.parts[0].text;
    return JSON.parse(textResult);
  } catch (error) {
    console.error("Generation Error:", error);
    return [];
  }
};

// --- 4. EXAM GRADING (Strict 0-10 Scale) ---
export const gradeFullExam = async (syllabus, examData) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const prompt = `
    Role: You are a lenient and fair teacher grading an exam.
    Context: The student has taken an exam based on this syllabus: "${syllabus}"
    Student Submission: ${JSON.stringify(examData)}

    CRITICAL GRADING INSTRUCTIONS:
    1. **Scale:** You MUST grade on a scale of **0 to 10**. (Integer only).
    2. **Rubric:**
       - **8-10:** Good conceptual understanding.
       - **5-7:** Partial understanding, some minor mistakes.
       - **1-4:** Poor understanding or irrelevant answers.
       - **0:** completely empty or gibberish.
    3. **Leniency:** Do NOT look for exact keywords. If the student captures the *idea*, give them full marks.
    4. **Output:** Return ONLY a raw JSON object.

    Output Schema:
    { "score": number, "feedback": "One sentence constructive feedback." }
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    const data = await response.json();

    if (data.error || !data.candidates) {
      return { score: 0, feedback: "AI Grading failed." };
    }

    const textResult = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(textResult);

    if (result.score > 10) result.score = 10;

    return result;
  } catch (error) {
    console.error("Grading error:", error);
    return { score: 0, feedback: "Error reading AI response." };
  }
};

// --- 5. LESSON PLAN GENERATOR ---
export const generateLessonPlan = async (subjectName, modules) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
  
  if (!modules || modules.length === 0) return null;

  const moduleNames = modules.map(m => m.name || `Unit ${m.id}`).join(", ");
  const moduleTexts = modules.map(m => `Unit ${m.id}: ${m.name}\n${m.extractedText || ""}`).join("\n\n");

  const prompt = `
    Role: Senior Academic Curriculum Planner.
    Task: Create a highly detailed Lesson Plan and Course Outcomes grid for the subject: "${subjectName}".
    
    CRITICAL INSTRUCTIONS:
    1. Base your unit outcomes exactly on the provided Modules and their descriptions.
    2. Ensure outcomes use measurable verbs from Bloom's Taxonomy.
    3. Generate a comprehensive globally-applicable "Course Description" (about 1 paragraph).
    4. For *each* module provided, generate EXACTLY 2 measurable Outcomes.
    5. For *each* module, assign one appropriate Bloom's Taxonomy cognitive level string (e.g., "Understand", "Apply", "Analyze", "Evaluate", "Create").
    
    Modules List: ${moduleNames}
    
    Module Contents for Context:
    "${moduleTexts.substring(0, 30000)}"
    
    Output Format: return ONLY a raw JSON string matching exactly this schema:
    {
      "courseDescription": "A comprehensive course that explores...",
      "unitOutcomes": [
        {
          "unitNo": 1,
          "outcomes": "At the end of this unit a student will be able to:\\n1. Describe basic concepts.\\n2. Identify key components.",
          "btLevel": "Understand"
        }
      ]
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error("Gemini Error:", data.error.message);
      return null;
    }

    if (!data.candidates || !data.candidates[0]) {
      return null;
    }

    const textResult = data.candidates[0].content.parts[0].text;
    return JSON.parse(textResult);
  } catch (error) {
    console.error("Lesson Plan Generation Error:", error);
    return null;
  }
};

export const generateSpecificField = async (type, subjectName, modules) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
  
  let prompt = "";
  if (type === "description") {
    prompt = `Role: Academic Curriculum Planner. Task: Generate a strictly 1-paragraph globally-applicable "Course Description" for "${subjectName}". Return ONLY raw JSON like {"result": "The course..."}`;
  } else if (type === "unit") {
    const m = modules[0];
    prompt = `Role: Academic Planner. Task: For Unit "${m?.name || "Unknown"}" in "${subjectName}" with context "${m?.extractedText || ""}", generate EXACTLY 2 measurable Outcomes and 1 Bloom's Taxonomy Level (e.g., "Understand"). Return ONLY raw JSON like {"outcomes": "1. ...\\n2. ...", "btLevel": "Understand"}`;
  } else if (type === "textBooks") {
    prompt = `Role: Academic Planner. Task: Recommend 3 standard Text Books for "${subjectName}". Return ONLY raw JSON array like {"result": ["Author, 'Title', Publisher, Year"]}`;
  } else if (type === "referenceBooks") {
    prompt = `Role: Academic Planner. Task: Recommend 5 standard Reference Books for "${subjectName}". Return ONLY raw JSON array like {"result": ["Author, 'Title', Publisher, Year"]}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
    });
    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    return type === "unit" ? result : result.result;
  } catch (error) {
    console.error("Single Gen Error", error);
    return null;
  }
};

export const generateSupplementaryLessonPlan = async (subjectName, modules) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
  
  if (!modules || modules.length === 0) return null;

  const moduleNames = modules.map((m, i) => `Module ${i+1}: ${m.name}`).join("\\n");
  const moduleTexts = modules.map(m => `Unit ${m.id}: ${m.name}\\n${m.extractedText || ""}`).join("\\n\\n");

  const prompt = `
    Role: Senior Academic Curriculum Planner and Accreditation (NBA/ABET) Expert.
    Task: Create Course Outcomes, map them accurately to Program Outcomes (POs), and recommend Books for "${subjectName}".
    
    CRITICAL INSTRUCTIONS:
    1. Construct exactly ${modules.length} Course Outcomes (one per module).
    2. Each Course Outcome must be a VERY SHORT, 1-sentence description.
    3. Map each Course Outcome to the most relevant Program Outcomes. Be highly intelligent and realistic (e.g., theory maps to PO1/PO2; advanced tech/tools map to PO4/PO5; ethics to PO8). Map to 3, 4, or 5 POs as appropriate. Use EXACTLY this comma-separated format: "PO1,PO2,PO5".
    4. Recommend exactly 3 standard Text Books as an array of strings (Author, 'Title', Publisher, Year).
    5. Recommend exactly 5 standard Reference Books as an array of strings (Author, 'Title', Publisher, Year).
    6. Generate a strictly mirroring "coPoMapping" matrix. For EVERY PO listed in a Course Outcome's "mappedPOs" string, assign an integer correlation weight of 3 (Strong) or 2 (Moderate). You MUST NOT map or weight any POs that are missing from the mappedPOs string! The mappedPOs string and the matrix structure MUST flawlessly mirror each other.
    
    Modules List: 
    ${moduleNames}
    
    Output Format: return ONLY a raw JSON strictly matching this schema:
    {
      "courseOutcomes": [
        {
          "description": "Describe the basic concepts of AI.",
          "mappedPOs": "PO4,PO5,PO6"
        }
      ],
      "coPoMapping": {
        "CO1_PO1": 3,
        "CO1_PO5": 2,
        "CO2_PSO1": 1
      },
      "textBooks": ["Author, 'Title', Publisher, Year"],
      "referenceBooks": ["Author, 'Title', Publisher, Year"]
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
    });
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("Suppl Gen Error", error);
    return null;
  }
};

export const generateDayWiseEnrichment = async (subjectName, roadmapTitles, textBooks = [], refBooks = []) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
  
  if (!roadmapTitles || roadmapTitles.length === 0) return null;

  const topicsList = roadmapTitles.map((t, i) => `${i+1}. ${t}`).join("\\n");
  const allBooks = [...textBooks, ...refBooks].map((b, i) => `B${i+1}: ${b}`).join("\\n");

  const prompt = `
    Role: Senior Academic Curriculum Planner.
    Task: For each topic in the lecture series below for "${subjectName}", recommend applicable Book IDs and the Bloom's Taxonomy (BT) cognitive level.

    Available Reference Books:
    ${allBooks || "No specific books provided, use standard generic designations like 'T1, R1'."}

    Topics:
    ${topicsList}

    CRITICAL INSTRUCTIONS:
    1. Output an array of exactly ${roadmapTitles.length} items.
    2. "books" should refer to the Book IDs (e.g., "B1, B3" or "T1, R2").
    3. "bt" must be a single Bloom's Taxonomy keyword (e.g., "Understand", "Apply", "Analyze", "Evaluate", "Create").
    
    Output Format: return ONLY a raw JSON strictly matching this schema:
    {
      "enrichment": [
        { "books": "B1, B2", "bt": "Understand" },
        { "books": "B3", "bt": "Apply" }
      ]
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
    });
    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    return result.enrichment;
  } catch (error) {
    console.error("DayWise Enrichment Error", error);
    return null;
  }
};

export const generateCoPoMapping = async (courseOutcomes, programOutcomes) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
  if (!courseOutcomes || !programOutcomes) return null;

  const coText = courseOutcomes.map((co, i) => `CO${i+1}: ${co.description}`).join("\n");
  const poText = programOutcomes.map((po, i) => {
    const poLabel = typeof po === "string" ? po : (po.code || `PO${i+1}`);
    const poDesc = typeof po === "string" ? po : (po.title || "");
    return `${poLabel}: ${poDesc}`;
  }).join("\n");

  const prompt = `
    Role: Academic Curriculum Expert.
    Task: Evaluate the intersection density and mapping correlation between Course Outcomes (COs) and Program Outcomes (POs).
    
    Course Outcomes:
    ${coText}
    
    Program Outcomes:
    ${poText}
    
    CRITICAL INSTRUCTIONS:
    1. Base ratings strictly on semantic similarity and academic necessity.
    2. Rate the correlation on an integer scale of 1 to 3:
       - 3: High/Substantial correlation.
       - 2: Medium/Moderate correlation.
       - 1: Low/Slight correlation.
    3. Omit the PO (leave it entirely out of the output) if there is NO logical correlation.
    4. Provide weightings for PSO1 and PSO2 implicitly as well.
    5. Format the output STRICTLY as a JSON dictionary matching this root structure.
    
    Example Output Format:
    {
      "mapping": {
        "CO1_PO1": 3,
        "CO1_PO5": 2,
        "CO1_PSO2": 1,
        "CO2_PO4": 3
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
    });
    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    return result.mapping;
  } catch (error) {
    console.error("CoPoMapping Error", error);
    return null;
  }
};