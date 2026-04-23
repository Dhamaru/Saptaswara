# Saptaswara — Neural Resonance Studio

## What is Saptaswara?
Saptaswara is a next-generation raga-guided music creation platform. It allows users to compose, practice, and explore Indian classical ragas using high-fidelity virtual instruments, an intelligent percussion engine, and a RAG-powered AI assistant.

## Core Features
- **Neural Studio**: A multi-track sequencer with scale-locking enforced by raga grammar.
- **Authentic Synthesis**: Physical modeling of Hindustani (Sitar, Sarangi) and Carnatic (Veena, Bansuri) instruments.
- **Global Assistant**: A context-aware AI floating widget that travels with you across the platform.
- **Raga Library**: Semantic search for 120+ verified ragas with mood and prahar (time) metadata.
- **Studio Percussion**: Specialized Tabla and Mridangam pads with authentic stroke synthesis.

## Project Structure
- `tools/`: Data pipeline (Scraper, Structurer, Validator, RAG Builder).
- `packages/core/`: Shared raga logic, types, and detection engine.
- `backend/supabase/`: SQL migrations and RLS security model.
- `apps/web/`: **Next.js 16** web application (App Router, Proxy networking).
- `apps/mobile/`: Expo SDK 51 mobile application scaffold.
- `.github/workflows/ci.yml`: GitHub Actions CI/CD pipeline.

## Technology Stack
- **Frontend**: Next.js 16.2.4, React, Tailwind CSS, Tone.js.
- **Backend/Auth**: Supabase (PostgreSQL + pgvector), RLS hardened.
- **AI**: Gemini 2.0 Flash (Streaming Chat + Embeddings), NVIDIA NIM (Llama 3.3 70B fallback on quota).
- **Rate Limiting**: Upstash Redis (distributed sliding window), in-memory fallback for local dev.
- **Error Tracking**: Sentry (production only, 20% trace sampling).
- **CI/CD**: GitHub Actions — typecheck → lint → build → Vercel deploy on main.

## Build Order
- [x] **Phase 1**: Data collection and deterministic catalogue structuring.
- [x] **Phase 2**: Core raga engine and high-fidelity audio interfaces.
- [x] **Phase 3**: Supabase backend integration and RLS security.
- [x] **Phase 4**: Web workspace, Raga browser, and Studio stabilization.
- [/] **Phase 5**: Mobile parity and performance optimization (Current).

## Getting Started
1. Clone the repository.
2. Initialize workspaces: `npm install`.
3. Copy `.env.example` to `apps/web/.env.local` and fill in all keys.
4. Run development server: `npm run dev`.

## Required Environment Variables
See `apps/web/.env.local` — required keys:
- `GEMINI_API_KEY` — Google AI Studio
- `NVIDIA_API_KEY` — NVIDIA NIM (Gemini quota fallback)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — distributed rate limiting
- `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_ORG` + `SENTRY_PROJECT` + `SENTRY_AUTH_TOKEN` — error tracking
