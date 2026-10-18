# Galactic Smash Bros — character product flow

Agreed direction: players connect a wallet, select an NFT they already own, turn that character into a game sprite, and use it first in Wave mode. PvP and NFT power cards follow later.

## Character quality gate (current)

Approve the front idle before building more poses. The latest `output/robot-idle-study/` is a planted, four-frame reactor pulse authored as native Sprite Forge rows. The rejected Python cutout walk is not an accepted character animation. No new generation API calls were used for this idle. `node scripts/create_idle_study.mjs` reproduces the editable idle and checks silhouette stability.

## Wave MVP flow

1. Connect wallet and sign a login challenge; the backend verifies the signature.
2. Read supported NFT holdings and show an inventory. An indexer or collection adapter is needed; a wallet connection alone cannot enumerate every NFT. Verify ownership on the backend before generation.
3. Choose an NFT and name the fighter. Upload is a development fallback, not proof of ownership.
4. Generate a full-body chibi design and review it before animation. Preserve the original NFT identity and record chain, collection, token ID and design version.
5. Approve idle, then create directional idle/walk and moving-leg punch poses in Sprite Forge. Export validated 192×192 transparent frames.
6. Preview, equip and play Wave mode. Save the generated assets server-side so the character works across devices and does not need regeneration.

Selecting an NFT should not automatically mint another NFT. Recheck ownership when equipping and define what happens after transfer. Owning a token does not necessarily grant adaptation rights; use collection permissions for supported collections.

## Later PvP and power cards

Use the approved character system in PvP after the Wave experience is reliable. Power cards are a separate NFT inventory: choose three owned cards before a match. The authoritative game server locks the loadout, verifies eligibility and controls cooldowns, damage and effects. Blockchain transactions belong in ownership/trading flows; movement and attacks run on the game server.

Keep character cosmetics separate from combat stats. Balance power types through cooldowns and counters. Do not assume paid rarity means higher damage.

## Implementation order

- Current: front idle art approval.
- Next: full directional character animation and Wave validation.
- Then: wallet login, supported collection inventory, ownership checks and persistent generated-character storage.
- Then: end-to-end NFT-to-Wave onboarding.
- Later: authoritative PvP, NFT card ownership and loadout validation, followed by marketplace integration.

This document records the intended flow; wallet inventory and production NFT generation are not implemented by this idle study.
