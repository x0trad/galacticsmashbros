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

Current target chosen by the user: `galacticsmashbros.xyz`, separate document root `/home/dehuruih/galacticsmashbros.xyz`. This replaces the earlier `smash.dehumain.xyz` staging subdomain. Do not replace the main site's `public_html`.

The build uses relative URLs for script, style, image, audio and font assets, so it also supports installation into a subdirectory. The cPanel Vite transform affects only this standalone build, not the original server build. All three original Galactic Dog colours and animation files are copied from `public`; unreleased characters are excluded from the ZIP.

## Release scope

- Galactic Dog Green/Grey/Purple, three equipped power cards, audio and mobile/keyboard controls.
- Free Waves 1–2 and the paused Wave 3 “coming soon” checkpoint.
- Disabled wallet button. No active wallet, NFT verification, generation, PvP, purchases, cloud profiles or server APIs in this target.
- Best score is session-only. Closing/reloading the page resets this guest record.
- Never upload `.env*`, `.dev.vars*`, `.git`, `.wrangler`, `.openai`, source archives or API keys to the document root. The packaging script excludes these and scans generated text for credential-like content.

Use HTTPS after the subdomain certificate is issued. DNS and TLS provisioning are separate from file upload. A deployed page must be checked for sprite/font/audio requests and basic gameplay after upload. The static checkpoint is a preview, not tamper-proof paid access.

## Current deployment state

The new domain `galacticsmashbros.xyz` is already configured in cPanel and maps to `/home/dehuruih/galacticsmashbros.xyz`. The directory currently contains only `cgi-bin`. HTTPS is working on the new domain and currently serves an empty directory listing. The game ZIP is validated and ready for upload; the native file-picker action needs the user to select the ZIP. Publication is not complete until extraction and a public gameplay check succeed. The older staging subdomain remains separate.
