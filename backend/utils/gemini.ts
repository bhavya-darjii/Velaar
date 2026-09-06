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

const PRIMARY_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODELS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
const ALL_MODELS = [PRIMARY_MODEL, ...FALLBACK_MODELS];

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
  console.log(`[gemini] 🚀 Initialized LRU API Pool with ${API_KEYS.length} key(s). Models: ${ALL_MODELS.join(', ')}.`);
}

// Track the last time each key was used (ms) to maximize cooldowns
const lastUsedTimes = new Array(API_KEYS.length).fill(0);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call the Gemini API with the given payload using the LRU key pool and model fallback.
 * Automatically retries across keys and models, and handles 503 spikes gracefully.
 *
 * @param bodyPayload - The full request body (contents, systemInstruction, generationConfig, etc.)
 * @returns The raw Gemini API response object.
 */
export const callGemini = async (bodyPayload: Record<string, unknown>): Promise<unknown> => {
  if (API_KEYS.length === 0) {
    throw new Error('No GOOGLE_API_KEYS configured on the server.');
  }

  let lastError: unknown;
  const maxAttempts = 2; // Pass 1: standard; Pass 2: after brief backoff if 503 encountered

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    for (const model of ALL_MODELS) {
      // Sort indices by LRU — pick the key that has been resting the longest
      const sortedIndices = API_KEYS
        .map((_, i) => i)
        .sort((a, b) => lastUsedTimes[a] - lastUsedTimes[b]);

      let modelOverloaded = false;

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
            model,
            contents,
            ...(Object.keys(config).length > 0 && { config }),
            ...rest,
          } as GenerateContentParameters);

          // Adapt the SDK response to the legacy REST format expected by all service files
          const text = response.text ?? '';
          return {
            candidates: [{ content: { parts: [{ text }] } }],
            usageMetadata: {
              promptTokenCount:     response.usageMetadata?.promptTokenCount     ?? 0,
              candidatesTokenCount: response.usageMetadata?.candidatesTokenCount ?? 0,
            },
          };
        } catch (err: any) {
          // 503 means the model itself is temporarily overloaded. Try next model in pool.
          if (err?.status === 503) {
            console.warn(`[gemini] ⚠️ Model ${model} returned 503 (Overloaded). Switching to alternative model...`);
            modelOverloaded = true;
            lastError = err;
            break; // Break key loop to try alternative model
          }
          
          console.warn(`[gemini] ⚠️ Key for [${email}] failed on ${model}: ${err?.message || err}. Trying next key...`);
          lastError = err;
        }
      }

      if (!modelOverloaded && lastError === undefined) {
        // Successful response already returned above
        return;
      }
    }

    // If both models were overloaded and attempt 1 failed, wait 1.2s before attempt 2
    if (attempt < maxAttempts) {
      console.warn('[gemini] ⏳ High traffic detected across models. Waiting 1.2s before retry...');
      await sleep(1200);
    }
  }

  console.error('[gemini] 🚨 All API keys and model fallbacks exhausted. No response from Gemini.');
  throw lastError;
};
