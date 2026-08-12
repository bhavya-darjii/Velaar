/**
 * Shared Gemini API client.
 * Single source of truth for all AI calls — no more duplicate callGemini functions.
 * ponytail: using fetch directly (no SDK) — keeps the dep count down, same perf.
 */

const API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY}`;

/**
 * Call the Gemini API with the given payload.
 * @param {object} bodyPayload - The full request body to send to Gemini.
 * @returns {Promise<object>} - The raw Gemini API response JSON.
 */
export const callGemini = async (bodyPayload) => {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });
  return response.json();
};
