#!/usr/bin/env python3
"""Local pixel cutout animation. No network, model, or API key required."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

def decode(project):
    im = Image.new('RGBA', (project['width'], project['height']))
    colours = [tuple(bytes.fromhex(c.lstrip('#'))) + (255,) for c in project['palette']]
    rows = project['animations'][0]['frames'][0]['rows']
    im.putdata([(0,0,0,0) if c == '.' else colours[ALPHABET.index(c)] for row in rows for c in row])
    return im

def generate(source, rig, out):
    project = json.loads(source.read_text())
    config = json.loads(rig.read_text())
    original = decode(project)
    body = original.copy()
    parts = []
    for part in config['parts']:
        box = tuple(part['box'])
        layer = Image.new('RGBA', original.size)
        layer.paste(original.crop(box), box[:2])
        parts.append((part, layer))
        body.paste((0,0,0,0), tuple(part['clear']))
    frames = []
    for pose in config['poses']:
        frame = Image.new('RGBA', original.size)
        for part, layer in parts:
            angle, dx, dy = pose[part['name']]
            moved = layer.rotate(angle, resample=Image.Resampling.NEAREST, center=tuple(part['pivot']))
            frame.alpha_composite(moved, (dx,dy))
        frame.alpha_composite(body)
        frames.append(frame)
    out.mkdir(parents=True, exist_ok=True)
    original.save(out/'master.png')
    sheet = Image.new('RGBA',(original.width*len(frames), original.height))
    lookup = {tuple(bytes.fromhex(c.lstrip('#')))+(255,): ALPHABET[i] for i,c in enumerate(project['palette'])}
    encoded = []
    for i, frame in enumerate(frames):
        frame.save(out/f'walk-down-{i+1}.png')
        sheet.paste(frame, (i*original.width,0))
        px = list(frame.getdata())
        rows = [''.join('.' if p[3]==0 else lookup[p] for p in px[y*original.width:(y+1)*original.width]) for y in range(original.height)]
        encoded.append({'rows':rows,'duration':1,'hitboxes':[]})
    sheet.save(out/'walk-down-sheet.png')
    project.update(id='robot-python-walk-study',name='Robot — local walk rig study',rev='python-rig-v1')
    project['animations']=[{'name':'walk-down','fps':config['fps'],'loop':True,'frames':encoded}]
    (out/'robot-python-walk-study.sprite.json').write_text(json.dumps(project,indent=2)+'\n')
    # GIF uses a shared palette; transparent index 0 preserves binary alpha.
    palette = [0,0,0] + [v for c in project['palette'] for v in bytes.fromhex(c.lstrip('#'))]
    palette += [0]*(768-len(palette))
    gifs=[]
    for frame in frames:
        p=Image.new('P',frame.size); p.putpalette(palette)
        p.putdata([0 if px[3]==0 else ALPHABET.index(lookup[px])+1 for px in frame.getdata()])
        gifs.append(p.resize((576,576),Image.Resampling.NEAREST))
    gifs[0].save(out/'walk-preview.gif',save_all=True,append_images=gifs[1:],duration=round(1000/config['fps']),loop=0,transparency=0,disposal=2)
    (out/'provenance.json').write_text(json.dumps({'method':'Pillow nearest-neighbour cutout rig','api_calls':0,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'rig':config,'scope':'Four front/down walk frames only; no invented side or back views.'},indent=2)+'\n')
    (out/'preview.html').write_text('''<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local robot walk proof</title><style>body{background:#14252d;color:#e9f8e3;font:16px system-ui;margin:32px}main{max-width:960px;margin:auto}.row{display:flex;flex-wrap:wrap;gap:24px}figure{margin:0;background:#213943;padding:16px;border-radius:16px}img{image-rendering:pixelated;max-width:100%}figcaption{margin-top:12px}a{color:#caff50}button{padding:12px;margin:16px 0}</style><main><h1>Robot · local walking proof</h1><p>Four front-facing frames, animated locally with Python. No generation API calls.</p><div class="row"><figure><img width="384" height="384" src="master.png"><figcaption>Approved master</figcaption></figure><figure><img id="walk" width="384" height="384" src="walk-down-1.png"><figcaption>Four-frame walk · 8 fps</figcaption></figure></div><button onclick="playing=!playing;this.textContent=playing?'Pause':'Play'">Pause</button><h2>All four poses</h2><img width="768" src="walk-down-sheet.png"><p><a href="robot-python-walk-study.sprite.json" download>Editable Sprite Forge project</a> · <a href="walk-down-sheet.png" download>PNG sheet</a></p><p>This is a cutout animation prototype. Only the front walk is ready for review; this is not a complete playable character.</p></main><script>let i=0,playing=true;setInterval(()=>{if(playing)document.querySelector('#walk').src=`walk-down-${(i++%4)+1}.png`},125)</script>''')
    return original, frames, project

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source',type=Path,default=ROOT/'assets/characters/robot-rig-study/master.sprite.json')
    p.add_argument('--rig',type=Path,default=ROOT/'assets/characters/robot-rig-study/walk-rig.json')
    p.add_argument('--out',type=Path,default=ROOT/'output/python-walk-study')
    a=p.parse_args(); generate(a.source,a.rig,a.out); print(a.out.resolve())
