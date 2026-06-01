def select_top_k(query: str, options: dict = None) -> dict:
    options = options or {}
    
    if options.get("topK"):
        k = max(1, min(20, int(options["topK"])))
        return {"topK": k, "reason": f"Explicitly set to {k} via options"}
        
    word_count = len(query.split())
    
    if word_count > 25 or "?" in query or "explain" in query.lower() or "compare" in query.lower():
        return {"topK": 10, "reason": "Complex query structure or high word count."}
    elif word_count > 10:
        return {"topK": 5, "reason": "Medium complexity query."}
    else:
        return {"topK": 3, "reason": "Simple query."}
