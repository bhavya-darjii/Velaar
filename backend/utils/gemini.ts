/**
 * Shared Gemini API client.
 * Single source of truth for all AI calls.
 */

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.warn('[gemini] ⚠️  GOOGLE_API_KEY is missing. All AI calls will fail.');
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${API_KEY ?? ''}`;

/**
 * Call the Gemini API with the given payload.
 * @param bodyPayload - The full request body to send to Gemini.
 * @returns The raw Gemini API response JSON.
 */
export const callGemini = async (bodyPayload: object): Promise<unknown> => {
  if (!API_KEY) {
    throw new Error('GOOGLE_API_KEY is not configured on the server.');
  }
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};
