// File-based AI usage logger — writes to server/data/aiLogs.jsonl
// Uses Node.js fs (no Firestore, no auth, works immediately on any environment)

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '..', 'data');
const LOG_FILE  = join(DATA_DIR, 'aiLogs.jsonl');

// Ensure the data directory exists on first run
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ── Gemini 2.0 Flash pricing (USD per 1M tokens, May 2026) ───────────────────
const INPUT_COST_PER_MILLION  = 0.10;
const OUTPUT_COST_PER_MILLION = 0.40;

// Fixed USD → INR conversion (₹84 per $1)
const USD_TO_INR = 84;

const ACTION_LABELS = {
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

    // Exact cost in USD
    const costUSD = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION
                  + (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

    // Rounded to nearest rupee — no paise
    const costINR = Math.round(costUSD * USD_TO_INR);

    const now   = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const entry = {
      id:          `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
      timestamp:   now.toISOString(),
    };

    // Append as a single JSON line (JSON Lines format — safe for concurrent writes)
    appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    // Never crash the main AI request just because logging failed
    console.warn('[logAiUsage] Failed to write log:', err.message);
  }
};
