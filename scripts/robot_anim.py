"""Authored pixel animation helpers for the robot master (192x192, sprite-forge/1 rows).

Every operation is an explicit pixel-row edit (row insert/delete inside a column band, band shifts,
palette-ramp steps). No resampling, no rotation, no image generation, no network.
"""
import json, pathlib
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
ALPHA = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
W = H = 192
EMPTY = -1


def load_master():
    doc = json.loads((ROOT / "assets/characters/robot-rig-study/master.sprite.json").read_text())
    return doc, rows_to_arr(doc["animations"][0]["frames"][0]["rows"])


def rows_to_arr(rows):
    a = np.full((H, W), EMPTY, dtype=np.int16)
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c != ".":
                a[y, x] = ALPHA.index(c)
    return a


def arr_to_rows(a):
    return ["".join("." if v < 0 else ALPHA[v] for v in row) for row in a]


def band_bob(a, x0, x1, y_top, seam, dy):
    """Within columns [x0,x1) move everything in rows [y_top,seam) down by dy (dy<0: up) by
    deleting/duplicating rows at `seam`. Rows at/below seam do not move."""
    out = a.copy()
    if dy == 0:
        return out
    for y in range(y_top, seam):
        s = y - dy
        out[y, x0:x1] = a[s, x0:x1] if s >= y_top else EMPTY
    return out


def band_lift(a, x0, x1, seam, k, y_end=H):
    """Lift the foot in columns [x0,x1): delete k rows at `seam` and move everything below the
    seam up by k. The vacated bottom rows become transparent. (A shortened, raised leg.)"""
    out = a.copy()
    if k == 0:
        return out
    out[seam:y_end - k, x0:x1] = a[seam + k:y_end, x0:x1]
    out[y_end - k:y_end, x0:x1] = EMPTY
    return out


def band_shift_below(a, x0, x1, seam, dy, y_end=H, fill_row=None):
    """Move rows [seam,y_end) in the band by dy (neg = up). Moving down, the opened gap is filled
    by repeating `fill_row` (default: the row above the seam) so the limb simply gets longer."""
    out = a.copy()
    if dy == 0:
        return out
    out[seam:y_end, x0:x1] = EMPTY
    for y in range(seam, y_end):
        s = y - dy
        if seam <= s < y_end:
            out[y, x0:x1] = a[s, x0:x1]
    if dy > 0:
        fr = a[(seam - 1) if fill_row is None else fill_row, x0:x1]
        for y in range(seam, seam + dy):
            out[y, x0:x1] = fr
    return out


def sway(a, y0, y1, dx):
    """Shift rows [y0,y1) horizontally by dx (weight shift). Vacated pixels become transparent."""
    out = a.copy()
    if dx == 0:
        return out
    out[y0:y1] = EMPTY
    if dx > 0:
        out[y0:y1, dx:] = a[y0:y1, :-dx]
    else:
        out[y0:y1, :dx] = a[y0:y1, -dx:]
    return out


def to_doc(master, name, anims):
    """anims: list of (name, fps, loop, [arr frames])."""
    doc = {k: v for k, v in master.items() if k != "animations"}
    doc["id"] = name
    doc["name"] = name
    doc["animations"] = [
        {"name": n, "fps": fps, "loop": loop,
         "frames": [{"rows": arr_to_rows(f), "duration": 1, "hitboxes": []} for f in frames]}
        for n, fps, loop, frames in anims]
    return doc


def render(doc, anim, frame, bg=None):
    from PIL import Image
    pal = [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,) for c in doc["palette"]]
    rows = doc["animations"][anim]["frames"][frame]["rows"]
    im = Image.new("RGBA", (W, H), bg or (0, 0, 0, 0))
    px = im.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != ".":
                px[x, y] = pal[ALPHA.index(ch)]
    return im


def sheet(doc, anim, z=1, bg=(24, 34, 42, 255)):
    from PIL import Image
    n = len(doc["animations"][anim]["frames"])
    s = Image.new("RGBA", (W * z * n, H * z), bg)
    for i in range(n):
        f = render(doc, anim, i)
        b = Image.new("RGBA", f.size, bg)
        b.alpha_composite(f)
        s.paste(b.resize((W * z, H * z), Image.NEAREST), (i * W * z, 0))
    return s
