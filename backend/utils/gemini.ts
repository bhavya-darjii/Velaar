/**
 * Shared Gemini API client.
 * Intelligent API Key Pooling with LRU (Least Recently Used) Rotation.
 * Uses the official @google/genai SDK with gemini-3.7-flash.
 *
 * Keys are read from GOOGLE_API_KEYS env var as a comma-separated list.
 * Format: email:key,email:key,...
 * Example: user@gmail.com:AIzaSy...,user2@gmail.com:AIzaSy...
 *
 * Falls back to the legacy GOOGLE_API_KEY if GOOGLE_API_KEYS is not set.
 */

import { GoogleGenAI, type GenerateContentParameters } from '@google/genai';

const GEMINI_MODEL = 'gemini-3.5-flash';

// Parse keys into an array of { email, key, client } objects
const rawKeys = (process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY || '').split(',');

const API_KEYS = rawKeys
  .map(k => k.trim())
  .filter(k => k.length > 0)
  .map(k => {
    const colonIndex = k.indexOf(':');
    if (colonIndex > 0 && colonIndex < k.length - 1) {
      const email = k.slice(0, colonIndex).trim();
      const key   = k.slice(colonIndex + 1).trim();
      return { email, key, client: new GoogleGenAI({ apiKey: key }) };
    }
    return { email: 'unknown_account', key: k, client: new GoogleGenAI({ apiKey: k }) };
  });

if (API_KEYS.length === 0) {
  console.warn('[gemini] ⚠️  GOOGLE_API_KEYS is missing. All AI calls will fail.');
} else {
  console.log(`[gemini] 🚀 Initialized LRU API Pool with ${API_KEYS.length} key(s) using ${GEMINI_MODEL}.`);
}

// Track the last time each key was used (ms) to maximize cooldowns
const lastUsedTimes = new Array(API_KEYS.length).fill(0);

/**
 * Call the Gemini API with the given payload using the LRU key pool.
 * Automatically retries with the next most-rested key if one fails.
 *
 * @param bodyPayload - The full request body (contents, systemInstruction, generationConfig, etc.)
 * @returns The raw Gemini API response object.
 */
export const callGemini = async (bodyPayload: Record<string, unknown>): Promise<unknown> => {
  if (API_KEYS.length === 0) {
    throw new Error('No GOOGLE_API_KEYS configured on the server.');
  }

  let lastError: unknown;

  // Sort indices by LRU — pick the key that has been resting the longest
  const sortedIndices = API_KEYS
    .map((_, i) => i)
    .sort((a, b) => lastUsedTimes[a] - lastUsedTimes[b]);

  for (const keyIndex of sortedIndices) {
    const { email, client } = API_KEYS[keyIndex];

    // Mark this key as used right now before the request
    lastUsedTimes[keyIndex] = Date.now();

    try {
      const { generationConfig, systemInstruction, contents, ...rest } = bodyPayload;
      
      const config: Record<string, unknown> = {};
      if (generationConfig) Object.assign(config, generationConfig);
      if (systemInstruction) config.systemInstruction = systemInstruction;

      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        ...(Object.keys(config).length > 0 && { config }),
        ...rest,
      } as GenerateContentParameters);

      // Adapt the SDK response to the legacy REST format expected by all service files
      // (data.candidates[0].content.parts[0].text, data.usageMetadata, etc.)
      const text = response.text ?? '';
      return {
        candidates: [{ content: { parts: [{ text }] } }],
        usageMetadata: {
          promptTokenCount:     response.usageMetadata?.promptTokenCount     ?? 0,
          candidatesTokenCount: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    } catch (err: any) {
      // 503 means the model itself is overloaded, not the API key. Fast-fail instead of retrying all keys.
      if (err?.status === 503) {
        console.error(`[gemini] 🚨 Model ${GEMINI_MODEL} is overloaded (503). Fast-failing to save time.`);
        throw err;
      }
      
      console.warn(`[gemini] ⚠️  Key for [${email}] failed. Trying next most-rested key...`);
      lastError = err;
    }
  }

  console.error('[gemini] 🚨 All API keys in the pool exhausted. No response from Gemini.');
  throw lastError;
};
