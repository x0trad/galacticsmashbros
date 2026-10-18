// No network calls. Writes editable native Sprite Forge rows from the approved master.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const master=JSON.parse(fs.readFileSync(path.join(root,'assets/characters/robot-rig-study/master.sprite.json'),'utf8'));
const alphabet='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const source=master.animations[0].frames[0];
const frames=[-1,0,1,0].map(level=>({...source,rows:source.rows.map((row,y)=>[...row].map((c,x)=>{
  const n=alphabet.indexOf(c);
  return y>=86&&y<=120&&x>=87&&x<=121&&n>=31&&n<=34 ? alphabet[Math.max(30,Math.min(35,n+level))] : c;
}).join(''))}));
for(const frame of frames) for(let y=0;y<192;y++) for(let x=0;x<192;x++) {
  assert.equal(frame.rows[y][x]==='.',source.rows[y][x]==='.','Silhouette must stay unchanged');
  if(x<87||x>121||y<86||y>120) assert.equal(frame.rows[y][x],source.rows[y][x]);
}
assert.equal(new Set(frames.map(f=>f.rows.join(''))).size,3);
const project={...master,id:'robot-idle-reactor-study',name:'Robot idle — planted reactor pulse',animations:[{name:'idle-down',fps:4,loop:true,frames}]};
const out=path.join(root,'output/robot-idle-study');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'reproducible-idle.sprite.json'),JSON.stringify(project,null,2)+'\n');
console.log('Idle validation passed: four frames, three light states, unchanged silhouette and pixels outside reactor. Zero API calls.');
