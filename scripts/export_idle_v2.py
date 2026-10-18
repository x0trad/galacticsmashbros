"""Render output/robot-idle-v2 (from create_idle_v2.mjs) into reviewable assets.
Exact palette lookup, no resampling; binary alpha. Zero network calls.
Usage: node scripts/create_idle_v2.mjs && python3 -I scripts/export_idle_v2.py
"""
import base64, io, json, pathlib
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
ALPHA = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
doc = json.loads((root / "output/robot-idle-v2/robot-idle-v2.sprite.json").read_text())
anim = doc["animations"][0]
pal = [tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,) for c in doc["palette"]]
W, H, n = doc["width"], doc["height"], len(anim["frames"])
sheet = Image.new("RGBA", (W * n, H), (0, 0, 0, 0))
for i, f in enumerate(anim["frames"]):
    px = sheet.load()
    for y, row in enumerate(f["rows"]):
        for x, ch in enumerate(row):
            if ch != ".":
                px[i * W + x, y] = pal[ALPHA.index(ch)]
out = root / "assets/characters/robot-rig-study/idle-v2"
out.mkdir(parents=True, exist_ok=True)
sheet.save(out / "robot-idle-v2.png", optimize=True)
(out / "robot-idle-v2.sprite.json").write_text(json.dumps(doc, indent=2) + "\n")
ms = round(1000 / anim["fps"])
atlas = {"frames": {f"idle-down_{i}": {"frame": {"x": i * W, "y": 0, "w": W, "h": H}, "duration": ms, "hitboxes": []} for i in range(n)},
         "meta": {"image": "robot-idle-v2.png", "size": {"w": W * n, "h": H}, "animations": {"idle-down": {"fps": anim["fps"], "loop": True, "frames": [f"idle-down_{i}" for i in range(n)]}}}}
(out / "robot-idle-v2.atlas.json").write_text(json.dumps(atlas, indent=1) + "\n")
buf = io.BytesIO(); sheet.save(buf, "PNG")
b64 = base64.b64encode(buf.getvalue()).decode()
html = f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Robot idle v2</title>
<style>body{{background:#172c35;color:#e9f4e0;font:16px system-ui;text-align:center;padding:24px}}
.row{{display:flex;gap:28px;justify-content:center;align-items:flex-end;flex-wrap:wrap;margin:18px 0}}
.s{{background:#10202a;border:1px solid #365061;image-rendering:pixelated;background-image:url(data:image/png;base64,{b64});background-repeat:no-repeat;animation:play {n/anim['fps']}s steps(1) infinite}}
@keyframes play{{{''.join(f'{i*100//n}%{{background-position:-{i*W}px 0}}' for i in range(n))}100%{{background-position:0 0}}}}
.strip{{image-rendering:pixelated;max-width:100%;height:auto}}
button{{background:#1d3a46;color:#e9f4e0;border:1px solid #4d7184;padding:8px 14px;font:inherit;cursor:pointer}}
small{{display:block;color:#9ab5bd;margin-top:6px}}</style>
<h1>Robot idle v2 · breathing + reactor pulse</h1>
<p>Four frames, {anim['fps']} fps, 192 × 192. Feet planted; upper body rises and settles; reactor and visor pulse; cables flutter.</p>
<div class="row"><div><div class="s" id="a" style="width:{W}px;height:{H}px"></div><small>1× (192)</small></div>
<div><div class="s" id="b" style="width:{W}px;height:{H}px;zoom:.6"></div><small>~game size</small></div>
<div><div class="s" id="c" style="width:{W}px;height:{H}px;zoom:2.2"></div><small>2.2× inspect</small></div></div>
<p><button onclick="t()">Pause / play</button></p>
<img class="strip" src="data:image/png;base64,{b64}" width="{W*n}"><small>All four frames</small>
<script>let p=false;function t(){{p=!p;document.querySelectorAll('.s').forEach(e=>e.style.animationPlayState=p?'paused':'running')}}</script>"""
(out / "preview.html").write_text(html)
print("exported", out)
