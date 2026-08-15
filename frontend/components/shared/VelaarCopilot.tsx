/* eslint-disable */
// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// import { sendCopilotMessage } from "../../services/aiService"; // DISABLED — replaced by task runner
import {
  generateQuestionsFromTopics,
  generateLessonPlan,
  setAiContextCourse,
  classifyCopilotIntent,
  sendCopilotMessage,
} from "../../services/aiService";
import { exportLessonPlanToWord } from "../../utils/wordExport";
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
          new TableCell({ children: [new Paragraph(q.question || "")] }),
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

  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [userName, setUserName] = useState("");
  const [flow, setFlow] = useState(null);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const panelBodyRef = useRef(null);
  const abortControllerRef = useRef(null);

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

  // Auto-scroll panel to bottom on new messages (smooth + bouncy)
  useEffect(() => {
    if (panelBodyRef.current) {
      const el = panelBodyRef.current;
      // Small timeout so DOM has rendered the new message before scrolling
      setTimeout(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }, 50);
    }
  }, [messages, isTyping]);

  const addMessage = (role, content, status = "normal", retryAction = null) => {
    setMessages((prev) => [...prev, { role, content, status, retryAction }]);
  };

  const runGenerate = async (flowType, params) => {
    const course = pageContext?.course;

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

      const completedTopics = [
        ...new Set(allLectures.filter((l) => l.isCompleted).map((l) => l.title)),
      ];

      if (completedTopics.length === 0) {
        addMessage("assistant", "No completed lectures found in your course yet. Mark some lectures as done first, then try again!");
        setIsTyping(false);
        return;
      }

      if (course?.id) setAiContextCourse(course.id, course.subjectName);

      abortControllerRef.current = new AbortController();
      const options = { signal: abortControllerRef.current.signal };

      let questions;
      try {
        questions = await generateQuestionsFromTopics(
          completedTopics,
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
      const currentStep = FLOWS[flow.type][flow.step];
      const updatedParams = { ...flow.params, [currentStep.param]: msg };
      const nextStep = flow.step + 1;
      const nextFlowStep = FLOWS[flow.type][nextStep];

      if (nextFlowStep?.generate) {
        setIsTyping(true);
        setFlow(null);
        // We do not add a message here anymore, the sleek loading UI handles it.
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

    let intentRes;
    try {
      intentRes = await classifyCopilotIntent(msg, pageContext?.course || {}, options);
    } catch (err) {
      if (err.name === 'AbortError') {
        addMessage("assistant", "Execution stopped.", "aborted", () => handleSend(msg));
        setIsTyping(false);
        return;
      }
      throw err;
    }

    if (intentRes.error || !intentRes.intent || intentRes.intent === "general_chat") {
      // Use real AI chat for general responses
      const chatHistory = [...messages, { role: "user", content: msg }];
      let chatRes;
      try {
        chatRes = await sendCopilotMessage(
          chatHistory,
          userRole,
          location.pathname,
          "",
          pageContext?.course || {},
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
    handleSend(action);
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
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="copilot-v2__message copilot-v2__message--user">
                  <span className="copilot-v2__sender">You</span>
                  <p className="copilot-v2__user-msg">{m.content}</p>
                </div>
              ) : (
                <div key={i} className="copilot-v2__message copilot-v2__message--assistant">
                  <span className="copilot-v2__sender copilot-v2__sender--velaar">Velaar</span>
                  <div className={`copilot-v2__reply copilot-v2__reply--${m.status || 'normal'}`}>
                    {m.status === 'error' && <span style={{marginRight: '6px'}}>&#9888;</span>}
                    {m.status === 'aborted' && <span style={{marginRight: '6px'}}>&#9888;</span>}
                    {renderMarkdown(m.content)}
                    {m.retryAction && (
                      <button 
                        onClick={() => m.retryAction()} 
                        style={{marginTop: "8px", padding: "6px 12px", background: "#000", color: "#fff", border: "none", borderRadius: "16px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600"}}
                      >
                        Restart
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
            {isTyping && (
              <div className="copilot-v2__message copilot-v2__message--assistant">
                <span className="copilot-v2__sender copilot-v2__sender--velaar">Velaar</span>
                <div className="copilot-v2__wave-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
            {/* Inline chips for the current flow step */}
            {flow && !isTyping && (() => {
              const step = FLOWS[flow.type][flow.step];
              return step?.chips ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                  {step.chips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        if (step.multiSelect) {
                          setInput((prev) => (prev ? prev + ", " + chip : chip));
                          inputRef.current?.focus();
                        } else {
                          handleSend(chip);
                        }
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "999px",
                        background: "rgba(0,0,0,0.08)",
                        border: "1px solid rgba(0,0,0,0.15)",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        color: "#000",
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              ) : null;
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
          disabled={isTyping}
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

