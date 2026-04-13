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
| **Teal Stroke** | `#84d6b9` |Secondary accents, rhythm indicators. |
| **Terracotta Warmth** | `#ffb59e` |Meticulous highlights, mood-specific accents. |
| **Silver Text** | `#e5e1e4` |Main readable text. |
| **Muted Slate** | `#c7c4d7` |Subtitles, descriptions. |

## 3. Typography & Icons
- **Display (Manrope)**: Thin, large headers (Display-Lg). Tight letter spacing.
- **Technical (Space Grotesk)**: Labels, swara names (Sa, Re, Ga).
- **Support (DM Mono)**: Metadata, BPM, Aroha/Avaroha sequences.
- **Iconography**: Use **Material Symbols (Outlined)**. Stroke weight `200` for a professional, hairline look.

## 4. Interaction Principles (Micro-Resonance)
*   **Double-Click to Move**: Floating widgets (like the AI Assistant) are moved via a double-click-to-active-drag gesture, ensuring they don't interfere with single-click interactions.
*   **Rhythmic Flash**: DrumPads must provide immediate visual feedback with a **120ms** background flash on trigger.
*   **BPM Pulse**: The transport rail features a subtle radial pulse synced precisely with the global BPM.
*   **Scale Lock**: Melodic inputs (Piano) visually dim notes that are not in the current raga scale.

## 5. Component Stylings
*   **Bento Containers**: Modular tonal depths (Obsidian to Indigo) define regions without using 1px borders.
*   **Buttons**: Radius `xl` (12px), background transitions rather than hard state changes.
*   **Glassmorphism**: Use `backdrop-blur` (30px) and `bg-white/5` for overlays and the transport rail.

## 6. Layout Principles
- **Hardware Separation**: The bottom Playback Rail is conceptually separate hardware. It should always feel floating and isolated from the main canvas.
- **Void Space**: Lean into negative space. If a region feels crowded, increase tonal contrast rather than adding more elements.
