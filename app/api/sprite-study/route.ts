import {env} from 'cloudflare:workers';
import {drawingRequest,validatePlan} from '../../sprite-study/drawing';
import {generationError} from '../../sprite-generation';
// Isolated one-character native-resolution study; the normal game creator is unchanged.
const studyAccessHash='b42bc090b083b689fb0ff0ae25af5d859fc1da9e1d77e905750cc73be16edb3e';
const referenceHash='88a71e187f5ec62d49786886b9d33499fab49fe3fb2e5096de6becd43da43c65';
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('');
function dataURL(bytes:Uint8Array){let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return 'data:image/png;base64,'+btoa(binary);}
export async function POST(request:Request){
 const json=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
 if((env as unknown as {SPRITE_CREATOR_ENABLED?:string}).SPRITE_CREATOR_ENABLED!=='true')return json('Character generation is coming in the next release.',503);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json('Use the game origin.',403);
 if(hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(request.headers.get('x-study-access')||'')))!==studyAccessHash)return json('Private art study.',403);
 const {OPENAI_API_KEY:key,DB:db}=env as unknown as {OPENAI_API_KEY?:string;DB?:D1Database};
 if(!key||!db)return json('Study unavailable.',503);
 if(Number(request.headers.get('content-length')||0)>4_000_000)return json('Study upload too large.',413);
 let form:FormData;try{form=await request.formData();}catch{return json('Invalid upload.',400);}
 const stage=form.get('stage');if(stage!=='draw'&&stage!=='refine')return json('Choose draw or refine.',400);
 const artwork=form.get('artwork');if(!(artwork instanceof File)||artwork.size>2_000_000)return json('Original robot artwork required.',400);
 const bytes=new Uint8Array(await artwork.arrayBuffer());
 if(hex(await crypto.subtle.digest('SHA-256',bytes))!==referenceHash)return json('This study accepts only the original robot portrait.',400);
 let draft:string|undefined,palette:string[]|undefined;
 if(stage==='refine'){
  const file=form.get('draft');if(!(file instanceof File)||file.size>500_000)return json('Sprite Forge output required.',400);
  const png=new Uint8Array(await file.arrayBuffer());const view=new DataView(png.buffer);
  if(png.length<24||png[0]!==137||png[1]!==80||view.getUint32(16)!==192||view.getUint32(20)!==192)return json('The draft must be a native 192×192 Sprite Forge export.',400);
  try{palette=JSON.parse(String(form.get('palette')));if(!Array.isArray(palette)||palette.length<24||palette.length>62||palette.some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c)))throw new Error();}catch{return json('Original drawing palette required.',400);}
  draft=dataURL(png);
 }
 const identity=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(request.headers.get('cf-connecting-ip')||'study'))),day=Math.floor(Date.now()/86400000),quotaStage='study192-'+stage;
 try{const used=await db.prepare('INSERT INTO sprite_image_limits(identity,day,stage,attempts) VALUES(?,?,?,1) ON CONFLICT(identity,day,stage) DO UPDATE SET attempts=attempts+1 WHERE attempts<3').bind(identity,day,quotaStage).run();if(!used.meta.changes)return json('Study limit reached.',429);}catch{return json('Study storage unavailable.',503);}
 const abort=new AbortController(),encoder=new TextEncoder();let canceled=false;
 const stream=new ReadableStream<Uint8Array>({async start(controller){const send=(value:unknown)=>{if(!canceled)controller.enqueue(encoder.encode(JSON.stringify(value)+'\n'));};send({type:'progress',stage});const beat=setInterval(()=>send({type:'progress',stage}),10000),timer=setTimeout(()=>abort.abort(),540000);
  try{
   const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(drawingRequest(dataURL(bytes),draft,palette,identity)),signal:abort.signal});
   const result=await response.json() as {error?:{code?:string};output?:Array<{type?:string;name?:string;arguments?:string}>};
   if(!response.ok)throw new Error(generationError(response.status,result.error?.code));
   const call=result.output?.find(o=>o.type==='function_call'&&o.name==='author_sprite_forge_drawing');
   if(!call?.arguments||call.arguments.length>1_500_000)throw new Error('Astra did not finish the drawing commands.');
   const plan=validatePlan(JSON.parse(call.arguments));
   if(palette&&JSON.stringify(plan.palette.map(c=>c.toLowerCase()))!==JSON.stringify(palette.map(c=>c.toLowerCase())))throw new Error('Refinement changed the drawing palette.');
   send({type:'result',stage,model:'gpt-6-astra',canvas:{width:192,height:192},plan});
  }catch(error){await db.prepare('UPDATE sprite_image_limits SET attempts=MAX(0,attempts-1) WHERE identity=? AND day=? AND stage=?').bind(identity,day,quotaStage).run().catch(()=>{});send({type:'error',error:error instanceof Error?error.message:'Study failed.'});}
  finally{clearInterval(beat);clearTimeout(timer);if(!canceled)controller.close();}
 },cancel(){canceled=true;abort.abort();}});
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-store, no-transform'}});
}
