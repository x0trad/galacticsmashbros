import {animationKinds, animationDirections, frameKey, parseFighter, parseDraft, type GeneratedFighter, type SpriteDraft, type SpriteSheets} from './sprite-format';

// Save generated pixels, never reconstruct the art from preset shapes.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gsb-fighters', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('artwork');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Browser storage is unavailable.'));
  });
}
async function read(key: string): Promise<unknown> {
  const db = await database();
  try {return await new Promise((resolve, reject) => {const request = db.transaction('artwork').objectStore('artwork').get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);});}
  finally {db.close();}
}
async function write(key: string, value: unknown) {
  const db = await database();
  try {await new Promise<void>((resolve, reject) => {const tx = db.transaction('artwork', 'readwrite'); if (value === null) tx.objectStore('artwork').delete(key); else tx.objectStore('artwork').put(value, key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(new Error('Could not save this fighter. Browser storage may be full.')); tx.onabort = () => reject(new Error('Could not save this fighter.'));});}
  finally {db.close();}
}
export async function getSavedFighter() {const value = await read('equipped'); return value ? parseFighter(value) : null;}
export const saveFighter = (fighter: GeneratedFighter) => write('equipped', parseFighter(fighter));
export async function getSpriteDraft() {return parseDraft(await read('draft'));}
export const saveSpriteDraft = (draft: SpriteDraft | null) => write('draft', draft);
export async function loadImage(src: string) {const image = new Image(); image.src = src; await image.decode(); return image;}
export async function loadCustomSpriteFrames(fighter: GeneratedFighter) {
  const data = parseFighter(fighter);
  return new Map(await Promise.all(Object.entries(data.frames).map(async ([key, src]) => [`custom-${key}`, await loadImage(src)] as const)));
}

// Some generated sheets reverse their side-view rows. Correct the mapping
// without mirroring the artwork (which would also mirror asymmetric armour).
export async function swapSpriteDirections(src: string, kind: typeof animationKinds[number]) {
  const image = await loadImage(src), directions = animationDirections(kind);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d')!, rowHeight = canvas.height / directions.length;
  directions.forEach((direction, row) => {
    const source = direction === 'left' ? directions.indexOf('right') : direction === 'right' ? directions.indexOf('left') : row;
    ctx.drawImage(image, 0, source * rowHeight, canvas.width, rowHeight, 0, row * rowHeight, canvas.width, rowHeight);
  });
  return canvas.toDataURL('image/png');
}

export async function sliceSpriteSheet(src: string, kind: typeof animationKinds[number]) {
  const image = await loadImage(src);
  const rows = animationDirections(kind);
  const cellW = image.naturalWidth / 4, cellH = image.naturalHeight / rows.length;
  if (Math.abs(cellW - cellH) > 2 || cellW < 128) throw new Error(`The ${kind} sheet has the wrong layout. Retry that animation.`);
  const frames: Record<string, string> = {};
  for (let row = 0; row < rows.length; row++) for (let column = 0; column < 4; column++) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 192;
    const ctx = canvas.getContext('2d', {willReadFrequently: true})!; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, column * cellW, row * cellH, cellW, cellH, 0, 0, 192, 192);
    const pixels = ctx.getImageData(0, 0, 192, 192).data;
    let visible = 0, transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) {if (pixels[i] > 32) visible++; else transparent++;}
    if (visible < 192 * 192 * .03 || transparent < 192 * 192 * .15) throw new Error(`The ${kind} sheet has an empty frame or opaque background. Retry that animation.`);
    frames[frameKey(kind, rows[row], column + 1)] = canvas.toDataURL('image/png');
  }
  return frames;
}
export async function assembleFighter(name: string, fullBody: string, sheets: SpriteSheets): Promise<GeneratedFighter> {
  const frames: Record<string, string> = {};
  for (const kind of animationKinds) {if (!sheets[kind]) throw new Error(`Generate the ${kind} animation first.`); Object.assign(frames, await sliceSpriteSheet(sheets[kind]!, kind));}
  return parseFighter({version: 2, name, fullBody, frames});
}
