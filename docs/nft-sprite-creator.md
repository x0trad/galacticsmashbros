# Chibi creator through Sprite Forge

The creator supports Chibi only. The API rejects Normal requests, and the UI offers no Normal option. Historical saved fighters remain playable; regeneration requires a fresh Chibi full body.

Every generation stage is authored through Sprite Forge commands:

1. The uploaded artwork is shown to Astra as a visual reference. Astra submits the `set_frame` function command with an original 24–30-colour palette and 48×48 indexed pixel rows for a complete Chibi character.
2. Astra sees the original Galactic Dog game frames as the style reference and its real indexed front frame as a pixel-cluster example. A second set_frame finishing pass compares the first rendered draft with the original identity and Galactic Dog before returning the review image. The backend executes that command using the user's Sprite Forge engine and renders a 192×192 review image. No image-generation tool, raster sampling, quantization or illustration filter is used.
3. After approval, Astra authors the three other facing views and four idle poses per direction. `author_animation` is a bounded command batch: create animations, duplicate base frames, apply pixel `draw` patches and export through Sprite Forge.
4. Walk and punch use the same command path. Each pose is explicitly authored as pixel edits against its facing base. There is no hard-coded body-part rig or canned limb transform.
5. Forty frames are exported: idle and walk in four directions, punch left/right, four frames each. Every logical pixel becomes an exact 4×3 block at 192×192, with binary transparency and no smoothing.

`app/sprite-forge/format.js` reuses the user's MIT-licensed local MCP implementation from `Downloads/sprite-mcp/src/format.js`; its PNG import uses pngjs's browser bundle for Worker compatibility. The production Worker executes the shared Sprite Forge engine and format. It does not expose or connect to the user's local stdio process. The downloadable `.sprite.json` document is editable with the existing Sprite Forge editor/MCP.

`planner.ts` defines the Sprite Forge function commands for Astra. `engine.ts` validates and executes authored palette rows and pixel patches. Views and frames must be complete, remain inside the 48×48 canvas and palette, and include at least three distinct poses per movement. Character likeness, facing accuracy and motion still require visual review; these are AI-authored pixel sprites and may need an artist's edits.

The existing production `OPENAI_API_KEY` secret is used for Astra function calling. No request includes an image-generation tool. D1 allows 50 successful/active requests per IP, per stage, per UTC day during testing. Invalid inputs are rejected before provider spending, and failed generation refunds the attempt. The approval gate follows the UI flow; it does not verify NFT ownership.

Drafts store the original pixel source, Sprite Forge document and completed PNG sheets in IndexedDB. Downloads include the reviewed full body, combined sprite sheet and Sprite Forge project. Old generated designs require a fresh Chibi full body; saved fighters are preserved.

Validation: `node tests/sprite-creator.test.mjs` tests the Worker with a mocked function-calling provider and real D1 database: Chibi-only rejection, command execution at every stage, absence of image generation, authored poses, exact 4× export, binary alpha, pixel validation, streaming, draft restoration and rate limits/refunds. Type checking and production build run before publication.


## Art standard

Original Galactic Dog uses a 48×48 logical grid enlarged 4×, with about 26–27 opaque colours per frame. New characters target the same pixel density, frame coverage, clean contours, readable anatomy and clustered material shading. The structural gate rejects clipped or undersized full-body masters. Reference inputs and a finishing pass improve consistency; these checks do not certify art quality. Review likeness, helmet construction, material detail and movement before approving a fighter. Old 64×64 generation drafts require a new full body; their saved fighters remain playable.
