// Lossless 3x export of the editable Sprites MCP document. Node built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
const source=JSON.parse(fs.readFileSync(path.join(root,'taiyu.sprite.json'),'utf8'));
const chars='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const scale=3,size=192;
const order=['idle-down','walk-down','idle-left','walk-left','idle-right','walk-right','idle-up','walk-up','punch-left','punch-right'];
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function chunk(type,data){const t=Buffer.from(type);let crc=0xffffffff;for(const b of Buffer.concat([t,data]))crc=crcTable[(crc^b)&255]^(crc>>>8);const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length,0);t.copy(out,4);data.copy(out,8);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out}
function png(w,h,pixels){const header=Buffer.alloc(13);header.writeUInt32BE(w,0);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;const scan=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++)pixels.copy(scan,y*(w*4+1)+1,y*w*4,(y+1)*w*4);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))])}
function pixels(rows){const b=Buffer.alloc(size*size*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const c=rows[y][x];if(c==='.')continue;const hex=source.palette[chars.indexOf(c)];assert(hex,'Valid palette index');const col=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));for(let sy=0;sy<scale;sy++)for(let sx=0;sx<scale;sx++){const o=((y*scale+sy)*size+x*scale+sx)*4;b[o]=col[0];b[o+1]=col[1];b[o+2]=col[2];b[o+3]=255}}return b}
assert.equal(source.width,64);assert.equal(source.height,64);assert.equal(source.animations.length,10);
const sheet=Buffer.alloc(size*4*size*10*4),atlas={frames:{},meta:{image:'taiyu-sheet.png',size:{w:768,h:1920},frameSize:{w:192,h:192},scale:3,frameTags:[]}};
let count=0;
for(const [ai,name] of order.entries()){
 const a=source.animations.find(a=>a.name===name);assert(a,`Missing ${name}`);assert.equal(a.frames.length,4);assert.equal(new Set(a.frames.map(f=>f.rows.join('\n'))).size,4,`${name} requires 4 distinct poses`);
 const [action,dir]=name.split('-'),folder=`${dir.toUpperCase()}_${action.toUpperCase()}_Taiyu`;fs.mkdirSync(path.join(root,'frames',folder),{recursive:true});
 for(const [fi,f] of a.frames.entries()){
  assert.equal(f.rows.length,64);for(const row of f.rows)assert.equal(row.length,64);
  assert(f.rows[0].split('').every(c=>c==='.')&&f.rows[63].split('').every(c=>c==='.'),'Vertical padding');assert(f.rows.every(row=>row[0]==='.'&&row[63]==='.'),'Horizontal padding');
  const data=pixels(f.rows),filename=`taiyu-${name}-${fi+1}.png`;
  fs.writeFileSync(path.join(root,'frames',folder,filename),png(size,size,data));
  for(let y=0;y<size;y++)data.copy(sheet,((ai*size+y)*size*4+fi*size)*4,y*size*4,(y+1)*size*4);
  atlas.frames[filename]={frame:{x:fi*size,y:ai*size,w:size,h:size},duration:Math.round(1000/a.fps),rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:size,h:size},sourceSize:{w:size,h:size}};count++;
 }
 atlas.meta.frameTags.push({name,from:ai*4,to:ai*4+3,direction:'forward',loop:a.loop,fps:a.fps});
}
fs.writeFileSync(path.join(root,'taiyu-sheet.png'),png(768,1920,sheet));fs.writeFileSync(path.join(root,'taiyu-atlas.json'),JSON.stringify(atlas,null,2)+'\n');
fs.writeFileSync(path.join(root,'preview.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Taiyu — animation preview</title><style>body{margin:0;padding:24px;background:#111b24;color:#e8eee2;font:15px system-ui}h1{margin:0 0 8px}p{color:#a8bbb9}button{padding:10px 18px;background:#caff60;color:#142021;border:0;cursor:pointer;border-radius:6px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(216px,1fr));gap:16px;margin-top:24px}article{border:1px solid #40545c;border-radius:8px;padding:12px;text-align:center}h2{font-size:15px;text-transform:uppercase}.sprite{width:192px;height:192px;margin:auto;image-rendering:pixelated;background-image:url(taiyu-sheet.png);background-repeat:no-repeat}.tile{background:repeating-conic-gradient(#22353c 0% 25%,#1c2d34 0% 50%) 0 /24px 24px;border-radius:6px}small{color:#b0c7bb}button:focus-visible{outline:3px solid white}</style><h1>Taiyu</h1><p>40 transparent PNGs · 192 × 192 pixels · 4 frames per animation</p><button id="toggle">Pause animations</button><p>Punch previews repeat for inspection; exported punch animations are non-looping.</p><main>${order.map((name,i)=>`<article><h2>${name.replace('-',' · ')}</h2><div class="tile"><div class="sprite" data-row="${i}" data-fps="${source.animations.find(a=>a.name===name).fps}"></div></div><small>${source.animations.find(a=>a.name===name).fps} fps</small></article>`).join('')}</main><script>let playing=true,t=0,last=0;const sprites=[...document.querySelectorAll('.sprite')];document.querySelector('#toggle').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pause animations':'Play animations'};function tick(now){if(last&&playing)t+=Math.min(now-last,100);last=now;for(const s of sprites){let f=Math.floor(t/1000*Number(s.dataset.fps))%4;s.style.backgroundPosition=(-f*192)+'px '+(-Number(s.dataset.row)*192)+'px'}requestAnimationFrame(tick)}requestAnimationFrame(tick);</script></html>`);
console.log(`PASS: ${count} distinct, padded RGBA frames exported at 192x192; 10 animations; sheet and atlas agree.`);

