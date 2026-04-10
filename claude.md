# CLAUDE.md

## Project: Saptaswara
Full-stack Indian classical music studio. Next.js 14 monorepo.

## Critical File Map
| Feature | Read these first |
|---|---|
| Audio (BPM/Drone/Volume) | apps/web/lib/audio.ts |
| Studio UI | apps/web/app/studio/page.tsx |
| Piano/Harmonium | apps/web/components/Piano.tsx |
| Drum pads | apps/web/components/DrumPad.tsx |
| AI suggestions | apps/web/app/api/ai/suggest/route.ts |
| AI chat | apps/web/app/api/ai/chat/route.ts |
| DB schema | supabase/migrations/ (all files) |
| Auth | apps/web/app/api/auth/ + middleware.ts |
| Journal | apps/web/app/journal/page.tsx |
| Raga engine | packages/core/src/ragaEngine.ts |

## Known Dead Ends — wire, don't rewrite
- toggleDrone() EXISTS in audio.ts
- BPM via Tone.Transport EXISTS — needs UI only
- Volume via Tone.Destination.volume EXISTS — needs UI only
- Supabase client EXISTS in lib/supabase.ts

## Session Rules
1. Read the relevant files from the file map before writing any code
2. Scope each session to ONE task only
3. Confirm migration files exist before writing schema changes
4. State which dead end each edit closes