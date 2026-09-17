"""Render the Jardín Mayita plan without the 40 pre-placed tables.

Usage (one-off, needs PyMuPDF: `pip install pymupdf`):
    python3 scripts/venue-map.py "/path/to/JARDÍN MAYITA  20MR  20MC  10-OCT-2026.pdf"

Writes public/mesas/mayita.png (2880×1620, page 1 at 216 dpi).

The PDF is pure vector. Each table is a cluster of ~230 tiny paths around its
number label, so we:
  1. redact a 56×56 pt box around every label (1..40), dropping the paths that
     lie fully inside it (and the number itself);
  2. paint white over the chair-coloured slivers that survive step 1 (they
     belong to path objects shared across several tables, so MuPDF cannot
     delete them as "fully inside");
  3. redraw the venue's red marker squares, two of which sit inside a table
     box and get redacted with it.
Table clusters extend ≤27 pt from the label; the nearest neighbour starts
≥32 pt away, so nothing else is touched.
"""
import math
import sys
from pathlib import Path

import fitz  # PyMuPDF

RADIUS = 28
CHAIR_COLOR = (0.129, 0.157, 0.188)  # the dark grey-blue the chairs are drawn in


def decode(word: str) -> str:
    # Labels use a symbol font mapped into the Private Use Area (U+F0xx).
    return "".join(chr(ord(c) - 0xF000) if 0xF000 <= ord(c) < 0xF100 else c for c in word)


def is_chair(color) -> bool:
    return color is not None and all(abs(a - b) < 0.02 for a, b in zip(color, CHAIR_COLOR))


def is_red(d) -> bool:
    fill = d.get("fill")
    return bool(fill) and fill[0] > 0.9 and fill[1] < 0.2


def main(pdf_path: str) -> None:
    doc = fitz.open(pdf_path)
    page = doc[0]
    labels = {}
    for x0, y0, x1, y1, word, *_ in page.get_text("words"):
        text = decode(word)
        if text.isdigit() and 1 <= int(text) <= 40:
            labels[int(text)] = ((x0 + x1) / 2, (y0 + y1) / 2)
    if len(labels) != 40:
        raise SystemExit(f"expected 40 table labels, found {len(labels)}")
    centres = list(labels.values())
    red_markers = {tuple(round(v, 1) for v in d["rect"]) for d in page.get_drawings() if is_red(d)}

    # 1. redact the clusters
    for cx, cy in centres:
        page.add_redact_annot(fitz.Rect(cx - RADIUS, cy - RADIUS, cx + RADIUS, cy + RADIUS))
    page.apply_redactions(images=0, graphics=1, text=0)

    # 2. white out chair-coloured slivers left near the labels
    erased = 0
    for d in page.get_drawings():
        if not (is_chair(d.get("color")) or is_chair(d.get("fill"))):
            continue
        r = d["rect"]
        cx, cy = r.x0 + r.width / 2, r.y0 + r.height / 2
        if min(math.hypot(cx - lx, cy - ly) for lx, ly in centres) >= 30:
            continue
        page.draw_rect(fitz.Rect(r.x0 - 0.6, r.y0 - 0.6, r.x1 + 0.6, r.y1 + 0.6), color=(1, 1, 1), fill=(1, 1, 1), width=0)
        erased += 1

    # 3. put back the red marker squares the redaction swallowed
    remaining = {tuple(round(v, 1) for v in d["rect"]) for d in page.get_drawings() if is_red(d)}
    for rect in red_markers - remaining:
        page.draw_rect(fitz.Rect(*rect), color=(1, 0, 0), fill=(1, 0, 0), width=0)

    out = Path(__file__).resolve().parent.parent / "public" / "mesas" / "mayita.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    pix = page.get_pixmap(dpi=216)
    pix.save(str(out))
    print(f"wrote {out} ({pix.width}x{pix.height}); erased {erased} slivers, restored {len(red_markers - remaining)} red markers")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
