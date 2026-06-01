import asyncio
from adaptive import (
    classify_query, decide_retrieval, select_top_k, rewrite_query,
    route_retrieval, rerank_documents, validate_relevance, compress_context_chunks,
    verify_answer_against_context, create_rag_trace
)

def test_classifier():
    result = classify_query("What is the latest weather in NY?")
    print("Classification:", result)
    assert result["type"] == "web_search", f"Expected web_search, got {result['type']}"

def test_decision():
    classification = {"type": "code_search"}
    decision = decide_retrieval(classification)
    print("Decision:", decision)
    assert decision["retrievalRequired"] == True
    assert decision["source"] == "code_repository"

def test_dynamic_retrieval():
    query = "hi"
    res = select_top_k(query)
    assert res["topK"] == 3
    
    query = "explain the differences between vector database collections and relational tables?"
    res = select_top_k(query)
    assert res["topK"] == 10

def test_compressor():
    chunks = [{"text": "A" * 1000}, {"text": "A" * 1000}, {"text": "B" * 5000}]
    res = compress_context_chunks(chunks, token_budget=1000)
    print("Compressed:", len(res["chunks"]))
    assert len(res["chunks"]) < 3 # "A"*1000 is duped, and B*5000 should exceed 1000 tokens (5000//4 = 1250)

if __name__ == "__main__":
    print("Running Python Adaptive RAG Unit Tests...")
    test_classifier()
    test_decision()
    test_dynamic_retrieval()
    test_compressor()
    print("All tests passed!")
