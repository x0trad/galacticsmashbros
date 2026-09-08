'use client';
import { useEffect,useRef,useState } from 'react';
import { RadioGroup,RadioGroupItem } from '@/components/ui/radio-group';
import {Joystick} from './joystick';
import {Arena,draw,loadSprites,W,H,type Dog} from './arena';
export default function Home(){
 const [dog,setDog]=useState<Dog>('green'),[mode,setMode]=useState('lobby'),[ready,setReady]=useState(false),[error,setError]=useState(false),[muted,setMuted]=useState(false),[best,setBest]=useState(0),[hud,setHud]=useState({hp:100,score:0,wave:0,enemies:0});
 const canvas=useRef<HTMLCanvasElement>(null),game=useRef<Arena|null>(null),images=useRef(new Map<string,HTMLImageElement>()),keys=useRef(new Set<string>()),status=useRef('lobby'),audio=useRef<AudioContext|null>(null),silent=useRef(false),bestRef=useRef(0);
 const joystick=useRef(new Joystick()),stickKnob=useRef<HTMLSpanElement>(null),smashPointer=useRef<number|null>(null);
 function paintStick(){if(stickKnob.current)stickKnob.current.style.transform=`translate(${joystick.current.knob.x}px, ${joystick.current.knob.y}px)`}
 function change(next:string){joystick.current.reset();paintStick();smashPointer.current=null;keys.current.clear();status.current=next;setMode(next)}
 function sound(name:string){if(silent.current||!audio.current)return;const ac=audio.current,o=ac.createOscillator(),v=ac.createGain();const freq:Record<string,number>={punch:180,hit:95,damage:65,heal:680,wave:440,over:100};o.type=name==='heal'?'sine':'square';o.frequency.setValueAtTime(freq[name]||180,ac.currentTime);o.frequency.exponentialRampToValueAtTime(name==='heal'?1000:40,ac.currentTime+.16);v.gain.setValueAtTime(.045,ac.currentTime);v.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.2);o.connect(v);v.connect(ac.destination);o.start();o.stop(ac.currentTime+.21)}
 function start(){if(!ready)return;try{audio.current??=new AudioContext();void audio.current.resume()}catch{}game.current=new Arena(dog,sound);setHud({hp:100,score:0,wave:0,enemies:0});change('playing')}
 function pause(){if(status.current==='playing')change('paused');else if(status.current==='paused')change('playing')}
 useEffect(()=>{let live=true;loadSprites().then(map=>{if(live){images.current=map;setReady(true)}}).catch(()=>{if(live)setError(true)});try{const b=Number(localStorage.getItem('gd-smash-best')||0);bestRef.current=b;setBest(b)}catch{}return()=>{live=false}},[]);
 useEffect(()=>{let frame=0,last=0,tick=0;function loop(now:number){const dt=Math.min((now-last)/1000,.04);last=now;const g=game.current;if(g&&canvas.current){if(status.current==='playing'){g.update(dt,keys.current,joystick.current.value);if(g.over){if(g.score>bestRef.current){bestRef.current=g.score;setBest(g.score);try{localStorage.setItem('gd-smash-best',String(g.score))}catch{}}change('over')}}const ctx=canvas.current.getContext('2d');if(ctx)draw(ctx,g,images.current);if(now-tick>80){setHud({hp:g.player.hp,score:g.score,wave:g.wave,enemies:g.enemies.length});tick=now}}frame=requestAnimationFrame(loop)}frame=requestAnimationFrame(loop);
 const down=(e:KeyboardEvent)=>{if(['INPUT','BUTTON'].includes((e.target as HTMLElement)?.tagName)&&e.key===' ')return;const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)&&status.current!=='lobby')e.preventDefault();if(k==='escape'&&!e.repeat){pause();return}if(status.current==='playing')keys.current.add(k)};const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());const blur=()=>{keys.current.clear();if(status.current==='playing')change('paused')};const hide=()=>{if(document.hidden)blur()};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hide);return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hide);void audio.current?.close()}},[]);
 const point=(e:React.PointerEvent)=>({x:e.clientX,y:e.clientY});
 const releaseStick=(e:React.PointerEvent)=>{if(joystick.current.end(e.pointerId))paintStick()};
 const stickEvents={
  onPointerDown:(e:React.PointerEvent<HTMLDivElement>)=>{if(e.button!==0)return;e.preventDefault();const r=e.currentTarget.getBoundingClientRect();if(joystick.current.begin(e.pointerId,{x:r.left+r.width/2,y:r.top+r.height/2},point(e))){e.currentTarget.setPointerCapture(e.pointerId);paintStick()}},
  onPointerMove:(e:React.PointerEvent<HTMLDivElement>)=>{if(joystick.current.move(e.pointerId,point(e)))paintStick()},
  onPointerUp:releaseStick,onPointerCancel:releaseStick,onLostPointerCapture:releaseStick,
 };
 const releaseSmash=(e:React.PointerEvent)=>{if(smashPointer.current===e.pointerId){smashPointer.current=null;keys.current.delete(' ')}};
 const smashEvents={onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{if(e.button!==0||smashPointer.current!==null)return;e.preventDefault();smashPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);keys.current.add(' ')},onPointerUp:releaseSmash,onPointerCancel:releaseSmash,onLostPointerCapture:releaseSmash};
 useEffect(()=>{
  if(mode!=='playing')return;
  const root=document.documentElement,body=document.body;
  const scrollX=window.scrollX,scrollY=window.scrollY;
  const saved={position:body.style.position,top:body.style.top,left:body.style.left,width:body.style.width};
  root.classList.add('game-active');
  Object.assign(body.style,{position:'fixed',top:`-${scrollY}px`,left:`-${scrollX}px`,width:'100%'});
  const stopScroll=(e:Event)=>{if(e.cancelable)e.preventDefault()};
  document.addEventListener('touchmove',stopScroll,{passive:false});
  document.addEventListener('wheel',stopScroll,{passive:false});
  return()=>{
   document.removeEventListener('touchmove',stopScroll);
   document.removeEventListener('wheel',stopScroll);
   root.classList.remove('game-active');
   Object.assign(body.style,saved);
   window.scrollTo({left:scrollX,top:scrollY,behavior:'instant'});
  };
 },[mode]);
 return <main><header><a className="brand" href="/" aria-label="Galactic Dog Smash home">GD<span>✳</span></a><span className="eyebrow">GALACTIC DOG SMASH</span><span className="version">ARCADE / 001</span></header><section className="game-shell" aria-label="Galactic Dog Smash game"><div className="topbar"><span><i/> ORBITAL ARENA</span><button className="sound" onClick={()=>{silent.current=!muted;setMuted(!muted)}} aria-pressed={muted}>{muted?'SOUND OFF':'SOUND ON'} ♪</button></div><div className="stage">
 {mode==='lobby'?<div className="lobby"><p className="eyebrow lime">GOOD DOGS. BAD ATTITUDE.</p><h1>GALACTIC<br/>DOG <em>SMASH</em></h1><p className="intro">One space station. An endless rogue pack.<br/>How long can you hold your ground?</p><RadioGroup aria-label="Choose your dog" value={dog} onValueChange={v=>setDog(v as Dog)} className="dogs">{(['green','grey','purple'] as Dog[]).map(c=><label key={c} className={dog===c?'dog selected':'dog'}><img src={`/sprites/${c}-idle-down-1.png`} alt={`${c} space dog`}/><span><RadioGroupItem value={c} aria-label={`${c} dog`}/>{c.toUpperCase()}</span></label>)}</RadioGroup><button className="launch" onClick={start} disabled={!ready}>{error?'SPRITES COULD NOT LOAD':ready?'ENTER THE ARENA':'LOADING THE PACK…'} <span>↗</span></button><p className="small">{error?'Reload the page to try again.':best?`PERSONAL BEST · ${best.toLocaleString()}`:'Choose your dog. Make some space.'}</p></div>:<><canvas ref={canvas} width={W} height={H} aria-label="Arena. Use WASD or arrow keys to move, hold Space to punch. Avoid enemy dogs and collect green health packs."/><div className="hud"><div>HEALTH {hud.hp}<div className="health" role="meter" aria-label="Health" aria-valuenow={hud.hp} aria-valuemin={0} aria-valuemax={100}><div style={{width:`${hud.hp}%`}}/></div></div><div>WAVE <b>{String(hud.wave).padStart(2,'0')}</b></div><div>SCORE <b>{hud.score.toLocaleString()}</b></div><button onClick={pause} aria-label={mode==='paused'?'Resume game':'Pause game'}>{mode==='paused'?'▶':'Ⅱ'}</button></div>{mode==='playing'&&<div className="touch"><div className="stick-wrap"><div className="joystick" role="group" aria-label="Movement joystick. Drag in any direction; drag farther to move faster. Release to stop." {...stickEvents}><span className="stick-cross" aria-hidden="true">＋</span><span className="stick-knob" ref={stickKnob} aria-hidden="true"/></div><span className="stick-hint">DRAG TO MOVE</span></div><button className="smash" {...smashEvents}>SMASH</button></div>}{(mode==='paused'||mode==='over')&&<div className="overlay"><p className="eyebrow lime">{mode==='paused'?'TAKE A BREATHER':'END OF TRANSMISSION'}</p><h2>{mode==='paused'?'PACK ON PAUSE.':'DOG GONE.'}</h2><p>{mode==='paused'?'Your arena will be right here.':`Wave ${hud.wave} · ${game.current?.kills||0} dogs smashed · ${hud.score.toLocaleString()} points`}</p>{mode==='over'&&<p className="small">PERSONAL BEST · {best.toLocaleString()}</p>}<button className="launch" onClick={mode==='paused'?pause:start}>{mode==='paused'?'BACK TO THE FIGHT':'ONE MORE ROUND'} ↗</button><button className="secondary" onClick={()=>change('lobby')}>Choose another dog</button></div>}</>}
 {mode==='lobby'&&<span className="corner">STATION // K-9</span>}</div><footer><span><kbd>W A S D</kbd> MOVE</span><span><kbd>SPACE</kbd> HOLD TO PUNCH</span><span><kbd>ESC</kbd> PAUSE</span></footer></section><div className="under"><span>SURVIVAL MODE · ENDLESS WAVES</span><span>BUILT FOR THE PACK.</span></div></main>
}
