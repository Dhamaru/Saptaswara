import json
import os

def main():
    path = os.path.join(os.path.dirname(__file__), "..", "data", "raga_raw.json")
    if not os.path.exists(path):
        print(f"Error: {path} not found.")
        return

    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    fields = ['serial', 'name', 'aroha', 'avaroha', 'vadi_samvadi', 'pakad', 'thaat', 'time', 'mood', 'jati']
    complete, incomplete, enriched = 0, 0, 0
    
    print(f"Found {len(data)} ragas in {path}\n")
    
    for r in data:
        missing = [f for f in fields if not str(r.get(f, '')).strip()]
        status = "✓ all fields present" if not missing else f"✗ missing: {', '.join(missing)}"
        print(f"[{r.get('serial')}] {r.get('name')} — {status}")
        
        if not missing: complete += 1
        else: incomplete += 1
        if r.get("source_b"): enriched += 1

    print("\n--- ENRICHED RAGAS (source_b: True) ---")
    for r in data:
        if r.get("source_b"): print(f"- {r['name']}")

    print("\n--- RAGAS WITH EXTRA NOTES ---")
    for r in data:
        if r.get("notes_extra"): print(f"- {r['name']}: {r['notes_extra']}")

    print("\n--- MANUAL CHECK: BHAIRAV (1) ---")
    bhairav = next((r for r in data if str(r.get('serial')) == "1"), None)
    print(json.dumps(bhairav, indent=2) if bhairav else "Not found")

    print("\n--- MANUAL CHECK: YAMAN ---")
    yaman = next((r for r in data if r.get('name') == "Yaman"), None)
    print(json.dumps(yaman, indent=2) if yaman else "Not found")

    print(f"\nSummary:\nTotal: {len(data)} ragas")
    print(f"Complete entries (all fields): {complete}")
    print(f"Incomplete entries: {incomplete}")
    print(f"Enriched from learnragas: {enriched}")

if __name__ == "__main__":
    main()
