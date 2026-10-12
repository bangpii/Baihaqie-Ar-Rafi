#!/usr/bin/env python3
"""Regenerate public/hero-veil.webp from the transparent cut-out source PNG.

Keeps the alpha channel (subject on transparency) so DitherVeil can render it
against either theme's backdrop. Requires Pillow with WebP support.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "app" / "assets" / "Hero_BangpiiProfile.png"
OUT = ROOT / "public" / "hero-veil.webp"


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Source image not found: {SRC}")

    img = Image.open(SRC)
    img.save(OUT, "WEBP", lossless=True, method=6)
    size_kb = OUT.stat().st_size / 1024
    print(f"Saved {OUT.relative_to(ROOT)} ({size_kb:.0f} KB, {img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()