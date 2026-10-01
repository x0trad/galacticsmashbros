import type { Movement } from './joystick';
export const W=1100,H=660;
export type Dog='green'|'grey'|'purple'|'smg'|'taiyu';
export const characters:Dog[]=['green','grey','purple','smg','taiyu'];
export const characterNames:Record<Dog,string>={green:'GREEN',grey:'GREY',purple:'PURPLE',smg:'SMG',taiyu:'TAIYU'};
export const characterLabel=(c:Dog)=>c==='smg'?'SMG monkey':c==='taiyu'?'Taiyu robot':`${c} space dog`;
export type Actor={x:number;y:number;dir:string;color:Dog;hp:number;max:number;vx:number;vy:number;hurt:number;attack:number;moving:boolean;spawn:number;shooter?:boolean;fireTimer?:number;aimTimer?:number;aimX?:number;aimY?:number};
export type Boost='fury'|'haste'|'shield';
export type PowerId=Boost|'barricade'|'super';
export const powerIds:PowerId[]=['barricade','fury','haste','shield','super'];
export const defaultLoadout:PowerId[]=['barricade','shield','haste'];
export const powerCards:Record<PowerId,{name:string;color:string;duration:number;cooldown:number;description:string}>={
 barricade:{name:'BARRICADE',color:'#42dddf',duration:4,cooldown:18,description:'Block enemies and lasers with a wall ahead of you.'},
 fury:{name:'FURY',color:'#ff996d',duration:6,cooldown:22,description:'Double your punch damage for 6 seconds.'},
 haste:{name:'HASTE',color:'#70e6ff',duration:6,cooldown:20,description:'Move and punch faster for 6 seconds.'},
 shield:{name:'SHIELD',color:'#c6a2ff',duration:4,cooldown:24,description:'Block incoming damage for 4 seconds.'},
 super:{name:'SUPER SMASH',color:'#ffe285',duration:0,cooldown:22,description:'Push nearby enemies back with a damaging shockwave.'},
};
export type Particle={x:number;y:number;vx:number;vy:number;life:number;color:string};
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function inPunchRange(p:Actor,e:Actor){const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy);const dot=p.dir==='left'?-dx:p.dir==='right'?dx:p.dir==='up'?-dy:dy;return d<112&&(d<35||dot/d>-.15)}
export const shooterCount=(wave:number,total:number)=>wave<2?0:Math.min(4,Math.floor(total/4),1+Math.floor((wave-1)/3));
export function segmentDistance(px:number,py:number,ax:number,ay:number,bx:number,by:number){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?clamp(((px-ax)*dx+(py-ay)*dy)/l,0,1):0;return Math.hypot(px-ax-t*dx,py-ay-t*dy)}
export type Barricade={x:number;y:number;w:number;h:number;life:number;hp:number;vertical:boolean};
// Earliest contact along a swept segment, including fast-moving projectiles.
export function wallContact(ax:number,ay:number,bx:number,by:number,b:Barricade,pad=0){
 let enter=0,exit=1;
 for(const [a,d,lo,hi] of [[ax,bx-ax,b.x-b.w/2-pad,b.x+b.w/2+pad],[ay,by-ay,b.y-b.h/2-pad,b.y+b.h/2+pad]]){
  if(Math.abs(d)<1e-9){if(a<lo||a>hi)return null;continue}
  const t0=(lo-a)/d,t1=(hi-a)/d;enter=Math.max(enter,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1));if(enter>exit)return null;
 }return enter;
}
export class Arena{
 readonly loadout:readonly PowerId[];
 boostCooldowns:Record<Boost,number>={fury:0,haste:0,shield:0};
 cardCooldown(id:PowerId){return id==='barricade'?this.barricadeCooldown:id==='super'?this.superCooldown:this.boostCooldowns[id]}
 cardLife(id:PowerId){return id==='barricade'?this.barricade?.life||0:id==='super'?this.shockwave:this.boosts[id]}
 activateCard(slot:number){
  const id=this.loadout[slot];if(!id||this.over||this.cardCooldown(id)>0)return false;
  if(id==='barricade')return this.deployBarricade();
  if(id==='super')return this.superSmash();
  this.boosts[id]=powerCards[id].duration;this.boostCooldowns[id]=powerCards[id].cooldown;
  this.sound('boost');this.burst(this.player.x,this.player.y,powerCards[id].color);return true;
 }
 barricade:Barricade|null=null;barricadeCooldown=0;
 deployBarricade(){
  if(this.over||!this.loadout.includes('barricade')||this.barricadeCooldown>0)return false;
  const p=this.player,vertical=p.dir==='left'||p.dir==='right',w=vertical?24:160,h=vertical?160:24;
  const x=p.x+(p.dir==='left'?-85:p.dir==='right'?85:0),y=p.y+(p.dir==='up'?-85:p.dir==='down'?85:0);
  // Reject cramped placement rather than clamping the wall onto its owner.
  if(x-w/2<35||x+w/2>W-35||y-h/2<65||y+h/2>H-30)return false;
  const b={x,y,w,h,life:powerCards.barricade.duration,hp:100,vertical};this.barricade=b;this.barricadeCooldown=powerCards.barricade.cooldown;
  for(const e of this.enemies){if(wallContact(e.x,e.y,e.x,e.y,b,21)!==null){if(vertical)e.x=x+(e.x<x?-1:1)*(w/2+22);else e.y=y+(e.y<y?-1:1)*(h/2+22)}}
  this.sound('boost');this.burst(x,y,'#42dddf',12);return true;
 }

 lasers:{x:number;y:number;vx:number;vy:number;life:number}[]=[];superCooldown=0;
 shockwave=0; shockOrigin={x:0,y:0}; boosts:Record<Boost,number>={fury:0,haste:0,shield:0};
 cosmetic={filter:'none',color:'#d2ff6b'};
 player:Actor; enemies:Actor[]=[];particles:Particle[]=[];pickups:{x:number;y:number;life:number}[]=[];score=0;wave=0;kills=0;cooldown=0;between=1;banner=0;time=0;shake=0;over=false;
 constructor(color:Dog,public sound:(name:string)=>void=()=>{},loadout:readonly PowerId[]=defaultLoadout){this.loadout=Object.freeze([...new Set([...loadout,...defaultLoadout].filter(id=>powerIds.includes(id)))].slice(0,3));this.player={x:W/2,y:H/2,dir:'down',color,hp:100,max:100,vx:0,vy:0,hurt:0,attack:0,moving:false,spawn:0}}
 burst(x:number,y:number,color:string,n=14){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=60+Math.random()*200;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3+Math.random()*.3,color})}}
 nextWave(){this.wave++;this.banner=2.2;this.sound('wave');const total=Math.min(4+this.wave*2,24),ranged=shooterCount(this.wave,total);this.lasers=[];const colors=(['green','grey','purple'] as Dog[]).filter(c=>c!==this.player.color);for(let i=0;i<total;i++){const side=i%4;this.enemies.push({x:side===0?65:side===1?W-65:80+Math.random()*(W-160),y:side===2?85:side===3?H-55:85+Math.random()*(H-160),dir:'down',color:colors[i%colors.length],hp:2+Math.floor((this.wave-1)/4),max:2+Math.floor((this.wave-1)/4),vx:0,vy:0,hurt:0,attack:0,moving:i>=ranged,shooter:i<ranged,fireTimer:1.5+i*.7,aimTimer:0,spawn:.8+i*.12})}}
 hit(e:Actor,damage:number,force:number){e.hp-=damage;e.hurt=.25;if(e.shooter){e.aimTimer=0;e.fireTimer=Math.max(e.fireTimer||0,1.2)}const dx=e.x-this.player.x,dy=e.y-this.player.y,d=Math.hypot(dx,dy)||1;e.vx=dx/d*force;e.vy=dy/d*force;this.burst(e.x,e.y,this.cosmetic.color);if(e.hp<=0){this.score+=100+this.wave*10;this.kills++;if(this.kills%5===0)this.pickups.push({x:e.x,y:e.y,life:18});}}
 punch(){if(this.cooldown>0||this.over)return;this.cooldown=this.boosts.haste>0?.2:.34;this.player.attack=.24;this.sound('punch');let hit=false;for(const e of this.enemies){if(e.spawn>0||e.hp<=0||!inPunchRange(this.player,e))continue;hit=true;this.hit(e,this.boosts.fury>0?2:1,520)}if(hit){this.shake=7;this.sound('hit')}this.enemies=this.enemies.filter(e=>e.hp>0)}
 superSmash(){if(this.over||!this.loadout.includes('super')||this.superCooldown>0)return false;this.superCooldown=powerCards.super.cooldown;this.shockwave=.6;this.shockOrigin={x:this.player.x,y:this.player.y};this.player.hurt=Math.max(this.player.hurt,.25);this.shake=16;this.sound('super');for(const e of this.enemies){if(e.spawn<=0&&e.hp>0&&Math.hypot(e.x-this.player.x,e.y-this.player.y)<=140)this.hit(e,1,650)}this.enemies=this.enemies.filter(e=>e.hp>0);this.burst(this.player.x,this.player.y,'#ffe285',50);return true}
 update(dt:number,keys:Set<string>,stick:Movement={x:0,y:0}){if(this.over)return;this.time+=dt;this.barricadeCooldown=Math.max(0,this.barricadeCooldown-dt);if(this.barricade){this.barricade.life-=dt;if(this.barricade.life<=0||this.barricade.hp<=0)this.barricade=null;}this.superCooldown=Math.max(0,this.superCooldown-dt);this.shockwave=Math.max(0,this.shockwave-dt);for(const k of ['fury','haste','shield'] as Boost[]){this.boosts[k]=Math.max(0,this.boosts[k]-dt);this.boostCooldowns[k]=Math.max(0,this.boostCooldowns[k]-dt);}this.cooldown=Math.max(0,this.cooldown-dt);this.banner=Math.max(0,this.banner-dt);this.shake=Math.max(0,this.shake-dt*35);const p=this.player;p.hurt=Math.max(0,p.hurt-dt);p.attack=Math.max(0,p.attack-dt);let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));let dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));const keyboardLength=Math.hypot(dx,dy);if(keyboardLength){dx/=keyboardLength;dy/=keyboardLength}else{dx=stick.x;dy=stick.y}p.moving=dx!==0||dy!==0;if(p.moving){if(Math.abs(dx)>=Math.abs(dy))p.dir=dx<0?'left':'right';else p.dir=dy<0?'up':'down';const l=Math.max(1,Math.hypot(dx,dy));p.x=clamp(p.x+dx/l*245*(this.boosts.haste>0?1.45:1)*dt,55,W-55);p.y=clamp(p.y+dy/l*245*(this.boosts.haste>0?1.45:1)*dt,90,H-48)}for(let slot=0;slot<3;slot++){const key=String(slot+1);if(keys.has(key)){this.activateCard(slot);keys.delete(key)}}if(keys.has(' '))this.punch();
 for(const e of this.enemies){e.spawn=Math.max(0,e.spawn-dt);e.hurt=Math.max(0,e.hurt-dt);if(e.spawn>0)continue;const oldX=e.x,oldY=e.y;let ex=p.x-e.x,ey=p.y-e.y;const d=Math.hypot(ex,ey)||1;e.dir=Math.abs(ex)>Math.abs(ey)?(ex<0?'left':'right'):(ey<0?'up':'down');if(e.shooter)this.updateShooter(e,dt);const speed=e.shooter?0:Math.min(132,68+this.wave*5);e.x+=ex/d*speed*dt+e.vx*dt;e.y+=ey/d*speed*dt+e.vy*dt;e.vx*=Math.exp(-dt*9);e.vy*=Math.exp(-dt*9);if(!e.shooter)for(const other of this.enemies){if(other===e||other.spawn>0)continue;const sx=e.x-other.x,sy=e.y-other.y,sep=Math.hypot(sx,sy);if(sep>0&&sep<38){e.x+=sx/sep*40*dt;e.y+=sy/sep*40*dt}}e.x=clamp(e.x,45,W-45);e.y=clamp(e.y,85,H-40);const b=this.barricade;if(b){const t=wallContact(oldX,oldY,e.x,e.y,b,21);if(t!==null){e.x=oldX+(e.x-oldX)*Math.max(0,t-.001);e.y=oldY+(e.y-oldY)*Math.max(0,t-.001);e.vx=0;e.vy=0;if(!e.shooter)b.hp-=25*dt;if(b.hp<=0){this.burst(b.x,b.y,'#42dddf');this.barricade=null}}}if(Math.hypot(p.x-e.x,p.y-e.y)<43&&e.hurt<=0&&(!this.barricade||wallContact(e.x,e.y,p.x,p.y,this.barricade)===null))this.damagePlayer(14)}
 if(this.over)return;
 for(const laser of this.lasers){const x=laser.x,y=laser.y;laser.x+=laser.vx*dt;laser.y+=laser.vy*dt;laser.life-=dt;const b=this.barricade,wallT=b?wallContact(x,y,laser.x,laser.y,b):null;
 const lx=laser.x-x,ly=laser.y-y,rx=x-p.x,ry=y-p.y,aa=lx*lx+ly*ly,bb=2*(rx*lx+ry*ly),cc=rx*rx+ry*ry-625,disc=bb*bb-4*aa*cc;
 const playerT=cc<=0?0:aa>0&&disc>=0?(-bb-Math.sqrt(disc))/(2*aa):Infinity;
 if(b&&wallT!==null&&(playerT<0||playerT>1||wallT<=playerT)){laser.life=0;b.hp-=20;this.burst(x+lx*wallT,y+ly*wallT,'#42dddf',4);if(b.hp<=0)this.barricade=null;continue}
 if(segmentDistance(p.x,p.y,x,y,laser.x,laser.y)<25){this.damagePlayer(10);laser.life=0}if(laser.x<35||laser.x>W-35||laser.y<65||laser.y>H-30)laser.life=0}
 this.lasers=this.lasers.filter(l=>l.life>0);if(this.over)return;

 for(const h of this.pickups){h.life-=dt;if(Math.hypot(p.x-h.x,p.y-h.y)<42&&p.hp<100){p.hp=Math.min(100,p.hp+25);this.sound('heal');h.life=0;this.burst(p.x,p.y,'#8affd0')}}this.pickups=this.pickups.filter(h=>h.life>0);for(const a of this.particles){a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt}this.particles=this.particles.filter(a=>a.life>0);if(this.enemies.length===0){this.lasers=[];this.between-=dt;if(this.between<=0){this.nextWave();this.between=2.5}}}
 damagePlayer(amount:number){const p=this.player;if(this.over||p.hurt>0||this.boosts.shield>0)return;p.hp=Math.max(0,p.hp-amount);p.hurt=1;this.shake=9;this.burst(p.x,p.y,'#ff717b');this.sound('damage');if(p.hp<=0){this.over=true;this.sound('over')}}
 updateShooter(e:Actor,dt:number){if(e.hurt>0)return;
 if((e.aimTimer||0)>0){e.aimTimer=Math.max(0,(e.aimTimer||0)-dt);if(e.aimTimer===0){const dx=e.aimX??0,dy=e.aimY??1;if(this.lasers.length<8){this.lasers.push({x:e.x+dx*25,y:e.y+dy*25,vx:dx*280,vy:dy*280,life:5});this.sound('laser')}e.fireTimer=Math.max(2.6,3.8-this.wave*.08)}return}
 e.fireTimer=(e.fireTimer||0)-dt;if(e.fireTimer<=0){const dx=this.player.x-e.x,dy=this.player.y-e.y,d=Math.hypot(dx,dy)||1;e.aimX=dx/d;e.aimY=dy/d;e.aimTimer=.9}
 }

}
export async function loadSprites(){const map=new Map<string,HTMLImageElement>();await Promise.all(characters.flatMap(color=>['idle','walk','punch'].flatMap(action=>(action==='punch'?['left','right']:['left','right','up','down']).flatMap(dir=>[1,2,3,4].map(async f=>{const key=`${color}-${action}-${dir}-${f}`,img=new Image();img.src=`/sprites/${key}.png`;await img.decode();map.set(key,img)})))));return map}
export function draw(ctx:CanvasRenderingContext2D,g:Arena,images:Map<string,HTMLImageElement>){ctx.save();ctx.clearRect(0,0,W,H);ctx.fillStyle='#0b151e';ctx.fillRect(0,0,W,H);if(g.shake)ctx.translate((Math.random()-.5)*g.shake,(Math.random()-.5)*g.shake);ctx.fillStyle='#182932';ctx.fillRect(30,62,W-60,H-90);ctx.strokeStyle='#29404a';ctx.lineWidth=1;for(let x=30;x<W-30;x+=52){ctx.beginPath();ctx.moveTo(x,62);ctx.lineTo(x,H-28);ctx.stroke()}for(let y=62;y<H-28;y+=52){ctx.beginPath();ctx.moveTo(30,y);ctx.lineTo(W-30,y);ctx.stroke()}ctx.strokeStyle='#506d70';ctx.lineWidth=3;ctx.strokeRect(30,62,W-60,H-90);ctx.strokeStyle='#c9ef6260';ctx.strokeRect(46,78,W-92,H-122);ctx.fillStyle='#213740';ctx.beginPath();ctx.arc(W/2,H/2,110,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#3a535b';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#456068';ctx.textAlign='center';ctx.font='bold 42px monospace';ctx.fillText('K—9',W/2,H/2+14);ctx.font='12px monospace';ctx.fillText('ORBITAL COMBAT DECK',W/2,H/2+38);for(const x of [32,W-40])for(let y=105;y<H-60;y+=104){ctx.fillStyle='#bdf367';ctx.fillRect(x,y,8,30)}
 for(const h of g.pickups){const y=h.y+Math.sin(g.time*5)*3;ctx.fillStyle='#9affbd';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=15;ctx.fillRect(h.x-15,y-15,30,30);ctx.shadowBlur=0;ctx.fillStyle='#14212a';ctx.textAlign='center';ctx.font='bold 22px monospace';ctx.fillText('+',h.x,y+8);}
 if(g.barricade){const b=g.barricade;ctx.save();ctx.translate(b.x,b.y);if(b.vertical)ctx.rotate(Math.PI/2);ctx.globalAlpha=b.life<1&&Math.floor(g.time*12)%2===0?.4:1;ctx.fillStyle='#42dddf';ctx.shadowColor='#42dddf';ctx.shadowBlur=8;ctx.fillRect(-80,-12,160,4);ctx.fillRect(-80,8,160,4);ctx.restore();}
 if(g.shockwave>0){const radius=140*(1-g.shockwave/.6);ctx.globalAlpha=g.shockwave/.6;ctx.strokeStyle='#ffe285';ctx.lineWidth=12;ctx.beginPath();ctx.arc(g.shockOrigin.x,g.shockOrigin.y,Math.max(1,radius),0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffe28522';ctx.fill();ctx.globalAlpha=1}
 if(g.boosts.shield>0){ctx.strokeStyle='#c6a2ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(g.player.x,g.player.y-5,52,0,Math.PI*2);ctx.stroke()}

 for(const e of g.enemies){if(e.shooter&&e.spawn<=0){ctx.strokeStyle='#ff8cb3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y+12,32,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ff9bbe';ctx.font='bold 12px monospace';ctx.fillText('LASER',e.x,e.y-62);if((e.aimTimer||0)>0){ctx.save();ctx.setLineDash([10,12]);ctx.globalAlpha=.65;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+(e.aimX||0)*1500,e.y+(e.aimY||0)*1500);ctx.stroke();ctx.restore()}}}
 for(const l of g.lasers){ctx.strokeStyle='#ff568e';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(l.x-l.vx*.07,l.y-l.vy*.07);ctx.lineTo(l.x,l.y);ctx.stroke();ctx.strokeStyle='#fff0f4';ctx.lineWidth=3;ctx.stroke()}
 ctx.imageSmoothingEnabled=false;for(const a of [...g.enemies,g.player].sort((a,b)=>a.y-b.y)){const player=a===g.player;if(a.spawn>0){ctx.strokeStyle='#ff7887';ctx.beginPath();ctx.arc(a.x,a.y,24+Math.sin(g.time*8)*4,0,7);ctx.stroke();continue}ctx.fillStyle=player?'#caff6433':'#fa68792b';ctx.beginPath();ctx.ellipse(a.x,a.y+19,30,10,0,0,7);ctx.fill();if(player){ctx.strokeStyle='#d0ff67';ctx.stroke();ctx.fillStyle='#d0ff67';ctx.font='bold 12px monospace';ctx.fillText('YOU',a.x,a.y-55)}let action=a.attack>0?'punch':a.moving?'walk':'idle',dir=a.dir;if(action==='punch'&&dir!=='left'&&dir!=='right')dir='right';const f=action==='punch'?Math.min(4,1+Math.floor((.24-a.attack)/.06)):1+Math.floor(g.time*(a.moving?10:5))%4;const img=images.get(`${a.color}-${action}-${dir}-${f}`);ctx.globalAlpha=a.hurt>0&&Math.floor(g.time*18)%2===0?.4:1;if(player)ctx.filter=g.cosmetic.filter;if(img)ctx.drawImage(img,a.x-56,a.y-66,112,112);ctx.filter='none';ctx.globalAlpha=1;if(!player){ctx.fillStyle='#293b43';ctx.fillRect(a.x-20,a.y-51,40,4);ctx.fillStyle='#ff7d91';ctx.fillRect(a.x-20,a.y-51,40*a.hp/a.max,4)}}
 if(g.player.attack>0){const p=g.player,a=p.dir==='right'?0:p.dir==='left'?Math.PI:p.dir==='up'?-Math.PI/2:Math.PI/2;ctx.strokeStyle=g.cosmetic.color;ctx.globalAlpha=p.attack/.24;ctx.lineWidth=7;ctx.beginPath();ctx.arc(p.x,p.y,76,a-.95,a+.95);ctx.stroke();ctx.globalAlpha=1}for(const p of g.particles){ctx.globalAlpha=Math.min(1,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,5,5)}ctx.globalAlpha=1;if(g.banner>0){ctx.fillStyle='#cfff65';ctx.font='900 36px monospace';ctx.fillText(`WAVE ${String(g.wave).padStart(2,'0')}`,W/2,145)}else if(g.enemies.length===0&&!g.over){ctx.fillStyle='#cfff65';ctx.font='bold 24px monospace';ctx.fillText(g.wave?'PACK CLEARED. STAY READY.':'READY, SPACE DOG?',W/2,145)}ctx.restore()}
