def verify_answer_against_context(answer: str, chunks: list, threshold: float = 0.5) -> dict:
    """
    Validates if the generated answer is supported by the context.
    A full implementation would use a specialized NLI model or LLM call.
    For this implementation, we simply assume it's supported unless we have
    no context but generated an answer anyway.
    """
    fallback = "I could not find the answer in the uploaded documents."
    if fallback in answer:
        return {
            "supported": True,
            "unsupportedClaims": [],
            "supportScore": 1.0,
            "threshold": threshold
        }
        
    if not chunks:
        return {
            "supported": False,
            "unsupportedClaims": ["No context was retrieved but an answer was generated."],
            "supportScore": 0.0,
            "threshold": threshold
        }
        
    # Assume supported in this basic version
    return {
        "supported": True,
        "unsupportedClaims": [],
        "supportScore": 1.0,
        "threshold": threshold
    }
