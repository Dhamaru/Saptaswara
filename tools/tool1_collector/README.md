# Instructions for running Tool 1
# Tool 1 — Raga Source Collector

Part of the Saptaswara data pipeline.

## What this does

Collects raw raga data from three sources and saves two outputs:

| Output | File | Used by |
|--------|------|---------|
| Structured raga JSON | `raga_raw.json` | Tool 2 (Gemini structurer) |
| Prose text per raga | `ragajungle_raw/*.txt` | Tool 4 (RAG embeddings) |

## Sources

| Source | URL | What it gives you |
|--------|-----|--------------------|
| A — amitray.com | amitray.com/the-84-ragas... | 84 ragas, all structured fields — PRIMARY |
| B — learnragas.com | learnragas.com/raga/{name}/ | Per-raga pages for extra detail |
| C — ragajunglism.org | ragajunglism.org/ragas/{name}/ | Rich prose for RAG — NOT structured data |

## Setup

```bash
# 1. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# 2. Install dependencies
pip install requests beautifulsoup4 cloudscraper

# 3. Run
python scraper.py
```

## Why cloudscraper?

amitray.com returns a 403 error to plain `requests` calls because it uses
Cloudflare bot protection. `cloudscraper` handles the Cloudflare challenge
automatically — no manual steps needed.

## Expected output

```
raga_raw.json          ← 84 ragas, all fields
ragajungle_raw/
  bhairavi.txt
  yaman.txt
  ... (one file per raga)
```

## If a site blocks you completely

Some hosting environments block all outbound scraping.
In that case, manually copy the amitray.com table into a CSV
and run `python parse_csv_fallback.py` instead.

## Next step

Once `raga_raw.json` exists, run:
```bash
python ../tool2_structurer/structurer.py
```

This sends each raga to Gemini for validation and normalisation,
producing the final `raga_catalogue.json` used by Saptaswara.