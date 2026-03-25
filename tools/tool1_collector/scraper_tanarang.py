import os
import json
import time
import re
import cloudscraper
from bs4 import BeautifulSoup
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

def main():
    index_url = "https://tanarang.com/raag-index/"
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    output_file = os.path.join(data_dir, "raga_raw.json")
    error_file = os.path.join(data_dir, "scraper_errors.json")

    os.makedirs(data_dir, exist_ok=True)

    scraper = cloudscraper.create_scraper()
    
    # Configure professional retries (Triple-layer: Session retries + Manual loop + timeout)
    retry_strategy = Retry(
        total=5,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    scraper.mount("https://", adapter)
    scraper.mount("http://", adapter)

    ragas = []
    processed_urls = set()
    if os.path.exists(output_file):
        try:
            with open(output_file, 'r') as f:
                ragas = json.load(f)
                # Resume support: Process if URL is new OR if existing entry has empty mood
                processed_urls = {r.get('source_url') for r in ragas if r.get('source_url') and r.get('mood')}
        except Exception as e:
            print(f"Warning: Could not load existing data: {e}")

    errors = []

    print(f"Fetching index from {index_url}...")
    try:
        resp = scraper.get(index_url, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Find all raga links in the index
        links = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            # Detail pages follow the pattern /raag-xxxx/
            if '/raag-' in href and not any(x in href for x in ['/raag-index', '/category/', '/tag/']):
                name = a.get_text(strip=True)
                # Ensure the link text is likely a raga name (starts with uppercase)
                if name and name[0].isupper() and "Search" not in name:
                    # Convert relative to absolute if necessary
                    if href.startswith('/'):
                        href = "https://tanarang.com" + href
                    links.append((name, href))

        # Filter duplicates
        unique_links = []
        seen_hrefs = set()
        for name, href in links:
            if href not in seen_hrefs:
                unique_links.append((name, href))
                seen_hrefs.add(href)

        total_links = len(unique_links)
        print(f"Found {total_links} raga links. Starting collection...")

        for i, (name, url) in enumerate(unique_links, 1):
            if url in processed_urls:
                continue

            try:
                # Politeness delay
                time.sleep(1.5)
                print(f"[{i}/{total_links}] {name}...", end=" ", flush=True)
                
                # Fetch raga detail with a second layer of manual retries for "Remote end closed connection"
                r_resp = None
                for attempt in range(3):
                    try:
                        r_resp = scraper.get(url, timeout=20)
                        if r_resp.status_code == 200:
                            break
                    except Exception as e:
                        if attempt == 2:
                            raise e
                        print(f" (Retry {attempt+1}...) ", end="", flush=True)
                        time.sleep(4)

                if r_resp is None or r_resp.status_code != 200:
                    status = r_resp.status_code if r_resp else "Connection Failed"
                    print(f"Failed (Status {status})")
                    errors.append({"name": name, "url": url, "error": f"Status {status}"})
                    continue

                r_soup = BeautifulSoup(r_resp.text, 'html.parser')
                
                # Extract technical details
                info = {}
                all_tds = r_soup.find_all('td')
                for idx, td in enumerate(all_tds):
                    raw_label = td.get_text(strip=True).replace('\xa0', ' ')
                    norm_label = re.sub(r'[\u2010-\u2015-]', '-', raw_label).lower().strip()
                    norm_label = re.sub(r'\s*-\s*', ' - ', norm_label)
                    
                    if norm_label in ['swar', 'jati', 'thaat', 'vadi - samvadi', 'time', 'vishranti sthan', 'mukhya ang', 'aaroh - avroh', 'nature']:
                        if idx + 1 < len(all_tds):
                            val = all_tds[idx + 1].get_text(strip=True)
                            info[norm_label] = val
                
                # Extract "Nature" paragraph (Mood) - target the paragraph after the technical table
                nature = ""
                tech_table = r_soup.find('table', style=re.compile(r"border:\s*1px\s*solid\s*#000", re.I))
                if not tech_table:
                    tech_table = r_soup.find('table')
                
                if tech_table:
                    candidate = tech_table.find_next_sibling(['p', 'div'])
                    if candidate:
                        nature = candidate.get_text(" ", strip=True)
                        if len(nature) < 50:
                            next_cand = candidate.find_next_sibling(['p', 'div'])
                            if next_cand:
                                nature += " " + next_cand.get_text(" ", strip=True)

                if nature:
                    sentences = re.split(r'(?<=[.!?])\s+', nature)
                    nature = " ".join(sentences[:3])

                # Map to our schema
                raga_data = {
                    "serial": str(i),
                    "name": name,
                    "aroha": info.get("aaroh - avroh", "").split("-")[0].strip() if "-" in info.get("aaroh - avroh", "") else info.get("aaroh - avroh", ""),
                    "avaroha": info.get("aaroh - avroh", "").split("-")[1].strip() if "-" in info.get("aaroh - avroh", "") else "",
                    "vadi_samvadi": info.get("vadi - samvadi", ""),
                    "pakad": info.get("mukhya ang", ""),
                    "thaat": info.get("thaat", ""),
                    "time": info.get("time", ""),
                    "mood": nature,
                    "jati": info.get("jati", ""),
                    "source_a": True,
                    "source_b": False,
                    "notes_extra": {
                        "vishranti_sthan": info.get("vishranti sthan", ""),
                        "varshya_varj_swar": info.get("varshya - varj swar", "")
                    },
                    "source_url": url
                }

                # Update existing or append new
                existing_entry = next((r for r in ragas if r.get('source_url') == url), None)
                if existing_entry:
                    existing_entry.update(raga_data)
                else:
                    ragas.append(raga_data)

                with open(output_file, 'w') as f:
                    json.dump(ragas, f, indent=4)
                
                print("✓")

            except Exception as e:
                print(f"Error: {e}")
                errors.append({"name": name, "url": url, "error": str(e)})

    except Exception as e:
        print(f"Critical error: {e}")
        errors.append({"critical_error": str(e)})

    if errors:
        with open(error_file, 'w') as f:
            json.dump(errors, f, indent=4)
        print(f"\nDone with {len(errors)} errors. See {error_file}")
    else:
        # Clear error file if successful
        if os.path.exists(error_file):
            os.remove(error_file)
        print("\nScraping completed successfully.")

if __name__ == "__main__":
    main()
