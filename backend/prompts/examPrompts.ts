/* eslint-disable */
// @ts-nocheck
/**
 * Exam paper prompt builders.
 * Pure functions — no side effects, no imports.
 */

export const buildExamTheoryPrompt = (structureMap, variantNum, topicsList) => `
          Task: Generate ${Object.keys(structureMap).length} THEORETICAL exam questions for Variant #${variantNum}.
          
          ==== SYLLABUS TOPICS ====
          [${topicsList}]
          
          INSTRUCTIONS:
          1. Generate conceptually strong, theoretical questions based ONLY on the syllabus topics above.
          2. MUST NOT be numerical questions.
          3. Return ONLY a RAW JSON OBJECT covering EXACTLY the keys in the structure below. No markdown.

          STRUCTURE TO FILL:
          ${JSON.stringify(structureMap, null, 2)}
        `;

export const buildExamNumericalPrompt = (structureMap, variantNum, numericalPrompt, looksLikeExample, pastNumericals) => `
          Task: Generate ${Object.keys(structureMap).length} NUMERICAL exam questions for Variant #${variantNum}.
          
          ==== NUMERICAL GUIDANCE (ABSOLUTE SOURCE OF TRUTH) ====
          ${numericalPrompt ? `"${numericalPrompt}"` : 'Generate numerical problems based on general engineering/science applications.'}
          
          ${looksLikeExample ? `
          âš ï¸ TEMPLATE REWRITING MODE:
          The guidance above is a SPECIFIC PROBLEM/EXAMPLE. You MUST:
          1. Generate the EXACT SAME TYPE of problem (same algorithm, same concept, same domain).
          2. CHANGE the specific values (e.g., use a different array, different graph edges, different voltage).
          3. Do NOT generate numericals from any other topic.
          ` : `
          âš ï¸ TOPIC MODE: Use the guidance above as the exact subject area.
          `}

          ${pastNumericals && pastNumericals.length > 0 ? `
          ==== PAST GENERATED EXAMPLES TO EMULATE (STYLE/DIFFICULTY REFERENCE) ====
          ${pastNumericals.map((q, i) => `${i + 1}. ${q}`).join('\n')}
          (Use these past examples strictly as a stylistic reference to maintain consistency across generation sets.)
          ` : ''}

          INSTRUCTIONS:
          1. Generate mathematically solvable problems strictly following the guidance above.
          2. Return ONLY a RAW JSON OBJECT covering EXACTLY the keys in the structure below. No markdown.

          STRUCTURE TO FILL:
          ${JSON.stringify(structureMap, null, 2)}
        `;

