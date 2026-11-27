# ADR 0001 — Additive learning-loop data and deterministic diagnosis

## Decision

Add three new owner-scoped Supabase tables (`practice_sessions`, `user_raga_progress`, `user_lesson_progress`) and keep the existing `practice_logs` API and human-readable journal string unchanged. Structured practice data is written as a side-car from `/riyaz`; diagnosis is computed by a pure deterministic module in `@saptaswara/core`, not by an LLM call. A staged `/learn` hub presents curriculum cards that link to the existing studio/library/riyaz/journal surfaces and persists lesson completion through a small API route.

## Reason

The current loop stores only unstructured journal notes and computes feedback in the browser. That prevents per-raga progress, repeated feedback, and reliable curriculum state. Production has already shown schema drift, so new tables must be additive and every new reader must degrade safely when they are absent. Deterministic diagnosis keeps the first learning loop fast, free, and testable.

## Alternatives considered

1. **Extend `practice_logs` with structured columns.** Rejected: journal routes and UI depend on its current shape, and production drift makes in-place alteration riskier.
2. **Write to `conformance_scores`.** Rejected: that table is layer/project scoped, absent in production, and its RLS assumes a `layer_id`; it is not a practice-session model.
3. **LLM-generated feedback.** Rejected for this sprint: slow, costly, non-deterministic, and harder to test than rule-based grammar diagnosis.

## Trade-offs

- Two writes occur after a saved riyaz session: the existing journal write plus the new structured session write. The journal write remains authoritative for the user-visible journal.
- `user_raga_progress` is updated by read-then-upsert. At this product scale that is acceptable; a future atomic RPC can replace it if concurrent writes become meaningful.
- Mastery is a simple derived label from best score (Exploring / Developing / Proficient / Strong), while session count is tracked separately. It is not an authoritative exam or assessment result.

## Future impact

Later sprints can add rule-based stage gates, richer attempt schema, teacher review, and strict assessment without migrating the journal table. If high-volume concurrent practice appears, replace the progress upsert with a database RPC.
