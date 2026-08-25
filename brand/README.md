# Assay — graphics chart

## Mark

A rounded monoline letterform on a diagonal axis. Two weights only: `#0A0A0A` on light
grounds, `#E7E3DD` on dark. Never recoloured, never on a busy image, never rotated.

| File | Use |
|---|---|
| `mark.svg` | Mark alone, takes `currentColor` |
| `lockup-light.svg` | Mark + wordmark for light grounds |
| `lockup-dark.svg` | Mark + wordmark for dark grounds |
| `avatar.svg` | 400×400 profile picture |
| `banner.svg` | 1500×500 header |
| `favicon.svg` | 64×64, rounded container |

**Clearspace** equal to the mark's own width on every side.
**Minimum sizes:** 48px for the mark alone, 200px wide for the lockup.

The mark is drawn for large formats. Below 48px the counters close and the dot detaches —
use the wordmark alone rather than an illegible mark. The favicon puts it in a rounded
container specifically to hold a silhouette at 32px; it is the only approved small use.

## Colour

| Name | Hex | Role |
|---|---|---|
| Ink | `#0A0A0A` | Primary ground, mark on light, body text |
| Stone | `#E7E3DD` | Light ground, mark on dark |
| Brass | `#B8873F` | The only accent. Links, emphasis, the prompt. |
| Steel | `#7A7570` | Secondary text, captions, metadata |
| Rule | `#D6D1C9` | Hairlines, borders, dividers |

Brass is warm to sit with Stone, and deliberately not bright gold. One accent per view —
scarcity is what makes it read as metal rather than decoration.

**Verdict colours are information, not decoration.** They sit outside the palette and never
compete with brass.

| State | On light | On dark |
|---|---|---|
| pass | `#4A7A55` | `#86B792` |
| fail | `#A3453A` | `#D8837A` |
| manual | `#6E7A82` | `#9BAAB4` |

## Type

| Face | Weight | Role |
|---|---|---|
| IBM Plex Mono | 500 | Wordmark, all data, verdicts, the CLI |
| Spectral | 600 | Headings, editorial, long-form |
| IBM Plex Sans | 400/500 | Body, interface, captions |

Wordmark is uppercase `ASSAY` at +0.18em tracking, weight 500, never bold or italic.
Numerals always `tabular-nums` — figures that don't align read as unmeasured.

Never Inter, never Space Grotesk. They are what everything else in this category uses.

## Terminal

The CLI is the brand's most-used surface. Its palette is the brand palette.

| Element | Colour |
|---|---|
| Background | `#0A0A0A` |
| Body text | `#E7E3DD` |
| Prompt, headings | `#B8873F` |
| Dim detail | `#7A7570` |
| PASS / FAIL / MANUAL | verdict colours, dark column |

## Rules

**Do** let numbers be the loudest thing on any surface — the brand is measurement.
**Do** publish failures in the same weight and size as wins.
**Do** keep one brass accent per view.

**Don't** add candles, rockets, or gradients. Every account in this category already does.
**Don't** put P&L in the banner. The position is method, not returns.
**Don't** use the mark below 48px. Use the wordmark.

## Before distributing

`lockup-*.svg` and `banner.svg` set `ASSAY` as live text in IBM Plex Mono. Where the font
is absent it falls back silently and the tracking breaks. Install IBM Plex Mono and convert
text to paths before handing files to any platform.
