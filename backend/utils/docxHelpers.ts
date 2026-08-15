/* eslint-disable */
// @ts-nocheck
/**
 * Shared docx element builders for the Lesson Plan Word export.
 * Uses Arial font (lesson plan style). See examDocxBuilder.js for exam style.
 */

import { Paragraph, TextRun, TableCell, WidthType, AlignmentType, VerticalAlign } from 'docx';

/** Centered paragraph with Arial font */
export const hText = (text, bold = false) => new Paragraph({
  children: [new TextRun({ text: String(text || ''), bold, size: 24, font: 'Arial' })],
  alignment: AlignmentType.CENTER,
});

/** Table cell builder with Arial font and full options */
export const cell = (text, opts = {}) => new TableCell({
  children: [new Paragraph({
    children: [new TextRun({ text: String(text || ''), bold: opts.bold || false, size: opts.size || 20, font: 'Arial' })],
    alignment: opts.align || AlignmentType.LEFT,
  })],
  verticalAlign: opts.vAlign || VerticalAlign.CENTER,
  margins: { top: 100, bottom: 100, left: 100, right: 100 },
  columnSpan: opts.colSpan || 1,
  rowSpan: opts.rowSpan || 1,
  width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
  shading: opts.bg ? { fill: opts.bg } : undefined,
});

/** Default teaching methodologies for lesson plan */
export const defaultMethodologies = [
  'Direct Instruction (PPT/Black board based) DI',
  'Flipped Classrooms FC',
  'Cooperative method (please specify technique used)',
  'Game-based Learning',
  'Role Play',
  'Problem based',
  'Brain storming',
  'Any Other',
];

/** Default activity rows */
export const defaultActivities = [
  { sr: '1.', name: 'Expert Talk on subject', date: 'March 2026', venue: 'Class room', co: '1 to 6' },
];

/** Default term test rows */
export const defaultTermTests = [
  { q: '1 a', bt1: 'Understanding/Applying', co1: 'CO1', bt2: 'Understanding/Applying', co2: 'CO4' },
  { q: '1 b', bt1: 'Understanding/Applying', co1: 'CO1', bt2: 'Understanding/Applying', co2: 'CO4' },
  { q: '1 c', bt1: 'Understanding/Applying', co1: 'CO1', bt2: 'Understanding/Applying', co2: 'CO4' },
  { q: '2 a', bt1: 'Understanding/Applying', co1: 'CO2', bt2: 'Understanding/Applying', co2: 'CO5' },
  { q: '2 b', bt1: 'Understanding/Applying', co1: 'CO2', bt2: 'Understanding/Applying', co2: 'CO5' },
  { q: '3 a', bt1: 'Understanding/Applying', co1: 'CO3', bt2: 'Understanding/Applying', co2: 'CO6' },
  { q: '3 b', bt1: 'Understanding/Applying', co1: 'CO3', bt2: 'Understanding/Applying', co2: 'CO6' },
];

/** Default end-semester analysis rows */
export const defaultEndSem = [
  { c1: { q: '1A', bt: 'Understanding/Applying', co: 'CO1' }, c2: { q: '2B', bt: 'Understanding/Applying', co: 'CO5' }, c3: { q: '3C', bt: 'Understanding/Applying', co: 'CO3' } },
  { c1: { q: '1B', bt: 'Understanding/Applying', co: 'CO2' }, c2: { q: '2C', bt: 'Understanding/Applying', co: 'CO6' }, c3: { q: '4A', bt: 'Understanding/Applying', co: 'CO4' } },
  { c1: { q: '1C', bt: 'Understanding/Applying', co: 'CO3' }, c2: { q: '3A', bt: 'Understanding/Applying', co: 'CO1' }, c3: { q: '4B', bt: 'Understanding/Applying', co: 'CO5' } },
  { c1: { q: '2A', bt: 'Understanding/Applying', co: 'CO4' }, c2: { q: '3B', bt: 'Understanding/Applying', co: 'CO2' }, c3: { q: '4C', bt: 'Understanding/Applying', co: 'CO3' } },
];

