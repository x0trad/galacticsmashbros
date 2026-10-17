import type {SpriteSpec} from './sprite-spec';

export const customSpriteStorageKey = 'gsb-custom-sprite-v1';
export const spriteDirections = ['down', 'up', 'left', 'right'] as const;
export const spriteActions = ['idle', 'walk', 'punch'] as const;
type Direction = (typeof spriteDirections)[number];
type Action = (typeof spriteActions)[number];

function paint(spec: SpriteSpec, action: Action, direction: Direction, frame: number): HTMLCanvasElement {
  const tiny = document.createElement('canvas');
  tiny.width = tiny.height = 48;
  const ctx = tiny.getContext('2d', {alpha:true})!;
  ctx.imageSmoothingEnabled = false;
  const side = direction === 'left' || direction === 'right';
  const back = direction === 'up';
  const stride = action === 'walk' ? [0, 2, 0, -2][frame - 1] : action === 'punch' ? [-2, 2, -2, 2][frame - 1] : 0;
  const bob = action === 'walk' && frame % 2 === 0 ? 1 : action === 'idle' && frame === 3 ? -1 : 0;
  const punching = action === 'punch' && frame >= 2;
  const box = (x:number,y:number,w:number,h:number,color:string) => {ctx.fillStyle=color;ctx.fillRect(x,y+bob,w,h)};
  const outline = spec.outline;
  ctx.save();
  if (direction === 'left') {ctx.translate(48,0);ctx.scale(-1,1)}

  // A single pixel-grid silhouette keeps all forty poses on the same anchor.
  if (side) {
    box(17,35,8,10+Math.max(0,stride),outline);box(26,35,8,10+Math.max(0,-stride),outline);
    box(19,36,5,7+Math.max(0,stride),spec.secondary);box(28,36,5,7+Math.max(0,-stride),spec.secondary);
    box(15,43+Math.max(0,stride),11,3,outline);box(27,43+Math.max(0,-stride),11,3,outline);
  } else {
    const spread = Math.abs(stride);
    box(14-spread,35,9,10,outline);box(26+spread,35,9,10,outline);
    box(16-spread,36,6,7,spec.secondary);box(28+spread,36,6,7,spec.secondary);
    box(12-spread,43,12,3,outline);box(25+spread,43,12,3,outline);
  }
  if (spec.outfit === 'robe') {box(10,28,28,13,outline);box(12,29,24,10,spec.primary)}
  box(side?14:11,22,side?23:26,16,outline);
  box(side?16:13,24,side?19:22,11,spec.primary);
  if(spec.outfit === 'armor') {box(14,25,20,8,spec.secondary);box(16,26,16,5,spec.primary);box(13,32,22,3,spec.accent)}
  if(spec.outfit === 'jacket') {box(22,24,4,11,spec.secondary);box(15,34,19,3,spec.accent)}
  if(spec.outfit === 'robe') {box(22,24,4,13,spec.accent)}
  // Arms move opposite the legs; side punches extend forward for a readable hit pose.
  if(side) {
    box(10,24,7,12,outline);box(11,26,5,8,spec.primary);
    if(punching){box(32,24,14,7,outline);box(34,25,11,5,spec.secondary);box(44,23,4,10,outline);box(44,25,4,6,spec.accent)}
    else {box(32,24+Math.max(0,stride),7,12,outline);box(33,26+Math.max(0,stride),5,8,spec.primary);box(33,35+Math.max(0,stride),7,3,spec.accent)}
  } else {
    for (const x of [7,35]) {box(x,24,7,13,outline);box(x+1,26,5,9,spec.primary);box(x,35,7,3,spec.accent)}
  }
  // Head silhouette, selected by Astra from the reference artwork.
  const headX=side?14:12;
  box(headX,8,side?23:24,17,outline);
  box(headX+2,10,side?19:20,13,spec.face);
  if(spec.head==='round'){box(headX+3,6,side?17:18,3,outline);box(headX+5,5,side?13:14,2,spec.primary)}
  if(spec.head==='square'){box(headX+1,6,side?21:22,3,outline);box(headX+3,7,side?17:18,2,spec.primary)}
  if(spec.head==='pointed'){box(headX+4,5,side?15:16,4,outline);box(headX+7,3,side?9:10,3,spec.primary)}
  if(spec.ears==='pointed'){box(headX-2,2,6,8,outline);box(headX+19,2,6,8,outline);box(headX,4,3,5,spec.secondary);box(headX+21,4,3,5,spec.secondary)}
  if(spec.ears==='floppy'){box(headX-4,9,5,13,outline);box(headX+23,9,5,13,outline);box(headX-2,11,3,9,spec.secondary);box(headX+23,11,3,9,spec.secondary)}
  if(spec.ears==='horns'){box(headX-1,3,5,8,outline);box(headX+19,3,5,8,outline);box(headX,4,3,5,spec.accent);box(headX+20,4,3,5,spec.accent)}
  if(spec.ears==='antenna'){box(headX+10,1,3,8,outline);box(headX+9,0,5,3,spec.accent)}
  if(back){
    box(headX+4,12,side?15:16,9,spec.primary);
    box(headX+9,13,6,7,spec.secondary);
  }else if(spec.eyes==='visor'){
    box(headX+3,13,side?17:18,6,outline);box(headX+4,14,side?15:16,4,spec.accent);
    box(headX+5,14,4,1,'#ffffff');
  }else{
    const first=side?headX+12:headX+5,second=side?headX+17:headX+16;
    box(first,14,3,spec.eyes==='slit'?2:4,outline);box(second,14,3,spec.eyes==='slit'?2:4,outline);
    box(first,14,2,2,spec.accent);box(second,14,2,2,spec.accent);
    box(headX+9,21,7,2,outline);
  }
  box(headX+4,9,side?15:16,2,spec.primary);
  if(!back){
    const x=side?25:23,y=28;
    if(spec.emblem==='star'){box(x,y-2,2,9,spec.accent);box(x-3,y+1,8,2,spec.accent)}
    if(spec.emblem==='bolt'){box(x+1,y-2,3,3,spec.accent);box(x-1,y+1,4,3,spec.accent);box(x-3,y+4,3,3,spec.accent)}
    if(spec.emblem==='moon'){box(x-2,y-1,7,7,spec.accent);box(x+1,y-2,5,5,spec.primary)}
    if(spec.emblem==='flame'){box(x,y-2,3,3,spec.accent);box(x-2,y+1,7,5,spec.accent)}
    if(spec.emblem==='diamond'){box(x,y-2,3,2,spec.accent);box(x-2,y,7,3,spec.accent);box(x,y+3,3,2,spec.accent)}
  }
  ctx.restore();
  const full=document.createElement('canvas');full.width=full.height=192;
  const output=full.getContext('2d',{alpha:true})!;output.imageSmoothingEnabled=false;
  output.drawImage(tiny,0,0,192,192);
  return full;
}

export function spriteFrameUrl(spec:SpriteSpec,action:Action,direction:Direction,frame:number){
  return paint(spec,action,direction,frame).toDataURL('image/png');
}

export async function loadCustomSpriteFrames(spec:SpriteSpec){
  const map=new Map<string,HTMLImageElement>();
  await Promise.all(spriteActions.flatMap(action=>(action==='punch'?(['left','right'] as const):spriteDirections).flatMap(dir=>[1,2,3,4].map(async frame=>{
    const image=new Image();image.src=spriteFrameUrl(spec,action,dir,frame);await image.decode();map.set(`custom-${action}-${dir}-${frame}`,image);
  }))));
  return map;
}
