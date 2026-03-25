# Tool 2: sends raga_raw.json to Gemini, outputs raga_catalogue.json
"""
Tool 2: Raga Structuring Engine
=================================
Takes raga_raw.json from Tool 1.
Sends each raga to Gemini with a strict extraction prompt.
Outputs raga_catalogue.json — the production-ready dataset for Saptaswara.

Usage:
    pip install google-generativeai pydantic
    export GEMINI_API_KEY="your_key_here"
    python structurer.py

Get your free Gemini API key at: https://aistudio.google.com/app/apikey
"""

import json
import os
import time
from pathlib import Path

try:
    import google.generativeai as genai
except ImportError:
    print("Install: pip install google-generativeai")
    exit(1)

try:
    from pydantic import BaseModel, field_validator
    from typing import Optional
except ImportError:
    print("Install: pip install pydantic")
    exit(1)


# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────

INPUT_FILE  = "../tool1_raga_collector/raga_raw.json"
OUTPUT_FILE = "raga_catalogue.json"
ERRORS_FILE = "raga_errors.json"

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL   = "gemini-1.5-flash"   # fast + cheap for structured extraction

# How many ragas to process per run (None = all)
# Set to 5 for a test run first
LIMIT = None

# Delay between Gemini calls (free tier = 15 requests/min)
API_DELAY_SECONDS = 4


# ─────────────────────────────────────────────
# SCHEMA — what one raga must look like
# ─────────────────────────────────────────────

SWARAS = ["S", "r", "R", "g", "G", "m", "M", "P", "d", "D", "n", "N", "S'"]

# The JSON schema we ask Gemini to produce
RAGA_SCHEMA = {
    "name":         "string — English name of the raga",
    "aroha":        "array of strings — ascending note sequence using SRGMPDN notation",
    "avaroha":      "array of strings — descending note sequence",
    "vadi":         "string — the most important note (king swara)",
    "samvadi":      "string — the second most important note",
    "pakad":        "string — characteristic phrase that identifies this raga",
    "thaat":        "string — parent thaat (e.g. Kalyan, Bhairav, Kafi...)",
    "time_of_day":  "string — when this raga is ideally performed (e.g. Morning, Evening, Night, Any)",
    "mood":         "string — primary emotional quality (e.g. Peaceful, Romantic, Devotional, Melancholic)",
    "jati":         "string — note count structure (e.g. Sampurna-Sampurna, Audav-Audav)",
    "hz_sa":        "number — frequency of Sa in Hz for middle octave (default 261.63 = C4)",
    "tags":         "array of strings — 2-4 descriptive tags for search/filter"
}


# ─────────────────────────────────────────────
# PYDANTIC MODEL — validates Gemini's output
# ─────────────────────────────────────────────

class RagaEntry(BaseModel):
    name:        str
    aroha:       list[str]
    avaroha:     list[str]
    vadi:        str
    samvadi:     str
    pakad:       str
    thaat:       str
    time_of_day: str
    mood:        str
    jati:        str
    hz_sa:       float = 261.63
    tags:        list[str] = []

    @field_validator("aroha", "avaroha")
    @classmethod
    def must_have_notes(cls, v):
        if not v or len(v) < 2:
            raise ValueError("aroha/avaroha must have at least 2 notes")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("name cannot be empty")
        return v.strip()


# ─────────────────────────────────────────────
# GEMINI PROMPT
# ─────────────────────────────────────────────

def build_prompt(raw: dict) -> str:
    return f"""
You are a classical Indian music expert and data engineer.

Your task: take this raw raga record scraped from the web and produce a
clean, validated JSON object matching the exact schema below.

RAW INPUT:
{json.dumps(raw, ensure_ascii=False, indent=2)}

REQUIRED OUTPUT SCHEMA:
{json.dumps(RAGA_SCHEMA, indent=2)}

RULES:
1. Output ONLY a valid JSON object. No markdown, no explanation, no code block.
2. aroha and avaroha must be arrays of individual swaras, e.g. ["S", "R", "G", "m", "P", "D", "N", "S'"]
3. Use standard swara notation: S R G m M P D N (uppercase = shuddha, lowercase = komal/tivra)
4. S' = upper octave Sa. Use it only at the end of aroha or start of avaroha.
5. If vadi or samvadi is unclear from the raw data, use your knowledge of this raga.
6. time_of_day must be one of: Morning, Afternoon, Evening, Night, Any
7. mood must be a single English word or short phrase (max 3 words)
8. tags: generate 2-4 tags useful for searching, e.g. ["peaceful", "morning", "beginner-friendly"]
9. hz_sa: always set to 261.63 (C4) unless the raw data specifies otherwise
10. If any field is missing in the raw input, fill it from your knowledge of this raga.
    Saptaswara is a music education app — accuracy is critical.

Output the JSON object now:
""".strip()


# ─────────────────────────────────────────────
# GEMINI CALL
# ─────────────────────────────────────────────

def call_gemini(model, prompt: str) -> str:
    response = model.generate_content(prompt)
    return response.text.strip()


def parse_gemini_response(text: str) -> dict | None:
    """
    Extracts JSON from Gemini's response.
    Handles cases where Gemini wraps JSON in markdown code blocks.
    """
    # Strip markdown code fences if present
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"    JSON parse error: {e}")
        return None


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    print("=" * 60)
    print("SAPTASWARA — Tool 2: Raga Structuring Engine")
    print("=" * 60)

    # Check API key
    if not GEMINI_API_KEY:
        print("\nERROR: GEMINI_API_KEY not set.")
        print("Get your free key at: https://aistudio.google.com/app/apikey")
        print("Then run: export GEMINI_API_KEY='your_key_here'")
        return

    # Load raw data from Tool 1
    raw_path = Path(INPUT_FILE)
    if not raw_path.exists():
        print(f"\nERROR: {INPUT_FILE} not found.")
        print("Run Tool 1 first: python ../tool1_raga_collector/scraper.py")
        return

    with open(raw_path, encoding="utf-8") as f:
        raw_ragas = json.load(f)

    if LIMIT:
        raw_ragas = raw_ragas[:LIMIT]
        print(f"TEST MODE: processing first {LIMIT} ragas only")

    print(f"\nLoaded {len(raw_ragas)} ragas from {INPUT_FILE}")

    # Load existing output to support resume
    out_path = Path(OUTPUT_FILE)
    if out_path.exists():
        with open(out_path, encoding="utf-8") as f:
            catalogue = json.load(f)
        done_names = {r["name"].lower() for r in catalogue}
        print(f"Resuming — {len(catalogue)} already done, {len(raw_ragas) - len(done_names)} remaining")
    else:
        catalogue = []
        done_names = set()

    errors = []

    # Init Gemini
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(GEMINI_MODEL)

    print(f"\nProcessing with Gemini ({GEMINI_MODEL})...")
    print(f"Estimated time: ~{len(raw_ragas) * API_DELAY_SECONDS // 60} min\n")

    for i, raw in enumerate(raw_ragas):
        name = raw.get("name", f"Unknown_{i}")

        if name.lower() in done_names:
            print(f"  [{i+1}/{len(raw_ragas)}] {name} — already done, skipping")
            continue

        print(f"  [{i+1}/{len(raw_ragas)}] {name}", end=" ", flush=True)

        try:
            prompt = build_prompt(raw)
            response_text = call_gemini(model, prompt)
            parsed = parse_gemini_response(response_text)

            if parsed is None:
                raise ValueError("Could not parse JSON from Gemini response")

            # Validate with Pydantic
            validated = RagaEntry(**parsed)
            catalogue.append(validated.model_dump())
            print("✓")

        except Exception as e:
            print(f"ERROR — {e}")
            errors.append({"name": name, "error": str(e), "raw": raw})

        # Save after every raga — crash-safe
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(catalogue, f, ensure_ascii=False, indent=2)

        time.sleep(API_DELAY_SECONDS)

    # Save error log
    if errors:
        with open(ERRORS_FILE, "w", encoding="utf-8") as f:
            json.dump(errors, f, ensure_ascii=False, indent=2)
        print(f"\n  {len(errors)} errors saved to {ERRORS_FILE}")
        print("  Fix these manually or re-run — the tool will skip already-done ragas.")

    print("\n" + "=" * 60)
    print(f"Tool 2 complete.")
    print(f"  {len(catalogue)} ragas validated → {OUTPUT_FILE}")
    print(f"  {len(errors)} errors → {ERRORS_FILE}")
    print("Next step: run Tool 3 (validator UI) to review each raga.")
    print("=" * 60)


if __name__ == "__main__":
    main()