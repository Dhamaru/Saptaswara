# CLAUDE.md

## Project: Saptaswara
Full-stack Indian classical music studio. Next.js 16 monorepo.
Production: https://saptaswara-web.vercel.app | DB: fkyclveotjjvbaisfvjt.supabase.co

## Critical File Map
| Feature | Read these first |
|---|---|
| Audio (BPM/Drone/Volume/Mastering) | apps/web/lib/audio.ts |
| Studio UI + Immersive mode | apps/web/app/studio/page.tsx |
| Piano/Harmonium + QWERTY map | apps/web/components/Piano.tsx |
| Drum pads | apps/web/components/DrumPad.tsx |
| AI suggestions | apps/web/app/api/ai/suggest/route.ts |
| AI chat | apps/web/app/api/ai/chat/route.ts |
| DB schema | supabase/migrations/ (all files) |
| Auth + proxy | apps/web/lib/supabase/middleware.ts + proxy.ts |
| Route protection | apps/web/lib/supabase/middleware.ts → protectedRoutes array |
| Journal | apps/web/app/journal/page.tsx |
| Raga engine | packages/core/src/ragaEngine.ts |
| Raga card visuals | apps/web/components/RagaCard.tsx |
| Login + Remember Me | apps/web/app/login/page.tsx |
| Save/restore flow | apps/web/app/studio/page.tsx + apps/web/app/api/projects/route.ts |
| Composition draft | apps/web/context/CompositionContext.tsx |

## Known Dead Ends — wire, don't rewrite
- `toggleDrone()` EXISTS in audio.ts
- BPM via `Tone.Transport` EXISTS — needs UI only
- Volume via `Tone.Destination.volume` EXISTS — needs UI only
- Supabase client EXISTS in lib/supabase.ts
- Mastering chain EXISTS: `masterOutput.chain(masterEQ, limiter, Tone.getDestination())` — do NOT call `masterOutput.toDestination()`
- QWERTY → Swara map EXISTS in Piano.tsx as `KEY_MAP` — studio mirrors it as `SWARA_KEY_LABELS`
- Remember Me EXISTS in login/page.tsx via `localStorage` key `saptaswara-remember-email`
- Sequencer tip EXISTS: `localStorage` key `saptaswara-seq-tip-done` — set to `'1'` on dismiss
- Save status EXISTS: `saveStatus` state (`idle|saving|saved|error`) + `lastSavedAt` Date — drive save button UI
- Project restore EXISTS: studio init() fetches `GET /api/projects?id=UUID` when `?project_id=` in URL

## Architecture Notes
- `middleware.ts` DELETED — Next.js 16 uses `proxy.ts` only. Never recreate middleware.ts.
- `proxy.ts` runs `updateSession()` on every non-static request (session refresh + route protection)
- Protected routes list lives in `apps/web/lib/supabase/middleware.ts` → `protectedRoutes` array
  - Current: `/studio`, `/dashboard`, `/journal`, `/workspace`, `/projects`, `/import`, `/profile`
- BPM IS persisted on save (fixed 2026-07-13) — sent in POST body, written to `projects.bpm`
- Only melody track saved to DB — rhythm/vocal/bass/pad tracks are ephemeral by design
- `GET /api/projects?id=UUID` returns `{ project, layers }` — used by studio restore on load
- `CompositionContext` async getUser uses cancelled flag to avoid unmounted-state update

## AI Routes
- `suggest`: Gemini only (no fallback) — uses `SUPABASE_SERVICE_ROLE_KEY` for vector search
- `chat`, `mood`, `generate`, `beat-suggest`: Gemini → Groq → NVIDIA fallback chain
- NVIDIA model: `meta/llama-3.3-70b-instruct` via `https://integrate.api.nvidia.com/v1`
- All routes require `Authorization: Bearer <token>` — cookie auth not accepted

## Session Rules
1. Read the relevant files from the file map before writing any code
2. Scope each session to ONE task only
3. Confirm migration files exist before writing schema changes
4. State which dead end each edit closes
5. RagaCard text must always be `text-white/*` — dark scrim overlay makes this correct in both themes
6. Never call `masterOutput.toDestination()` — breaks mastering chain
7. Never recreate `middleware.ts` — conflicts with `proxy.ts`, crashes Next.js 16 build
8. New protected routes → add to `protectedRoutes` array in `lib/supabase/middleware.ts`
