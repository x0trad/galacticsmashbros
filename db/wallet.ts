import {isAddress,recoverMessageAddress,type Hex} from 'viem';
import {RequestError} from './store';
export const CHAIN_ID=46630;
export async function linkedWallet(db:D1Database,user:string){return db.prepare('SELECT address,chain_id AS chainId,linked_at AS linkedAt FROM wallets WHERE player_id=?').bind(user).first()}
export async function challenge(db:D1Database,user:string,address:unknown,origin:string){
 if(typeof address!=='string'||!isAddress(address))throw new RequestError('Invalid wallet address');
 const normalized=address.toLowerCase(),nonce=crypto.randomUUID().replaceAll('-',''),now=Date.now(),expiresAt=now+300000;
 const message=`${new URL(origin).host} wants you to verify this wallet for GALACTIC DOG SMASH:\n${normalized}\n\nLink this wallet to your signed-in game profile. No payment, token approval, or transaction is requested.\n\nURI: ${origin}\nVersion: 1\nChain ID: ${CHAIN_ID}\nNonce: ${nonce}\nIssued At: ${new Date(now).toISOString()}\nExpiration Time: ${new Date(expiresAt).toISOString()}`;
 await db.prepare('INSERT INTO wallet_challenges (player_id,nonce,address,message,expires_at,consumed) VALUES (?,?,?,?,?,0) ON CONFLICT(player_id) DO UPDATE SET nonce=excluded.nonce,address=excluded.address,message=excluded.message,expires_at=excluded.expires_at,consumed=0').bind(user,nonce,normalized,message,expiresAt).run();
 return {nonce,message,expiresAt};
}
export async function verifyWallet(db:D1Database,user:string,nonce:unknown,signature:unknown){
 if(typeof nonce!=='string'||typeof signature!=='string'||!/^0x[0-9a-fA-F]{130}$/.test(signature))throw new RequestError('A standard EVM wallet signature is required. Smart-contract wallets are not supported yet.');
 const row=await db.prepare('SELECT address,message,expires_at,consumed FROM wallet_challenges WHERE player_id=? AND nonce=?').bind(user,nonce).first<{address:string;message:string;expires_at:number;consumed:number}>();
 if(!row||row.consumed||row.expires_at<=Date.now())throw new RequestError('Verification expired or was already used. Connect again.',409);
 let recovered:string;try{recovered=await recoverMessageAddress({message:row.message,signature:signature as Hex})}catch{throw new RequestError('Invalid wallet signature')}
 if(recovered.toLowerCase()!==row.address)throw new RequestError('Signature does not match this wallet',403);
 try{const result=await db.batch([
 db.prepare('UPDATE wallet_challenges SET consumed=1 WHERE player_id=? AND nonce=? AND consumed=0 AND expires_at>?').bind(user,nonce,Date.now()),
 db.prepare('INSERT INTO wallets (player_id,address,chain_id,linked_at) SELECT ?,?,?,? WHERE changes()=1 ON CONFLICT(player_id) DO UPDATE SET address=excluded.address,chain_id=excluded.chain_id,linked_at=excluded.linked_at').bind(user,row.address,CHAIN_ID,Date.now()),
 ]);if(!result[0].meta.changes)throw new RequestError('Verification expired or was already used. Connect again.',409);
 }catch(e){if(String(e).includes('UNIQUE constraint failed: wallets.address'))throw new RequestError('This wallet is already linked to another game account.',409);throw e}
}
export async function unlinkWallet(db:D1Database,user:string){await db.batch([db.prepare('DELETE FROM wallets WHERE player_id=?').bind(user),db.prepare('DELETE FROM wallet_challenges WHERE player_id=?').bind(user)])}
