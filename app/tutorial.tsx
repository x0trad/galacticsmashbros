'use client';
import {useEffect,useRef} from 'react';

export default function Tutorial({starting,onDone,onClose}:{starting:boolean;onDone:()=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=dialog.current;el?.showModal();el?.querySelector<HTMLElement>('h2')?.focus({preventScroll:true});if(el)el.scrollTop=0;return()=>el?.close()},[]);
 return <dialog ref={dialog} className="tutorial" aria-labelledby="tutorial-title" onCancel={e=>{e.preventDefault();onClose()}}>
  <p className="eyebrow lime">QUICK START</p>
  <h2 id="tutorial-title" tabIndex={-1}>Ready for the arena?</h2>
  <ol>
   <li><h3>Move and dodge</h3><p>Drag the joystick to move. On a keyboard, use WASD or the arrow keys. Dodge the pink lasers—the aiming line warns you before a shot.</p></li>
   <li><h3>Keep smashing</h3><p>Hold SMASH to punch nearby enemies while moving. On a keyboard, hold Space.</p></li>
   <li><h3>Use your three cards</h3><p>Choose three different powers before a run. Tap a card or press 1, 2 or 3 to activate it. Wait for READY before using it again. Barricade deploys in the direction you face.</p></li>
  </ol>
  <p className="tutorial-tip">Clear each wave to advance. Green health packs restore health. Tap pause or press Esc for a break. On phones, play in portrait.</p>
  <div className="tutorial-actions"><button className="launch" onClick={onDone}>{starting?'LET’S PLAY':'GOT IT'}</button><button className="secondary" onClick={starting?onDone:onClose}>{starting?'Skip tutorial':'Close'}</button></div>
 </dialog>;
}
