# Saptaswara — Raga-Guided Music Studio

Live app: **https://saptaswara-web.vercel.app** · 12 registered users on Supabase free tier

## What is Saptaswara?
Saptaswara is a raga-guided Indian classical music creation platform. Compose, practice, and explore ragas using high-fidelity virtual instruments, an intelligent percussion engine, and an AI assistant grounded in raga theory.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/studio` | Multi-track sequencer, Piano/Harmonium, DrumPad, AI assistant, MIDI export |
| `/library` | 120+ raga cards with mood/swara filters, audio preview, sort, compare, load-more |
| `/riyaz` | Grammar-aware swara practice — vadi/samvadi/varjya encoding, gamaka, mic pitch detection |
| `/journal` | Practice session log, AI "Inspire me" prompt, monthly heatmap, streak badge |
| `/profile` | Practice streak computed from `practice_logs` |
| `/import` | Detect-raga from audio (AI-powered) |
| `/explore/mood` | Browse ragas filtered by mood |
| `/login` | Email + Google OAuth + magic link. Remember Me persists email in localStorage. |
| `/signup` | Signup form |

## Core Features
- **Studio**: Multi-track sequencer with raga scale-lock, ConformanceScore wired, MIDI export via `midi-writer-js`, WAV/WEBM recording toggle, undo/redo, pitch bend wheel, tala visualizer, ornament Authentic Mode.
- **Riyaz**: Grammar-aware swara practice with vadi (amber) / samvadi (sky) / varjya (dimmed) encoding, mic-based pitch detection, meend + andolan gamaka, gamaka history log, session stats overlay, record + playback.
- **Authentic Synthesis**: Physical modeling of Hindustani (Sitar, Harmonium, Sarangi) and Carnatic (Veena, Bansuri) instruments. Mastering chain: `masterOutput → EQ3 → Limiter → Tone.getDestination()`.
- **Raga Library**: 120+ verified ragas with semantic search, mood filter chips, swara filter chips, sort, load-more pagination, audio preview, compare panel, same-thaat panel.
- **AI Assistant**: Triple fallback — Gemini 2.0 Flash → Groq llama-3.3-70b → NVIDIA NIM llama-3.3-70b. Context-aware streaming SSE grounded in active raga grammar. Learn mode, typing indicator.
- **Practice Journal**: AI "Inspire me" writing prompt, monthly heatmap, streak counter, AI session tip after logging.
- **Auth**: Email + Google OAuth + magic link. Route protection via `middleware.ts`. Remember Me persists email in localStorage.
- **Theme**: Full dark + light mode. All surfaces, cards, and text adapt correctly to both.

## Project Structure
```
Saptaswara/
├── apps/web/          # Next.js 16 web application (App Router)
├── packages/core/     # Shared raga engine, types, frequency math
└── supabase/          # SQL migrations + RLS policies
```

## Technology Stack
- **Frontend**: Next.js 16.2.4, React 19, Tailwind CSS, Tone.js
- **Backend/Auth**: Supabase (PostgreSQL + pgvector), RLS hardened
- **AI**: Gemini 2.0 Flash (primary) → Groq llama-3.3-70b → NVIDIA NIM llama-3.3-70b (triple fallback); `gemini-embedding-001` for RAG
- **Rate Limiting**: Upstash Redis sliding window; in-memory fallback for local dev
- **Error Tracking**: Sentry (production only, 20% trace sampling)
- **CI/CD**: GitHub Actions — typecheck → lint → build → Vercel deploy on main

## Getting Started
1. Clone the repository.
2. `npm install` (installs all workspaces).
3. Copy the env template to `apps/web/.env.local` and fill in keys (see below).
4. `npm run dev --workspace=apps/web`

## Required Environment Variables (`apps/web/.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only, never expose
GEMINI_API_KEY=<google-ai-studio-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional (production):
```bash
GROQ_API_KEY=<groq-key>                        # second AI fallback
NVIDIA_API_KEY=<nvidia-nim-key>                # third AI fallback
UPSTASH_REDIS_REST_URL=<url>                   # distributed rate limiting
UPSTASH_REDIS_REST_TOKEN=<token>
NEXT_PUBLIC_SENTRY_DSN=<dsn>                   # error tracking
SENTRY_ORG=<org>
SENTRY_PROJECT=<project>
SENTRY_AUTH_TOKEN=<token>
```

## Shipped Phases
- [x] **Phase 1**: 120-raga catalog — AI-driven data structuring + pgvector embeddings
- [x] **Phase 2**: Core raga engine + high-fidelity audio synthesis (Tone.js)
- [x] **Phase 3**: Supabase backend, RLS security, auth flows
- [x] **Phase 4**: Studio UI, Library, Journal, AI chat, mastering chain
- [x] **Phase 5**: Light/dark theme, unique card visuals, immersive mode, Remember Me
- [x] **Phase 6**: Raga Grammar Engine, `/riyaz` practice surface, triple AI fallback, MIDI export, profile, import, mood explorer, magic link auth, DB migrations (user_preferences, conformance_scores, modern_moods, starter_raga, grammar seed)
