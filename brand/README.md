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
| `source/` | Original artwork as drawn. `transparent-*.svg` are the clean ones. |
| `png/` | Rasterised exports at platform sizes |
| `font/` | Nunito Black, vendored under the OFL for reproducible builds |
| `build.py` | Regenerates every asset above |

## Rebuilding

```sh
python3 brand/build.py
```

Regenerates all SVGs and PNGs from `source/` and `font/`. Needs `fonttools`; PNG export
additionally needs `rsvg-convert`. Change a colour or a size in `build.py` rather than
editing an SVG by hand — hand edits get overwritten on the next build.

Every asset carries baked padding so it never reads as cropped when dropped into a README
or a profile header. Lockups use 34px at a 72px mark height; the mark file uses 14% of its
own height on each side.

The wordmark in `lockup-*.svg` and `banner.svg` is **converted to outlines** — no font
required, nothing to fall back. Nunito is OFL-licensed, so embedding the outlines is fine.

`source/black.svg` and `source/white.svg` carry baked full-bleed background rectangles and
are not transparent. Use the `transparent-*` pair for anything composited.

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

Two families. The display face matches the mark's roundness; the mono carries every number.

| Face | Weight | Role |
|---|---|---|
| Nunito | 900 (Black) | Wordmark, headings, display |
| Nunito | 400/600 | Body, interface, captions |
| IBM Plex Mono | 400/500 | All data, verdicts, the CLI |

Nunito was chosen for its rounded stroke terminals, which echo the mark's round caps at a
matching weight. Fredoka and Baloo read too playful; Outfit and Poppins have flat terminals,
so they are geometric without being round.

Wordmark is uppercase `ASSAY`, weight 900, +1.6 tracking at 38px. Heavy rounded faces need
far less tracking than monospace — do not letterspace it like a mono wordmark.

Numerals always `tabular-nums` in Plex Mono. Figures that don't align read as unmeasured.

Never Inter, never Space Grotesk. Both are free on Google Fonts:
`Nunito:wght@400;600;900` and `IBM+Plex+Mono:wght@400;500`.

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

## Rebuilding

The wordmark is outlined, so the SVGs are self-contained and safe to hand to any platform.
If the wordmark ever changes, regenerate the outlines with `fontTools` rather than setting
live text — a missing Nunito falls back to a serif and breaks the mark completely.

The two tagline lines and `ASSAY.TRADE` in `banner.svg` are still live text, in Nunito and a
generic monospace. They degrade gracefully; the wordmark would not have.
