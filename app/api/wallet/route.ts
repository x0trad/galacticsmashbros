import {getChatGPTUser} from '../../chatgpt-auth';
import {getDb} from '../../../db';
import {ensurePlayer,RequestError} from '../../../db/store';
import {linkedWallet,challenge,verifyWallet,unlinkWallet} from '../../../db/wallet';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
async function handle(request:Request,write:boolean){try{
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in with ChatGPT to link a wallet to your profile.'},401);
 const origin=new URL(request.url).origin;
 if(write&&(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site'))return json({error:'Request origin rejected'},403);
 const db=getDb();await ensurePlayer(db,user.userId);
 if(write){if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'JSON required'},415);const raw=await request.text();if(raw.length>2048)return json({error:'Request too large'},413);let input;try{input=JSON.parse(raw)}catch{return json({error:'Invalid JSON'},400)}if(!input||typeof input!=='object')return json({error:'Invalid request'},400);
 switch(input.action){case 'challenge':return json(await challenge(db,user.userId,input.address,origin));case 'verify':await verifyWallet(db,user.userId,input.nonce,input.signature);break;case 'unlink':await unlinkWallet(db,user.userId);break;default:return json({error:'Unknown action'},400)}}
 return json({wallet:await linkedWallet(db,user.userId)});
 }catch(e){if(e instanceof RequestError)return json({error:e.message},e.status);console.error('Wallet linking failed',e);return json({error:'Wallet link could not be saved. Please retry.'},503)}}
export const GET=(r:Request)=>handle(r,false);
export const POST=(r:Request)=>handle(r,true);
