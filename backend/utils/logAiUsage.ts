// Uses Supabase Admin client so writes bypass Row Level Security.
import { adminSupabase } from '../supabaseAdmin.js';

// ── Gemini 2.5 Flash pricing (USD per 1M tokens, May 2026) ───────────────────
const INPUT_COST_PER_MILLION  = 0.10;
const OUTPUT_COST_PER_MILLION = 0.40;

// Fixed USD → INR conversion (₹84 per $1)
const USD_TO_INR = 84;

export const ACTION_LABELS: Record<string, string> = {
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

export interface AiUsageOpts {
  /** Endpoint key e.g. 'generate-roadmap' */
  action: string;
  /** Prompt token count from usageMetadata */
  inputTokens: number;
  /** Response token count from usageMetadata */
  outputTokens: number;
  /** Supabase user ID of the calling teacher */
  teacherId: string;
  /** Teacher's email */
  teacherEmail: string;
  /** Teacher's display name */
  teacherName: string;
  /** Active course ID (optional) */
  courseId?: string;
  /** Subject name (optional) */
  subjectName?: string;
}

export const logAiUsage = async (opts: AiUsageOpts): Promise<void> => {
  if (!adminSupabase) return; // Silently skip if not configured

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

    // Insert a single raw log row — stats are computed from aggregation queries
    const { error } = await adminSupabase.from('ai_logs').insert({
      action,
      action_label:  ACTION_LABELS[action] ?? action,
      teacher_id:    teacherId,
      teacher_email: teacherEmail,
      teacher_name:  teacherName,
      course_id:     courseId || null,
      subject_name:  subjectName || null,
      input_tokens:  inputTokens,
      output_tokens: outputTokens,
      cost_usd:      costUSD,
      cost_inr:      costINR,
      month,
      created_at:    now.toISOString(),
    });

    if (error) throw error;

  } catch (err) {
    // Never crash the main AI request just because logging failed
    console.error('[logAiUsage] Failed to write log to Supabase:', err instanceof Error ? err.message : err);
  }
};
