/* eslint-disable */
// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  generateQuestionsFromTopics,
  generateLessonPlan,
  setAiContextCourse,
  classifyCopilotIntent,
  sendCopilotMessage,
} from "../../services/aiService";
import { exportLessonPlanToWord } from "../../utils/wordExport";
import { getApiBaseUrl } from "../../services/apiConfig";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";
import { useCopilotContext } from "../../context/CopilotContext";
import { supabase } from "../../services/supabase";
import "./VelaarCopilot.css";

const QUICK_ACTIONS = [
  "Generate question bank",
  "Create lesson plan",
  "Generate exam paper",
];



const cleanQuestionText = (text) => {
  if (typeof text !== 'string') return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^[*#\-\s]+/, '');
  cleaned = cleaned.replace(/^(?:(?:ai[\s-]?)?generated(?:\s*question)?|question\s*\d+|q\d+)[ \t]*[:\-\–—.]+[ \t]*/i, '');
  cleaned = cleaned.replace(/^\[(?:ai[\s-]?)?generated[^\]]*\][ \t]*/i, '');
  cleaned = cleaned.replace(/\n\s*(?:Answer|Solution|Formula|Formulas|Key|Working|Steps|Derivation|Hint|Explanation)[ \t]*:[\s\S]*$/i, '');
  cleaned = cleaned.replace(/\s*\((?:ai[\s-]?)?generated[^)]*\)\s*$/i, '');
  cleaned = cleaned.replace(/\s*\[(?:ai[\s-]?)?generated[^\]]*\]\s*$/i, '');
  return cleaned.trim();
};

// ── Exam paper export via backend ─────────────────────────────────────────
const exportExamPaperToWord = async (questions, course, examType, headerConfig) => {
  try {
    const base = getApiBaseUrl();
    const apiRoot = base ? (base.endsWith('/api') ? base : `${base}/api`) : '';
    const EXPORT_URL = apiRoot ? `${apiRoot}/export/exam` : '/api/export/exam';

    const { data: { session } } = await supabase.auth.getSession();

    // Map examType label to examId used by the backend
    const examIdMap = { "Term Test 1": "tt1", "Term Test 2": "tt2", "End Semester": "endSem" };
    const examId = examIdMap[examType] || "endSem";

    // Build a basic exam pattern from the questions
    const isTT = examId === 'tt1' || examId === 'tt2';
    const subMarks = isTT ? 4 : (parseInt(headerConfig.maxMarks) > 40 ? 10 : 5);
    const totalSubs = Math.min(questions.length, isTT ? 9 : 12);
    const subsPerQ = isTT ? 3 : 3;
    const numQs = Math.ceil(totalSubs / subsPerQ);

    const pattern = Array.from({ length: numQs }, (_, qi) => {
      const subs = questions.slice(qi * subsPerQ, qi * subsPerQ + subsPerQ).map((q, si) => ({
        id: String.fromCharCode(97 + si),
        marks: subMarks,
        bt: q.btLevel || "U",
        isNumerical: false,
        co: (q.courseOutcome || "CO1").replace("CO", ""),
        _question: q.question,
        _courseOutcome: q.courseOutcome || "CO1",
      }));
      return {
        id: String(qi + 1),
        title: isTT
          ? `Answer any two questions out of three: (0${subMarks} marks each)`
          : `Solve any two questions out of three: (${subMarks < 10 ? '0' : ''}${subMarks} marks each)`,
        marks: subMarks * (isTT ? 2 : 2),
        subs,
      };
    });

    // Pre-fill aiData from the questions (no second AI call needed)
    const aiData = {};
    questions.forEach((q, i) => {
      const qi = Math.floor(i / subsPerQ);
      const si = i % subsPerQ;
      const subId = String.fromCharCode(97 + si);
      aiData[`Q${qi + 1}_${subId}`] = { q: q.question, co: q.courseOutcome || "CO1" };
    });

    const res = await fetch(EXPORT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: session ? `Bearer ${session.access_token}` : "",
      },
      body: JSON.stringify({
        course,
        examType: examId,
        pattern,
        headerConfig,
        numSets: 1,
        generationMode: "bank",  // use our pre-filled questions, no AI re-call
        _aiDataOverride: aiData,  // backend will use this if supported, else re-generates
      }),
    });

    if (!res.ok) {
      throw new Error(`Export failed (${res.status})`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course?.subjectName || "Exam"}_${examType.replace(/ /g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Exam paper export error:", err);
    throw err;
  }
};

const exportQuestionsToWord = async (questions, course) => {
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Q. No.", bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Question", bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Course Outcome (CO)", bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "BT Level", bold: true })] })] }),
      ],
    }),
    ...questions.map((q, i) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph((i + 1).toString())] }),
          new TableCell({ children: [new Paragraph(cleanQuestionText(q.question) || "")] }),
          new TableCell({ children: [new Paragraph(q.courseOutcome || "CO1")] }),
          new TableCell({ children: [new Paragraph(q.btLevel || "")] }),
        ],
      })
    ),
  ];

  const docToExport = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: `${course?.subjectName || "Course"} — Question Bank`, bold: true, size: 32 })] }),
        new Paragraph(""),
        new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
      ],
    }],
  });

  const blob = await Packer.toBlob(docToExport);
  saveAs(blob, `${course?.subjectName || "Subject"}_Question_Bank.docx`);
};

const parseBTLevels = (raw) => {
  if (!raw || raw.toLowerCase().includes("none") || raw.toLowerCase().includes("skip")) return [];
  const map = { r: "R", u: "U", ap: "Ap", an: "An", e: "E", c: "C" };
  const found = [];
  Object.entries(map).forEach(([key, val]) => {
    if (raw.toLowerCase().includes(key)) found.push(val);
  });
  return found;
};

const FLOWS = {
  questions: [
    {
      ask: "How many questions do you need?",
      param: "numQuestions",
      chips: ["5", "10", "15", "20"],
    },
    {
      ask: "Any specific BT levels to prioritise? (Select multiple or type)",
      param: "btLevels",
      chips: ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create", "None"],
      multiSelect: true,
    },
    { generate: true },
  ],
  lessonplan: [
    {
      ask: (ctx) => `Generate lesson plan for "${ctx?.subjectName || "your course"}"?`,
      param: "confirm",
      chips: ["Yes, generate", "Cancel"],
    },
    { generate: true },
  ],
  examPaper: [
    {
      ask: "What type of exam paper do you want to generate?",
      param: "examType",
      chips: ["Term Test 1", "Term Test 2", "End Semester"],
    },
    {
      ask: "What is the exam date?",
      param: "examDate",
      chips: [],
    },
    {
      ask: "What is the exam duration?",
      param: "duration",
      chips: ["1 Hour", "2 Hours", "2.5 Hours", "3 Hours"],
    },
    {
      ask: "What is the maximum marks for this paper?",
      param: "maxMarks",
      chips: ["20", "30", "60", "80", "100"],
    },
    {
      ask: "What is the academic year / class? (e.g. SY, TY, FY)",
      param: "academicYear",
      chips: ["FY", "SY", "TY", "LY"],
    },
    {
      ask: "What semester number? (e.g. III, IV, V, VI)",
      param: "semester",
      chips: ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"],
    },
    { generate: true },
  ],
};


// Safe markdown renderer: bold, italic, code — uses React elements, NO dangerouslySetInnerHTML
const parseInlineMarkdown = (text) => {
  // Split on **bold**, *italic*, and `code` tokens
  const parts = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      parts.push(<em key={key++}>{match[2]}</em>);
    } else if (match[3] !== undefined) {
      parts.push(<code key={key++} style={{background:'rgba(0,0,0,0.08)', padding:'1px 4px', borderRadius:'3px', fontSize:'0.9em'}}>{match[3]}</code>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
};

const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const isBullet = /^\s*[*-]\s+/.test(line);
    const clean = line.replace(/^\s*[*-]\s+/, '');
    const parsed = parseInlineMarkdown(clean);
    if (isBullet) {
      return (
        <div key={i} style={{display:'flex', gap:'6px', marginBottom:'2px'}}>
          <span style={{opacity:0.5, flexShrink:0}}>&bull;</span>
          <span>{parsed}</span>
        </div>
      );
    }
    return line.trim() === '' ? <div key={i} style={{height:'6px'}} /> : <div key={i}>{parsed}</div>;
  });
};

const VelaarCopilot = ({ userRole = "teacher" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pageContext } = useCopilotContext();
  const course = pageContext?.course || (pageContext?.subjectName ? pageContext : null);

  useEffect(() => {
    if (course?.id || course?.subjectName) {
      setAiContextCourse(course.id, course.subjectName);
    }
  }, [course?.id, course?.subjectName]);

  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [userName, setUserName] = useState("");
  const [flow, setFlow] = useState(null);
  const datePickerRef = useRef<HTMLInputElement>(null);

  const scrollLatestUserPromptToTop = () => {
    const panel = panelBodyRef.current;
    const target = lastUserMsgRef.current;
    if (!panel || !target) return;

    const panelRect = panel.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextScroll = panel.scrollTop + (targetRect.top - panelRect.top) - 4;
    panel.scrollTo({ top: Math.max(0, nextScroll), behavior: "smooth" });
  };

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const panelBodyRef = useRef(null);
  const lastUserMsgRef = useRef(null);
  const abortControllerRef = useRef(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const defaultDateStr = `${currentYear}-${currentMonth}-${currentDay}`;

  const isExamDateStep = flow?.type === "examPaper" && FLOWS[flow.type]?.[flow.step]?.param === "examDate";

  useEffect(() => {
    const fetchName = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const user = session.user;
      if (user.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name.split(" ")[0]);
      } else {
        try {
          const { data } = await supabase.from('users').select('full_name').eq('id', user.id).single();
          if (data && data.full_name) {
            setUserName(data.full_name.split(" ")[0]);
          }
        } catch { }
      }
    };
    fetchName();
  }, []);

  // ── Keep Render backend warm ───────────────────────────────────────────────
  // Free-tier Render spins down after ~15min inactivity, causing a 15-20s cold
  // start on the first copilot message. This silently pings /api/health on mount
  // so the backend is ready by the time the user types their first message.
  useEffect(() => {
    // VITE_API_BASE_URL is e.g. "https://velaar-api.onrender.com/api"
    // so appending "/health" gives the correct "/api/health" endpoint.
    const base = ((import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/$/, '');
    fetch(`${base}/health`, { method: 'GET', signal: AbortSignal.timeout(8000) }).catch(() => {});
  }, []);

  useEffect(() => {
    const onOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsFocused(false);
        setShowPanel(false);
        if (!input.trim() && !showPanel) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [input, showPanel]);

  useEffect(() => {
    if (!window.visualViewport) return;
    // Only apply on mobile
    if (window.innerWidth >= 769) return;

    const onViewportResize = () => {
      const el = wrapperRef.current;
      if (!el) return;

      const keyboardHeight = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;

      if (keyboardHeight > 50) {
        // Keyboard is open — sit 8px above it
        el.style.bottom = `${keyboardHeight + 8}px`;
      } else {
        // Keyboard closed — reset to CSS default
        el.style.bottom = '';
      }
    };

    window.visualViewport.addEventListener('resize', onViewportResize);
    window.visualViewport.addEventListener('scroll', onViewportResize);

    return () => {
      window.visualViewport.removeEventListener('resize', onViewportResize);
      window.visualViewport.removeEventListener('scroll', onViewportResize);
    };
  }, []);

  useEffect(() => {
    if (isFocused || input.trim()) {
      setIsExpanded(true);
    } else if (!showPanel) {
      setIsExpanded(false);
    }
  }, [isFocused, input, showPanel]);

  // Keep the latest user pill pinned to the top-right of the visible panel
  useEffect(() => {
    const run = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollLatestUserPromptToTop);
      });
    };
    const timer = setTimeout(run, 16);
    return () => clearTimeout(timer);
  }, [messages, isTyping, showPanel, isExamDateStep, flow?.step]);

  const addMessage = (role, content, status = "normal", retryAction = null) => {
    setMessages((prev) => [...prev, { role, content, status, retryAction }]);
  };

  // Focus date picker without shifting scroll when it appears
  useEffect(() => {
    if (isExamDateStep) {
      const timer = setTimeout(() => {
        datePickerRef.current?.focus({ preventScroll: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExamDateStep]);

  const runGenerate = async (flowType, params) => {
    const activeCourse = course || pageContext?.course;

    if (flowType === "questions") {
      const numQuestions = parseInt(params.numQuestions) || 10;
      const btLevels = parseBTLevels(params.btLevels || "");

      let allLectures = [];
      if (course?.roadmap) {
        if (Array.isArray(course.roadmap)) {
          allLectures = course.roadmap;
        } else {
          Object.values(course.roadmap).forEach((divLectures) => {
            allLectures = [...allLectures, ...divLectures];
          });
        }
      }

      let targetTopics = [
        ...new Set(allLectures.filter((l) => l.isCompleted).map((l) => l.title)),
      ];

      // Fallback: If no lectures are marked completed yet, use all roadmap lectures or module topics
      if (targetTopics.length === 0) {
        const roadmapTopics = allLectures.map((l) => l.title).filter(Boolean);
        const moduleTopics = (course?.modules || []).map((m) => m.name).filter(Boolean);
        targetTopics = [...new Set([...roadmapTopics, ...moduleTopics])];
      }

      if (targetTopics.length === 0) {
        addMessage("assistant", "No lecture or syllabus topics found in your course yet. Please set up your syllabus or lectures, then try again!");
        setIsTyping(false);
        return;
      }

      if (course?.id) setAiContextCourse(course.id, course.subjectName);

      abortControllerRef.current = new AbortController();
      const options = { signal: abortControllerRef.current.signal };

      let questions;
      try {
        questions = await generateQuestionsFromTopics(
          targetTopics,
          numQuestions,
          btLevels,
          0, "", [],
          options
        );
      } catch (err) {
        if (err.name === 'AbortError') {
          addMessage("assistant", "Execution stopped.", "aborted", () => runGenerate(flowType, params));
          setIsTyping(false);
          return;
        }
        throw err;
      }

      if (!questions || questions.error || !Array.isArray(questions) || questions.length === 0) {
        addMessage("assistant", questions?.error || "Could not generate questions. Please try again or use the full Question Bank page.", "error");
        setIsTyping(false);
        return;
      }

      // Save to Firestore
      try {
        const generationTimestamp = new Date().toISOString();
        const newQuestionsWithMeta = questions.map(q => ({ ...q, generatedAt: generationTimestamp }));
        const existingQuestionBank = course.questionBank || [];
        const updatedQuestionBank = [...existingQuestionBank, ...newQuestionsWithMeta];

        await supabase.from("courses").update({
          active_exam: questions, 
          question_bank: updatedQuestionBank, 
          last_exam_date: new Date().toISOString(),
        }).eq("id", course.id);
      } catch (err) {
        console.error("Failed to save to Firestore:", err);
      }

      addMessage("assistant", `Generated ${questions.length} questions! Your Word document is downloading now...`, "success");
      await exportQuestionsToWord(questions, course);

    } else if (flowType === "examPaper") {
      if ((params.examType || "").toLowerCase().includes("cancel")) {
        addMessage("assistant", "Cancelled. Let me know if you need anything else!");
        setIsTyping(false);
        setFlow(null);
        return;
      }

      // Build topics from completed or all lectures
      let allLectures = [];
      if (activeCourse?.roadmap) {
        if (Array.isArray(activeCourse.roadmap)) {
          allLectures = activeCourse.roadmap;
        } else {
          Object.values(activeCourse.roadmap).forEach((divLecs: any) => {
            allLectures = [...allLectures, ...(divLecs as any[])];
          });
        }
      }

      let targetTopics = [
        ...new Set(allLectures.filter((l) => l.isCompleted).map((l) => l.title)),
      ];
      if (targetTopics.length === 0) {
        const roadmapTopics = allLectures.map((l) => l.title).filter(Boolean);
        const moduleTopics = (activeCourse?.modules || []).map((m) => m.name).filter(Boolean);
        targetTopics = [...new Set([...roadmapTopics, ...moduleTopics])];
      }

      if (targetTopics.length === 0) {
        addMessage("assistant", "No lecture or syllabus topics found. Please set up your syllabus first!", "error");
        setIsTyping(false);
        return;
      }

      // Determine marks per question type
      const maxMarks = parseInt(params.maxMarks) || 60;
      const isTT = (params.examType || "").toLowerCase().includes("term");
      const numQuestions = isTT ? 9 : 12;
      const btLevels = [];

      abortControllerRef.current = new AbortController();
      const options = { signal: abortControllerRef.current.signal };

      addMessage("assistant", `⏳ Generating your **${params.examType}** question paper... This may take a moment.`);

      let questions;
      try {
        questions = await generateQuestionsFromTopics(
          targetTopics,
          numQuestions,
          btLevels,
          0, "", [],
          options
        );
      } catch (err) {
        if ((err as any).name === 'AbortError') {
          addMessage("assistant", "Execution stopped.", "aborted", () => runGenerate(flowType, params));
          setIsTyping(false);
          return;
        }
        throw err;
      }

      if (!questions || questions.error || !Array.isArray(questions) || questions.length === 0) {
        addMessage("assistant", questions?.error || "Could not generate questions. Please try again.", "error");
        setIsTyping(false);
        return;
      }

      // Parse date input (user may type DD/MM/YYYY or YYYY-MM-DD)
      let isoDate = new Date().toISOString().split('T')[0];
      try {
        const raw = (params.examDate || "").trim();
        if (raw.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [d, m, y] = raw.split('/');
          isoDate = `${y}-${m}-${d}`;
        } else if (raw.match(/^\d{4}-\d{2}-\d{2}$/)) {
          isoDate = raw;
        }
      } catch (_) {}

      const headerConfig = {
        date: isoDate,
        duration: params.duration || "2.5 Hours",
        maxMarks: String(maxMarks),
        scheme: "",
        academicYear: params.academicYear || "SY",
        semester: params.semester || "IV",
      };

      try {
        await exportExamPaperToWord(questions, activeCourse, params.examType || "End Semester", headerConfig);
        addMessage("assistant", `✅ **${params.examType}** question paper generated and downloaded! Check your downloads folder.\n\n💡 *Tip: For full control over the paper structure and BT level mapping, use the full **Examination** editor from the navigation menu.*`, "success");
      } catch (exportErr) {
        addMessage("assistant", "❌ Export failed. Please try again or use the full Examination editor.", "error");
      }

    } else if (flowType === "lessonplan") {
      if ((params.confirm || "").toLowerCase().includes("cancel")) {
        addMessage("assistant", "Cancelled. Let me know if you need anything else!");
        setIsTyping(false);
        setFlow(null);
        return;
      }

      abortControllerRef.current = new AbortController();
      const options = { signal: abortControllerRef.current.signal };

      let lessonPlan;
      try {
        lessonPlan = await generateLessonPlan(
          course?.subjectName || "Course",
          course?.modules || [],
          options
        );
      } catch (err) {
        if (err.name === 'AbortError') {
          addMessage("assistant", "Execution stopped.", "aborted", () => runGenerate(flowType, params));
          setIsTyping(false);
          return;
        }
        throw err;
      }

      if (!lessonPlan) {
        addMessage("assistant", "Could not generate the lesson plan. Please try again or use the full Lesson Plan page.", "error");
        setIsTyping(false);
        return;
      }

      addMessage("assistant", "Lesson plan generated! Your Word document is downloading now...", "success");
      await exportLessonPlanToWord(course, lessonPlan);
    }

    setIsTyping(false);
    setFlow(null);
  };

  const handleSend = async (textOverride) => {
    const msg = (textOverride || input).trim();
    if (!msg || isTyping) return;

    addMessage("user", msg);
    setInput("");
    setShowPanel(true);
    setIsExpanded(true);
    setIsFocused(true);

    if (flow) {
      // ── Off-topic escape: if the user types something unrelated to the flow
      // question (e.g. greetings, random questions), exit the flow and answer normally.
      const currentStep = FLOWS[flow.type]?.[flow.step];
      const validChips = currentStep?.chips || [];
      const msgLower = msg.toLowerCase().trim();

      const isChipAnswer = validChips.some(c => msgLower === c.toLowerCase());
      const looksLikeCasualChat =
        !isChipAnswer &&
        (
          /^(hey|hi|hello|bro|man|yo|sup|ok|okay|thanks|lol|haha|damn|cool|nice|great|hmm|umm|what|how|why|who|tell|explain|help|no|yes|nah|sure)\b/i.test(msgLower) ||
          msg.endsWith('?') ||
          // Single word that doesn't look like a date/number/valid answer
          (msg.split(' ').length <= 2 && !/\d/.test(msg) && !isChipAnswer && validChips.length > 0 &&
            !['term test 1','term test 2','end semester','today','manual','fy','sy','ty','ly',
              'i','ii','iii','iv','v','vi','vii','viii','1 hour','2 hours','2.5 hours','3 hours'].some(v => msgLower.includes(v)))
        );

      if (looksLikeCasualChat) {
        // Exit the flow and treat as normal chat
        setFlow(null);
        setIsTyping(true);
        abortControllerRef.current = new AbortController();
        const opts = { signal: abortControllerRef.current.signal };
        const chatHistory = [...messages, { role: "user", content: msg }];
        let chatRes;
        try {
          chatRes = await sendCopilotMessage(chatHistory, userRole, location.pathname, "", course || pageContext?.course || {}, opts);
        } catch (err) {
          if (err.name === 'AbortError') {
            addMessage("assistant", "Execution stopped.", "aborted", () => handleSend(msg));
            setIsTyping(false);
            return;
          }
          throw err;
        }
        addMessage("assistant", chatRes.reply || chatRes.error || "Sorry, I had trouble responding.");
        setIsTyping(false);
        return;
      }

      let paramValue = msg;
      if (currentStep?.param === "examDate") {
        const trimmed = msg.trim();
        if (/^\d{1,2}$/.test(trimmed)) {
          paramValue = `${trimmed.padStart(2, '0')}/${currentMonth}/${currentYear}`;
        } else if (/^\d{1,2}[\/\-]\d{1,2}$/.test(trimmed)) {
          const [d, m] = trimmed.split(/[\/\-]/);
          paramValue = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${currentYear}`;
        } else if (/\b\d{1,2}(st|nd|rd|th)?\s+[a-zA-Z]+\b/i.test(trimmed) && !/\b\d{4}\b/.test(trimmed)) {
          paramValue = `${trimmed} ${currentYear}`;
        }
      }

      const updatedParams = { ...flow.params, [currentStep.param]: paramValue };
      const nextStep = flow.step + 1;
      const nextFlowStep = FLOWS[flow.type][nextStep];

      if (nextFlowStep?.generate) {
        setIsTyping(true);
        setFlow(null);
        await runGenerate(flow.type, updatedParams);
      } else if (nextFlowStep?.ask) {
        const question =
          typeof nextFlowStep.ask === "function"
            ? nextFlowStep.ask(pageContext?.course)
            : nextFlowStep.ask;
        setFlow({ type: flow.type, step: nextStep, params: updatedParams });
        addMessage("assistant", question);
      }
      return;
    }

    setIsTyping(true);
    abortControllerRef.current = new AbortController();
    const options = { signal: abortControllerRef.current.signal };

    // ── Fast local intent detection ───────────────────────────────────────────
    // Avoid a full remote Gemini call for intent classification on every message.
    // Only call the /intent API if the message explicitly looks like a pure generation
    // trigger (e.g. "generate question bank", "create exam paper").
    // Compound / mixed queries or conversational requests (e.g. containing "but", "also", "first", "code", "?")
    // go straight to copilot-chat so Copilot can respond conversationally with context and draft questions.
    const lowerMsg = msg.toLowerCase();
    const hasMixedIndicators = /\b(but|also|first|then|code|what|why|how|explain)\b/.test(lowerMsg);

    // ── Exam-paper trigger: fires on ANY mention, even in mixed messages ────
    // If the user says anything with "question paper" or "exam paper" in it,
    // always start the structured flow — never send it to general chat.
    const isExamPaperTrigger =
      /\b(exam\s*paper|question\s*paper|exam\s*question|question\s*paper|make.*paper|paper.*exam)\b/.test(lowerMsg);

    if (isExamPaperTrigger) {
      const firstStep = FLOWS.examPaper[0];
      const question = typeof firstStep.ask === "function"
        ? firstStep.ask(pageContext?.course)
        : firstStep.ask;
      setFlow({ type: "examPaper", step: 0, params: {} });
      addMessage("assistant", question);
      setIsTyping(false);
      return;
    }

    const isGenerationTrigger =
      !hasMixedIndicators &&
      /\b(generate|create|build|produce)\b/.test(lowerMsg) &&
      /\b(question\s*bank|quiz|lesson\s*plan|curriculum\s*roadmap)\b/.test(lowerMsg);

    let intentRes = { intent: "general_chat", extractedParams: {} };

    if (isGenerationTrigger) {
      try {
        intentRes = await classifyCopilotIntent(msg, course || pageContext?.course || {}, options);
      } catch (err) {
        if (err.name === 'AbortError') {
          addMessage("assistant", "Execution stopped.", "aborted", () => handleSend(msg));
          setIsTyping(false);
          return;
        }
        intentRes = { intent: "general_chat", extractedParams: {} };
      }
    }

    if (!intentRes.intent || intentRes.intent === "general_chat") {
      // Go straight to copilot-chat — no intent round-trip needed
      const chatHistory = [...messages, { role: "user", content: msg }];
      let chatRes;
      try {
        chatRes = await sendCopilotMessage(
          chatHistory,
          userRole,
          location.pathname,
          "",
          course || pageContext?.course || {},
          options
        );
      } catch (err) {
        if (err.name === 'AbortError') {
          addMessage("assistant", "Execution stopped.", "aborted", () => handleSend(msg));
          setIsTyping(false);
          return;
        }
        throw err;
      }
      addMessage("assistant", chatRes.reply || chatRes.error || "Sorry, I had trouble responding.");
      setIsTyping(false);
      return;
    }

    const flowKey = intentRes.intent === "generate_questions" ? "questions" : "lessonplan";
    const params = intentRes.extractedParams || {};

    // Fast-path: if they provided the main parameters, skip the flow entirely
    if (flowKey === "questions" && params.numQuestions && params.btLevels) {
      addMessage("assistant", `Generating ${params.numQuestions} questions for ${params.btLevels}...`);
      await runGenerate("questions", params);
      return;
    }

    const firstStep = FLOWS[flowKey][0];
    const question =
      typeof firstStep.ask === "function"
        ? firstStep.ask(pageContext?.course)
        : firstStep.ask;

    setFlow({ type: flowKey, step: 0, params });
    addMessage("assistant", question);
    setIsTyping(false);
  };

  const handleQuickAction = (action) => {
    // Bypass AI intent classification — jump directly into the structured flow
    // so the Word export is always triggered correctly.
    const lowerAction = action.toLowerCase();

    let flowKey = null;
    if (lowerAction.includes('exam paper')) {
      flowKey = 'examPaper';
    } else if (lowerAction.includes('question') || lowerAction.includes('bank')) {
      flowKey = 'questions';
    } else if (lowerAction.includes('lesson') || lowerAction.includes('plan')) {
      flowKey = 'lessonplan';
    }

    if (flowKey) {
      addMessage('user', action);
      setInput('');
      setShowPanel(true);
      setIsExpanded(true);
      setIsFocused(true);

      const firstStep = FLOWS[flowKey][0];
      const question =
        typeof firstStep.ask === 'function'
          ? firstStep.ask(pageContext?.course)
          : firstStep.ask;
      setFlow({ type: flowKey, step: 0, params: {} });
      addMessage('assistant', question);
      return;
    }

    // Fallback: treat as a normal chat message
    handleSend(action);
  };

  const handleConfirmDate = () => {
    const val = datePickerRef.current?.value;
    if (!val) {
      datePickerRef.current?.focus();
      return;
    }
    const [y, m, d] = val.split('-');
    const formatted = y && m && d ? `${d}/${m}/${y || currentYear}` : val;
    handleSend(formatted);
  };

  return (
    <div
      ref={wrapperRef}
      className={`copilot-v2 ${isExpanded ? "copilot-v2--expanded" : ""} ${isFocused ? "copilot-v2--focused" : ""} ${showPanel ? "copilot-v2--panel-open" : ""}`}
    >
      {/* Quick action chips */}
      <div className={`copilot-v2__chips ${!showPanel && (isFocused || isExpanded) ? "copilot-v2__chips--visible" : ""}`}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            className="copilot-v2__chip"
            onClick={() => handleQuickAction(action)}
          >
            {action}
          </button>
        ))}
      </div>

      {/* Response panel */}
      {showPanel && (
        <div className="copilot-v2__panel">
          <div className="copilot-v2__panel-header">
            <span className="copilot-v2__panel-title">
              <span className="copilot-v2__dot" />
              Velaar
            </span>
            <button
              type="button"
              className="copilot-v2__panel-close"
              onClick={() => { 
                if (isTyping && abortControllerRef.current) {
                  abortControllerRef.current.abort();
                }
                setShowPanel(false); 
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="copilot-v2__panel-body" ref={panelBodyRef}>
            {(() => {
              const lastUserIdx = messages.map((m) => m.role).lastIndexOf("user");
              const historyMessages =
                lastUserIdx > 0 ? messages.slice(0, lastUserIdx) : [];
              const latestUser =
                lastUserIdx >= 0 ? messages[lastUserIdx] : null;
              const followupMessages =
                lastUserIdx >= 0
                  ? messages.slice(lastUserIdx + 1)
                  : messages;

              const userTurnKey =
                latestUser != null
                  ? `user-${lastUserIdx}-${latestUser.content}`
                  : "user-none";
              const followupTurnKey = `followup-${messages.length}-${flow?.type ?? "n"}-${flow?.step ?? "n"}-${isTyping}`;

              const renderAssistantMessage = (m, i) => (
                <div key={i} className="copilot-v2__message copilot-v2__message--assistant">
                  <span className="copilot-v2__sender copilot-v2__sender--velaar">Velaar</span>
                  <div className={`copilot-v2__reply copilot-v2__reply--${m.status || "normal"}`}>
                    {m.status === "error" && <span style={{ marginRight: "6px" }}>&#9888;</span>}
                    {m.status === "aborted" && <span style={{ marginRight: "6px" }}>&#9888;</span>}
                    {renderMarkdown(m.content)}
                    {m.retryAction && (
                      <button
                        onClick={() => m.retryAction()}
                        style={{
                          marginTop: "8px",
                          padding: "6px 12px",
                          background: "#000",
                          color: "#fff",
                          border: "none",
                          borderRadius: "16px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                        }}
                      >
                        Restart
                      </button>
                    )}
                  </div>
                </div>
              );

              const flowStep = flow ? FLOWS[flow.type]?.[flow.step] : null;
              const showFlowChips =
                flow && !isTyping && flowStep?.chips && flowStep.chips.length > 0;

              return (
                <>
                  {historyMessages.map((m, i) =>
                    m.role === "user" ? (
                      <div key={i} className="copilot-v2__message copilot-v2__message--user">
                        <span className="copilot-v2__sender">You</span>
                        <p className="copilot-v2__user-msg">{m.content}</p>
                      </div>
                    ) : (
                      renderAssistantMessage(m, i)
                    )
                  )}

                  {latestUser && (
                    <div
                      key={userTurnKey}
                      ref={lastUserMsgRef}
                      className="copilot-v2__message copilot-v2__message--user copilot-v2__gemini-in"
                    >
                      <span className="copilot-v2__sender">You</span>
                      <p className="copilot-v2__user-msg">{latestUser.content}</p>
                    </div>
                  )}

                  {(followupMessages.length > 0 ||
                    isTyping ||
                    showFlowChips ||
                    isExamDateStep) && (
                    <div
                      key={followupTurnKey}
                      className="copilot-v2__followup copilot-v2__gemini-in"
                    >
                      {followupMessages.map((m, i) =>
                        renderAssistantMessage(m, lastUserIdx + 1 + i)
                      )}

                      {isTyping && (
                        <div className="copilot-v2__message copilot-v2__message--assistant">
                          <span className="copilot-v2__sender copilot-v2__sender--velaar">Velaar</span>
                          <div className="copilot-v2__wave-dots">
                            <span /><span /><span />
                          </div>
                        </div>
                      )}

                      {showFlowChips && (
                        <div className="copilot-v2__flow-chips">
                          {flowStep.chips.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              className="copilot-flow-chip"
                              onClick={() => {
                                if (flowStep.multiSelect) {
                                  setInput((prev) => (prev ? prev + ", " + chip : chip));
                                  inputRef.current?.focus();
                                } else {
                                  handleSend(chip);
                                }
                              }}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}

                      {isExamDateStep && !isTyping && (
                        <div className="copilot-date-card">
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#444" }}>
                            Exam date ({currentYear})
                          </span>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleConfirmDate();
                            }}
                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                          >
                            <input
                              className="copilot-date-input"
                              type="date"
                              id="copilot-date-picker"
                              ref={datePickerRef}
                              defaultValue={defaultDateStr}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleConfirmDate();
                                }
                              }}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "8px",
                                fontSize: "0.88rem",
                                background: "#fff",
                                color: "#000",
                                colorScheme: "light" as const,
                                cursor: "pointer",
                                width: "145px",
                              }}
                            />
                            <button type="submit" className="copilot-date-submit-btn">
                              Done ↵
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Main pill bar */}
      <form
        className="copilot-v2__bar"
        onClick={() => inputRef.current?.focus()}
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
      >
        <div className="copilot-v2__orbs" aria-hidden="true">
          <div className="copilot-v2__orb copilot-v2__orb--1" />
          <div className="copilot-v2__orb copilot-v2__orb--2" />
          <div className="copilot-v2__orb copilot-v2__orb--3" />
        </div>

        <div className="copilot-v2__icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          className="copilot-v2__input"
          placeholder={userName ? `Ask anything, ${userName}` : "Ask anything"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (messages.length > 0 || flow) setShowPanel(true);
          }}
          autoComplete="off"
        />

        <button
          type="submit"
          className="copilot-v2__send"
          disabled={isTyping}
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default VelaarCopilot;

