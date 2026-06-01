import random

def calculate_metrics(query: str, answer: str, retrieved_chunks: list) -> dict:
    # In a full production system, you would integrate Ragas or DeepEval here.
    # Because full LLM-as-a-judge evaluations are expensive and slow,
    # this provides a fast heuristic/statistical evaluation based on chunk scores.
    
    num_chunks = len(retrieved_chunks)
    if num_chunks == 0:
        return {
            "precision": 0.0,
            "recall": 0.0,
            "hitRate": 0.0,
            "mrr": 0.0,
            "faithfulness": 0.0,
            "contextPrecision": 0.0,
            "relevance": 0.0,
            "hallucinationRate": 1.0
        }

    # Calculate average relevance score from chunk metadata
    avg_score = sum(c.get("rerankScore", c.get("finalScore", 0)) for c in retrieved_chunks) / num_chunks
    
    # Hit Rate: Was at least one chunk relevant? (Score > 0.15)
    hit_rate = 1.0 if any(c.get("rerankScore", c.get("finalScore", 0)) > 0.15 for c in retrieved_chunks) else 0.0
    
    # MRR (Mean Reciprocal Rank): Rank of first highly relevant chunk (Score > 0.3)
    mrr = 0.0
    for i, c in enumerate(retrieved_chunks):
        if c.get("rerankScore", c.get("finalScore", 0)) > 0.3:
            mrr = 1.0 / (i + 1)
            break
            
    # Precision@K: Proportion of retrieved chunks that are relevant
    relevant_chunks = sum(1 for c in retrieved_chunks if c.get("rerankScore", c.get("finalScore", 0)) > 0.2)
    precision = relevant_chunks / num_chunks
    
    # Recall@K heuristic: Assuming average query needs 2 chunks of info
    recall = min(1.0, relevant_chunks / 2.0)
    
    # Context Precision
    context_precision = min(1.0, avg_score * 1.5)
    
    # Faithfulness: Does the answer overlap with context? 
    # Simple word overlap heuristic for demonstration.
    answer_words = set(answer.lower().split())
    context_words = set(" ".join([c["text"] for c in retrieved_chunks]).lower().split())
    
    if len(answer_words) == 0:
        overlap_ratio = 0
    else:
        overlap = answer_words.intersection(context_words)
        overlap_ratio = len(overlap) / len(answer_words)
        
    faithfulness = min(1.0, overlap_ratio * 1.5)
    
    # If the system used fallback, hallucination should technically be low, but relevance is low
    if "I could not find the answer" in answer:
        faithfulness = 1.0
        hallucination_rate = 0.0
        relevance = 0.0
    else:
        hallucination_rate = max(0.0, 1.0 - faithfulness)
        relevance = min(1.0, precision * hit_rate + 0.2)
        
    return {
        "precision": round(precision, 2),
        "recall": round(recall, 2),
        "hitRate": round(hit_rate, 2),
        "mrr": round(mrr, 2),
        "faithfulness": round(faithfulness, 2),
        "contextPrecision": round(context_precision, 2),
        "relevance": round(relevance, 2),
        "hallucinationRate": round(hallucination_rate, 2)
    }
