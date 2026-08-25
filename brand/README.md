# Assay brand assets

## The mark

A solid triangle with a void interior and a single brass crossbar.

The triangle is the letter **A** with its crossbar removed. The brass bar restores it —
and that bar is the assay reading, the one thing the tool exists to produce. No container,
no badge, no enclosure.

**The crossbar is not optional.** Without it the mark is a hollow triangle, which is both
generic and adjacent to Vercel's symbol. The bar is what makes it a letter and what makes
it ours. Never render the mark without it.

| File | Use |
|---|---|
| `mark.svg` | Mark. Triangle takes `currentColor`, bar is fixed brass. |
| `mark-mono.svg` | Single-colour version for stamps, embroidery, favicons under 16px. |
| `lockup.svg` | Horizontal mark + wordmark. README header, site nav, docs. |
| `avatar.svg` | 400×400 profile picture. Stone on touchstone, brass bar. |
| `banner.svg` | 1500×500 header. X, GitHub org, site hero. |

Minimum mark size 16px. Minimum lockup width 150px. Clearspace equal to the triangle's
half-width on every side.

## Colour

| Name | Hex | Role |
|---|---|---|
| Touchstone | `#14171A` | Primary ground, body text on light |
| Stone | `#F3F2EF` | Light ground, mark on dark |
| Brass | `#B8873F` | The only accent. The crossbar. |
| Steel | `#6B7378` | Secondary text, metadata |
| Rule | `#DCDAD5` | Hairlines and borders |

Verdict colours are information, not decoration, and sit outside the palette:
`#3F6E51` pass, `#9B3A2F` fail, `#5D6E7E` manual.
On dark grounds they lift to `#7FB394`, `#D07E73`, `#8FA3B3`.

## Type

- **IBM Plex Mono** 500 — wordmark, data, verdicts. Wordmark uppercase, +0.18em tracking.
- **Spectral** 600 — headings, editorial.
- **IBM Plex Sans** 400/500 — body and interface.

Numerals always `tabular-nums`. Never Inter, never Space Grotesk.

## Before you distribute

**Outline the wordmark.** `lockup.svg` and `banner.svg` set `ASSAY` as live text. Where
IBM Plex Mono is absent it falls back silently and the tracking breaks — install the font
and convert text to paths before handing files to any platform.
