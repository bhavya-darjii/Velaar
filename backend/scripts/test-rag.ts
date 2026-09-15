import '../env.js';
import { embedText, chunkText, ingestDocument, retrieveContext, clearDocuments } from '../services/ragService.js';

async function testRAG() {
  console.log('🧪 Starting RAG Pipeline Test...\n');

  // 1. Test embedding
  console.log('1️⃣ Testing Gemini gemini-embedding-001 (768-dim)...');
  try {
    const vector = await embedText('Photosynthesis is the process by which green plants synthesize nutrients from carbon dioxide and water.');
    console.log(`   ✅ Embedding successful! Vector dimension: ${vector.length}`);
  } catch (err) {
    console.error('   ❌ Embedding failed:', err);
    return;
  }

  // 2. Test chunking
  console.log('\n2️⃣ Testing text chunking...');
  const sampleText = `
    Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles.
    It is the foundation of all quantum physics including quantum chemistry, quantum field theory, quantum technology, and quantum information science.
    Classical physics, the collection of theories that existed before the advent of quantum mechanics, describes many aspects of nature at an ordinary scale, but is not sufficient for describing them at small subatomic scales.
    Most theories in classical physics can be derived from quantum mechanics as an approximation valid at large scale.
    Quantum mechanics differs from classical physics in that energy, momentum, angular momentum, and other quantities of a bound system are restricted to discrete values, objects have characteristics of both particles and waves, and there are limits to how accurately the value of a physical quantity can be predicted prior to its measurement, given a complete set of initial conditions.
  `.repeat(5);

  const chunks = chunkText(sampleText, 50, 10);
  console.log(`   ✅ Chunked into ${chunks.length} chunks.`);

  // 3. Test Ingest
  console.log('\n3️⃣ Testing Ingestion into Supabase document_chunks...');
  const testTeacherId = 'test-teacher-rag-diag-123';
  const testCourseId = 'test-course-rag-diag-123';
  try {
    const ingestResult = await ingestDocument({
      text: sampleText,
      teacherId: testTeacherId,
      courseId: testCourseId,
      sourceName: 'Quantum Mechanics Primer.pdf',
      sourceType: 'textbook',
    });
    console.log(`   ✅ Successfully ingested ${ingestResult.chunksIngested} chunks!`);
  } catch (err) {
    console.error('   ❌ Ingest failed:', err);
    return;
  }

  // 4. Test Semantic Retrieval via match_chunks RPC
  console.log('\n4️⃣ Testing Semantic Retrieval (match_chunks RPC)...');
  try {
    const context = await retrieveContext({
      query: 'How does classical physics differ from quantum mechanics at subatomic scales?',
      teacherId: testTeacherId,
      courseId: testCourseId,
      topK: 3,
    });
    console.log('   ✅ Retrieval query completed!');
    if (context) {
      console.log(`\n--- Retrieved Context Preview ---\n${context.substring(0, 300)}...\n---------------------------------`);
    } else {
      console.warn('   ⚠️ No context returned (match_chunks RPC might be missing or similarity below threshold).');
    }
  } catch (err) {
    console.error('   ❌ Retrieval failed:', err);
  }

  // 5. Cleanup
  console.log('\n5️⃣ Cleaning up test data...');
  try {
    const clearResult = await clearDocuments({ teacherId: testTeacherId, courseId: testCourseId });
    console.log(`   ✅ Cleaned up ${clearResult.deleted} test chunks.`);
  } catch (err) {
    console.error('   ❌ Cleanup failed:', err);
  }

  console.log('\n🎉 RAG Pipeline Test Finished!');
}

testRAG();
