# SAPTASWARA — Production PRD v2.0 · Intelligence Layer
*Confidential — Internal*

| | |
|---|---|
| **Version** | 2.0 — Intelligence layer |
| **Builds on** | v1 live at saptaswara.vercel.app |
| **Prerequisite** | v1 complete with 100+ real users and feedback data |
| **Stack additions** | Gemini audio API · MusicGen · Saraga datasets · pgvector v2 |
| **Target timeline** | Weeks 1–10 after v1 user validation |
| **Status** | Planned — do not build until v1 user data is collected |

---

## 01 — Why v2 exists
*What v1 proved and what the next layer adds*

Version 1 shipped the core thesis: a raga-guided keyboard, drums, voice recorder, and layer timeline. Users can create and export compositions. The raga engine works. The AI assistant answers questions. The data pipeline produced 120 verified ragas.

Version 2 is built on evidence from real users, not assumptions. Every feature in this document is justified by one of three signals: user interviews confirming the need, session analytics showing where users stop, or a technical capability that directly unblocks a known user pain point.

> **The v2 rule**
> Before building anything in this document, collect these signals from v1 users: (1) Where do users abandon the workspace? (2) What do they ask the raga assistant most? (3) What do they say they wish the app could do? If a feature in this PRD is not confirmed by those signals, defer it to v3.

---

## 02 — Core principle — unchanged from v1
*The human creates. The AI guides.*

This principle is the product. Every v2 feature must pass this test: does it help the user make a better creative decision, or does it make the decision for them?

- Raga beat suggestions **pass** — the user still decides whether to use the suggested pattern.
- File import with raga detection **passes** — the user still decides what to do with the detected raga.
- Auto-composition **fails** — the AI making the music defeats the purpose of the platform.
- Unlimited FX studio **fails** — this is Garageband. Saptaswara is not Garageband.

> **What Saptaswara is not**
> Saptaswara is not a DAW. It is not a streaming service. It is not a social music platform. It is a guided creation workspace for Indian classical music. Every feature that pulls it away from this identity makes it worse, not better.

---

## 03 — Backend — v2
*New APIs, schema changes, and infrastructure additions*

### 3.1 New database tables

| Table | Key fields | Purpose |
|---|---|---|
| **mood_mappings** | raga_id (FK), modern_mood (text), classical_rasa (text), confidence (float) | Maps modern mood tags to ragas. Human-curated, not AI-generated. |
| **beat_suggestions** | raga_id (FK), thaat (text), pattern (jsonb), bpm_range (int[]), mood (text), verified (bool) | Curated tabla patterns per raga. Used by beat suggestion AI. |
| **audio_imports** | id, user_id (FK), project_id (FK), storage_path, detected_raga_id (FK), confidence (float), status (text) | Stores imported audio files and raga detection results. |
| **conformance_scores** | layer_id (FK), raga_id (FK), score (float), note_breakdown (jsonb), created_at | Per-recording raga conformance analysis results. |
| **user_preferences** | user_id (FK), preferred_ragas (text[]), preferred_instruments (text[]), skill_level (text) | Personalisation data collected from usage. |

### 3.2 Schema changes to existing tables

- **ragas** — add `modern_moods (text[])` column. Values: Calm, Romantic, Devotional, Melancholic, Joyful, Focus, Energetic. Human-curated mapping, not AI-generated.
- **ragas** — add `starter_raga (boolean)` column. Marks the 8 beginner-friendly ragas shown first to new users: Yaman, Bhoopali, Bhimpalasi, Bhairavi, Desh, Kafi, Hamsadhwani, Durga.
- **layers** — add `conformance_score (float)` populated after voice recording analysis.

### 3.3 New API endpoints

| Endpoint | Method | Description |
|---|---|---|
| `POST /api/audio/detect-raga` | POST | Accepts audio file upload. Calls Gemini 1.5 Pro audio API. Returns detected raga + confidence + characteristic phrases found. |
| `GET /api/ragas/mood/:mood` | GET | Returns ragas matching a modern mood tag. Sorted by popularity. Paginated. |
| `GET /api/ragas/starter` | GET | Returns the 8 starter ragas shown to new users. Cached aggressively. |
| `POST /api/ai/beat-suggest` | POST | Accepts raga_id + mood. Returns 3 tabla pattern suggestions from beat_suggestions table, ranked by AI relevance. |
| `POST /api/layers/:id/analyse` | POST | Runs raga conformance analysis on a voice layer. Stores result in conformance_scores. Returns score + note breakdown. |
| `PATCH /api/users/preferences` | PATCH | Updates user_preferences table. Called after onboarding questions. |

### 3.4 Infrastructure additions

- **Supabase Storage** — new bucket: `audio-imports`. Per-user folder. 50MB per file limit. Auto-delete after raga detection completes (user can opt to keep).
- **Gemini 1.5 Pro audio API** — for raga detection from uploaded files. Different from Gemini 1.5 Flash used in the assistant. Pro model handles native audio input.
- **pgvector upgrade** — add separate embeddings for `beat_suggestions` table. 768d vectors from Gemini `text-embedding-004`. Enables semantic beat retrieval.
- **Supabase Edge Function** — `audio-detect`. Handles the Gemini audio API call server-side to avoid exposing API key to client. Returns structured detection result.
- **Rate limiting** — add rate limiting middleware to all AI endpoints. Limits: 10 raga detections per day (free), 10 beat suggestions per session, 50 assistant queries per day (free).

### 3.5 Security changes

- RLS on `audio_imports` — users can only read and write their own imports.
- RLS on `conformance_scores` — access via parent layer ownership.
- RLS on `mood_mappings` and `beat_suggestions` — public read, admin write only.
- API key rotation — rotate `GEMINI_API_KEY` in Vercel environment variables every 90 days.

---

## 04 — Frontend — v2
*New screens, components, and user flows*

### 4.1 New screens

| Screen | Route | Description |
|---|---|---|
| **Onboarding** | / (first visit) | 3-step flow shown once: What brings you here? (beginner/student/musician) → What mood are you in? → Here is your first raga. Sets user_preferences. |
| **Mood explorer** | /explore/mood | Browse ragas by modern mood. Calm, Romantic, Devotional, Melancholic, Joyful, Focus, Energetic. Cards show raga name + time of day. |
| **Import and detect** | /import | Upload audio file. Shows detection progress. Reveals detected raga with confidence score. Option to open in studio with detected raga. |
| **Profile** | /profile | User preferences, skill level, favourite ragas, compositions count, total recording time. |

### 4.2 New workspace components

#### Beat suggestion panel

Lives in the Drums tab. After user sets BPM and selects a raga, a 'Suggest a pattern' button appears. Clicking it calls `POST /api/ai/beat-suggest` and shows 3 tabla patterns as visual step grids. User clicks one to load it into the drum pad. Or dismisses and taps their own pattern.

- Display: 16-step grid per suggestion. Highlighted cells show where tabla hits fall.
- Each suggestion labelled: 'Teentaal — steady' / 'Keherwa — folk feel' / 'Dadra — light'.
- User can edit the loaded pattern freely after selecting it.
- If offline, hide the suggestion button. Do not show a broken state.

#### Mood filter in raga browser

Add a second filter row in the raga browser below the time-of-day tabs. Seven mood chips: Calm, Romantic, Devotional, Melancholic, Joyful, Focus, Energetic. Multiple selection allowed. Combines with time-of-day filter.

- Chip styling: pill shape, inactive = outline only, active = filled indigo.
- Filter is client-side — no API call. `raga_catalogue.json` now includes `modern_moods` array per raga.
- Show count: '12 ragas match' updates as filters change.

#### Raga conformance score after voice recording

After user stops a voice recording, run analysis client-side using pitchy data already captured during recording. Show a score card below the clip: '78% of your notes are in Yaman'. Break it down by note: Sa — 24 hits, Ga — 18 hits, M (not in raga) — 3 hits.

- Score card is dismissable. Does not block the user.
- Tone: encouraging, never critical. 'You stayed in Yaman for most of this — great start.'
- Do not show on drum layers. Only voice layers.

#### Starter raga shelf

On the landing page and the raga browser, show a horizontal shelf labelled 'Good ragas to start with' containing the 8 starter ragas. Each card is slightly larger than the regular grid cards. Shown only to users who have not yet created a project.

### 4.3 Navigation fixes

> **Known bug from TestSprite**
> Clicking Workspace in the navbar did not update the URL correctly. All navigation items must use Next.js Link component. Routes must be deterministic.

- Workspace → `/studio` (not /workspace — match the existing route)
- Library → `/dashboard`
- Explore → `/explore`
- Profile → `/profile`
- Each route has a proper `page.tsx` that renders the correct content. No fallback to landing.

### 4.4 API error handling

> **Known bug from TestSprite**
> All API routes return empty responses on error instead of JSON. TestSprite failed to parse responses. Every API route must return structured JSON on all error paths.

- All API routes: return `NextResponse.json({error: 'message'}, {status: 400/401/500})`.
- `POST /api/ai/suggest`: validate question is non-empty string, max 500 chars. Return 400 with JSON if invalid.
- `POST /api/projects`: validate title (required, max 100 chars), raga_id (valid UUID), bpm (40–200). Return 400 with JSON listing missing fields.
- `GET /api/projects`: require authenticated session. Return 401 JSON if no session.
- All routes: wrap in try-catch. Return 500 JSON on unhandled errors. Never return empty body.

---

## 05 — New user flows — v2
*What users can do that they could not do in v1*

### Flow 1 — First-time user onboarding

| Step | Action | Screen shows | Result |
|---|---|---|---|
| 1 | Opens app first time | 3-step onboarding modal. Step 1: What brings you here? Beginner / Student / Musician. | User preference stored. |
| 2 | Selects skill level | Step 2: What mood are you in right now? Calm / Romantic / Devotional / Melancholic / Joyful. | Mood preference stored. |
| 3 | Confirms mood | Step 3: Based on your mood, try Yaman — an evening raga with a romantic quality. Large raga card with sample play button. | User lands in studio with Yaman preselected. |
| 4 | Enters studio | Keyboard highlighted for Yaman. Starter tip tooltip: 'These highlighted keys are Yaman's notes — they will sound right together.' | User plays first note within 60 seconds of opening app. |

### Flow 2 — Raga detection from audio import

| Step | Action | Screen shows | Result |
|---|---|---|---|
| 1 | Goes to /import | Upload area. Drag and drop or click. Accepted formats: MP3, WAV, M4A. Max 10MB. | File selected. |
| 2 | Uploads file | Progress bar. 'Listening to your recording...' message. | File uploaded to Supabase Storage. |
| 3 | Detection runs | Gemini 1.5 Pro analyses audio. Spinner with 'Identifying raga patterns...' | Raga detected server-side. |
| 4 | Result shown | Large card: 'This sounds like Bhairavi (87% confidence)'. Aroha, avaroha, mood shown. Two buttons: Open in Studio / Try a different raga. | User understands what raga their recording resembles. |
| 5 | Opens in studio | Studio opens with Bhairavi preselected. User's imported audio added as Voice 1 layer. | User continues composing in the detected raga. |

### Flow 3 — Beat suggestion

| Step | Action | Screen shows | Result |
|---|---|---|---|
| 1 | Opens Drums tab in studio | BPM slider, drum pad grid, and 'Suggest a pattern' button below the grid. | User sees suggestion option. |
| 2 | Clicks Suggest | Loading state. 'Finding patterns for Yaman...' | API call to `POST /api/ai/beat-suggest`. |
| 3 | Sees 3 suggestions | Three 16-step grids labelled Teentaal / Keherwa / Dadra. Play preview button on each. | User previews each pattern. |
| 4 | Selects Keherwa | Grid loads into drum pad. User can edit any cell. | Pattern loaded. User owns the result. |
| 5 | Records | Clicks Record. Drum pattern loops. Layer added to timeline. | Drums layer with raga-appropriate rhythm. |

---

## 06 — Technical specifications — v2
*Precise implementation requirements*

### 6.1 Raga detection — Gemini audio

Use Gemini 1.5 Pro (not Flash) for audio understanding. Flash does not have native audio input capability at the required quality level.

- **Input:** audio file as base64, sent to Gemini with `media_type audio/mp3` or `audio/wav`.
- **Prompt:** `'This is an Indian classical music recording. Identify which Hindustani raga it most closely resembles. Return JSON only: { raga: string, confidence: float 0-1, evidence: string[], characteristic_phrases_found: string[] }'`.
- **Validate:** confidence must be float between 0 and 1. Raga must match a name in ragas table. If no match found, return `{raga: null, confidence: 0, evidence: []}`.
- **Fallback:** if Gemini returns malformed JSON, retry once. If second attempt fails, return `{error: 'Detection failed', code: 'GEMINI_PARSE_ERROR'}`.
- **Cost:** Gemini 1.5 Pro charges per audio minute. Limit uploads to 3 minutes to control cost. Free tier: 2 detections per day. Pro tier: 20 per day.

### 6.2 Beat suggestion — RAG pipeline

Beat suggestions use a two-step retrieval process, not pure generation.

- **Step 1:** embed the query (raga name + thaat + mood) using Gemini `text-embedding-004`.
- **Step 2:** vector search in `raga_embeddings_beats` table (separate from raga knowledge base). Return top 5 matches.
- **Step 3:** pass retrieved patterns to Gemini Flash with prompt: `'Given these tabla patterns for similar ragas, suggest the 3 most appropriate for {raga_name} in {mood} mood. Return JSON array of 3 patterns with label and steps fields.'`
- **Pattern schema:** `{ label: string, taal: string, steps: boolean[16], description: string }`
- Always return exactly 3 patterns. If fewer than 3 retrieved, fill remaining with general patterns from the `beat_suggestions` table.

### 6.3 Conformance scoring — client-side

Conformance scoring runs entirely in the browser using data already captured during recording. No API call needed.

- During voice recording, pitchy samples Hz at 20ms intervals. Store samples in `recordingBuffer` array.
- On stop: filter samples where `clarity > 0.85` (strong pitch signal only). Map each Hz to nearest swara using `ragaEngine.resolveNote()`.
- Count hits per swara. Calculate percentage of hits that fall on raga notes vs non-raga notes.
- Score = `(raga note hits / total hits) * 100`, rounded to integer.
- Return: `{ score: 78, breakdown: { S: 24, R: 12, G: 18, M_non_raga: 3, P: 8, D: 6, N: 9 }, dominant_swara: 'G' }`

### 6.4 Performance targets — v2

| Metric | Target | Notes |
|---|---|---|
| Raga detection response time | < 8 seconds | Gemini Pro audio processing. Show progress bar. |
| Beat suggestion response time | < 3 seconds | Embedding + retrieval + Gemini Flash generation. |
| Conformance score calculation | < 200ms | Client-side only. No network call. |
| Mood filter response | Instant | Client-side. raga_catalogue.json already loaded. |
| Onboarding completion | < 60 seconds | 3 questions, pre-selected options, no typing required. |

---

## 07 — Suggested improvements — v2
*What to change based on v1 feedback*

### Core experience improvements

#### 1. Keyboard touch response on mobile
v1 keyboard works on mobile browser but touch latency is noticeable on lower-end devices. Use pointer events instead of touch events. Add `touch-action: none` CSS to keyboard container to prevent scroll interference. Target: < 30ms from touch to sound on mid-range Android.

#### 2. Raga browser loading state
v1 raga browser shows 120 cards at once which causes a layout shift on first load. Implement virtual scrolling using a simple windowed list — render only visible cards plus 20 above and below. Reduces initial render from 120 DOM nodes to approximately 30.

#### 3. Auto-save visual feedback
v1 save indicator shows *Saved* but users report not noticing it. Make the save indicator more prominent: pulsing dot when saving, green checkmark when saved, amber dot when offline with queue. Add a subtle toast on first save: 'Your composition is automatically saved.'

#### 4. Empty drum pad state
v1 drum pad starts empty with no direction. When user opens Drums tab for the first time, show a ghost pattern (dimmed, non-playable) demonstrating what a Teentaal pattern looks like. Disappears the moment user taps any pad.

#### 5. Raga assistant response quality
v1 assistant answers factual questions well but does not proactively connect answers to the user's active composition. Improve the system prompt: `'The user is currently composing in {active_raga}. When answering questions, connect your answer to this raga where relevant. If the user asks about a different raga, suggest how they could explore it after finishing their current composition.'`

---

## 08 — What not to build in v2
*Hard boundaries*

> **These features are explicitly excluded from v2**
> If a user requests these or if team discussion brings these up, the answer is no — not because they are bad ideas, but because they belong to v3 or v4 and building them now would dilute the intelligence layer that v2 is supposed to deliver.

- Full effects chain (reverb, delay, EQ) — v3.
- Autotune — v3.
- MusicGen melody continuation — v3.
- Real-time collaboration — v4.
- Carnatic ragas — v4.
- Community library or social features — v4.
- Composition sharing or public URLs — v4.
- Mobile native app (iOS/Android) — v4.
- Streaming distribution (SoundCloud, YouTube) — v4.
- Unlimited track count — not in any version. 6 tracks is the correct limit for the target user.

---

*Saptaswara v2 PRD · April 2026 · Confidential*
