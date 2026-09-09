import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
import {Miniflare} from 'miniflare';
const compile=(p)=>ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const url=(s)=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const store=await import(url(compile('db/store.ts').replace("'../app/inventory'",JSON.stringify(url(compile('app/inventory.ts'))))));
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'});
try{
 const db=await mf.getD1Database('DB');
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')))for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 await Promise.all([store.ensurePlayer(db,'alice'),store.ensurePlayer(db,'alice')]);await store.ensurePlayer(db,'bob');
 assert.equal((await store.profile(db,'alice')).inventory.credits,300);assert.equal((await store.profile(db,'alice')).history.length,1);
 await Promise.all([store.buy(db,'alice','ion'),store.buy(db,'alice','ion')]);
 let p=await store.profile(db,'alice');assert.equal(p.inventory.credits,100);assert.deepEqual(p.inventory.owned,['ion','standard']);assert.equal(p.history.length,2);
 await assert.rejects(store.buy(db,'alice','void'));await assert.rejects(store.equipKit(db,'bob','ion'));await store.equipKit(db,'alice','ion');
 assert.equal((await store.profile(db,'alice')).inventory.equipped,'ion');assert.equal((await store.profile(db,'bob')).inventory.credits,300);
 const runId=await store.startRun(db,'alice');await db.prepare('UPDATE sessions SET started_at=? WHERE id=?').bind(Date.now()-10000,runId).run();
 await assert.rejects(store.finishRun(db,'bob',{runId,kills:2,wave:1,score:220}));
 await Promise.all([store.finishRun(db,'alice',{runId,kills:2,wave:1,score:220}),store.finishRun(db,'alice',{runId,kills:2,wave:1,score:220})]);
 p=await store.profile(db,'alice');assert.equal(p.inventory.credits,110);assert.equal(p.inventory.runs,1);assert.equal(p.inventory.totalKills,2);assert.equal(p.best,220);assert.equal(p.history.length,3);
 await store.finishRun(db,'alice',{runId,kills:2,wave:1,score:220});assert.equal((await store.profile(db,'alice')).inventory.credits,110);
 const invalid=await store.startRun(db,'bob');await assert.rejects(store.finishRun(db,'bob',{runId:invalid,kills:999999,wave:100,score:1000}));
 const old=await store.startRun(db,'bob');await store.startRun(db,'bob');assert.equal(await store.finishRun(db,'bob',{runId:old,kills:1,wave:1,score:110}),0);
 // A failed transaction must not deduct or grant anything.
 const before=await store.profile(db,'bob');await assert.rejects(db.batch([db.prepare('UPDATE players SET credits=-1 WHERE id=?').bind('bob'),db.prepare("INSERT INTO ownership VALUES ('bob','void')")]));assert.deepEqual(await store.profile(db,'bob'),before);
 console.log('PASS: migrations, account isolation, concurrent purchases, balance/ownership atomicity, equip authorization, replay-safe run crediting, invalid claims, abandoned sessions, rollback.');
}finally{await mf.dispose()}
