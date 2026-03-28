# Design System: The Resonant Void
**Project ID:** 11357440373779983860

## 1. Visual Theme & Atmosphere
The aesthetic blends the technical coldness of a professional recording studio with the soulful, atmospheric depth of Indian classical music. It prioritizes **Atmospheric Precision**, where silence (the void) is as important as resonance.

### Creative North Star
- **Intentional Asymmetry**: Breaking rigid grids for natural movement.
- **High-Contrast Scales**: Large display headers vs. tiny mono-spaced metadata.
- **Tonal Depth**: Layered obsidian space with physical "recessed" logic.

## 2. Color Palette & Roles
The system uses MD3-inspired tokens for a high-end dark studio mode.

| Name | Hex | Functional Role |
| :--- | :--- | :--- |
| **Obsidian Base** | `#0e0e10` | `surface-container-lowest` — Main background. |
| **Void Indigo** | `#131315` | `surface` — Default workspace background. |
| **Studio Primary** | `#c3c0ff` | `primary` — Main actions, active notes, highlights. |
| **Deep Resonance** | `#4338ca` | `primary-container` — Selection backgrounds, heavy buttons. |
| **Teal Stroke** | `#84d6b9` | `secondary` — Secondary accents, rhythm indicators. |
| **Terracotta Warmth** | `#ffb59e` | `tertiary` — Meticulous highlights, mood-specific accents. |
| **Silver Text** | `#e5e1e4` | `on-surface` — Main readable text. |
| **Muted Slate** | `#c7c4d7` | `on-surface-variant` — Subtitles, descriptions. |

## 3. Typography Rules
A dialogue between modern sans accessibility and technical mono-spaced precision.

- **Display (DM Sans/Manrope)**: Thin, large headers (Display-Lg). Tight letter spacing.
- **Technical (Space Grotesk)**: Labels, swara names (Sa, Re, Ga), and technical choices.
- **Support (DM Mono)**: Metadata, BPM, Aroha/Avaroha sequences. Mathematical precision.

## 4. Component Stylings
*   **The "No-Line" Rule**: Strictly prohibit 1px solid borders. Use background color shifts (`surface-container-low` vs `surface`) to define regions.
*   **Buttons**: Filled with gradient (Primary to Primary-Container). Radius: `xl` (12px).
*   **Cards/Containers**: Modular bento-style with varying tonal depths. Ambient tinted shadows (opacity 6-10%).
*   **Inputs**: Underline-only or "Ghost" style. Focus is a thick studio cursor.
*   **Glassmorphism**: Use `backdrop-blur` (20-40px) for floating playback controllers.

## 5. Layout Principles
- **Atmospheric White Space**: Lean on large section margins (`20`, `24` in tailwind scale).
- **The Playback Rail**: Fixed bottom bar housing transport controls, feeling "hardware-like" and separate from the canvas.

## 6. Design System Notes for Stitch Generation
When generating screens, use descriptors like: `"The Resonant Void atmosphere," "Editorial high-end studio," "Mono-spaced metadata vs thin display headers," "Tonal layering instead of borders."`
