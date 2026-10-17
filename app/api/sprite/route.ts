import {env} from 'cloudflare:workers';
import {generationRequest, generationError} from '../../sprite-generation';
import {type GenerationStage} from '../../sprite-format';

const json = (body: unknown, status = 200) => Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});
const dailyStageLimit = 50;
const stages = new Set(['fullbody', 'idle', 'walk', 'punch']);
const runtime = () => env as unknown as {OPENAI_API_KEY?: string; DB?: D1Database};
export function GET() {return json({available: Boolean(runtime().OPENAI_API_KEY), pipeline: 'fullbody-then-sprites'});}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({error: 'Use the creator from the game site.'}, 403);
  const {OPENAI_API_KEY: key, DB: db} = runtime();
  if (!key || !db) return json({error: 'The image creator is not configured yet.'}, 503);
  if (Number(request.headers.get('content-length') || 0) > 13_000_000) return json({error: 'This image is too large. Choose one under 12 MB.'}, 413);
  let form: FormData;
  try {form = await request.formData();} catch {return json({error: 'Could not read the upload.'}, 400);}
  const style = form.get('style') || 'normal';
  if (style !== 'normal' && style !== 'chibi') return json({error: 'Choose Normal or Chibi character style.'}, 400);
  const stage = form.get('stage') as GenerationStage;
  if (!stages.has(stage)) return json({error: 'Choose the full-body or animation step.'}, 400);
  if (stage !== 'fullbody' && form.get('approved') !== 'true') return json({error: 'Approve your full-body design before generating sprites.'}, 400);
  const file = form.get('artwork');
  if (!(file instanceof File) || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size < 100 || file.size > 12_000_000) return json({error: 'Choose a PNG, JPEG or WebP image under 12 MB.'}, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const valid = file.type === 'image/png' ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 : file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!valid) return json({error: 'This is not a valid image file.'}, 400);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(request.headers.get('cf-connecting-ip') || 'local-preview'));
  const identity = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  const day = Math.floor(Date.now() / 86_400_000);
  try {
    const spent = await db.prepare('INSERT INTO sprite_image_limits(identity,day,stage,attempts) VALUES(?,?,?,1) ON CONFLICT(identity,day,stage) DO UPDATE SET attempts=attempts+1 WHERE attempts<?').bind(identity, day, stage, dailyStageLimit).run();
    if (!spent.meta.changes) return json({error: `Daily ${stage === 'fullbody' ? 'full-body' : stage} limit of ${dailyStageLimit} reached. Your saved progress is safe; try again tomorrow.`}, 429);
  } catch {return json({error: 'The image creator is temporarily unavailable.'}, 503);}
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  const input = `data:${file.type};base64,${btoa(binary)}`;
  const refinement = String(form.get('refinement') || '').trim().slice(0, 500);
  const abort = new AbortController();
  const encoder = new TextEncoder();
  let canceled = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => {if (!canceled) controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));};
      send({type: 'progress', stage});
      const heartbeat = setInterval(() => send({type: 'progress', stage}), 10_000);
      const timeout = setTimeout(() => abort.abort(), 240_000);
      try {
        const response = await fetch('https://api.openai.com/v1/responses', {method: 'POST', headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'}, body: JSON.stringify(generationRequest(stage, input, refinement, identity, style)), signal: abort.signal});
        const result = await response.json() as {error?: {code?: string}; output?: Array<{type?: string; result?: string; status?: string}>};
        if (!response.ok) throw new Error(generationError(response.status, result.error?.code));
        const image = result.output?.find(item => item.type === 'image_generation_call' && item.result)?.result;
        if (!image || image.length > 23_000_000 || !image.startsWith('iVBOR')) throw new Error('The image service did not return a complete PNG. Please retry this step.');
        send({type: 'result', stage, image: `data:image/png;base64,${image}`});
      } catch (error) {
        await db.prepare('UPDATE sprite_image_limits SET attempts=MAX(0,attempts-1) WHERE identity=? AND day=? AND stage=?').bind(identity, day, stage).run().catch(() => {});
        send({type: 'error', error: abort.signal.aborted ? 'This image took too long. Your completed steps are saved; retry this step.' : error instanceof Error ? error.message : 'Could not generate the image. Please retry.'});
      } finally {clearInterval(heartbeat); clearTimeout(timeout); if (!canceled) controller.close();}
    },
    cancel() {canceled = true; abort.abort();},
  });
  return new Response(stream, {headers: {'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store, no-transform', 'X-Content-Type-Options': 'nosniff'}});
}
