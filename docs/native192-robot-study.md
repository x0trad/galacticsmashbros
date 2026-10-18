# One-frame native 192 robot study

This isolates the user's requested 192×192 standing-character test from the existing creator. Astra (`gpt-6-astra`, Responses function calling) authors a layered drawing plan from the original robot portrait. Polygon contours compile to Sprite Forge line commands; ellipses, rectangles, lines and pixels map directly to native draw operations. The orchestrating agent executes those commands using the connected local Sprite Forge MCP on a blank native 192×192 canvas, exports the result, and sends that actual render back to Astra for correction layers.

No screenshot, PNG import, image-generation tool, raster sampling, reduced logical canvas or upscaling is used. The local MCP performs the drawing. The API route only brokers the model call; returning a plan is not reported as a rendered character.

`POST /api/sprite-study` requires the same origin, a private study access token, and the exact original robot portrait (SHA-256 allowlist). The source stores only the token hash. The token is local to the current test, outside Git. The existing production API secret powers Astra. Requests are limited to three per IP/stage/UTC day, with failures refunded. The route is not linked from the game UI. It accepts `stage=draw`, or `stage=refine` with the actual 192×192 MCP draft and original palette.

The plan schema validates palette colours, shape coordinates, operation bounds and command count. Native coordinate and function-feedback tests are in `tests/sprite-study.test.mjs`. Artistic quality and likeness must be reviewed separately. No animation generation is part of this study.
