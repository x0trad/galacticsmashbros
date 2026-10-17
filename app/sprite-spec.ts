export type SpriteSpec = {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  face: string;
  outline: string;
  ears: 'none' | 'pointed' | 'floppy' | 'horns' | 'antenna';
  eyes: 'visor' | 'round' | 'slit';
  outfit: 'armor' | 'jacket' | 'robe';
  emblem: 'star' | 'bolt' | 'moon' | 'flame' | 'diamond';
  head: 'round' | 'square' | 'pointed';
};

const choices = {
  ears: ['none', 'pointed', 'floppy', 'horns', 'antenna'],
  eyes: ['visor', 'round', 'slit'],
  outfit: ['armor', 'jacket', 'robe'],
  emblem: ['star', 'bolt', 'moon', 'flame', 'diamond'],
  head: ['round', 'square', 'pointed'],
} as const;

export const spriteSpecSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'primary', 'secondary', 'accent', 'face', 'outline', 'ears', 'eyes', 'outfit', 'emblem', 'head'],
  properties: {
    name: {type: 'string'},
    primary: {type: 'string'},
    secondary: {type: 'string'},
    accent: {type: 'string'},
    face: {type: 'string'},
    outline: {type: 'string'},
    ears: {type: 'string', enum: choices.ears},
    eyes: {type: 'string', enum: choices.eyes},
    outfit: {type: 'string', enum: choices.outfit},
    emblem: {type: 'string', enum: choices.emblem},
    head: {type: 'string', enum: choices.head},
  },
} as const;

export function parseSpriteSpec(value: unknown): SpriteSpec {
  if (!value || typeof value !== 'object') throw new Error('Invalid character design.');
  const data = value as Record<string, unknown>;
  const color = (key: string) => {
    const candidate = data[key];
    if (typeof candidate !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(candidate)) throw new Error('Invalid character palette.');
    return candidate;
  };
  const pick = <K extends keyof typeof choices>(key: K): (typeof choices)[K][number] => {
    const candidate = data[key];
    if (typeof candidate !== 'string' || !(choices[key] as readonly string[]).includes(candidate)) throw new Error('Invalid character features.');
    return candidate as (typeof choices)[K][number];
  };
  if (typeof data.name !== 'string') throw new Error('Character name is missing.');
  const name = data.name.replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 24);
  if (!name) throw new Error('Character name is missing.');
  return {name, primary:color('primary'), secondary:color('secondary'), accent:color('accent'), face:color('face'), outline:color('outline'), ears:pick('ears'), eyes:pick('eyes'), outfit:pick('outfit'), emblem:pick('emblem'), head:pick('head')};
}
