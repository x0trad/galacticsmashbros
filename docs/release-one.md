# Release one: Wave preview

Updated user scope, 20 October 2026:

- Only the original Galactic Dog character, with Green/Grey/Purple colour variants, appears in character selection and landing artwork. Additional character art is retained locally for later, including Bloody, Fox, SMG and Taiyu. Previously saved custom fighters do not appear in this release roster.
- Waves 1–2 are free. The simulation pauses before Wave 3 and presents the future Galactic Dog / 2D Ticket access requirement, plus a return-to-selection button for replaying free waves.
- Connect Wallet is a disabled “Coming soon” placeholder. No wallet requests, signatures or NFT checks are initiated. No chain is selected or promised in the UI.
- The new chain-specific access API/session implementation and migration were withdrawn from this release at the user's request. Historical wallet-link code remains separate and unused. Local test tables, if created during the discarded test, are not used or shipped as data.
- Creator, shop and PvP entries are hidden from the Wave release menu. Both experimental generation endpoints are disabled unless `SPRITE_CREATOR_ENABLED=true`; leave it unset for release one. Existing power cards are free gameplay abilities, not minted NFTs.

## Validation

`node tests/access.test.mjs` covers the free-wave boundary, preserved run and original roster. Existing combat/control/card tests and archived Bloody playback tests remain useful. `node tests/release-routes.test.mjs` verifies generation stays closed without external calls. TypeScript and production build must pass. Actual iPhone/Android playtesting remains necessary before launch.

Wave combat runs in the browser. The checkpoint is a product preview, not a cheat-proof paid entitlement or authoritative score system. Wallet profiles, chain choice and actual NFT ownership authorization will be implemented when the backend direction is settled.

## Publication

Local preview: http://localhost:3000/. This update is not deployed. Earlier publication was blocked by automatic approval review of a credential transfer. Use the supported verified Sites publishing workflow, without reusing the rejected transfer through another channel.
