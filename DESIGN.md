# Design System

## Visual Theme
- **Background**: `hsl(224, 71%, 4%)` (Deep slate/zinc).
- **Foreground**: `hsl(210, 40%, 98%)`.
- **Primary Accent**: Cyan (`hsl(188, 85%, 53%)`), used sparingly for contrast against the dark background. No widespread glowing effects.

## Typography
- **Sans-serif**: `var(--font-geist-sans)` for all standard UI text.
- **Display**: High-contrast, clean lines. Max 2 lines for hero headlines.

## Layout & Composition
- Avoid centered, symmetric designs unless heavily justified. Prefer split screens or bento grids with internal rhythm.
- Avoid repeating layouts (e.g. alternating zigzag) more than twice.
- Buttons must have `active:scale-[0.98]` tactile states.
- Interactions must feel <300ms.

## Known Exceptions
- Landing page (`/`) embraces a slightly higher variance (7) and motion (6) compared to the dashboard `/qa-test-assistant` (Variance 5, Density 5).
