import os
import re
import io
import docx
import pandas as pd
import json
from datetime import datetime
import chromadb
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup Chroma Client with Automatic Fallback
CHROMA_HOST = os.getenv("CHROMA_HOST")
CHROMA_API_KEY = os.getenv("CHROMA_API_KEY")
CHROMA_TENANT = os.getenv("CHROMA_TENANT")
CHROMA_DATABASE = os.getenv("CHROMA_DATABASE")

client = None
using_cloud = False

def init_chroma_client():
    global client, using_cloud
    if CHROMA_HOST and CHROMA_API_KEY and CHROMA_API_KEY != "YOUR_API_KEY" and CHROMA_API_KEY.strip() != "":
        try:
            print(f"[ChromaDB] Connecting to TryChroma Cloud at: {CHROMA_HOST} (Tenant: {CHROMA_TENANT}, Database: {CHROMA_DATABASE})")
            
            # Remove protocol prefix if it is HttpClient requirement
            host_clean = CHROMA_HOST
            if "://" in host_clean:
                host_clean = host_clean.split("://")[1]
                
            client = chromadb.HttpClient(
                host=host_clean,
                tenant=CHROMA_TENANT or "default_tenant",
                database=CHROMA_DATABASE or "default_database",
                headers={"X-Chroma-Token": CHROMA_API_KEY},
                ssl=True
            )
            # Verify connectivity
            client.list_collections()
            using_cloud = True
            print("[ChromaDB] Successfully connected to TryChroma Cloud!")
        except Exception as e:
            print(f"[ChromaDB] TryChroma Cloud connection failed (e.g. Unauthorized or Network Error): {e}.")
            print("[ChromaDB] Falling back to local PersistentClient...")
            client = chromadb.PersistentClient(path="./chroma_db")
            using_cloud = False
    else:
        print("[ChromaDB] Cloud credentials missing or default. Using local PersistentClient...")
        client = chromadb.PersistentClient(path="./chroma_db")
        using_cloud = False

# Run initialization
init_chroma_client()

def get_collection_name():
    return "naive-rag-documents"

def get_collection():
    global client, using_cloud
    try:
        # Cosine similarity for semantic scores
        return client.get_or_create_collection(
            name=get_collection_name(),
            metadata={"hnsw:space": "cosine"}
        )
    except Exception as e:
        print(f"[ChromaDB] Failed to access collection: {e}")
        if using_cloud:
            print("[ChromaDB] Cloud collection retrieval failed. Reverting to local PersistentClient...")
            client = chromadb.PersistentClient(path="./chroma_db")
            using_cloud = False
            return client.get_or_create_collection(
                name=get_collection_name(),
                metadata={"hnsw:space": "cosine"}
            )
        raise e

# Document Text Extraction
def extract_text(file_bytes: bytes, filename: str, content_type: str) -> str:
    ext = filename.split(".")[-1].lower()
    
    if ext == "pdf":
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = "\n".join([page.extract_text() or "" for page in pdf.pages])
            return text
        except ImportError:
            # Fallback to PyPDF2 or standard pypdf if pdfplumber not installed
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
            
    elif ext == "docx":
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join([p.text for p in doc.paragraphs])
        
    elif ext == "txt":
        return file_bytes.decode("utf-8", errors="ignore")
        
    elif ext == "csv":
        df = pd.read_csv(io.BytesIO(file_bytes))
        return df.to_string()
        
    elif ext == "json":
        data = json.loads(file_bytes.decode("utf-8", errors="ignore"))
        return json.dumps(data, indent=2)
        
    else:
        raise ValueError(f"Unsupported file format: {ext}")

# Document Text Splitting
def split_text(text: str, filename: str):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = splitter.split_text(text)
    return [
        {
            "text": chunk,
            "source": filename,
            "index": idx,
            "timestamp": datetime.utcnow().isoformat()
        }
        for idx, chunk in enumerate(chunks)
    ]

# Hybrid Search Stopwords
STOPWORDS = set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'cant', 'cannot', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont',
    'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have',
    'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him',
    'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt',
    'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not',
    'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
    'own', 'same', 'shannt', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such',
    'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres',
    'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too',
    'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent',
    'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom',
    'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve',
    'your', 'yours', 'yourself', 'yourselves'
])

def tokenize_query(text: str):
    if not text:
        return []
    words = re.sub(r'[^\w\s]', ' ', text.lower()).split()
    return list(set([w for w in words if len(w) > 1 and w not in STOPWORDS]))

def calculate_keyword_score(chunk_text: str, query_tokens: list):
    if not query_tokens:
        return 0
    text_lower = chunk_text.lower()
    matches = sum(1 for t in query_tokens if t in text_lower)
    return matches / len(query_tokens)

# Hybrid Search
def hybrid_search(query: str, top_k: int = 5):
    collection = get_collection()
    
    # Generate Embedding using HuggingFace
    from langchain_community.embeddings import HuggingFaceEmbeddings
    embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    query_embedding = embeddings_model.embed_query(query)
    
    # Retrieve candidates
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=30
    )
    
    if not results or not results["ids"] or len(results["ids"][0]) == 0:
        return []
        
    query_tokens = tokenize_query(query)
    candidates = []
    
    ids = results["ids"][0]
    distances = results["distances"][0]
    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    
    for i in range(len(ids)):
        doc_id = ids[i]
        distance = distances[i]
        text = documents[i]
        metadata = metadatas[i]
        
        # Cosine distance to similarity score
        semantic_score = max(0.0, min(1.0, 1.0 - distance))
        
        # Keyword Score
        keyword_score = calculate_keyword_score(text, query_tokens)
        
        # Combined Hybrid Score
        final_score = (semantic_score * 0.7) + (keyword_score * 0.3)
        
        candidates.append({
            "id": doc_id,
            "text": text,
            "metadata": {
                "source": metadata.get("source"),
                "index": metadata.get("index"),
                "timestamp": metadata.get("timestamp")
            },
            "semanticScore": semantic_score,
            "keywordScore": keyword_score,
            "finalScore": final_score
        })
        
    # Sort and return top K
    candidates.sort(key=lambda x: x["finalScore"], reverse=True)
    return candidates[:top_k]
