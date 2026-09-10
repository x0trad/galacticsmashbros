import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const js=ts.transpileModule(readFileSync('app/arena.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {Arena,shooterCount}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
for(let wave=1;wave<=40;wave++){const g=new Arena('green');g.wave=wave-1;g.nextWave();const shooters=g.enemies.filter(e=>e.shooter);assert.equal(shooters.length,shooterCount(wave,g.enemies.length));assert(shooters.length<=4);assert(shooters.length<=g.enemies.length/4);if(wave===1)assert.equal(shooters.length,0)}
const g=new Arena('green');g.between=100;g.wave=2;assert.equal(g.power,0);assert(!g.superSmash());
const enemy=(dx,hp=4)=>({...g.player,x:g.player.x+dx,hp,max:hp,color:'purple',spawn:0});
g.enemies=Array.from({length:10},()=>enemy(60));g.player.dir='right';g.punch();assert.equal(g.power,5);g.power=100;g.enemies=[enemy(100),enemy(160)];assert(g.superSmash());assert.equal(g.enemies[0].hp,3);assert.equal(g.enemies[1].hp,4);assert.equal(g.superCooldown,14);g.cooldown=0;g.punch();assert.equal(g.power,0);g.power=100;assert(!g.superSmash());
const s=new Arena('grey');s.between=100;s.player.x=800;s.player.y=300;s.enemies=[{...s.player,x:200,y:300,shooter:true,moving:false,fireTimer:0,aimTimer:0,spawn:0}];s.update(.1,new Set());assert.equal(s.enemies[0].x,200);assert.equal(s.enemies[0].aimTimer,.9);assert.equal(s.lasers.length,0);s.player.y=500;for(let i=0;i<10;i++)s.update(.1,new Set());assert.equal(s.enemies[0].x,200);assert(s.lasers.length>0);assert.equal(s.lasers[0].vy,0);
s.player.hurt=0;s.lasers=[{x:s.player.x-100,y:s.player.y,vx:2000,vy:0,life:2}];s.update(.1,new Set());assert.equal(s.player.hp,90);s.player.hurt=0;s.boosts.shield=8;s.lasers=[{x:s.player.x-100,y:s.player.y,vx:2000,vy:0,life:2}];s.update(.1,new Set());assert.equal(s.player.hp,90);
s.enemies[0].aimTimer=.5;s.hit(s.enemies[0],1,0,true);assert.equal(s.enemies[0].aimTimer,0);assert(s.enemies[0].fireTimer>=1.2);
console.log('PASS: proportional shooter caps, stationary targeting, aim warning, locked shot direction, swept laser collision, shield, interruption, Super range/damage/cooldown and per-swing charge cap.');
