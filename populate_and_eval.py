import os
import requests
import time
import json
import random

# Configuration
NODE_API_URL = "http://localhost:5002/api"
DATA_DIR = "medical_docs"

# 50 Medical Topics for Document Generation
TOPICS = [
    "Hypertension Management Guidelines", "Type 2 Diabetes Protocols", "Asthma Action Plan", 
    "Chronic Kidney Disease Staging", "Heart Failure Preserved Ejection Fraction", 
    "Atrial Fibrillation Anticoagulation", "Pneumonia Empirical Treatment", 
    "COPD Exacerbation Management", "Hyperlipidemia Statin Intensity", 
    "Rheumatoid Arthritis DMARDs", "Osteoporosis Bisphosphonates", 
    "Hypothyroidism Levothyroxine Dosing", "Migraine Prophylaxis", 
    "Ischemic Stroke Thrombolysis", "Peptic Ulcer Disease H. pylori", 
    "Gastroesophageal Reflux Disease PPI", "Irritable Bowel Syndrome FODMAP", 
    "Inflammatory Bowel Disease Biologics", "Hepatitis C Direct Acting Antivirals", 
    "Cirrhosis Complications Management", "Acute Pancreatitis Ranson Criteria", 
    "Deep Vein Thrombosis DOACs", "Pulmonary Embolism Wells Score", 
    "Anemia Iron Deficiency Replacement", "Sickle Cell Crisis Hydroxyurea", 
    "Multiple Myeloma CRAB Criteria", "Breast Cancer Screening BRCA", 
    "Prostate Cancer PSA Guidelines", "Lung Cancer Low Dose CT", 
    "Colorectal Cancer Colonoscopy", "Melanoma ABCDE Rule", 
    "Major Depressive Disorder SSRIs", "Generalized Anxiety Disorder CBT", 
    "Bipolar Disorder Lithium Toxicity", "Schizophrenia Atypical Antipsychotics", 
    "Alzheimer's Disease Cholinesterase Inhibitors", "Parkinson's Disease Levodopa", 
    "Multiple Sclerosis Disease Modifying Therapies", "Epilepsy Status Epilepticus", 
    "Tuberculosis RIPE Therapy", "HIV PrEP and PEP", "COVID-19 Paxlovid Eligibility", 
    "Sepsis Surviving Sepsis Campaign", "Acute Kidney Injury KDIGO", 
    "Hyperkalemia ECG Changes", "Hyponatremia Correction Rate", 
    "Obesity GLP-1 Agonists", "Polycystic Ovary Syndrome Metformin", 
    "Endometriosis Laparoscopy", "Menopause Hormone Replacement Therapy"
]

# Generate synthetic documents
def generate_documents():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    print(f"Generating {len(TOPICS)} medical documents in ./{DATA_DIR}...")
    for idx, topic in enumerate(TOPICS):
        filename = f"{topic.replace(' ', '_').lower()}.txt"
        filepath = os.path.join(DATA_DIR, filename)
        
        # Synthetic medical content
        content = f"--- CLINICAL PROTOCOL: {topic.upper()} ---\n\n"
        content += f"Overview:\n{topic} is a critical area of medical practice requiring strict adherence to evidence-based guidelines. "
        content += f"Diagnosis typically involves clinical evaluation, laboratory markers, and patient history.\n\n"
        content += f"Treatment Protocol:\n1. First-line therapy includes standard pharmacological interventions.\n"
        content += f"2. Regular monitoring of patient vitals and symptomatic response is required.\n"
        content += f"3. In severe cases, escalation to specialist care and combination therapies is recommended.\n\n"
        content += f"Contraindications:\nPatients with severe hepatic or renal impairment may require dose adjustments. "
        content += f"Always check for drug-drug interactions before initiating therapy for {topic}.\n\n"
        content += f"References:\n- Medical Board Guidelines 2024\n- Clinical Trial Data 2023\n"
        
        with open(filepath, 'w') as f:
            f.write(content)
            
    print("Document generation complete.")

# Upload documents to the backend
def upload_documents():
    files = os.listdir(DATA_DIR)
    print(f"\nUploading {len(files)} documents to RAG Backend...")
    
    success_count = 0
    for filename in files:
        filepath = os.path.join(DATA_DIR, filename)
        try:
            with open(filepath, 'rb') as f:
                response = requests.post(f"{NODE_API_URL}/documents/upload", files={'file': f})
                if response.status_code == 200:
                    success_count += 1
                else:
                    print(f"Failed to upload {filename}: {response.text}")
        except Exception as e:
            print(f"Error uploading {filename}: {e}")
            
    print(f"Successfully uploaded {success_count}/{len(files)} documents.")

# Run Evaluation Queries
def run_evaluations():
    test_queries = [
        ("What are the guidelines for Hypertension Management?", "hypertension"),
        ("What is the first-line therapy for Major Depressive Disorder?", "ssri"),
        ("How do you handle Asthma Action Plan?", "asthma"),
        ("What are the complications of Cirrhosis?", "cirrhosis"),
        ("What is the recommended screening for Colorectal Cancer?", "colonoscopy"),
        ("Explain the protocol for Sepsis.", "sepsis"),
        ("Can I give Paxlovid for COVID-19?", "paxlovid"),
        ("What is the KDIGO criteria for Acute Kidney Injury?", "kdigo"),
        ("How to treat Epilepsy Status Epilepticus?", "epilepsy"),
        ("What is the RIPE therapy for Tuberculosis?", "tuberculosis")
    ]
    
    print(f"\nRunning {len(test_queries)} evaluation queries against the AI Assistant...")
    session_id = f"eval_session_{int(time.time())}"
    
    results = []
    
    for idx, (query, expected_keyword) in enumerate(test_queries):
        print(f"Query {idx+1}/{len(test_queries)}: '{query}'")
        try:
            res = requests.post(f"{NODE_API_URL}/chat", json={
                "sessionId": session_id,
                "message": query
            })
            
            if res.status_code == 200:
                data = res.json()
                eval_metrics = data.get("evaluation", {})
                print(f"  -> Answered. Hit Rate: {eval_metrics.get('hitRate', 0)}, Faithfulness: {eval_metrics.get('faithfulness', 0)}")
                results.append(eval_metrics)
            else:
                print(f"  -> Request failed: {res.text}")
                
        except Exception as e:
            print(f"  -> Error: {e}")
            
        time.sleep(1) # Sleep to avoid rate limits
        
    # Aggregate results
    if results:
        avg_hit_rate = sum(r.get('hitRate', 0) for r in results) / len(results)
        avg_mrr = sum(r.get('mrr', 0) for r in results) / len(results)
        avg_faithfulness = sum(r.get('faithfulness', 0) for r in results) / len(results)
        avg_hallucination = sum(r.get('hallucinationRate', 0) for r in results) / len(results)
        
        print("\n==================================================")
        print("          RAG EVALUATION SUMMARY REPORT           ")
        print("==================================================")
        print(f"Total Queries: {len(results)}")
        print(f"Average Retrieval Hit Rate:  {avg_hit_rate * 100:.1f}%")
        print(f"Average Retrieval MRR:       {avg_mrr * 100:.1f}%")
        print(f"Average Answer Faithfulness: {avg_faithfulness * 100:.1f}%")
        print(f"Average Hallucination Rate:  {avg_hallucination * 100:.1f}%")
        print("==================================================")
        print("Evaluation complete. Metrics saved to the database.")
    else:
        print("No evaluation results were recorded.")

if __name__ == "__main__":
    print("Starting Automated Medical Document Generation & Evaluation...")
    # generate_documents()
    
    print("\nStarting upload and evaluation process automatically...")
    # upload_documents()
    run_evaluations()
