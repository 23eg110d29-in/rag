import assert from 'assert';
import { QUERY_TYPES, RETRIEVAL_SOURCES, getAdaptiveRagConfig } from './config/adaptiveRag.js';
import { heuristicClassifyQuery } from './services/adaptive/queryClassifier.js';
import { decideRetrieval } from './services/adaptive/retrievalDecisionEngine.js';
import { estimateQueryComplexity, selectTopK } from './services/adaptive/dynamicRetrieval.js';
import { compressContextChunks } from './services/adaptive/contextCompressor.js';
import { validateRelevance } from './services/adaptive/relevanceValidator.js';
import { verifyAnswerAgainstContext } from './services/adaptive/answerVerifier.js';
import { clearAdaptiveCaches, getCachedValue, setCachedValue } from './services/adaptive/cache.js';

console.log('--------------------------------------------------');
console.log('Running Adaptive RAG Unit Tests');
console.log('--------------------------------------------------');

const codeClassification = heuristicClassifyQuery('Where is the Express chat route implemented in this repo?');
assert.strictEqual(codeClassification.type, QUERY_TYPES.CODE_SEARCH);
assert.ok(codeClassification.confidence > 0.7);

const webClassification = heuristicClassifyQuery('What is the latest OpenAI model today?');
assert.strictEqual(webClassification.type, QUERY_TYPES.WEB_SEARCH);

const generalClassification = {
  type: QUERY_TYPES.GENERAL_KNOWLEDGE,
  confidence: 0.95
};
const directDecision = decideRetrieval(generalClassification);
assert.strictEqual(directDecision.retrievalRequired, false);
assert.strictEqual(directDecision.source, RETRIEVAL_SOURCES.DIRECT_LLM);

const codeDecision = decideRetrieval(codeClassification);
assert.strictEqual(codeDecision.retrievalRequired, true);
assert.strictEqual(codeDecision.source, RETRIEVAL_SOURCES.CODE_REPOSITORY);

assert.strictEqual(estimateQueryComplexity('What is RAG?'), 'simple');
assert.strictEqual(
  estimateQueryComplexity('Compare adaptive and corrective retrieval, then explain tradeoffs for reranking and compression'),
  'complex'
);

const config = getAdaptiveRagConfig();
assert.strictEqual(selectTopK('What is RAG?').topK, config.topK.simple);

const relevance = validateRelevance([{ rerankScore: 0.3 }, { finalScore: 0.1 }], 0.18);
assert.strictEqual(relevance.passed, true);
assert.strictEqual(relevance.evaluatedChunks, 2);

const compression = compressContextChunks([
  { text: 'OpenAI embeddings create vector representations.', metadata: { source: 'a', index: 0 } },
  { text: 'OpenAI embeddings create vector representations.', metadata: { source: 'a', index: 1 } },
  { text: 'Hybrid search combines semantic and keyword retrieval.', metadata: { source: 'b', index: 0 } }
], 200);
assert.strictEqual(compression.chunks.length, 2);
assert.strictEqual(compression.removedChunks, 1);

const verification = verifyAnswerAgainstContext(
  'Hybrid search combines semantic and keyword retrieval.',
  [{ text: 'Hybrid search combines semantic and keyword retrieval.', metadata: { source: 'b', index: 0 } }],
  0.18
);
assert.strictEqual(verification.supported, true);

clearAdaptiveCaches();
setCachedValue('test', 'key', { ok: true });
assert.deepStrictEqual(getCachedValue('test', 'key'), { ok: true });

console.log('Adaptive RAG Unit Tests Passed');
console.log('--------------------------------------------------');
