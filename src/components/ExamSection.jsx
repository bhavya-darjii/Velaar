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
  const [selectedBT, setSelectedBT] = useState([]);

  // Handle Checkbox toggles
  const handleBTChange = (val) => {
    setSelectedBT((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val],
    );
  };

  // --- WORD DOCUMENT GENERATOR ---
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

    const completedLectures =
      course?.roadmap?.filter((l) => l.isCompleted) || [];

    if (completedLectures.length === 0) {
      alert("You haven't finished any lectures yet! Teach something first.");
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
      );

      // Save to Firestore
      await updateDoc(doc(db, "courses", course.id), {
        activeExam: questions,
        lastExamDate: new Date(),
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
      <div className="settings-group">
        <label className="group-title">Number of Questions</label>
        <input
          type="number"
          min="1"
          max="50"
          value={numQuestions}
          onChange={(e) => setNumQuestions(Number(e.target.value))}
          className="custom-number-input"
        />
      </div>

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
        {examLoading ? "AI Generating Word Doc..." : "Generate Question Bank"}
      </button>
    </div>
  );
};

export default ExamSection;
