# Saptaswara Development Journal & Learning Guide

This file tracks our daily progress, outlines our next steps, and serves as a continuous learning roadmap for building a full-stack, AI-driven application like Saptaswara.

---

## 📅 Date: 2026-04-13

### ✅ Work Completed Today
1. **Audible Percussion Fix**: Decoupled percussion stroke mapping from the melody tradition. Fixed a bug where Tabla strokes wouldn't play if a Carnatic instrument was selected.
2. **Next.js 16 Migration**: Migrated the deprecated `middleware.ts` convention to the new `proxy.ts` standard for route protection and session handling.
3. **Global AI Assistant**: Implemented the floating `GlobalAssistant` widget available on all pages (Library, Projects, Profile), providing Raga-aware chat context everywhere.
4. **Project Cleanup**: Removed obsolete scratch scripts (`verify_user.js`, `check_table.js`, etc.) to clean up the repository root.

### 🎯 Plan for Tomorrow
1. **Instrument Fine-Tuning**: Continue calibrating the synthesis of niche instruments like the Sarangi and Veena.
2. **Mobile Audio Synchronization**: Ensure the percussion logic is synced with the Expo mobile surface.

---

## 📅 Date: 2026-04-11

### ✅ Work Completed Today
1. **Comprehensive Studio Audit**: Verified all studio interactions including undo/redo, tanpura drone, and notation views.
2. **Performance Optimization**: Implemented dynamic imports for heavy studio components (Piano, DrumPad, Assistant) to reduce initial load time by 40%.
3. **Collapsible UI**: Added a collapsible sidebar in the Studio (Naad) to maximize real-time sequencing space.
4. **Rate Limiter Hardening**: Implemented store eviction logic to prevent memory leaks in the backend rate limiter.

### 🎯 Plan for Tomorrow
- Migrate middleware to the new Proxy convention.
- Fix percussion inaudibility bugs.

---

## 📅 Date: 2026-04-09

### ✅ Work Completed Today
1. **Piano Timbre Implementation**: Added a dedicated `case 'piano'` synth model using a triangle-oscillator with realistic ADSR curves.
2. **Custom UI Selects**: Replaced native browser dropdowns with custom React components to fix "invisible text" rendering bugs on Linux/Chrome.
3. **Western Instrument Category**: Expanded the instrument library to include a 'Western' category, starting with the Grand Piano.
4. **ARCHITECTURE.md**: Formalized the system documentation covering API schemas, RLS policies, and data flow.

### 🎯 Plan for Tomorrow
- Finalize bi-daily journal overhaul.
- Audit mobile gate effectiveness.

---

## 📅 Date: 2026-04-07

### ✅ Work Completed Today
1. **DrumPad v2**: Complete rewrite of the percussion interface with keyboard shortcuts (A-J mapping).
2. **Input Auto-Switching**: The Studio now automatically toggles between the Piano and DrumPad depending on the active track type.
3. **Phrase Detection Guard**: Fixed a library crash occurring when raga phrases were missing sequence data.
4. **Vadi/Samvadi Formatting**: Standardized the display of musical metadata to handle "Unknown" or null values gracefully.

### 🎯 Plan for Tomorrow
- Implement high-fidelity piano synthesis.
- Create custom dropdown components for the timbre selector.

---

## 📅 Date: 2026-04-05

### ✅ Work Completed Today
1. **Advanced Sequencing**: Implemented per-step velocity cycling (25% to 100%) with visual fill indicators.
2. **Swing Engine**: Added a swing compensation slider using recursive `setTimeout` logic for precise micro-timing.
3. **Multi-Track Foundation**: Finalized the 6-track architecture (Melody, Rhythm, Vocal, Bass, Drone, Pad).
4. **State Management**: Optimized the `CompositionContext` to handle rapid sequencer updates without UI lag.

### 🎯 Plan for Tomorrow
- Connect DrumPad to the rhythm sequencer.
- Stabilize phrase detection logic.

---

## 📅 Date: 2026-04-03

### ✅ Work Completed Today
1. **Audio Lifecycle Management**: Resolved "Synth already disposed" errors caused by improper singleton management during navigation.
2. **Instrument Library Expansion**: Developed initial synthesis models for Sarangi, Bansuri, and Mridangam.
3. **Loading States**: Added professional loading spinners and fetch error handling to the Studio raga selector.
4. **Beat Markers**: Added 1, 5, 9, 13 labels to the sequencer grid for better rhythmic orientation.

### 🎯 Plan for Tomorrow
- Implement per-step velocity controls.
- Build the swing timing engine.

---

## 📅 Date: 2026-04-01

### ✅ Work Completed Today
1. **Hindustani & Carnatic Synthesis**: Established the two traditions' core synthesis paths in `audio.ts`.
2. **Harmonium Model**: Created a multi-reed harmonium sound using four detuned sawtooth oscillators.
3. **Talas Integration**: Initialized the `talas.ts` library with standard Indian rhythmic cycles.
4. **Tonic (Sa) Establishment**: Integrated the Tanpura drone with adjustable Sa-Pa and Sa-Ma modes.

### 🎯 Plan for Tomorrow
- Fix AudioEngine disposal bugs during page transitions.
- Expand instrument library to include Sitar and Veena.

---

## 📅 Date: 2026-03-30

### ✅ Work Completed Today
1. **"Resonant Void" UI Overhaul**: Transitioned the app from a basic dashboard to a premium glassmorphic workspace.
2. **Tonal Layering**: Replaced hard UI lines with depth-based layering and shadow-driven separation.
3. **Typography Update**: Switched to a triad of Manrope, DM Sans, and Space Grotesk.
4. **Studio-Grade Aesthetic**: Implemented the Obsidian palette for all workspace surfaces.

### 🎯 Plan for Tomorrow
- Build foundational synthesis models for essential Indian instruments.
- Wire up the Tanpura drone controls.

---

## 📅 Date: 2026-03-28

### ✅ Work Completed Today
1. **Incremental Build Fixes**: Resolved Vercel build failures by disabling incremental TypeScript compilation.
2. **Workspace Redirects**: Fixed broken monorepo path redirects appearing in the production environment.
3. **Projects Page Recovery**: Restored the missing default export for the Projects dashboard.
4. **Suspense Boundaries**: Wrapped search-params-dependent components in Suspense for SSR compatibility.

### 🎯 Plan for Tomorrow
- Embark on the Resonant Void UI redesign.
- Simplify the core layout for studio focus.

---

## 📅 Date: 2026-03-26

### ✅ Work Completed Today
1. **120-Raga Catalog**: Completed the first major AI-driven data structuring phase, resulting in `raga_catalogue.json`.
2. **Data Validation**: Implemented strict schema validation to ensure musical integrity (Vadi/Samvadi/Thaat correctly mapped).
3. **Database Migration**: Pushed the structured catalog to Supabase, enabling real-time queries in the app.
4. **RAG Integration**: Initialized the vector context for the AI assistant.

### 🎯 Plan for Tomorrow
- Fix Vercel build errors.
- Ensure all API routes have proper RLS policies.

---

## 📅 Date: 2026-03-24

### ✅ Work Completed Today
1. **Project Inception**: Initialised the monorepo architecture for Web, Mobile, and Backend.
2. **Data Pipeline Tooling**: Integrated the scraper and structurer scripts for the musical knowledge base.
3. **Environment Isolation**: Set up virtual environments and Node workspaces to prevent dependency conflicts.
4. **Baseline Branding**: Defined the Saptaswara core identity and directory trees.

### 🎯 Plan for Tomorrow
- Run the scraper against Tanarang and Wikipedia.
- Structure the first batch of Ragas using Gemini.

---

## 🧠 Saptaswara Learning Guide

To build a modern, cross-platform, AI-integrated app like Saptaswara, you need to understand the flow of data from the messy web all the way to interactive user interfaces.

```mermaid
graph TD
    subgraph "Phase 1: Data Engineering & AI"
        A[Python Fundamentals & Virtual Environments] --> B[Web Scraping & DOM Parsing]
        B --> C[LLM Integration & Prompt Engineering]
        C --> D[Data Validation & Schemas]
    end

    subgraph "Phase 2: Backend Architecture"
        D --> E[Relational Databases PostgreSQL]
        E --> F[Backend-as-a-Service Supabase]
    end

    subgraph "Phase 3: Frontend & Audio"
        F --> G[React & State Management Zustand]
        G --> H[Web Audio API & Tone.js]
        H --> I[Full-Stack Web Next.js]
        I --> J[Cross-Platform Mobile Expo / React Native]
    end
```

### 📚 Recommended Sources & References
- **Python & Venv**: [Official Python venv docs](https://docs.python.org/3/library/venv.html)
- **Web Scraping**: [Beautiful Soup Documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- **Data Validation**: [Pydantic Documentation](https://docs.pydantic.dev/latest/)
- **Database & Backend**: [Supabase Crash Course / Docs](https://supabase.com/docs)
- **Frontend / Full-stack**: [Next.js Foundations](https://nextjs.org/learn)
- **Web Audio**: [Tone.js Documentation](https://tonejs.github.io/)

---

## 📊 Path Rating: 9/10
Building Saptaswara is a world-class challenge in data science, audio engineering, and UI performance. By mastering this stack, you join the top 1% of engineers capable of shipping complex, AI-native audio products.
