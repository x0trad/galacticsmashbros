import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
const bundle=await build({stdin:{contents:"import {GET as status,POST as creator} from './app/api/sprite/route.ts'; import {POST as study} from './app/api/sprite-study/route.ts'; export default {fetch(r){const path=new URL(r.url).pathname;if(path==='/api/sprite-study')return study(r);return r.method==='GET'?status():creator(r)}}",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers','node:buffer']});
let calls=0;
const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],outboundService:()=>{calls++;throw Error('Unexpected external request')}});
try{
 const get=await mf.dispatchFetch('https://game.test/api/sprite');assert.equal((await get.json()).available,false);
 for(const path of ['/api/sprite','/api/sprite-study'])assert.equal((await mf.dispatchFetch('https://game.test'+path,{method:'POST',headers:{Origin:'https://game.test'}})).status,503);
 assert.equal(calls,0);
 console.log('PASS: release creator endpoints closed without external calls.');
}finally{await mf.dispose()}
