'use client';
export default function BarricadeCard({cooldown,life,onUse}:{cooldown:number;life:number;onUse:()=>void}) {
 return <button className="barricade-card" disabled={cooldown>0} aria-label={`Barricade. ${life>0?`Active for ${Math.ceil(life)} seconds. `:''}${cooldown>0?`${Math.ceil(cooldown)} seconds cooldown`:'Ready. Press 1 to deploy'}`} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();onUse()}} onClick={e=>{if(e.detail===0)onUse()}}>
  <span className="barricade-icon" aria-hidden="true"/><span>BARRICADE</span><strong>{life>0?`ACTIVE ${Math.ceil(life)}s`:cooldown>0?`${Math.ceil(cooldown)}s`:'READY · 1'}</strong>
 </button>
}
