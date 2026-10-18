"""Back (up-facing) base for the robot: mirrored master, face -> helmet back, reactor -> back plate,
knee discs -> armour, boot toe-caps -> heel soles. Explicit palette/region edits; zero API calls."""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from robot_anim import *
master, base = load_master()

DARK, PIPE, RED, GOLD, GREEN, CYAN, GREY = range(0), range(10, 15), range(15, 22), range(22, 29), range(29, 36), range(36, 41), range(0, 10)

def inr(v, r):
    return r.start <= v < r.stop

def back_base():
    a = base[:, ::-1].copy()
    out = a.copy()

    # 1) face -> helmet back: extend the dome streaks straight down from row 43
    for x in range(66, 130):
        for y in range(44, 85):
            v = a[y, x]
            if v < 0 or inr(v, RED) or inr(v, GOLD):
                continue
            if inr(v, PIPE) and not (x < 74 or x > 118):   # keep the real side pipes, drop mask fragments
                pass
            elif inr(v, PIPE) and x >= 74:
                continue
            src = int(out[43, x]) if out[43, x] >= 0 else 2
            # darken slightly toward the neck
            drop = 1 if y > 70 else 0
            out[y, x] = max(0, src - drop) if src < 10 else src
    # neck ring / vent slits on the helmet back
    for y in (62, 65, 68):
        for x in range(90, 104):
            if out[y, x] >= 0 and out[y, x] < 10:
                out[y, x] = 1

    # 2) reactor -> back plate (green ramp -> graphite, add vents)
    ys, xs = np.where((a >= 29) & (a <= 35))
    cy, cx = int(ys.mean()), int(xs.mean())
    ramp = {29: 1, 30: 2, 31: 3, 32: 3, 33: 4, 34: 5, 35: 6}
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            v = a[y, x]
            if 29 <= v <= 35 and abs(y - cy) < 40 and abs(x - cx) < 40:
                out[y, x] = ramp[int(v)]
    for dy in (-6, -1, 4, 9):
        for x in range(cx - 10, cx + 11):
            if (x - cx) ** 2 + dy ** 2 < 15 ** 2 and out[cy + dy, x] in range(1, 7):
                out[cy + dy, x] = 0

    # 3) knee discs (gold) -> armour red; 4) boot toe-caps (light grey) -> heel soles
    gold_to_red = {22: 15, 23: 16, 24: 17, 25: 18, 26: 19, 27: 20, 28: 21}
    for y in range(136, 160):
        for x in range(40, 155):
            v = a[y, x]
            if 22 <= v <= 28:
                out[y, x] = gold_to_red[int(v)]
    soles = {5: 3, 6: 3, 7: 4, 8: 4, 9: 5}
    for y in range(163, 188):
        for x in range(40, 155):
            v = a[y, x]
            if 5 <= v <= 9:
                out[y, x] = soles[int(v)]
    return out

if __name__ == "__main__":
    a = back_base()
    doc = to_doc(master, "probe", [("p", 6, True, [a])])
    sheet(doc, 0, 4).save(ROOT / "output/robot-walk/back_probe.png")
