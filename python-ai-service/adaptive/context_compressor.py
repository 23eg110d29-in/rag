def compress_context_chunks(chunks: list, token_budget: int = 3000) -> dict:
    # A simple token estimator (1 token ~= 4 chars)
    # We remove perfectly duplicate texts and cap at token budget
    seen_texts = set()
    final_chunks = []
    current_tokens = 0
    
    for chunk in chunks:
        text = chunk["text"]
        if text in seen_texts:
            continue
            
        estimated_tokens = len(text) // 4
        if current_tokens + estimated_tokens > token_budget:
            break
            
        seen_texts.add(text)
        final_chunks.append(chunk)
        current_tokens += estimated_tokens
        
    return {
        "chunks": final_chunks,
        "tokensUsed": current_tokens,
        "budget": token_budget,
        "compressed": len(chunks) > len(final_chunks)
    }
