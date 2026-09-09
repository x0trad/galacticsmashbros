export const kits = [
 {id:'standard',name:'Original gear',price:0,color:'#d2ff6b',filter:'none',description:'Your original sprite and classic lime punch.'},
 {id:'ion',name:'Ion Runner',price:200,color:'#69e6ff',filter:'hue-rotate(65deg) saturate(1.4)',description:'An electric colour finish with a cyan punch arc.'},
 {id:'solar',name:'Solar Bandit',price:300,color:'#ffb459',filter:'sepia(.55) saturate(1.7) hue-rotate(340deg)',description:'A warm gold finish with an amber punch arc.'},
 {id:'void',name:'Void Drifter',price:400,color:'#e699ff',filter:'hue-rotate(205deg) saturate(1.5)',description:'A cosmic colour finish with a violet punch arc.'},
] as const;
export type Inventory={credits:number;owned:string[];equipped:string;totalKills:number;runs:number};
export const freshInventory=():Inventory=>({credits:300,owned:['standard'],equipped:'standard',totalKills:0,runs:0});
export function parseInventory(raw:string|null):Inventory {
 if(!raw)return freshInventory();
 const v=JSON.parse(raw);if(!v||!Number.isSafeInteger(v.credits)||v.credits<0||!Array.isArray(v.owned)||!Number.isSafeInteger(v.totalKills)||v.totalKills<0||!Number.isSafeInteger(v.runs)||v.runs<0)throw Error('Invalid save');
 const owned=Array.from(new Set(['standard',...v.owned.filter((id:unknown)=>kits.some(k=>k.id===id))])) as string[];
 return {credits:v.credits,owned,equipped:owned.includes(v.equipped)?v.equipped:'standard',totalKills:v.totalKills,runs:v.runs};
}
export function purchase(v:Inventory,id:string):Inventory {const kit=kits.find(k=>k.id===id);if(!kit||v.owned.includes(id)||v.credits<kit.price)return v;return {...v,credits:v.credits-kit.price,owned:[...v.owned,id]}}
export function equip(v:Inventory,id:string):Inventory{return v.owned.includes(id)?{...v,equipped:id}:v}
export const runCredits=(kills:number,wave:number)=>Math.max(0,kills)*5+Math.max(0,wave-1)*25;
