import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env from project root
load_dotenv()

# --- CONFIGURATION ---
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- PATHS ---
CATALOGUE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tools", "data", "raga_catalogue.json"))

def main():
    if not os.path.exists(CATALOGUE_PATH):
        print(f"Error: {CATALOGUE_PATH} not found.")
        return

    with open(CATALOGUE_PATH, "r") as f:
        try:
            ragas = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            return

    total = len(ragas)
    count = 0

    print(f"Starting seeding of {total} ragas into Supabase...")

    for i, raga in enumerate(ragas, 1):
        name = raga.get("name")
        if not name:
            print(f"[{i}/{total}] Skipping entry without name")
            continue
            
        try:
            # Prep data for upsert
            data = {
                "name": name,
                "aroha": raga.get("aroha", []),
                "avaroha": raga.get("avaroha", []),
                "vadi": raga.get("vadi"),
                "samvadi": raga.get("samvadi"),
                "pakad": raga.get("pakad"),
                "thaat": raga.get("thaat"),
                "time_of_day": raga.get("time_of_day"),
                "mood": raga.get("mood"),
                "jati": raga.get("jati"),
                "semitones": raga.get("semitones", []),
                "hz_sa": raga.get("hz_sa", 261.63),
                "hz_map": raga.get("hz_map", {}),
                "tags": raga.get("tags", []),
                "vishranti_sthan": raga.get("vishranti_sthan"),
                "verified": raga.get("verified", False),
                "source_url": raga.get("source_url")
            }
            
            # Upsert on 'name' column
            supabase.table("ragas").upsert(data, on_conflict="name").execute()
            
            print(f"[{i}/{total}] {name} — seeded ✓")
            count += 1
        except Exception as e:
            print(f"Error seeding {name}: {e}")

    print(f"Seeded {count} ragas into Supabase")

if __name__ == "__main__":
    main()
