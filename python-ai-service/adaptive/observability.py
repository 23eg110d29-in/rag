import json
import logging
from datetime import datetime

logger = logging.getLogger("AdaptiveRAG")
logger.setLevel(logging.INFO)

def create_rag_trace(session_id: str, query: str) -> dict:
    return {
        "session_id": session_id,
        "query": query,
        "start_time": datetime.utcnow(),
        "events": []
    }

def record_trace_event(trace_context: dict, event_name: str, event_data: dict):
    trace_context["events"].append({
        "event": event_name,
        "at": datetime.utcnow().isoformat(),
        **event_data
    })

def finish_rag_trace(trace_context: dict, summary: dict):
    latency_ms = (datetime.utcnow() - trace_context["start_time"]).total_seconds() * 1000
    log_entry = {
        "level": "info",
        "type": "adaptive_rag_trace",
        "session_id": trace_context["session_id"],
        "query": trace_context["query"],
        "latency_ms": int(latency_ms),
        "events": trace_context["events"],
        **summary
    }
    logger.info(json.dumps(log_entry))
