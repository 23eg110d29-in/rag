import re

with open('app.py', 'r') as f:
    content = f.read()

new_chat_interaction = """@app.post("/api/chat")
async def chat_interaction(payload: dict):
    sessionId = payload.get("sessionId")
    message = payload.get("message")
    
    if not sessionId:
        raise HTTPException(status_code=400, detail="sessionId is required.")
    if not message:
        raise HTTPException(status_code=400, detail="message content is required.")
        
    try:
        print(f"Processing chat query for session {sessionId}...")
        
        # 1. Initialize Trace
        trace_context = create_rag_trace(sessionId, message)
        
        # 2. Query Classification
        classification = classify_query(message)
        record_trace_event(trace_context, "query_classified", classification)
        
        # 3. Retrieval Decision Engine
        decision = decide_retrieval(classification)
        record_trace_event(trace_context, "retrieval_decision", decision)
        
        # 4. Dynamic Retrieval Plan
        retrieval_plan = select_top_k(message)
        top_k = retrieval_plan["topK"]
        
        # Load chat history
        history_doc = chat_history_col.find_one({"sessionId": sessionId})
        if not history_doc:
            history_doc = {
                "sessionId": sessionId,
                "messages": [],
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            chat_history_col.insert_one(history_doc)
            
        history_messages = history_doc.get("messages", [])[-10:]
        
        # Variables for retrieved context
        final_chunks = []
        rewritten = message
        relevance = {"passed": False, "evaluatedChunks": 0, "threshold": 0.18}
        
        if decision["retrievalRequired"]:
            attempts = 0
            max_retries = 2
            
            while attempts < max_retries:
                attempts += 1
                
                # 5. Query Rewriting
                if attempts == 1:
                    # We can use await if it's async, but we implemented rewrite_query synchronously inside async function
                    rewritten = await rewrite_query(message, classification)
                else:
                    rewritten = await rewrite_query(f"{message} {rewritten}", classification)
                    
                # 6. Adaptive Routing (Fallback to Hybrid Search)
                retrieved_chunks = route_retrieval(decision["source"], rewritten, top_k)
                
                # 7. Document Reranking
                reranked_chunks = rerank_documents(rewritten, retrieved_chunks)
                
                # 8. Relevance Validation
                relevance = validate_relevance(reranked_chunks, threshold=0.18)
                record_trace_event(trace_context, "retrieval_attempt", {
                    "attempt": attempts,
                    "rewrittenQuery": rewritten,
                    "source": decision["source"],
                    "retrievedCount": len(reranked_chunks),
                    "relevance": relevance
                })
                
                if relevance["passed"] or attempts >= max_retries:
                    final_chunks = reranked_chunks
                    break
        
        # 9. Context Compression
        compression = compress_context_chunks(final_chunks, token_budget=2000)
        compressed_chunks = compression["chunks"]
        
        if compressed_chunks:
            context_text = "\\n\\n".join([
                f"[Chunk {idx + 1}] Source: {chunk['metadata'].get('source')} (Index: {chunk['metadata'].get('index')})\\nContent: {chunk['text']}"
                for idx, chunk in enumerate(compressed_chunks)
            ])
        else:
            context_text = "NO RELEVANT DOCUMENT CHUNKS FOUND."
            
        system_prompt = f\"\"\"You are a helpful and precise Document Retrieval Assistant. Your task is to answer the user's question ONLY using the retrieved document chunks provided below.

Strict Constraints:
1. Base your answer solely on the retrieved document chunks.
2. If the retrieved chunks do not contain enough information to answer the question, you MUST reply EXACTLY with:
"I could not find the answer in the uploaded documents."
3. Do NOT make assumptions, interpolate, extrapolate, or use any outside knowledge. Do NOT hallucinate.
4. Do NOT say things like "Based on the documents provided...". Just provide the direct answer based on the facts in the chunks.
5. If the answer is partially available but missing key facts, do not try to guess. Respond with: "I could not find the answer in the uploaded documents."
6. If the context text says "NO RELEVANT DOCUMENT CHUNKS FOUND.", respond exactly with: "I could not find the answer in the uploaded documents."

Retrieved Document Chunks:
=========================================
{context_text}
=========================================\"\"\"

        messages = [SystemMessage(content=system_prompt)]
        for msg in history_messages:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg.get("content")))
            else:
                messages.append(AIMessage(content=msg.get("content")))
                
        messages.append(HumanMessage(content=message))
        
        # Direct fallback for general knowledge
        if not decision["retrievalRequired"] and classification["type"] == "general_knowledge":
             # We skip RAG constraints for general chat, just answer naturally
             messages[0] = SystemMessage(content="You are a helpful conversational assistant.")
             
        chat_model = ChatOpenAI(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            model_name="gpt-4o-mini",
            temperature=0
        )
        
        response = chat_model.invoke(messages)
        answer = response.content
        
        # 10. Answer Verification
        verification = verify_answer_against_context(answer, compressed_chunks, threshold=0.5)
        if not verification["supported"] and "I could not find the answer" not in answer:
            answer = f"{answer}\\n\\nVerification note: Some claims may not be fully supported by the retrieved context."
        
        # Save to history
        new_messages = history_doc.get("messages", [])
        new_messages.append({"role": "user", "content": message, "timestamp": datetime.utcnow()})
        
        response_chunks = [
            {
                "text": chunk["text"],
                "source": chunk["metadata"].get("source"),
                "index": chunk["metadata"].get("index"),
                "semanticScore": chunk.get("semanticScore", 0),
                "keywordScore": chunk.get("keywordScore", 0),
                "finalScore": chunk.get("finalScore", 0),
                "rerankScore": chunk.get("rerankScore", 0)
            }
            for chunk in compressed_chunks
        ]
        
        new_messages.append({
            "role": "assistant",
            "content": answer,
            "retrievedChunks": response_chunks,
            "timestamp": datetime.utcnow()
        })
        
        chat_history_col.update_one(
            {"sessionId": sessionId},
            {"$set": {"messages": new_messages, "updatedAt": datetime.utcnow()}}
        )
        
        # 11. Observability Logging
        finish_rag_trace(trace_context, {
            "queryType": classification["type"],
            "retrievalSource": decision["source"],
            "confidence": classification["confidence"],
            "retrievedDocuments": len(response_chunks),
            "rerankingScores": [c["rerankScore"] for c in response_chunks]
        })
        
        return {
            "answer": answer,
            "retrievedChunks": response_chunks,
            "adaptive": {
                "classification": classification,
                "decision": decision,
                "retrievalPlan": retrieval_plan,
                "rewrittenQuery": rewritten,
                "relevance": relevance,
                "compression": compression,
                "verification": verification
            }
        }
        
    except Exception as e:
        print(f"Chat route error: {e}")
        raise HTTPException(status_code=500, detail=str(e) or "Chat query failed.")"""

pattern = re.compile(r'@app\.post\("/api/chat"\).*?(?=\n# 5\. GET isolated search debug)', re.DOTALL)
new_content = pattern.sub(new_chat_interaction + "\n", content)

with open('app.py', 'w') as f:
    f.write(new_content)

print("Replaced /api/chat route.")
