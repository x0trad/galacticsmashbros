import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const js=ts.transpileModule(readFileSync('app/arena.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {Arena}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const arena=()=>{const g=new Arena('green');g.between=100;g.player.dir='right';return g};
for(const dir of ['up','down','left','right']){const g=arena();g.player.dir=dir;assert(g.deployBarricade());assert.equal(g.barricade.vertical,['left','right'].includes(dir));assert(!g.deployBarricade());for(let i=0;i<101;i++)g.update(.04,new Set());assert.equal(g.barricade,null);assert(g.barricadeCooldown>13);}
const edge=arena();edge.player.x=1045;assert(!edge.deployBarricade());assert.equal(edge.barricadeCooldown,0);
const g=arena();g.deployBarricade();g.lasers=[{x:800,y:330,vx:-4000,vy:0,life:2}];g.update(.1,new Set());assert.equal(g.player.hp,100);assert.equal(g.lasers.length,0);assert.equal(g.barricade.hp,80);
g.lasers=[{x:580,y:330,vx:-1000,vy:0,life:2}];g.update(.1,new Set());assert.equal(g.player.hp,90,'a laser already behind the wall still hits');
const e=arena();e.deployBarricade();e.enemies=[{...e.player,x:675,y:330,hp:10,max:10,color:'purple'}];for(let i=0;i<20;i++)e.update(.04,new Set());assert(e.enemies[0].x>=668);assert(e.barricade.hp<100);assert.equal(e.player.hp,100);
const broken=arena();broken.deployBarricade();broken.barricade.hp=20;broken.lasers=[{x:800,y:330,vx:-4000,vy:0,life:2}];broken.update(.1,new Set());assert.equal(broken.barricade,null);assert.equal(broken.player.hp,100);
const input=arena();const keys=new Set(['1']);input.update(.04,keys);assert(input.barricade);assert(!keys.has('1'));input.over=true;input.barricadeCooldown=0;assert(!input.deployBarricade());
console.log('PASS: four orientations, placement bounds, cooldown, expiry, enemy collision/damage, swept laser interception, destruction, activation and game-over guard.');
