# 📓 Saptaswara Development Log

This file tracks every major task, error, and solution encountered during the development of Saptaswara.

---

## 🏗️ Phase 1: Data Pipeline (The Foundation)

### 1. Tool 1: Raga Scraper
- **Tasks**: Scrape comprehensive raga data from web sources.
- **Errors**:
    - *Initial Source (AmitRay)*: Missing over 40 critical ragas.
    - *Tanarang.com*: Moody/Nature section used different HTML structures across pages.
    - *Cloudflare*: Occasional blocks during high-frequency requests.
- **Solutions**:
    - Switched to `tanarang.com` as the primary source.
    - Implemented a more flexible "paragraph-based" extraction for moods.
    - Added a 2-second delay between requests to remain under the radar.

### **Phase 8/9: Studio Audio & Interface Overhaul** [COMPLETED]
- Status: 100%
- Accomplishments:
    - Fixed "No Sound" issue with `PolySynth` fallback in `AudioEngine`.
    - Implemented high-fidelity **Ivory/Ebony Piano** with reactive glow.
    - Added **Laptop Keyboard (QWERTY)** input mapping (A-K keys).
    - Reduced workspace clutter with a **Collapsible AI Assistant**.
    - Auto-selected 'Abhogi Kanada' for immediate platform usability.
    - Fixed Piano layout overlap and visibility in dark mode.

### **Phase 9: AI Composition Expansion** [IN READY]
- Status: 0%
- Goals: AI Raga Assistant final chat logic and Master Recording feature.

---
*End of Phase 8 Log - 2026-03-27*

### 2. Tool 2: Musical Structurer
- **Tasks**: Convert raw text into deterministic musical JSON.
- **Errors**:
    - *Condensed Aroha*: Tanarang often stores Aroha in a shorthand "Pakad" style (e.g., Yaman showing 3 notes instead of 7).
    - *Semitone Gap*: Sa (root) was missing the 0 index in the semitone array.
    - *Time Complexity*: Ragas were assigned specific hours that didn't map to general app categories.
- **Solutions**:
    - Integrated **Avaroha Reversal Logic**: For Sampurna ragas, the Aroha is derived by reversing the Avaroha.
    - Fixed the semitone mapping to always include `0` for Sa.
    - Implemented a "Prahar" mapping logic to categorize times into Morning/Afternoon/Evening/Night.

### 3. Tool 3: Flask Validator UI
- **Tasks**: Build a web dashboard for human validation of 120 ragas.
- **Errors**:
    - *Jinja2 Template Error*: `TemplateAssertionError` when trying to use template inheritance within a single-file script.
- **Solutions**:
    - Refactored the Flask app to use `DictLoader`, allowing the use of `base.html` and `index.html` within a single Python file without requiring external directories.

### 4. Tool 4: RAG Builder & Embeddings
- **Tasks**: Generate vector embeddings for every raga and store in Supabase.
- **Errors**:
    - *Model Not Found*: Attempted to use `text-embedding-004` which was unsupported in the current API version (`v1beta`).
    - *Dimension Mismatch*: Gemini returned 3072 dimensions, but the database expected 768.
    - *Index Limit*: Supabase `ivfflat` index limit is 2000 dimensions.
- **Solutions**:
    - Switched to the stable `gemini-embedding-001` model.
    - Utilized the `output_dimensionality=768` parameter to force the model into our schema's constraints without losing semantic power.

---

## 🗄️ Phase 2: Supabase Infrastructure

### 1. SQL Migrations
- **Tasks**: Create schema for Users, Ragas, Projects, Layers.
- **Errors**:
    - *Relation Already Exists*: Repeatedly trying to run SQL caused errors if one table or policy already existed.
- **Solutions**:
    - Updated all SQL files to be **Idempotent**: Added `IF NOT EXISTS` to tables and `DROP POLICY IF EXISTS` before every policy creation.

### 2. Seeding Logic
- **Tasks**: Push 120 ragas to the cloud database.
- **Errors**:
    - *NPM Timeout*: TypeScript/npm seeding failed due to network restrictions in the environment.
- **Solutions**:
    - **Pivoted to Python**: Rewrote the seeding script from TypeScript to Python (`seed_ragas.py`) using the pre-installed `supabase-py` client.

## 🎹 Phase 3: Interactive Music Studio

### 1. Tone.js Audio Engine
- **Tasks**: Create a `Tone.js` wrapper for real-time polyphonic synthesis.
- **Errors**:
    - *AudioContext not started*: Browsers require user interaction before audio can play.
- **Solutions**:
    - Added an explicit "Initialize Audio" button that calls `Tone.start()` on user click.

### 2. 16-Step Sequencer UI
- **Tasks**: Build a grid-based sequencer restricted to the selected raga's swaras.
- **Errors**:
    - *Grid didn't update*: React state mutation instead of immutable update.
- **Solutions**:
    - Used spread operator to create new array copies on each toggle.

### 3. Project Persistence
- **Tasks**: Save compositions to Supabase (project + layer).
- **Errors**:
    - *FK Violation on user_id*: `projects.user_id` references `profiles(id)` which references `auth.users`.
    - *Column mismatch*: Code used `settings` and `instrument` but DB has `events` and `type`.
- **Solutions**:
    - Made `user_id` nullable for dev mode.
    - Fixed column names to match the migration schema.
    - Created server-side `/api/projects` route with `SUPABASE_SERVICE_ROLE_KEY`.

---

## 🤖 Phase 4: AI Orchestration & Project Management

### 1. AI Assistant (RAG)
- **Tasks**: Build a floating chat UI connected to Gemini + Supabase vector search.
- **Errors**:
    - *404 Not Found for `text-embedding-004`*: Model doesn't exist in the `v1beta` API.
    - *404 for `gemini-1.5-flash`*: Model removed/renamed in current API version.
    - *Embedding dimension mismatch*: SDK returns 3072d by default, DB expects 768d.
    - *`match_ragas` RPC not found*: SQL function hadn't been applied to the live database.
- **Solutions**:
    - Used `ListModels` API to discover correct names: `models/gemini-embedding-001` and `models/gemini-flash-latest`.
    - Added `outputDimensionality: 768` to the embed call.
    - User applied `006_vector_search.sql` migration via Supabase SQL Editor.

### 2. User Dashboard
- **Tasks**: Build a project management page at `/dashboard`.
- **Errors**:
    - *Dashboard used `name` column*: DB column is `title`.
    - *RLS blocked anonymous reads*: Dashboard couldn't list projects.
- **Solutions**:
    - Fixed column reference to `title`.
    - Created server-side `/api/projects` route that uses service role key.

### 3. Shared Navbar
- **Tasks**: Create a consistent navigation component.
- **Solutions**:
    - Built `Navbar.tsx` with active-state highlighting and integrated into `layout.tsx`.

## Phase 8: Stitch UI Alignment (The Resonant Void)
- **Tasks**: Align the entire Saptaswara UI with the "Resonant Void" design system from Stitch (Project ID: `11357440373779983860`).
- **Accomplishments**:
    - **Design System**: Implemented a obsidian-theme palette with `surface-lowest` (#0e0e10) and `primary` (#c3c0ff) tokens.
    - **Typography**: Integrated `Manrope` (Sans), `DM Sans` (Display), `Space Grotesk` (Label), and `DM Mono` (Technical).
    - **Layout**: Adopted "No-Line" rule (tonal layering) and Glassmorphism for floating UI elements.
    - **Pages**: Redesigned Landing (Bento Hero), Explore (Atmospheric Grid), and Studio (High-end Workspace).
    - **Assistant**: Overhauled the Raga Assistant with the new aesthetic and Material Symbols.
- **Security**: Updated `X-Goog-Api-Key` configuration for enhanced AI service reliability.

---

## 🏁 Milestone: Design Alignment Complete
**Current State**: Saptaswara is now a premium, studio-grade application with a cohesive visual identity and professional multi-track composition tools.
