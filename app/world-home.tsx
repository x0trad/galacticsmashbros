'use client';
import {useEffect,useRef,useState} from 'react';
import {Menu,X} from 'lucide-react';
type Destination='play'|'characters'|'cards';
export default function WorldHome({onEnter,muted,musicStarted,onLandingInteraction,onToggleSound}:{onEnter:(destination:Destination)=>void;muted:boolean;musicStarted:boolean;onLandingInteraction:()=>void;onToggleSound:()=>void}){
 const menu=useRef<HTMLDetailsElement>(null),about=useRef<HTMLDialogElement>(null);
 const [showAbout,setShowAbout]=useState(false);
 useEffect(()=>{if(showAbout)about.current?.showModal();else about.current?.close()},[showAbout]);
 function enter(destination:Destination){if(menu.current)menu.current.open=false;onEnter(destination)}
 return <main className="world-home" onPointerDownCapture={onLandingInteraction} onClickCapture={onLandingInteraction} onKeyDownCapture={onLandingInteraction}>
  <div className="world-status">WAVE ARENA <span>✦</span> FREE TO PLAY</div>
  <header className="world-header">
   <details ref={menu} className="world-menu"><summary aria-label="Open navigation"><Menu size={24}/><span>MENU</span></summary><nav aria-label="Main navigation"><button onClick={()=>enter('play')}>Play</button><button onClick={()=>enter('characters')}>Characters</button><button onClick={()=>enter('cards')}>Power Cards</button><button onClick={()=>{if(menu.current)menu.current.open=false;setShowAbout(true)}}>About</button></nav></details>
   <a href="/" className="world-brand" aria-label="Galactic Smash Bros home"><img src="/branding/gsb-logo.png" alt="" width={1254} height={1254}/></a>
   <button className="world-sound" onClick={onToggleSound} aria-label={muted?'Turn sound on':musicStarted?'Turn sound off':'Play landing music'} aria-pressed={!muted&&musicStarted}>{muted?'SOUND OFF':musicStarted?'SOUND ON':'TAP FOR SOUND'} ♪</button>
  </header>
  <section className="world-scene" aria-label="Galactic Smash Bros home">
   <img className="world-backdrop" src="/branding/orbital-world.png" alt="" fetchPriority="high"/>
   <div className="world-content"><h1><img src="/branding/gsb-logo.png" alt="Galactic Smash Bros" width={1254} height={1254}/></h1><p>Your character. Your powers.<br className="world-mobile-break"/> Your arena.</p><button className="world-play" onClick={()=>enter('play')}>PLAY NOW</button><span className="world-play-note">Choose your fighter. Equip three cards.</span></div>
   <div className="world-pack" aria-hidden="true"><img src="/sprites/green-idle-down-1.png" alt=""/><img src="/sprites/smg-idle-down-1.png" alt=""/><img src="/sprites/taiyu-idle-down-1.png" alt=""/></div>
   <div className="world-footer"><span>GALACTIC SMASH BROS</span><span>ONE STATION. ENDLESS WAVES.</span></div>
  </section>
  <dialog ref={about} className="world-about" aria-labelledby="world-about-title" onCancel={()=>setShowAbout(false)}><button className="world-close" aria-label="Close about" onClick={()=>setShowAbout(false)}><X/></button><p className="eyebrow lime">WELCOME TO STATION K-9</p><h2 id="world-about-title">Make some space.</h2><p>Choose your fighter, equip three power cards and smash through waves of the rogue pack. Dodge lasers, build barricades and see how long you can survive.</p><p>Play on your phone in portrait, or use a keyboard on desktop. No wallet is needed to play.</p><button className="world-play" onClick={()=>enter('play')}>PLAY NOW</button></dialog>
 </main>
}
