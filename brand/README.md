# Assay brand assets

| File | Use |
|---|---|
| `mark.svg` | Mark alone. Uses `currentColor`, inherits whatever colour you set. |
| `lockup.svg` | Horizontal mark + wordmark. README header, site nav, docs. |
| `avatar.svg` | 400×400 profile picture. Brass on touchstone, baked colours. |
| `banner.svg` | 1500×500 header. X, GitHub org, site hero. |

## Colour

| Name | Hex | Role |
|---|---|---|
| Touchstone | `#14171A` | Primary ground, body text on light |
| Stone | `#F3F2EF` | Light ground |
| Brass | `#B8873F` | The only accent |
| Steel | `#6B7378` | Secondary text, metadata |
| Rule | `#DCDAD5` | Hairlines and borders |

Verdict colours are information, not decoration, and sit outside the palette:
`#3F6E51` pass, `#9B3A2F` fail, `#5D6E7E` manual.
On dark grounds they lift to `#7FB394`, `#D07E73`, `#8FA3B3`.

## Type

- **IBM Plex Mono** 500 — wordmark, data, verdicts. Wordmark is uppercase at +0.19em tracking.
- **Spectral** 600 — headings, editorial.
- **IBM Plex Sans** 400/500 — body and interface.

Numerals always `tabular-nums`. Never Inter, never Space Grotesk.

## Rules

Minimum mark size 16px; minimum lockup width 120px. Clearspace equal to half the
cartouche width on every side. One brass accent per view.

**Outline the text before distributing.** `lockup.svg` and `banner.svg` set the wordmark
as live text — where IBM Plex Mono is missing it falls back silently and the tracking breaks.
