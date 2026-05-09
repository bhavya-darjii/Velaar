// Uses Firebase Admin SDK so writes bypass Firestore security rules.
import { adminDb } from '../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

// ── Gemini 2.0 Flash pricing (USD per 1M tokens, May 2026) ───────────────────
const INPUT_COST_PER_MILLION  = 0.10;
const OUTPUT_COST_PER_MILLION = 0.40;

// Fixed USD → INR conversion (₹84 per $1)
const USD_TO_INR = 84;

export const ACTION_LABELS = {
  'generate-roadmap':             'Course Roadmap Generation',
  'generate-questions-topics':    'Question Bank (from Topics)',
  'generate-questions-syllabus':  'Question Bank (from Syllabus)',
  'grade-exam':                   'AI Exam Grading',
  'generate-lesson-plan':         'Lesson Plan (Full)',
  'generate-specific-field':      'Lesson Plan (Partial Field)',
  'generate-supplementary-plan':  'CO/PO Supplementary Plan',
  'generate-day-wise-enrichment': 'Day-wise Enrichment',
  'generate-copo-mapping':        'CO-PO Matrix Mapping',
};

/**
 * @param {object} opts
 * @param {string} opts.action         - Endpoint key e.g. 'generate-roadmap'
 * @param {number} opts.inputTokens    - Prompt token count from usageMetadata
 * @param {number} opts.outputTokens   - Response token count from usageMetadata
 * @param {string} opts.teacherId      - Firebase UID of the calling teacher
 * @param {string} opts.teacherEmail   - Teacher's email
 * @param {string} opts.teacherName    - Teacher's display name
 * @param {string} opts.courseId       - Active course document ID (optional)
 * @param {string} opts.subjectName    - Subject name (optional)
 */
export const logAiUsage = async (opts) => {
  try {
    const {
      action, inputTokens = 0, outputTokens = 0,
      teacherId = 'unknown', teacherEmail = '', teacherName = '',
      courseId = '', subjectName = '',
    } = opts;

    const costUSD = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION
                  + (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
    const costINR = Math.round(costUSD * USD_TO_INR);

    const now   = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const entry = {
      action,
      actionLabel: ACTION_LABELS[action] || action,
      teacherId,
      teacherEmail,
      teacherName,
      courseId,
      subjectName,
      inputTokens,
      outputTokens,
      costUSD,
      costINR,
      month,
      timestamp: now.toISOString(),
    };

    const batch = adminDb.batch();

    // 1. Raw log entry
    const logRef = adminDb.collection('aiLogs').doc();
    batch.set(logRef, entry);

    // 2a. Global totals
    const globalRef = adminDb.collection('aiStats').doc('global');
    batch.set(globalRef, {
      totalCalls:     FieldValue.increment(1),
      totalCostINR:   FieldValue.increment(costINR),
      totalTokensIn:  FieldValue.increment(inputTokens),
      totalTokensOut: FieldValue.increment(outputTokens),
    }, { merge: true });

    // 2b. Monthly stats
    const monthRef = adminDb.collection('aiStats').doc(`month_${month}`);
    batch.set(monthRef, {
      month,
      calls:        FieldValue.increment(1),
      costINR:      FieldValue.increment(costINR),
      inputTokens:  FieldValue.increment(inputTokens),
      outputTokens: FieldValue.increment(outputTokens),
    }, { merge: true });

    // 2c. Teacher stats
    const teacherRef = adminDb.collection('aiStats').doc(`teacher_${teacherId}`);
    batch.set(teacherRef, {
      teacherId,
      teacherName,
      teacherEmail,
      calls:        FieldValue.increment(1),
      costINR:      FieldValue.increment(costINR),
      inputTokens:  FieldValue.increment(inputTokens),
      outputTokens: FieldValue.increment(outputTokens),
    }, { merge: true });

    // 2d. Action stats
    const actionRef = adminDb.collection('aiStats').doc(`action_${action}`);
    batch.set(actionRef, {
      action,
      actionLabel:  ACTION_LABELS[action] || action,
      calls:        FieldValue.increment(1),
      costINR:      FieldValue.increment(costINR),
      inputTokens:  FieldValue.increment(inputTokens),
      outputTokens: FieldValue.increment(outputTokens),
    }, { merge: true });

    await batch.commit();

  } catch (err) {
    // Never crash the main AI request just because logging failed
    console.error('[logAiUsage] Failed to write log to Firestore:', err.message);
  }
};
