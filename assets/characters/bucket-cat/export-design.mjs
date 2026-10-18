import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const s=JSON.parse(fs.readFileSync(path.join(root,'design-front.sprite.json'),'utf8'));
const chars='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
assert.equal(s.width,64);assert.equal(s.height,64);
const rows=s.animations[0].frames[0].rows;
assert.equal(rows.length,64);assert(rows.every(r=>r.length===64));
const native=PNG.sync.read(fs.readFileSync(path.join(root,'bucket-cat-idle-v1.png')));
const output=new PNG({width:192,height:192});
for(let y=0;y<64;y++)for(let x=0;x<64;x++){
 const c=rows[y][x],rgb=c==='.'?[0,0,0,0]:[...Buffer.from(s.palette[chars.indexOf(c)].slice(1),'hex'),255];
 const at=(y*64+x)*4;
 assert.deepEqual([...native.data.subarray(at,at+4)],rgb,'Native MCP render must match project');
 if(x===0||y===0||x===63||y===63)assert.equal(c,'.','Character needs transparent canvas margin');
 for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)output.data.set(rgb,((y*3+dy)*192+x*3+dx)*4);
}
fs.writeFileSync(path.join(root,'bucket-cat-idle-192.png'),PNG.sync.write(output));
fs.writeFileSync(path.join(root,'design-preview.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bucket Cat · character study</title><style>*{box-sizing:border-box}body{margin:0;padding:32px 20px;background:#15252d;color:#f5f2df;font:16px system-ui}main{max-width:1000px;margin:auto}h1{margin-bottom:8px}p{color:#b9ccc8;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin:24px 0}figure{margin:0;border:1px solid #48616a;border-radius:14px;padding:20px;background:#20343b}img{max-width:100%;height:auto;display:block;margin:auto}.pixel{image-rendering:pixelated;background:repeating-conic-gradient(#294049 0% 25%,#23373f 0% 50%) 0/24px 24px;border-radius:8px}figcaption{margin-top:16px;color:#c6d5cc}a{color:#d1ff63}</style><main><h1>Bucket Cat · full-body idle design</h1><p>First design for review. Green fish hat, orange/white face and pink tank top. Shorts and high-tops complete the cropped reference.</p><div class="grid"><figure><img src="reference.webp" width="384"><figcaption>Your reference</figcaption></figure><figure><img class="pixel" src="bucket-cat-idle-192.png" width="384" height="384"><figcaption>Enlarged pixel view · still pose</figcaption></figure><figure><img class="pixel" src="bucket-cat-idle-192.png" width="192" height="192"><figcaption>192×192 export</figcaption><h3>Taiyu scale comparison</h3><img class="pixel" src="../taiyu/frames/DOWN_IDLE_Taiyu/taiyu-idle-down-1.png" width="192" height="192"></figure></div><p>Native 64×64 Sprite Forge artwork, exported at exact 3× like Taiyu. Transparent PNG. No generated animation or live roster changes yet.</p><a href="bucket-cat.sprite.json" download>Editable Sprite Forge file</a> · <a href="bucket-cat-idle-192.png" download>192×192 PNG</a></main></html>`);
console.log('PASS: MCP PNG matches editable rows; transparent margins; crisp 192×192 RGBA export.');
