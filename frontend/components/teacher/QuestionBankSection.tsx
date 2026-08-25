/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../services/supabase";
import { generateQuestionsFromTopics, setAiContextCourse } from "../../services/aiService";
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
import "./QuestionBankSection.css";

const BT_OPTIONS = [
  { label: "Remember (R)", value: "R" },
  { label: "Understand (U)", value: "U" },
  { label: "Apply (Ap)", value: "Ap" },
  { label: "Analyze (An)", value: "An" },
  { label: "Evaluate (E)", value: "E" },
  { label: "Create (C)", value: "C" },
];

const ExamSection = ({ course }) => {
  const [examLoading, setExamLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [numQuestions, setNumQuestions] = useState(10);
  const [numericalCount, setNumericalCount] = useState(0);
  const [numericalPrompt, setNumericalPrompt] = useState("");
  const [selectedBT, setSelectedBT] = useState([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const divisions = course?.divisions || ["A"];
  // Now an array to support multiple division selections!
  const [selectedDivs, setSelectedDivs] = useState([divisions[0]]);

  // Handle BT Checkbox toggles
  const handleBTChange = (val) => {
    setSelectedBT((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val],
    );
  };

  const handleDivChange = (val) => {
    setSelectedDivs((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val],
    );
  };

  useEffect(() => {
    let interval;
    if (examLoading) {
      interval = setInterval(() => setTimer((prev) => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [examLoading]);

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // --- WORD DOCUMENT GENERATOR ---
  const exportToWord = async (questions) => {
    // 1. Create Table Header with the new CO column
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Q. No.", bold: true })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Question", bold: true })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Course Outcome (CO)", bold: true }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "BT Level", bold: true })],
              }),
            ],
          }),
        ],
      }),
    ];

    // 2. Add Questions to Table including the CO data
    questions.forEach((q, index) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph((index + 1).toString())],
            }),
            new TableCell({ children: [new Paragraph(q.question)] }),
            new TableCell({
              children: [new Paragraph(q.courseOutcome || "CO1")],
            }), // Fallback just in case
            new TableCell({ children: [new Paragraph(q.btLevel)] }),
          ],
        }),
      );
    });

    // 3. Build Document
    const docToExport = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${course.subjectName || "Course"} - Question Bank`,
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph(""), // Blank line
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          ],
        },
      ],
    });

    // 4. Download
    const blob = await Packer.toBlob(docToExport);
    saveAs(blob, `${course.subjectName || "Subject"}_Question_Bank.docx`);
  };

  const handleGenerateExam = async () => {
    setExamLoading(true);
    setTimer(0);

    let allLectures = [];
    if (course?.roadmap) {
      if (Array.isArray(course.roadmap)) {
        allLectures = course.roadmap;
      } else {
        // Merge lectures from ALL selected divisions
        selectedDivs.forEach((div) => {
          if (course.roadmap[div]) {
            allLectures = [...allLectures, ...course.roadmap[div]];
          }
        });
      }
    }

    const uniqueTopics = new Set();
    const completedLectures = [];

    allLectures.forEach((l) => {
      if (l.isCompleted && !uniqueTopics.has(l.title)) {
        uniqueTopics.add(l.title);
        completedLectures.push(l);
      }
    });

    if (completedLectures.length === 0) {
      showToast("You haven't finished any lectures in the selected divisions yet! Teach something first.", "error");
      setExamLoading(false);
      return;
    }

    const topics = completedLectures.map((l) => l.title);

    try {
      // Pass the active subject name and course ID to the AI context logger
      setAiContextCourse(course.id, course.subjectName);

      // Pass the selected inputs to AI
      const questions = await generateQuestionsFromTopics(
        topics,
        numQuestions,
        selectedBT,
        numericalCount,
        numericalPrompt,
        course.past_numericals || course.pastNumericals || []
      );

      if (!questions || questions.error || !Array.isArray(questions)) {
        throw new Error(questions?.error || "AI could not generate questions. Check backend connectivity.");
      }

      if (questions.length === 0) {
        throw new Error("AI returned an empty question bank.");
      }

      // Extract new numericals to feed back into context memory limit to 5
      const newNumericals = questions.filter(q => q.isNumerical).map(q => q.question);
      let updatedNumericals = [...(course.past_numericals || course.pastNumericals || [])];
      if (newNumericals.length > 0) {
        updatedNumericals = [...newNumericals, ...updatedNumericals].slice(0, 5);
      }

      // Create a master log of ALL questions ever generated (no overwriting)
      const generationTimestamp = new Date().toISOString();
      const newQuestionsWithMeta = questions.map(q => ({ ...q, generatedAt: generationTimestamp }));
      const existingQuestionBank = course.question_bank || course.questionBank || [];
      const updatedQuestionBank = [...existingQuestionBank, ...newQuestionsWithMeta];

      // Save to Supabase
      await supabase.from("courses").update({
        active_exam: questions,
        question_bank: updatedQuestionBank,
        last_exam_date: new Date().toISOString(),
        past_numericals: updatedNumericals
      }).eq("id", course.id);

      // Trigger Word Download
      await exportToWord(questions);
      showToast("Question bank generated & downloaded successfully!", "success");
    } catch (error) {
      console.error("Error generating exam:", error);
      showToast(error.message || "Error generating question bank.", "error");
    }

    setExamLoading(false);
  };

  return (
    <div className="action-card">

      {/* Settings Panel */}
      {divisions.length > 1 && (
        <div className="settings-group">
          <label className="group-title">Select Handled Division(s)</label>
          {/* Reusing the exact same BT Chip classes here */}
          <div className="bt-chips-container">
            {divisions.map((d) => (
              <label key={d} className="bt-chip" style={{ cursor: examLoading ? 'not-allowed' : 'pointer', opacity: examLoading ? 0.7 : 1 }}>
                <input
                  type="checkbox"
                  disabled={examLoading}
                  value={d}
                  checked={selectedDivs.includes(d)}
                  onChange={() => handleDivChange(d)}
                />
                <span className="chip-text">Div {d}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="settings-group">
        <label className="group-title">Number of Questions</label>
        <input
          type="number"
          disabled={examLoading}
          min="1"
          max="50"
          value={numQuestions}
          onChange={(e) => {
            const val = Number(e.target.value);
            setNumQuestions(val);
            if (numericalCount > val) setNumericalCount(val);
          }}
          className="custom-number-input"
        />
      </div>

      <div className="settings-group">
        <label className="group-title">Include Numericals (Max: {numQuestions})</label>
        <input
          type="number"
          disabled={examLoading}
          min="0"
          max={numQuestions}
          value={numericalCount}
          onChange={(e) => setNumericalCount(Math.min(Number(e.target.value), numQuestions))}
          className="custom-number-input"
          placeholder="0 for Theory Only"
        />
        <p style={{ fontSize: '0.8rem', color: '#ffffff', opacity: 0.8, marginTop: '5px' }}>
          {numericalCount > 0 ? `Velaar will generate ${numericalCount} numericals & ${numQuestions - numericalCount} theory questions.` : "Theory-only question bank will be generated."}
        </p>
      </div>

      {numericalCount > 0 && (
        <div className="settings-group">
          <label className="group-title">Numerical Guidance</label>
          <textarea
            disabled={examLoading}
            className="custom-number-input"
            style={{ width: '100%', minHeight: '100px', padding: '12px', fontSize: '0.9rem', resize: 'vertical' }}
            placeholder={"Option A — \"Make me a numerical on breadth first search\"\nOption B — Paste an actual breadth first search sum: \"Q: adj = [[1,2], [0,2]] find BFS.\""}
            value={numericalPrompt}
            onChange={(e) => setNumericalPrompt(e.target.value)}
          />
          <p style={{ fontSize: '0.75rem', color: '#ffffff', opacity: 0.8, marginTop: '5px' }}>
            <em>*Works for any subject. Paste a topic for fresh problems, or paste a full example and the AI will rewrite it with different values.</em>
          </p>
        </div>
      )}

      <div className="settings-group">
        <label className="group-title">Prioritize BT Levels</label>
        <div className="bt-chips-container">
          {BT_OPTIONS.map((bt) => (
            <label key={bt.value} className="bt-chip" style={{ cursor: examLoading ? 'not-allowed' : 'pointer', opacity: examLoading ? 0.7 : 1 }}>
              <input
                type="checkbox"
                disabled={examLoading}
                value={bt.value}
                checked={selectedBT.includes(bt.value)}
                onChange={() => handleBTChange(bt.value)}
              />
              <span className="chip-text">{bt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        className={`generate-btn ${examLoading ? 'glass-btn--loading' : ''}`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        onClick={handleGenerateExam}
        disabled={examLoading}
      >
        {examLoading && <span className="ppt-spinner" />}
        {examLoading ? `Generating Question Bank... (${formatTime(timer)})` : "Generate Question Bank"}
      </button>

      {/* Toast Notification — Portaled to document.body */}
      {toast && createPortal(
        <div className={`em-toast em-toast--${toast.type}`}>
          <span className="em-toast__dot" />
          <span className="em-toast__msg">{toast.message}</span>
          <span className="em-toast__close" onClick={() => setToast(null)}>×</span>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ExamSection;

