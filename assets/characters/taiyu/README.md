# taiyu

Pixel-art robot based on the supplied `TAIYO ROBOT.png`. Created with Sprites MCP under the requested character name **taiyu**.

## Files

- `frames/`: 40 transparent 192×192 PNGs, four distinct frames per animation.
- `taiyu.sprite.json`: editable 64×64 Sprites MCP document; exact 3× export preserves sharp pixels.
- `taiyu-sheet.png`: 768×1920 sheet, four columns and ten animation rows.
- `taiyu-atlas.json`: frame names, coordinates, timing, and animation tags.
- `preview.html`: local animated preview with pause control.
- `build-poses.mjs`: original pixel geometry used to author the MCP frames.
- `export.mjs`: reproducible PNG, atlas and preview export using Node.js built-ins.

Idle and walk animations cover down, left, right and up. Punch covers left and right. Idle runs at 5 fps, walk at 8 fps, punch at 12 fps. Punch previews repeat for inspection; their animation metadata is non-looping. Profile views mirror each other; front and rear have separately drawn details. Feet share a floor reference, with deliberate stepping and small body movement.

After editing in MCP, copy `/Users/kaylaru/sprites/taiyu.sprite.json` here and run `node assets/characters/taiyu/export.mjs` from the game project.

Punch frames use a wide stepping stance: the rear foot lifts during extension, both feet plant for impact, and the front foot lifts during recovery. This adds leg movement to the four-frame punch cycle.

These assets are ready for game integration. The character selector has not been modified by this asset-generation task.
