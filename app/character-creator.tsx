'use client';
import {useEffect, useRef, useState} from 'react';
import {assembleFighter, getSpriteDraft, saveSpriteDraft, sliceSpriteSheet, swapSpriteDirections, loadImage} from './custom-sprite';
import {animationKinds, animationDirections, cleanCharacterName, frameKey, type CharacterStyle, type AnimationKind, type GeneratedFighter, type GenerationStage, type SpriteDraft} from './sprite-format';
import {generateImage} from './sprite-request';

const labels = {fullbody: 'Drawing your full-body character', idle: 'Drawing idle animations', walk: 'Drawing walking animations', punch: 'Drawing punch animations', equip: 'Loading your fighter'};
export default function CharacterCreator({onClose, onEquip}: {onClose: () => void; onEquip: (fighter: GeneratedFighter) => Promise<void>}) {
  const dialog = useRef<HTMLDialogElement>(null), abort = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState('');
  const [style, setStyle] = useState<CharacterStyle>('normal');
  const [name, setName] = useState(''), [refinement, setRefinement] = useState('');
  const [draft, setDraft] = useState<SpriteDraft | null>(null), [fighter, setFighter] = useState<GeneratedFighter | null>(null);
  const [frames, setFrames] = useState<Record<string, string>>({}), [tick, setTick] = useState(1);
  const [busy, setBusy] = useState<GenerationStage | 'equip' | null>(null), [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(''), [storageNote, setStorageNote] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null), [restoring, setRestoring] = useState(true);
  useEffect(() => {dialog.current?.showModal(); return () => {abort.current?.abort(); dialog.current?.close();};}, []);
  useEffect(() => {
    let live = true;
    fetch('/api/sprite', {cache: 'no-store'}).then(r => r.json() as Promise<{available?: boolean}>).then(r => {if (live) setAvailable(r.available === true);}).catch(() => {if (live) setAvailable(false);});
    getSpriteDraft().then(async saved => {
      if (!saved || !live) return;
      setDraft(saved); setName(saved.name); setStyle(saved.style || 'normal');
      const restored: Record<string, string> = {};
      for (const kind of animationKinds) if (saved.sheets[kind]) Object.assign(restored, await sliceSpriteSheet(saved.sheets[kind]!, kind));
      if (!live) return;
      setFrames(restored);
      if (animationKinds.every(kind => saved.sheets[kind])) setFighter(await assembleFighter(saved.name, saved.fullBody, saved.sheets));
    }).catch(() => {if (live) setStorageNote('Saved artwork could not be restored. You can start a new design.');}).finally(() => {if (live) setRestoring(false);});
    return () => {live = false;};
  }, []);
  useEffect(() => {if (!file) {setPreview(''); return;} const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url);}, [file]);
  useEffect(() => {const id = window.setInterval(() => setTick(value => value % 4 + 1), 160); return () => clearInterval(id);}, []);
  useEffect(() => {setElapsed(0); if (!busy) return; const id = window.setInterval(() => setElapsed(value => value + 1), 1000); return () => clearInterval(id);}, [busy]);
  async function remember(next: SpriteDraft) {
    setDraft(next);
    try {await saveSpriteDraft(next); setStorageNote('Progress saved in this browser.');}
    catch {setStorageNote('Browser storage is unavailable. Keep this page open and download your artwork.');}
  }
  function failed(cause: unknown) {setError(cause instanceof Error && cause.name === 'AbortError' ? 'Generation stopped. Completed steps are kept; you can continue when ready.' : cause instanceof Error ? cause.message : 'Generation failed. Please retry this step.');}
  async function fullBody() {
    if (busy || (!file && !draft)) return;
    setBusy('fullbody'); setError(''); abort.current = new AbortController();
    try {
      const input = draft ? await (await fetch(draft.fullBody)).blob() : file!;
      if (input.size > 12_000_000) throw new Error('Choose an image under 12 MB.');
      const image = await generateImage('fullbody', input, refinement, abort.current.signal, style);
      await loadImage(image);
      setFighter(null); setFrames({});
      await remember({version: 2, name: cleanCharacterName(name), fullBody: image, approved: false, style, sheets: {}});
    } catch (cause) {failed(cause);} finally {setBusy(null);}
  }
  async function animate(only?: AnimationKind) {
    if (!draft || busy) return;
    setBusy(only || 'idle'); setError(''); setFighter(null); abort.current = new AbortController();
    let current = {...draft, name: cleanCharacterName(name), approved: true, sheets: {...draft.sheets}};
    try {
      await remember(current);
      const reference = await (await fetch(current.fullBody)).blob();
      for (const kind of only ? [only] : animationKinds) {
        if (!only && current.sheets[kind]) continue;
        setBusy(kind);
        const image = await generateImage(kind, reference, '', abort.current.signal, current.style || 'normal');
        const extracted = await sliceSpriteSheet(image, kind);
        setFrames(value => ({...value, ...extracted}));
        current = {...current, sheets: {...current.sheets, [kind]: image}};
        await remember(current);
      }
      if (animationKinds.every(kind => current.sheets[kind])) setFighter(await assembleFighter(current.name, current.fullBody, current.sheets));
    } catch (cause) {failed(cause);} finally {setBusy(null);}
  }
  async function equip() {
    if (!fighter || busy) return;
    setBusy('equip'); setError('');
    try {await onEquip({...fighter, name: cleanCharacterName(name)}); onClose();}
    catch (cause) {failed(cause); setBusy(null);}
  }
  async function swapDirections(kind: AnimationKind) {
    if (!draft?.sheets[kind] || busy) return;
    setBusy(kind); setError('');
    try {
      const image = await swapSpriteDirections(draft.sheets[kind]!, kind);
      const next = {...draft, sheets: {...draft.sheets, [kind]: image}};
      const extracted = await sliceSpriteSheet(image, kind);
      setFrames(value => ({...value, ...extracted}));
      await remember(next);
      if (animationKinds.every(action => next.sheets[action])) setFighter(await assembleFighter(next.name, next.fullBody, next.sheets));
    } catch (cause) {failed(cause);} finally {setBusy(null);}
  }
  async function downloadFrames() {
    if (!fighter) return;
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 1920;
    const ctx = canvas.getContext('2d')!; let row = 0;
    for (const kind of animationKinds) for (const direction of animationDirections(kind)) {
      for (let frame = 1; frame <= 4; frame++) ctx.drawImage(await loadImage(fighter.frames[frameKey(kind, direction, frame)]), (frame - 1) * 192, row * 192);
      row++;
    }
    canvas.toBlob(blob => {if (!blob) return; const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `${cleanCharacterName(name)}-192-sprites.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);});
  }
  const disabled = Boolean(busy) || restoring;
  const stage = draft?.approved ? 3 : draft ? 2 : 1;
  return <dialog className="creator-dialog" ref={dialog} onCancel={event => {if (busy) {event.preventDefault(); return;} onClose();}} aria-labelledby="creator-title">
    <div className="creator-heading"><div><p className="eyebrow">NFT → FULL BODY → FIGHTER</p><h2 id="creator-title">Bring your character to life.</h2></div><button type="button" className="creator-close" aria-label="Close character creator" disabled={Boolean(busy)} onClick={onClose}>×</button></div>
    <p className="creator-intro">Start with your artwork. Review a complete character design, then turn that approved image into animated game sprites.</p>
    <ol className="creator-steps" aria-label="Character creation steps">{['Upload artwork', 'Review full body', 'Animate & play'].map((label, index) => <li key={label} aria-current={stage === index + 1 ? 'step' : undefined}><b>{index + 1}</b>{label}</li>)}</ol>
    {available === false && <p className="creator-notice" role="status">Image generation is temporarily unavailable.</p>}
    <div className="creator-grid">
      <div className="creator-source"><span className="creator-label">01 / YOUR ARTWORK</span><label className="creator-upload">CHOOSE IMAGE<input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={event => {
        const selected = event.target.files?.[0]; if (!selected) return;
        if (selected.size > 12_000_000) {setError('Choose an image under 12 MB.'); return;}
        setFile(selected); setDraft(null); setFighter(null); setFrames({}); setRefinement(''); setError(''); void saveSpriteDraft(null).catch(() => {});
      }}/></label><div className="creator-art">{preview ? <img src={preview} alt="Your original NFT artwork"/> : <span>{draft ? 'Saved character restored. Choose a new image to start over.' : 'A portrait or existing NFT artwork'}<br/>PNG, JPG or WebP · up to 12 MB</span>}</div>
      <label className="creator-name">FIGHTER NAME<input maxLength={24} disabled={disabled} value={name} onChange={event => setName(event.target.value)} placeholder="Name your fighter"/></label>
      <fieldset className="creator-style" disabled={disabled}><legend>CHARACTER STYLE</legend><div className="creator-style-options">{(['normal', 'chibi'] as const).map(option => <label key={option} data-selected={style === option}><input type="radio" name="character-style" value={option} checked={style === option} onChange={() => setStyle(option)}/><span><strong>{option === 'normal' ? 'Normal' : 'Chibi'}</strong><small>{option === 'normal' ? 'Natural body proportions' : 'Big head · compact body'}</small></span></label>)}</div>{draft && style !== (draft.style || 'normal') && <p>Redraw the full body to apply this style. Existing animations use the reviewed design.</p>}</fieldset>
      <label className="creator-name creator-refinement">DESIGN NOTES <span>(OPTIONAL)</span><textarea maxLength={500} disabled={disabled} value={refinement} onChange={event => setRefinement(event.target.value)} placeholder="For example: keep the helmet, add matching armoured boots"/></label>
      <button type="button" className="creator-primary" disabled={disabled || available !== true || (!file && !draft)} onClick={() => void fullBody()}>{draft ? 'REDRAW FULL BODY' : 'GENERATE FULL BODY'}</button>
      <p className="creator-note">Your image is sent to OpenAI when you generate. Uploading artwork does not verify NFT ownership. Saved designs stay in this browser.</p></div>
      <div className="creator-result"><span className="creator-label">02 / FULL-BODY DESIGN</span>{draft ? <><div className="creator-body checkerboard"><img src={draft.fullBody} alt="Generated full-body character for review"/></div><p className="creator-review">{draft.style === 'chibi' ? 'Chibi' : 'Normal'} style. Check the helmet, colours, armour and proportions. This exact image will guide every animation.</p><a className="creator-download" href={draft.fullBody} download={`${cleanCharacterName(name)}-full-body.png`}>Download full-body image ↓</a><button type="button" className="creator-primary" disabled={disabled || available !== true || Boolean(fighter)} onClick={() => void animate()}>{draft.approved ? fighter ? 'ALL ANIMATIONS READY' : 'CONTINUE ANIMATIONS' : 'APPROVE & GENERATE SPRITES'}</button></> : <div className="creator-placeholder"><span className="creator-silhouette" aria-hidden="true">✦</span><span>Your complete character design<br/>will appear here first.</span></div>}</div>
    </div>
    {busy && <div className="creator-progress" role="status"><span className="creator-spinner" aria-hidden="true"/><div><strong>{labels[busy]}…</strong><span>{elapsed}s elapsed · Detailed artwork can take a few minutes per step.</span></div>{busy !== 'equip' && <button className="creator-secondary" onClick={() => abort.current?.abort()}>STOP</button>}</div>}
    {draft?.approved && <section className="creator-animation-section" aria-label="Generated animation previews"><div className="creator-animation-heading"><div><span className="creator-label">03 / ANIMATION REVIEW</span><h3>Forty frames. One character.</h3><p>192 × 192 per frame · 4 frames for every movement</p><p>Check the facing directions. If LEFT and RIGHT are reversed, swap them below without regenerating.</p></div></div>{animationKinds.map(kind => <div className="creator-animation-group" key={kind}><div className="creator-animation-title"><h4>{kind.toUpperCase()}</h4><span>{draft.sheets[kind] ? 'READY' : busy === kind ? 'DRAWING…' : 'WAITING'}</span>{draft.sheets[kind] && <><button className="creator-download" disabled={disabled} onClick={() => void swapDirections(kind)}>Swap {kind} left/right</button><button className="creator-download" disabled={disabled} onClick={() => void animate(kind)}>Redraw {kind}</button></>}</div><div className="creator-animation-grid">{animationDirections(kind).map(direction => <div className="creator-animation" key={direction}><div className="checkerboard">{frames[frameKey(kind, direction, tick)] ? <img src={frames[frameKey(kind, direction, tick)]} alt={`${kind} facing ${direction}, frame ${tick}`}/> : <span>···</span>}</div><span>{direction.toUpperCase()}</span></div>)}</div></div>)}</section>}
    {error && <p className="creator-error" role="alert">{error}</p>}
    {storageNote && <p className="creator-note" role="status">{storageNote}</p>}
    <div className="creator-actions">{fighter && <><button type="button" className="creator-primary" disabled={disabled} onClick={() => void equip()}>USE THIS FIGHTER ↗</button><button type="button" className="creator-secondary" disabled={disabled} onClick={() => void downloadFrames()}>DOWNLOAD SPRITE SHEET ↓</button></>}<button type="button" className="creator-secondary" disabled={Boolean(busy)} onClick={onClose}>BACK TO SELECTION</button></div>
  </dialog>;
}
