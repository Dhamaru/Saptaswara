# Saptaswara

## What is Saptaswara
A raga-guided music creation platform where users create compositions using a virtual keyboard, drum pad, and voice recorder — all guided by the structure of Indian classical ragas.

## Project structure
- `tools/`: Data collection, structuring, validation, and RAG builder utilities.
- `packages/core/`: Shared raga engine, audio interfaces, and state stores.
- `backend/supabase/`: Database migrations, schema, and seed scripts.
- `apps/web/`: Next.js 14 web application for music creation.
- `apps/mobile/`: Expo SDK 51 mobile application for on-the-go creation.

## Build order
- Phase 1: Data collection and catalogue structuring.
- Phase 2: Core raga engine and audio interface development.
- Phase 3: Supabase backend and authentication setup.
- Phase 4: Web application workspace and raga browser.
- Phase 5: Mobile application development and feature parity.

## Getting started
1. Clone the repository.
2. Copy `.env.example` to `.env`.
3. Fill in the required API keys.
