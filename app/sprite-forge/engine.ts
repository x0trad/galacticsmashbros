import {Buffer} from 'node:buffer';
// Pixel authoring and rendering reuse the local Sprite Forge MCP engine.
import * as F from './format.js';
// pngjs is the same renderer dependency as sprite-mcp.
// @ts-expect-error pngjs has no bundled declarations
import {PNG} from 'pngjs/browser.js';
import {directions, animationDirections, type AnimationKind, type Direction} from '../sprite-format';
import {alphabet, parseForgeDocument, type ForgeDocument, type ForgeFrame, type Rig, type Part} from './document';

export type PixelReference = {palette: string[]; rows: string[]};
export function renderPixelReference(reference: PixelReference): string {
  const sprite=F.newSprite({id:'full-body-reference',name:'Full-body pixel reference',width:64,height:64,palette:reference.palette});
  const frame=F.getFrame(sprite,'idle',0); frame.rows=reference.rows;
  return `data:image/png;base64,${F.renderFramePNG(sprite,frame,3).toString('base64')}`;
}
export function pixelReference(buffer: Uint8Array): PixelReference {
  const png = PNG.sync.read(Buffer.from(buffer), {checkCRC: true});
  if (png.width > 2048 || png.height > 2048) throw new Error('Use a full-body image no larger than 2048 pixels.');
  let x0 = png.width, y0 = png.height, x1 = 0, y1 = 0;
  const histogram = new Map<string, {rgb: number[]; count: number}>();
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const i = (y * png.width + x) * 4;
    if (png.data[i + 3] < 220) continue;
    x0 = Math.min(x0,x); y0 = Math.min(y0,y); x1 = Math.max(x1,x); y1 = Math.max(y1,y);
    if ((x + y) % 3) continue;
    const rgb = [png.data[i] >> 3 << 3, png.data[i+1] >> 3 << 3, png.data[i+2] >> 3 << 3];
    const key = rgb.join(','); const bin = histogram.get(key);
    if (bin) bin.count++; else histogram.set(key,{rgb,count:1});
  }
  if (x1 <= x0 || y1 <= y0 || histogram.size < 2) throw new Error('The approved image has no readable character.');
  // Weighted median cut preserves small, distinctive colours such as a chest core.
  const boxes = [[...histogram.values()]];
  const range = (box: typeof boxes[number], axis: number) => Math.max(...box.map(v=>v.rgb[axis])) - Math.min(...box.map(v=>v.rgb[axis]));
  while (boxes.length < 32) {
    let best = -1, score = -1, axis = 0;
    boxes.forEach((box,i)=> {if (box.length < 2) return; for(let a=0;a<3;a++){const r=range(box,a);if(r>score){best=i;score=r;axis=a;}}});
    if (best < 0) break;
    const box = boxes.splice(best,1)[0].sort((a,b)=>a.rgb[axis]-b.rgb[axis]);
    const total = box.reduce((n,b)=>n+b.count,0); let count=0,split=1;
    for(let i=0;i<box.length-1;i++){count+=box[i].count;split=i+1;if(count>=total/2)break;}
    boxes.push(box.slice(0,split),box.slice(split));
  }
  const palette = boxes.map(box => {const total=box.reduce((n,b)=>n+b.count,0);const rgb=[0,1,2].map(a=>Math.round(box.reduce((n,b)=>n+b.rgb[a]*b.count,0)/total));return F.rgbToHex(rgb[0],rgb[1],rgb[2]) as string;});
  const w=x1-x0+1,h=y1-y0+1,scale=Math.min(50/w,52/h),dw=Math.round(w*scale),dh=Math.round(h*scale),ox=Math.floor((64-dw)/2),oy=58-dh;
  const rows = F.blankRows(64,64).map((r:string)=>r.split(''));
  for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
    const sx=Math.min(x1,Math.floor(x0+(x+.5)/scale)),sy=Math.min(y1,Math.floor(y0+(y+.5)/scale)),i=(sy*png.width+sx)*4;
    if(png.data[i+3]>=220) rows[oy+y][ox+x]=alphabet[F.nearest(palette,F.rgbToHex(png.data[i],png.data[i+1],png.data[i+2]))];
  }
  return {palette,rows:rows.map((r:string[])=>r.join(''))};
}
function normalizedRows(rows: unknown, palette: string[]) {
  if (!Array.isArray(rows) || rows.length !== 64 || rows.some(r=>typeof r!=='string'||r.length>64)) throw new Error('Each facing view needs 64 pixel rows.');
  return rows.map(r=>r.padEnd(64,'.'));
}
export function createPixelMaster(reference: PixelReference, plan: unknown): ForgeDocument {
  const p = plan as {views: Array<{direction: Direction; rows: string[]}>; rigs: Array<Rig & {direction: Direction}>};
  if (!Array.isArray(p?.views) || !Array.isArray(p.rigs)) throw new Error('The sprite generator returned no pixel views.');
  const doc = F.newSprite({id:'custom-fighter',name:'Custom fighter',width:64,height:64,palette:reference.palette}) as unknown as ForgeDocument;
  doc.animations=[];
  doc.gsb={engine:'sprite-forge-pixels-v1',rigs:{} as Record<Direction,Rig>};
  for(const direction of directions){
    const rig=p.rigs.find(r=>r.direction===direction);if(!rig)throw new Error(`Missing ${direction} pixel rig.`);
    doc.gsb.rigs[direction]={head:rig.head,leftArm:rig.leftArm,rightArm:rig.rightArm,leftLeg:rig.leftLeg,rightLeg:rig.rightLeg};
    const rows=direction==='down'?reference.rows:normalizedRows(p.views.find(v=>v.direction===direction)?.rows,reference.palette);
    doc.animations.push({name:`idle-${direction}`,fps:6,loop:true,frames:Array.from({length:4},()=>({rows:[...rows],duration:1,hitboxes:[]}))});
  }
  parseForgeDocument(doc);
  return animatePixels(doc,'idle');
}
function pose(doc: ForgeDocument, base: ForgeFrame, rig: Rig, kind: AnimationKind, direction: Direction, frame: number): ForgeFrame {
  const out=structuredClone(base),g=F.grid(out),source=F.grid(base),phase=[-1,0,1,0][frame];
  const parts=(['leftLeg','rightLeg','leftArm','rightArm','head'] as const);
  // Cut the actual authored pixels, move the parts, then composite them again.
  for(const key of parts){const p=rig[key];F.rect(g,p.x,p.y,p.w,p.h,'.',doc,true,false);}
  for(const key of parts){
    const p=rig[key],left=key.startsWith('left'),leg=key.endsWith('Leg'),arm=key.endsWith('Arm');let dx=0,dy=0,extended=false;
    if(kind==='idle'){if(key==='head')dy=[0,-1,0,0][frame];if(arm)dy=[0,0,1,0][frame];}
    if(kind==='walk'){
      if(leg){dx=(direction==='left'||direction==='right'?3:1)*phase*(left?1:-1);dy=frame===1?(left?-2:0):frame===3?(left?0:-2):phase*(left?1:-1)<0?-1:0;}
      if(arm)dx=-phase*(left?1:-1);
      if(key==='head')dy=frame%2?-1:0;
    }
    if(kind==='punch'){
      if(leg){dx=(left?-1:1)*(frame===3?1:2);dy=left&&frame===2?-1:0;}
      const near=direction==='left'?(rig.leftArm.x<rig.rightArm.x?'leftArm':'rightArm'):(rig.leftArm.x>rig.rightArm.x?'leftArm':'rightArm');
      extended=key===near&&(frame===1||frame===2);
    }
    if(extended){
      // Rotate the original arm pixels around the shoulder so the fist reaches
      // horizontally, rather than moving a hanging arm away from the body.
      const sign=direction==='left'?-1:1,mid=Math.floor(p.w/2),ax=p.x+mid,ay=p.y+2;
      const reach=Math.min(p.h,sign<0?ax-4:59-ax)*(frame===2?.85:1);
      for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++){const c=source[p.y+y][p.x+x];if(c!=='.')F.setPx(g,ax+sign*Math.round((y+1)*reach/p.h),ay-sign*(x-mid),c,doc,false);}
      continue;
    }
    for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++){const c=source[p.y+y][p.x+x];if(c!=='.')F.setPx(g,p.x+x+dx,p.y+y+dy,c,doc,false);}
  }
  F.ungrid(out,g);
  out.hitboxes=[{kind:'hurt',x:22,y:18,w:20,h:39}];
  if(kind==='punch'&&(frame===1||frame===2))out.hitboxes.push({kind:'hit',x:direction==='left'?3:43,y:25,w:18,h:14});
  return out;
}
export function animatePixels(value: ForgeDocument, kind: AnimationKind): ForgeDocument {
  const doc=structuredClone(parseForgeDocument(value));
  const bases=Object.fromEntries(directions.map(d=>[d,structuredClone(doc.animations.find(a=>a.name===`idle-${d}`)!.frames[0])]));
  doc.animations=doc.animations.filter(a=>!a.name.startsWith(`${kind}-`));
  for(const direction of animationDirections(kind)) doc.animations.push({name:`${kind}-${direction}`,fps:kind==='idle'?6:8,loop:true,frames:[0,1,2,3].map(i=>pose(doc,bases[direction],doc.gsb.rigs[direction],kind,direction,i))});
  return parseForgeDocument(doc);
}
export function renderPixelSheet(value: ForgeDocument, kind: AnimationKind): string {
  const doc=parseForgeDocument(value), names=animationDirections(kind).map(d=>`${kind}-${d}`);
  const selected={...doc,animations:names.map(name=>doc.animations.find(a=>a.name===name)!)};
  const raw=PNG.sync.read(F.renderSheet(selected).png),out=new PNG({width:raw.width*3,height:raw.height*3});
  for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){const s=(Math.floor(y/3)*raw.width+Math.floor(x/3))*4,t=(y*out.width+x)*4;for(let c=0;c<4;c++)out.data[t+c]=raw.data[s+c];}
  return `data:image/png;base64,${PNG.sync.write(out).toString('base64')}`;
}
