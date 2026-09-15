// Taiyu: native 64px artwork authored for Sprites MCP; export at integer 3x.
export const palette=['#101225','#202338','#30374b','#525e78','#8999b8','#c1cff5','#f2f5ff','#803518','#d45217','#ff871c','#ffbb70','#ffde42','#fff29a','#86372b','#361b4d','#632d82','#9549b7','#c679d8','#087ac8','#17c5f1','#920e38','#dc1945','#ff5270','#ffbfdb','#066b30','#10d447','#6ef87e'];
const chars='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function board(){const g=Array.from({length:64},()=>Array(64).fill('.'));
 const px=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x<0||x>63||y<0||y>63)throw Error('Pixel outside canvas');g[y][x]=typeof c==='number'?chars[c]:c};
 const r=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)px(i,j,c)};
 const l=(x,y,a,b,w,c)=>{const n=Math.max(Math.abs(a-x),Math.abs(b-y));for(let i=0;i<=n;i++){const t=n?i/n:0;r(Math.round(x+(a-x)*t-w/2),Math.round(y+(b-y)*t-w/2),w,w,c)}};
 const p=(points,c)=>{for(let y=0;y<64;y++)for(let x=0;x<64;x++){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [a,b]=points[i],[d,e]=points[j];if((b>y)!==(e>y)&&x<(d-a)*(y-b)/(e-b)+a)inside=!inside}if(inside)px(x,y,c)}};
 return{g,px,r,l,p};
}
function pose(direction,action,f){const {g,r,l,p}=board(),side=direction==='right'||direction==='left',rear=direction==='up',walk=action==='walk',punch=action==='punch';
 const bob=walk?(f%2?-1:0):punch?([0,0,-1,0][f]):([0,-1,0,0][f]);
 const twist=punch?[-1,0,1,0][f]:0;
 const steps=walk?[[-3,3],[0,1],[3,-3],[-1,0]][f]:[0,0];
 // Feet keep one common floor; passing frames deliberately lift alternate feet.
 function leg(x,step,lift,far){const y=58-lift;l(x,45,x+step,y-2,8,0);l(x,46,x+step,y-3,5,far?1:2);l(x-1,48,x+step-1,y-4,1,18);
  r(x+step-3,y-8,6,4,7);r(x+step-2,y-8,4,3,9);r(x+step-1,y-8,2,1,11);
  const bx=x+step-4;r(bx,y-3,9,6,0);r(bx+1,y-3,7,4,2);r(bx+2,y-3,5,1,9);r(bx+1,y+1,8,1,3);r(bx+1,y,3,1,4);
 }
 leg(side?29:27,steps[0],walk&&f===1?3:0,true);leg(side?35:37,steps[1],walk&&f===3?3:0,false);
 function arm(x,y,ex,ey,far=false,fist=false){l(x,y,ex,ey,7,0);l(x,y,ex,ey-1,5,far?1:2);l(x-1,y,ex-1,ey-2,2,8);l(x+1,y+1,ex+1,ey-3,1,19);
  r(ex-4,ey-2,fist?9:8,7,0);r(ex-3,ey-1,fist?7:6,5,2);r(ex-2,ey-1,fist?5:4,2,4);r(ex-2,ey+2,1,1,3);r(ex,ey+2,1,1,3);r(ex+2,ey+2,1,1,3);
 }
 const swing=walk?[-3,0,3,0][f]:0;
 arm(side?39:43,35+bob,(side?41:46)-swing,43+bob,true);
 // Sculpted torso, breastplate and energy core.
 p([[23+twist,32+bob],[39+twist,32+bob],[43+twist,36+bob],[41+twist,45+bob],[37+twist,49],[26+twist,49],[22+twist,45+bob],[20+twist,36+bob]],0);
 p([[24+twist,33+bob],[38+twist,33+bob],[40+twist,37+bob],[39+twist,44+bob],[36+twist,47],[26+twist,47],[23+twist,43+bob]],2);
 p([[23+twist,33+bob],[28+twist,34+bob],[31+twist,38+bob],[35+twist,35+bob],[39+twist,34+bob],[40+twist,37+bob],[34+twist,41+bob],[25+twist,38+bob]],8);
 l(24+twist,33+bob,29+twist,36+bob,2,10);l(35+twist,35+bob,39+twist,34+bob,2,10);
 r(24+twist,38+bob,6,2,0);r(24+twist,38+bob,6,1,19);r(35+twist,37+bob,5,2,0);r(35+twist,37+bob,5,1,19);
 if(rear){r(26,35+bob,12,9,0);r(27,36+bob,10,7,1);r(28,36+bob,8,1,3);r(28,39+bob,8,1,3);r(28,42+bob,8,1,f===2?9:8);r(31,36+bob,2,7,2)}
 else {const cx=side?36:32,cy=41+bob;r(cx-4,cy-4,8,8,0);r(cx-3,cy-4,6,8,18);r(cx-4,cy-3,8,6,18);r(cx-3,cy-3,6,6,19);r(cx-2,cy-3,4,6,20);r(cx-3,cy-2,6,4,20);r(cx-2,cy-2,4,4,f===2?22:21);r(cx+1,cy-2,1,2,23);r(cx,cy,2,1,23)}
 r(25,46,15,2,0);r(26,46,13,1,3);r(31,46,4,3,4);r(32,47,2,1,1);r(27,48,3,1,9);r(37,48,3,1,9);
 // Asymmetric shoulder badge and exposed cables follow the reference.
 if(!side){p([[17,31+bob],[23,31+bob],[26,35+bob],[24,40+bob],[17,40+bob],[14,36+bob]],0);p([[18,32+bob],[22,32+bob],[24,35+bob],[23,39+bob],[18,39+bob],[16,36+bob]],5);r(17,34+bob,3,3,21);r(20,34+bob,4,4,9);r(21,34+bob,2,3,11);r(21,34+bob,1,1,12);
  r(41,32+bob,6,7,0);r(42,33+bob,4,5,3);r(43,33+bob,2,2,5);
  l(46,35+bob,49,31+bob,1,11);l(47,35+bob,51,33+bob,1,25);l(48,36+bob,52,35+bob,1,21);l(47,37+bob,51,38+bob,1,19);
 }
 const nearX=side?25:20;
 if(!punch)arm(nearX,36+bob,nearX+swing,44+bob+(action==='idle'&&f===3?1:0));
 // Helmet silhouette is drawn separately for each view.
 const ox=twist,oy=bob;
 const rr=(x,y,w,h,c)=>r(x+ox,y+oy,w,h,c),pp=(pts,c)=>p(pts.map(([x,y])=>[x+ox,y+oy]),c);
 pp([[22,13],[39,13],[44,17],[46,23],[45,31],[40,35],[23,35],[18,31],[17,23],[18,17]],0);
 pp([[23,14],[38,14],[42,17],[44,23],[43,30],[39,33],[23,33],[20,30],[19,22],[20,17]],1);
 pp([[25,15],[38,15],[41,18],[42,22],[22,22],[22,18]],2);rr(25,15,10,1,3);
 rr(19,22,3,8,2);rr(20,23,1,5,3);rr(43,23,1,7,3);
 if(rear){rr(23,22,18,8,2);rr(25,23,14,2,1);rr(25,27,14,2,1);rr(27,31,11,1,3);rr(31,17,2,14,0);rr(33,18,1,12,3)}
 else if(side){
  rr(23,21,6,11,0);rr(24,22,4,9,2);rr(25,22,1,7,3);rr(25,25,4,1,4);
  pp([[30,22],[45,22],[46,26],[44,29],[39,29],[38,33],[31,32]],0);
  rr(31,23,13,4,20);rr(32,23,12,2,0);rr(35,23,7,2,25);rr(36,23,4,1,26);
  pp([[32,27],[37,27],[40,26],[44,28],[42,32],[38,34],[34,32]],4);
  pp([[35,28],[39,27],[42,28],[41,31],[38,33],[35,31]],5);rr(37,28,3,1,0);rr(37,30,3,1,0);rr(39,32,2,3,21);
 }else{
  rr(22,22,21,6,0);rr(23,25,19,2,20);rr(24,23,6,2,25);rr(35,23,6,2,25);rr(25,23,3,1,26);rr(36,23,3,1,26);
  pp([[25,27],[29,27],[32,26],[35,27],[39,27],[37,32],[33,35],[29,34],[26,31]],4);
  pp([[28,28],[32,27],[35,28],[36,31],[33,34],[29,32]],5);rr(30,29,4,1,0);rr(31,28,2,1,0);rr(30,31,4,1,0);rr(32,32,2,3,21);rr(33,33,1,2,20);
 }
 // Two curved, ridged purple horns; foreshorten the far horn in profile.
 function horn(points,far){for(let i=1;i<points.length;i++){const [x,y]=points[i-1],[a,b]=points[i];l(x+ox,y+oy,a+ox,b+oy,4,0)}for(let i=1;i<points.length;i++){const [x,y]=points[i-1],[a,b]=points[i];l(x+ox,y+oy,a+ox,b+oy,2,far?14:15)}for(let i=1;i<points.length-1;i++){const [x,y]=points[i];rr(x-1,y-1,2,1,far?15:16)}}
 horn(side?[[27,18],[23,17],[20,14],[19,10],[20,7],[18,5]]:[[27,18],[22,17],[18,15],[16,11],[17,7],[14,4]],side);
 horn(side?[[39,18],[44,16],[46,12],[45,8],[46,5],[49,4]]:[[38,18],[43,17],[47,15],[49,11],[48,7],[51,4]],false);
 if(!rear){const sx=side?37:29,sy=14;
  pp([[sx+1,sy],[sx+7,sy],[sx+9,sy+3],[sx+9,sy+7],[sx+7,sy+9],[sx+2,sy+9],[sx,sy+6],[sx,sy+2]],0);
  rr(sx+1,sy+1,7,6,9);rr(sx+2,sy+1,5,6,11);rr(sx+6,sy+1,1,2,12);rr(sx+2,sy+4,2,2,13);rr(sx+6,sy+4,1,2,13);rr(sx+4,sy+6,1,1,13);rr(sx+2,sy+7,5,2,9);rr(sx+3,sy+7,1,1,11);rr(sx+5,sy+7,1,1,11);
 }
 if(side&&!punch){p([[22,33+bob],[27,33+bob],[30,36+bob],[27,40+bob],[21,39+bob],[20,36+bob]],0);r(22,34+bob,5,4,5);r(22,35+bob,2,2,21);r(25,35+bob,3,3,9);r(26,35+bob,1,2,11)}
 if(punch){const [ex,ey]=[[25,35],[48,36],[56,34],[37,41]][f];arm(26,36+bob,ex,ey+bob,false,true)}
 if(direction==='left')g.forEach(row=>row.reverse());
 return g.map(row=>row.join(''));
}
export const animations=[];
for(const action of ['idle','walk'])for(const dir of ['down','left','right','up'])animations.push({name:`${action}-${dir}`,fps:action==='idle'?5:8,loop:true,frames:Array.from({length:4},(_,f)=>pose(dir,action,f))});
for(const dir of ['left','right'])animations.push({name:`punch-${dir}`,fps:12,loop:false,frames:Array.from({length:4},(_,f)=>pose(dir,'punch',f))});
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href)console.log(JSON.stringify({palette,animations}));
