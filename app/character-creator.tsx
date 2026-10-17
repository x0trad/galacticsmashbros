'use client';
import {useEffect,useRef,useState} from 'react';
import {spriteFrameUrl} from './custom-sprite';
import {parseSpriteSpec,type SpriteSpec} from './sprite-spec';

export default function CharacterCreator({onClose,onEquip}:{onClose:()=>void;onEquip:(spec:SpriteSpec)=>Promise<void>}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [name,setName]=useState('');
  const [spec,setSpec]=useState<SpriteSpec|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [available,setAvailable]=useState<boolean|null>(null);
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
  useEffect(()=>{let live=true;fetch('/api/sprite',{cache:'no-store'}).then(response=>response.json() as Promise<{available?:boolean}>).then(result=>{if(live)setAvailable(result.available===true)}).catch(()=>{if(live)setAvailable(false)});return()=>{live=false}},[]);
  useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
  async function generate(){
    if(!file||busy)return;
    if(file.size>3_000_000){setError('Choose an image under 3 MB.');return}
    setBusy(true);setError('');setSpec(null);
    try{
      const form=new FormData();form.set('artwork',file);form.set('name',name);
      const response=await fetch('/api/sprite',{method:'POST',body:form});
      const result=await response.json() as {error?:string;spec?:unknown};
      if(!response.ok||!result.spec)throw new Error(result.error||'Character generation failed.');
      setSpec(parseSpriteSpec(result.spec));
    }catch(cause){setError(cause instanceof Error?cause.message:'Character generation failed.')}finally{setBusy(false)}
  }
  async function equip(){if(!spec||busy)return;setBusy(true);setError('');try{await onEquip(spec);onClose()}catch(cause){setError(cause instanceof Error?cause.message:'Could not load the sprite.');setBusy(false)}}
  return <dialog className="creator-dialog" ref={dialog} onCancel={event=>{if(busy){event.preventDefault();return}onClose()}} aria-labelledby="creator-title">
    <div className="creator-heading"><div><p className="eyebrow">NFT → FIGHTER</p><h2 id="creator-title">Bring your art to the arena.</h2></div><button type="button" className="creator-close" aria-label="Close character creator" disabled={busy} onClick={onClose}>×</button></div>
    <p className="creator-intro">Upload artwork from an NFT you own. Astra reads its visual traits; the game builds a playable 192×192 pixel character with forty animation frames.</p>
    {available===false&&<p className="creator-notice" role="status">The creator preview is ready. Astra generation will open when the site’s API key is connected.</p>}
    <div className="creator-grid"><div className="creator-source"><label className="creator-upload">CHOOSE NFT ARTWORK<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{setFile(event.target.files?.[0]||null);setSpec(null);setError('')}}/></label><div className="creator-art">{preview?<img src={preview} alt="Selected source artwork"/>:<span>PNG, JPG or WebP<br/>up to 3 MB</span>}</div><label className="creator-name">CHARACTER NAME <span>(OPTIONAL)</span><input maxLength={24} value={name} onChange={event=>setName(event.target.value)} placeholder="Let Astra name it"/></label><p className="creator-note">Generation sends this image to OpenAI. Artwork is not stored by the game. Uploading a file does not verify NFT ownership.</p></div>
    <div className="creator-result"><span className="creator-label">GAME SPRITE PREVIEW</span>{spec?<><div className="creator-poses">{(['down','right','up'] as const).map(direction=><img key={direction} src={spriteFrameUrl(spec,'idle',direction,1)} alt={`${spec.name} facing ${direction}`}/>)}</div><strong>{spec.name}</strong><span>40 frames · 192×192 PNG · idle / walk / punch</span><button type="button" className="creator-primary" disabled={busy} onClick={()=>void equip()}>USE THIS FIGHTER ↗</button></>:<div className="creator-placeholder"><img src="/sprites/green-idle-down-1.png" alt="Example game sprite"/><span>Your new fighter will appear here.</span></div>}</div></div>
    {error&&<p className="creator-error" role="alert">{error}</p>}
    <div className="creator-actions"><button type="button" className="creator-primary" disabled={!file||busy||available!==true} onClick={()=>void generate()}>{busy?'WORKING…':spec?'REGENERATE WITH ASTRA':'GENERATE WITH ASTRA'}</button><button type="button" className="creator-secondary" disabled={busy} onClick={onClose}>BACK TO SELECTION</button></div>
  </dialog>;
}
