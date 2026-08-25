#!/usr/bin/env python3
"""Regenerate every Assay brand asset from source/ and font/.

    python3 brand/build.py

Requires fonttools. PNG export additionally requires rsvg-convert.
"""

import re
import shutil
import subprocess
import sys
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

BRAND = Path(__file__).parent
SOURCE = BRAND / "source" / "transparent-black.svg"
FONT = BRAND / "font" / "Nunito-Black.ttf"

INK = "#0A0A0A"
STONE = "#E7E3DD"
STEEL = "#7A7570"

MARK_W, MARK_H = 680, 716
MARK_X, MARK_Y = 410, 409

CAP_RATIO = 0.705


def mark_paths() -> str:
    svg = SOURCE.read_text()
    paths = re.findall(r'<path fill="#0a0a0a" d="([^"]+)"[^>]*/>', svg)
    if len(paths) != 3:
        sys.exit(f"expected 3 paths in {SOURCE}, found {len(paths)}")
    return "".join(f'<path d="{d}"/>' for d in paths)


INNER = mark_paths()


def mark(fill: str, scale: float = 1.0, dx: float = 0, dy: float = 0) -> str:
    return (
        f'<g transform="translate({dx:.2f} {dy:.2f}) scale({scale:.6f}) '
        f'translate({-MARK_X} {-MARK_Y})" fill="{fill}">{INNER}</g>'
    )


_font = TTFont(FONT)
_upm = _font["head"].unitsPerEm
_glyphs = _font.getGlyphSet()
_cmap = _font.getBestCmap()
_hmtx = _font["hmtx"]


def wordmark(text: str, size: float, tracking: float) -> tuple[str, float]:
    scale = size / _upm
    x = 0.0
    parts = []
    for ch in text:
        name = _cmap[ord(ch)]
        pen = SVGPathPen(_glyphs)
        _glyphs[name].draw(TransformPen(pen, Transform(scale, 0, 0, -scale, x, 0)))
        if commands := pen.getCommands():
            parts.append(commands)
        x += _hmtx[name][0] * scale + tracking
    return " ".join(parts), x - tracking


def svg(width: float, height: float, body: str, label: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {height:.0f}" '
        f'width="{width:.0f}" height="{height:.0f}" role="img" aria-label="{label}">{body}</svg>'
    )


def build_mark() -> None:
    pad = MARK_H * 0.14
    w, h = MARK_W + pad * 2, MARK_H + pad * 2
    (BRAND / "mark.svg").write_text(
        svg(w, h, mark("currentColor", 1.0, pad, pad), "Assay mark")
    )


def build_lockups() -> None:
    pad = 34.0
    mark_h = 72.0
    scale = mark_h / MARK_H
    mw = MARK_W * scale
    gap = 26.0
    path, tw = wordmark("ASSAY", 38, 1.6)

    baseline = pad + mark_h / 2 + (38 * CAP_RATIO) / 2
    width = pad + mw + gap + tw + pad
    height = pad + mark_h + pad

    for name, colour in (("lockup-light", INK), ("lockup-dark", STONE)):
        body = mark(colour, scale, pad, pad) + (
            f'<g transform="translate({pad + mw + gap:.2f} {baseline:.2f})" '
            f'fill="{colour}"><path d="{path}"/></g>'
        )
        (BRAND / f"{name}.svg").write_text(svg(width, height, body, "Assay"))


def build_avatar() -> None:
    size = 400.0
    scale = 196 / MARK_H
    body = f'<rect width="{size:.0f}" height="{size:.0f}" fill="{INK}"/>' + mark(
        STONE, scale, size / 2 - (MARK_W * scale) / 2, size / 2 - (MARK_H * scale) / 2
    )
    (BRAND / "avatar.svg").write_text(svg(size, size, body, "Assay avatar"))


def build_banner() -> None:
    w, h = 1500.0, 500.0
    scale = 150 / MARK_H
    mw = MARK_W * scale
    left, top = 330.0, h / 2 - (MARK_H * scale) / 2 - 26
    path, _ = wordmark("ASSAY", 80, 3)
    text_x = left + mw + 46

    body = (
        f'<rect width="{w:.0f}" height="{h:.0f}" fill="{INK}"/>'
        + mark(STONE, scale, left, top)
        + f'<g transform="translate({text_x:.2f} {top + 100:.2f})" fill="{STONE}">'
        f'<path d="{path}"/></g>'
        f'<text x="{text_x:.0f}" y="{top + 148:.0f}" fill="{STEEL}" '
        f'font-family="Nunito, sans-serif" font-size="24">Instrumented crypto trading.</text>'
        f'<text x="{text_x:.0f}" y="{top + 182:.0f}" fill="{STEEL}" '
        f'font-family="Nunito, sans-serif" font-size="24">'
        f'Code, checks, and numbers — losses included.</text>'
        f'<path d="M330 408 H1170" stroke="{STONE}" stroke-opacity="0.12" stroke-width="2"/>'
        f'<text x="330" y="440" fill="{STEEL}" font-family="ui-monospace, Menlo, monospace" '
        f'font-size="18" letter-spacing="2.4">ASSAY.TRADE</text>'
    )
    (BRAND / "banner.svg").write_text(svg(w, h, body, "Assay banner"))


def build_favicon() -> None:
    size = 64.0
    scale = 38 / MARK_H
    body = f'<rect width="64" height="64" rx="14" fill="{INK}"/>' + mark(
        STONE, scale, size / 2 - (MARK_W * scale) / 2, size / 2 - (MARK_H * scale) / 2
    )
    (BRAND / "favicon.svg").write_text(svg(size, size, body, "Assay favicon"))


PNGS = [
    ("banner.svg", "banner-1500x500.png", 1500, None),
    ("avatar.svg", "avatar-400.png", 400, None),
    ("favicon.svg", "apple-touch-180.png", 180, None),
    ("favicon.svg", "favicon-32.png", 32, None),
    ("favicon.svg", "favicon-16.png", 16, None),
    ("lockup-light.svg", "lockup-light@2x.png", 1200, STONE),
    ("lockup-dark.svg", "lockup-dark@2x.png", 1200, INK),
]


def build_pngs() -> None:
    if not shutil.which("rsvg-convert"):
        print("rsvg-convert not found — skipping PNG export")
        return
    out = BRAND / "png"
    out.mkdir(exist_ok=True)
    for src, dst, width, background in PNGS:
        cmd = ["rsvg-convert", "-w", str(width), str(BRAND / src), "-o", str(out / dst)]
        if background:
            cmd[1:1] = ["-b", background]
        subprocess.run(cmd, check=True)


if __name__ == "__main__":
    build_mark()
    build_lockups()
    build_avatar()
    build_banner()
    build_favicon()
    build_pngs()
    print("brand assets rebuilt")
