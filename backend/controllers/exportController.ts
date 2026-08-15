/* eslint-disable */
// @ts-nocheck
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign } from "docx";
import { logAiUsage } from '../utils/logAiUsage.js';

const hText = (text, bold = false) => new Paragraph({ 
  children: [new TextRun({ text: String(text || ""), bold, size: 24, font: "Arial" })],
  alignment: AlignmentType.CENTER
});

const cell = (text, opts = {}) => new TableCell({
  children: [new Paragraph({ 
    children: [new TextRun({ text: String(text || ""), bold: opts.bold || false, size: opts.size || 20, font: "Arial" })],
    alignment: opts.align || AlignmentType.LEFT
  })],
  verticalAlign: opts.vAlign || VerticalAlign.CENTER,
  margins: { top: 100, bottom: 100, left: 100, right: 100 },
  columnSpan: opts.colSpan || 1,
  rowSpan: opts.rowSpan || 1,
  width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
  shading: opts.bg ? { fill: opts.bg } : undefined
});

const defaultMethodologies = [
  "Direct Instruction (PPT/Black board based) DI",
  "Flipped Classrooms FC",
  "Cooperative method (please specify technique used)",
  "Game-based Learning",
  "Role Play",
  "Problem based",
  "Brain storming",
  "Any Other"
];

const defaultActivities = [
  { sr: "1.", name: "Expert Talk on subject", date: "March 2026", venue: "Class room", co: "1 to 6" }
];

const defaultTermTests = [
  { q: "1 a", bt1: "Understanding/Applying", co1: "CO1", bt2: "Understanding/Applying", co2: "CO4" },
  { q: "1 b", bt1: "Understanding/Applying", co1: "CO1", bt2: "Understanding/Applying", co2: "CO4" },
  { q: "1 c", bt1: "Understanding/Applying", co1: "CO1", bt2: "Understanding/Applying", co2: "CO4" },
  { q: "2 a", bt1: "Understanding/Applying", co1: "CO2", bt2: "Understanding/Applying", co2: "CO5" },
  { q: "2 b", bt1: "Understanding/Applying", co1: "CO2", bt2: "Understanding/Applying", co2: "CO5" },
  { q: "3 a", bt1: "Understanding/Applying", co1: "CO3", bt2: "Understanding/Applying", co2: "CO6" },
  { q: "3 b", bt1: "Understanding/Applying", co1: "CO3", bt2: "Understanding/Applying", co2: "CO6" }
];

const defaultEndSem = [
  { 
    c1: { q: "1A", bt: "Understanding/Applying", co: "CO1" },
    c2: { q: "2B", bt: "Understanding/Applying", co: "CO5" },
    c3: { q: "3C", bt: "Understanding/Applying", co: "CO3" }
  },
  { 
    c1: { q: "1B", bt: "Understanding/Applying", co: "CO2" },
    c2: { q: "2C", bt: "Understanding/Applying", co: "CO6" },
    c3: { q: "4A", bt: "Understanding/Applying", co: "CO4" }
  },
  { 
    c1: { q: "1C", bt: "Understanding/Applying", co: "CO3" },
    c2: { q: "3A", bt: "Understanding/Applying", co: "CO1" },
    c3: { q: "4B", bt: "Understanding/Applying", co: "CO5" }
  },
  { 
    c1: { q: "2A", bt: "Understanding/Applying", co: "CO4" },
    c2: { q: "3B", bt: "Understanding/Applying", co: "CO2" },
    c3: { q: "4C", bt: "Understanding/Applying", co: "CO3" }
  }
];

export const exportLessonPlanToWord = async (req, res) => {
  try {
    const { course, lp } = req.body;
    const sections = [];

  // --- 1. Header ---
  const currentYear = new Date().getFullYear();
  const defaultYear = `${currentYear}-${String(currentYear + 1).slice(-2)}`;
  const acYear = lp.academicYear || defaultYear;
  const divs = lp.divisions || (course.divisions && course.divisions.length > 0 ? course.divisions.join(" & ") : "A");

  sections.push(
    new Paragraph({
      children: [new TextRun({ text: `${course.subjectName || "Subject"} (${acYear}) - Faculty: Prof. ${course.teacherName || lp.facultyName || course.professorName || "Unknown"}`, bold: true, size: 28, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Semester: ${lp.semester || "-"} | Divisions: ${divs} | Course Code: ${lp.courseCode || "-"}`, bold: true, size: 24, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  );

  // --- 2. Course Description ---
  sections.push(
    new Paragraph({ children: [new TextRun({ text: "Course Description:", bold: true, size: 24, font: "Arial" })], spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: lp.courseDescription || "-", size: 22, font: "Arial" })], spacing: { after: 400 } })
  );

  // --- 3. Unit Wise Outcomes ---
  sections.push(new Paragraph({ children: [new TextRun({ text: "Unit wise Outcomes:", bold: true, size: 24, font: "Arial" })], spacing: { after: 200 } }));
  const unitRows = [
    new TableRow({ children: [
      cell("Unit No", {bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"}), 
      cell("Unit", {bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"}),
      cell("Outcomes", {bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"}),
      cell("Teaching Practice", {bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"}),
      cell("Evaluation Methods", {bold: true, colSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"}),
      cell("BT level", {bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"})
    ]}),
    new TableRow({ children: [
        cell("Formative", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), 
        cell("Summative", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"})
    ]})
  ];
  const modulesToUse = course.modules || [];
  modulesToUse.forEach((mod, idx) => {
    const rawUnit = lp.unitOutcomes?.[idx] || {};
    const unitNo = rawUnit.unit || `Unit ${idx + 1}`;
    const unitTitle = mod.name || rawUnit.unit || "-";
    const uOutcomes = rawUnit.outcomes || "-";
    const tPractice = rawUnit.teachingPractice || "-";
    const formative = rawUnit.formative || "-";
    const summative = rawUnit.summative || "-";
    const btLevel = rawUnit.btLevel || "-";
    
    unitRows.push(new TableRow({ children: [
      cell(unitNo, {align: AlignmentType.CENTER}), 
      cell(unitTitle),
      cell(uOutcomes),
      cell(tPractice),
      cell(formative),
      cell(summative),
      cell(btLevel, {bold: true, align: AlignmentType.CENTER})
    ]}));
  });
  sections.push(new Table({ rows: unitRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  sections.push(new Paragraph({ spacing: { after: 400 } }));

  // --- 4. Teaching Methodologies ---
  sections.push(new Paragraph({ children: [new TextRun({ text: "Teaching Methodologies:", bold: true, size: 24, font: "Arial" })], spacing: { after: 200 } }));
  const methods = Array.isArray(lp.teachingMethodologies) ? lp.teachingMethodologies : defaultMethodologies;
  methods.forEach((tm, i) => {
    sections.push(new Paragraph({ children: [new TextRun({ text: `${tm}`, size: 22, font: "Arial" })], bullet: { level: 0 } }));
  });
  sections.push(new Paragraph({ spacing: { after: 400 } }));

  // --- 5. Program Outcomes ---
  sections.push(new Paragraph({ children: [new TextRun({ text: "Program Outcomes:", bold: true, size: 24, font: "Arial" })], spacing: { after: 200 } }));
  const poRows = [new TableRow({ children: [cell("PO No", {bold: true, width: 15, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Program Outcomes", {bold: true, width: 85, align: AlignmentType.CENTER, bg: "F0F0F0"})]})];
  (lp.programOutcomes || []).forEach((po, idx) => {
    if (typeof po === "string") {
      const split = po.split(":");
      poRows.push(new TableRow({ children: [cell(split[0] || "-", {align: AlignmentType.CENTER}), cell(split.slice(1).join(":") || "-")] }));
    } else if (typeof po === 'object' && po !== null) {
      poRows.push(new TableRow({ children: [cell(po.code || `PO${idx+1}`, {align: AlignmentType.CENTER}), cell(po.title || "-")] }));
    } else {
      poRows.push(new TableRow({ children: [cell(`PO${idx+1}`, {align: AlignmentType.CENTER}), cell(String(po))] }));
    }
  });
  sections.push(new Table({ rows: poRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  sections.push(new Paragraph({ spacing: { after: 400 } }));

  // --- 6. Course Outcomes ---
  if(lp.courseOutcomes) {
    sections.push(new Paragraph({ children: [new TextRun({ text: "Course Outcomes:", bold: true, size: 24, font: "Arial" })], spacing: { after: 200 } }));
    const coRows = [new TableRow({ children: [cell("CO No", {bold: true, width: 15, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Course outcomes", {bold: true, width: 65, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("PO Mapped", {bold: true, width: 20, align: AlignmentType.CENTER, bg: "F0F0F0"})]})];
    lp.courseOutcomes.forEach((co, idx) => {
      coRows.push(new TableRow({ children: [cell(`CO.${idx+1}`, {bold: true, align: AlignmentType.CENTER}), cell(co.description || ""), cell(co.mappedPOs || "", {bold: true, align: AlignmentType.CENTER})] }));
    });
    sections.push(new Table({ rows: coRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    sections.push(new Paragraph({ spacing: { after: 400 } }));
  }

  // --- 7. Course Assessment Planning ---
  if (lp.assessmentPlanning) {
    sections.push(new Paragraph({ children: [new TextRun({ text: "Course Assessment Planning:", bold: true, size: 24, font: "Arial" })], spacing: { after: 200 } }));
    const capRows = [
      new TableRow({ children: [cell("Course outcomes", {bold: true, rowSpan: 4, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Assessment Method", {bold: true, colSpan: 8, align: AlignmentType.CENTER, bg: "F0F0F0"})] }),
      new TableRow({ children: [cell("Formative", {bold: true, colSpan: 3, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Summative", {bold: true, colSpan: 5, align: AlignmentType.CENTER, bg: "F0F0F0"})] }),
      new TableRow({ children: [cell("", {rowSpan: 2}), cell("", {rowSpan: 2}), cell("", {rowSpan: 2}), cell("Continuous assessment of 10 marks", {bold: true, colSpan: 3, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Term Tests", {bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("End semester exam", {bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"})] }),
      new TableRow({ children: [cell("-", {align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("-", {align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("-", {align: AlignmentType.CENTER, bg: "F0F0F0"})] })
    ];
    lp.assessmentPlanning.forEach(row => {
      capRows.push(new TableRow({ children: [cell(row.co, {bold: true, align: AlignmentType.CENTER}), cell(row.f1, {align: AlignmentType.CENTER}), cell(row.f2, {align: AlignmentType.CENTER}), cell(row.f3, {align: AlignmentType.CENTER}), cell(row.s1, {align: AlignmentType.CENTER}), cell(row.s2, {align: AlignmentType.CENTER}), cell(row.s3, {align: AlignmentType.CENTER}), cell(row.termTest, {align: AlignmentType.CENTER}), cell(row.endSem, {align: AlignmentType.CENTER})] }));
    });
    sections.push(new Table({ rows: capRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    sections.push(new Paragraph({ spacing: { after: 400 } }));
  }

  // --- 8. Books ---
  const textBooks = Array.isArray(lp.textBooks) ? lp.textBooks : [];
  const referenceBooks = Array.isArray(lp.referenceBooks) ? lp.referenceBooks : [];
  if (textBooks.length > 0 || referenceBooks.length > 0) {
    if (textBooks.length > 0) {
      sections.push(new Paragraph({ children: [new TextRun({ text: "Text Books:", bold: true, size: 24, font: "Arial" })], spacing: { after: 200 } }));
      textBooks.forEach(b => sections.push(new Paragraph({ children: [new TextRun({ text: String(b || ""), size: 22, font: "Arial" })], bullet: { level: 0 } })));
      sections.push(new Paragraph({ spacing: { after: 200 } }));
    }
    if (referenceBooks.length > 0) {
      sections.push(new Paragraph({ children: [new TextRun({ text: "Reference Books:", bold: true, size: 24, font: "Arial" })], spacing: { after: 200 } }));
      referenceBooks.forEach(b => sections.push(new Paragraph({ children: [new TextRun({ text: String(b || ""), size: 22, font: "Arial" })], bullet: { level: 0 } })));
      sections.push(new Paragraph({ spacing: { after: 400 } }));
    }
  }

  // --- 9. Day Wise Plans ---
  if(Array.isArray(lp.dayWiseEnrichment) && lp.dayWiseEnrichment.length > 0) {
    const divs = course.divisions && course.divisions.length > 0 ? course.divisions : ["A"];
    
    // Formatting parser mirroring UI
    const fd = (dateString) => {
      if (!dateString) return "";
      if (dateString.includes('/')) return dateString; 
      if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
         const [y, m, d] = dateString.split('T')[0].split('-');
         return `${d}/${m}/${y}`;
      }
      let d = new Date(`${dateString}, ${new Date().getFullYear()}`);
      if (isNaN(d.getTime())) d = new Date(dateString);
      if (!isNaN(d.getTime())) {
         return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
      return dateString;
    };

    divs.forEach(div => {
      sections.push(new Paragraph({ children: [new TextRun({ text: `Day Wise Plan (Div-${div})`, bold: true, size: 24, font: "Arial" })], spacing: { after: 200 } }));
      
      const dwRows = [
        new TableRow({ children: [cell("Sr.No", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Topic", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Lecture No", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Books referred", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Proposed Date", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Actual Date", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Teaching method", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("BT", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}) ] })
      ];

      const rawRoadmap = Array.isArray(course.roadmap) ? course.roadmap : (course.roadmap?.[div] || []);
      const processedRoadmap = rawRoadmap.map((lec, idx) => ({ ...lec, modIdentifier: lec.moduleName || String(lec.module) || `Mod-${Math.floor(idx/6)}` }));

      processedRoadmap.forEach((lec, idx) => {
         const enrichment = lp.dayWiseEnrichment[idx] || { books: "-", bt: "-", method: "Black Board & PPT/DI" };
         const mapDates = lp.dayWiseDates?.[div]?.[idx] || { proposed: lec.date, actual: lec.date };
         const localLecNo = processedRoadmap.slice(0, idx + 1).filter(l => l.modIdentifier === lec.modIdentifier).length;
         const firstModuleIdx = processedRoadmap.findIndex(l => l.modIdentifier === lec.modIdentifier);
         const moduleBT = lp.dayWiseEnrichment[firstModuleIdx]?.bt || enrichment.bt || "-";

         dwRows.push(new TableRow({ children: [
           cell(idx + 1, {bold: true, align: AlignmentType.CENTER}),
           cell(lec.title || "-", {size: 18}),
           cell(localLecNo, {bold: true, align: AlignmentType.CENTER}),
           cell(enrichment.books || "-", {align: AlignmentType.CENTER, size: 18}),
           cell(fd(mapDates.proposed || lec.date), {align: AlignmentType.CENTER, size: 18}),
           cell(fd(mapDates.actual || lec.date), {align: AlignmentType.CENTER, size: 18}),
           cell(enrichment.method || "-", {align: AlignmentType.CENTER, size: 18}),
           cell(moduleBT, {align: AlignmentType.CENTER, size: 18})
         ]}));
      });
      sections.push(new Table({ rows: dwRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      sections.push(new Paragraph({ spacing: { after: 400 } }));
    });
  }

  // --- 10. Activities Planned ---
  sections.push(new Paragraph({ children: [new TextRun({ text: "Activities Planned if any (optional)", bold: true, size: 24, font: "Arial" })], spacing: { after: 200 } }));
  const apRows = [
    new TableRow({ children: [cell("Sr. No", {bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Activity Details", {bold: true, colSpan: 4, align: AlignmentType.CENTER, bg: "F0F0F0"})] }),
    new TableRow({ children: [cell("Name of the Event (Expert Talk/Workshop/seminar/Industrial Visit /GD etc)", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Date", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Venue", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("CO.NO", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"})] })
  ];
  (lp.activitiesPlanned || defaultActivities).forEach((row) => {
    apRows.push(new TableRow({ children: [cell(row.sr, {bold: true, align: AlignmentType.CENTER}), cell(row.name, {align: AlignmentType.CENTER}), cell(row.date, {align: AlignmentType.CENTER}), cell(row.venue, {align: AlignmentType.CENTER}), cell(row.co, {align: AlignmentType.CENTER})] }));
  });
  sections.push(new Table({ rows: apRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  sections.push(new Paragraph({ spacing: { after: 400 } }));

  // --- 11. Question Paper / Term Test Analysis ---
  sections.push(new Paragraph({ children: [new TextRun({ text: "Question Paper and CO analysis", bold: true, size: 24, font: "Arial" })], spacing: { after: 200 } }));
  const ttRows = [
    new TableRow({ children: [cell("Q. No", {bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Term Test 1", {bold: true, colSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Term Test 2", {bold: true, colSpan: 2, align: AlignmentType.CENTER, bg: "F0F0F0"})] }),
    new TableRow({ children: [cell("BT Level", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("CO", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("BT Level", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("CO", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"})] })
  ];
  (lp.termTestsAnalysis || defaultTermTests).forEach((row) => {
    ttRows.push(new TableRow({ children: [cell(row.q, {bold: true, align: AlignmentType.CENTER}), cell(row.bt1, {align: AlignmentType.CENTER}), cell(row.co1, {align: AlignmentType.CENTER}), cell(row.bt2, {align: AlignmentType.CENTER}), cell(row.co2, {align: AlignmentType.CENTER})] }));
  });
  sections.push(new Table({ rows: ttRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  sections.push(new Paragraph({ spacing: { after: 400 } }));

  // --- 12. End Semester Analysis ---
  const esRows = [
    new TableRow({ children: [cell("End Semester", {bold: true, colSpan: 3, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("End Semester", {bold: true, colSpan: 3, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("End Semester", {bold: true, colSpan: 3, align: AlignmentType.CENTER, bg: "F0F0F0"})] }),
    new TableRow({ children: [cell("Question No.", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("BT Level", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("CO", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Question No.", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("BT Level", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("CO", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("Question No.", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("BT Level", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}), cell("CO", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"})] })
  ];
  (lp.endSemAnalysis || defaultEndSem).forEach((row) => {
    esRows.push(new TableRow({ children: [
      cell(row.c1.q, {bold: true, align: AlignmentType.CENTER}), cell(row.c1.bt, {align: AlignmentType.CENTER, size: 16}), cell(row.c1.co, {align: AlignmentType.CENTER}),
      cell(row.c2.q, {bold: true, align: AlignmentType.CENTER}), cell(row.c2.bt, {align: AlignmentType.CENTER, size: 16}), cell(row.c2.co, {align: AlignmentType.CENTER}),
      cell(row.c3.q, {bold: true, align: AlignmentType.CENTER}), cell(row.c3.bt, {align: AlignmentType.CENTER, size: 16}), cell(row.c3.co, {align: AlignmentType.CENTER})
    ]}));
  });
  sections.push(new Table({ rows: esRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  sections.push(new Paragraph({ spacing: { after: 400 } }));

  // --- 13. CO-PO MAPPING TABLE ---
  if (lp.courseOutcomes && lp.programOutcomes) {
    sections.push(new Paragraph({ children: [new TextRun({ text: "Co Mapping with PO", bold: true, size: 24, font: "Arial" })], spacing: { after: 200 } }));
    
    // Header Row
    const headerCells = [ cell("", { bg: "F0F0F0" }) ];
    lp.programOutcomes.forEach((po, idx) => {
      const poLabel = typeof po === "string" ? po.split(":")[0] : (po.code || `PO${idx+1}`);
      headerCells.push(cell(poLabel, {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}));
    });
    headerCells.push(cell("PSO1", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}));
    headerCells.push(cell("PSO2", {bold: true, align: AlignmentType.CENTER, bg: "F0F0F0"}));
    
    const mappingRows = [new TableRow({ children: headerCells })];

    lp.courseOutcomes.forEach((co, cIdx) => {
      const rowCells = [cell(`CO${cIdx+1}`, {bold: true, align: AlignmentType.CENTER})];
      
      lp.programOutcomes.forEach((po, pIdx) => {
        const poLabel = typeof po === "string" ? po.split(":")[0] : (po.code || `PO${pIdx+1}`);
        const isMapped = (co.mappedPOs || "").toUpperCase().includes(poLabel.toUpperCase());
        const defaultVal = isMapped ? "3" : "";
        const val = (lp.coPoMapping || {})[`CO${cIdx+1}_${poLabel}`] !== undefined ? (lp.coPoMapping || {})[`CO${cIdx+1}_${poLabel}`] : defaultVal;
        rowCells.push(cell(val, {align: AlignmentType.CENTER}));
      });
      
      const pso1Val = (lp.coPoMapping || {})[`CO${cIdx+1}_PSO1`] !== undefined ? (lp.coPoMapping || {})[`CO${cIdx+1}_PSO1`] : ((co.mappedPOs || "").toUpperCase().includes("PSO1") ? "3" : "");
      const pso2Val = (lp.coPoMapping || {})[`CO${cIdx+1}_PSO2`] !== undefined ? (lp.coPoMapping || {})[`CO${cIdx+1}_PSO2`] : ((co.mappedPOs || "").toUpperCase().includes("PSO2") ? "3" : "");

      rowCells.push(cell(pso1Val, {align: AlignmentType.CENTER}));
      rowCells.push(cell(pso2Val, {align: AlignmentType.CENTER}));
      
      mappingRows.push(new TableRow({ children: rowCells }));
    });
    
    sections.push(new Table({ rows: mappingRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    sections.push(new Paragraph({ spacing: { after: 400 } }));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  
  res.setHeader('Content-Disposition', `attachment; filename="${course.subjectName || "Subject"}_Lesson_Plan.docx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(buffer);
  
  } catch (error) {
    console.error("Docx Gen Error:", error);
    res.status(500).json({ error: "Failed to generate Word document." });
  }
};

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

if (fs.existsSync(path.resolve(process.cwd(), 'server', '.env'))) {
    dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });
} else {
    dotenv.config();
}

export const exportTemplatedExam = async (req, res) => {
  try {
    const { course, examType, pattern, headerConfig, numSets = 1, division = "A", generationMode = "ai", numericalPrompt = "", pastNumericals = [] } = req.body;

    if (!pattern || pattern.length === 0) {
      return res.status(400).json({ error: "No paper pattern found." });
    }

    const { date, duration, maxMarks, scheme, academicYear, semester } = headerConfig || {
      date: new Date().toLocaleDateString(), duration: "02.5 Hours", maxMarks: "60", scheme: "III", academicYear: "SY", semester: "IV"
    };

    const regularExam = headerConfig?.regularExam || `${academicYear || "SY"} Semester: ${semester || "IV"}`;

    // 1. Gather Syllabus Topics
    let topics = [];
    if (course.roadmap && course.roadmap.modules) {
      course.roadmap.modules.forEach(mod => {
        topics.push(...mod.topics.map(t => t.title));
      });
    } else if (Array.isArray(course.roadmap)) {
      topics = course.roadmap.map(l => l.title);
    } else if (course.roadmap && course.roadmap[division]) {
      topics = course.roadmap[division].map(l => l.title);
    } else if (course.modules) {
      topics = course.modules.map(m => m.name);
    }
    const topicsList = topics.join(", ");

    // Detect if the numericalPrompt looks like a full example/problem
    const looksLikeExample = numericalPrompt && (
      numericalPrompt.includes('?') || 
      numericalPrompt.length > 50 || 
      numericalPrompt.includes('=') || 
      numericalPrompt.includes('[') ||
      numericalPrompt.includes('adj') ||
      numericalPrompt.includes('graph') ||
      numericalPrompt.includes('node') ||
      /\d/.test(numericalPrompt)
    );

    // Build the dynamic prompt request structure based on the user's exact pattern.
    let theoryStructureMap = {};
    let numericalStructureMap = {};
    
    let hasTheory = false;
    let hasNumerical = false;

    pattern.forEach((q) => {
       q.subs.forEach(sub => {
           let internalId = `Q${q.id}_${sub.id}`;
           let assignedCo = sub.co ? `CO${sub.co}` : "Auto";
           let coInstruction = assignedCo === "Auto" 
                ? `[String: Determine the most logical Course Outcome (e.g., CO1, CO2, CO3) that aligns with this question]` 
                : assignedCo;

           let qInstructionTheory = assignedCo === "Auto"
                ? `[String: Write a ${sub.marks}-mark THEORETICAL/CONCEPTUAL question testing ${sub.bt} concepts about the syllabus topics. Do NOT include calculations.]`
                : `[String: Write a ${sub.marks}-mark THEORETICAL/CONCEPTUAL question testing ${sub.bt} concepts SPECIFICALLY addressing ${assignedCo}. Do NOT include calculations.]`;

           let qInstructionNumerical = assignedCo === "Auto"
                ? `[String: MANDATORY mathematical/numerical problem. EVERY numerical must require concrete calculation/algorithmic trace.]`
                : `[String: MANDATORY mathematical/numerical problem SPECIFICALLY addressing ${assignedCo}. EVERY numerical must require concrete calculation/algorithmic trace.]`;

           if (sub.isNumerical) {
               hasNumerical = true;
               numericalStructureMap[internalId] = {
                 q: qInstructionNumerical,
                 co: coInstruction
               };
           } else {
               hasTheory = true;
               theoryStructureMap[internalId] = {
                 q: qInstructionTheory,
                 co: coInstruction
               };
           }
       });
    });

    const buildPrompt = (type, structureMap, variantNum) => {
      if (type === 'theory') {
        return `
          Task: Generate ${Object.keys(structureMap).length} THEORETICAL exam questions for Variant #${variantNum}.
          
          ==== SYLLABUS TOPICS ====
          [${topicsList}]
          
          INSTRUCTIONS:
          1. Generate conceptually strong, theoretical questions based ONLY on the syllabus topics above.
          2. MUST NOT be numerical questions.
          3. Return ONLY a RAW JSON OBJECT covering EXACTLY the keys in the structure below. No markdown.

          STRUCTURE TO FILL:
          ${JSON.stringify(structureMap, null, 2)}
        `;
      } else {
        return `
          Task: Generate ${Object.keys(structureMap).length} NUMERICAL exam questions for Variant #${variantNum}.
          
          ==== NUMERICAL GUIDANCE (ABSOLUTE SOURCE OF TRUTH) ====
          ${numericalPrompt ? `"${numericalPrompt}"` : "Generate numerical problems based on general engineering/science applications."}
          
          ${looksLikeExample ? `
          âš ï¸ TEMPLATE REWRITING MODE:
          The guidance above is a SPECIFIC PROBLEM/EXAMPLE. You MUST:
          1. Generate the EXACT SAME TYPE of problem (same algorithm, same concept, same domain).
          2. CHANGE the specific values (e.g., use a different array, different graph edges, different voltage).
          3. Do NOT generate numericals from any other topic.
          ` : `
          âš ï¸ TOPIC MODE: Use the guidance above as the exact subject area.
          `}

          ${pastNumericals && pastNumericals.length > 0 ? `
          ==== PAST GENERATED EXAMPLES TO EMULATE (STYLE/DIFFICULTY REFERENCE) ====
          ${pastNumericals.map((q, i) => `${i+1}. ${q}`).join('\n')}
          (Use these past examples strictly as a stylistic reference to maintain consistency across generation sets.)
          ` : ""}

          INSTRUCTIONS:
          1. Generate mathematically solvable problems strictly following the guidance above.
          2. Return ONLY a RAW JSON OBJECT covering EXACTLY the keys in the structure below. No markdown.

          STRUCTURE TO FILL:
          ${JSON.stringify(structureMap, null, 2)}
        `;
      }
    };

    const AI_KEY = process.env.GOOGLE_API_KEY;
    if (!AI_KEY) throw new Error("Server API Key missing");

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign, BorderStyle } = await import("docx");

    const hText = (text, bold = false, size = 20) => new Paragraph({ 
      children: [new TextRun({ text: String(text || ""), bold, size, font: "Times New Roman" })],
      alignment: AlignmentType.CENTER
    });

    const cell = (text, opts = {}) => new TableCell({
      children: [new Paragraph({ 
        children: [new TextRun({ text: String(text || ""), bold: opts.bold || false, size: 20, font: "Times New Roman" })],
        alignment: opts.align || AlignmentType.LEFT
      })],
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined
    });

    const noBorder = { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE} };

    // Function to generate 1 complete Document Buffer given AI Data
    const generateDocxBuffer = async (aiData) => {
      // Setup dynamic semester date parsing
      let semesterMonths = `May - Jun ${new Date().getFullYear()}`;
      if (course.startDate && course.endDate) {
          try {
              const startM = new Date(course.startDate).toLocaleString('default', { month: 'short' });
              const endM = new Date(course.endDate).toLocaleString('default', { month: 'short' });
              const year = new Date(course.endDate).getFullYear();
              if (startM !== "Invalid Date" && endM !== "Invalid Date" && !isNaN(year)) {
                  semesterMonths = `${startM} - ${endM} ${year}`;
              }
          } catch(e) {}
      }

      // Convert standard browser YYYY-MM-DD back to DD/MM/YYYY text
      let formattedDate = date;
      try {
          if (date && date.includes("-")) {
              const [y, m, d] = date.split('-');
              formattedDate = `${d}/${m}/${y}`;
          }
      } catch(e) {}

      const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            new TableCell({
              columnSpan: 3,
              margins: { top: 150, bottom: 50, left: 150, right: 150 },
              borders: { bottom: { style: BorderStyle.NONE } },
              children: [
                hText("K. J. Somaiya Institute of Technology, Sion, Mumbai-22", true, 24),
                hText("(Autonomous College Affiliated to University of Mumbai)", true, 18),
                new Paragraph({ spacing: { after: 100 } }),
                hText(semesterMonths, false, 18),
                hText(`B. Tech Program: Artificial Intelligence & Data Science Scheme : ${scheme}`, false, 18),
                hText(`Regular Examination: ${regularExam}`, false, 18),
                hText(`Course Code: AIC404 and Course Name: ${course.subjectName || "Algorithm Analysis"}`, false, 18),
              ]
            })
          ]}),
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Date of Exam: ${formattedDate}`, size: 18, font: "Times New Roman" })], alignment: AlignmentType.LEFT })], margins: { top: 50, bottom: 100, left: 150, right: 100 }, borders: { top: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Duration: ${duration}`, size: 18, font: "Times New Roman" })], alignment: AlignmentType.CENTER })], margins: { top: 50, bottom: 100, left: 100, right: 100 }, borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Max. Marks: ${maxMarks}`, size: 18, font: "Times New Roman" })], alignment: AlignmentType.RIGHT })], margins: { top: 50, bottom: 100, left: 100, right: 150 }, borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE } } })
          ]})
        ]
      });

      const instructions = [
        new Paragraph({ children: [new TextRun({ text: "Instructions:", bold: true, font: "Times New Roman", size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: "(1) All questions are compulsory.", bold: true, font: "Times New Roman", size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: "(2) Draw neat diagrams wherever applicable.", bold: true, font: "Times New Roman", size: 20 })] }),
        new Paragraph({ children: [new TextRun({ text: "(3) Assume suitable data, if necessary.", bold: true, font: "Times New Roman", size: 20 })], spacing: { after: 200 } })
      ];

      const tRows = [
        new TableRow({ children: [
          cell("Q. No.", { bold: true, align: AlignmentType.CENTER, width: 10 }),
          cell("Question", { bold: true, align: AlignmentType.CENTER, width: 65 }),
          cell("Max.\nMarks", { bold: true, align: AlignmentType.CENTER, width: 10 }),
          cell("CO", { bold: true, align: AlignmentType.CENTER, width: 7.5 }),
          cell("BT\nlevel", { bold: true, align: AlignmentType.CENTER, width: 7.5 })
        ]})
      ];

      pattern.forEach((q) => {
        tRows.push(new TableRow({ children: [
          cell(`Q.${q.id}`, { bold: true, align: AlignmentType.CENTER }),
          cell(q.title, { bold: true }),
          cell(String(q.marks), { align: AlignmentType.CENTER }),
          cell("", { borders: noBorder }), cell("", { borders: noBorder })
        ]}));

        // Write actual subquestions
        q.subs.forEach((sub) => {
           let internalId = `Q${q.id}_${sub.id}`;
           let aiQuestionData = aiData[internalId] || { q: "Error generating question", co: "CO1" };
           
           // If the AI somehow returned just a string (fallback), wrap it
           if (typeof aiQuestionData === 'string') {
               aiQuestionData = { q: aiQuestionData, co: "CO-Auto" };
           }

           tRows.push(new TableRow({ children: [
             cell(`${sub.id})`, { align: AlignmentType.CENTER, bold: true }),
             cell(aiQuestionData.q),
             cell(String(sub.marks), { align: AlignmentType.CENTER }),
             cell(aiQuestionData.co, { align: AlignmentType.CENTER }),
             cell(sub.bt || "", { align: AlignmentType.CENTER })
           ]}));
        });
      });

      const mainTable = new Table({ rows: tRows, width: { size: 100, type: WidthType.PERCENTAGE } });
      const pd = new Document({ sections: [{ properties: {}, children: [headerTable, ...instructions, mainTable] }] });
      return await Packer.toBuffer(pd);
    };

    // We generate files based on numSets
    let generatedBuffers = [];

    const callAI = async (promptText) => {
        const systemInstruction = `You are a strict Universal Academic Exam Specialist.
        YOUR ONLY JOB is to generate EXACTLY the requested JSON structure. No explanations, no markdown. Answer purely based on the context provided in the prompt.`;
        
        const fetchResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${AI_KEY}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.8 }
          }),
        });
        const data = await fetchResp.json();
        if (data.error) throw new Error(data.error.message);
        
        let inputT = data.usageMetadata?.promptTokenCount || 0;
        let outputT = data.usageMetadata?.candidatesTokenCount || 0;
        
        let textResult = data.candidates[0].content.parts[0].text;
        const jsonStart = textResult.indexOf('{');
        const jsonEnd = textResult.lastIndexOf('}');
        if (jsonStart === -1) throw new Error("JSON not found in response");
        return { 
           json: JSON.parse(textResult.substring(jsonStart, jsonEnd + 1)),
           usage: { input: inputT, output: outputT }
        };
    };

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (let s = 1; s <= numSets; s++) {
        let aiData = {};
        try {
            if (generationMode === 'bank' && course.questionBank && course.questionBank.length > 0) {
               // --- BANK MODE (WITH AI HYBRID FALLBACK) ---
               let availableBank = [...course.questionBank];
               availableBank.sort(() => Math.random() - 0.5);

               let localTheoryStructureMap = {};
               let localNumericalStructureMap = {};
               let hasLocalTheory = false;
               let hasLocalNumerical = false;

               pattern.forEach((q) => {
                  q.subs.forEach(sub => {
                     let internalId = `Q${q.id}_${sub.id}`;
                     
                     // 1. Try exact match (Numerical type, BT Level, and CO)
                     let targetCo = sub.co ? `CO${sub.co}` : "";
                     let matchIndex = availableBank.findIndex(b => 
                         Boolean(b.isNumerical) === Boolean(sub.isNumerical) && 
                         (b.btLevel || "").includes(sub.bt || "") &&
                         (!targetCo || (b.courseOutcome || "").includes(targetCo) || targetCo === "COAuto")
                     );
                     
                     if (matchIndex !== -1) {
                         let selectedQ = availableBank[matchIndex];
                         availableBank.splice(matchIndex, 1);
                         aiData[internalId] = { q: selectedQ.question, co: selectedQ.courseOutcome || "CO1" };
                     } else {
                         // 3. Bank is exhausted for this specific type! Queue it for AI generation.
                         if (sub.isNumerical) {
                             hasLocalNumerical = true;
                             localNumericalStructureMap[internalId] = numericalStructureMap[internalId];
                         } else {
                             hasLocalTheory = true;
                             localTheoryStructureMap[internalId] = theoryStructureMap[internalId];
                         }
                     }
                  });
               });

               // Call AI for any missing questions
               const promises = [];
               let theoryIndex = -1;
               let numericalIndex = -1;

               if (hasLocalTheory) {
                  theoryIndex = promises.length;
                  promises.push(callAI(buildPrompt('theory', localTheoryStructureMap, s)));
               }
               if (hasLocalNumerical) {
                  numericalIndex = promises.length;
                  promises.push(callAI(buildPrompt('numerical', localNumericalStructureMap, s)));
               }

               if (promises.length > 0) {
                  const results = await Promise.all(promises);
                  if (hasLocalTheory) {
                    Object.assign(aiData, results[theoryIndex].json);
                    totalInputTokens += results[theoryIndex].usage.input;
                    totalOutputTokens += results[theoryIndex].usage.output;
                  }
                  if (hasLocalNumerical) {
                    Object.assign(aiData, results[numericalIndex].json);
                    totalInputTokens += results[numericalIndex].usage.input;
                    totalOutputTokens += results[numericalIndex].usage.output;
                  }
               }

            } else {
               // --- AI MODE ---
               const promises = [];
               
               let theoryIndex = -1;
               let numericalIndex = -1;

               if (hasTheory) {
                  theoryIndex = promises.length;
                  promises.push(callAI(buildPrompt('theory', theoryStructureMap, s)));
               }
               if (hasNumerical) {
                  numericalIndex = promises.length;
                  promises.push(callAI(buildPrompt('numerical', numericalStructureMap, s)));
               }

               const results = await Promise.all(promises);

               if (hasTheory) {
                 Object.assign(aiData, results[theoryIndex].json);
                 totalInputTokens += results[theoryIndex].usage.input;
                 totalOutputTokens += results[theoryIndex].usage.output;
               }
               if (hasNumerical) {
                 Object.assign(aiData, results[numericalIndex].json);
                 totalInputTokens += results[numericalIndex].usage.input;
                 totalOutputTokens += results[numericalIndex].usage.output;
               }
            }

        } catch (perr) {
          console.error("AI Gen Failed for iteration ", s, perr);
          throw new Error("AI failed to process questions for Set " + s);
        }

        const docxBuffer = await generateDocxBuffer(aiData);
        generatedBuffers.push({ name: `${course.subjectName || "Exam"}_${examType}_Set_${s}.docx`, buffer: docxBuffer });
    }

    if (totalInputTokens > 0 || totalOutputTokens > 0) {
        // Fire and forget logging
        logAiUsage({
            action: 'generate-exam-paper',
            teacherId: course?.teacherId || "unknown",
            teacherEmail: course?.teacherEmail || "",
            teacherName: course?.teacherName || course?.taughtBy || "Unknown",
            courseId: course?.id || "",
            subjectName: course?.subjectName || "Subject",
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens
        }).catch(err => console.error("Exam log error:", err));
    }

    if (numSets === 1) {
        res.setHeader('Content-Disposition', `attachment; filename="${generatedBuffers[0].name}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        return res.send(generatedBuffers[0].buffer);
    } else {
        const masterZip = new PizZip();
        generatedBuffers.forEach(b => {
           masterZip.file(b.name, b.buffer.toString('binary'), { binary: true });
        });
        const zipBuffer = masterZip.generate({ type: "nodebuffer", compression: "DEFLATE" });
        res.setHeader('Content-Disposition', `attachment; filename="${course.subjectName || "Exam"}_${examType}_Batch.zip"`);
        res.setHeader('Content-Type', 'application/zip');
        return res.send(zipBuffer);
    }

  } catch (error) {
    console.error("Templater Gen Error:", error);
    
    let detailedMsg = error.message;
    if (error.properties && error.properties.errors) {
      detailedMsg = "Docx Template Error: " + error.properties.errors.map(e => e.message || e.name).join(", ");
    }

    res.status(500).json({ error: detailedMsg || error.toString() || "Failed to inject questions into template." });
  }
};

