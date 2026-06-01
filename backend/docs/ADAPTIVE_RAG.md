# Adaptive RAG Backend

This backend keeps the existing document RAG API and adds an adaptive orchestration layer behind `POST /api/chat`.

## Request Flow

1. Classify the query as `general_knowledge`, `document_search`, `code_search`, `database_query`, or `web_search`.
2. Decide whether retrieval is required. High-confidence general knowledge can go directly to the LLM.
3. Estimate query complexity and choose Top-K:
   - simple: `ADAPTIVE_TOPK_SIMPLE`
   - medium: `ADAPTIVE_TOPK_MEDIUM`
   - complex: `ADAPTIVE_TOPK_COMPLEX`
4. Rewrite the query for retrieval.
5. Route retrieval to vector documents, code search, SQL adapter, web adapter, or direct LLM.
6. Validate relevance, retry with a rewritten query when relevance is low, and cap retries with `ADAPTIVE_MAX_RETRIES`.
7. Compress retrieved context into `ADAPTIVE_CONTEXT_TOKEN_BUDGET`.
8. Generate a grounded answer and verify answer claims against retrieved context.
9. Emit one structured JSON log line per chat response.

## Endpoints

- `POST /api/chat`: existing chat endpoint, now includes an `adaptive` metadata object.
- `GET /api/adaptive-rag/config`: returns active adaptive configuration with secrets redacted.
- `POST /api/adaptive-rag/classify`: returns classification, decision, Top-K plan, and rewritten query.
- `POST /api/evaluation/adaptive-rag`: runs evaluation cases and writes a JSON report under `data/evaluation-reports`.

## Retrieval Options

`POST /api/chat` accepts the existing `retrievalOptions` object plus:

```json
{
  "forceRetrieval": true,
  "source": "code_repository",
  "topK": 5,
  "mode": "adaptive",
  "ragMode": "adaptive"
}
```

Valid sources are `vector_database`, `local_documents`, `code_repository`, `sql_database`, `web_search_api`, and `direct_llm`.
Valid RAG modes are `standard`, `adaptive`, and `corrective`.

## SQL And Web Adapters

The SQL and web retrievers are intentionally provider-neutral.

- `SQL_RETRIEVER_ENDPOINT` receives `POST { "query": "...", "topK": 5 }`.
- `WEB_SEARCH_ENDPOINT` receives `GET ?q=...&limit=5`.

Both adapters expect JSON with `results` or `items` arrays. Each item can contain `text`, `snippet`, `content`, `source`, `url`, `title`, and `score`.

## Evaluation Case Shape

```json
{
  "cases": [
    {
      "query": "What does the uploaded circular say?",
      "expectedSources": ["Circular-Bakrid-Holiday-1-1779789493774.pdf"],
      "expectedAnswer": "The holiday is for Bakrid."
    }
  ]
}
```

The report includes context relevance, answer correctness, and latency.

## Notes

- Classification and rewriting use OpenAI or Gemini when configured, then fall back to deterministic heuristics.
- Embedding and retrieval caches are in-memory and controlled by `ADAPTIVE_*CACHE*` settings.
- Structured logs hash session and query content so observability does not leak raw user text.
