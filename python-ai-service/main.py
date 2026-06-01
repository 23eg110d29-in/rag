import os
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from dotenv import load_dotenv
import logging

from utils_rag import (
    extract_text,
    split_text,
    get_collection,
    hybrid_search
)

from adaptive import (
    classify_query, decide_retrieval, select_top_k, rewrite_query,
    route_retrieval, rerank_documents, validate_relevance, compress_context_chunks,
    verify_answer_against_context, create_rag_trace, record_trace_event, finish_rag_trace
)
from evaluation.evaluator import calculate_metrics

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

logging.basicConfig(level=logging.INFO)
load_dotenv()

app = FastAPI(title="Medical RAG AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        filename = file.filename
        file_bytes = await file.read()
        content_type = file.content_type
        
        text = extract_text(file_bytes, filename, content_type)
        if not text or len(text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Empty document.")
            
        word_count = len(text.split())
        chunks = split_text(text, filename)
        
        collection = get_collection()
        try:
            collection.delete(where={"source": filename})
        except Exception:
            pass
            
        from langchain_community.embeddings import HuggingFaceEmbeddings
        embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        chunk_texts = [c["text"] for c in chunks]
        embeddings = embeddings_model.embed_documents(chunk_texts)
        
        ids = [f"{filename}_chunk_{idx}" for idx in range(len(chunks))]
        metadatas = [
            {"source": c["source"], "index": c["index"], "timestamp": c["timestamp"]}
            for c in chunks
        ]
        
        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=chunk_texts
        )
        
        return {
            "success": True,
            "data": {
                "filename": filename,
                "totalChunks": len(chunks),
                "wordCount": word_count
            }
        }
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
async def chat_interaction(payload: dict):
    sessionId = payload.get("sessionId")
    message = payload.get("message")
    history_messages = payload.get("history", [])
    
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")
        
    try:
        trace_context = create_rag_trace(sessionId or "anon", message)
        
        # Adaptive Corrective RAG
        classification = classify_query(message)
        record_trace_event(trace_context, "query_classified", classification)
        
        decision = decide_retrieval(classification)
        retrieval_plan = select_top_k(message)
        top_k = retrieval_plan["topK"]
        
        final_chunks = []
        rewritten = message
        relevance = {"passed": False, "evaluatedChunks": 0, "threshold": 0.18}
        
        if decision["retrievalRequired"]:
            attempts = 0
            max_retries = 2
            
            while attempts < max_retries:
                attempts += 1
                if attempts == 1:
                    rewritten = await rewrite_query(message, classification)
                else:
                    rewritten = await rewrite_query(f"{message} {rewritten}", classification)
                    
                retrieved_chunks = route_retrieval(decision["source"], rewritten, top_k)
                reranked_chunks = rerank_documents(rewritten, retrieved_chunks)
                relevance = validate_relevance(reranked_chunks, threshold=0.18)
                
                if relevance["passed"] or attempts >= max_retries:
                    final_chunks = reranked_chunks
                    break
        
        compression = compress_context_chunks(final_chunks, token_budget=2000)
        compressed_chunks = compression["chunks"]
        
        if compressed_chunks:
            context_text = "\n\n".join([
                f"[Chunk {idx + 1}] Source: {chunk['metadata'].get('source')} (Index: {chunk['metadata'].get('index')})\nContent: {chunk['text']}"
                for idx, chunk in enumerate(compressed_chunks)
            ])
        else:
            context_text = "NO RELEVANT MEDICAL DOCUMENTS FOUND."
            
        system_prompt = f"""You are an advanced Medical AI Assistant. Answer the user's medical query ONLY using the retrieved document chunks below.
Constraints:
1. Base your answer solely on the retrieved chunks.
2. If not enough information is available, reply EXACTLY: "I could not find the answer in the uploaded medical documents."
3. Do not give unsafe medical advice.
4. Do not hallucinate.

Retrieved Context:
====================
{context_text}
===================="""

        messages = [SystemMessage(content=system_prompt)]
        for msg in history_messages:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg.get("content")))
            elif msg.get("role") == "assistant":
                messages.append(AIMessage(content=msg.get("content")))
                
        messages.append(HumanMessage(content=message))
        
        chat_model = ChatOpenAI(
            openai_api_key=os.getenv("OPENAI_API_KEY"), 
            model_name="gpt-4o-mini", 
            temperature=0,
            max_retries=0
        )
        try:
            response = chat_model.invoke(messages)
            answer = response.content
        except Exception as e:
            if "insufficient_quota" in str(e) or "429" in str(e):
                answer = (
                    "I successfully retrieved the relevant medical information from your documents, "
                    "but my Text Generation model (OpenAI) has run out of billing quota, so I cannot summarize it.\n\n"
                    "Here is the raw medical context I found:\n\n" + context_text
                )
            else:
                answer = "An error occurred during text generation. Retrieved context:\n\n" + context_text
        
        verification = verify_answer_against_context(answer, compressed_chunks, threshold=0.5)
        if not verification["supported"] and "I could not find the answer" not in answer:
            answer = f"{answer}\n\n*Confidence Warning: Some generated claims may not be fully supported by the retrieved medical context.*"
            
        response_chunks = [
            {
                "text": chunk["text"],
                "source": chunk["metadata"].get("source"),
                "score": chunk.get("rerankScore", chunk.get("finalScore", 0))
            }
            for chunk in compressed_chunks
        ]
        
        metrics = calculate_metrics(message, answer, response_chunks)
        
        finish_rag_trace(trace_context, {
            "queryType": classification["type"],
            "retrievedDocuments": len(response_chunks),
            "relevance": relevance,
            "metrics": metrics
        })
        
        return {
            "answer": answer,
            "retrievedChunks": response_chunks,
            "evaluation": metrics,
            "adaptive": {
                "classification": classification,
                "decision": decision,
                "verification": verification
            }
        }
        
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents")
async def list_documents():
    try:
        collection = get_collection()
        response = collection.get(include=["metadatas"])
        docs_by_name = {}
        for meta in (response.get("metadatas") or []):
            if not meta or not meta.get("source"):
                continue
            src = meta["source"]
            if src not in docs_by_name:
                docs_by_name[src] = {
                    "_id": src,
                    "filename": src,
                    "originalName": meta.get("originalName", src),
                    "fileType": meta.get("fileType", "application/octet-stream"),
                    "fileSize": int(meta.get("fileSize", 0)),
                    "totalChunks": int(meta.get("totalChunks", 0)),
                    "wordCount": int(meta.get("wordCount", 0)),
                    "uploadedAt": meta.get("uploadedAt", meta.get("timestamp", ""))
                }
        docs = sorted(docs_by_name.values(), key=lambda d: d["uploadedAt"], reverse=True)
        return {"success": True, "data": docs}
    except Exception as e:
        print(f"List documents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/documents/{filename}")
async def delete_document(filename: str):
    try:
        collection = get_collection()
        collection.delete(where={"source": filename})
        return {"success": True, "message": f"Deleted document: {filename}"}
    except Exception as e:
        print(f"Delete document error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
