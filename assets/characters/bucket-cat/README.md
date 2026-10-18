# Bucket Cat

Working name for the character based on the supplied `7514.webp` reference.

40 transparent 192×192 PNGs: four frames each for idle and walk in down/left/right/up, and punch left/right. Idle 4 fps, walk 8 fps, punch 12 fps. Punch metadata is non-looping; the preview repeats punches for inspection. Left/right views mirror; front and back have separately authored details. Punch poses include wide stepping legs and alternate foot lifts.

## Files

- `preview.html`: all ten animations with pause/play.
- `frames/`: individual 192×192 PNGs.
- `bucket-cat-sprites-192.zip`: portable export package.
- `bucket-cat.sprite.json`: editable native 64×64 Sprite Forge project, exact 3× export like Taiyu.
- `bucket-cat-sheet.png` / `bucket-cat-atlas.json`: 768×1920 game sheet and atlas.
- `native/`: connected Sprite Forge MCP export at original resolution.
- `design-front.sprite.json`: preserved original still design.
- `build-idle.mjs`: original LLM-authored native drawing operations.
- `build-poses.mjs`: authored directional pixel poses; redraws limbs rather than rotating cutouts.
- `export.mjs`: PNG/atlas/preview export; run `node assets/characters/bucket-cat/export.mjs`.
- `validate.mjs`: checks all 40 enlarged frames against native MCP export and moving-leg punches.

The poses were saved to connected Sprites MCP as 40 native frames and rendered through its export_sheet tool. No screenshots, image generation calls, or paid API calls were used. Orange/white fur, fish bucket hat and pink top follow the reference; shorts, sneakers and tail complete the cropped body. Registered as FOX in the Wave character selector; runtime PNGs are copied to public/sprites/fox-*.png.

Tail correction: profiles extend the tail behind the rear hip; front view hides it behind the body; back view retains it. The original design-front project is preserved as history.

Short-tail revision: rear tuft reduced to about 8 native pixels (24 export pixels), with a small white tip; no tall curling tail. Canonical project and native export contain the revision.

Direction standard: DOWN shows the front, UP shows the back. In idle-up and walk-up, the short tail attaches centrally to the rear waistband and is drawn over the back of the clothing so it remains visible. Profiles keep it behind the hip; front views hide it. Apply this convention to future tailed characters.
