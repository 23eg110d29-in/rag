import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

async def rewrite_query(query: str, classification: dict = None) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY":
        return query
        
    system_prompt = """You are a search query optimization assistant.
Your task is to take the user's natural language question and rewrite it into an optimized search query.
Focus on keywords, remove conversational filler, and clarify ambiguous terms if the intent is obvious.
Return ONLY the rewritten query string without quotes or explanations."""
    
    try:
        model = ChatOpenAI(openai_api_key=api_key, model_name=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"), temperature=0)
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=query)]
        # We use a synchronous invoke here for simplicity, but it can be async with ainvoke
        response = model.invoke(messages)
        return response.content.strip()
    except Exception as e:
        print(f"[AdaptiveRAG] Query rewrite failed: {e}")
        return query
