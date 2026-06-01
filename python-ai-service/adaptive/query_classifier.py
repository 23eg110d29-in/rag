import os
import json
import re
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

QUERY_TYPES = {
    "SYMPTOM_QUERY": "symptom_query",
    "DRUG_QUERY": "drug_query",
    "DISEASE_EXPLANATION": "disease_explanation",
    "EMERGENCY_QUERY": "emergency_query",
    "TREATMENT_QUERY": "treatment_query",
    "GENERAL_KNOWLEDGE": "general_knowledge"
}

def heuristic_classify_query(query: str) -> dict:
    lower = str(query or "").lower()
    scores = {qt: 0.1 for qt in QUERY_TYPES.values()}
    
    if re.search(r'\b(pain|fever|cough|headache|nausea|dizzy|symptom|ache|bleeding)\b', lower):
        scores[QUERY_TYPES["SYMPTOM_QUERY"]] += 0.8
    if re.search(r'\b(pill|drug|medication|dose|mg|tablet|side effect|tylenol|aspirin|ibuprofen|antibiotic)\b', lower):
        scores[QUERY_TYPES["DRUG_QUERY"]] += 0.8
    if re.search(r'\b(what is|explain|disease|syndrome|disorder|condition|virus|bacteria)\b', lower):
        scores[QUERY_TYPES["DISEASE_EXPLANATION"]] += 0.7
    if re.search(r'\b(emergency|911|heart attack|stroke|unconscious|not breathing|severe|fatal)\b', lower):
        scores[QUERY_TYPES["EMERGENCY_QUERY"]] += 0.9
    if re.search(r'\b(treatment|cure|heal|therapy|surgery|remedy)\b', lower):
        scores[QUERY_TYPES["TREATMENT_QUERY"]] += 0.8
    if re.search(r'^(hi|hello|hey|thanks|thank you|ok|okay)\b', lower):
        scores[QUERY_TYPES["GENERAL_KNOWLEDGE"]] += 0.9
        
    for k in scores:
        scores[k] = max(0.0, min(1.0, scores[k]))
        
    best_type = max(scores, key=scores.get)
    return {
        "type": best_type,
        "confidence": scores[best_type],
        "scores": scores,
        "classifier": "heuristic",
        "reason": "Keyword and intent cues were used."
    }

def classify_query(query: str) -> dict:
    fallback = heuristic_classify_query(query)
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY":
        return fallback
        
    system_prompt = f"""Classify the medical user query into exactly one of these types: {', '.join(QUERY_TYPES.values())}.
Return ONLY JSON in this format: {{"type":"...","confidence":0.0,"scores":{{...}},"reason":"short reason"}}."""

    try:
        model = ChatOpenAI(openai_api_key=api_key, model_name=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"), temperature=0)
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=query)]
        response = model.invoke(messages)
        
        content = response.content
        match = re.search(r'\{[\s\S]*\}', content)
        if match:
            parsed = json.loads(match.group(0))
            if parsed.get("type") in QUERY_TYPES.values():
                return {
                    "type": parsed["type"],
                    "confidence": parsed.get("confidence", 0.0),
                    "scores": parsed.get("scores", {}),
                    "classifier": "openai",
                    "reason": parsed.get("reason", fallback["reason"])
                }
    except Exception as e:
        print(f"[AdaptiveRAG] OpenAI classification failed: {e}")
        
    return fallback
