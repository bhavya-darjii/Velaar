/* eslint-disable */
// @ts-nocheck
/**
 * RAG Controller — thin HTTP handlers for the RAG knowledge base.
 * Business logic lives in ragService.ts.
 */

import { Request, Response } from 'express';
import { ingestDocument, retrieveContext, clearDocuments } from '../services/ragService.js';

// ─── POST /api/rag/ingest ─────────────────────────────────────────────────────
/**
 * Ingest an already-extracted text document into the RAG vector store.
 * Called by the frontend after PDF extraction, or automatically by pdfController.
 *
 * Body: { text, sourceName, sourceType, courseId? }
 */
export const ragIngest = async (req: Request, res: Response): Promise<void> => {
  const { text, sourceName, sourceType, courseId } = req.body as {
    text?: string;
    sourceName?: string;
    sourceType?: string;
    courseId?: string;
  };

  if (!text || text.trim().length < 50) {
    res.status(400).json({ error: 'text is required and must be at least 50 characters.' });
    return;
  }

  const teacherId = req.user?.id ?? 'unknown';

  try {
    const result = await ingestDocument({
      text,
      teacherId,
      courseId,
      sourceName: sourceName || 'Uploaded Document',
      sourceType: (sourceType as any) || 'syllabus',
    });
    res.status(200).json({ success: true, chunksIngested: result.chunksIngested });
  } catch (err) {
    console.error('[ragController] ragIngest error:', err);
    res.status(500).json({ error: 'Failed to ingest document into knowledge base.' });
  }
};

// ─── POST /api/rag/query ──────────────────────────────────────────────────────
/**
 * Retrieve the most relevant document chunks for a given query.
 * Used for debugging / testing the RAG pipeline.
 *
 * Body: { query, courseId?, topK? }
 */
export const ragQuery = async (req: Request, res: Response): Promise<void> => {
  const { query, courseId, topK } = req.body as {
    query?: string;
    courseId?: string;
    topK?: number;
  };

  if (!query || query.trim().length < 3) {
    res.status(400).json({ error: 'query must be at least 3 characters.' });
    return;
  }

  const teacherId = req.user?.id ?? 'unknown';

  try {
    const context = await retrieveContext({
      query,
      courseId,
      teacherId,
      topK: topK || 5,
    });
    res.status(200).json({ context, hasResults: context.length > 0 });
  } catch (err) {
    console.error('[ragController] ragQuery error:', err);
    res.status(500).json({ error: 'RAG query failed.' });
  }
};

// ─── DELETE /api/rag/clear ────────────────────────────────────────────────────
/**
 * Delete all document chunks for the requesting teacher (optionally filtered by courseId).
 *
 * Body: { courseId? }
 */
export const ragClear = async (req: Request, res: Response): Promise<void> => {
  const { courseId } = req.body as { courseId?: string };
  const teacherId = req.user?.id ?? 'unknown';

  try {
    const result = await clearDocuments({ courseId, teacherId });
    res.status(200).json({ success: true, deleted: result.deleted });
  } catch (err) {
    console.error('[ragController] ragClear error:', err);
    res.status(500).json({ error: 'Failed to clear knowledge base.' });
  }
};
