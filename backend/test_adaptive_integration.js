import assert from 'assert';

process.env.OPENAI_API_KEY = 'YOUR_API_KEY';
process.env.GEMINI_API_KEY = '';
process.env.ADAPTIVE_RAG_ENABLED = 'true';

const { generateAnswer } = await import('./services/qaService.js');

console.log('--------------------------------------------------');
console.log('Running Adaptive RAG Integration Tests');
console.log('--------------------------------------------------');

const greeting = await generateAnswer('adaptive-integration-greeting', 'hello');
assert.strictEqual(greeting.answer, 'Hello! Ask me anything about your uploaded documents.');
assert.strictEqual(greeting.retrievedChunks.length, 0);
assert.strictEqual(greeting.adaptive.decision.retrievalRequired, false);

const codeResult = await generateAnswer(
  'adaptive-integration-code',
  'Where is generateAnswer implemented in this code repository?',
  { source: 'code_repository', topK: 3, forceRetrieval: true }
);

assert.ok(Array.isArray(codeResult.retrievedChunks));
assert.ok(codeResult.adaptive.classification);
assert.ok(codeResult.adaptive.decision);
assert.ok(codeResult.adaptive.retrievalPlan);

console.log('Adaptive RAG Integration Tests Passed');
console.log('--------------------------------------------------');
