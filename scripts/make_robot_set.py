"""Robot front+back set: idle-down (from idle-v2), walk-down, idle-up, walk-up. Zero API calls.
Usage: python3 -I scripts/make_robot_set.py   -> assets/characters/robot-rig-study/set-v1/
"""
import sys, json, base64, io, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from robot_anim import *
import make_back
from PIL import Image

master, front = load_master()
back = make_back.back_base()

def mir(box):  # mirror an x-band for the back view
    return (W - box[1], W - box[0])

def walk(base, back_view):
    LEG_L, LEG_R, ARM_L, ARM_R = (48, 96), (99, 148), (28, 57), (137, 166)
    if back_view:
        LEG_L, LEG_R, ARM_L, ARM_R = mir(LEG_L), mir(LEG_R), mir(ARM_L), mir(ARM_R)
        # after mirroring, the band that was "left leg" is now on the right: keep screen-left/right naming by swapping
        LEG_L, LEG_R, ARM_L, ARM_R = LEG_R, LEG_L, ARM_R, ARM_L
    SEAM_LEG, SEAM_ARM, UP = 160, 127, (122, 131)

    def breathe(a, total):
        for seam, share in sorted(zip(UP, (total // 2, total - total // 2)), reverse=True):
            if share:
                a = band_bob(a, 0, W, 0, seam, share)
        return a

    def pose(lift_l=0, lift_r=0, arm_l=0, arm_r=0, body=0, dx=0):
        a = base.copy()
        a = band_lift(a, *LEG_L, SEAM_LEG, lift_l)
        a = band_lift(a, *LEG_R, SEAM_LEG, lift_r)
        a = band_shift_below(a, *ARM_L, SEAM_ARM, arm_l, y_end=156)
        a = band_shift_below(a, *ARM_R, SEAM_ARM, arm_r, y_end=156)
        a = breathe(a, body)
        return sway(a, 0, 131, dx)

    return [pose(lift_l=9, arm_r=3, arm_l=-2, body=-1, dx=1), pose(body=2),
            pose(lift_r=9, arm_l=3, arm_r=-2, body=-1, dx=-1), pose(body=2)]

def idle_back(base):
    UP = (122, 131)
    wire = [0, 1, 1, 0]
    frames = []
    for total, wy in zip([-2, 0, 2, 0], wire):
        a = base.copy()
        for seam, share in sorted(zip(UP, (total // 2, total - total // 2)), reverse=True):
            if share:
                a = band_bob(a, 0, W, 0, seam, share)
        if wy:  # flutter the loose cable pixels (mirrored box), colour ramps as in the front idle
            x0, x1 = W - 178, W - 152
            cols = [(x, y, int(a[y, x])) for y in range(70, 113) for x in range(x0, x1 + 1)
                    if a[y, x] >= 0 and (19 <= a[y, x] <= 21 or 31 <= a[y, x] <= 34 or a[y, x] in (41, 42) or 25 <= a[y, x] <= 27)]
            for x, y, _ in cols: a[y, x] = EMPTY
            for x, y, c in cols:
                a[y + wy if a[y + wy, x] < 0 else y, x] = c
        frames.append(a)
    return frames

idle_down_doc = json.loads((ROOT / "assets/characters/robot-rig-study/idle-v2/robot-idle-v2.sprite.json").read_text())
idle_down = [rows_to_arr(f["rows"]) for f in idle_down_doc["animations"][0]["frames"]]

anims = [
    ("idle-down", 6, True, idle_down),
    ("walk-down", 8, True, walk(front, False)),
    ("idle-up", 6, True, idle_back(back)),
    ("walk-up", 8, True, walk(back, True)),
]

if __name__ == "__main__":
    doc = to_doc(master, "robot-set-v1", anims)
    doc["name"] = "Robot set v1 — front + back idle/walk"
    out = ROOT / "assets/characters/robot-rig-study/set-v1"
    out.mkdir(parents=True, exist_ok=True)
    (out / "robot-set-v1.sprite.json").write_text(json.dumps(doc, indent=1) + "\n")
    n = 4
    sheet_img = Image.new("RGBA", (W * n, H * len(anims)), (0, 0, 0, 0))
    atlas = {"frames": {}, "meta": {"image": "robot-set-v1.png", "size": {"w": W * n, "h": H * len(anims)}, "animations": {}}}
    for r, (name, fps, loop, frames) in enumerate(anims):
        names = []
        for i in range(n):
            sheet_img.alpha_composite(render(doc, r, i), (i * W, r * H))
            fn = f"{name}_{i}"
            names.append(fn)
            atlas["frames"][fn] = {"frame": {"x": i * W, "y": r * H, "w": W, "h": H}, "duration": round(1000 / fps), "hitboxes": []}
        atlas["meta"]["animations"][name] = {"fps": fps, "loop": loop, "frames": names}
    sheet_img.save(out / "robot-set-v1.png", optimize=True)
    (out / "robot-set-v1.atlas.json").write_text(json.dumps(atlas, indent=1) + "\n")
    buf = io.BytesIO(); sheet_img.save(buf, "PNG"); b64 = base64.b64encode(buf.getvalue()).decode()
    cells = ""
    for r, (name, fps, loop, frames) in enumerate(anims):
        cells += (f'<div class="c"><div class="s" style="width:{W}px;height:{H}px;background-position:0 -{r*H}px;'
                  f'animation:p{r} {n/fps}s steps(1) infinite"></div><small>{name} · {fps} fps</small></div>')
    kf = "".join(f"@keyframes p{r}{{" + "".join(f"{i*100//n}%{{background-position:-{i*W}px -{r*H}px}}" for i in range(n)) + f"100%{{background-position:0 -{r*H}px}}}}" for r in range(len(anims)))
    html = f"""<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Robot set v1</title>
<style>body{{background:#172c35;color:#e9f4e0;font:15px system-ui;text-align:center;padding:20px}}.row{{display:flex;gap:18px;justify-content:center;flex-wrap:wrap}}
.c{{background:#10202a;border:1px solid #365061;padding:10px}}.s{{image-rendering:pixelated;background-image:url(data:image/png;base64,{b64});background-repeat:no-repeat}}
small{{display:block;margin-top:6px;color:#9ab5bd}}button{{background:#1d3a46;color:#e9f4e0;border:1px solid #4d7184;padding:8px 14px;font:inherit;cursor:pointer}}{kf}</style>
<h1>Robot set v1 · front and back</h1><p>Idle and walk, authored as pixel-row edits of the master. Left/right views are not drawn yet.</p>
<div class=row>{cells}</div><p><button onclick="t()">Pause / play</button></p>
<img src="data:image/png;base64,{b64}" style="image-rendering:pixelated;max-width:100%"><small>Full sheet: 4 frames × 4 animations</small>
<script>let p=false;function t(){{p=!p;document.querySelectorAll('.s').forEach(e=>e.style.animationPlayState=p?'paused':'running')}}</script>"""
    (out / "preview.html").write_text(html)
    sheet(doc, 3, 2).save(ROOT / "output/robot-walk/walk-up-sheet.png")
    sheet(doc, 2, 2).save(ROOT / "output/robot-walk/idle-up-sheet.png")
    print("ok", out)
