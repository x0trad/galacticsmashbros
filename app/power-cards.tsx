'use client';
import type {CSSProperties} from 'react';
import {Flame,Radio} from 'lucide-react';
import {powerCards,powerIds,type PowerId} from './arena';

function PowerIcon({id}:{id:PowerId}){
 if(id==='barricade')return <span className="barricade-icon" aria-hidden="true"/>;
 if(id==='shield'||id==='haste')return <span className={`power-sprite power-sprite-${id}`} aria-hidden="true"/>;
 const Icon=id==='fury'?Flame:Radio;
 return <Icon className="power-icon" aria-hidden="true"/>;
}
const color=(id:PowerId)=>({'--power-color':powerCards[id].color} as CSSProperties);

export function PowerLoadout({loadout,onChange}:{loadout:PowerId[];onChange:(next:PowerId[])=>void}){
 return <fieldset className="power-loadout"><legend>CHOOSE THREE POWER CARDS</legend><p>Tap a card during play or press 1, 2, or 3. All cards are free to try.</p><div className="loadout-slots">{loadout.map((id,slot)=>{
  const card=powerCards[id];return <label className="loadout-slot" key={slot} style={color(id)}><span className="slot-number">SLOT {slot+1}</span><PowerIcon id={id}/><select aria-label={`Power card for slot ${slot+1}`} value={id} onChange={e=>{const next=[...loadout];next[slot]=e.target.value as PowerId;onChange(next)}}>{powerIds.map(option=><option key={option} value={option} disabled={option!==id&&loadout.includes(option)}>{powerCards[option].name}</option>)}</select><span className="card-description">{card.description}</span><small>{card.duration>0?`${card.duration}s active · `:''}{card.cooldown}s cooldown</small></label>;
 })}</div></fieldset>;
}

export function PowerCard({id,slot,cooldown,life,onUse}:{id:PowerId;slot:number;cooldown:number;life:number;onUse:()=>void}){
 const card=powerCards[id];
 return <button className={`power-card${life>0?' active':''}`} style={color(id)} disabled={cooldown>0} title={card.description} aria-label={`${card.name}. Slot ${slot+1}. ${life>0?`Active for ${Math.ceil(life)} seconds. `:''}${cooldown>0?`${Math.ceil(cooldown)} seconds cooldown`:`Ready. Press ${slot+1}`}`} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();onUse()}} onClick={e=>{if(e.detail===0)onUse()}}><span className="card-key" aria-hidden="true">{slot+1}</span><PowerIcon id={id}/><span className="card-name">{card.name}</span><strong>{life>0?`ON ${Math.ceil(life)}s`:cooldown>0?`${Math.ceil(cooldown)}s`:'READY'}</strong><span className="card-recharge" aria-hidden="true"><span style={{width:`${100*(1-cooldown/card.cooldown)}%`}}/></span></button>;
}
