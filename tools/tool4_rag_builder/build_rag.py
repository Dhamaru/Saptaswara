import os
import json
import time
import google.generativeai as genai
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env from project root
load_dotenv()

# --- CONFIGURATION ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not GEMINI_API_KEY or not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing environment variables (GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)")
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- PATHS ---
CATALOGUE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raga_catalogue.json"))
EXTRA_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "ragajungle_raw"))

def get_existing_ragas():
    try:
        response = supabase.table("raga_embeddings").select("raga_name").execute()
        return {row["raga_name"] for row in response.data} if response.data else set()
    except Exception as e:
        print(f"Warning: Could not fetch existing embeddings (maybe table doesn't exist yet): {e}")
        return set()

def build_passage(raga):
    """Builds the rich text passage for a raga as requested by the user."""
    # Ensure arrays are strings
    aroha_str = ", ".join(raga.get("aroha", []))
    avaroha_str = ", ".join(raga.get("avaroha", []))
    tags_str = ", ".join(raga.get("tags", []))
    
    passage = (
        f"Raga {raga.get('name')} belongs to {raga.get('thaat')} thaat. "
        f"It is performed in the {raga.get('time_of_day')}. "
        f"Its mood is {raga.get('mood')}. "
        f"The aroha is {aroha_str} and avaroha is {avaroha_str}. "
        f"Vadi is {raga.get('vadi')}, samvadi is {raga.get('samvadi')}. "
        f"Characteristic phrase: {raga.get('pakad')}. "
        f"Tags: {tags_str}."
    )
    return passage

def main():
    if not os.path.exists(CATALOGUE_PATH):
        print(f"Error: {CATALOGUE_PATH} not found.")
        return

    with open(CATALOGUE_PATH, "r") as f:
        ragas = json.load(f)

    existing = get_existing_ragas()
    total = len(ragas)

    print(f"Starting RAG builder. Total ragas: {total}. Verified only.")
    
    for i, raga in enumerate(ragas, 1):
        name = raga["name"]
        
        # We only process if it exists in the embeddings table or we skip it
        if name in existing:
            # Skip if already processed
            continue

        # Build initial passage from JSON fields
        passages = [build_passage(raga)]
        
        # Check for additional prose in .txt files
        slug = name.lower().replace(" ", "_").replace("-", "_")
        extra_file = os.path.join(EXTRA_DATA_DIR, f"{slug}.txt")
        if os.path.exists(extra_file):
            with open(extra_file, "r") as f:
                passages.append(f.read().strip())

        for passage in passages:
            if not passage: continue
            
            try:
                # 4. Generate embeddings
                res = genai.embed_content(
                    model="models/gemini-embedding-001",
                    content=passage,
                    task_type="retrieval_document",
                    output_dimensionality=768
                )
                embedding = res["embedding"]

                # 5. Store in Supabase
                supabase.table("raga_embeddings").insert({
                    "raga_name": name,
                    "content": passage,
                    "embedding": embedding
                }).execute()
            except Exception as e:
                print(f"Error embedding/storing {name}: {e}")
                continue

        # 8. Print progress
        print(f"[{i}/{total}] {name} — embedded ✓")
        
        # 7. Wait 2 seconds
        time.sleep(2)

if __name__ == "__main__":
    main()
