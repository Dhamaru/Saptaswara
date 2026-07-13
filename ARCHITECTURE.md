# Saptaswara — Architecture Reference

> Saptaswara (Sanskrit: "Seven Notes") is an Indian classical music studio for composing, practicing, and exploring ragas with AI guidance.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Full Architecture Diagram](#2-full-architecture-diagram)
3. [Frontend Layer](#3-frontend-layer)
4. [Backend Layer](#4-backend-layer)
5. [AI & Suggestion Pipeline](#5-ai--suggestion-pipeline)
6. [Database Layer](#6-database-layer)
7. [Auth Flow](#7-auth-flow)
8. [Data Flow End to End](#8-data-flow-end-to-end)
9. [Security Model](#9-security-model)
10. [Test Coverage](#10-test-coverage)
11. [Environment Variables](#11-environment-variables)
12. [Local Development Setup](#12-local-development-setup)
13. [Product Roadmap — Musical Intelligence](#13-product-roadmap--musical-intelligence)
    - [13.1 Raga-Aware Scale System](#131-raga-aware-scale-system)
    - [13.2 Tala / Rhythm Engine](#132-tala--rhythm-engine)
    - [13.3 Swara-Based Composition Interface](#133-swara-based-composition-interface)
    - [13.4 Ornament System](#134-ornament-system)
    - [13.5 AI-Assisted Guidance](#135-ai-assisted-guidance)
    - [13.6 Practice Intelligence — Saptaswara Riyaz](#136-practice-intelligence--saptaswara-riyaz)

---

## 1. Project Overview

Saptaswara is a full-stack Indian classical music studio built on **Next.js 16.2.4** (App Router, Turbopack). It lets musicians compose and play back ragas using a virtual piano and drum pad, record sessions, export MIDI files, keep a practice journal, and consult an AI assistant trained on raga theory.

**Primary user flows:**
- Browse the raga library, pick a raga, and open it in the studio editor.
- Play notes on the Piano or DrumPad components, powered by Tone.js.
- Ask the AI chat assistant raga-specific questions (streaming SSE).
- Get AI-powered raga suggestions from a semantic vector search.
- Log practice sessions in the journal with intensity and notes.
- Export compositions as standard MIDI files.

**Runtime stack at a glance:**

| Layer | Technology |
|---|---|
| Monorepo tooling | npm workspaces |
| Frontend framework | Next.js 16.2.4 (App Router, Turbopack) |
| UI language | TypeScript + Tailwind CSS |
| Audio playback | Tone.js + Web Audio API |
| MIDI export | midi-writer-js |
| Backend | Next.js API routes (route.ts) + Proxy (proxy.ts) |
| Auth | Supabase Auth + Proxy Session Handling |
| Database | Supabase (PostgreSQL) + pgvector |
| AI generation | Google Generative AI — gemini-2.0-flash (primary), NVIDIA NIM llama-3.3-70b (429 fallback) |
| AI embeddings | Google Generative AI — gemini-embedding-001 (768-dim) |
| Input validation | Zod on all POST endpoints |
| Rate limiting | Upstash Redis sliding window (ai: 20/60s, write: 60/60s, read: 200/60s); in-memory fallback in local dev |
| Error tracking | Sentry (production only, 20% trace sampling, PII stripped) |
| CI/CD | GitHub Actions — typecheck → lint → audit → build → Vercel deploy |

---

## 2. Full Architecture Diagram

```
Saptaswara/
├── apps/
│   └── web/                        # Next.js 16 application
│       ├── app/
│       │   ├── layout.tsx           # Root layout — ToastProvider > PlaybackProvider > CompositionProvider
│       │   ├── page.tsx             # Landing page
│       │   ├── studio/page.tsx      # Main studio editor
│       │   ├── library/page.tsx     # Raga library browser
│       │   ├── journal/page.tsx     # Practice journal
│       │   ├── login/page.tsx       # Email / OAuth login + Remember Me
│       │   ├── signup/page.tsx      # Signup form
│       │   ├── auth/callback/       # OAuth callback handler
│       │   └── api/
│       │       ├── ai/chat/route.ts
│       │       ├── ai/suggest/route.ts
│       │       ├── ai/generate/route.ts
│       │       ├── ai/mood/route.ts
│       │       ├── journal/route.ts
│       │       ├── export/midi/route.ts
│       │       └── projects/route.ts
│       ├── components/
│       │   ├── Piano.tsx            # Interactive keyboard + QWERTY key map
│       │   ├── DrumPad.tsx
│       │   ├── SwaPad.tsx
│       │   ├── Assistant.tsx        # Studio-local AI chat (streaming SSE)
│       │   ├── GlobalAssistant.tsx  # Floating site-wide AI widget
│       │   ├── Navbar.tsx
│       │   ├── TransportBar.tsx
│       │   ├── RagaCard.tsx         # Unique visual identity per raga (hash + hue-rotate)
│       │   ├── RagaBrowser.tsx
│       │   ├── RagaRing.tsx
│       │   ├── EarTraining.tsx
│       │   ├── LearnerGuide.tsx
│       │   ├── Guidebook.tsx
│       │   ├── MoodPicker.tsx
│       │   ├── ImmersiveHUD.tsx
│       │   ├── SwaraTranscriber.tsx
│       │   ├── LayerTimeline.tsx
│       │   ├── Toast.tsx
│       │   └── ErrorBoundary.tsx
│       ├── context/
│       │   ├── PlaybackContext.tsx
│       │   └── CompositionContext.tsx
│       └── lib/
│           ├── audio.ts             # AudioEngine singleton (Tone.js) — mastering chain
│           ├── musicalMath.ts       # Swara↔frequency math
│           ├── ragaUtils.ts         # Varjya checking, scale utilities
│           ├── ragCache.ts          # Embedding + RAG result caches
│           ├── rateLimit.ts         # Upstash Redis rate limiter (3 tiers)
│           ├── pitchDetector.ts     # Mic pitch detection (hum/sing)
│           ├── hzToSwara.ts         # Hz → swara name conversion
│           ├── swaraUtils.ts        # Swara display helpers
│           ├── gamakaData.ts        # Gamaka ornament definitions
│           ├── talas.ts             # Tala/cycle definitions
│           ├── utils.ts
│           └── supabase/
│               ├── client.ts        # Browser client
│               └── server.ts        # Server client (async cookies)
├── packages/
│   └── core/
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts             # Raga, Project, Layer, Swara types
│       │   ├── ragaEngine.ts        # RagaEngine.detectPhrases()
│       │   ├── ragaEngine.test.ts
│       │   ├── api.chat.test.ts
│       │   ├── api.suggest.test.ts
│       │   ├── api.journal.test.ts
│       │   ├── api.midi.test.ts
│       │   └── audio.test.ts
│       └── package.json
└── supabase/
    └── migrations/
        ├── 20260327000000_initial_schema.sql
        ├── 20260406120000_practice_logs.sql
        ├── 20260406120001_add_tradition_embeddings.sql
        ├── 20260407120000_raga_phrases.sql
        ├── 20260408000000_fix_tradition_column.sql
        ├── 20260408120000_grant_anon_access.sql
        └── 20260424000000_rls_hardening.sql
```

**High-level service interaction:**

```
Browser
  │
  ├─── Next.js App Router (apps/web)
  │       ├─── Page components (RSC + Client)
  │       ├─── Context Providers (PlaybackContext, CompositionContext)
  │       ├─── Tone.js AudioEngine (singleton, client-only)
  │       └─── API routes (route.ts)
  │               ├─── Supabase (PostgreSQL + pgvector + Auth)
  │               └─── Google Generative AI
  │                       ├─── gemini-flash-latest  (chat + suggestions)
  │                       └─── gemini-embedding-001 (768-dim vectors)
  │
  └─── packages/core (shared types + RagaEngine + frequency math)
```

---

## 3. Frontend Layer

### Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Landing page |
| `/studio` | `app/studio/page.tsx` | Main studio editor (Piano, DrumPad, Assistant) |
| `/library` | `app/library/page.tsx` | Raga library browser |
| `/journal` | `app/journal/page.tsx` | Practice journal (log + history) |
| `/login` | `app/login/page.tsx` | Email / OAuth login form |
| `/signup` | `app/signup/page.tsx` | Signup form |
| `/auth/callback` | `app/auth/callback/` | OAuth callback handler |

### Root Layout Provider Order

`apps/web/app/layout.tsx` wraps children in this exact nesting order:

```
ToastProvider
  └── PlaybackProvider
        └── CompositionProvider
              └── {children}
```

This ordering matters: the studio page can call both playback actions and trigger composition saves, and both contexts must be available before any page renders.

### Components

| Component | Responsibility |
|---|---|
| `Piano.tsx` | Renders an interactive piano keyboard; calls `AudioEngine.playSwara()` |
| `DrumPad.tsx` | Renders a drum pad grid; calls `AudioEngine.playStroke()` |
| `Assistant.tsx` | Local Studio AI chat panel (streaming SSE) |
| `GlobalAssistant.tsx` | Floating site-wide AI assistant with "Double-Click to Drag" persistence |
| `Navbar.tsx` | Top navigation bar, auth state display |
| `RagaCard.tsx` | Card component for displaying a raga in the library |
| `Toast.tsx` | Toast notification UI consumed from ToastProvider |
| `ErrorBoundary.tsx` | React error boundary wrapper |

### Context Providers

#### PlaybackContext (`context/PlaybackContext.tsx`)

```typescript
{
  isPlaying: boolean,
  setIsPlaying: (v: boolean) => void,
  isRecording: boolean,
  setIsRecording: (v: boolean) => void,
  currentRagaId: string | null,
  setCurrentRagaId: (id: string | null) => void,
  saveTriggered: number,       // counter incremented by triggerSave()
  triggerSave: () => void      // studio watches this via useEffect
}
```

`saveTriggered` is a counter. The studio page uses a `useEffect` that depends on `saveTriggered`; each time `triggerSave()` is called the counter increments, triggering the effect which calls `handleSaveProject()`.

#### CompositionContext (`context/CompositionContext.tsx`)

```typescript
{
  state: CompositionState,  // layers, bpm, volume, droneActive, activeInstrument, activeTradition
  dispatch: Dispatch,
  canUndo: boolean,
  canRedo: boolean
}
```

State is auto-saved to `localStorage` with a 500 ms debounce so in-progress compositions survive page refreshes.

### Audio Engine (`apps/web/lib/audio.ts`)

The audio engine is a **singleton** — only one instance exists per browser session.

```typescript
let _instance: AudioEngine | null = null

getAudioEngine()   // creates on first call; returns null during SSR
dispose()          // disposes Tone.js nodes and resets _instance = null
```

**Initialization sequence:**

1. **Constructor** — creates:
   - `PolySynth` (melody fallback)
   - `Sampler` (Salamander piano samples)
   - `PolySynth` (percussion fallback)
   - `masterOutput` (Volume node — all instruments connect here)
   - `masterEQ` (EQ3) + `limiter` (Limiter) — mastering chain
   - Signal path: `masterOutput.chain(masterEQ, limiter, Tone.getDestination())`
2. **`start()`** — called on first user gesture:
   - Resumes Tone.js `AudioContext`
   - Creates drone `PolySynth`
   - Creates `timbreGain` (Volume node)
   - Calls `buildTimbreNode(instrument, tradition)`
3. **`setTimbre()`** — 100 ms crossfade:
   - Ramps old gain to -120 dB, disposes it
   - Builds a new timbre node

**Mastering chain:**
All instruments connect to `masterOutput`. The chain `masterOutput → masterEQ (EQ3) → limiter (Limiter) → Tone.getDestination()` ensures mastering presets (NEUTRAL/WARM/CLEAR/BRIGHT/DEEP) actually affect all audio output. Do **not** call `masterOutput.toDestination()` — that short-circuits the EQ.

**Instrument routing by tradition:**

| Tradition | Melody | Strings / Wind | Percussion | Drone |
|---|---|---|---|---|
| Hindustani | harmonium (2× detuned Synth, +8¢) | sarangi (FMSynth + Reverb 1.5 s), sitar (PluckSynth + PitchShift) | tabla (MembraneSynth × 2) | tambura |
| Carnatic | veena (PluckSynth + PitchShift + LFO) | bansuri (FMSynth + NoiseSynth) | mridangam (MembraneSynth + MetalSynth) | tambura (AMSynth) |

**Percussion stroke routing:**

The percussion engine uses independent synthesis chains decoupled from the melodic tradition to ensure polyphonic clarity.

| Strokes | Drum | Synthesis Target |
|---|---|---|
| Na, Ti, Te | High drum (Dayan) | MembraneSynth (300 Hz) |
| Ge, Ka | Low drum (Bayan) | MembraneSynth (80 Hz) |
| Dha, Dhin | Both drums | Simultaneous trigger |
| Chappu (Mridangam) | Rim stroke | MetalSynth (600 Hz resonance) |

**Key public API:**

```typescript
start(): Promise<void>
setTimbre(instrument: InstrumentName, tradition: TraditionType): void
playSwara(frequency: number, duration?: string, time?: number, velocity?: number): void
playStroke(stroke: string): void
toggleDrone(isActive: boolean, type?: string, rootFreq?: number): void
setVolume(value: number): void          // clamps to [-40, 0]
playArohaAvaroha(
  aroha: string[],
  avaroha: string[],
  onPlayNote?: (note: string | null) => void
): Promise<void>
startRecording(): Promise<void>
stopRecording(): Promise<void>          // downloads recorded audio as .webm
stopAll(): void
dispose(): void                         // also resets _instance to null
```

### Musical Math (`apps/web/lib/musicalMath.ts`)

```typescript
normalizeSwara(raw: string): string
// Exact match → Hindustani shorthand (S→Sa, r→re) → alias map → fallback raw

swaraToFrequency(swara: string, rootFreq = 261.63, baseOctave = 4): number
// Strips octave markers: ^ or ' → +1 octave, . or , → -1 octave
// Returns: rootFreq * 2^(targetOctave-4) * 2^(offset/12)
```

### How the Frontend Calls the Backend

All API calls from the browser follow this pattern:

```typescript
const { data: { session } } = await supabase.auth.getSession()
const res = await fetch('/api/some-route', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify(payload)
})
```

The `Assistant.tsx` component additionally opens an SSE stream (`text/event-stream`) for the chat route and processes `data: ...\n\n` chunks until it receives `data: [DONE]\n\n`.

---

## 4. Backend Layer

All API routes live under `apps/web/app/api/**/route.ts`. Validation uses **Zod** on every POST body. Rate limiting uses Upstash Redis (three tiers: `ai` 20/60s, `write` 60/60s, `read` 200/60s) with automatic in-memory fallback when Redis env vars are absent.

---

### POST /api/ai/chat

**File:** `apps/web/app/api/ai/chat/route.ts`

| Property | Detail |
|---|---|
| Auth | Bearer token → `anonClient.auth.getUser(token)` → 401 if fails |
| Rate limit | `checkRateLimit(user.id, 'ai')` → 429 if exceeded (20 req/60s) |
| External | Gemini 2.0 Flash (primary SSE stream); NVIDIA NIM llama-3.3-70b (429 fallback) |

**Request body:**
```json
{
  "messages": [ /* non-empty array */ ],
  "ragaContext": {          // optional
    "name": "Yaman",
    "aroha": ["Sa","Re","Ga","Ma#","Pa","Dha","Ni","Sa'"],
    "avaroha": ["Sa'","Ni","Dha","Pa","Ma#","Ga","Re","Sa"]
  }
}
```

**Response:** `Content-Type: text/event-stream`
```
data: Here is the first chunk\n\n
data: ...more chunks...\n\n
data: [DONE]\n\n
```

The system prompt defines the AI as Saptaswara's "Neural Resonance Engine" and instructs it to answer questions about ragas and swaras.

**Error codes:**

| Code | Cause |
|---|---|
| 400 | Empty messages array |
| 401 | Missing or invalid Bearer token |
| 429 | Rate limit exceeded |
| 500 | Gemini API error |

---

### POST /api/ai/suggest

**File:** `apps/web/app/api/ai/suggest/route.ts`

| Property | Detail |
|---|---|
| Auth | Bearer token → `anonClient.auth.getUser(token)` |
| Rate limit | `checkRateLimit(user.id)` |
| External | Google Generative AI (embedding + generation), Supabase RPC (pgvector) |

**Request body:**
```json
{
  "query": "peaceful morning raga",
  "ragaContext": "optional string for additional context"
}
```

**Response:**
```json
{ "text": "Based on your query, Bhairav or Todi would be excellent choices..." }
```

**Internal flow:**
1. Generate a 768-dim embedding for `query` using `gemini-embedding-001` (`taskType=RETRIEVAL_QUERY`)
2. Call `supabase.rpc('match_ragas', { query_embedding, match_threshold: 0.5, match_count: 3 })`
3. Map results to context strings (name, tradition, aroha, avaroha, mood, etc.)
4. Inject context + original query into a Gemini prompt
5. `generateContent()` → return `response.text()`

**Error codes:**

| Code | Cause |
|---|---|
| 400 | Empty query string |
| 401 | Missing or invalid Bearer token |
| 429 | Rate limit exceeded |
| 500 | Gemini or Supabase error |

---

### GET /api/journal

**File:** `apps/web/app/api/journal/route.ts`

| Property | Detail |
|---|---|
| Auth | `resolveUserAndClient()` — tries cookie first, then Bearer token fallback |

**Response:**
```json
{ "data": [ /* practice_logs rows */ ] }
```

Database query:
```sql
SELECT * FROM practice_logs
WHERE user_id = user.id
ORDER BY log_date DESC
```

---

### POST /api/journal

**File:** `apps/web/app/api/journal/route.ts`

| Property | Detail |
|---|---|
| Auth | `resolveUserAndClient()` |
| Rate limit | `checkRateLimit(user.id)` |

**Zod schema:**
```typescript
{
  raga: string().min(1),
  notes: string().min(1),
  intensity: enum(['Deep', 'Meditative', 'Focused', 'Light', 'Creative']),
  date?: string().regex(/^\d{4}-\d{2}-\d{2}$/)
}
```

**Response:**
```json
{ "success": true, "data": { /* inserted practice_log row */ } }
```

Database operation:
```sql
INSERT INTO practice_logs (user_id, raga, notes, intensity, log_date)
VALUES ($1, $2, $3, $4, $5)
```

**Error codes:**

| Code | Cause |
|---|---|
| 400 | Zod validation failure |
| 401 | No valid user session |
| 429 | Rate limit exceeded |
| 500 | Database error |

---

### POST /api/export/midi

**File:** `apps/web/app/api/export/midi/route.ts`

| Property | Detail |
|---|---|
| Auth | Bearer token → `anonClient.auth.getUser(token)` |
| External | midi-writer-js |

**Zod schema:**
```typescript
{
  composition: {
    layers: array().min(1),
    bpm: number().min(60).max(200),
    name: string().min(1)
  }
}
```

**Response:** Binary MIDI file
```
Content-Type: audio/midi
Content-Disposition: attachment; filename="<name>.mid"
```

**Frequency to MIDI conversion:**
```typescript
Math.round(12 * Math.log2(freq / 440) + 69)  // clamped to [0, 127]
```

For each layer, a `MidiWriter.Track` is created with `NoteEvent`s. All tracks are combined with `Writer.buildFile()`.

**Error codes:**

| Code | Cause |
|---|---|
| 400 | Failed Zod validation, or bpm out of range 60–200 |
| 401 | Missing or invalid Bearer token |
| 500 | MIDI generation error |

---

### GET /api/projects

**File:** `apps/web/app/api/projects/route.ts`

| Property | Detail |
|---|---|
| Auth | Server-side cookie auth via `createClient()` |

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "My Yaman Composition",
    "raga_id": "uuid",
    "updated_at": "2026-04-09T10:00:00Z",
    "ragas": { "name": "Yaman" }
  }
]
```

Projects are ordered by `updated_at DESC`.

---

### POST /api/projects

**File:** `apps/web/app/api/projects/route.ts`

| Property | Detail |
|---|---|
| Auth | Server-side cookie auth |

**Request body:**
```json
{
  "projectId": "uuid (optional — omit to create)",
  "title": "My New Project",
  "raga_id": "uuid",
  "bpm": 120,
  "sequence": []
}
```

**Logic:**
- If no `projectId`: `INSERT INTO projects` (new project)
- If `projectId` present: `UPDATE projects` (existing project)
- Always upserts a layer record with `type='keyboard'`, `name='Main Sequence'`

**Response:**
```json
{ "id": "uuid", "success": true }
```

---

### DELETE /api/projects

**File:** `apps/web/app/api/projects/route.ts`

| Property | Detail |
|---|---|
| Auth | Server-side cookie auth |
| Query param | `?id=UUID` |

**Logic:**
```sql
DELETE FROM projects WHERE id = $1 AND user_id = auth.uid()
```

The ownership check (`AND user_id = auth.uid()`) is enforced at both the RLS policy level and the query itself, so one user cannot delete another user's project.

**Response:**
```json
{ "success": true }
```

---

## 5. AI & Suggestion Pipeline

### Chat Streaming (SSE)

```
Client (Assistant.tsx)
    │
    │  POST /api/ai/chat
    │  Authorization: Bearer <token>
    │  Body: { messages, ragaContext? }
    │
    ▼
API Route
    ├── Verify token (getUser)
    ├── Check rate limit
    ├── Build system prompt (Neural Resonance Engine persona + raga context)
    └── Call generateContentStream() on gemini-flash-latest
            │
            ▼
        Stream chunks back as SSE:
            data: chunk1\n\n
            data: chunk2\n\n
            data: [DONE]\n\n
```

The client reads the stream chunk by chunk and appends text to the chat UI in real time.

### Semantic Suggestion Pipeline

```
Client
    │
    │  POST /api/ai/suggest
    │  Body: { query: "peaceful morning raga" }
    │
    ▼
API Route
    ├── Verify token + rate limit
    │
    ├── Step 1: Embed query
    │     Google AI: gemini-embedding-001
    │     taskType = RETRIEVAL_QUERY
    │     Output: float[768]
    │
    ├── Step 2: Vector search
    │     supabase.rpc('match_ragas', {
    │       query_embedding: float[768],
    │       match_threshold: 0.5,
    │       match_count: 3
    │     })
    │     Uses ivfflat cosine similarity index (lists=50)
    │     Returns: [{ id, name, tradition, content, similarity }]
    │
    ├── Step 3: Build context string
    │     Map each result → "Raga: Bhairav | Tradition: Hindustani | Aroha: ..."
    │
    ├── Step 4: Inject into Gemini prompt
    │     "Given these ragas: <context>\nAnswer: <query>"
    │
    └── Step 5: generateContent() → response.text()
            │
            ▼
        { "text": "Based on your query..." }
```

---

## 6. Database Layer

### Tables

#### ragas

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| name | TEXT UNIQUE | |
| thaat | TEXT | |
| time_of_day | TEXT | 'Morning', 'Evening', etc. |
| vadi | TEXT | Primary note |
| samvadi | TEXT | Secondary note |
| aroha | TEXT[] | Ascending scale |
| avaroha | TEXT[] | Descending scale |
| mood | TEXT | |
| prahara | INTEGER | Time period (1–8) |
| tradition | TEXT | CHECK ('Hindustani', 'Carnatic') |
| melakarta_number | INTEGER | Carnatic only |
| embedding | vector(768) | For semantic search |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### projects

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | → auth.users |
| raga_id | UUID FK | → ragas |
| title | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### layers

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| project_id | UUID FK | → projects ON DELETE CASCADE |
| name | TEXT | |
| type | TEXT | CHECK ('melody', 'rhythm', 'drone') |
| events | JSONB | DEFAULT '{"sequence":[]}' |
| created_at | TIMESTAMPTZ | |

#### practice_logs

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| user_id | UUID FK | → auth.users ON DELETE CASCADE |
| raga | TEXT | |
| notes | TEXT | |
| intensity | TEXT | CHECK ('Deep', 'Meditative', 'Focused', 'Light', 'Creative') |
| log_date | DATE | DEFAULT CURRENT_DATE |
| created_at | TIMESTAMPTZ | |

#### raga_phrases

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| raga_id | UUID FK | → ragas ON DELETE CASCADE |
| label | TEXT | e.g. 'Arohi' |
| sequence | TEXT[] | e.g. ['Sa', 'Re', 'Ga'] |
| created_at | TIMESTAMPTZ | |

### Row-Level Security (RLS) Policies

| Table | Operation | Policy |
|---|---|---|
| ragas | SELECT | `USING (true)` — everyone can read |
| projects | ALL | `USING (auth.uid() = user_id)` |
| layers | ALL | `USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.user_id = auth.uid()))` |
| practice_logs | INSERT / SELECT / UPDATE / DELETE | `USING (auth.uid() = user_id)` |
| raga_phrases | SELECT | `USING (true)` — everyone can read |

### RPC: match_ragas

```sql
match_ragas(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE(id UUID, name TEXT, tradition TEXT, content TEXT, similarity float)
```

Uses cosine similarity:
```sql
1 - (r.embedding <=> query_embedding) >= match_threshold
```

Index:
```sql
CREATE INDEX ragas_embedding_idx
  ON ragas USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);
```

### How JWT Flows into RLS

When the API route creates an authenticated Supabase client:

```typescript
createClient(SUPABASE_URL, ANON_KEY, {
  global: {
    headers: { Authorization: `Bearer ${token}` }
  }
})
```

Supabase verifies the JWT and sets `auth.uid()` to the user's UUID for that connection. Every subsequent `.from()` query runs under that identity, and RLS policies evaluate `auth.uid()` to automatically filter or block rows that don't belong to the user.

### Migrations (Chronological)

| Migration | File | What it does |
|---|---|---|
| 1 | `20260327000000_initial_schema.sql` | Creates `ragas`, `projects`, `layers` tables + RLS |
| 2 | `20260406120000_practice_logs.sql` | Creates `practice_logs` table + RLS |
| 3 | `20260406120001_add_tradition_embeddings.sql` | Adds `tradition` + `embedding vector(768)` to `ragas`, creates `ivfflat` index, creates `match_ragas` RPC |
| 4 | `20260407120000_raga_phrases.sql` | Creates `raga_phrases` table, adds `melakarta_number` to `ragas`, seeds 72 Melakarta ragas |
| 5 | `20260408000000_fix_tradition_column.sql` | Adds CHECK constraint, removes DEFAULT from `tradition` column |
| 6 | `20260408120000_grant_anon_access.sql` | `GRANT SELECT ON ALL TABLES TO anon` role |

---

## 7. Auth Flow

### Sign-In

```
1. User initiates login
       │
       ├── OAuth: supabase.auth.signInWithOAuth({ provider: 'google' })
       │       └── Redirect to Google → redirect to /auth/callback → session set
       │
       └── Email: supabase.auth.signInWithPassword({ email, password })
               └── Session cookie set by Supabase

2. Supabase issues a JWT stored as an httpOnly session cookie
```

### Token Lifecycle in API Calls

```
3. Client retrieves token:
   const { data: { session } } = await supabase.auth.getSession()

4. Client attaches to every API request:
   Authorization: Bearer ${session.access_token}

5. API route extracts token:
   req.headers.get('Authorization')?.replace('Bearer ', '').trim()

6. API route verifies identity:
   const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
   const { data: { user }, error } = await anonClient.auth.getUser(token)

7. API route creates an authenticated DB client:
   createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
     global: { headers: { Authorization: `Bearer ${token}` } }
   })

8. All .from() calls on this client have auth.uid() set → RLS enforces row ownership
```

**Why `getUser(token)` not `getUser()`:**
API routes execute in a server context with no browser cookies. The only proof of identity is the Bearer token in the `Authorization` header. Calling `getUser()` without the token argument causes Supabase to look for a cookie session that does not exist in server-side fetch handlers, resulting in a null user. Passing the token explicitly makes the identity check work correctly.

### Journal Dual-Auth: `resolveUserAndClient()`

The journal route must work in two contexts:

1. **Server component context** — session available via httpOnly cookie
2. **Direct browser API call** — no cookie, only Bearer token

`resolveUserAndClient()` handles both:
1. Try to create a cookie-based server client (`createClient()` from `lib/supabase/server.ts`)
2. If cookie auth returns a valid user → use that
3. Otherwise, extract the Bearer token from the request header and call `getUser(token)`
4. Return `{ user, supabase }` if either path succeeds, or `{ user: null, supabase: null }` if both fail

---

## 8. Data Flow End to End

### Journey 1: Logging a Practice Session

```
1. User fills out journal form (raga, notes, intensity, optional date)
2. Journal page calls POST /api/journal:
      Authorization: Bearer <token>
      Body: { raga: "Yaman", notes: "Worked on aroha...", intensity: "Deep" }

3. API route: resolveUserAndClient()
      → cookie auth succeeds (or Bearer token fallback)

4. Zod validates body
      → intensity must be one of: 'Deep' | 'Meditative' | 'Focused' | 'Light' | 'Creative'
      → date, if present, must match /^\d{4}-\d{2}-\d{2}$/

5. checkRateLimit(user.id)
      → 20 requests per 60 s enforced

6. INSERT INTO practice_logs (user_id, raga, notes, intensity, log_date)

7. Response: { success: true, data: { id, user_id, raga, notes, intensity, log_date, created_at } }

8. Journal page re-fetches GET /api/journal → updated list ordered by log_date DESC
```

### Journey 2: Getting an AI Raga Suggestion

```
1. User types "I want a meditative evening raga" in the suggestion box
2. Studio/Library page calls POST /api/ai/suggest:
      Authorization: Bearer <token>
      Body: { query: "I want a meditative evening raga" }

3. API route verifies token → checks rate limit

4. Embeds query:
      Google AI: gemini-embedding-001 (taskType=RETRIEVAL_QUERY)
      Output: float[768]

5. Vector search:
      supabase.rpc('match_ragas', {
        query_embedding: <float[768]>,
        match_threshold: 0.5,
        match_count: 3
      })
      PostgreSQL: 1 - (r.embedding <=> query_embedding) >= 0.5
      ivfflat index (lists=50) accelerates the search
      Returns top 3 ragas by cosine similarity

6. Build context string from results:
      "Raga: Marwa | Tradition: Hindustani | Aroha: Sa re Ga Ma# Dha Ni Sa' | Mood: Serene..."

7. Inject into Gemini prompt → generateContent()

8. Response: { text: "For a meditative evening session, Marwa or Puriya Dhanashri..." }
```

### Journey 3: Exporting a MIDI File

```
1. User clicks "Export MIDI" in the studio
2. Client calls POST /api/export/midi:
      Authorization: Bearer <token>
      Body: {
        composition: {
          name: "My Yaman",
          bpm: 120,
          layers: [
            { events: { sequence: [{ frequency: 293.66, duration: "4n" }, ...] } }
          ]
        }
      }

3. API route verifies token

4. Zod validates:
      bpm must be 60–200, layers non-empty, name non-empty

5. For each layer:
      Create MidiWriter.Track
      For each event:
          MIDI note = Math.round(12 * Math.log2(freq / 440) + 69)
          Clamp to [0, 127]
          Add NoteEvent to track

6. Writer.buildFile() → binary MIDI buffer

7. Response:
      Content-Type: audio/midi
      Content-Disposition: attachment; filename="My Yaman.mid"
      Body: <binary>

8. Browser triggers file download
```

---

## 9. Security Model

The following vulnerabilities were identified and fixed:

| # | Vulnerability | Fix Applied |
|---|---|---|
| 1 | **No auth check on protected routes** | Every non-public route now verifies the Bearer token via `auth.getUser(token)` and returns 401 on failure |
| 2 | **No rate limiting** | `checkRateLimit(user.id)` (20 req / 60 s) added to all AI, journal, and export routes |
| 3 | **Raw error leakage** | All `catch` blocks return generic `'Something went wrong'` messages instead of stack traces or database errors |
| 4 | **No input validation** | Zod schemas added to every POST endpoint; invalid bodies return structured 400 errors |
| 5 | **Any user could delete any project** | DELETE query uses `WHERE id = $1 AND user_id = auth.uid()`, combined with RLS `USING (auth.uid() = user_id)` |
| 6 | **Generic error responses** | Error messages use `'Something went wrong'` — never raw exception `.message` or `.stack` |

**Additional notes:**

- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never exposed to the browser or included in `NEXT_PUBLIC_*` variables.
- `GEMINI_API_KEY` is server-only.
- In-memory rate limiting resets on server restart and is not shared across serverless instances in production — acceptable for the current scale but should be replaced with Redis for horizontal scaling.

---

## 10. Test Coverage

All test files live in `packages/core/src/`. The test runner is configured via `packages/core/vitest.config.ts`.

### ragaEngine.test.ts

Tests for `RagaEngine.detectPhrases(sequence: string[], raga: Raga)`:
- Phrase detection with a mock `Raga` object
- Correct phrase matching using string join (`,`) comparison
- Guard behavior: skips phrases where `p.sequence` is not an array or is empty
- Offset calculation correctness

### api.chat.test.ts

Tests for `POST /api/ai/chat`:
- Bearer token auth — rejects missing or invalid token (401)
- Rate limit — returns 429 when limit exceeded
- SSE streaming — verifies `data: chunk\n\n` format and `data: [DONE]\n\n` termination
- 400 on empty messages array
- 500 on Gemini API error

### api.suggest.test.ts

Tests for `POST /api/ai/suggest`:
- Embedding generation produces 768-dimensional vector
- RPC called with `match_threshold: 0.5` and correct embedding
- Context injection into Gemini prompt includes raga name, tradition, aroha, avaroha, mood
- 400 on empty query, 401 on bad token

### api.journal.test.ts

Tests for `GET` and `POST /api/journal`:
- GET requires valid auth — 401 without token
- POST validates `intensity` enum values
- POST validates `date` field against `/^\d{4}-\d{2}-\d{2}$/`
- POST validates required fields (`raga`, `notes`)
- 401 on missing Bearer token

### api.midi.test.ts

Tests for `POST /api/export/midi`:
- Frequency → MIDI conversion: `Math.round(12 * log2(freq/440) + 69)` clamped to [0, 127]
- Empty `layers` array returns 400
- BPM out of range (< 60 or > 200) returns 400
- Binary response has `Content-Type: audio/midi`
- Valid request returns a binary MIDI file

### audio.test.ts

Tests for `AudioEngine` (singleton):
- `getAudioEngine()` returns the same instance on repeated calls (singleton pattern)
- `polySynths[]` indexes are correct
- Tone.js mock behavior
- Instrument switching via `setTimbre()` without errors
- `dispose()` resets `_instance` to null and a subsequent `getAudioEngine()` creates a new instance

---

## 11. Environment Variables

**Required:**

| Variable | Service | Visibility | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Public | Project URL from Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Public | Anon key — RLS enforces access |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Server-only | Bypasses RLS — never put in `NEXT_PUBLIC_*` |
| `GEMINI_API_KEY` | Google AI | Server-only | AI chat + embeddings. App shows clear error if missing or placeholder. |
| `NEXT_PUBLIC_APP_URL` | App | Public | Base URL, e.g. `https://saptaswara.app` |

**Optional (production):**

| Variable | Service | Notes |
|---|---|---|
| `NVIDIA_API_KEY` | NVIDIA NIM | Gemini 429 quota fallback (llama-3.3-70b) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Upstash | Distributed rate limiting; falls back to in-memory without these |
| `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_ORG` + `SENTRY_PROJECT` + `SENTRY_AUTH_TOKEN` | Sentry | Error tracking (production only) |

Place required vars in `apps/web/.env.local` for local development. In production (Vercel), set all as environment variables in project settings.

---

## 12. Local Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase CLI (for local DB)
- A Google AI API key (for `GEMINI_API_KEY`)

### Install

```bash
# From the repo root
npm install
```

This installs dependencies for all workspaces (`apps/web` and `packages/core`) in one step.

### Environment Variables

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
GEMINI_API_KEY=<your-gemini-api-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run Database Migrations

```bash
supabase start          # starts local Supabase (PostgreSQL)
supabase db push        # applies all migrations in supabase/migrations/
```

### Run the App

```bash
# From repo root
npm run dev --workspace=apps/web
```

The app starts at `http://localhost:3000` with Turbopack.

### Run Tests

```bash
npm run test --workspace=packages/core
```

### curl Examples

Replace `<TOKEN>` with a valid JWT access token from `supabase.auth.getSession()`.

**POST /api/ai/chat — streaming SSE:**
```bash
curl -N -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{ "role": "user", "content": "What is Raga Yaman?" }],
    "ragaContext": { "name": "Yaman", "aroha": ["Sa","Re","Ga","Ma#","Pa","Dha","Ni","Sa'\''"], "avaroha": ["Sa'\''","Ni","Dha","Pa","Ma#","Ga","Re","Sa"] }
  }'
```

**POST /api/ai/suggest — semantic raga suggestion:**
```bash
curl -X POST http://localhost:3000/api/ai/suggest \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "query": "peaceful morning raga" }'
```

**GET /api/journal — fetch practice logs:**
```bash
curl http://localhost:3000/api/journal \
  -H "Authorization: Bearer <TOKEN>"
```

**POST /api/journal — log a practice session:**
```bash
curl -X POST http://localhost:3000/api/journal \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "raga": "Bhairavi",
    "notes": "Focused on avaroha today, slow tempo with gamak.",
    "intensity": "Deep",
    "date": "2026-04-09"
  }'
```

**POST /api/export/midi — export a MIDI file:**
```bash
curl -X POST http://localhost:3000/api/export/midi \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "composition": {
      "name": "Yaman Session",
      "bpm": 100,
      "layers": [
        {
          "events": {
            "sequence": [
              { "frequency": 261.63, "duration": "4n" },
              { "frequency": 293.66, "duration": "4n" },
              { "frequency": 329.63, "duration": "2n" }
            ]
          }
        }
      ]
    }
  }' \
  --output yaman-session.mid
```

**GET /api/projects — list user projects:**
```bash
# Uses cookie auth — call from browser context or set cookie header
curl http://localhost:3000/api/projects \
  -H "Cookie: <supabase-session-cookie>"
```

**POST /api/projects — create a new project:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Cookie: <supabase-session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Morning Bhairav",
    "raga_id": "<raga-uuid>",
    "bpm": 80
  }'
```

**DELETE /api/projects — delete a project:**
```bash
curl -X DELETE "http://localhost:3000/api/projects?id=<project-uuid>" \
  -H "Cookie: <supabase-session-cookie>"
```

---

## 13. Product Roadmap — Musical Intelligence

This section records the output of the six-area musical intelligence analysis conducted in April 2026. Each area was analyzed across multiple approaches; this section documents only the **chosen approach and its staged implementation plan**. The full tradeoff analysis lives in JOURNAL.md.

The dependency graph across all six areas:

```
Raga Grammar Engine  ←  foundation for everything below
        │
        ├── Tala Layer
        │
        ├── Swara Data Model
        │         └── Ornament Synthesis Primitives
        │                     └── Auto Ornamentation
        │
        ├── Composition-Aware AI Chat
        │         └── Inline Phrase Validator → Phrase Generator
        │
        └── Session Tracking
                  └── Mastery Progression → Alankar Engine → Riyaz Companion
```

The single highest-leverage investment is the **Raga Grammar Engine**. Every other system either depends on it or is significantly stronger with it.

---

### 13.1 Raga-Aware Scale System

**Chosen approach: Layered Grammar (staged as A → D)**

The raga is modeled in four layers, implemented incrementally:

| Stage | Layer | What it adds |
|---|---|---|
| 1 (now) | Note metadata | Per-swara tags: `direction` (aroha/avaroha/both), `weight` (vadi/samvadi/normal), `nyasa` (boolean), `varjya` (boolean) |
| 2 | Phrase layer | Pakad and 2–3 chalan phrases stored per raga; surfaced as seed phrases in the studio |
| 3 | Transition constraints | Permitted swara-to-swara transitions encode movement grammar; validates phrase sequences |
| 4 | Probabilistic weighting | Transition rules become weighted distributions; used by AI suggestion sampling |

**Data model addition (Stage 1):**
```typescript
interface SwaraMetadata {
  name: string                          // 'Ga', 'komal Ga', etc.
  direction: 'aroha' | 'avaroha' | 'both'
  weight: 'vadi' | 'samvadi' | 'normal' | 'avoid'
  nyasa: boolean                        // valid resting point
  varjya: boolean                       // forbidden in this raga
  andolan?: { rate: number; depth: number }  // oscillation if required
}

interface RagaGrammar {
  swaras: SwaraMetadata[]
  pakad: string[]                       // canonical characteristic phrase
  chalan: string[][]                    // 2–3 movement phrases
  transitions?: Record<string, string[]>  // Stage 3
}
```

**Piano UI changes (Stage 1):**
- Vadi key: glows with primary color
- Samvadi key: secondary highlight
- Varjya key: dimmed, no interaction blocked (educational — shows why)
- Scale lock becomes direction-aware: ascending input checks aroha, descending checks avaroha

**Open decisions deferred to product owner:**
- Gharana variations: one canonical form per raga or multiple?
- Varjya treatment: hidden vs. greyed vs. warning?
- Ascending/descending inference: automatic (from note movement) or user-declared?
- Data validation: automated pipeline vs. human musicologist review?
- Hindustani-first or Carnatic parity from Stage 1?

---

### 13.2 Tala / Rhythm Engine

**Chosen approach: Tala Layer on Existing Sequencer (Approach D), with real-time Performance Mode deferred**

The linear sequencer is retained. A tala metadata layer is added on top.

**Tala data structure:**
```typescript
interface Tala {
  name: string           // 'Teentaal', 'Jhaptaal', 'Rupak', etc.
  matras: number         // total beat count
  vibhags: Vibhag[]      // divisions of the cycle
  samBeat: number        // 1-indexed position of sam (beat 1)
  laya: { vilambit: number; madhya: number; drut: number }  // BPM ranges
}

interface Vibhag {
  size: number           // matras in this division
  type: 'tali' | 'khali'  // clap or empty
  label: string          // traditional name or bol marker
}
```

**Common talas pre-loaded:**

| Tala | Matras | Vibhag structure | Khali |
|---|---|---|---|
| Teentaal | 16 | 4+4+4+4 | Beat 9 |
| Jhaptaal | 10 | 2+3+2+3 | Beat 6 |
| Rupak | 7 | 3+2+2 | Beat 1 (sam = khali) |
| Ektaal | 12 | 2+2+2+2+2+2 | Beats 3, 7 |
| Keherwa | 8 | 4+4 | Beat 5 |
| Dadra | 6 | 3+3 | Beat 4 |

**Sequencer grid changes:**
- Header row replaced: vibhag labels replace plain beat numbers
- Sam cell: distinct glow treatment
- Khali cell: muted / wave symbol
- Loop length: auto-set from tala matra count (supports non-power-of-2 lengths)
- BPM renamed to **Laya** with three named presets: Vilambit / Madhya / Drut

**Bol suggestion layer:** for rhythm tracks, suggest the standard theka bol sequence at vibhag boundaries (displayed as a guide, not forced).

**Deferred:** layakari subdivision view, circular tala canvas, real-time free-input performance mode (separate `/riyaz` surface).

**Open decisions deferred to product owner:**
- Tala scope: per-composition (classical) vs. per-track (allows polyrhythm)?
- Non-integer loop lengths: allow arbitrary matra counts or quantize?
- Carnatic tala system: parallel support from start or Hindustani-first?
- Theka bol sequences: curate per-tala or generate?
- Tala onboarding: interactive introduction or tooltips only?

---

### 13.3 Swara-Based Composition Interface

**Chosen approach: Multi-Modal Workspace (Approach D), staged as Swara Pad → Sargam Text → Alap Mode**

The underlying data model changes from raw frequencies to a swara sequence. All input modes write to the same model; all views are renderings of it.

**Unified swara event model:**
```typescript
interface SwaraEvent {
  swara: string           // 'Sa', 'Re', 'komal Ga', 'Ma tivra', etc.
  register: 'mandra' | 'madhya' | 'taar'
  duration: string        // Tone.js duration string: '4n', '8n', '2n', etc.
  ornament?: OrnamentHint // see section 13.4
  velocity: number        // 0–1
}
```

**Stage 1 — Swara Pad:**
- 7 large buttons: Sa Re Ga Ma Pa Dha Ni
- Modifier row: komal / tivra toggles (Re♭, Ga♭, Ma♯, Dha♭, Ni♭)
- Register shift: mandra / madhya / taar
- In sequencer mode: tap records into active step
- In sustain mode: hold plays continuously (used in alap)
- Replaces the piano as default input for melody tracks

**Stage 2 — Sargam Text Input:**
- Text field accepting canonical sargam notation
- Notation convention (to be decided): uppercase = shuddha, lowercase = komal, `m'` = tivra Ma, dot prefix = mandra, dot suffix = taar, `-` = held, `,` = quick grace
- Parser produces `SwaraEvent[]` injected into the composition
- Bidirectional: the swara sequence can also be exported as sargam text (feeds AI context directly)

**Stage 3 — Alap Mode:**
- Unmetered composition mode (no tala grid)
- User plays or types swaras freely; timing is recorded as-is
- Output is a melodic sketch; later quantizable to a tala
- Separate UI route or modal within `/studio`

**Deferred:** contour canvas input (potential future visualization layer, not primary input).

**Open decisions deferred to product owner:**
- Sa position: fixed (C4) or user-selectable per session?
- Sargam notation convention: adopt Bhatkhande / Paluskar standard or define custom?
- Duration encoding: how is note length expressed in text input?
- Piano keyboard: retained as third option or deprecated?
- Mobile-first priority for Swara Pad?

---

### 13.4 Ornament System

**Chosen approach: Layered Ornament Engine (Approach D) — Synthesis Primitives → Auto Ornamentation → User Annotation**

Ornaments are not decorations. In Indian classical music, a swara without its characteristic ornament in the correct raga context is musically incorrect. The ornament system is therefore not optional — it is core to musical accuracy.

**Seven ornament types supported:**

| Ornament | Description | Mechanism |
|---|---|---|
| Meend | Continuous pitch glide between two swaras | `frequency.rampTo()` with curve control |
| Andolan | Slow asymmetric oscillation on a single swara | LFO: ~1.5–3 Hz, dips below center pitch |
| Gamak | Rapid forceful alternation between adjacent swaras | Fast LFO or rapid alternating triggers |
| Kan Swara | Brief grace touch of adjacent swara before arrival | Short pre-trigger at adjacent frequency |
| Murki | Quick descending cluster landing on main swara | Rapid sequence of 3–5 short events |
| Khatka | Sharp percussive snap between adjacent pitches | Ultra-short alternation, amplitude spike |
| Sparsh / Pratyahat | Light ascending / descending approach touch | Directional variant of kan swara |

**Ornament data model:**
```typescript
interface OrnamentHint {
  type: 'meend' | 'andolan' | 'gamak' | 'kan' | 'murki' | 'khatka' | 'sparsh'
  from?: string        // for meend/kan: source swara
  speed?: number       // 0–1 normalized (slow to fast)
  depth?: number       // 0–1 normalized (shallow to deep)
  direction?: 'up' | 'down'  // for kan, sparsh, pratyahat
}
```

**Raga ornament binding (added to RagaGrammar):**
```typescript
interface RagaGrammar {
  // ... existing fields
  ornamentMap: {
    [swara: string]: {
      required?: OrnamentHint    // must be applied (e.g. andolan on komal Ga in Darbari)
      permitted?: OrnamentHint[] // valid but not mandatory
      forbidden?: string[]       // ornament types that are musically wrong here
    }
  }
}
```

**Stage 1 — Synthesis Primitives (no UI):**
Add four methods to `AudioEngine`:
- `playMeend(fromFreq, toFreq, duration, curve)` — configurable glide curve (not linear — classical meend is exponential)
- `playAndolan(freq, rate, depth, duration)` — asymmetric oscillation (dips below, not equally above)
- `playGamak(freq1, freq2, repetitions, speed)` — rapid alternation
- `playKan(mainFreq, kanFreq, direction)` — grace approach

**Stage 2 — Automatic Raga Ornamentation:**
- Studio gains a toggle: `Authentic Mode: On / Off`
- When on: every swara event checks the raga's `ornamentMap`; required ornaments render automatically
- The user hears what the raga actually sounds like for the first time
- High musical impact, zero additional UI burden

**Stage 3 — User Ornament Annotation:**
- In the composition interface, selecting a swara event opens an ornament panel
- User can apply, modify, or remove ornaments per note
- The raga grammar engine validates the annotation and warns if musically incorrect
- Stored as `OrnamentHint` on the `SwaraEvent`

**Deferred:** Carnatic kampita gamaka taxonomy (15 formal types) — modeled as a future extension of the ornament type system.

**Open decisions deferred to product owner:**
- Pitch glide implementation: `frequency.rampTo()` vs. `AudioParam.linearRampToValueAtTime` vs. `PitchShift` automation — latency / quality tradeoff?
- Andolan parameters: stored per-swara-per-raga in DB, or a small preset library (heavy/medium/light × slow/medium/fast)?
- Carnatic gamaka taxonomy: unified model or parallel Carnatic-specific layer?
- When auto-ornamentation is on, should the user see which ornaments were applied and why (teaching mode)?
- MIDI export: approximate with pitch bend data, or export raw swaras and document the limitation?

---

### 13.5 AI-Assisted Guidance

**Chosen approach: Three-layer system — Composition-Aware Chat → Inline Phrase Validator → Phrase Generator with Ghost Preview**

The current chat assistant is stateless and has no access to the composition. All three layers are built sequentially; each is independently valuable.

**Layer 1 — Composition-Aware Chat (immediate):**

Thread the full composition state into every AI prompt:
```typescript
interface AIContext {
  raga: { name: string; aroha: string[]; avaroha: string[]; vadi: string; samvadi: string; pakad: string[] }
  composition: {
    tracks: { type: string; sequence: SwaraEvent[] }[]
    bpm: number
    tala: string
    currentStep: number
  }
  studentProfile?: { stage: number; weaknesses: string[] }  // from Riyaz (section 13.6)
}
```

The system prompt instructs the model to reference specific swaras and phrases from the actual composition, not speak in generalities.

**Layer 2 — Inline Phrase Validator (after raga grammar engine):**

Continuous rule-based evaluation — no LLM required for the evaluation itself:

```
Validation checks per phrase:
  ✓ Each swara exists in the correct direction (aroha/avaroha)
  ✓ Varjya swaras are not used
  ✓ Phrase ending lands on a nyasa swara
  ✓ Vadi appears with appropriate frequency relative to phrase length
  ✓ Pakad or characteristic movement is present in the composition so far
  ✗ Warning: phrase ends on Ma (not a nyasa swara in Yaman — try Ga or Pa)
  ✗ Error: komal Re used in ascending phrase (varjya in ascending for this raga)
```

UI: color-coded steps on the sequencer grid (green / amber / red). Sidebar shows plain-language observations. LLM is called only to phrase the observation in natural language — low cost, low latency.

**Layer 3 — Phrase Suggestion with Ghost Preview:**

```
User clicks "Suggest Next Phrase"
  → Current composition state sent to LLM
  → LLM returns: SwaraEvent[] (structured output, not prose)
  → Grammar validator filters candidates: only musically valid suggestions surface
  → Valid suggestion rendered as ghost overlay on sequencer grid
  → User: Accept (one click) | Modify | Dismiss
```

The LLM generates; the grammar engine validates; only valid output reaches the user. This guard layer is mandatory — AI hallucination in musical guidance causes direct harm to learners.

**Critical rule:** the AI guidance system must never present a musically incorrect suggestion with confidence. Grammar validation is not optional.

**Deferred:** Guru Mode (structured raga curriculum delivered as a product surface — scoped as "Saptaswara Learn", not a feature within the studio).

**Open decisions deferred to product owner:**
- Grammar engine dependency: is there willingness to build it before returning to the AI layer?
- Pedagogical voice and tone: who defines the assistant's voice (precise, respectful of tradition)?
- Hallucination guard: grammar engine + human spot-check, or grammar engine only?
- Offline capability: should Layer 2 (rule-based) run fully client-side?
- Competitive positioning: protect the raga grammar data as proprietary, or open-source it?

---

### 13.6 Practice Intelligence — Saptaswara Riyaz

**Chosen approach: Dedicated `/riyaz` surface with four sequential stages**

Practice mode is a **separate product surface**, not a feature added to the studio. A student in riyaz mode needs a clean, focused, guidance-driven environment — not the full composition studio. The two modes serve fundamentally different user states.

**Route:** `/riyaz` — its own layout, separate from `/studio`

**Stage 1 — Session Tracking:**

Connect studio activity to the journal automatically:
```typescript
interface PracticeSession {
  userId: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  ragasExplored: string[]        // raga IDs active during session
  bpmRange: [number, number]
  notesPlayed: number
  tracksUsed: string[]           // track types active
}
```
- Journal entry auto-populated with session data as a starting point
- Practice calendar view: heatmap of consistency (which days, how long, which ragas)
- This stage has no AI dependency and ships immediately

**Stage 2 — Raga Mastery Progression:**

Seven-stage model per raga, aligned to traditional pedagogy:

| Stage | Name | Goal | Evaluation method |
|---|---|---|---|
| 1 | Aroha / Avaroha | Play the scale ascending and descending correctly | Grammar: correct swaras, correct direction |
| 2 | Pakad | Reproduce the characteristic phrase | Phrase match against stored pakad |
| 3 | Alankars | Complete 3 standard exercises in the raga | Sequence correctness + timing accuracy |
| 4 | Mandra elaboration | Compose a 4-matra phrase in lower register ending on nyasa | Grammar + register validation |
| 5 | Vadi focus | Compose a phrase that correctly emphasizes the vadi | Vadi frequency analysis |
| 6 | Bandish | Learn and reproduce a simple fixed composition | Sequence match |
| 7 | Free improvisation | Compose an 8-matra original phrase evaluated by AI | Grammar engine + LLM evaluation |

Initial raga scope: **Yaman, Bhairav, Bhairavi, Kafi, Khamaj** — five entry-level ragas with well-documented grammar.

**Stage 3 — Alankar Practice Engine:**

```
Alankar formula example: 1-2-3 | 2-3-4 | 3-4-5 | 4-5-6 | 5-6-7
Mapped to Yaman: S-R-G | R-G-M' | G-M'-P | M'-P-D | P-D-N
```

- System plays the reference phrase (call)
- User responds on the swara pad or sargam text input
- Evaluated for: correct swara sequence, correct register, timing accuracy within the tala
- Speed progression: vilambit → madhya → drut within the same session
- Audio input layered on later (out of scope for MVP — evaluates via swara pad input initially)

**Stage 4 — Intelligent Riyaz Companion:**

Cross-session behavioral intelligence, using Stage 1–3 data as its memory:

```
Session start:
  "You last practiced Yaman 3 days ago. You are at Stage 4.
   Today: 5 min Sa establishment, 10 min aroha/avaroha at madhya laya,
   8 min pakad variations. Total: 23 min."

During session:
  "You've played this phrase 6 times. Your komal Ga is consistently
   sharp in the descending direction. Try slowing to vilambit."

Session end (auto-populated journal):
  "45 min — Yaman — Stage 4. Ascending phrases: accurate.
   Descending komal Ga: needs attention. Vadi emphasis: good.
   Suggested focus for next session: avaroha from Pa to Sa."
```

LLM generates observations grounded in measured session data — not generic encouragement. Specificity requires the data foundation from Stages 1–3.

**Open decisions deferred to product owner:**
- Audio input: first-class capability or explicit non-goal?
- Initial raga scope: 5 ragas acceptable for MVP launch of `/riyaz`?
- Assessment philosophy: rule-based only, LLM-evaluated, or human spot-check for Stage 7?
- Cross-session data: retention policy, user ownership, exportability?
- Relationship to traditional teaching: engagement strategy with the guru community?
