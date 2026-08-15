/**
 * Input sanitization utility.
 * Strips null bytes and control characters from user-supplied strings
 * to reduce prompt-injection and log-injection risk.
 * Enforces max lengths so that oversized inputs can't blow up prompts.
 */

const MAX_LENGTHS: Record<string, number> = {
  syllabusText:   50_000,
  subjectName:    200,
  courseId:       100,
  teacherName:    200,
  teacherEmail:   254,
  default:        10_000,
};

/**
 * Strip control characters (except newline, tab, carriage return) and null bytes.
 * Trims whitespace from both ends.
 */
const stripControls = (s: string): string =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

/**
 * Sanitize a single string field.
 * @param value  - The raw user input
 * @param field  - The field name (used to look up max length)
 */
export const sanitizeString = (value: unknown, field = 'default'): string => {
  if (typeof value !== 'string') return '';
  const maxLen = MAX_LENGTHS[field] ?? MAX_LENGTHS['default']!;
  return stripControls(value).slice(0, maxLen);
};

/**
 * Sanitize an object's string fields recursively (shallow — one level deep).
 * Arrays of strings are sanitized element-by-element.
 * Non-string values are passed through untouched.
 */
export const sanitizeBody = <T extends Record<string, unknown>>(body: T): T => {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(body)) {
    if (typeof val === 'string') {
      result[key] = sanitizeString(val, key);
    } else if (Array.isArray(val)) {
      result[key] = val.map((item) =>
        typeof item === 'string' ? sanitizeString(item, key) : item,
      );
    } else {
      result[key] = val;
    }
  }
  return result as T;
};
