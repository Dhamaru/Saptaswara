import urllib.request
from bs4 import BeautifulSoup
import json
import re

def scrape_melakartas():
    req = urllib.request.Request("https://en.wikipedia.org/wiki/List_of_Melakarta_ragas", headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req).read()
    soup = BeautifulSoup(html, "html.parser")
    
    ragas = []
    
    # Melakarta page has tables. We look for tables with "Mēḷakartā Rāgas"
    tables = soup.find_all("table", class_="wikitable")
    for table in tables:
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) == 6 or len(cells) >= 3:
                # Format: [No, Raga, Scale, No(Prati), Raga(Prati), Scale(Prati)]
                try:
                    # Shuddha Madhyama
                    if len(cells[0].text.strip()) > 0 and str(cells[0].text.strip()).isdigit():
                        no = cells[0].text.strip()
                        name_tag = cells[1].find('a')
                        name = name_tag.text.strip() if name_tag else cells[1].text.strip()
                        scale = cells[2].text.strip()
                        
                        scale_notes = parse_scale_to_array(scale)
                        if scale_notes:
                            ragas.append({
                                "name": name,
                                "tradition": "Carnatic",
                                "thaat": f"Melakarta {no}",
                                "jati": "Sampurna-Sampurna",
                                "aroha": scale_notes,
                                "avaroha": list(reversed(scale_notes)),
                                "vadi": scale_notes[0], # Sa
                                "samvadi": scale_notes[4] if len(scale_notes) > 4 else "Pa", # Pa
                                "time_of_day": "Universal",
                                "mood": "Classical Melakarta"
                            })
                    
                    # Prati Madhyama (if columns 3, 4, 5 exist)
                    if len(cells) >= 6 and len(cells[3].text.strip()) > 0 and str(cells[3].text.strip()).isdigit():
                        no2 = cells[3].text.strip()
                        name_tag2 = cells[4].find('a')
                        name2 = name_tag2.text.strip() if name_tag2 else cells[4].text.strip()
                        scale2 = cells[5].text.strip()
                        
                        scale_notes2 = parse_scale_to_array(scale2)
                        if scale_notes2:
                            ragas.append({
                                "name": name2,
                                "tradition": "Carnatic",
                                "thaat": f"Melakarta {no2}",
                                "jati": "Sampurna-Sampurna",
                                "aroha": scale_notes2,
                                "avaroha": list(reversed(scale_notes2)),
                                "vadi": scale_notes2[0],
                                "samvadi": scale_notes2[4] if len(scale_notes2) > 4 else "Pa",
                                "time_of_day": "Universal",
                                "mood": "Classical Melakarta"
                            })
                except Exception as e:
                    pass
    return ragas

def scrape_janyas():
    req = urllib.request.Request("https://en.wikipedia.org/wiki/List_of_Janya_ragas", headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req).read()
    soup = BeautifulSoup(html, "html.parser")
    
    ragas = []
    # Janya ragas page has multiple tables.
    tables = soup.find_all("table", class_="wikitable")
    for table in tables:
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) >= 3:
                try:
                    name_tag = cells[0].find('a')
                    name = name_tag.text.strip() if name_tag else cells[0].text.strip()
                    scale = cells[1].text.strip() # sometimes it's Arohana
                    
                    # Usually Janya tables have Arohana and Avarohana separated by newline or comma, 
                    # or in two different cells. Let's look at a standard list: 
                    # Column 1: Name, Column 2: Arohana/Avarohana (Scale) or specific columns.
                    if len(cells) >= 3:
                        aroha_str = cells[1].text.strip()
                        avaro_str = cells[2].text.strip()
                        
                        aroha_notes = parse_scale_to_array(aroha_str)
                        avaro_notes = parse_scale_to_array(avaro_str)
                        
                        if aroha_notes and avaro_notes:
                            ragas.append({
                                "name": name,
                                "tradition": "Carnatic",
                                "thaat": "Janya",
                                "jati": "Derived",
                                "aroha": aroha_notes,
                                "avaroha": avaro_notes,
                                "vadi": aroha_notes[0],
                                "samvadi": avaro_notes[3] if len(avaro_notes) > 3 else "Pa",
                                "time_of_day": "Universal",
                                "mood": "Traditional Janya"
                            })
                except Exception as e:
                    pass
    return ragas

def parse_scale_to_array(scale_str):
    # e.g., "S R₁ G₁ M₁ P D₁ N₁ Ṡ" -> "S R1 G1 M1 P D1 N1 S"
    subs = str.maketrans("₁₂₃Ṡ", "123S")
    scale_str = scale_str.translate(subs)
    
    mapping = {
        "S": "Sa",
        "R1": "Re(1)", "R2": "Re(2)", "R3": "Re(3)",
        "G1": "Ga(1)", "G2": "Ga(2)", "G3": "Ga(3)",
        "M1": "Ma(1)", "M2": "Ma(2)",
        "P": "Pa",
        "D1": "Dha(1)", "D2": "Dha(2)", "D3": "Dha(3)",
        "N1": "Ni(1)", "N2": "Ni(2)", "N3": "Ni(3)"
    }
    
    tokens = scale_str.replace(',', ' ').replace(';', ' ').replace('\xa0', ' ').split()
    notes = []
    
    for t in tokens:
        clean = re.sub(r'[^A-Z0-9]', '', t.upper())
        if clean in mapping:
            notes.append(mapping[clean])
        elif clean == 'S':
            notes.append("Sa")
            
    if notes and notes[-1] == "Sa" and len(notes) > 1:
        notes.pop()
        
    return notes if len(notes) >= 5 else None

if __name__ == "__main__":
    melakarta = scrape_melakartas()
    print(f"Successfully scraped {len(melakarta)} Melakarta ragas from Wikipedia.")
    janya = scrape_janyas()
    print(f"Successfully scraped {len(janya)} Janya ragas from Wikipedia.")
    
    ragas = melakarta + janya
    print(f"Total: {len(ragas)}")
    
    with open("/home/dhamarunath/Desktop/Saptaswara/tools/data/wiki_carnatic.json", "w") as f:
        json.dump(ragas, f, indent=2)
