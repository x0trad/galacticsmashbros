export const animationKinds = ['idle', 'walk', 'punch'] as const;
export type AnimationKind = typeof animationKinds[number];
export type GenerationStage = 'fullbody' | AnimationKind;
export const directions = ['down', 'left', 'right', 'up'] as const;
export type Direction = typeof directions[number];
export const animationDirections = (kind: AnimationKind): readonly Direction[] => kind === 'punch' ? ['left', 'right'] : directions;
export const frameKey = (kind: AnimationKind, direction: Direction, frame: number) => `${kind}-${direction}-${frame}`;
export const frameKeys = animationKinds.flatMap(kind => animationDirections(kind).flatMap(direction => [1, 2, 3, 4].map(frame => frameKey(kind, direction, frame))));
export type SpriteSheets = Partial<Record<AnimationKind, string>>;
export type SpriteDraft = {version: 2; name: string; fullBody: string; approved: boolean; sheets: SpriteSheets};
export type GeneratedFighter = {version: 2; name: string; fullBody: string; frames: Record<string, string>};
export function cleanCharacterName(value: unknown) {
  return String(value || '').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 24) || 'MY FIGHTER';
}
export function isPngData(value: unknown): value is string {
  return typeof value === 'string' && value.length < 24_000_000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value);
}
export function parseFighter(value: unknown): GeneratedFighter {
  const data = value as GeneratedFighter | null;
  if (!data || data.version !== 2 || !isPngData(data.fullBody) || !data.frames || frameKeys.some(key => !isPngData(data.frames[key]))) throw new Error('This fighter is missing animation frames.');
  return {version: 2, name: cleanCharacterName(data.name), fullBody: data.fullBody, frames: Object.fromEntries(frameKeys.map(key => [key, data.frames[key]]))};
}
export function parseDraft(value: unknown): SpriteDraft | null {
  const data = value as SpriteDraft | null;
  if (!data || data.version !== 2 || !isPngData(data.fullBody)) return null;
  return {version: 2, name: cleanCharacterName(data.name), fullBody: data.fullBody, approved: data.approved === true, sheets: Object.fromEntries(animationKinds.filter(kind => isPngData(data.sheets?.[kind])).map(kind => [kind, data.sheets[kind]]))};
}
