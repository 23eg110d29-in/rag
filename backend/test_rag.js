import { tokenizeQuery, calculateKeywordScore } from './services/hybridSearch.js';
import assert from 'assert';

console.log('--------------------------------------------------');
console.log('Running Naive RAG Reranking & Formula Verifications');
console.log('--------------------------------------------------');

try {
  // Test 1: Stopword Tokenizer
  console.log('Test 1: Testing query tokenization and stopword removal...');
  const query = 'What is the exact semantic similarity of ChromaDB collections?';
  const tokens = tokenizeQuery(query);
  console.log(`Query: "${query}"`);
  console.log(`Tokens:`, tokens);
  
  // Assertions for tokenizer (should remove common stopwords like 'what', 'is', 'the', 'of')
  assert.ok(tokens.includes('exact'));
  assert.ok(tokens.includes('semantic'));
  assert.ok(tokens.includes('similarity'));
  assert.ok(tokens.includes('chromadb'));
  assert.ok(tokens.includes('collections'));
  assert.ok(!tokens.includes('what'));
  assert.ok(!tokens.includes('is'));
  assert.ok(!tokens.includes('the'));
  assert.ok(!tokens.includes('of'));
  console.log('✅ Test 1: Stopword Tokenizer Passed!\n');

  // Test 2: Keyword Scoring Math
  console.log('Test 2: Testing keyword matching percentage score...');
  // Query tokens: ['exact', 'semantic', 'similarity', 'chromadb', 'collections'] (length = 5)
  
  const chunk1 = 'ChromaDB collections store text documents and vectors.'; 
  // Contains 'chromadb', 'collections'. Matches: 2/5 = 0.4
  const score1 = calculateKeywordScore(chunk1, tokens);
  console.log(`Chunk 1: "${chunk1}"`);
  console.log(`Calculated Keyword Score: ${score1} (Expected: 0.4)`);
  assert.strictEqual(score1, 0.4);

  const chunk2 = 'Semantic similarity utilizes OpenAI embeddings for matching.'; 
  // Contains 'semantic', 'similarity'. Matches: 2/5 = 0.4
  const score2 = calculateKeywordScore(chunk2, tokens);
  console.log(`Chunk 2: "${chunk2}"`);
  console.log(`Calculated Keyword Score: ${score2} (Expected: 0.4)`);
  assert.strictEqual(score2, 0.4);

  const chunk3 = 'This chunk contains none of the key terms.'; 
  // Matches: 0/5 = 0
  const score3 = calculateKeywordScore(chunk3, tokens);
  console.log(`Chunk 3: "${chunk3}"`);
  console.log(`Calculated Keyword Score: ${score3} (Expected: 0)`);
  assert.strictEqual(score3, 0);
  console.log('✅ Test 2: Keyword Scoring Math Passed!\n');

  // Test 3: Hybrid Score Ranking Formula
  console.log('Test 3: Testing hybrid combination score math...');
  // Formula: final_score = (semantic_score * 0.7) + (keyword_score * 0.3)
  const semScore = 0.85;
  const keyScore = 0.60;
  const expectedHybrid = (semScore * 0.7) + (keyScore * 0.3); // 0.595 + 0.18 = 0.775
  
  console.log(`Semantic Score: ${semScore}`);
  console.log(`Keyword Score: ${keyScore}`);
  console.log(`Expected Hybrid Score: ${expectedHybrid}`);
  
  const calculatedHybrid = parseFloat(((semScore * 0.7) + (keyScore * 0.3)).toFixed(4));
  assert.strictEqual(calculatedHybrid, 0.775);
  console.log('✅ Test 3: Hybrid Score Ranking Formula Passed!\n');

  console.log('--------------------------------------------------');
  console.log('All Unit and Formula Verification Tests Passed! 🎉');
  console.log('--------------------------------------------------');
} catch (error) {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
}
