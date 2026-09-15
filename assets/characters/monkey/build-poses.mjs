// Hand-authored pixel geometry for the green-cap monkey. Sent through Sprites MCP.
// Each native pixel exports as a 3x3 block; no interpolated or generated pixels.
export const palette=['#14182f','#293649','#47606a','#739096','#b9c8c4','#eff2dc','#653821','#944721','#bd632b','#de853a','#593273','#824595','#d0a17b','#edbd8c','#a97455','#417a23','#6ba42c','#91bf42','#d2ddd4','#8daba8','#e64a4d','#a92d45','#398db4','#24617e'];
const chars='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function canvas(){const g=Array.from({length:64},()=>Array(64).fill('.'));
 const pix=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&x<64&&y>=0&&y<64)g[y][x]=typeof c==='number'?chars[c]:c};
 const rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pix(i,j,c)};
 const poly=(p,c)=>{for(let y=0;y<64;y++)for(let x=0;x<64;x++){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[d,e]=p[j];if((b>y)!==(e>y)&&x<(d-a)*(y-b)/(e-b)+a)inside=!inside}if(inside)pix(x,y,c)}};
 const line=(x,y,a,b,width,c)=>{const n=Math.max(Math.abs(a-x),Math.abs(b-y));for(let i=0;i<=n;i++){const t=n?i/n:0;rect(Math.round(x+(a-x)*t-width/2),Math.round(y+(b-y)*t-width/2),width,width,c)}};
 return {g,pix,rect,poly,line};
}
function frame(direction,action,f){const c=canvas(),{rect:r,poly:p,line:l}=c;
 const side=direction==='right'||direction==='left',rear=direction==='up';
 const walk=action==='walk',punch=action==='punch';
 const bob=walk?(f%2?-1:0):punch?([0,0,-1,0][f]):([0,-1,0,0][f]);
 const turn=punch?[ -1,0,1,0][f]:0;
 // Tail is behind the body and uses the same four-beat movement rhythm.
 const tail=walk?[0,-1,1,0][f]:f===2?-1:0;
 const tx=side?22:21;
 const tailPoints=[[tx+4,44],[tx-2,48],[tx-7,47],[tx-9,43+tail],[tx-9,39+tail],[tx-6,37+tail],[tx-3,39+tail]];
 for(let i=1;i<tailPoints.length;i++){const [a,b]=tailPoints[i-1],[x,y]=tailPoints[i];l(a,b,x,y,5,0)}
 for(let i=1;i<tailPoints.length;i++){const [a,b]=tailPoints[i-1],[x,y]=tailPoints[i];l(a,b,x,y,3,10)}
 l(tx-9,42+tail,tx-9,39+tail,1,11);
 // Legs alternate contact/passing poses, with boots anchored to y=59.
 const foot=[[-3,3],[0,1],[3,-3],[-1,0]][walk?f:1];
 function leg(x,offset,lift,back){
  const fy=58-lift; l(x,47,x+offset,fy-3,8,0);l(x,47,x+offset,fy-4,5,back?1:2);
  l(x-1,48,x+offset-1,fy-5,2,back?2:3);
  const fx=x+offset-4+(side?1:0);r(fx,fy-5,8,6,0);r(fx+1,fy-5,6,4,6);r(fx+2,fy-5,4,2,8);
  r(fx,fy-1,side?11:9,3,0);r(fx+1,fy-1,side?9:7,1,4);r(fx+1,fy,side?9:7,1,2);
 }
 leg(side?29:27,foot[0],walk&&f===1?3:0,true);
 leg(side?35:37,foot[1],walk&&f===3?3:0,false);
 // Far arm, jacket, collar, zip, pocket and glove.
 function arm(x,y,ex,ey,far=false,fist=false){
  l(x,y,ex,ey,7,0);l(x,y,ex,ey-1,5,far?6:7);l(x-1,y-1,ex-1,ey-2,2,far?7:8);
  r(ex-4,ey-1,fist?9:7,fist?8:7,0);r(ex-3,ey,fist?7:5,fist?5:4,2);r(ex-2,ey,fist?5:3,2,4);r(ex-2,ey,2,1,5);
 }
 let farX=side?38:42,nearX=side?25:22;
 let swing=walk?[-3,0,3,0][f]:0;
 arm(farX,35+bob,farX-swing,43+bob+(walk?f%2:0),true);
 p([[25+turn,30+bob],[37+turn,30+bob],[42+turn,35+bob],[41+turn,47+bob],[36+turn,50+bob],[24+turn,49+bob],[21+turn,35+bob]],0);
 p([[25+turn,32+bob],[36+turn,32+bob],[39+turn,36+bob],[39+turn,46+bob],[34+turn,48+bob],[24+turn,47+bob],[23+turn,36+bob]],7);
 p([[24+turn,34+bob],[29+turn,34+bob],[28+turn,44+bob],[25+turn,46+bob],[23+turn,43+bob]],8);
 r(25+turn,35+bob,2,5,9);r(36+turn,39+bob,3,5,6);r(35+turn,42+bob,4,1,8);
 if(rear){r(28,35+bob,8,7,6);r(29,36+bob,6,5,2);r(31,37+bob,2,3,17);r(26,45+bob,11,1,8)}
 else {r(31+turn,33+bob,3,14,0);p([[24+turn,31+bob],[38+turn,31+bob],[35+turn,37+bob],[31+turn,40+bob],[26+turn,36+bob]],0);p([[25+turn,32+bob],[29+turn,32+bob],[32+turn,36+bob],[35+turn,33+bob],[37+turn,33+bob],[33+turn,39+bob]],2);r(26+turn,32+bob,3,2,3);r(33+turn,33+bob,2,2,11);r(32+turn,42+bob,1,2,4)}
 if(punch){const poses=[[24,34],[48,34],[55,32],[36,38]];const [x,y]=poses[f];arm(nearX,35+bob,x,y+bob,false,true)}
 else arm(nearX,35+bob,nearX+swing,44+bob+(f===3&&!walk?1:0));
 // Large head: rear cap and fur, front glasses and muzzle, side ear.
 const ox=turn,oy=bob;
 function rr(x,y,w,h,col){r(x+ox,y+oy,w,h,col)}
 function pp(points,col){p(points.map(([x,y])=>[x+ox,y+oy]),col)}
 if(side){
  pp([[22,17],[41,17],[43,22],[46,25],[46,30],[42,33],[30,33],[27,31],[22,30],[20,26],[20,21]],0);
  rr(22,19,8,11,10);rr(23,20,5,4,11);rr(22,24,4,4,11);rr(23,25,2,2,12);rr(24,25,1,1,13);
  rr(29,19,12,12,12);rr(29,29,15,2,12);rr(31,25,13,4,13);rr(41,24,3,3,12);rr(29,30,13,1,14);rr(31,32,10,1,12);
  rr(29,19,13,6,5);rr(30,19,4,5,20);rr(38,19,4,5,22);rr(30,19,4,1,21);rr(38,19,4,1,23);rr(30,20,1,1,5);rr(38,20,1,1,4);rr(29,25,3,1,0);
  pp([[20,18],[20,14],[22,14],[22,10],[24,10],[24,7],[27,7],[27,5],[38,5],[38,7],[40,7],[40,10],[43,10],[43,13],[46,13],[46,15],[49,15],[49,19],[25,19]],0);
  pp([[22,16],[22,14],[24,14],[24,11],[26,11],[26,8],[28,8],[28,7],[37,7],[37,10],[40,10],[40,13],[43,13],[43,16]],16);
  rr(25,10,2,3,15);rr(27,8,2,2,15);rr(29,7,7,1,17);
  pp([[36,7],[38,7],[38,9],[40,9],[40,11],[42,11],[42,14],[44,14],[44,16],[32,16],[32,12],[34,12],[34,9],[36,9]],18);
  rr(35,9,2,2,19);rr(33,12,2,2,19);rr(35,14,9,1,19);rr(22,16,25,1,16);rr(44,16,3,1,15);rr(23,17,24,2,0);
 }else if(rear){
  pp([[21,16],[43,16],[44,26],[42,30],[38,33],[27,33],[22,30],[20,25]],0);
  rr(22,18,20,10,10);rr(24,24,16,7,10);rr(27,29,11,3,10);rr(23,25,3,4,11);rr(37,25,3,4,11);rr(26,28,3,3,11);
  rr(19,21,4,7,0);rr(20,22,3,4,11);rr(41,21,4,7,0);rr(41,22,3,4,11);
  pp([[20,19],[20,13],[22,13],[22,9],[25,9],[25,6],[28,6],[28,5],[37,5],[37,7],[40,7],[40,10],[43,10],[43,14],[44,14],[44,20]],0);
  pp([[22,17],[22,13],[24,13],[24,10],[27,10],[27,7],[37,7],[37,9],[40,9],[40,13],[42,13],[42,17]],16);
  rr(25,10,2,5,15);rr(28,7,8,1,17);rr(35,8,2,8,17);rr(22,17,20,2,15);rr(28,17,9,3,0);rr(29,17,7,2,19);rr(31,18,1,1,0);rr(34,18,1,1,0);
 }else{
  pp([[22,17],[42,17],[43,22],[44,26],[42,30],[38,33],[27,33],[23,30],[21,26]],0);
  rr(19,21,5,8,0);rr(20,22,4,5,11);rr(21,23,2,3,12);rr(41,21,5,8,0);rr(42,22,3,5,11);rr(42,23,2,3,12);
  rr(23,18,18,10,10);rr(25,20,14,8,12);rr(24,26,17,4,12);rr(26,25,13,3,13);rr(27,30,11,2,12);rr(26,29,13,1,0);rr(31,25,4,1,14);
  rr(23,19,19,6,5);rr(25,19,5,5,20);rr(35,19,5,5,22);rr(25,19,5,1,21);rr(35,19,5,1,23);rr(25,20,2,1,5);rr(35,20,2,1,4);rr(32,21,1,1,0);
  pp([[20,19],[20,14],[22,14],[22,10],[25,10],[25,7],[28,7],[28,5],[38,5],[38,7],[40,7],[40,10],[43,10],[43,14],[45,14],[45,19]],0);
  pp([[22,16],[22,14],[24,14],[24,11],[27,11],[27,8],[29,8],[29,7],[37,7],[37,9],[39,9],[39,12],[41,12],[41,16]],16);
  rr(25,11,2,3,15);rr(28,8,2,2,15);rr(30,7,6,1,17);
  pp([[34,7],[37,7],[37,9],[39,9],[39,12],[41,12],[41,16],[31,16],[31,12],[33,12],[33,9],[34,9]],18);rr(33,10,2,2,19);rr(32,14,9,1,19);
  rr(21,16,23,1,16);rr(20,17,25,2,0);
 }
 if(direction==='left')c.g.forEach(row=>row.reverse());
 return c.g.map(row=>row.join(''));
}
export const animations=[];
for(const action of ['idle','walk'])for(const dir of ['down','left','right','up'])animations.push({name:`${action}-${dir}`,fps:action==='idle'?5:8,loop:true,frames:Array.from({length:4},(_,i)=>frame(dir,action,i))});
for(const dir of ['left','right'])animations.push({name:`punch-${dir}`,fps:12,loop:false,frames:Array.from({length:4},(_,i)=>frame(dir,'punch',i))});
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href)console.log(JSON.stringify({palette,animations}));
