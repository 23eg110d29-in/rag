def validate_relevance(chunks: list, threshold: float = 0.18) -> dict:
    if not chunks:
        return {
            "passed": False,
            "bestScore": 0,
            "averageScore": 0,
            "threshold": threshold,
            "evaluatedChunks": 0
        }
        
    scores = [c.get("rerankScore", c.get("finalScore", 0.0)) for c in chunks]
    best_score = max(scores)
    avg_score = sum(scores) / len(scores)
    
    return {
        "passed": best_score >= threshold,
        "bestScore": best_score,
        "averageScore": avg_score,
        "threshold": threshold,
        "evaluatedChunks": len(chunks)
    }
