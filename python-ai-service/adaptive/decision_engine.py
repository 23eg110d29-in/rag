def decide_retrieval(classification: dict, options: dict = None) -> dict:
    options = options or {}
    
    # If forced by options
    if options.get("forceRetrieval"):
        return {
            "retrievalRequired": True,
            "source": options.get("source", "vector_database"),
            "reason": "Retrieval was forced by request options."
        }
    if options.get("skipRetrieval"):
        return {
            "retrievalRequired": False,
            "source": "direct_llm",
            "reason": "Retrieval was explicitly skipped by options."
        }
        
    query_type = classification.get("type")
    
    if query_type == "general_knowledge":
        return {
            "retrievalRequired": False,
            "source": "direct_llm",
            "reason": "General knowledge query does not require retrieval."
        }
    elif query_type == "code_search":
        return {
            "retrievalRequired": True,
            "source": "code_repository",
            "reason": "Code search requires repository retrieval."
        }
    elif query_type == "database_query":
        return {
            "retrievalRequired": True,
            "source": "sql_database",
            "reason": "Database query requires SQL retrieval."
        }
    elif query_type == "web_search":
        return {
            "retrievalRequired": True,
            "source": "web_search",
            "reason": "Web search requires internet retrieval."
        }
    else:
        return {
            "retrievalRequired": True,
            "source": "vector_database",
            "reason": "Document search requires vector database retrieval."
        }
