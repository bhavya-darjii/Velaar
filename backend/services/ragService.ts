/* eslint-disable */
// @ts-nocheck
/**
 * RAG Service — Retrieval-Augmented Generation core.
 *
 * Responsibilities:
 *   1. embedText(text)         — Gemini text-embedding-004 → 768-dim vector
 *   2. chunkText(text)         — Split large text into overlapping 500-word windows
 *   3. ingestDocument(opts)    — Chunk → embed → upsert into Supabase document_chunks
 *   4. retrieveContext(opts)   — Embed query → cosine search → formatted context string
 *   5. clearDocuments(opts)    — Delete chunks for a course/teacher from DB
 *
 * Zero new npm dependencies:
 *   - Embeddings: @google/genai (already in package.json)
 *   - Vector storage: @supabase/supabase-js + Supabase pgvector (already in package.json)
 */

import { GoogleGenAI } from '@google/genai';
import { adminSupabase } from '../supabaseAdmin.js';

// ─── Embedding Model Config ────────────────────────────────────────────────────
const EMBEDDING_MODEL = 'text-embedding-004'; // 768 dimensions
const CHUNK_SIZE_WORDS = 500;
const CHUNK_OVERLAP_WORDS = 50;
const DEFAULT_TOP_K = 5;
const MIN_SIMILARITY = 0.3;

// ─── Singleton embedding client (uses first available API key) ─────────────────
let _embeddingClient: GoogleGenAI | null = null;

function getEmbeddingClient(): GoogleGenAI {
  if (_embeddingClient) return _embeddingClient;

  const rawKeys = (process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY || '').split(',');
  for (const k of rawKeys) {
    const trimmed = k.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    const key = colonIdx > 0 ? trimmed.slice(colonIdx + 1).trim() : trimmed;
    if (key) {
      _embeddingClient = new GoogleGenAI({ apiKey: key });
      return _embeddingClient;
    }
  }
  throw new Error('[ragService] No Google API key available for embeddings.');
}

// ─── 1. Embed a text string → number[] ────────────────────────────────────────
export async function embedText(text: string): Promise<number[]> {
  const client = getEmbeddingClient();
  const response = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text.substring(0, 8000), // Gemini embedding context limit
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error('[ragService] embedText: empty embedding response from Gemini.');
  }
  return values;
}

// ─── 2. Chunk text into overlapping windows ────────────────────────────────────
export function chunkText(
  text: string,
  chunkSizeWords = CHUNK_SIZE_WORDS,
  overlapWords = CHUNK_OVERLAP_WORDS,
): string[] {
  // Normalize whitespace
  const normalized = text.replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ').filter(w => w.length > 0);

  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSizeWords, words.length);
    const chunk = words.slice(start, end).join(' ').trim();

    // Only store chunks with meaningful content (> 30 words)
    if (chunk.split(' ').length > 30) {
      chunks.push(chunk);
    }

    if (end >= words.length) break;
    start += chunkSizeWords - overlapWords;
  }

  return chunks;
}

// ─── 3. Ingest a document into the RAG knowledge base ─────────────────────────
export interface IngestOptions {
  text: string;
  teacherId: string;
  courseId?: string;
  institutionId?: string;
  sourceName?: string;
  sourceType?: 'syllabus' | 'textbook' | 'lecture_note' | 'lab_manual';
}

export async function ingestDocument(opts: IngestOptions): Promise<{ chunksIngested: number }> {
  const {
    text,
    teacherId,
    courseId = null,
    institutionId = null,
    sourceName = 'Unnamed Document',
    sourceType = 'syllabus',
  } = opts;

  if (!adminSupabase) {
    console.warn('[ragService] ingestDocument: adminSupabase not configured — skipping ingest.');
    return { chunksIngested: 0 };
  }

  if (!teacherId) {
    throw new Error('[ragService] ingestDocument: teacherId is required.');
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    console.warn('[ragService] ingestDocument: no usable chunks extracted from text.');
    return { chunksIngested: 0 };
  }

  console.log(`[ragService] Ingesting "${sourceName}" — ${chunks.length} chunks for teacher ${teacherId}...`);

  // Embed all chunks (batched sequentially to respect rate limits)
  const rows: object[] = [];
  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await embedText(chunks[i]);
      rows.push({
        teacher_id:     teacherId,
        course_id:      courseId,
        institution_id: institutionId,
        source_name:    sourceName,
        source_type:    sourceType,
        chunk_index:    i,
        content:        chunks[i],
        embedding:      JSON.stringify(embedding), // supabase-js v2 accepts JSON string for vector
      });
    } catch (err) {
      console.warn(`[ragService] Failed to embed chunk ${i} — skipping:`, err instanceof Error ? err.message : err);
    }
  }

  if (rows.length === 0) return { chunksIngested: 0 };

  const { error } = await adminSupabase.from('document_chunks').insert(rows);
  if (error) {
    console.error('[ragService] ingestDocument DB error:', error.message);
    throw new Error(`RAG ingest failed: ${error.message}`);
  }

  console.log(`[ragService] ✅ Ingested ${rows.length} chunks for "${sourceName}".`);
  return { chunksIngested: rows.length };
}

// ─── 4. Retrieve top-K relevant chunks as a formatted context string ───────────
export interface RetrieveOptions {
  query: string;
  courseId?: string;
  teacherId?: string;
  topK?: number;
  minSimilarity?: number;
}

export async function retrieveContext(opts: RetrieveOptions): Promise<string> {
  const {
    query,
    courseId,
    teacherId,
    topK = DEFAULT_TOP_K,
    minSimilarity = MIN_SIMILARITY,
  } = opts;

  if (!adminSupabase) return '';
  if (!query || query.trim().length < 3) return '';

  try {
    const queryEmbedding = await embedText(query);

    const { data, error } = await adminSupabase.rpc('match_chunks', {
      query_embedding:   queryEmbedding,
      match_count:       topK,
      filter_course_id:  courseId || null,
      filter_teacher_id: teacherId || null,
      min_similarity:    minSimilarity,
    });

    if (error) {
      console.error('[ragService] retrieveContext RPC error:', error.message);
      return '';
    }

    if (!data || data.length === 0) return '';

    // Format retrieved chunks as a readable context block
    const contextLines = (data as any[]).map((chunk, i) =>
      `[Source: ${chunk.source_name} | Relevance: ${Math.round(chunk.similarity * 100)}%]\n${chunk.content}`
    );

    return contextLines.join('\n\n---\n\n');
  } catch (err) {
    // Never crash the main AI call because of RAG failure
    console.warn('[ragService] retrieveContext failed (graceful fallback):', err instanceof Error ? err.message : err);
    return '';
  }
}

// ─── 5. Delete all document chunks for a course/teacher ───────────────────────
export interface ClearOptions {
  courseId?: string;
  teacherId?: string;
}

export async function clearDocuments(opts: ClearOptions): Promise<{ deleted: number }> {
  if (!adminSupabase) return { deleted: 0 };
  const { courseId, teacherId } = opts;

  let query = adminSupabase.from('document_chunks').delete();

  if (courseId)  query = query.eq('course_id',  courseId);
  if (teacherId) query = query.eq('teacher_id', teacherId);

  const { error, count } = await query.select('*', { count: 'exact', head: false });

  if (error) {
    console.error('[ragService] clearDocuments error:', error.message);
    throw new Error(`RAG clear failed: ${error.message}`);
  }

  return { deleted: count ?? 0 };
}
