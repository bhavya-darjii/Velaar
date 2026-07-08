import dotenv from 'dotenv';
dotenv.config();

import { logAiUsage } from '../utils/logAiUsage.js';

const API_KEY = process.env.GOOGLE_API_KEY;

// ─── Helper: call Gemini and return { data, usage } ──────────────────────────
const callGemini = async (bodyPayload) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });
  return response.json();
};

// ─── Extract teacher context from request body ────────────────────────────────
const getCtx = (req) => ({
  teacherId:    req.body.teacherId    || 'unknown',
  teacherEmail: req.body.teacherEmail || '',
  teacherName:  req.body.teacherName  || '',
  courseId:     req.body.courseId     || '',
  subjectName:  req.body.subjectName  || '',
});

// ─── 1. Generate Lecture Roadmap ──────────────────────────────────────────────
export const generateLectureRoadmap = async (req, res) => {
  const { syllabusText, totalLectures, acceptedModules } = req.body;
  const ctx = getCtx(req);

  if (!syllabusText || syllabusText.length < 50) {
    return res.status(400).json({ error: 'Syllabus text is empty or too short' });
  }

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
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    if (data.error) return res.status(500).json({ error: data.error.message });
    if (!data.candidates || !data.candidates[0]) return res.status(500).json({ error: 'Empty candidate' });

    const textResult = data.candidates[0].content.parts[0].text;
    const cleanJsonStr = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const usage = data.usageMetadata || {};

    // Log to Firestore
    await logAiUsage({
      action: 'generate-roadmap',
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      ...ctx,
    });

    return res.status(200).json({
      roadmap: JSON.parse(cleanJsonStr),
      usage: { input: usage.promptTokenCount, output: usage.candidatesTokenCount },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Generation failed' });
  }
};

// ─── 2. Generate Questions from Topics ───────────────────────────────────────
export const generateQuestionsFromTopics = async (req, res) => {
  const {
    completedTopics, examLength,
    btPreferences = [], numericalCount = 0,
    numericalPrompt = '', pastNumericals = [],
  } = req.body;
  const ctx = getCtx(req);

  if (!completedTopics || completedTopics.length === 0) return res.status(200).json([]);

  const syllabusTopicsStr = completedTopics.join(', ');
  const prefText = btPreferences.length > 0
    ? `PRIORITY: Give strong preference to generating questions with these BT Levels: [${btPreferences.join(', ')}]. However, include a few from other levels to maintain a realistic exam balance.`
    : 'Provide a balanced mix of all BT levels.';

  const numTheory    = Math.max(0, examLength - numericalCount);
  const numNumerical = Math.min(examLength, numericalCount);

  const callAI = async (promptText, systemInstructionText) => {
    const data = await callGemini({
      systemInstruction: { parts: [{ text: systemInstructionText }] },
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const usage = data.usageMetadata || {};

    // Log each sub-call individually
    await logAiUsage({
      action: 'generate-questions-topics',
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      ...ctx,
    });

    if (data.error || !data.candidates) return [];
    const textResult = data.candidates[0].content.parts[0].text;
    const cleanJsonStr = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    try { return JSON.parse(cleanJsonStr); } catch (e) { return []; }
  };

  let theoryQuestions = [];
  let numericalQuestions = [];

  if (numTheory > 0) {
    const theorySystem = `You are a strict Academic Exam Specialist. Generate high-quality THEORETICAL/CONCEPTUAL questions based ONLY on the provided syllabus topics. Do NOT generate any mathematical or numerical calculation problems.`;
    const theoryPrompt = `
      Task: Create exactly ${numTheory} THEORETICAL exam questions.
      
      ==== SYLLABUS TOPICS ====
      [${syllabusTopicsStr}]
      
      ==== CORE INSTRUCTIONS ====
      1. Classify each question using Bloom's Taxonomy (BT) Levels (R, U, Ap, An, E, C).
      2. Assign a Course Outcome (CO) like "CO1", "CO2", "CO3".
      3. ${prefText}
      4. MUST NOT be numerical questions.
      5. DO NOT use emojis anywhere in the output.

      ==== STRICT OUTPUT FORMAT ====
      Return ONLY a raw JSON array of objects.
      [
        { "question": "Explain the concept of...", "courseOutcome": "CO1", "btLevel": "U" }
      ]
    `;
    theoryQuestions = await callAI(theoryPrompt, theorySystem);
  }

  if (numNumerical > 0) {
    const isFullExample = numericalPrompt && (numericalPrompt.includes('?') || numericalPrompt.length > 50 || numericalPrompt.includes('=') || numericalPrompt.includes('[') || /\d/.test(numericalPrompt));

    const numSystem = `You are a Universal Academic Problem Rewriter. Your ONLY task is to generate numerical/mathematical problems based exactly on the user's guidance. DO NOT invent topics. If the user provides an example (e.g., an array, a graph, an equation), generate a mathematically similar problem with DIFFERENT values.`;
    const numPrompt = `
      Task: Create exactly ${numNumerical} NUMERICAL/MATHEMATICAL exam questions.
      
      ==== NUMERICAL GUIDANCE (ABSOLUTE SOURCE OF TRUTH) ====
      ${numericalPrompt ? `"${numericalPrompt}"` : 'Generate numerical problems based on general engineering/science applications.'}

      ${isFullExample ? `
      ⚠️ TEMPLATE REWRITING MODE:
      The guidance above is a SPECIFIC PROBLEM/EXAMPLE. You MUST:
      1. Generate the EXACT SAME TYPE of problem (same algorithm/concept/domain).
      2. CHANGE the specific values (e.g. use a different array, different graph edges, different voltage).
      3. Do NOT generate numericals from any other topic.
      ` : `
      ⚠️ TOPIC MODE: Use the guidance above as the exact subject area.
      `}

      ${pastNumericals && pastNumericals.length > 0 ? `
      ==== PAST GENERATED EXAMPLES TO EMULATE (STYLE/DIFFICULTY REFERENCE) ====
      ${pastNumericals.map((q, i) => `${i+1}. ${q}`).join('\n')}
      (Use these past examples strictly as a stylistic reference to maintain consistency.)
      ` : ''}

      ==== CORE INSTRUCTIONS ====
      1. Classify each question using Bloom's Taxonomy (BT) Levels (Ap, An, E, C).
      2. Assign a Course Outcome (CO) like "CO1", "CO2", "CO3".
      3. EVERY question MUST require a concrete calculation, diagram, or algorithmic trace (e.g., BFS on a graph).
      4. DO NOT use emojis anywhere in the output.

      ==== STRICT OUTPUT FORMAT ====
      Return ONLY a raw JSON array of objects.
      [
        { "question": "Calculate the output given adj = [[...]]...", "courseOutcome": "CO2", "btLevel": "Ap" }
      ]
    `;
    const fetchedNumericals = await callAI(numPrompt, numSystem);
    if (Array.isArray(fetchedNumericals)) {
      numericalQuestions = fetchedNumericals.map(q => ({ ...q, isNumerical: true }));
    }
  }

  let combined = [
    ...(Array.isArray(theoryQuestions) ? theoryQuestions : []),
    ...(Array.isArray(numericalQuestions) ? numericalQuestions : []),
  ];

  if (combined.length > 1 && numTheory > 0 && numNumerical > 0) {
    combined = combined.sort(() => Math.random() - 0.5);
  }

  return res.status(200).json(combined);
};

// ─── 3. Generate Questions from Syllabus ─────────────────────────────────────
export const generateQuestionsFromSyllabus = async (req, res) => {
  const { syllabus, examLength } = req.body;
  const ctx = getCtx(req);
  const poolSize = Math.max(examLength * 5, 20);

  const prompt = `
    Context: "${syllabus}"
    Task: Generate ${poolSize} distinct, conceptual exam questions based on this syllabus.
    Output Format: Return ONLY a raw JSON array of strings. 
    Example: ["Question 1?", "Question 2?"]
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const usage = data.usageMetadata || {};
    await logAiUsage({
      action: 'generate-questions-syllabus',
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      ...ctx,
    });

    if (data.error || !data.candidates) return res.status(200).json([]);
    const textResult = data.candidates[0].content.parts[0].text;
    const cleanJsonStr = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    return res.status(200).json(JSON.parse(cleanJsonStr));
  } catch (error) {
    console.error(error);
    return res.status(200).json([]);
  }
};

// ─── 4. Grade Full Exam ───────────────────────────────────────────────────────
export const gradeFullExam = async (req, res) => {
  const { syllabus, examData } = req.body;
  const ctx = getCtx(req);

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
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const usage = data.usageMetadata || {};
    await logAiUsage({
      action: 'grade-exam',
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      ...ctx,
    });

    if (data.error || !data.candidates) return res.status(200).json({ score: 0, feedback: 'AI Grading failed.' });
    const textResult = data.candidates[0].content.parts[0].text;
    const cleanJsonStr = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonStr);
    if (result.score > 10) result.score = 10;
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(200).json({ score: 0, feedback: 'Error reading AI response.' });
  }
};

// ─── 5. Generate Lesson Plan ──────────────────────────────────────────────────
export const generateLessonPlan = async (req, res) => {
  const { subjectName, modules } = req.body;
  const ctx = getCtx(req);

  if (!modules || modules.length === 0) return res.status(400).json({ error: 'No modules provided' });

  const moduleNames = modules.map(m => m.name || `Unit ${m.id}`).join(', ');
  const moduleTexts = modules.map(m => `Unit ${m.id}: ${m.name}\n${m.extractedText || ''}`).join('\n\n');

  const prompt = `
    Role: Senior Academic Curriculum Planner.
    Task: Create a highly detailed Lesson Plan and Course Outcomes grid for the subject: "${subjectName}".
    
    CRITICAL INSTRUCTIONS:
    1. Base your unit outcomes exactly on the provided Modules and their descriptions.
    2. Ensure outcomes use measurable verbs from Bloom's Taxonomy.
    3. Generate a comprehensive globally-applicable "Course Description" (about 1 paragraph).
    4. For *each* module provided, generate EXACTLY 2 measurable Outcomes.
    5. For *each* module, assign one appropriate Bloom's Taxonomy cognitive level string (e.g., "Understand", "Apply", "Analyze", "Evaluate", "Create").
    6. DO NOT use emojis anywhere in the output.
    
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
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const usage = data.usageMetadata || {};
    await logAiUsage({
      action: 'generate-lesson-plan',
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      ...ctx,
      subjectName: subjectName || ctx.subjectName,
    });

    if (data.error) return res.status(500).json({ error: data.error.message });
    const textResult = data.candidates[0].content.parts[0].text;
    const cleanJsonStr = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    return res.status(200).json(JSON.parse(cleanJsonStr));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Lesson Plan Generation Error' });
  }
};

// ─── 6. Generate Specific Field ───────────────────────────────────────────────
export const generateSpecificField = async (req, res) => {
  const { type, subjectName, modules } = req.body;
  const ctx = getCtx(req);
  let prompt = '';

  if (type === 'description') {
    prompt = `Role: Academic Curriculum Planner. Task: Generate a strictly 1-paragraph globally-applicable "Course Description" for "${subjectName}". Return ONLY raw JSON like {"result": "The course..."}`;
  } else if (type === 'unit') {
    const m = modules[0];
    prompt = `Role: Academic Planner. Task: For Unit "${m?.name || 'Unknown'}" in "${subjectName}" with context "${m?.extractedText || ''}", generate EXACTLY 2 measurable Outcomes and 1 Bloom's Taxonomy Level (e.g., "Understand"). Return ONLY raw JSON like {"outcomes": "1. ...\\n2. ...", "btLevel": "Understand"}`;
  } else if (type === 'textBooks') {
    prompt = `Role: Academic Planner. Task: Recommend 3 standard Text Books for "${subjectName}". Return ONLY raw JSON array like {"result": ["Author, 'Title', Publisher, Year"]}`;
  } else if (type === 'referenceBooks') {
    prompt = `Role: Academic Planner. Task: Recommend 5 standard Reference Books for "${subjectName}". Return ONLY raw JSON array like {"result": ["Author, 'Title', Publisher, Year"]}`;
  }

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const usage = data.usageMetadata || {};
    await logAiUsage({
      action: 'generate-specific-field',
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      ...ctx,
      subjectName: subjectName || ctx.subjectName,
    });

    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    return res.status(200).json(type === 'unit' ? result : result.result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Single Gen Error' });
  }
};

// ─── 7. Generate Supplementary Lesson Plan ────────────────────────────────────
export const generateSupplementaryLessonPlan = async (req, res) => {
  const { subjectName, modules } = req.body;
  const ctx = getCtx(req);

  if (!modules || modules.length === 0) return res.status(400).json({ error: 'No modules' });

  const moduleNames = modules.map((m, i) => `Module ${i+1}: ${m.name}`).join('\\n');
  const moduleTexts = modules.map(m => `Unit ${m.id}: ${m.name}\\n${m.extractedText || ''}`).join('\\n\\n');

  const prompt = `
    Role: Senior Academic Curriculum Planner and Accreditation (NBA/ABET) Expert.
    Task: Create Course Outcomes, map them accurately to Program Outcomes (POs), and recommend Books for "${subjectName}".
    
    CRITICAL INSTRUCTIONS:
    1. Construct exactly ${modules.length} Course Outcomes (one per module).
    2. Each Course Outcome must be a VERY SHORT, 1-sentence description.
    3. Map each Course Outcome to the most relevant Program Outcomes. Be highly intelligent and realistic. Map to 3, 4, or 5 POs as appropriate. Use EXACTLY this comma-separated format: "PO1,PO2,PO5".
    4. Recommend exactly 3 standard Text Books as an array of strings (Author, 'Title', Publisher, Year).
    5. Recommend exactly 5 standard Reference Books as an array of strings (Author, 'Title', Publisher, Year).
    6. Generate a strictly mirroring "coPoMapping" matrix. For EVERY PO listed in a Course Outcome's "mappedPOs" string, assign an integer correlation weight of 3 (Strong) or 2 (Moderate). You MUST NOT map or weight any POs that are missing from the mappedPOs string! The mappedPOs string and the matrix structure MUST flawlessly mirror each other.
    7. DO NOT use emojis anywhere in the output.
    
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
        "CO1_PO5": 2
      },
      "textBooks": ["Author, 'Title', Publisher, Year"],
      "referenceBooks": ["Author, 'Title', Publisher, Year"]
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const usage = data.usageMetadata || {};
    await logAiUsage({
      action: 'generate-supplementary-plan',
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      ...ctx,
      subjectName: subjectName || ctx.subjectName,
    });

    const textResult = data.candidates[0].content.parts[0].text;
    const cleanJsonStr = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    return res.status(200).json(JSON.parse(cleanJsonStr));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Suppl Gen Error' });
  }
};

// ─── 8. Generate Day-Wise Enrichment ─────────────────────────────────────────
export const generateDayWiseEnrichment = async (req, res) => {
  const { subjectName, roadmapTitles, textBooks = [], refBooks = [] } = req.body;
  const ctx = getCtx(req);

  if (!roadmapTitles || roadmapTitles.length === 0) return res.status(400).json({ error: 'No roadmap titles' });

  const topicsList = roadmapTitles.map((t, i) => `${i+1}. ${t}`).join('\\n');
  const allBooks = [...textBooks, ...refBooks].map((b, i) => `B${i+1}: ${b}`).join('\\n');

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
        { "books": "B1, B2", "bt": "Understand" }
      ]
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const usage = data.usageMetadata || {};
    await logAiUsage({
      action: 'generate-day-wise-enrichment',
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      ...ctx,
      subjectName: subjectName || ctx.subjectName,
    });

    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    return res.status(200).json(result.enrichment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Enrichment Error' });
  }
};

// ─── 9. Generate CO-PO Mapping ────────────────────────────────────────────────
export const generateCoPoMapping = async (req, res) => {
  const { courseOutcomes, programOutcomes } = req.body;
  const ctx = getCtx(req);

  const coText = courseOutcomes.map((co, i) => `CO${i+1}: ${co.description}`).join('\n');
  const poText = programOutcomes.map((po, i) => {
    const poLabel = typeof po === 'string' ? po : (po.code || `PO${i+1}`);
    const poDesc  = typeof po === 'string' ? po : (po.title || '');
    return `${poLabel}: ${poDesc}`;
  }).join('\n');

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
        "CO1_PO5": 2
      }
    }
  `;

  try {
    const data = await callGemini({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const usage = data.usageMetadata || {};
    await logAiUsage({
      action: 'generate-copo-mapping',
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      ...ctx,
    });

    const textResult = data.candidates[0].content.parts[0].text;
    const cleanJsonStr = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonStr);
    return res.status(200).json(result.mapping);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'CoPoMapping Error' });
  }
};

// ─── 10. Velaar Copilot Chat ───────────────────────────────────────────────────
export const copilotChat = async (req, res) => {
  const { messages, userRole = 'teacher', pagePath = '', pageLabel = '', pageContext = {} } = req.body;
  const ctx = getCtx(req);

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  const slashHints = `
    Slash commands you understand:
    /generate-rubric — guide user to Rubric Generator
    /summarize-syllabus — summarize syllabus topics
    /draft-notice — draft a formal college notice
  `;

  const systemPrompt = `
    Role: You are "Velaar Copilot V2", a context-aware AI assistant for Indian engineering colleges (Velaar ERP).

    User Context:
    - Role: ${userRole}
    - Name: ${ctx.teacherName || 'User'}
    - Email: ${ctx.teacherEmail || ''}
    - Active Course: ${ctx.subjectName || 'None selected'}
    - Current Page: ${pagePath || 'unknown'} (${pageLabel || 'general'})
    - Page Data: ${JSON.stringify(pageContext).substring(0, 2000)}

    ${slashHints}

    Personality: Helpful, concise, respectful. Save users time.
    You understand the user's current page and role. Give page-specific advice when relevant.
    For actions requiring database writes, provide drafts or step-by-step guidance.

    CRITICAL: Keep responses concise with markdown (bolding, bullet points). No essays unless asked.
  `;

  try {
    // Format messages for Gemini (role: 'user' or 'model')
    const formattedContents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const data = await callGemini({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: formattedContents,
      // No JSON enforcement, standard text generation
    });

    const usage = data.usageMetadata || {};
    await logAiUsage({
      action: 'copilot-chat',
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      ...ctx,
    });

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    if (!data.candidates || data.candidates.length === 0) {
       return res.status(500).json({ error: 'Empty candidate from AI' });
    }

    const textResult = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ reply: textResult });
  } catch (error) {
    console.error('Copilot Error:', error);
    return res.status(500).json({ error: 'Copilot Chat Error' });
  }
};
