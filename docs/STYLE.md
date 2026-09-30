# Style guide: SD Worx palette, Memphis Milano treatment

This is the base visual style of the Tectonic × SD Worx app. It applies to the Next.js
pages **and** the Remotion compositions, because both consume the same
[`src/app/globals.css`](../src/app/globals.css).

## Idea in one paragraph

Keep the SD Worx brand colours exactly as they are (the three logo strokes: blue, red,
yellow, plus Inter for text) and present them the way the Memphis Group did in Milan in
1981: cream "laminate" backgrounds, black outlines, hard offset shadows instead of soft
ones, primary colours next to pastels, dot / grid / stripe / confetti patterns, squiggles
and zigzags, and slightly tilted blocks. The brand stays recognisable, the mood becomes
playful and hand-made instead of corporate.

## Tokens

All tokens are Tailwind v4 `@theme` variables, so every one of them is available as a
utility class (`bg-sun`, `text-ink`, `border-ink`, `shadow-block`, `rounded-pill`, ...).

### Colours

| Role                     | Token         | Value     | Use                                          |
| ------------------------ | ------------- | --------- | -------------------------------------------- |
| Brand blue (logo, CTA)   | `brand`       | `#006DD8` | Primary blocks, links, the headline box      |
| Brand red                | `accent`      | `#F1002F` | Hard shadows, squiggles, alerts               |
| Brand yellow             | `sun`         | `#FFBE00` | Chips, highlights, big background circle     |
| Blue scale               | `brand-50…950`| see CSS   | Kept from the SD Worx Ignite tokens          |
| Paper                    | `paper`       | `#FFF8EC` | Page and video background                    |
| Ink                      | `ink`         | `#0B0B12` | Outlines, headlines, black hard shadows      |
| Body text                | `body`        | `#303642` | Paragraphs                                   |
| Memphis pastels          | `mint`, `pink`, `lilac`, `sky`, `cream` | `#7FE3C5`, `#FFB3C7`, `#C9B8FF`, `#9ED2FF`, `#FFF2CC` | Card fills, secondary shapes |
| Semantic (Ignite)        | `success`, `warning`, `danger`, `info` | unchanged | Form and status states |

Rule of thumb: one primary per element, a pastel behind it, ink around it.

### Type

| Role     | Token          | Font                                          |
| -------- | -------------- | --------------------------------------------- |
| Display  | `font-display` | Archivo Black (Google Fonts), uppercase       |
| Body     | `font-sans`    | Inter (the SD Worx body font)                 |
| Code     | `font-mono`    | Consolas / ui-monospace                       |

SD Worx Display is a licensed font and is not shipped. Archivo Black is the chunky
geometric substitute that matches Memphis poster lettering. The `text-display` utility
sets font, uppercase, tight tracking and 0.95 line height in one class.

### Shape

| Token                  | Value                     | Notes                                   |
| ---------------------- | ------------------------- | --------------------------------------- |
| `rounded-sm/md/lg`     | `0 / 2px / 4px`           | Corners are sharp                       |
| `rounded-pill`         | `9999px`                  | Or fully round. Nothing in between      |
| `shadow-block`         | `6px 6px 0 ink`           | Default hard shadow                     |
| `shadow-block-sm/lg`   | `3px / 10px` offsets      |                                         |
| `shadow-block-brand`   | `6px 6px 0 brand`         | Also `-accent`, `-sun`                  |
| `shadow-block-lg-accent` | `12px 12px 0 accent`    | Also `-brand`                           |
| `block-outline`        | 3px ink border + `shadow-block` | The standard outlined block       |

### Patterns

| Utility                   | What it draws                                         |
| ------------------------- | ----------------------------------------------------- |
| `bg-pattern-dots`         | Sparse ink dots on paper. Default `<body>` background |
| `bg-pattern-dots-dense`   | Dense dots in `currentColor`                          |
| `bg-pattern-grid`         | Fine grid in `currentColor` (Bacterio stand-in)       |
| `bg-pattern-stripes`      | Diagonal candy stripes in `currentColor`              |
| `bg-pattern-confetti`     | Brand-colour confetti / terrazzo                      |

Patterns that use `currentColor` take their colour from `text-*`, so
`<div class="bg-lilac text-ink bg-pattern-dots-dense">` is lilac with ink dots.

## Shapes

[`src/components/MemphisShapes.tsx`](../src/components/MemphisShapes.tsx) exports plain
SVG components that work in pages and in Remotion:

`Squiggle`, `Zigzag`, `Triangle`, `Circle`, `HalfCircle`, `DottedBlock`, `Confetti`
and a `Deco` wrapper that positions a shape absolutely, hides it from assistive tech and
turns off pointer events.

Fill comes from `currentColor` (`text-sun`), the outline from the `stroke` prop
(defaults to ink).

```tsx
<Deco className="-top-16 -right-24 h-96 w-96 text-sun">
  <Circle className="h-full w-full" />
</Deco>
```

## Composition rules

1. **Paper first.** Every screen and every video frame starts on `bg-paper`, usually with
   `bg-pattern-dots`.
2. **Outline what matters.** Interactive or primary elements get `block-outline` (or a
   `border-3 border-ink` plus one `shadow-block-*`). Decorative shapes get the SVG
   outline for free.
3. **Tilt a little, not a lot.** Use `rotate-1` / `-rotate-2` on blocks and cards. More
   than 3 degrees looks broken, not playful.
4. **Big shapes get cropped.** Put the large circle / triangle partly outside the
   viewport and clip with `overflow-x-clip` on the container. Never let decoration
   cause horizontal scroll.
5. **Three primaries, then pastels.** A card is pastel with a primary shadow; a headline
   block is primary with a red or ink shadow. Do not stack two primaries as fill and
   shadow of the same element unless one of them is ink.
6. **Type is loud, copy is calm.** Headlines in `text-display`; body copy in Inter at
   normal weight and 1.6 line height. One highlighted phrase per headline, on a
   coloured block.
7. **Motion pops.** In Remotion, shapes enter with a springy `damping: 14` pop and
   blocks slide with `damping: 200`. Keep a slow sine drift on big shapes.
8. **Reduced motion is respected.** `globals.css` collapses CSS transitions when the
   user asks for reduced motion; keep JS animations optional.

## Where things live

| What                          | File                                                   |
| ----------------------------- | ------------------------------------------------------ |
| Tokens, patterns, utilities   | `src/app/globals.css`                                  |
| Fonts                         | `src/app/layout.tsx` (Inter + Archivo Black via `next/font`) |
| Shape library                 | `src/components/MemphisShapes.tsx`                     |
| Landing page                  | `src/app/page.tsx`                                     |
| Player frame                  | `src/components/VideoPreview.tsx`                      |
| Video composition             | `src/remotion/compositions/PromoVideo.tsx`             |

## Brand sources

Logo colours and Inter come from the SD Worx June-2026 rebrand ("SD Worx makes work
work"). The Ignite design-system tokens
(`https://cdn.sdworx.com/ignite/styling/v2`) supplied the blue scale and semantic
colours. The official brand guidelines at brand.sdworx.com are login-gated, so treat
the palette as best-effort. Legacy brand gradients (`bg-brand-gradient`,
`text-brand-gradient`) are still defined for compatibility but are not part of the
Memphis look.
