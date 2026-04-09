import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { generateQuestionsFromTopics } from "../services/aiService";
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
import "./ExamSection.css";

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
  const [numQuestions, setNumQuestions] = useState(10);
  const [numericalCount, setNumericalCount] = useState(0);
  const [numericalPrompt, setNumericalPrompt] = useState("");
  const [selectedBT, setSelectedBT] = useState([]);
  
  const divisions = course?.divisions || ["A"];
  // Now an array to support multiple division selections!
  const [selectedDivs, setSelectedDivs] = useState([divisions[0]]);

  // Handle BT Checkbox toggles
  const handleBTChange = (val) => {
    setSelectedBT((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val],
    );
  };

  // Handle Division Checkbox toggles
  const handleDivChange = (val) => {
    setSelectedDivs((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val],
    );
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
      alert("You haven't finished any lectures in the selected divisions yet! Teach something first.");
      setExamLoading(false);
      return;
    }

    const topics = completedLectures.map((l) => l.title);

    try {
      // Pass the selected inputs to AI
      const questions = await generateQuestionsFromTopics(
        topics,
        numQuestions,
        selectedBT,
        numericalCount,
        numericalPrompt,
        course.pastNumericals || []
      );

      // Extract new numericals to feed back into context memory limit to 5
      const newNumericals = questions.filter(q => q.isNumerical).map(q => q.question);
      let updatedNumericals = [...(course.pastNumericals || [])];
      if (newNumericals.length > 0) {
        updatedNumericals = [...newNumericals, ...updatedNumericals].slice(0, 5);
      }

      // Save to Firestore
      await updateDoc(doc(db, "courses", course.id), {
        activeExam: questions,
        lastExamDate: new Date(),
        pastNumericals: updatedNumericals
      });

      // Trigger Word Download
      await exportToWord(questions);
    } catch (error) {
      alert("Error generating exam: " + error.message);
    }

    setExamLoading(false);
  };

  return (
    <div className="action-card">
      <div className="card-header">
        <h3>Exam Control</h3>
        <p>Create a test based strictly on what you have taught so far.</p>
      </div>

      {/* Settings Panel */}
      {divisions.length > 1 && (
        <div className="settings-group">
          <label className="group-title">Select Handled Division(s)</label>
          {/* Reusing the exact same BT Chip classes here */}
          <div className="bt-chips-container">
            {divisions.map((d) => (
              <label key={d} className="bt-chip">
                <input
                  type="checkbox"
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
        <label className="group-title">Incude Numericals (Max: {numQuestions})</label>
        <input
          type="number"
          min="0"
          max={numQuestions}
          value={numericalCount}
          onChange={(e) => setNumericalCount(Math.min(Number(e.target.value), numQuestions))}
          className="custom-number-input"
          placeholder="0 for Theory Only"
        />
        <p style={{fontSize: '0.8rem', color: '#94a3b8', marginTop: '5px'}}>
          {numericalCount > 0 ? `Velaar will generate ${numericalCount} numericals & ${numQuestions - numericalCount} theory questions.` : "Theory-only question bank will be generated."}
        </p>
      </div>

      {numericalCount > 0 && (
        <div className="settings-group">
          <label className="group-title">Numerical Guidance</label>
          <textarea
            className="custom-number-input"
            style={{ width: '100%', minHeight: '100px', padding: '12px', fontSize: '0.9rem', resize: 'vertical' }}
            placeholder={"Option A — \"Make me a numerical on breadth first search\"\nOption B — Paste an actual breadth first search sum: \"Q: adj = [[1,2], [0,2]] find BFS.\""}
            value={numericalPrompt}
            onChange={(e) => setNumericalPrompt(e.target.value)}
          />
          <p style={{fontSize: '0.75rem', color: '#94a3b8', marginTop: '5px'}}>
            <em>*Works for any subject. Paste a topic for fresh problems, or paste a full example and the AI will rewrite it with different values.</em>
          </p>
        </div>
      )}

      <div className="settings-group">
        <label className="group-title">Prioritize BT Levels</label>
        <div className="bt-chips-container">
          {BT_OPTIONS.map((bt) => (
            <label key={bt.value} className="bt-chip">
              <input
                type="checkbox"
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
        className="generate-btn"
        onClick={handleGenerateExam}
        disabled={examLoading}
      >
        {examLoading ? "Velaar AI is generating Word Doc..." : "Generate Question Bank"}
      </button>
    </div>
  );
};

export default ExamSection;