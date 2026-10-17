import {directions, type Direction} from '../sprite-format';
export const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export type Part = {x: number; y: number; w: number; h: number};
export type Rig = {head: Part; leftArm: Part; rightArm: Part; leftLeg: Part; rightLeg: Part};
export type ForgeFrame = {rows: string[]; duration: number; hitboxes: Array<{kind: 'hurt' | 'hit'; x: number; y: number; w: number; h: number}>};
export type ForgeDocument = {
  format: 'sprite-forge/1'; id: string; name: string; width: 64; height: 64; palette: string[];
  animations: Array<{name: string; fps: number; loop: boolean; frames: ForgeFrame[]}>;
  gsb: {engine: 'sprite-forge-pixels-v1'; rigs: Record<Direction, Rig>};
};
export function parseForgeDocument(value: unknown): ForgeDocument {
  const d = value as ForgeDocument;
  if (!d || d.format !== 'sprite-forge/1' || d.width !== 64 || d.height !== 64 || d.gsb?.engine !== 'sprite-forge-pixels-v1' || !Array.isArray(d.palette) || d.palette.length < 2 || d.palette.length > 32 || d.palette.some(c => !/^#[0-9a-f]{6}$/i.test(c)) || !Array.isArray(d.animations) || d.animations.length > 10) throw new Error('Generate Sprite Forge idle frames first.');
  for (const direction of directions) {
    const rig = d.gsb.rigs?.[direction];
    if (!rig) throw new Error('The pixel character is missing its animation rig.');
    for (const key of ['head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'] as const) {
      const p = rig[key];
      if (!p || ![p.x,p.y,p.w,p.h].every(Number.isInteger) || p.x < 0 || p.y < 0 || p.w < 2 || p.h < 2 || p.x + p.w > 64 || p.y + p.h > 64) throw new Error('The pixel animation rig has invalid coordinates.');
    }
  }
  const names = new Set<string>();
  for (const a of d.animations) {
    if (!/^(idle|walk)-(down|left|right|up)$|^punch-(left|right)$/.test(a.name) || names.has(a.name) || !Array.isArray(a.frames) || a.frames.length !== 4) throw new Error('The pixel animation layout is invalid.');
    names.add(a.name);
    for (const f of a.frames) {
      if (!Array.isArray(f.rows) || f.rows.length !== 64 || f.rows.some(r => typeof r !== 'string' || r.length !== 64 || [...r].some(c => c !== '.' && (alphabet.indexOf(c) < 0 || alphabet.indexOf(c) >= d.palette.length)))) throw new Error('The sprite contains pixels outside its palette.');
      const ink = f.rows.join('').replaceAll('.', '').length;
      if (ink < 100 || ink > 3200) throw new Error('The sprite has an empty frame or no transparent padding.');
      f.duration = 1; f.hitboxes = Array.isArray(f.hitboxes) ? f.hitboxes.slice(0, 2) : [];
    }
  }
  for (const direction of directions) if (!names.has(`idle-${direction}`)) throw new Error('The pixel character is missing a facing direction.');
  return d;
}
