def rerank_documents(query: str, chunks: list) -> list:
    """
    Reranks documents. In a real system, we might use Cohere or a local Cross-Encoder.
    For this naive implementation without heavy dependencies, we'll just return the original sorted list,
    as hybrid_search already ranks them. But we could inject a Cross-Encoder here.
    """
    # Try importing sentence_transformers for Cross-Encoder
    try:
        from sentence_transformers import CrossEncoder
        model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        pairs = [[query, chunk["text"]] for chunk in chunks]
        scores = model.predict(pairs)
        
        for idx, chunk in enumerate(chunks):
            chunk["rerankScore"] = float(scores[idx])
            chunk["reranker"] = "CrossEncoder"
            
        chunks.sort(key=lambda x: x["rerankScore"], reverse=True)
    except ImportError:
        # Fallback if sentence-transformers is not installed
        for chunk in chunks:
            chunk["rerankScore"] = chunk.get("finalScore", 0.0)
            chunk["reranker"] = "none"
            
    return chunks
