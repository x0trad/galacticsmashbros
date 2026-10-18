# Local sprite animation proof

This test animates the approved native 192×192 Astra robot using Python and Pillow. It makes **no API calls**. It does not generate artwork or run Astra: it articulates existing pixel parts with nearest-neighbour sampling.

## Run

Requires Python 3 and Pillow (`python3 -m pip install Pillow` if missing).

```sh
npm run sprite:walk
npm run test:sprite-rig
```

The source is `assets/characters/robot-rig-study/master.sprite.json`. The matching `walk-rig.json` defines limb rectangles, attachment pivots, overlap regions and four poses. This rig is specific to this robot; other characters need their own masks and pivots.

Outputs under `output/python-walk-study/`:

- Four transparent 192×192 front/down walking PNGs.
- A 768×192 PNG sheet and enlarged animated GIF.
- An editable `sprite-forge/1` project with a `walk-down` animation at 8 fps.
- `preview.html` with master, animation, pause control and all four poses.
- Provenance recording source hash, rig settings and zero API calls.

Open the HTML locally to review the motion. The PNG sheet can also be imported through Sprite Forge MCP with frameWidth/frameHeight 192. The proof was imported and exported through the connected local Sprite Forge engine; its exported PNG is checked against the Python output.

## Limits and next step

Only the front walk is implemented. It is a subtle cutout walk, with static helmet/torso and alternating leg/forearm movement. It is not a complete 40-frame fighter and is not equipped in the live game. Approve or refine this movement first, then prepare actual left/right/back artwork and corresponding rigs. Rigging cannot invent missing surfaces. Punches will need separate arm poses, joint coverage and moving-leg variants.

Source master provenance: `docs/native192-robot-study.md`. The master was authored by Astra as native Sprite Forge commands; the Python step introduces no newly generated artwork. No paid services or game runtime dependencies were added.
