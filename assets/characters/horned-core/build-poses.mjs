// Editable low-resolution poses for the Horned Core character.
export const palette=['#111326','#24283d','#3b435b','#66708a','#b8c7d8','#eff4ff','#f05a24','#ff8b20','#ffc14d','#d92a45','#fc3a55','#1bd6ff','#0876b5','#4d245f','#8037a6','#b65cf2','#49e65a','#159143','#f8d554','#ff9c2d','#8a2c22','#e6eef7','#95a5c4'];
const ch='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function board(){const g=Array.from({length:64},()=>Array(64).fill('.'));const px=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&x<64&&y>=0&&y<64)g[y][x]=typeof c==='number'?ch[c]:c};const r=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)px(i,j,c)};const l=(x,y,X,Y,w,c)=>{const n=Math.max(Math.abs(X-x),Math.abs(Y-y));for(let i=0;i<=n;i++){const t=n?i/n:0;r(Math.round(x+(X-x)*t-w/2),Math.round(y+(Y-y)*t-w/2),w,w,c)}};return{g,px,r,l}}
function pose(dir,kind,f){const c=board(),{r,l}=c,side=dir==='left'||dir==='right',back=dir==='up',walk=kind==='walk',punch=kind==='punch',bob=walk&&f%2?-1:0,step=walk?[[-3,3],[0,0],[3,-3],[0,0]][f]:[0,0],turn=punch?[-1,0,1,0][f]:0;
 // boots and legs
 for(const [x,dx] of [[26,step[0]],[36,step[1]]]){l(x,45,x+dx,56,9,0);l(x,46,x+dx,55,5,1);r(x+dx-5,56,11,5,0);r(x+dx-4,56,9,3,2);r(x+dx-3,56,6,1,7);r(x+dx-4,59,10,2,4)}
 // body mass and orange plates
 r(20+turn,31+bob,24,17,0);r(22+turn,32+bob,20,15,1);r(24+turn,33+bob,16,12,2);r(25+turn,34+bob,14,4,6);r(25+turn,38+bob,14,6,1);r(27+turn,34+bob,3,3,7);r(34+turn,34+bob,3,3,7);r(29+turn,40+bob,6,5,0);r(30+turn+(f===3?1:0),40+bob,4,4,f===1?10:f===2?8:9);r(31+turn+(f===3?1:0),41+bob,2,2,f===2?5:10);r(22+turn,44+bob,5,3,7);r(37+turn,44+bob,5,3,7);r(28+turn,46+bob,8,2,3);
 // arms, shoulder cannon and cable block
 const swing=walk?[-3,0,3,0][f]:0;const arm=(x,y,X,Y)=>{l(x,y,X,Y,9,0);l(x,y,X,Y,6,2);r(X-4,Y-3,9,7,0);r(X-3,Y-2,7,5,3);r(X-2,Y-1,5,3,4)};
 arm(23+turn,35+bob,18+swing,45+bob);arm(41+turn,35+bob,46-swing,45+bob);r(12,31+bob,10,10,0);r(13,32+bob,8,8,4);r(14,33+bob,7,7,9);r(15,34+bob,5,5,18);r(42,31+bob,8,9,0);r(43,32+bob,6,7,3);r(48,34+bob,3,5,0);r(49,34+bob,1,1,16);r(50,35+bob,1,1,8);r(51,36+bob,1,1,9);r(52,37+bob,1,1,11);
 if(punch){const target=[[18,39],[49,37],[55,35],[41,43]][f];arm(dir==='left'?23:41,35+bob,target[0],target[1]+bob)}
 // helmet base
 r(17+turn,14+bob,30,18,0);r(19+turn,15+bob,26,16,1);r(20+turn,16+bob,24,14,2);r(22+turn,17+bob,20,2,3);r(18+turn,26+bob,4,4,3);r(42+turn,26+bob,4,4,3);
 // horns (behind skull) in purple segmented arcs
 const horn=(flip)=>{for(let i=0;i<8;i++){const x=(flip?42:21)+(flip?1:-1)*Math.max(0,i-3),y=16-i*2;r(x,y,4,5,0);r(x+1,y,2,3,13+(i%3));}};horn(false);horn(true);
 // skull crest
 r(28+turn,8+bob,9,10,0);r(29+turn,9+bob,7,8,18);r(30+turn,10+bob,5,6,19);r(30+turn,11+bob,2,2,20);r(34+turn,11+bob,1,2,20);r(31+turn,15+bob,4,3,18);r(32+turn,16+bob,2,1,0);
 if(back){r(24+turn,21+bob,16,6,1);r(26+turn,22+bob,12,4,2);r(30+turn,23+bob,4,2,7);r(25+turn,28+bob,14,2,3)}else{ // visor and face guard
  r(21+turn,20+bob,22,7,0);r(22+turn,21+bob,20,5,9);r(24+turn,21+bob,6,3,16);r(35+turn,21+bob,6,3,16);r(25+turn,22+bob,4,1,17);r(36+turn,22+bob,4,1,17);r(27+turn,26+bob,10,5,21);r(29+turn,26+bob,6,4,5);r(31+turn,27+bob,2,2,0);r(28+turn,30+bob,8,1,9)
 }
 if(dir==='left')c.g.forEach(row=>row.reverse());return c.g.map(row=>row.join(''))}
export const animations=[];for(const action of ['idle','walk'])for(const dir of ['down','left','right','up'])animations.push({name:`${action}-${dir}`,fps:action==='idle'?5:8,loop:true,frames:Array.from({length:4},(_,f)=>pose(dir,action,f))});for(const dir of ['left','right'])animations.push({name:`punch-${dir}`,fps:12,loop:false,frames:Array.from({length:4},(_,f)=>pose(dir,'punch',f))});
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href)console.log(JSON.stringify({palette,animations}));
