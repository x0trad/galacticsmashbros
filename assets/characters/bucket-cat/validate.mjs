import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {PNG} from 'pngjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const native=PNG.sync.read(fs.readFileSync(path.join(root,'native/bucket-cat.png')));
const exported=PNG.sync.read(fs.readFileSync(path.join(root,'bucket-cat-sheet.png')));
assert.equal(native.width,256);assert.equal(native.height,640);assert.equal(exported.width,768);assert.equal(exported.height,1920);
for(let y=0;y<exported.height;y++)for(let x=0;x<exported.width;x++){
 const at=(y*exported.width+x)*4,source=(Math.floor(y/3)*native.width+Math.floor(x/3))*4;
 assert.deepEqual([...exported.data.subarray(at,at+4)],[...native.data.subarray(source,source+4)]);
}
const s=JSON.parse(fs.readFileSync(path.join(root,'bucket-cat.sprite.json'),'utf8'));
assert.equal(s.animations.reduce((n,a)=>n+a.frames.length,0),40);
for(const dir of ['left','right']){const a=s.animations.find(a=>a.name==='punch-'+dir);assert.equal(a.loop,false);assert.equal(new Set(a.frames.map(f=>f.rows.slice(50).join(''))).size,4,'Punch poses need moving legs');}
console.log('PASS: all 40 exported frames exactly match native Sprite Forge pixels at 3x; punches are non-looping with four leg poses.');
