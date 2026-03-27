import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

def test_raga_data():
    load_dotenv()
    
    catalogue_path = 'tools/data/raga_catalogue.json'
    results = []
    
    # 1. Load tools/data/raga_catalogue.json
    print("--- 1. JSON Catalogue Checks ---")
    try:
        if not os.path.exists(catalogue_path):
            results.append((False, "JSON file not found"))
            print("FAIL: JSON file not found")
        else:
            with open(catalogue_path, 'r') as f:
                data = json.load(f)
            
            # Total ragas must be exactly 120
            if len(data) == 120:
                results.append((True, "Total ragas is 120"))
                print("PASS: Total ragas is 120")
            else:
                results.append((False, f"Total ragas is {len(data)}, expected 120"))
                print(f"FAIL: Total ragas is {len(data)}, expected 120")
            
            # Check every raga
            all_fields_ok = True
            all_aroha_ok = True
            all_semitones_ok = True
            all_hz_map_ok = True
            
            required_fields = ['name', 'aroha', 'avaroha', 'vadi', 'samvadi', 'thaat', 'time_of_day', 'semitones', 'hz_map']
            
            for raga in data:
                name = raga.get('name', 'Unknown')
                # Every raga must have these fields non-empty
                for field in required_fields:
                    val = raga.get(field)
                    if not val:
                        all_fields_ok = False
                        print(f"FAIL: Raga {name} has empty field {field}")
                
                # aroha and avaroha must be arrays with at least 4 items each
                aroha = raga.get('aroha', [])
                avaroha = raga.get('avaroha', [])
                if not isinstance(aroha, list) or len(aroha) < 4:
                    all_aroha_ok = False
                    print(f"FAIL: Raga {name} aroha too short")
                if not isinstance(avaroha, list) or len(avaroha) < 4:
                    all_aroha_ok = False
                    print(f"FAIL: Raga {name} avaroha too short")
                
                # semitones must be an array starting with 0
                semitones = raga.get('semitones', [])
                if not isinstance(semitones, list) or not semitones or semitones[0] != 0:
                    all_semitones_ok = False
                    print(f"FAIL: Raga {name} semitones must start with 0")
                
                # hz_map must have at least 4 keys
                hz_map = raga.get('hz_map', {})
                if not isinstance(hz_map, dict) or len(hz_map) < 4:
                    all_hz_map_ok = False
                    print(f"FAIL: Raga {name} hz_map too small")
            
            if all_fields_ok:
                results.append((True, "All fields present and non-empty"))
                print("PASS: All fields present and non-empty")
            else:
                results.append((False, "Some fields are missing or empty"))
                
            if all_aroha_ok:
                results.append((True, "Aroha/Avaroha length >= 4"))
                print("PASS: Aroha/Avaroha length >= 4")
            else:
                results.append((False, "Some Aroha/Avaroha are too short"))
                
            if all_semitones_ok:
                results.append((True, "Semitones start with 0"))
                print("PASS: Semitones start with 0")
            else:
                results.append((False, "Some semitones don't start with 0"))
                
            if all_hz_map_ok:
                results.append((True, "hz_map length >= 4"))
                print("PASS: hz_map length >= 4")
            else:
                results.append((False, "Some hz_map are too small") )

            # 2. Manual Raga Checks
            print("\n--- 2. Manual Raga Checks ---")
            raga_map = {r['name']: r for r in data}
            
            # Yaman: thaat=Kalyan, time_of_day=Evening, vadi=G
            yaman = raga_map.get('Yaman')
            if yaman:
                if yaman.get('thaat') == 'Kalyan' and yaman.get('time_of_day') == 'Evening' and yaman.get('vadi') == 'G':
                    results.append((True, "Yaman checks (thaat, time, vadi)"))
                    print("PASS: Yaman checks (thaat, time, vadi)")
                else:
                    results.append((False, f"Yaman checks failed: thaat={yaman.get('thaat')}, time={yaman.get('time_of_day')}, vadi={yaman.get('vadi')}"))
                    print("FAIL: Yaman checks failed")
                
                # Yaman: semitones must contain 6 (tivra Ma)
                if 6 in yaman.get('semitones', []):
                    results.append((True, "Yaman contains tivra Ma (6)"))
                    print("PASS: Yaman contains tivra Ma (6)")
                else:
                    results.append((False, "Yaman missing tivra Ma (6)"))
                    print("FAIL: Yaman missing tivra Ma (6)")
            else:
                results.append((False, "Yaman not found"))
                print("FAIL: Yaman not found")
                
            # Bhairav: thaat=Bhairav, time_of_day=Morning
            bhairav = raga_map.get('Bhairav')
            if bhairav:
                if bhairav.get('thaat') == 'Bhairav' and bhairav.get('time_of_day') == 'Morning':
                    results.append((True, "Bhairav checks (thaat, time)"))
                    print("PASS: Bhairav checks (thaat, time)")
                else:
                    results.append((False, "Bhairav checks failed"))
                    print("FAIL: Bhairav checks failed")
            else:
                results.append((False, "Bhairav not found"))
                print("FAIL: Bhairav not found")
                
            # Bhairavi: thaat=Bhairavi, time_of_day=Morning
            bhairavi = raga_map.get('Bhairavi')
            if bhairavi:
                if bhairavi.get('thaat') == 'Bhairavi' and bhairavi.get('time_of_day') == 'Morning':
                    results.append((True, "Bhairavi checks (thaat, time)"))
                    print("PASS: Bhairavi checks (thaat, time)")
                else:
                    results.append((False, "Bhairavi checks failed"))
                    print("FAIL: Bhairavi checks failed")
            else:
                results.append((False, "Bhairavi not found"))
                print("FAIL: Bhairavi not found")
                
            # Malkauns: thaat=Bhairavi, vadi=m (or g)
            malkauns = raga_map.get('Malkauns')
            if malkauns:
                if malkauns.get('thaat') == 'Bhairavi' and malkauns.get('vadi') in ['m', 'M', 'g', 'G']:
                    results.append((True, "Malkauns checks (thaat, vadi)"))
                    print("PASS: Malkauns checks (thaat, vadi)")
                else:
                    results.append((False, f"Malkauns checks failed: thaat={malkauns.get('thaat')}, vadi={malkauns.get('vadi')}"))
                    print(f"FAIL: Malkauns checks failed: vadi={malkauns.get('vadi')}")
            else:
                results.append((False, "Malkauns not found"))
                print("FAIL: Malkauns not found")

    except Exception as e:
        results.append((False, f"JSON load error: {str(e)}"))
        print(f"FAIL: JSON load error: {str(e)}")

    # 3. Supabase Checks
    print("\n--- 3. Supabase Checks ---")
    try:
        url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            results.append((False, "Supabase env vars missing (SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)"))
            print(f"FAIL: Supabase env vars missing. URL found: {bool(url)}, Key found: {bool(key)}")
        else:
            supabase: Client = create_client(url, key)
            
            # ragas table has exactly 120 rows
            res_ragas = supabase.table("ragas").select("id", count="exact").execute()
            count_ragas = res_ragas.count
            if count_ragas == 120:
                results.append((True, "Supabase 'ragas' count is 120"))
                print("PASS: Supabase 'ragas' count is 120")
            else:
                results.append((False, f"Supabase 'ragas' count is {count_ragas}, expected 120"))
                print(f"FAIL: Supabase 'ragas' count is {count_ragas}, expected 120")
            
            # raga_embeddings table has at least 100 rows
            res_emb = supabase.table("raga_embeddings").select("id", count="exact").execute()
            count_emb = res_emb.count
            if count_emb >= 100:
                results.append((True, f"Supabase 'raga_embeddings' count is {count_emb} (>= 100)"))
                print(f"PASS: Supabase 'raga_embeddings' count is {count_emb} (>= 100)")
            else:
                results.append((False, f"Supabase 'raga_embeddings' count is {count_emb}, expected >= 100"))
                print(f"FAIL: Supabase 'raga_embeddings' count is {count_emb}")
            
            # Query for Yaman — all fields present in DB row
            res_yaman = supabase.table("ragas").select("*").eq("name", "Yaman").execute()
            if res_yaman.data:
                yaman_db = res_yaman.data[0]
                db_fields_ok = True
                for field in required_fields:
                    if field not in yaman_db or yaman_db[field] is None:
                        db_fields_ok = False
                        print(f"FAIL: DB Yaman missing field {field}")
                
                if db_fields_ok:
                    results.append((True, "Yaman DB row has all fields"))
                    print("PASS: Yaman DB row has all fields")
                else:
                    results.append((False, "Yaman DB row missing fields"))
            else:
                results.append((False, "Yaman not found in DB"))
                print("FAIL: Yaman not found in DB")

    except Exception as e:
        results.append((False, f"Supabase error: {str(e)}"))
        print(f"FAIL: Supabase error: {str(e)}")

    # Summary
    passed = sum(1 for r in results if r[0])
    total = len(results)
    print(f"\n{passed}/{total} checks passed")

if __name__ == "__main__":
    test_raga_data()
