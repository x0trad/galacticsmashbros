// Authored pixel poses. Body parts are redrawn per pose; no cutout rotation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const master=JSON.parse(fs.readFileSync(path.join(root,'design-front.sprite.json'),'utf8'));
export const palette=master.palette;
const chars='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function board(){
 const g=Array.from({length:64},()=>Array(64).fill('.'));
 const px=(x,y,c)=>{if(x>=0&&x<64&&y>=0&&y<64)g[y][x]=typeof c==='number'?chars[c]:c;};
 const r=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)px(i,j,c);};
 const p=(pts,c)=>{for(let y=0;y<64;y++){let hit=[];for(let i=0,j=pts.length-1;i<pts.length;j=i++){const[a,b]=pts[i],[d,e]=pts[j];if((b>y)!==(e>y))hit.push(a+(y-b)*(d-a)/(e-b));}hit.sort((a,b)=>a-b);for(let i=0;i<hit.length;i+=2)for(let x=Math.ceil(hit[i]);x<Math.ceil(hit[i+1]);x++)px(x,y,c);}};
 return{g,px,r,p};
}
export function pose(dir,action,f){
 const b=board(),{g,px,r,p}=b,side=dir==='left'||dir==='right',back=dir==='up',walk=action==='walk',punch=action==='punch';
 const bob=walk?[0,1,0,1][f]:punch?[0,0,1,0][f]:[0,0,1,0][f];
 const step=walk?[[-3,3],[-1,1],[3,-3],[1,-1]][f]:punch?[[-2,2],[-4,4],[-4,5],[-1,2]][f]:[[0,0],[0,0],[0,0],[0,0]][f];
 const lift=(n)=>walk&&f===(n?3:1)?3:punch&&f===(n?3:1)?2:0;
 // Facing-right tail extends left from the rear hip. Front view occludes it;
 // the back view shows it. Mirroring the finished profile preserves rear placement.
 const tip=action==='idle'?[0,-1,0,1][f]:[0,1,0,-1][f];
 if(side){
  const tailP=(pts,c)=>p(side?pts.map(([x,y])=>[64-x,y]):pts,c);
  const tailR=(x,y,w,h,c)=>r(side?64-x-w:x,y,w,h,c);
  tailP([[39,44],[43,43],[46,43+tip],[48,45+tip],[47,48+tip],[44,50],[40,49]],0);
  tailP([[41,45],[44,45],[46,44+tip],[46,47+tip],[43,48],[41,48]],5);
  tailR(45,44+tip,2,3,8);tailR(44,47+tip,2,1,9);
 }
 function leg(x,dx,up,far){
  const foot=x+dx,y=58-up;
  p([[x-4,46],[x+4,46],[foot+4,53-up],[foot+3,y],[foot-4,y],[foot-4,53-up]],0);
  p([[x-2,47],[x+2,47],[foot+2,53-up],[foot+1,y-2],[foot-2,y-2],[foot-2,53-up]],far?21:22);
  r(foot-3,y-5,6,3,5);r(foot-2,y-5,2,1,7);
  p([[foot-4,y-3],[foot+3,y-3],[foot+6,y],[foot+6,y+3],[foot-5,y+3],[foot-6,y+1]],0);
  r(foot-4,y-2,7,3,far?17:18);r(foot-3,y-2,4,1,20);r(foot-3,y,5,1,8);r(foot-4,y+1,9,1,8);
 }
 leg(side?29:26,step[0],lift(0),true);leg(side?35:38,step[1],lift(1),false);
 function arm(x,dx,dy,far=false){
  const hand=x+dx,y=47+bob+dy;
  p([[x-3,35+bob],[x+2,35+bob],[hand+3,y-3],[hand+3,y+2],[hand-3,y+3],[hand-5,y],[hand-4,y-4]],0);
  p([[x-1,36+bob],[x+1,37+bob],[hand+1,y-3],[hand+1,y],[hand-2,y],[hand-2,y-4]],far?4:5);
  r(hand-1,y-6,1,3,7);r(hand-3,y-1,5,3,8);r(hand-2,y+1,1,1,10);r(hand,y+1,1,1,10);
 }
 const swing=walk?[-2,0,2,0][f]:[0,0,0,1][f];
 if(side)arm(37,-swing,walk?[1,-1,-2,0][f]:0,true);else arm(45,-swing,0,true);
 // Top and shorts cover the limb attachment points.
 if(side){p([[26,33+bob],[37,33+bob],[40,39+bob],[39,49],[26,51],[23,47],[24,38+bob]],0);p([[27,35+bob],[36,35+bob],[38,40+bob],[37,48],[27,49],[25,45]],18);r(26,39+bob,3,8-bob,19);r(27,47,10,2,17);r(34,37+bob,2,7,17);}
 else {p([[24,33+bob],[40,33+bob],[44,38+bob],[43,48],[40,51],[25,51],[22,48],[21,39+bob]],0);p([[25,35+bob],[39,35+bob],[42,39+bob],[41,48],[38,49],[26,49],[24,47],[24,39+bob]],18);p([[27,36+bob],[37,36+bob],[40,40+bob],[40,47],[27,47],[25,43+bob],[25,39+bob]],19);r(26,47,14,2,17);r(27,47,12,1,18);r(26,39+bob,1,5,20);}
 if(!side&&!back){p([[27,33+bob],[37,33+bob],[38,37+bob],[35,41+bob],[31,42+bob],[28,40+bob],[26,36+bob]],0);p([[28,34+bob],[36,34+bob],[36,37+bob],[34,40+bob],[31,40+bob],[29,38+bob]],8);}
 // Front head retained from approved design. Other views have independently drawn features.
 if(!side&&!back){const rows=master.animations[0].frames[0].rows;for(let y=4;y<=38;y++)for(let x=10;x<=54;x++)if(rows[y][x]!=='.'&&!(y>=33&&x>=49))px(x,y+bob,rows[y][x]);if(action==='idle'&&f===3){r(25,27+bob,5,5,8);r(37,27+bob,5,5,8);r(25,28+bob,5,1,0);r(37,28+bob,5,1,0);}}
 else if(back){
  p([[18,20+bob],[46,20+bob],[49,27+bob],[47,34+bob],[41,39+bob],[26,39+bob],[19,35+bob],[16,28+bob]],0);
  p([[20,21+bob],[44,21+bob],[47,28+bob],[45,33+bob],[40,37+bob],[27,37+bob],[21,33+bob],[18,28+bob]],5);
  p([[20,24+bob],[23,26+bob],[23,31+bob],[28,35+bob],[39,35+bob],[43,32+bob],[45,26+bob],[46,30+bob],[43,35+bob],[39,38+bob],[27,38+bob],[21,34+bob]],4);
  r(31,30+bob,3,2,4);r(30,33+bob,5,1,4);
  p([[17,6+bob],[23,5+bob],[43,5+bob],[48,7+bob],[50,16+bob],[54,21+bob],[54,23+bob],[46,25+bob],[23,25+bob],[11,23+bob],[10,21+bob],[14,16+bob]],0);
  p([[19,7+bob],[25,6+bob],[42,6+bob],[46,8+bob],[48,16+bob],[44,18+bob],[19,18+bob],[16,16+bob]],14);r(23,7+bob,19,1,15);r(31,9+bob,1,7,13);
  p([[16,16+bob],[20,18+bob],[44,18+bob],[49,16+bob],[51,22+bob],[44,23+bob],[22,23+bob],[13,21+bob]],13);r(20,18+bob,25,1,12);r(29,17+bob,7,3,0);r(30,18+bob,5,1,15);
 }else{
  p([[23,19+bob],[40,19+bob],[43,23+bob],[45,25+bob],[49,28+bob],[49,32+bob],[45,35+bob],[41,38+bob],[29,39+bob],[23,35+bob],[21,28+bob]],0);
  p([[25,21+bob],[39,21+bob],[41,25+bob],[46,28+bob],[47,31+bob],[43,34+bob],[39,36+bob],[30,37+bob],[25,33+bob],[23,27+bob]],5);
  p([[35,26+bob],[40,26+bob],[42,29+bob],[47,29+bob],[47,32+bob],[42,35+bob],[38,37+bob],[31,36+bob],[30,32+bob]],8);
  r(24,26+bob,3,5,4);r(25,27+bob,2,3,18);r(37,26+bob,4,1,0);r(38,27+bob,2,4,0);r(46,28+bob,3,2,0);r(40,33+bob,6,1,0);r(41,34+bob,4,1,8);
  p([[23,6+bob],[29,5+bob],[41,6+bob],[44,8+bob],[46,17+bob],[51,21+bob],[51,24+bob],[36,26+bob],[22,24+bob],[17,22+bob],[17,20+bob],[21,16+bob]],0);
  p([[25,7+bob],[30,7+bob],[40,8+bob],[42,10+bob],[44,17+bob],[23,18+bob],[22,16+bob]],14);r(27,7+bob,11,1,15);r(23,11+bob,1,1,0);r(26,11+bob,1,1,0);
  p([[22,17+bob],[42,18+bob],[45,17+bob],[48,21+bob],[48,23+bob],[37,24+bob],[23,22+bob],[20,21+bob]],13);r(25,17+bob,17,1,12);r(23,19+bob,17,1,14);
  p([[37,10+bob],[39,11+bob],[42,11+bob],[43,13+bob],[41,14+bob],[38,14+bob],[36,15+bob],[36,13+bob],[34,14+bob],[34,11+bob],[36,12+bob]],0);r(40,12+bob,1,1,15);
 }
 // Near arm remains on top of the profile. Punches have four drawn extensions,
 // with wide stepping legs already drawn above; no rigid standing-pose rotation.
 if(punch){const reach=[3,12,16,5][f],y=38+bob,ex=28+reach;
  p([[25,35+bob],[29,35+bob],[33,38+bob],[ex, y-2],[ex+4,y],[ex+4,y+5],[ex,y+7],[31,43+bob],[24,41+bob]],0);
  p([[26,36+bob],[29,36+bob],[33,39+bob],[ex,y],[ex+2,y+2],[ex+1,y+4],[32,41+bob],[26,40+bob]],5);r(29,37+bob,3,1,7);
  p([[ex,y-1],[ex+5,y-1],[ex+7,y+1],[ex+7,y+5],[ex+4,y+7],[ex,y+6],[ex-1,y+3]],0);r(ex+1,y,4,5,8);r(ex,y+1,6,3,8);r(ex+1,y+4,4,1,9);r(ex+3,y+2,1,2,10);
 }else arm(side?27:20,swing,walk?[0,-2,0,1][f]:f===1?-1:0);
 // UP is viewed from behind. The tail attaches to the rear waistband and is
 // nearer to the viewer than the shirt/shorts, so draw this short tuft last.
 if(back){
  const sway=[0,-1,0,1][f];
  const rear=(pts,c)=>p(pts.map(([x,y])=>[x+sway,y]),c);
  rear([[30,48],[34,48],[37,51],[37,54],[34,56],[30,54],[29,51]],0);
  rear([[31,49],[33,49],[35,51],[35,54],[33,54],[31,52]],5);
  r(31+sway,49,2,2,7);
  rear([[30,52],[33,53],[36,52],[35,54],[33,55],[31,54]],8);
  r(32+sway,54,2,1,9);
 }
 // Left profile is a conventional mirrored view; rear and front are separate artwork.
 return (dir==='left'?g.map(row=>[...row].reverse()):g).map(row=>row.join(''));
}
export const order=['idle-down','walk-down','idle-left','walk-left','idle-right','walk-right','idle-up','walk-up','punch-left','punch-right'];
export const animations=order.map(name=>{const[action,dir]=name.split('-');return{name,fps:action==='idle'?4:action==='walk'?8:12,loop:action!=='punch',frames:Array.from({length:4},(_,f)=>({rows:pose(dir,action,f),duration:1,hitboxes:[]}))};});
if(process.argv.includes('--write-plan')){fs.writeFileSync(path.join(root,'animation-plan.json'),JSON.stringify({palette,animations},null,2)+'\n');console.log('Authored 40 poses.');}
