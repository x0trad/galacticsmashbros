import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const bundle=await build({stdin:{contents:"import {GET,POST} from './app/api/sprite/route.ts'; export default {fetch(r){return r.method==='GET'?GET():POST(r)}}",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
const fixture=readFileSync('public/sprites/taiyu-idle-down-1.png');
let calls=0,fail=false,requestBody;
const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-01-01',bindings:{OPENAI_API_KEY:'test-secret'},d1Databases:['DB'],outboundService:async request=>{
 calls++;requestBody=await request.json();
 return fail?Response.json({error:{code:'insufficient_quota'}},{status:429}):Response.json({output:[{type:'image_generation_call',status:'completed',result:fixture.toString('base64')}]});
}});
const db=await mf.getD1Database('DB');
await db.exec(readFileSync('drizzle/0002_unique_the_initiative.sql','utf8').replace(/\n/g,' '));
async function post(stage='fullbody',approved=false,origin='https://game.test',bytes=fixture){
 const form=new FormData();form.set('stage',stage);form.set('artwork',new Blob([bytes],{type:'image/png'}),'ref.png');if(approved)form.set('approved','true');
 const request=new Request('https://game.test/api/sprite',{method:'POST',headers:{origin},body:form});
 return mf.dispatchFetch(request.url,{method:'POST',headers:Object.fromEntries(request.headers),body:await request.arrayBuffer()});
}
try {
 assert.equal((await post('fullbody',false,'https://other.test')).status,403);
 assert.equal((await post('walk')).status,400);
 assert.equal((await post('unknown')).status,400);
 assert.equal((await post('fullbody',false,undefined,Buffer.alloc(150))).status,400);
 assert.equal(calls,0,'Invalid input must not call the provider');
 let response=await post();const events=(await response.text()).trim().split('\n').map(line=>JSON.parse(line));
 assert.equal(response.status,200,JSON.stringify(events));assert.equal(events.at(-1).type,'result');
 assert.equal(requestBody.model,'gpt-6-astra');assert.equal(requestBody.tools[0].type,'image_generation');
 assert.equal(requestBody.text,undefined,'The old preset JSON generator must not run');
 response=await post('walk',true);await response.text();
 assert.equal(requestBody.input[0].content[1].image_url,'data:image/png;base64,'+fixture.toString('base64'),'Animation must receive the reviewed full-body image bytes');
 assert.match(requestBody.input[0].content[0].text,/APPROVED FULL-BODY/);
 fail=true;response=await post('punch',true);assert.match(await response.text(),/billing is active/);
 assert.equal((await db.prepare("SELECT attempts FROM sprite_image_limits WHERE stage='punch'").first()).attempts,0,'Provider failure refunds the attempt');
 fail=false;await (await post()).text();await (await post()).text();const priorCalls=calls;
 assert.equal((await post()).status,429);assert.equal(calls,priorCalls,'Daily limit blocks provider spending');
} finally {await mf.dispose();}
const client=await build({entryPoints:['app/sprite-request.ts'],bundle:true,write:false,format:'esm',platform:'browser'});
const {readGeneration}=await import('data:text/javascript;base64,'+Buffer.from(client.outputFiles[0].text).toString('base64'));
const png='data:image/png;base64,'+fixture.toString('base64');
const streamText=JSON.stringify({type:'progress'})+'\n'+JSON.stringify({type:'result',image:png})+'\n';
const stream=new ReadableStream({start(c){const b=new TextEncoder().encode(streamText);for(let i=0;i<b.length;i+=37)c.enqueue(b.slice(i,i+37));c.close();}});
assert.equal(await readGeneration(new Response(stream)),png,'Stream parser must survive split JSON and PNG data');
await assert.rejects(()=>readGeneration(new Response('{"type":"progress"}\n')),/connection ended/);
await assert.rejects(()=>readGeneration(new Response('{"type":"error","error":"Try later"}\n')),/Try later/);
const format=ts.transpileModule(readFileSync('app/sprite-format.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {frameKeys,parseFighter}=await import('data:text/javascript;base64,'+Buffer.from(format).toString('base64'));
assert.equal(frameKeys.length,40);assert.equal(new Set(frameKeys).size,40);
assert.throws(()=>parseFighter({version:2,name:'Test',fullBody:png,frames:{}}),/missing animation/);
assert.equal(Object.keys(parseFighter({version:2,name:'Test',fullBody:png,frames:Object.fromEntries(frameKeys.map(k=>[k,png]))}).frames).length,40);
console.log('PASS: approval gate, image validation, original reference bytes, image tool use, rate limit, failure refund, streaming boundaries, truncated response, and complete 40-frame manifest.');
