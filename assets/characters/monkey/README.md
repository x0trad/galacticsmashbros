# Green Cap Monkey

Pixel-art animation set authored through the local Sprites MCP server, based on the green-cap character concept. Green/grey cap, red/blue glasses, purple fur and tail, brown jacket, teal trousers and gloves.

## Deliverables

- `frames/`: 40 transparent RGBA PNGs, each **192 × 192**.
- Ten folders following the supplied GD layout: `DOWN_IDLE_Monkey`, `DOWN_WALK_Monkey`, `LEFT_IDLE_Monkey`, `LEFT_WALK_Monkey`, `RIGHT_IDLE_Monkey`, `RIGHT_WALK_Monkey`, `UP_IDLE_Monkey`, `UP_WALK_Monkey`, `LEFT_PUNCH_Monkey`, `RIGHT_PUNCH_Monkey`.
- Four distinct poses per folder, numbered 1–4: e.g. `monkey-idle-down-1.png`.
- `monkey-sheet.png`: 768 × 1920, four columns, one animation per row.
- `monkey-atlas.json`: frame rectangles, durations and animation tags in export order.
- `monkey-green-cap.sprite.json`: editable **64 × 64** Sprites MCP document. Each source pixel becomes exactly 3 × 3 pixels at export.
- `preview.html`: open locally to inspect all animated loops. Punches repeat in the preview only.

Idle uses 5 fps, walking 8 fps, punches 12 fps. Punch frame order is wind-up, extension, impact, recovery. All frames share the same canvas and ground reference; the raised feet and small body bob are intentional motion. Side directions are mirrored, as in a conventional arcade sprite set.

## Re-export

Requires Node.js, with no additional packages:

```sh
node assets/characters/monkey/export.mjs
```

Edit the sprite with Sprites MCP, then copy its updated document from the configured sprite folder into this directory before re-exporting. `build-poses.mjs` preserves the original hand-authored geometry; it does not overwrite the MCP document automatically.

These are character assets only. The playable-character selector and game sprite loader have not been changed. Runtime integration, attack timing and hurtboxes remain separate gameplay work.
