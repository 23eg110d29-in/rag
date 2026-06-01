import assert from 'assert';
import { buildRetrievalConfig, calculateKeywordScore, expandQueryTokens } from './services/hybridSearch.js';
import { rerankCandidates } from './services/reranker.js';

const assertApproxGreater = (actual, expected, label) => {
  assert.ok(actual > expected, `${label}: expected ${actual} to be greater than ${expected}`);
};

console.log('--------------------------------------------------');
console.log('Running Retrieval Tools Verification');
console.log('--------------------------------------------------');

const standardConfig = buildRetrievalConfig(5, { mode: 'standard' });
const correctiveConfig = buildRetrievalConfig(5, { mode: 'corrective' });
const disabledConfig = buildRetrievalConfig(5, {
  hybridEnabled: false,
  rerankEnabled: false,
  expansionEnabled: false,
  topK: 99,
  candidatePool: 1000,
  minScore: -1
});

assert.strictEqual(standardConfig.mode, 'standard');
assert.strictEqual(standardConfig.topK, 5);
assert.strictEqual(standardConfig.candidatePool, 30);
assert.strictEqual(standardConfig.minScore, 0.12);
assert.ok(standardConfig.semanticWeight > standardConfig.keywordWeight);

assert.strictEqual(correctiveConfig.mode, 'corrective');
assert.strictEqual(correctiveConfig.candidatePool, 60);
assert.ok(correctiveConfig.keywordWeight > correctiveConfig.semanticWeight);

assert.strictEqual(disabledConfig.topK, 10);
assert.strictEqual(disabledConfig.candidatePool, 80);
assert.strictEqual(disabledConfig.minScore, 0);
assert.strictEqual(disabledConfig.hybridEnabled, false);
assert.strictEqual(disabledConfig.rerankEnabled, false);
assert.strictEqual(disabledConfig.expansionEnabled, false);
console.log('✅ Retrieval config presets and clamps work');

const expandedTokens = expandQueryTokens(['curd']);
assert.deepStrictEqual(expandedTokens, ['curd', 'crud', 'create', 'read', 'update', 'delete']);

const expandedKeywordScore = calculateKeywordScore(
  'CRUD operations mean create read update and delete.',
  expandedTokens
);
const unexpandedKeywordScore = calculateKeywordScore(
  'CRUD operations mean create read update and delete.',
  ['curd']
);

assertApproxGreater(expandedKeywordScore, unexpandedKeywordScore, 'query expansion should improve keyword coverage');
console.log('✅ Query expansion changes scoring');

const candidates = [
  {
    text: 'CRUD systems use create read update and delete operations.',
    metadata: { source: 'crud.txt', index: 0 },
    semanticScore: 0.25,
    keywordScore: 1,
    finalScore: 0.6,
    retrievalMode: 'corrective',
    matchedQueryTokens: expandedTokens
  },
  {
    text: 'Unrelated semantic paragraph with little matching terminology.',
    metadata: { source: 'semantic.txt', index: 0 },
    semanticScore: 0.8,
    keywordScore: 0,
    finalScore: 0.5,
    retrievalMode: 'corrective',
    matchedQueryTokens: expandedTokens
  }
];

const reranked = await rerankCandidates('curd operations', ['curd', 'operations'], candidates, 2, correctiveConfig);
assert.strictEqual(reranked[0].metadata.source, 'crud.txt');
assert.strictEqual(reranked[0].reranker, 'weighted-hybrid-mmr');
assert.ok(typeof reranked[0].rerankScore === 'number');
console.log('✅ Reranker changes final ordering using hybrid evidence');

console.log('--------------------------------------------------');
console.log('Retrieval Tools Verification Passed');
console.log('--------------------------------------------------');
