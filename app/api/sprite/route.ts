import {env} from 'cloudflare:workers';
import {generationError} from '../../sprite-generation';
import {authorAnimation, renderPixelSheet, renderPixelReference} from '../../sprite-forge/engine';
import {forgeCommandRequest, forgeRefinementRequest} from '../../sprite-forge/planner';
import {validateMasterCoverage, parsePixelSource, parseForgeDocument, type PixelSource, type ForgeDocument} from '../../sprite-forge/document';
import {type GenerationStage} from '../../sprite-format';

const json = (body: unknown, status = 200) => Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});
const dailyStageLimit = 50;
const stages = new Set(['fullbody', 'idle', 'walk', 'punch']);
const runtime = () => env as unknown as {OPENAI_API_KEY?: string; DB?: D1Database};
export function GET() {return json({available: Boolean(runtime().OPENAI_API_KEY), pipeline: 'chibi-sprite-forge-commands', sprite_engine: 'sprite-forge-gd-v3', styles: ['chibi']});}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({error: 'Use the creator from the game site.'}, 403);
  const {OPENAI_API_KEY: key, DB: db} = runtime();
  if (!key || !db) return json({error: 'The image creator is not configured yet.'}, 503);
  if (Number(request.headers.get('content-length') || 0) > 13_000_000) return json({error: 'This image is too large. Choose one under 12 MB.'}, 413);
  let form: FormData;
  try {form = await request.formData();} catch {return json({error: 'Could not read the upload.'}, 400);}
  const style = form.get('style') || 'chibi';
  if (style !== 'chibi') return json({error: 'The creator is available for Chibi characters only. Refresh the game to continue.'}, 400);
  const stage = form.get('stage') as GenerationStage;
  if (!stages.has(stage)) return json({error: 'Choose the full-body or animation step.'}, 400);
  if (stage !== 'fullbody' && form.get('approved') !== 'true') return json({error: 'Approve your full-body design before generating sprites.'}, 400);
  const file = form.get('artwork');
  if (!(file instanceof File) || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size < 100 || file.size > 12_000_000) return json({error: 'Choose a PNG, JPEG or WebP image under 12 MB.'}, 400);
  let source: PixelSource | undefined;
  if (stage === 'idle') {
    const raw = form.get('source');
    try {if (typeof raw !== 'string' || raw.length > 20_000) throw new Error(); source = parsePixelSource(JSON.parse(raw));}
    catch {return json({error: 'Create a new Chibi full body in Sprite Forge before generating animations.'}, 400);}
  }
  let suppliedForge: ForgeDocument | undefined;
  if (stage === 'walk' || stage === 'punch') {
    const raw = form.get('forge');
    try {if (typeof raw !== 'string' || raw.length > 600_000) throw new Error(); suppliedForge = parseForgeDocument(JSON.parse(raw));}
    catch {return json({error: 'Generate Sprite Forge idle frames first, then continue walking and punch animations.'}, 400);}
  }
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
      const timeout = setTimeout(() => abort.abort(), 420_000);
      try {
        const body = forgeCommandRequest(stage, input, identity, refinement, source, suppliedForge);
        const response = await fetch('https://api.openai.com/v1/responses', {method: 'POST', headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: abort.signal});
        const result = await response.json() as {error?: {code?: string}; status?: string; output?: Array<{type?: string; name?: string; arguments?: string}>};
        if (!response.ok) throw new Error(generationError(response.status, result.error?.code));
        const expected = stage === 'fullbody' ? 'set_frame' : 'author_animation';
        const call = result.output?.find(item => item.type === 'function_call' && item.name === expected);
        let commands: unknown;
        try {if (!call?.arguments || call.arguments.length > 800_000) throw new Error(); commands = JSON.parse(call.arguments);}
        catch {throw new Error('Sprite Forge did not finish the pixel drawing commands. Retry this step.');}
        if (stage === 'fullbody') {
          let authored = parsePixelSource(commands);
          const polish = await fetch('https://api.openai.com/v1/responses', {method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(forgeRefinementRequest(input,renderPixelReference(authored),authored,identity,refinement)),signal:abort.signal});
          const polished = await polish.json() as typeof result;
          if (!polish.ok) throw new Error(generationError(polish.status,polished.error?.code));
          const finish=polished.output?.find(item=>item.type==='function_call'&&item.name==='set_frame');
          if (!finish?.arguments || finish.arguments.length>800_000) throw new Error('Sprite Forge did not complete the finishing pass. Retry this step.');
          authored=parsePixelSource(JSON.parse(finish.arguments));
          validateMasterCoverage(authored);
          send({type: 'result', stage, image: renderPixelReference(authored), source: authored});
        } else {
          const master = source || {palette: suppliedForge!.palette, rows: suppliedForge!.animations.find(a => a.name === 'idle-down')!.frames[0].rows};
          const forge = authorAnimation(master, commands, stage, suppliedForge);
          send({type: 'result', stage, image: renderPixelSheet(forge, stage), forge});
        }
      } catch (error) {
        await db.prepare('UPDATE sprite_image_limits SET attempts=MAX(0,attempts-1) WHERE identity=? AND day=? AND stage=?').bind(identity, day, stage).run().catch(() => {});
        send({type: 'error', error: abort.signal.aborted ? 'This image took too long. Your completed steps are saved; retry this step.' : error instanceof Error ? error.message : 'Could not generate the image. Please retry.'});
      } finally {clearInterval(heartbeat); clearTimeout(timeout); if (!canceled) controller.close();}
    },
    cancel() {canceled = true; abort.abort();},
  });
  return new Response(stream, {headers: {'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store, no-transform', 'X-Content-Type-Options': 'nosniff'}});
}
