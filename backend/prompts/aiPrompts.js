/**
 * AI prompt builders.
 * Pure functions — take input data, return prompt strings.
 * No side effects, no imports needed.
 */

/** 1. Lecture Roadmap */
export const buildRoadmapPrompt = (syllabusText, totalLectures, acceptedModules) => `
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

/** 2a. Theory questions */
export const buildTheoryQuestionsPrompt = (syllabusTopicsStr, numTheory, prefText) => `
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

export const theoryQuestionsSystem = `You are a strict Academic Exam Specialist. Generate high-quality THEORETICAL/CONCEPTUAL questions based ONLY on the provided syllabus topics. Do NOT generate any mathematical or numerical calculation problems.`;

/** 2b. Numerical questions */
export const buildNumericalQuestionsPrompt = (numNumerical, numericalPrompt, isFullExample, pastNumericals) => `
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
      ${pastNumericals.map((q, i) => `${i + 1}. ${q}`).join('\n')}
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

export const numericalQuestionsSystem = `You are a Universal Academic Problem Rewriter. Your ONLY task is to generate numerical/mathematical problems based exactly on the user's guidance. DO NOT invent topics. If the user provides an example (e.g., an array, a graph, an equation), generate a mathematically similar problem with DIFFERENT values.`;

/** 3. Questions from syllabus */
export const buildSyllabusQuestionsPrompt = (syllabus, poolSize) => `
    Context: "${syllabus}"
    Task: Generate ${poolSize} distinct, conceptual exam questions based on this syllabus.
    Output Format: Return ONLY a raw JSON array of strings. 
    Example: ["Question 1?", "Question 2?"]
  `;

/** 4. Grade exam */
export const buildGradeExamPrompt = (syllabus, examData) => `
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

/** 5. Lesson plan */
export const buildLessonPlanPrompt = (subjectName, moduleNames, moduleTexts) => `
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

/** 6. Specific field */
export const buildSpecificFieldPrompt = (type, subjectName, modules) => {
  if (type === 'description') {
    return `Role: Academic Curriculum Planner. Task: Generate a strictly 1-paragraph globally-applicable "Course Description" for "${subjectName}". Return ONLY raw JSON like {"result": "The course..."}`;
  } else if (type === 'unit') {
    const m = modules[0];
    return `Role: Academic Planner. Task: For Unit "${m?.name || 'Unknown'}" in "${subjectName}" with context "${m?.extractedText || ''}", generate EXACTLY 2 measurable Outcomes and 1 Bloom's Taxonomy Level (e.g., "Understand"). Return ONLY raw JSON like {"outcomes": "1. ...\\n2. ...", "btLevel": "Understand"}`;
  } else if (type === 'textBooks') {
    return `Role: Academic Planner. Task: Recommend 3 standard Text Books for "${subjectName}". Return ONLY raw JSON array like {"result": ["Author, 'Title', Publisher, Year"]}`;
  } else if (type === 'referenceBooks') {
    return `Role: Academic Planner. Task: Recommend 5 standard Reference Books for "${subjectName}". Return ONLY raw JSON array like {"result": ["Author, 'Title', Publisher, Year"]}`;
  }
  return '';
};

/** 7. Supplementary lesson plan */
export const buildSupplementaryPlanPrompt = (subjectName, modules, moduleNames, moduleTexts) => `
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

/** 8. Day-wise enrichment */
export const buildDayWiseEnrichmentPrompt = (subjectName, topicsList, allBooks, totalTopics) => `
    Role: Senior Academic Curriculum Planner.
    Task: For each topic in the lecture series below for "${subjectName}", recommend applicable Book IDs and the Bloom's Taxonomy (BT) cognitive level.

    Available Reference Books:
    ${allBooks || "No specific books provided, use standard generic designations like 'T1, R1'."}

    Topics:
    ${topicsList}

    CRITICAL INSTRUCTIONS:
    1. Output an array of exactly ${totalTopics} items.
    2. "books" should refer to the Book IDs (e.g., "B1, B3" or "T1, R2").
    3. "bt" must be a single Bloom's Taxonomy keyword (e.g., "Understand", "Apply", "Analyze", "Evaluate", "Create").
    
    Output Format: return ONLY a raw JSON strictly matching this schema:
    {
      "enrichment": [
        { "books": "B1, B2", "bt": "Understand" }
      ]
    }
  `;

/** 9. CO-PO mapping */
export const buildCoPoMappingPrompt = (coText, poText) => `
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

/** 10. Copilot system prompt */
export const buildCopilotSystemPrompt = (ctx, userRole, pagePath, pageLabel, pageContext) => `
    You are "Velaar", an AI academic assistant built into the Velaar ERP platform for Indian engineering colleges.

    User Context:
    - Role: ${userRole}
    - Name: ${ctx.teacherName || 'User'}
    - Email: ${ctx.teacherEmail || ''}
    - Active Course: ${ctx.subjectName || 'None selected'}
    - Current Page: ${pagePath || 'unknown'} (${pageLabel || 'general'})
    - Page Data: ${JSON.stringify(pageContext).substring(0, 2000)}

    Your Capabilities (mention naturally when relevant):
    - Generate question banks and exam papers from completed lecture topics
    - Generate lesson plans / curriculum roadmaps
    - Answer anything related to academics, teaching, and the Velaar platform

    Personality: Warm, helpful, and concise. You speak naturally - not like a formal bot. If the user just says hi or chats casually, respond like a friendly AI colleague.
    CRITICAL: Keep responses concise with markdown (bolding, bullet points). No essays unless asked.
  `;

/** 11. Copilot intent classifier system */
export const copilotIntentSystem = `
      You are the AI brain behind the "Velaar Copilot", an academic assistant.
      Your job is to read the user's text and determine if they want to trigger a specific generation task or just chat.

      Available intents:
      - "generate_questions": The user wants to generate an exam, quiz, or question bank.
      - "generate_lessonplan": The user wants to generate a lesson plan or curriculum roadmap.
      - "general_chat": Any other conversational query or question.

      For "generate_questions", try to extract these parameters if provided in the text:
      - "numQuestions" (number, e.g., 5, 10, 15)
      - "btLevels" (string, e.g., "Remember", "Apply, Analyse")

      Return ONLY a raw JSON object with this exact schema:
      {
        "intent": "generate_questions" | "generate_lessonplan" | "general_chat",
        "extractedParams": {
          "numQuestions": 10,
          "btLevels": "Apply"
        },
        "reply": "Conversational response (only needed if intent is general_chat)"
      }
      Do NOT include any markdown formatting like \`\`\`json
    `;

/** 12. Lecture presentation */
export const buildPresentationPrompt = (subjectName, lecture, overview, course) => {
  const lectureChecklist = (lecture?.checklist || []).join(', ');
  const moduleName = lecture?.moduleName || '';
  const moduleList = (course?.modules || []).map(m => m.name).join(', ');
  const overviewContext = overview ? JSON.stringify(overview).slice(0, 3000) : '';
  const lessonPlanContext = course?.lessonPlan ? JSON.stringify(course.lessonPlan).slice(0, 2000) : '';

  return [
    'You are a university professor writing an EXTREMELY DETAILED, HIGH-DENSITY, self-contained PowerPoint presentation that a teacher can deliver without any extra preparation.',
    'You must OVER-DELIVER on content. Do not provide a skeletal or sparse presentation. Every slide must be packed with rich, educational value.',
    'CRITICALLY: Balance technical depth with ACCESSIBILITY. While you must provide deep formulas and algorithms, you MUST also break things down using simple analogies, everyday language, and relatable concepts. Do not be overly academic 100% of the time — make the hard concepts easy to grasp.',
    '',
    'COURSE: ' + (subjectName || 'Engineering'),
    'COURSE MODULES: ' + (moduleList || 'Not specified'),
    'CURRENT MODULE: ' + moduleName,
    'LECTURE NUMBER: ' + (lecture?.lectureNum || 1),
    'LECTURE TITLE: ' + (lecture?.title || 'Introduction'),
    'LECTURE DESCRIPTION: ' + (lecture?.description || ''),
    'KEY TOPICS / CHECKLIST: ' + lectureChecklist,
    'LECTURE PREPARATION NOTES: ' + overviewContext,
    'LESSON PLAN CONTEXT: ' + lessonPlanContext,
    '',
    '=== YOUR GOAL ===',
    'Write slides that contain COMPLETE, SELF-EXPLANATORY, COMPREHENSIVE content. A teacher must be able to read the slide and immediately know what to say. A student must be able to read it and understand the concept without any other resource.',
    '',
    'Each bullet point must be a FULL SENTENCE or FRAGMENT with MAXIMUM informational value. NEVER use short 3-word bullets.',
    '',
    'Bad bullet example (DO NOT DO THIS): "Agents perceive environments using specialized sensory inputs"',
    'Good bullet example: "An intelligent agent perceives its environment through diverse sensors (e.g., cameras for vision, microphones for audio) — think of it like a human using eyes and ears to understand the room around them before acting."',
    '',
    '=== SLIDE GUIDELINES ===',
    '- Generate exactly the number of slides needed to cover the topic efficiently — MINIMUM 15, MAXIMUM 25 slides.',
    '- Keep the presentation thorough but concise. Break down complex topics if needed, but do not overgenerate.',
    '- Bullets per slide: 4 to 7. THIS IS CRITICAL. KEEP BULLETS CONCISE BUT INFORMATIVE.',
    '',
    '=== REQUIRED SLIDE SECTIONS (in order) ===',
    '1. Title slide — title and subtitle only, bullets: []',
    '2. Why This Topic Matters — 3 real-world 2023-2025 scenarios, specific company/event names',
    '3. Learning Objectives — 4-5 highly specific outcomes students will achieve',
    '4-onwards: Cover the full topic in exhaustive depth using sub-topic slides. For each major concept:',
    '   - Definition slide (highly detailed)',
    '   - The "Simply Put" / Analogy slide (explain the concept like they are beginners)',
    '   - Components/Types/Classification slide (with extensive sub-points)',
    '   - Working mechanism or algorithm slide (step-by-step, thorough)',
    '   - Mathematical or logical framework if applicable (show variables and formulas)',
    '   - Advantages and Disadvantages or Comparison slide (side-by-side exhaustive)',
    '   - Real-world Example 1 — specific named Indian example from 2023-2025 with statistics/impact',
    '   - Real-world Example 2 — specific named global example from 2023-2025 with statistics/impact',
    '   - Common Mistakes and Misconceptions (why students fail at this)',
    '   - Worked Example with detailed step-by-step solution',
    '   - Class Activity (think-pair-share or quick problem, 5 min)',
    'Last 2 slides: Summary (6-8 key takeaways) and What is Next (bridge + deep references)',
    '',
    '=== MOTTO FOR TITLE SLIDE ===',
    'Generate a short 5-8 word ACADEMIC MOTTO relevant to the lecture topic.',
    'Store this in the "motto" field of the JSON (only on slide index 0).',
    '',
    '=== JSON OUTPUT FORMAT ===',
    'Return ONLY valid JSON, no markdown, no code fences:',
    '{',
    '  "title": "lecture title",',
    '  "subtitle": "' + (subjectName || 'Course') + ' | Lecture ' + (lecture?.lectureNum || 1) + ' | ' + moduleName + '",',
    '  "slides": [',
    '    {',
    '      "title": "slide title",',
    '      "bullets": ["long, highly detailed, complete informative sentence", "another exhaustive full sentence with deep technical context"],',
    '      "motto": "only present on slide index 0, leave out on all other slides",',
    '      "speakerNotes": "4-6 sentences with extensive real-world detail, specific company names, precise statistics, dates, and pedagogical tips for the teacher to say aloud"',
    '    }',
    '  ]',
    '}',
    '',
    '=== ABSOLUTE RULES ===',
    '- No visualSuggestion field',
    '- No emojis anywhere',
    '- Title slide has empty bullets array and a motto field',
    '- All other slides have NO motto field',
    '- Every content slide must have exactly 4 to 7 clear, concise, and informative bullets',
    '- Sub-bullets are welcome: use format "Term: detailed description" or add them as separate bullets with indentation context',
    '- Real-world examples must name the company, product, or event and year explicitly and include data/impact',
    '- Indian examples: ISRO, UPI, NPCI, Zepto, PhonePe, Jio, Ola, Zomato, BHIM, Indian Railways, ONDC, Aadhar, Tata Motors',
    '- Global examples: OpenAI, Google DeepMind, Tesla Autopilot, NVIDIA, Meta, Apple, Amazon, Microsoft, SpaceX',
    '- Generate STRICTLY between 15 and 25 slides — find the perfect balance between depth and API safety.',
  ].join('\n');
};
