# FALLBACK INSTRUCTIONS:
# 1. Open https://amitray.com/the-84-ragas-of-indian-classical-music-a-complete-guide/ in your browser
# 2. Select the entire raga table (click first cell, shift+click last cell)
# 3. Copy and paste into Google Sheets or Excel
# 4. Export as CSV, save as tools/tool1_collector/ragas_manual.csv
# 5. Run: python parse_csv_fallback.py

import csv
import json
import os

def main():
    csv_path = os.path.join(os.path.dirname(__file__), "ragas_manual.csv")
    output_path = os.path.join(os.path.dirname(__file__), "..", "data", "raga_raw.json")
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    ragas = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if not row or not row[0].isdigit():
                continue
            
            ragas.append({
                "serial": int(row[0]),
                "name": row[1],
                "aroha": row[2],
                "avaroha": row[3],
                "vadi_samvadi": row[4],
                "pakad": row[5],
                "thaat": row[6],
                "time": row[7],
                "mood": row[8],
                "jati": row[9],
                "source_a": True,
                "source_b": False,
                "notes_extra": {}
            })

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(ragas, f, indent=4)

    print(f"Parsed {len(ragas)} ragas → {output_path}")

if __name__ == "__main__":
    main()