import {isPngData, type GenerationStage} from './sprite-format';

export async function readGeneration(response: Response): Promise<string> {
  if (!response.ok) {const result = await response.json().catch(() => null) as {error?: string} | null; throw new Error(result?.error || 'The image service is unavailable. Please retry.');}
  if (!response.body) throw new Error('The image service returned no data.');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', image = '';
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as {type?: string; image?: unknown; error?: string};
    if (event.type === 'error') throw new Error(event.error || 'Could not finish this image.');
    if (event.type === 'result') {if (!isPngData(event.image)) throw new Error('The generated image is invalid.'); image = event.image;}
  };
  try {
    while (true) {
      const {value, done} = await reader.read();
      buffer += decoder.decode(value, {stream: !done});
      if (buffer.length > 25_000_000) throw new Error('The generated image is too large.');
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {consume(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1);}
      if (done) break;
    }
    consume(buffer);
    if (!image) throw new Error('The connection ended before the image was ready. Retry this step.');
    return image;
  } finally {await reader.cancel().catch(() => {}); reader.releaseLock();}
}
export async function generateImage(stage: GenerationStage, artwork: Blob, refinement: string, signal: AbortSignal) {
  const form = new FormData();
  form.set('stage', stage); form.set('artwork', artwork, 'reference.png'); form.set('refinement', refinement);
  if (stage !== 'fullbody') form.set('approved', 'true');
  return readGeneration(await fetch('/api/sprite', {method: 'POST', body: form, signal}));
}
