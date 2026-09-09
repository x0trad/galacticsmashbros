import {getChatGPTUser} from '../../chatgpt-auth';
import {getDb} from '../../../db';
import {ensurePlayer,profile,buy,equipKit,startRun,finishRun,RequestError} from '../../../db/store';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
async function handle(request:Request,write:boolean){try{
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in to save your progress.'},401);
 if(write){const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Request origin rejected'},403);if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415)}
 const db=getDb();await ensurePlayer(db,user.userId);let extra={};
 if(write){const raw=await request.text();if(raw.length>2048)return json({error:'Request too large'},413);let input;try{input=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}if(!input||typeof input!=='object')return json({error:'Invalid request'},400);
 switch(input.action){case 'buy':await buy(db,user.userId,input.kit);break;case 'equip':await equipKit(db,user.userId,input.kit);break;case 'start':extra={runId:await startRun(db,user.userId)};break;case 'finish':extra={earned:await finishRun(db,user.userId,input)};break;default:return json({error:'Unknown action'},400)}}
 return json({...(await profile(db,user.userId)),...extra});
 }catch(e){if(e instanceof RequestError)return json({error:e.message},e.status);console.error('Player database request failed',e);return json({error:'Cloud save is temporarily unavailable. Please retry.'},503)}}
export const GET=(request:Request)=>handle(request,false);
export const POST=(request:Request)=>handle(request,true);
