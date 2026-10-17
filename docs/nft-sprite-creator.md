# Artwork → full body → animated fighter

The creator uses a two-stage visual workflow:

1. Upload a PNG, JPEG or WebP reference (up to 12 MB) and optionally add design notes. Astra directs the image-generation tool to draw a complete full-body pixel character, preserving the source identity and palette.
2. Review the actual generated image. Redraw it with design notes or download it. Nothing is animated until the player presses **Approve & generate sprites**.
3. Use the approved full-body image as the image input for three sequential image-generation requests: idle, walk and punch. Each request creates an actual transparent PNG sheet. Idle and walk have four directions and four frames per direction; punches have four frames for each of left/right, with open legs in a walking stride.
4. Slice the images into forty 192×192 frames, preview the loops, retry individual animations if needed, and equip the fighter in wave mode. A combined 768×1920 sheet can be downloaded: idle down/left/right/up, walk down/left/right/up, punch left/right, four frames across each row.

`gpt-6-astra` orchestrates `gpt-image-2.5-sunburst` through the Responses image-generation tool. The old fixed-feature JSON schema and geometric character painter are removed. No generated art is substituted with a preset sprite. The source artwork is not used directly for animation: the approved full-body PNG is passed to every animation request.

The server uses the existing production `OPENAI_API_KEY` secret. Requests stream progress heartbeats while the image tool draws. An image can take several minutes. The D1 migration adds per-IP, per-stage daily limits (three successful/active requests for each stage). Upstream failures refund the attempt; invalid image, origin, stage, and missing-approval requests are rejected before provider calls. The approval flag enforces the normal UI flow; it does not prove ownership or prevent a modified client submitting another image. Provider image calls are billable.

Completed full-body images and animation sheets are saved as a browser-local IndexedDB draft after each successful stage. Reloading resumes that draft; replacing the full-body image invalidates prior sheets. Equipping saves the actual PNG frames in IndexedDB. This is device-local storage and can be cleared by the browser. Download the images to keep a separate copy. Existing preset-generated v1 fighters are no longer offered by the creator.

This is an artwork-upload prototype: no NFT ownership verification, minting, account asset library, or custom-fighter PvP. Image models can still produce imperfect directions, alignment, or poses. The animation review is deliberate: a player can redraw one sheet before equipping. The client rejects sheets with incorrect dimensions, empty frames or opaque backgrounds.

Validation: `node tests/sprite-creator.test.mjs` exercises the Worker route against a mocked image provider and real D1 test database, including validation, review gate, supplied image bytes, rate limits/refunds, streaming boundaries, and the complete frame manifest. Type checking and production build run before publication.

API reference: https://developers.openai.com/api/docs/guides/tools-image-generation
