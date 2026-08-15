/* eslint-disable */
// @ts-nocheck
/**
 * Exam docx builder.
 * Generates a single Word document buffer from AI-generated question data.
 * Extracted from examExportController for file-size compliance (Kevin's rule: < 300 lines).
 */

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign, BorderStyle } from 'docx';

/** Centered paragraph with Times New Roman font */
const hText = (text, bold = false, size = 20) => new Paragraph({
  children: [new TextRun({ text: String(text || ''), bold, size, font: 'Times New Roman' })],
  alignment: AlignmentType.CENTER,
});

/** Table cell builder with Times New Roman font */
const cell = (text, opts = {}) => new TableCell({
  children: [new Paragraph({
    children: [new TextRun({ text: String(text || ''), bold: opts.bold || false, size: 20, font: 'Times New Roman' })],
    alignment: opts.align || AlignmentType.LEFT,
  })],
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 100, bottom: 100, left: 100, right: 100 },
  width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
});

const noBorder = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
};

/**
 * Build a complete Word document buffer for a single exam paper.
 * @param {object} params
 * @param {object} params.course
 * @param {string} params.date
 * @param {string} params.duration
 * @param {string} params.maxMarks
 * @param {string} params.scheme
 * @param {string} params.regularExam
 * @param {Array}  params.pattern
 * @param {object} params.aiData - AI-generated question data keyed by "Q{id}_{subId}"
 */
export const buildExamDocx = async ({ course, date, duration, maxMarks, scheme, regularExam, pattern, aiData }) => {
  // Parse semester date range
  let semesterMonths = `May - Jun ${new Date().getFullYear()}`;
  if (course.startDate && course.endDate) {
    try {
      const startM = new Date(course.startDate).toLocaleString('default', { month: 'short' });
      const endM = new Date(course.endDate).toLocaleString('default', { month: 'short' });
      const year = new Date(course.endDate).getFullYear();
      if (startM !== 'Invalid Date' && endM !== 'Invalid Date' && !isNaN(year)) {
        semesterMonths = `${startM} - ${endM} ${year}`;
      }
    } catch { /* ignore */ }
  }

  // Format date from YYYY-MM-DD to DD/MM/YYYY
  let formattedDate = date;
  try {
    if (date && date.includes('-')) {
      const [y, m, d] = date.split('-');
      formattedDate = `${d}/${m}/${y}`;
    }
  } catch { /* ignore */ }

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({
          columnSpan: 3,
          margins: { top: 150, bottom: 50, left: 150, right: 150 },
          borders: { bottom: { style: BorderStyle.NONE } },
          children: [
            hText('K. J. Somaiya Institute of Technology, Sion, Mumbai-22', true, 24),
            hText('(Autonomous College Affiliated to University of Mumbai)', true, 18),
            new Paragraph({ spacing: { after: 100 } }),
            hText(semesterMonths, false, 18),
            hText(`B. Tech Program: Artificial Intelligence & Data Science Scheme : ${scheme}`, false, 18),
            hText(`Regular Examination: ${regularExam}`, false, 18),
            hText(`Course Code: AIC404 and Course Name: ${course.subjectName || 'Algorithm Analysis'}`, false, 18),
          ],
        }),
      ]}),
      new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Date of Exam: ${formattedDate}`, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.LEFT })], margins: { top: 50, bottom: 100, left: 150, right: 100 }, borders: { top: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Duration: ${duration}`, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.CENTER })], margins: { top: 50, bottom: 100, left: 100, right: 100 }, borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Max. Marks: ${maxMarks}`, size: 18, font: 'Times New Roman' })], alignment: AlignmentType.RIGHT })], margins: { top: 50, bottom: 100, left: 100, right: 150 }, borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE } } }),
      ]}),
    ],
  });

  const instructions = [
    new Paragraph({ children: [new TextRun({ text: 'Instructions:', bold: true, font: 'Times New Roman', size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: '(1) All questions are compulsory.', bold: true, font: 'Times New Roman', size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: '(2) Draw neat diagrams wherever applicable.', bold: true, font: 'Times New Roman', size: 20 })] }),
    new Paragraph({ children: [new TextRun({ text: '(3) Assume suitable data, if necessary.', bold: true, font: 'Times New Roman', size: 20 })], spacing: { after: 200 } }),
  ];

  const tRows = [
    new TableRow({ children: [
      cell('Q. No.', { bold: true, align: AlignmentType.CENTER, width: 10 }),
      cell('Question', { bold: true, align: AlignmentType.CENTER, width: 65 }),
      cell('Max.\nMarks', { bold: true, align: AlignmentType.CENTER, width: 10 }),
      cell('CO', { bold: true, align: AlignmentType.CENTER, width: 7.5 }),
      cell('BT\nlevel', { bold: true, align: AlignmentType.CENTER, width: 7.5 }),
    ]}),
  ];

  pattern.forEach((q) => {
    tRows.push(new TableRow({ children: [
      cell(`Q.${q.id}`, { bold: true, align: AlignmentType.CENTER }),
      cell(q.title, { bold: true }),
      cell(String(q.marks), { align: AlignmentType.CENTER }),
      cell('', { borders: noBorder }), cell('', { borders: noBorder }),
    ]}));

    q.subs.forEach((sub) => {
      const internalId = `Q${q.id}_${sub.id}`;
      let aiQuestionData = aiData[internalId] || { q: 'Error generating question', co: 'CO1' };
      if (typeof aiQuestionData === 'string') aiQuestionData = { q: aiQuestionData, co: 'CO-Auto' };

      tRows.push(new TableRow({ children: [
        cell(`${sub.id})`, { align: AlignmentType.CENTER, bold: true }),
        cell(aiQuestionData.q),
        cell(String(sub.marks), { align: AlignmentType.CENTER }),
        cell(aiQuestionData.co, { align: AlignmentType.CENTER }),
        cell(sub.bt || '', { align: AlignmentType.CENTER }),
      ]}));
    });
  });

  const mainTable = new Table({ rows: tRows, width: { size: 100, type: WidthType.PERCENTAGE } });
  const doc = new Document({ sections: [{ properties: {}, children: [headerTable, ...instructions, mainTable] }] });
  return Packer.toBuffer(doc);
};

