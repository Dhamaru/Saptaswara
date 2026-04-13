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

## Technology Stack
- **Frontend**: Next.js 16, React, Tailwind CSS, Tone.js.
- **Backend/Auth**: Supabase (PostgreSQL + pgvector).
- **AI**: Gemini Pro (Streaming Chat), Gemini Embedding (Semantic Retrieval).
- **Networking**: Next.js 16 Proxy standard for secure session routing.

## Build Order
- [x] **Phase 1**: Data collection and deterministic catalogue structuring.
- [x] **Phase 2**: Core raga engine and high-fidelity audio interfaces.
- [x] **Phase 3**: Supabase backend integration and RLS security.
- [x] **Phase 4**: Web workspace, Raga browser, and Studio stabilization.
- [/] **Phase 5**: Mobile parity and performance optimization (Current).

## Getting Started
1. Clone the repository.
2. Initialize workspaces: `npm install`.
3. Copy `.env.example` to `apps/web/.env.local`.
4. Run development server: `npm run dev`.
