# cPanel static hosting

The first Wave MVP has a separate static build for ordinary Apache/cPanel hosting. It renders the same game component with `signedIn={false}`. The existing Cloudflare/Vinext build remains available separately.

## Build

```sh
npm ci
npm run build:cpanel
node tests/cpanel-package.test.mjs
npm run preview:cpanel
```

Upload `releases/galactic-smash-bros-cpanel.zip` and extract its contents directly into the game's document root. `index.html`, `.htaccess`, `assets/`, `audio/`, `branding/`, `fonts/`, `power-cards/` and `sprites/` should be siblings. There is no extra enclosing folder in the archive. No Node.js process or database is required.

Target chosen by the user: `smash.dehumain.xyz`, separate document root `/home/dehuruih/smash.dehumain.xyz`. Do not replace the main site's `public_html`.

The build uses relative URLs for script, style, image, audio and font assets, so it also supports installation into a subdirectory. The cPanel Vite transform affects only this standalone build, not the original server build. All three original Galactic Dog colours and animation files are copied from `public`; unreleased characters are excluded from the ZIP.

## Release scope

- Galactic Dog Green/Grey/Purple, three equipped power cards, audio and mobile/keyboard controls.
- Free Waves 1–2 and the paused Wave 3 “coming soon” checkpoint.
- Disabled wallet button. No active wallet, NFT verification, generation, PvP, purchases, cloud profiles or server APIs in this target.
- Best score is session-only. Closing/reloading the page resets this guest record.
- Never upload `.env*`, `.dev.vars*`, `.git`, `.wrangler`, `.openai`, source archives or API keys to the document root. The packaging script excludes these and scans generated text for credential-like content.

Use HTTPS after the subdomain certificate is issued. DNS and TLS provisioning are separate from file upload. A deployed page must be checked for sprite/font/audio requests and basic gameplay after upload. The static checkpoint is a preview, not tamper-proof paid access.

## Current deployment state

The subdomain and isolated document root were created successfully. The public HTTPS address resolves and serves the empty directory, confirming DNS/TLS readiness. The game upload has not completed; cPanel authentication expired during upload attempts. Sign in again, upload the prepared ZIP into this document root, extract it there, and verify the game at the public address. Do not describe the game as deployed until that verification succeeds.
