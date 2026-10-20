export default function AccessPass({locked=false}:{locked?:boolean}){
 return <section className="access-pass" aria-label="NFT access coming soon"><button className="wallet-coming-soon" disabled aria-describedby={locked?'holder-wallet-note':'lobby-wallet-note'}>CONNECT WALLET <span>COMING SOON</span></button><p id={locked?'holder-wallet-note':'lobby-wallet-note'} className="wallet-note">{locked?'Wave 3+ will unlock with a Galactic Dog NFT or 2D Ticket. Wallet access is not available yet.':'Waves 1–2 are free. NFT access from Wave 3 is coming soon.'}</p></section>
}
