import {kits} from '../app/inventory';
export class RequestError extends Error{constructor(message:string,public status=400){super(message)}}
export async function ensurePlayer(db:D1Database,id:string){const now=Date.now();await db.batch([
 db.prepare('INSERT OR IGNORE INTO players (id, created_at) VALUES (?, ?)').bind(id,now),
 db.prepare("INSERT INTO ledger (id,player_id,amount,reason,created_at) SELECT ?,?,300,'Starter credits',? WHERE changes()=1").bind(`starter:${id}`,id,now),
 db.prepare("INSERT OR IGNORE INTO ownership (player_id,kit) VALUES (?,'standard')").bind(id),
])}
export async function profile(db:D1Database,id:string){const [p,o,l]=await db.batch<Record<string,unknown>>([
 db.prepare('SELECT credits,equipped,total_kills AS totalKills,runs,best FROM players WHERE id=?').bind(id),
 db.prepare('SELECT kit FROM ownership WHERE player_id=? ORDER BY kit').bind(id),
 db.prepare('SELECT amount,reason,created_at AS createdAt FROM ledger WHERE player_id=? ORDER BY created_at DESC,id DESC LIMIT 8').bind(id),
]);const row=p.results[0];if(!row)throw new RequestError('Profile not found',404);return {inventory:{credits:row.credits,equipped:row.equipped,totalKills:row.totalKills,runs:row.runs,owned:o.results.map(r=>r.kit)},best:row.best,history:l.results}}
export async function buy(db:D1Database,id:string,kitId:unknown){const kit=kits.find(k=>k.id===kitId);if(!kit||kit.id==='standard')throw new RequestError('Unknown kit');const results=await db.batch([
 db.prepare('INSERT OR IGNORE INTO ownership (player_id,kit) SELECT id,? FROM players WHERE id=? AND credits>=?').bind(kit.id,id,kit.price),
 db.prepare('UPDATE players SET credits=credits-? WHERE id=? AND changes()=1').bind(kit.price,id),
 db.prepare('INSERT INTO ledger (id,player_id,amount,reason,created_at) SELECT ?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),id,-kit.price,`Purchased ${kit.name}`,Date.now()),
]);if(!results[0].meta.changes){const owned=await db.prepare('SELECT kit FROM ownership WHERE player_id=? AND kit=?').bind(id,kit.id).first();if(!owned)throw new RequestError('Not enough game credits',409)}}
export async function equipKit(db:D1Database,id:string,kit:unknown){if(typeof kit!=='string'||!kits.some(k=>k.id===kit))throw new RequestError('Unknown kit');const r=await db.prepare('UPDATE players SET equipped=? WHERE id=? AND EXISTS (SELECT 1 FROM ownership WHERE player_id=? AND kit=?)').bind(kit,id,id,kit).run();if(!r.meta.changes)throw new RequestError('You do not own this kit',403)}
export async function startRun(db:D1Database,id:string){const runId=crypto.randomUUID(),now=Date.now();await db.batch([
 db.prepare('UPDATE sessions SET finished_at=? WHERE player_id=? AND finished_at IS NULL').bind(now,id),
 db.prepare('INSERT INTO sessions (id,player_id,started_at) VALUES (?,?,?)').bind(runId,id,now),
]);return runId}
export async function finishRun(db:D1Database,id:string,input:Record<string,unknown>){
 const {runId,kills,wave,score}=input;
 if(typeof runId!=='string'||![kills,wave,score].every(v=>Number.isSafeInteger(v)&&Number(v)>=0))throw new RequestError('Invalid run result');
 const session=await db.prepare('SELECT * FROM sessions WHERE id=? AND player_id=?').bind(runId,id).first<{started_at:number;finished_at:number|null;reward:number}>();
 if(!session)throw new RequestError('Run not found',404);if(session.finished_at!==null)return session.reward;
 const now=Date.now(),seconds=(now-session.started_at)/1000;
 // Plausibility limits only. Client-reported runs are not verified for token rewards.
 if(seconds>7200||Number(kills)>seconds*8||Number(wave)>seconds/2+1||Number(score)>Number(kills)*10000||Number(score)>10000000)throw new RequestError('Run result could not be saved');
 const reward=Math.min(500,Number(kills)*5+Math.max(0,Number(wave)-1)*25);
 await db.batch([
 db.prepare('UPDATE sessions SET finished_at=?,kills=?,wave=?,score=?,reward=? WHERE id=? AND player_id=? AND finished_at IS NULL').bind(now,kills,wave,score,reward,runId,id),
 db.prepare('UPDATE players SET credits=credits+?,total_kills=total_kills+?,runs=runs+1,best=MAX(best,?) WHERE id=? AND changes()=1').bind(reward,kills,score,id),
 db.prepare("INSERT INTO ledger (id,player_id,amount,reason,created_at) SELECT ?,?,?,'Run reward',? WHERE changes()=1").bind(`run:${runId}`,id,reward,now),
 ]);return reward;
}
