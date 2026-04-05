# CourtMap — Figma theme & colour handoff

Use this when designing new screens so they match the live **CourtMap** web app (pickleball courts, Vietnam). Tokens below are the source of truth in code (`lib/theme.ts`). Default product chrome is **dark mode**; light mode is supported for user preference.

---

## Typography

| Role | Font | Weights in use | Notes |
|------|------|----------------|-------|
| **UI body & controls** | **DM Sans** | 400, 500, 600, 700, 800, 900 | Loaded from Google Fonts. Fallback: `Helvetica Neue`, system UI sans-serif. |
| **Wordmark / display** | **Archivo Black** | 900 | App bar logo: `COURT` (accent colour) + `MAP` (primary text colour). Letter-spacing **-0.5px**, size **18px** in header. |
| **Mono (rare)** | System monospace | — | e.g. bank account numbers in payment copy |

**Google Fonts URL (for Figma plugins or dev):**  
`https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Archivo+Black&display=swap`

**Typical sizes in UI:** 10–11px (labels, nav), 12–13px (secondary), 14–16px (titles/body), 15px (inputs).

---

## Colour — dark theme (default)

Create a Figma **Dark** collection with these swatches. Names match code tokens.

| Token | Hex / value | Usage |
|-------|-------------|--------|
| `bg` | `#0A0A0A` | Page background, chrome behind content |
| `bgSurface` | `#111111` | Slightly raised surfaces |
| `bgCard` | `#161616` | Cards, list rows, panels |
| `bgInput` | `#1A1A1A` | Inputs, subtle fills, gradient ends |
| `border` | `#2A2A2A` | Hairlines, card outlines |
| `text` | `#F0F0F0` | Primary text |
| `textSec` | `#888888` | Secondary text, inactive nav icons |
| `textMuted` | `#555555` | Tertiary / de-emphasised |
| `accent` | `#B8F200` | Primary CTA, active states, logo “COURT”, key highlights |
| `accentBg` | `rgba(184,242,0,0.08)` | Soft accent wash (chips, info strips) |
| `accentBgStrong` | `rgba(184,242,0,0.15)` | Stronger accent wash |
| `red` | `#FF4757` | Errors, “fully booked”, destructive emphasis |
| `orange` | `#FFA502` | Warnings (if needed) |
| `green` | `#2ED573` | Success (if needed) |
| `blue` | `#3498DB` | Info links (if needed) |
| `pillBg` | `rgba(20,20,20,0.92)` | Floating pills over map / imagery |
| `pillBorder` | `#333333` | Pill outlines |
| `sheetBg` | `#111111` | Bottom sheets, tab bar background |
| `overlay` | `rgba(0,0,0,0.70)` | Modal / sheet scrim |

**Shadows (dark):**

- `shadow`: `0 2px 20px rgba(0,0,0,0.5)`
- `shadowSm`: `0 1px 8px rgba(0,0,0,0.3)`
- Primary buttons sometimes use a glow: `0 4px 20px` with accent at ~33% opacity (e.g. `#B8F200` with alpha).

**Accent on lime:** small type on `accent` often uses **black** (`#000000`) for contrast (e.g. price pill on venue cards).

---

## Colour — light theme

| Token | Hex / value |
|-------|-------------|
| `bg` | `#F5F5F7` |
| `bgSurface` | `#FFFFFF` |
| `bgCard` | `#FFFFFF` |
| `bgInput` | `#F0F0F2` |
| `border` | `#E0E0E0` |
| `text` | `#1A1A1A` |
| `textSec` | `#666666` |
| `textMuted` | `#999999` |
| `accent` | `#7CB300` |
| `accentBg` | `rgba(124,179,0,0.06)` |
| `accentBgStrong` | `rgba(124,179,0,0.12)` |
| `red` | `#E74C3C` |
| `orange` | `#E67E22` |
| `green` | `#27AE60` |
| `blue` | `#2980B9` |
| `pillBg` | `rgba(255,255,255,0.95)` |
| `pillBorder` | `#DDDDDD` |
| `sheetBg` | `#FFFFFF` |
| `overlay` | `rgba(0,0,0,0.40)` |

**Shadows (light):**

- `shadow`: `0 2px 20px rgba(0,0,0,0.08)`
- `shadowSm`: `0 1px 8px rgba(0,0,0,0.04)`

---

## Layout & shape language

- **Mobile-first width:** main shell caps around **430px** centred; bottom nav spans full width of that shell.
- **Corner radii** used in product: **6, 8, 10, 12, 14, 16, 20** px; **full pill** `999` or **50%** for circles.
- **Cards:** commonly **16px** radius, **1px** border using `border`.
- **Primary buttons:** often **14px** radius, generous horizontal padding (**16–20px** vertical, **20px** horizontal typical).
- **Sheets:** top handle bar ~**40×4px**, radius **2px**, `textMuted` at reduced opacity.
- **Motion:** short transitions **~0.15–0.2s** on hovers and state changes.

---

## Brand & content cues

- Product name in UI: **CourtMap** (wordmark styling as above).
- **Theme colour / PWA:** `#0A0A0A` (aligns with dark `bg`).
- Imagery placeholders often use a **diagonal gradient** from `bgSurface` to `bgInput` (135°).

---

## For Figma setup (quick checklist)

1. Add text styles for **DM Sans** (Body, Label 10–12, Title 14–16, Input 15).
2. Add **Archivo Black** style for the **logo / display** line.
3. Create **two variable modes**: Dark (default) and Light using the tables above.
4. Map semantic names (`Background / Primary`, `Text / Primary`, `Accent / Primary`, etc.) to these tokens so components swap cleanly between modes.

---

*Generated from repository tokens in `lib/theme.ts` and shared with `mobile/lib/theme.ts` (same values). Web layout references: `app/layout.tsx`, `components/`.*
