# Design System: The Resonant Void

## 1. Visual Theme & Atmosphere
The aesthetic blends a professional recording studio with the atmospheric depth of Indian classical music. It prioritizes **Atmospheric Precision** — silence (void) is as important as resonance.

### Creative North Star
- **Intentional Asymmetry**: Breaking rigid grids for natural movement.
- **High-Contrast Scales**: Large display headers vs. tiny mono-spaced metadata.
- **Tonal Depth**: Layered obsidian space with physical "recessed" logic.
- **Dual Theme**: Full dark and light mode. Dark = obsidian studio. Light = warm parchment. All tokens adapt — no hardcoded colors.

---

## 2. Color Palette & Roles

### Dark Mode (default)
| Token | Value | Role |
|:---|:---|:---|
| `--background` | `#0D1117` | Main background (GitHub-dark) |
| `--surface` | `#131315` | Workspace surfaces |
| `--surface-lowest` | `#0e0e10` | Deepest recessed panels |
| `--primary` | `#58A6FF` | Main actions, active notes, highlights |
| `--accent` | `#79C0FF` | Secondary accents |
| `--on-surface` | `#C9D1D9` | Main readable text |
| `--on-surface-variant` | `#8B949E` | Subtitles, descriptions |

### Light Mode (data-theme="light" on `<html>`)
| Token | Value | Role |
|:---|:---|:---|
| `--background` | `#F5F0E8` | Warm parchment |
| `--surface` | `#FDFAF5` | Card and panel surfaces |
| `--primary` | `#5C35C5` | Deep indigo primary |
| `--on-surface` | `#2C1810` | Dark brown text |
| `--on-surface-variant` | `#6B5744` | Warm muted text |

---

## 3. Typography & Icons
- **Display (`font-display` → Manrope)**: Thin, large headers. Tight letter spacing.
- **Technical (`font-label` → Space Grotesk)**: Labels, swara names (Sa Re Ga).
- **Support (`font-mono` → DM Mono)**: Metadata, BPM, aroha/avaroha sequences.
- **Iconography**: Material Symbols (Outlined), stroke weight `200`.

---

## 4. RagaCard Visual Identity
Each raga gets a **unique, deterministic visual identity** from its name alone — no extra assets needed.

**Algorithm:**
1. `ragaHash(name)` — polynomial hash of the raga name string
2. `hueShift = (hash % 24) * 15` — 24 steps × 15° = full 0–345° hue range
3. `tint = TINT_PALETTE[hash % 8]` — 8 rgba colors at ~0.15–0.18 alpha

**Atmosphere images** (3 total, selected by time_of_day):
- Morning → `/raga_morning_atmosphere.png`
- Evening/Night → `/raga_night_atmosphere.png`
- Default → `/raga_afternoon_atmosphere.png`

**Image treatment:**
```css
filter: hue-rotate(${hueShift}deg) saturate(1.3)
opacity: 70%  /* visible, not washed */
```

**Overlay stack (bottom up):**
1. Atmosphere image at 70% opacity + hue-rotate
2. Radial tint gradient at 60% center
3. Dark scrim `from-black/65 via-black/15` → keeps text white in both themes

**All card text is `text-white/*`** — the dark scrim ensures contrast in both light and dark mode.

---

## 5. Interaction Principles
- **Double-Click to Move**: Floating AI Assistant widget — double-click activates drag; single-click = interact.
- **Rhythmic Flash**: DrumPad = 120ms background flash on trigger.
- **BPM Pulse**: Transport rail radial pulse synced to global BPM.
- **Scale Lock**: Piano dims varjya (forbidden) notes for the active raga.
- **Immersive Side Panels**: In immersive mode, Aroha panel anchors to viewport left edge, Avaroha to right edge — `position: fixed`, no layout impact on keyboard width.
- **QWERTY Labels**: Each swara note in side panels shows its keyboard shortcut in a `<kbd>` chip.

---

## 6. Component Stylings
- **Bento Containers**: Modular tonal depths (Obsidian to Indigo) define regions without hard borders.
- **Buttons**: Radius `xl` (12px), background transitions not hard state changes.
- **Glassmorphism**: `backdrop-blur-xl` + `bg-surface-lowest/85` for overlays and transport rail.
- **RagaCard**: `rounded-[32px]`, `h-80`, `shadow-2xl`. Selected state: `ring-2 ring-primary/20 scale-[1.02]`.

---

## 7. Layout Principles
- **Hardware Separation**: Bottom Playback Rail = always floating, isolated from main canvas.
- **Void Space**: Lean into negative space. Crowded region → increase tonal contrast, not more elements.
- **Immersive Keyboard**: In immersive mode, keyboard always takes full width. Side panels use `position: fixed` to sit outside the layout flow at viewport edges.
- **Remember Me**: Login page persists email to `localStorage` under key `saptaswara-remember-email`. No backend involvement — Supabase session already persists auth state independently.
