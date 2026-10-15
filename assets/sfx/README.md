# Galactic Smash Bros audio

These sounds were made with the [SFX Forge](https://github.com/x0trad/sfxforge) MCP generator. The editable `.sfx.json` recipes are in this folder; the game-ready WAV exports are in `public/audio/`.

| Sound | Use |
| --- | --- |
| `smash-house-landing` | House soundtrack on the landing page |
| `smash-menu-loop` | Character-selection and card-loadout music |
| `smash-battle-theme` | Wave arena music |
| `smash-character-select` | Choosing a character |
| `smash-menu-confirm` | Play Now and Enter the Arena |

Landing music starts on page load where the browser permits autoplay. On phones and browsers that block it, the first tap starts the music; the landing page also shows a **Tap for sound** control until playback succeeds. The Sound On/Off control affects both these sounds and the existing arena effects.
