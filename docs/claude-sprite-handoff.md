# Sprite work handoff

## Start here

The user wants to test character creation with Claude. The accepted visual starting point is `assets/characters/robot-rig-study/master.sprite.json`, a native 192×192 Sprite Forge project. Read `docs/nft-character-product-flow.md` for the product direction.

The latest idle study and a self-contained HTML preview are checked in at `assets/characters/robot-rig-study/idle/`. Open `preview.html` locally. It contains four frames with a fixed silhouette and a green reactor pulse. The user has not yet approved this idle.

## Current constraints

- Work on idle first; get visual approval before expanding to walking/punching.
- The Python cutout walk (`scripts/animate_sprite.py`) was rejected as hideous and unlike game animation. Do not treat its passing file tests as visual approval or use it as the style standard.
- Use native Sprite Forge workflows, actual authored pixel poses, and 192×192 transparent frames. Do not convert UI screenshots into artwork.
- Local Sprite Forge MCP code lives at `/Users/kaylaru/Downloads/sprite-mcp`; local projects live at `/Users/kaylaru/sprites`. These paths are machine-specific; the checked-in JSON/PNG assets work without them.
- No API credentials are included. No API calls are needed to open or edit the idle study.
- The current idle is a local review artifact, not deployed or equipped in the live game.

## Reproduce/check

```sh
node scripts/create_idle_study.mjs
```

This writes editable JSON under `output/robot-idle-study/` and checks that only reactor colours change, preserving silhouette and pixels outside that region. It does not render PNGs; use Sprite Forge for rendering/export. `docs/native192-robot-study.md` describes the source robot provenance.

The game is Wave-first: wallet login → verified supported NFT inventory → select NFT → approve full-body chibi → approve sprite animations → equip in Wave. PvP and NFT power-card loadouts follow later. Avoid implementing all these phases before the character quality is accepted.
