import {directions} from '../sprite-format';
export const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export type PixelSource = {palette: string[]; rows: string[]};
export type ForgeFrame = {rows: string[]; duration: number; hitboxes: Array<{kind: 'hurt' | 'hit'; x: number; y: number; w: number; h: number}>};
export type ForgeDocument = {
  format: 'sprite-forge/1'; id: string; name: string; width: 64; height: 64; palette: string[];
  animations: Array<{name: string; fps: number; loop: boolean; frames: ForgeFrame[]}>;
  gsb: {engine: 'sprite-forge-author-v2'; style: 'chibi'};
};
export function parsePixelSource(value: unknown): PixelSource {
  const d = value as PixelSource;
  if (!d || !Array.isArray(d.palette) || d.palette.length < 2 || d.palette.length > 32 || d.palette.some(c => typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c))) throw new Error('Sprite Forge needs a palette of 2–32 colours.');
  if (!Array.isArray(d.rows) || d.rows.length !== 64 || d.rows.some(r => typeof r !== 'string' || r.length > 64)) throw new Error('Sprite Forge needs 64 pixel rows.');
  const rows = d.rows.map(r=>r.padEnd(64,'.'));
  if (rows.some(r=>[...r].some(c=>c!=='.'&&(alphabet.indexOf(c)<0||alphabet.indexOf(c)>=d.palette.length)))) throw new Error('The sprite contains pixels outside its palette.');
  const ink=rows.join('').replaceAll('.','').length;
  if(ink<100||ink>3200)throw new Error('The sprite has an empty frame or no transparent padding.');
  return {palette:d.palette.map(c=>c.toLowerCase()),rows};
}
export function parseForgeDocument(value: unknown): ForgeDocument {
  const d=value as ForgeDocument;
  if(!d||d.format!=='sprite-forge/1'||d.width!==64||d.height!==64||d.gsb?.engine!=='sprite-forge-author-v2'||d.gsb?.style!=='chibi'||!Array.isArray(d.animations)||d.animations.length>10)throw new Error('Generate a new Chibi character through Sprite Forge first.');
  const names=new Set<string>();
  for(const a of d.animations){
    if(!/^(idle|walk)-(down|left|right|up)$|^punch-(left|right)$/.test(a.name)||names.has(a.name)||!Array.isArray(a.frames)||a.frames.length!==4)throw new Error('The Sprite Forge animation layout is invalid.');
    names.add(a.name);
    for(const f of a.frames){f.rows=parsePixelSource({palette:d.palette,rows:f.rows}).rows;f.duration=1;f.hitboxes=[];}
  }
  for(const direction of directions)if(!names.has(`idle-${direction}`))throw new Error('The pixel character is missing a facing direction.');
  return d;
}
