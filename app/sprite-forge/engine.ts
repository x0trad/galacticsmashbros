// Executes Sprite Forge set_frame, edit_animation, duplicate and draw operations.
import * as F from './format.js';
// @ts-expect-error pngjs has no bundled declarations
import {PNG} from 'pngjs/browser.js';
import {directions, animationDirections, type AnimationKind, type Direction} from '../sprite-format';
import {alphabet, parsePixelSource, parseForgeDocument, type PixelSource, type ForgeDocument, type ForgeFrame} from './document';
export type PixelPatch = {x: number; y: number; pixels: string};
export type AnimationPlan = {views: Array<{direction: Direction; rows: string[]}>; frames: Array<{direction: Direction; frame: number; patches: PixelPatch[]}>};
function setFrame(source: PixelSource) {
  const valid=parsePixelSource(source),sprite=F.newSprite({id:'chibi-fighter',name:'Chibi fighter',width:64,height:64,palette:valid.palette});
  F.getFrame(sprite,'idle',0).rows=valid.rows;
  return sprite;
}
export function renderPixelReference(value: PixelSource): string {
  const sprite=setFrame(value);
  return `data:image/png;base64,${F.renderFramePNG(sprite,F.getFrame(sprite,'idle',0),3).toString('base64')}`;
}
export function authorAnimation(source: PixelSource, value: unknown, kind: AnimationKind, previous?: ForgeDocument): ForgeDocument {
  const master=parsePixelSource(source),plan=value as AnimationPlan;
  if(!Array.isArray(plan?.views)||!Array.isArray(plan.frames)||plan.views.length>3||plan.frames.length!==animationDirections(kind).length*4)throw new Error('Sprite Forge did not finish all four animation frames. Retry this step.');
  const doc: ForgeDocument=previous?structuredClone(parseForgeDocument(previous)):{format:'sprite-forge/1',id:'chibi-fighter',name:'Chibi fighter',width:64,height:64,palette:master.palette,animations:[],gsb:{engine:'sprite-forge-author-v2',style:'chibi'}};
  const bases=new Map<Direction,string[]>();
  if(kind==='idle'){
    if(plan.views.length!==3||new Set(plan.views.map(v=>v.direction)).size!==3||plan.views.some(v=>!['left','right','up'].includes(v.direction)))throw new Error('Sprite Forge needs three distinct facing views.');
    bases.set('down',master.rows);
    for(const view of plan.views)bases.set(view.direction,parsePixelSource({palette:master.palette,rows:view.rows}).rows);
  } else for(const direction of directions)bases.set(direction,doc.animations.find(a=>a.name===`idle-${direction}`)!.frames[0].rows);
  const keys=new Set<string>();
  doc.animations=doc.animations.filter(a=>!a.name.startsWith(`${kind}-`));
  for(const direction of animationDirections(kind)){
    const frames: ForgeFrame[]=[];
    for(let frame=0;frame<4;frame++){
      const matches=plan.frames.filter(f=>f.direction===direction&&f.frame===frame);
      if(matches.length!==1)throw new Error('Sprite Forge returned duplicate or missing frame commands.');
      const commands=matches[0];keys.add(`${direction}-${frame}`);
      if(!Array.isArray(commands.patches)||commands.patches.length>192)throw new Error('Too many pixel drawing commands.');
      // The equivalent of edit_frames(duplicate), then draw(pixel) for every patch.
      const out: ForgeFrame={rows:[...bases.get(direction)!],duration:1,hitboxes:[]},grid=F.grid(out);
      for(const patch of commands.patches){
        if(!Number.isInteger(patch.x)||!Number.isInteger(patch.y)||patch.x<0||patch.x>=64||patch.y<0||patch.y>=64||typeof patch.pixels!=='string'||!patch.pixels.length||patch.pixels.length>96||[...patch.pixels].some(c=>c!=='.'&&(alphabet.indexOf(c)<0||alphabet.indexOf(c)>=doc.palette.length)))throw new Error('A Sprite Forge draw command is outside the pixel canvas or palette.');
        for(let x=0;x<patch.pixels.length;x++)F.setPx(grid,patch.x+x,patch.y,patch.pixels[x],doc,false);
      }
      F.ungrid(out,grid);out.rows=parsePixelSource({palette:doc.palette,rows:out.rows}).rows;frames.push(out);
    }
    if(new Set(frames.map(f=>f.rows.join(''))).size<3)throw new Error(`The ${kind} ${direction} animation needs at least three distinct poses. Retry this step.`);
    doc.animations.push({name:`${kind}-${direction}`,fps:kind==='idle'?6:8,loop:true,frames});
  }
  return parseForgeDocument(doc);
}
export function renderPixelSheet(value: ForgeDocument, kind: AnimationKind): string {
  const doc=parseForgeDocument(value),names=animationDirections(kind).map(d=>`${kind}-${d}`);
  const raw=PNG.sync.read(F.renderSheet({...doc,animations:names.map(name=>doc.animations.find(a=>a.name===name)!)}).png),out=new PNG({width:raw.width*3,height:raw.height*3});
  for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){const s=(Math.floor(y/3)*raw.width+Math.floor(x/3))*4,t=(y*out.width+x)*4;for(let c=0;c<4;c++)out.data[t+c]=raw.data[s+c];}
  return `data:image/png;base64,${PNG.sync.write(out).toString('base64')}`;
}
