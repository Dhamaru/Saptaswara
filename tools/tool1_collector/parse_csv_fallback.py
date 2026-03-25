# Fallback: parse manually copied CSV if scraper is blocked
"""
parse_csv_fallback.py
======================
Use this if scraper.py cannot fetch amitray.com in your environment.

Instructions:
1. Open amitray.com/the-84-ragas-of-indian-classical-music-a-complete-guide/
2. Select the entire table, copy it
3. Paste into a spreadsheet (Google Sheets or Excel)
4. Export as CSV named "ragas_manual.csv"
5. Run: python parse_csv_fallback.py

This produces the same raga_raw.json as scraper.py
"""

import csv
import json

INPUT_CSV = "ragas_manual.csv"
OUTPUT_JSON = "raga_raw.json"

COLUMN_MAP = {
    0: "serial",
    1: "name",
    2: "aroha",
    3: "avaroha",
    4: "vadi_samvadi",
    5: "pakad",
    6: "thaat",
    7: "time",
    8: "mood",
    9: "jati",
}

def parse():
    ragas = []
    with open(INPUT_CSV, encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if not row or not row[0].strip().isdigit():
                continue
            raga = {COLUMN_MAP.get(i, f"col_{i}"): val.strip() for i, val in enumerate(row)}
            raga["serial"] = int(raga["serial"])
            raga["source_a"] = True
            raga["source_b"] = False
            raga["notes_extra"] = {}
            ragas.append(raga)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(ragas, f, ensure_ascii=False, indent=2)

    print(f"Parsed {len(ragas)} ragas → {OUTPUT_JSON}")

if __name__ == "__main__":
    parse()