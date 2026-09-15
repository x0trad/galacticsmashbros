# Horned Core sprite pack

This pack contains the horned, skull-crested armoured character as 40 transparent PNG frames. Every frame is 192 × 192 pixels and is exported from a 64 × 64 editable Sprites MCP source at an exact 3× nearest-neighbour scale.

## Animation set

- Idle: down, left, right, up — four frames each
- Walk: down, left, right, up — four frames each
- Punch: left and right — four frames each

The chest core pulses across idle frames. Walk frames alternate steps and the punch animation follows wind-up, extension, impact and recovery.

`horned-core.sprite.json` is the editable source document. `build-poses.mjs` describes the native pixel poses. `horned-core-sheet.png` is the complete 10-row sprite sheet.

The character has not yet been added to the playable-character selector.
