/* eslint-disable */
// @ts-nocheck
/**
 * Lesson Plan â†’ Word Export Controller.
 * Generates a complete .docx file from the course lesson plan data.
 */

import { Document, Packer, Paragraph, TextRun, Table, TableRow, WidthType, AlignmentType } from 'docx';
import {
  hText, cell,
  defaultMethodologies, defaultActivities, defaultTermTests, defaultEndSem,
} from '../utils/docxHelpers.js';

export const exportLessonPlanToWord = async (req, res) => {
  try {
    const { course, lp } = req.body;
    const sections = [];

    // --- 1. Header ---
    const currentYear = new Date().getFullYear();
    const defaultYear = `${currentYear}-${String(currentYear + 1).slice(-2)}`;
    const acYear = lp.academicYear || defaultYear;
    const divs = lp.divisions || (course.divisions && course.divisions.length > 0 ? course.divisions.join(' & ') : 'A');

    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `${course.subjectName || 'Subject'} (${acYear}) - Faculty: Prof. ${course.teacherName || lp.facultyName || course.professorName || 'Unknown'}`, bold: true, size: 28, font: 'Arial' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Semester: ${lp.semester || '-'} | Divisions: ${divs} | Course Code: ${lp.courseCode || '-'}`, bold: true, size: 24, font: 'Arial' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    );

    // --- 2. Course Description ---
    sections.push(
      new Paragraph({ children: [new TextRun({ text: 'Course Description:', bold: true, size: 24, font: 'Arial' })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: lp.courseDescription || '-', size: 22, font: 'Arial' })], spacing: { after: 400 } }),
    );

    // --- 3. Unit Wise Outcomes ---
    sections.push(new Paragraph({ children: [new TextRun({ text: 'Unit wise Outcomes:', bold: true, size: 24, font: 'Arial' })], spacing: { after: 200 } }));
    const unitRows = [
      new TableRow({ children: [
        cell('Unit No', { bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' }),
        cell('Unit', { bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' }),
        cell('Outcomes', { bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' }),
        cell('Teaching Practice', { bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' }),
        cell('Evaluation Methods', { bold: true, colSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' }),
        cell('BT level', { bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' }),
      ]}),
      new TableRow({ children: [
        cell('Formative', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }),
        cell('Summative', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }),
      ]}),
    ];
    (course.modules || []).forEach((mod, idx) => {
      const rawUnit = lp.unitOutcomes?.[idx] || {};
      unitRows.push(new TableRow({ children: [
        cell(rawUnit.unit || `Unit ${idx + 1}`, { align: AlignmentType.CENTER }),
        cell(mod.name || rawUnit.unit || '-'),
        cell(rawUnit.outcomes || '-'),
        cell(rawUnit.teachingPractice || '-'),
        cell(rawUnit.formative || '-'),
        cell(rawUnit.summative || '-'),
        cell(rawUnit.btLevel || '-', { bold: true, align: AlignmentType.CENTER }),
      ]}));
    });
    sections.push(new Table({ rows: unitRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    sections.push(new Paragraph({ spacing: { after: 400 } }));

    // --- 4. Teaching Methodologies ---
    sections.push(new Paragraph({ children: [new TextRun({ text: 'Teaching Methodologies:', bold: true, size: 24, font: 'Arial' })], spacing: { after: 200 } }));
    (Array.isArray(lp.teachingMethodologies) ? lp.teachingMethodologies : defaultMethodologies).forEach(tm => {
      sections.push(new Paragraph({ children: [new TextRun({ text: tm, size: 22, font: 'Arial' })], bullet: { level: 0 } }));
    });
    sections.push(new Paragraph({ spacing: { after: 400 } }));

    // --- 5. Program Outcomes ---
    sections.push(new Paragraph({ children: [new TextRun({ text: 'Program Outcomes:', bold: true, size: 24, font: 'Arial' })], spacing: { after: 200 } }));
    const poRows = [new TableRow({ children: [cell('PO No', { bold: true, width: 15, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Program Outcomes', { bold: true, width: 85, align: AlignmentType.CENTER, bg: 'F0F0F0' })] })];
    (lp.programOutcomes || []).forEach((po, idx) => {
      if (typeof po === 'string') {
        const split = po.split(':');
        poRows.push(new TableRow({ children: [cell(split[0] || '-', { align: AlignmentType.CENTER }), cell(split.slice(1).join(':') || '-')] }));
      } else if (typeof po === 'object' && po !== null) {
        poRows.push(new TableRow({ children: [cell(po.code || `PO${idx + 1}`, { align: AlignmentType.CENTER }), cell(po.title || '-')] }));
      } else {
        poRows.push(new TableRow({ children: [cell(`PO${idx + 1}`, { align: AlignmentType.CENTER }), cell(String(po))] }));
      }
    });
    sections.push(new Table({ rows: poRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    sections.push(new Paragraph({ spacing: { after: 400 } }));

    // --- 6. Course Outcomes ---
    if (lp.courseOutcomes) {
      sections.push(new Paragraph({ children: [new TextRun({ text: 'Course Outcomes:', bold: true, size: 24, font: 'Arial' })], spacing: { after: 200 } }));
      const coRows = [new TableRow({ children: [cell('CO No', { bold: true, width: 15, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Course outcomes', { bold: true, width: 65, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('PO Mapped', { bold: true, width: 20, align: AlignmentType.CENTER, bg: 'F0F0F0' })] })];
      lp.courseOutcomes.forEach((co, idx) => {
        coRows.push(new TableRow({ children: [cell(`CO.${idx + 1}`, { bold: true, align: AlignmentType.CENTER }), cell(co.description || ''), cell(co.mappedPOs || '', { bold: true, align: AlignmentType.CENTER })] }));
      });
      sections.push(new Table({ rows: coRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      sections.push(new Paragraph({ spacing: { after: 400 } }));
    }

    // --- 7. Course Assessment Planning ---
    if (lp.assessmentPlanning) {
      sections.push(new Paragraph({ children: [new TextRun({ text: 'Course Assessment Planning:', bold: true, size: 24, font: 'Arial' })], spacing: { after: 200 } }));
      const capRows = [
        new TableRow({ children: [cell('Course outcomes', { bold: true, rowSpan: 4, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Assessment Method', { bold: true, colSpan: 8, align: AlignmentType.CENTER, bg: 'F0F0F0' })] }),
        new TableRow({ children: [cell('Formative', { bold: true, colSpan: 3, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Summative', { bold: true, colSpan: 5, align: AlignmentType.CENTER, bg: 'F0F0F0' })] }),
        new TableRow({ children: [cell('', { rowSpan: 2 }), cell('', { rowSpan: 2 }), cell('', { rowSpan: 2 }), cell('Continuous assessment of 10 marks', { bold: true, colSpan: 3, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Term Tests', { bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('End semester exam', { bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' })] }),
        new TableRow({ children: [cell('-', { align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('-', { align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('-', { align: AlignmentType.CENTER, bg: 'F0F0F0' })] }),
      ];
      lp.assessmentPlanning.forEach(row => {
        capRows.push(new TableRow({ children: [cell(row.co, { bold: true, align: AlignmentType.CENTER }), cell(row.f1, { align: AlignmentType.CENTER }), cell(row.f2, { align: AlignmentType.CENTER }), cell(row.f3, { align: AlignmentType.CENTER }), cell(row.s1, { align: AlignmentType.CENTER }), cell(row.s2, { align: AlignmentType.CENTER }), cell(row.s3, { align: AlignmentType.CENTER }), cell(row.termTest, { align: AlignmentType.CENTER }), cell(row.endSem, { align: AlignmentType.CENTER })] }));
      });
      sections.push(new Table({ rows: capRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      sections.push(new Paragraph({ spacing: { after: 400 } }));
    }

    // --- 8. Books ---
    const textBooks = Array.isArray(lp.textBooks) ? lp.textBooks : [];
    const referenceBooks = Array.isArray(lp.referenceBooks) ? lp.referenceBooks : [];
    if (textBooks.length > 0) {
      sections.push(new Paragraph({ children: [new TextRun({ text: 'Text Books:', bold: true, size: 24, font: 'Arial' })], spacing: { after: 200 } }));
      textBooks.forEach(b => sections.push(new Paragraph({ children: [new TextRun({ text: String(b || ''), size: 22, font: 'Arial' })], bullet: { level: 0 } })));
      sections.push(new Paragraph({ spacing: { after: 200 } }));
    }
    if (referenceBooks.length > 0) {
      sections.push(new Paragraph({ children: [new TextRun({ text: 'Reference Books:', bold: true, size: 24, font: 'Arial' })], spacing: { after: 200 } }));
      referenceBooks.forEach(b => sections.push(new Paragraph({ children: [new TextRun({ text: String(b || ''), size: 22, font: 'Arial' })], bullet: { level: 0 } })));
      sections.push(new Paragraph({ spacing: { after: 400 } }));
    }

    // --- 9. Day Wise Plans ---
    if (Array.isArray(lp.dayWiseEnrichment) && lp.dayWiseEnrichment.length > 0) {
      const allDivs = course.divisions && course.divisions.length > 0 ? course.divisions : ['A'];
      const fd = (dateString) => {
        if (!dateString) return '';
        if (dateString.includes('/')) return dateString;
        if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
          const [y, m, d] = dateString.split('T')[0].split('-');
          return `${d}/${m}/${y}`;
        }
        let d = new Date(`${dateString}, ${new Date().getFullYear()}`);
        if (isNaN(d.getTime())) d = new Date(dateString);
        return !isNaN(d.getTime()) ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : dateString;
      };

      allDivs.forEach(div => {
        sections.push(new Paragraph({ children: [new TextRun({ text: `Day Wise Plan (Div-${div})`, bold: true, size: 24, font: 'Arial' })], spacing: { after: 200 } }));
        const dwRows = [new TableRow({ children: [cell('Sr.No', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Topic', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Lecture No', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Books referred', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Proposed Date', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Actual Date', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Teaching method', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('BT', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' })] })];
        const rawRoadmap = Array.isArray(course.roadmap) ? course.roadmap : (course.roadmap?.[div] || []);
        const processedRoadmap = rawRoadmap.map((lec, idx) => ({ ...lec, modIdentifier: lec.moduleName || String(lec.module) || `Mod-${Math.floor(idx / 6)}` }));
        processedRoadmap.forEach((lec, idx) => {
          const enrichment = lp.dayWiseEnrichment[idx] || { books: '-', bt: '-', method: 'Black Board & PPT/DI' };
          const mapDates = lp.dayWiseDates?.[div]?.[idx] || { proposed: lec.date, actual: lec.date };
          const localLecNo = processedRoadmap.slice(0, idx + 1).filter(l => l.modIdentifier === lec.modIdentifier).length;
          const firstModuleIdx = processedRoadmap.findIndex(l => l.modIdentifier === lec.modIdentifier);
          const moduleBT = lp.dayWiseEnrichment[firstModuleIdx]?.bt || enrichment.bt || '-';
          dwRows.push(new TableRow({ children: [cell(idx + 1, { bold: true, align: AlignmentType.CENTER }), cell(lec.title || '-', { size: 18 }), cell(localLecNo, { bold: true, align: AlignmentType.CENTER }), cell(enrichment.books || '-', { align: AlignmentType.CENTER, size: 18 }), cell(fd(mapDates.proposed || lec.date), { align: AlignmentType.CENTER, size: 18 }), cell(fd(mapDates.actual || lec.date), { align: AlignmentType.CENTER, size: 18 }), cell(enrichment.method || '-', { align: AlignmentType.CENTER, size: 18 }), cell(moduleBT, { align: AlignmentType.CENTER, size: 18 })] }));
        });
        sections.push(new Table({ rows: dwRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        sections.push(new Paragraph({ spacing: { after: 400 } }));
      });
    }

    // --- 10. Activities Planned ---
    sections.push(new Paragraph({ children: [new TextRun({ text: 'Activities Planned if any (optional)', bold: true, size: 24, font: 'Arial' })], spacing: { after: 200 } }));
    const apRows = [
      new TableRow({ children: [cell('Sr. No', { bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Activity Details', { bold: true, colSpan: 4, align: AlignmentType.CENTER, bg: 'F0F0F0' })] }),
      new TableRow({ children: [cell('Name of the Event (Expert Talk/Workshop/seminar/Industrial Visit /GD etc)', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Date', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Venue', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('CO.NO', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' })] }),
    ];
    (lp.activitiesPlanned || defaultActivities).forEach(row => {
      apRows.push(new TableRow({ children: [cell(row.sr, { bold: true, align: AlignmentType.CENTER }), cell(row.name, { align: AlignmentType.CENTER }), cell(row.date, { align: AlignmentType.CENTER }), cell(row.venue, { align: AlignmentType.CENTER }), cell(row.co, { align: AlignmentType.CENTER })] }));
    });
    sections.push(new Table({ rows: apRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    sections.push(new Paragraph({ spacing: { after: 400 } }));

    // --- 11. Term Test Analysis ---
    sections.push(new Paragraph({ children: [new TextRun({ text: 'Question Paper and CO analysis', bold: true, size: 24, font: 'Arial' })], spacing: { after: 200 } }));
    const ttRows = [
      new TableRow({ children: [cell('Q. No', { bold: true, rowSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Term Test 1', { bold: true, colSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Term Test 2', { bold: true, colSpan: 2, align: AlignmentType.CENTER, bg: 'F0F0F0' })] }),
      new TableRow({ children: [cell('BT Level', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('CO', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('BT Level', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('CO', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' })] }),
    ];
    (lp.termTestsAnalysis || defaultTermTests).forEach(row => {
      ttRows.push(new TableRow({ children: [cell(row.q, { bold: true, align: AlignmentType.CENTER }), cell(row.bt1, { align: AlignmentType.CENTER }), cell(row.co1, { align: AlignmentType.CENTER }), cell(row.bt2, { align: AlignmentType.CENTER }), cell(row.co2, { align: AlignmentType.CENTER })] }));
    });
    sections.push(new Table({ rows: ttRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    sections.push(new Paragraph({ spacing: { after: 400 } }));

    // --- 12. End Semester Analysis ---
    const esRows = [
      new TableRow({ children: [cell('End Semester', { bold: true, colSpan: 3, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('End Semester', { bold: true, colSpan: 3, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('End Semester', { bold: true, colSpan: 3, align: AlignmentType.CENTER, bg: 'F0F0F0' })] }),
      new TableRow({ children: [cell('Question No.', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('BT Level', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('CO', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Question No.', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('BT Level', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('CO', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('Question No.', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('BT Level', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }), cell('CO', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' })] }),
    ];
    (lp.endSemAnalysis || defaultEndSem).forEach(row => {
      esRows.push(new TableRow({ children: [
        cell(row.c1.q, { bold: true, align: AlignmentType.CENTER }), cell(row.c1.bt, { align: AlignmentType.CENTER, size: 16 }), cell(row.c1.co, { align: AlignmentType.CENTER }),
        cell(row.c2.q, { bold: true, align: AlignmentType.CENTER }), cell(row.c2.bt, { align: AlignmentType.CENTER, size: 16 }), cell(row.c2.co, { align: AlignmentType.CENTER }),
        cell(row.c3.q, { bold: true, align: AlignmentType.CENTER }), cell(row.c3.bt, { align: AlignmentType.CENTER, size: 16 }), cell(row.c3.co, { align: AlignmentType.CENTER }),
      ]}));
    });
    sections.push(new Table({ rows: esRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    sections.push(new Paragraph({ spacing: { after: 400 } }));

    // --- 13. CO-PO Mapping Table ---
    if (lp.courseOutcomes && lp.programOutcomes) {
      sections.push(new Paragraph({ children: [new TextRun({ text: 'Co Mapping with PO', bold: true, size: 24, font: 'Arial' })], spacing: { after: 200 } }));
      const headerCells = [cell('', { bg: 'F0F0F0' })];
      lp.programOutcomes.forEach((po, idx) => {
        const poLabel = typeof po === 'string' ? po.split(':')[0] : (po.code || `PO${idx + 1}`);
        headerCells.push(cell(poLabel, { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }));
      });
      headerCells.push(cell('PSO1', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }));
      headerCells.push(cell('PSO2', { bold: true, align: AlignmentType.CENTER, bg: 'F0F0F0' }));
      const mappingRows = [new TableRow({ children: headerCells })];
      lp.courseOutcomes.forEach((co, cIdx) => {
        const rowCells = [cell(`CO${cIdx + 1}`, { bold: true, align: AlignmentType.CENTER })];
        lp.programOutcomes.forEach((po, pIdx) => {
          const poLabel = typeof po === 'string' ? po.split(':')[0] : (po.code || `PO${pIdx + 1}`);
          const isMapped = (co.mappedPOs || '').toUpperCase().includes(poLabel.toUpperCase());
          const val = (lp.coPoMapping || {})[`CO${cIdx + 1}_${poLabel}`] !== undefined
            ? (lp.coPoMapping || {})[`CO${cIdx + 1}_${poLabel}`]
            : (isMapped ? '3' : '');
          rowCells.push(cell(val, { align: AlignmentType.CENTER }));
        });
        const pso1Val = (lp.coPoMapping || {})[`CO${cIdx + 1}_PSO1`] !== undefined ? (lp.coPoMapping || {})[`CO${cIdx + 1}_PSO1`] : ((co.mappedPOs || '').toUpperCase().includes('PSO1') ? '3' : '');
        const pso2Val = (lp.coPoMapping || {})[`CO${cIdx + 1}_PSO2`] !== undefined ? (lp.coPoMapping || {})[`CO${cIdx + 1}_PSO2`] : ((co.mappedPOs || '').toUpperCase().includes('PSO2') ? '3' : '');
        rowCells.push(cell(pso1Val, { align: AlignmentType.CENTER }));
        rowCells.push(cell(pso2Val, { align: AlignmentType.CENTER }));
        mappingRows.push(new TableRow({ children: rowCells }));
      });
      sections.push(new Table({ rows: mappingRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      sections.push(new Paragraph({ spacing: { after: 400 } }));
    }

    const doc = new Document({ sections: [{ properties: {}, children: sections }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Disposition', `attachment; filename="${course.subjectName || 'Subject'}_Lesson_Plan.docx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);

  } catch (error) {
    console.error('Lesson Plan Docx Error:', error);
    res.status(500).json({ error: 'Failed to generate Word document.' });
  }
};

