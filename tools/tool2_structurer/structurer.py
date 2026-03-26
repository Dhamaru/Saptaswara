import json
import os
import re

# --- CONFIGURATION ---
INPUT_FILE = "tools/data/raga_raw.json"
OUTPUT_FILE = "tools/data/raga_catalogue.json"
HZ_SA = 261.63

# --- MAPPINGS ---
VADI_NAME_MAP = {
    "Shadj": "S", "Sa": "S",
    "Komal Re": "r", "Rishabh": "R", "Shuddha Re": "R", "Re": "R",
    "Komal Ga": "g", "Gandhar": "G", "Ga": "G",
    "Madhyam": "m", "Shuddha Ma": "m", "Tivra Ma": "M",
    "Pancham": "P", "Pa": "P",
    "Komal Dha": "d", "Dhaivat": "D", "Dha": "D",
    "Komal Ni": "n", "Nishad": "N", "Ni": "N"
}

SEMITONE_MAP = {
    "S": 0, "r": 1, "R": 2, "g": 3, "G": 4, "m": 5, "M": 6, "P": 7, "d": 8, "D": 9, "n": 10, "N": 11
}

def clean_swara(s):
    """Removes punctuation except S'."""
    if s == "S'": return s
    # Remove ;, - , (not apostrophes for S')
    s = s.replace(";", "").replace(",", "").replace("-", "")
    return s.strip()

def parse_swara_list(raw_str, is_aroha=False):
    """Converts space-separated swara string into a clean list."""
    if not raw_str: return []
    tokens = raw_str.split()
    cleaned = [clean_swara(t) for t in tokens if clean_swara(t)]
    # Tanarang often uses S at the end of Aroha to mean S'
    if is_aroha and cleaned and cleaned[-1] == "S":
        cleaned[-1] = "S'"
    return cleaned

def map_vadi_name(raw_name):
    """Maps a full swara name to its letter shorthand."""
    raw_name = raw_name.strip()
    # Check for exact matches first (case sensitive in map but we'll try to be fuzzy)
    for full_name, short in VADI_NAME_MAP.items():
        if full_name.lower() in raw_name.lower():
            return short
    return raw_name[:1].upper() # Fallback

def get_time_category(raw_time):
    """Maps a raw time string to a standard category."""
    t = raw_time.lower()
    if any(x in t for x in ["6pm", "7pm", "8pm", "1st prahar of the night"]): return "Evening"
    if any(x in t for x in ["9pm", "10pm", "11pm", "12am", "2nd prahar", "3rd prahar", "3am", "4am", "5am"]): return "Night"
    if any(x in t for x in ["6am", "7am", "8am", "9am", "1st prahar of the day"]): return "Morning"
    if any(x in t for x in ["10am", "11am", "12pm", "2nd prahar of the day"]): return "Afternoon"
    return "Any"

def get_semitones(aroha, avaroha):
    """Extracts unique semitones. Sa (0) is always included."""
    unique_swaras = set(aroha + avaroha)
    offsets = [0] # Always include Sa
    for s in unique_swaras:
        # Normalize to root octave
        root_s = s.replace("'", "").replace(",", "")
        if root_s == "S": continue # Already added
        if root_s in SEMITONE_MAP:
            val = SEMITONE_MAP[root_s]
            if val not in offsets:
                offsets.append(val)
    return sorted(offsets)

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    with open(INPUT_FILE, 'r') as f:
        raw_data = json.load(f)

    catalogue = []
    total = len(raw_data)

    for i, raga in enumerate(raw_data, 1):
        name = raga.get("name", "Unknown")
        jati = raga.get("jati", "").strip()
        
        # 1. Swara Lists
        avaroha = parse_swara_list(raga.get("avaroha", ""), is_aroha=False)
        
        if "Sampurna" in jati and "Audhav" not in jati and "Shadav" not in jati:
            # If avaroha starts with S', it is properly descending -> reverse it
            if avaroha and avaroha[0] == "S'":
                aroha = avaroha[::-1]
            # If avaroha ends with S', it is actually ascending (scraper put Aroha in Avaroha field)
            elif avaroha and avaroha[-1] == "S'":
                aroha = avaroha[:]
            else:
                aroha = avaroha[::-1] # fallback
                
            # Remove duplicate S'
            if len(aroha) >= 2 and aroha[-1] == "S'" and aroha[-2] == "S'":
                aroha.pop()
        else:
            aroha = parse_swara_list(raga.get("aroha", ""), is_aroha=True)

        # 2. Vadi / Samvadi mapping
        vs = raga.get("vadi_samvadi", "")
        vadi, samvadi = "", ""
        for sep in [" - ", "–"]:
            if sep in vs:
                parts = vs.split(sep)
                vadi = map_vadi_name(parts[0])
                samvadi = map_vadi_name(parts[1])
                break

        # 3. Semitones (excluding Sa)
        semitones_list = get_semitones(aroha, avaroha)
        
        # 4. HZ_MAP (Including S)
        swaras_in_raga = set(aroha + avaroha)
        hz_map = {}
        # S is always present
        hz_map["S"] = round(HZ_SA, 2)
        for s in swaras_in_raga:
            root_s = s.replace("'", "").replace(",", "")
            if root_s in SEMITONE_MAP:
                offset = SEMITONE_MAP[root_s]
                hz_map[root_s] = round(HZ_SA * (2 ** (offset / 12)), 2)

        # 5. Time and Mood
        time_cat = get_time_category(raga.get("time", "Any"))
        
        mood_raw = raga.get("mood", "Classical").strip()
        if not mood_raw: mood_raw = "Classical"
        first_sentence = mood_raw.split(".")[0].strip()
        if len(first_sentence) > 80:
            first_sentence = first_sentence[:80].strip()
        mood = first_sentence

        # 6. Jati and Tags
        thaat = raga.get("thaat", "Unknown")
        tags = ["hindustani", thaat.lower(), time_cat.lower()]
        if "Sampurna" in jati: tags.append("seven-notes")
        if "Audhav" in jati: tags.append("five-notes")
        if "Shadav" in jati: tags.append("six-notes")

        # 7. Structuring
        entry = {
            "name": name,
            "aroha": aroha,
            "avaroha": avaroha,
            "vadi": vadi,
            "samvadi": samvadi,
            "pakad": raga.get("pakad", ""),
            "thaat": thaat,
            "time_of_day": time_cat,
            "mood": mood,
            "jati": jati,
            "semitones": semitones_list,
            "hz_sa": HZ_SA,
            "hz_map": hz_map,
            "tags": sorted(list(set(tags))),
            "verified": False,
            "vishranti_sthan": raga.get("notes_extra", {}).get("vishranti_sthan", ""),
            "source_url": raga.get("source_url", "")
        }

        catalogue.append(entry)
        print(f"[{i}/{total}] {name} ✓")

    # 8. Save output
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(catalogue, f, indent=4)

    print(f"\nConverted {len(catalogue)} ragas → {OUTPUT_FILE}")

if __name__ == "__main__":
    main()