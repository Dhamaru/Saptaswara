import json
import os

def fix_s_prime():
    path = 'tools/data/raga_catalogue.json'
    if not os.path.exists(path):
        print("File not found")
        return

    with open(path, 'r') as f:
        data = json.load(f)

    fixed_count = 0
    for raga in data:
        hz_map = raga.get('hz_map', {})
        aroha = raga.get('aroha', [])
        avaroha = raga.get('avaroha', [])
        all_notes = set(aroha + avaroha)
        
        if "S'" in all_notes and "S'" not in hz_map:
            if "S" in hz_map:
                hz_map["S'"] = round(hz_map["S"] * 2, 2)
                fixed_count += 1
                # print(f"Fixed S' for {raga['name']}")
            else:
                print(f"Warning: {raga['name']} has S' but missing base S in hz_map")

    if fixed_count > 0:
        with open(path, 'w') as f:
            json.dump(data, f, indent=4)
        print(f"Successfully fixed S' for {fixed_count} ragas in {path}")
    else:
        print("No ragas needed S' fix")

if __name__ == "__main__":
    fix_s_prime()
