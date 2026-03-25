import os
import json
import time
import re
import cloudscraper
from bs4 import BeautifulSoup

def slugify(text):
    """
    Convert raga name to slug: lowercase, spaces to hyphens, remove special characters.
    """
    text = text.lower()
    # Remove special characters (anything not a-z, 0-9, or space/hyphen)
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    # Convert spaces to hyphens
    text = re.sub(r'\s+', '-', text)
    # Remove leading/trailing hyphens
    return text.strip('-')

def main():
    base_url = "https://amitray.com/the-84-ragas-of-indian-classical-music-a-complete-guide/"
    learnragas_base = "https://learnragas.com/raga/"
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    output_file = os.path.join(data_dir, "raga_raw.json")
    error_file = os.path.join(data_dir, "scraper_errors.json")

    # Ensure data directory exists
    os.makedirs(data_dir, exist_ok=True)

    ragas = []
    processed_names = set()
    
    # Resume support: Load existing data
    if os.path.exists(output_file):
        try:
            with open(output_file, 'r') as f:
                ragas = json.load(f)
                processed_names = {r['name'] for r in ragas}
        except Exception as e:
            print(f"Warning: Could not load existing {output_file}: {e}")

    errors = []
    scraper = cloudscraper.create_scraper()

    print(f"Fetching primary list from {base_url}...")
    try:
        response = scraper.get(base_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all tables on the page
        tables = soup.find_all('table')
        if not tables:
            print("Error: No tables found on the target page.")
            return
        
        # Collect ragas from all tables
        all_main_ragas = []
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cols = row.find_all(['td', 'th'])
                if len(cols) < 10:
                    continue
                
                serial_text = cols[0].get_text(strip=True)
                # Skip any row where the first cell is not a number
                if not serial_text.isdigit():
                    continue
                    
                raga_data = {
                    "serial": serial_text,
                    "name": cols[1].get_text(strip=True),
                    "aroha": cols[2].get_text(strip=True),
                    "avaroha": cols[3].get_text(strip=True),
                    "vadi_samvadi": cols[4].get_text(strip=True),
                    "pakad": cols[5].get_text(strip=True),
                    "thaat": cols[6].get_text(strip=True),
                    "time": cols[7].get_text(strip=True),
                    "mood": cols[8].get_text(strip=True),
                    "jati": cols[9].get_text(strip=True),
                    "source_a": True,
                    "source_b": False,
                    "notes_extra": {}
                }
                all_main_ragas.append(raga_data)

        total_count = len(all_main_ragas)
        print(f"Found {total_count} ragas. Starting detailed collection...")

        for i, raga in enumerate(all_main_ragas, 1):
            raga_name = raga['name']
            
            # Skip ragas already processed (resume support)
            if raga_name in processed_names:
                continue

            try:
                # Wait 2 seconds between requests
                time.sleep(2)
                
                slug = slugify(raga_name)
                secondary_url = f"{learnragas_base}{slug}/"
                
                lr_resp = scraper.get(secondary_url)
                if lr_resp.status_code == 200:
                    lr_soup = BeautifulSoup(lr_resp.text, 'html.parser')
                    
                    found_keys = ["pakad:", "vadi:", "thaat:", "time:"]
                    for key in found_keys:
                        # Find elements containing the key strings
                        element = lr_soup.find(string=re.compile(re.escape(key), re.I))
                        if element:
                            # Extract text and clean up
                            content = element.parent.get_text(strip=True)
                            raga["notes_extra"][key.strip(':')] = content
                            raga["source_b"] = True
                
                # Add to main list and save incrementally
                ragas.append(raga)
                with open(output_file, 'w') as f:
                    json.dump(ragas, f, indent=4)
                
                print(f"[{i}/{total_count}] {raga_name} ✓")
                
            except Exception as e:
                err_msg = f"Error processing {raga_name}: {str(e)}"
                print(err_msg)
                errors.append({"raga": raga_name, "error": str(e)})

    except Exception as e:
        print(f"Critical error fetching main list: {e}")
        errors.append({"main_list_error": str(e)})

    # Save errors to tools/data/scraper_errors.json at the end
    if errors:
        with open(error_file, 'w') as f:
            json.dump(errors, f, indent=4)
        print(f"Process finished with some errors. Details in {error_file}")
    else:
        print("Scraping completed successfully.")

if __name__ == "__main__":
    main()