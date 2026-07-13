# CLAUDE.md

## Project: Saptaswara
Full-stack Indian classical music studio. Next.js 16 monorepo.

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
| Auth + proxy | apps/web/app/api/auth/ + proxy.ts |
| Journal | apps/web/app/journal/page.tsx |
| Raga engine | packages/core/src/ragaEngine.ts |
| Raga card visuals | apps/web/components/RagaCard.tsx |
| Login + Remember Me | apps/web/app/login/page.tsx |

## Known Dead Ends — wire, don't rewrite
- `toggleDrone()` EXISTS in audio.ts
- BPM via `Tone.Transport` EXISTS — needs UI only
- Volume via `Tone.Destination.volume` EXISTS — needs UI only
- Supabase client EXISTS in lib/supabase.ts
- Mastering chain EXISTS: `masterOutput.chain(masterEQ, limiter, Tone.getDestination())` — do NOT call `masterOutput.toDestination()`
- QWERTY → Swara map EXISTS in Piano.tsx as `KEY_MAP` — studio mirrors it as `SWARA_KEY_LABELS`
- Remember Me EXISTS in login/page.tsx via `localStorage` key `saptaswara-remember-email`

## Session Rules
1. Read the relevant files from the file map before writing any code
2. Scope each session to ONE task only
3. Confirm migration files exist before writing schema changes
4. State which dead end each edit closes
5. RagaCard text must always be `text-white/*` — dark scrim overlay makes this correct in both themes
6. Never call `masterOutput.toDestination()` — breaks mastering chain
