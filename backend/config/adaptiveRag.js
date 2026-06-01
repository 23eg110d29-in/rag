import '../config/env.js';

const numberFromEnv = (name, fallback, min, max) => {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
};

const boolFromEnv = (name, fallback) => {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === 'true';
};

export const QUERY_TYPES = Object.freeze({
  GENERAL_KNOWLEDGE: 'general_knowledge',
  DOCUMENT_SEARCH: 'document_search',
  CODE_SEARCH: 'code_search',
  DATABASE_QUERY: 'database_query',
  WEB_SEARCH: 'web_search'
});

export const RETRIEVAL_SOURCES = Object.freeze({
  DIRECT_LLM: 'direct_llm',
  VECTOR_DATABASE: 'vector_database',
  LOCAL_DOCUMENTS: 'local_documents',
  CODE_REPOSITORY: 'code_repository',
  SQL_DATABASE: 'sql_database',
  WEB_SEARCH_API: 'web_search_api'
});

export const getAdaptiveRagConfig = () => ({
  enabled: boolFromEnv('ADAPTIVE_RAG_ENABLED', true),
  directAnswerConfidenceThreshold: numberFromEnv('ADAPTIVE_DIRECT_CONFIDENCE_THRESHOLD', 0.86, 0, 1),
  retrievalConfidenceThreshold: numberFromEnv('ADAPTIVE_RETRIEVAL_CONFIDENCE_THRESHOLD', 0.62, 0, 1),
  relevanceThreshold: numberFromEnv('ADAPTIVE_RELEVANCE_THRESHOLD', 0.18, 0, 1),
  verificationThreshold: numberFromEnv('ADAPTIVE_VERIFICATION_THRESHOLD', 0.18, 0, 1),
  maxRetries: numberFromEnv('ADAPTIVE_MAX_RETRIES', 1, 0, 5),
  tokenBudget: numberFromEnv('ADAPTIVE_CONTEXT_TOKEN_BUDGET', 3200, 500, 20000),
  topK: {
    simple: numberFromEnv('ADAPTIVE_TOPK_SIMPLE', 3, 1, 20),
    medium: numberFromEnv('ADAPTIVE_TOPK_MEDIUM', 5, 1, 20),
    complex: numberFromEnv('ADAPTIVE_TOPK_COMPLEX', 10, 1, 20)
  },
  cache: {
    embeddingsEnabled: boolFromEnv('ADAPTIVE_EMBEDDING_CACHE_ENABLED', true),
    retrievalEnabled: boolFromEnv('ADAPTIVE_RETRIEVAL_CACHE_ENABLED', true),
    ttlMs: numberFromEnv('ADAPTIVE_CACHE_TTL_MS', 300000, 1000, 86400000),
    maxEntries: numberFromEnv('ADAPTIVE_CACHE_MAX_ENTRIES', 250, 10, 10000)
  },
  retrievers: {
    codeRoot: process.env.CODE_SEARCH_ROOT || process.cwd(),
    databaseEndpoint: process.env.SQL_RETRIEVER_ENDPOINT || '',
    databaseApiKey: process.env.SQL_RETRIEVER_API_KEY || '',
    webEndpoint: process.env.WEB_SEARCH_ENDPOINT || '',
    webApiKey: process.env.WEB_SEARCH_API_KEY || ''
  }
});
