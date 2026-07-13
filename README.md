# Saptaswara — Raga-Guided Music Studio

## What is Saptaswara?
Saptaswara is a raga-guided Indian classical music creation platform. Compose, practice, and explore ragas using high-fidelity virtual instruments, an intelligent percussion engine, and an AI assistant grounded in raga theory.

## Core Features
- **Studio**: Multi-track sequencer with scale-locking enforced by raga grammar. Immersive mode with keyboard side panels showing Aroha/Avaroha + QWERTY key labels.
- **Authentic Synthesis**: Physical modeling of Hindustani (Sitar, Harmonium, Sarangi) and Carnatic (Veena, Bansuri) instruments. Mastering chain: EQ3 → Limiter → destination.
- **Raga Library**: 120+ verified ragas with semantic search, unique visual identity per card (deterministic hue-rotate + color tint), and mood/prahar metadata.
- **AI Assistant**: Context-aware floating chat panel powered by Gemini 2.0 Flash (streaming SSE), with NVIDIA NIM fallback on quota. Grounded in the active raga's aroha, avaroha, vadi, samvadi, and pakads.
- **Practice Journal**: Log practice sessions (raga, notes, intensity, date) with history.
- **Auth**: Email + Google OAuth. Remember Me checkbox persists email in localStorage.
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
- **AI**: Gemini 2.0 Flash (streaming chat + RAG embeddings), NVIDIA NIM Llama 3.3 70B (quota fallback)
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
NVIDIA_API_KEY=<nvidia-nim-key>                # Gemini quota fallback
UPSTASH_REDIS_REST_URL=<url>                   # distributed rate limiting
UPSTASH_REDIS_REST_TOKEN=<token>
NEXT_PUBLIC_SENTRY_DSN=<dsn>                   # error tracking
SENTRY_ORG=<org>
SENTRY_PROJECT=<project>
SENTRY_AUTH_TOKEN=<token>
```

## Build Phases
- [x] **Phase 1**: 120-raga catalog — AI-driven data structuring + pgvector embeddings
- [x] **Phase 2**: Core raga engine + high-fidelity audio synthesis (Tone.js)
- [x] **Phase 3**: Supabase backend, RLS security, auth flows
- [x] **Phase 4**: Studio UI, Library, Journal, AI chat, mastering chain
- [x] **Phase 5**: Light/dark theme, unique card visuals, immersive mode, Remember Me
- [ ] **Phase 6**: Ornament synthesis, Raga Grammar Engine, `/riyaz` practice surface
