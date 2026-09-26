import '../env.js';
import { adminSupabase } from '../supabaseAdmin.js';

async function inspect() {
  if (!adminSupabase) {
    console.error('adminSupabase is null. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    return;
  }

  // 1. Check document_chunks count
  const { count, error: countErr } = await adminSupabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('Error querying document_chunks count:', countErr.message);
  } else {
    console.log(`\n📊 Total rows in document_chunks: ${count}`);
  }

  // 2. Fetch sample rows
  const { data, error } = await adminSupabase
    .from('document_chunks')
    .select('id, source_name, source_type, teacher_id, course_id, chunk_index, created_at, content, embedding')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching sample rows:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('The table currently has 0 rows (is empty).');
    return;
  }

  console.log(`\nShowing ${data.length} most recent chunk(s):`);
  data.forEach((row, i) => {
    let embeddingPreview = 'None / Null';
    if (row.embedding) {
      if (typeof row.embedding === 'string') {
        try {
          const parsed = JSON.parse(row.embedding);
          embeddingPreview = `Vector JSON (dim: ${Array.isArray(parsed) ? parsed.length : 'unknown'})`;
        } catch {
          embeddingPreview = `Vector string (char length: ${row.embedding.length})`;
        }
      } else if (Array.isArray(row.embedding)) {
        embeddingPreview = `Vector array (${row.embedding.length} dimensions)`;
      } else {
        embeddingPreview = typeof row.embedding;
      }
    }
    console.log(`\n------------------ [Chunk #${i + 1}] ------------------`);
    console.log(`ID:           ${row.id}`);
    console.log(`Source Name:  ${row.source_name}`);
    console.log(`Source Type:  ${row.source_type}`);
    console.log(`Course ID:    ${row.course_id || 'N/A'}`);
    console.log(`Teacher ID:   ${row.teacher_id}`);
    console.log(`Chunk Index:  ${row.chunk_index}`);
    console.log(`Created At:   ${row.created_at}`);
    console.log(`Embedding:    ${embeddingPreview}`);
    console.log(`Content:\n"${row.content.substring(0, 200)}..."\n`);
  });
}

inspect();
