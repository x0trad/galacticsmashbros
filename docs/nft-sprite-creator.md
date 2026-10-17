# NFT artwork → full body → Sprite Forge fighter

1. Upload PNG, JPEG or WebP artwork and choose Normal or Chibi proportions.
2. Astra uses the image tool only to make a complete full-body reference. Review or redraw it before animation.
3. The backend samples that approved PNG onto a 64×64 grid and reduces it to at most 32 colours. This preserves the front-view artwork as actual indexed pixels.
4. Astra authors the other three facing views and limb regions as structured pixel rows. This request has no image-generation tool.
5. The Sprite Forge engine builds idle, walk and punch animations by moving the authored head and limb pixels. Walking and punch stages are local rendering operations in the Worker, with no OpenAI call.
6. Sprite Forge exports four frames per direction (40 total). The PNGs enlarge each logical pixel to an exact 3×3 block: 192×192 frames, no smoothing or antialiasing.

`app/sprite-forge/format.js` reuses the user's MIT-licensed local MCP implementation from `Downloads/sprite-mcp/src/format.js`. Only its PNG import uses pngjs's bundled browser implementation for Worker compatibility. This is the same palette, pixel-row, drawing and export format as the local Sprite Forge editor; the production server does not connect to a user's local stdio process. No local filesystem or MCP endpoint is exposed publicly.

The adapter in `engine.ts` adds bounded colour quantization, pixel-part animation and 3× export. `planner.ts` requests three original directional pixel views and a rig. Characters are not recoloured presets. Facing views, limb animation, and identity still need visual review; individual body-part motion can need artist refinement. The downloadable `.sprite.json` project opens in the existing editor/MCP for that work. Changing the full-body style redraws the reference; rebuilding idle regenerates all dependent movements. Old saved animation sheets remain usable and can be rebuilt through Redraw idle.

Full-body requests and pixel-view planning use the existing production `OPENAI_API_KEY` secret. D1 permits 50 successful/active requests per IP, per stage, per UTC day during testing. Provider failures refund the attempt. Origin, image, stage, approval and Sprite Forge input checks occur before provider spending. The approval flag follows the UI flow and does not prove NFT ownership.

Drafts and equipped fighters stay in IndexedDB in the current browser. Completed stages survive refresh and interrupted requests. Downloads include the full-body reference, combined PNG sheet, and editable Sprite Forge JSON. NFT ownership, wallet gating, minting, and server storage of character collections are separate features.

Validation: `node tests/sprite-creator.test.mjs` runs the Worker against a mocked provider and real D1 test database. It checks original reference bytes, Normal/Chibi styles, no image tool in the pixel planner, zero provider calls for walk/punch, 40-frame layout, exact 3× pixels, binary alpha, rate limits/refunds and streaming boundaries. Type checking and production build run before publication.
