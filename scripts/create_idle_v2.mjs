// Authored idle for the robot master. No network, no image tools.
// Every frame is built from the master's own pixel rows with explicit, reviewable edits:
//   1. breathing: upper body settles/rises over a planted lower body by inserting/removing
//      whole rows at two seam rows chosen inside flat belt/trim bands (no limb rotation, no resampling)
//   2. reactor pulse: green ramp steps up/down, visor ramp brightens at the peak
//   3. cable flutter: loose wire pixels on the right shoulder shift 1px on a delay
// Usage: node scripts/create_idle_v2.mjs   (writes output/robot-idle-v2/)
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const master = JSON.parse(fs.readFileSync(path.join(root, 'assets/characters/robot-rig-study/master.sprite.json'), 'utf8'));
const A = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const W = master.width, H = master.height;
const src = master.animations[0].frames[0].rows;

export const CONFIG = {
  seams: [122, 131],               // rows inside the belt/trim bands; everything above moves, below stays planted
  // upper-body offset per frame, in px (negative = taller, positive = settled). Shared across seams.
  bob: [-2, 0, 2, 0],
  pulse: [-1, 0, 1, 0],            // reactor level offset
  wire: [0, 1, 1, 0],              // cable tail y offset (lags the bob)
};

// ---- helpers over rows of palette characters ----
const blank = () => '.'.repeat(W);
const idx = c => A.indexOf(c);

// Move everything above `seam` by dy using row insertion/removal at the seam. Rows below never change.
function bobAtSeam(rows, seam, dy) {
  if (dy === 0) return rows.slice();
  const out = rows.slice();
  for (let y = 0; y < seam; y++) {
    const s = y - dy;
    out[y] = s >= 0 ? rows[s] : blank();
  }
  return out;
}

// Split the total offset across the seams from the bottom up so each seam moves only its share.
function breathe(rows, total, seams) {
  let cur = rows;
  const share = seams.map((_, i) => Math.round((total * (i + 1)) / seams.length) - Math.round((total * i) / seams.length));
  // bottom seam first so upper-seam rows are not yet displaced
  const order = seams.map((s, i) => [s, share[i]]).sort((a, b) => b[0] - a[0]);
  for (const [seam, dy] of order) cur = bobAtSeam(cur, seam, dy);
  return cur;
}

function mapPixels(rows, fn) {
  return rows.map((r, y) => [...r].map((c, x) => (c === '.' ? c : fn(c, x, y))).join(''));
}

// Reactor orb sits at about x87-121, y86-120 (green ramp 31..34). Pulse by shifting along the ramp.
function pulseReactor(rows, level, dyOrb) {
  return mapPixels(rows, (c, x, y) => {
    const n = idx(c);
    if (x >= 87 && x <= 121 && y >= 86 + dyOrb - 2 && y <= 120 + dyOrb + 2 && n >= 31 && n <= 34) {
      return A[Math.max(30, Math.min(35, n + level))];
    }
    return c;
  });
}

// Visor strip (cyan ramp 37..40) brightens a step at the pulse peak.
function pulseVisor(rows, level) {
  if (level <= 0) return rows;
  return mapPixels(rows, (c, x, y) => {
    const n = idx(c);
    if (y >= 40 && y <= 70 && n >= 37 && n <= 39) return A[n + 1];
    return c;
  });
}

// Loose cable pixels: colored, thin, outside the grey cannon. Region measured on the master.
const WIRE_BOX = { x0: 152, x1: 178, y0: 70, y1: 112 };
function isWire(c) {
  const n = idx(c);
  return (n >= 19 && n <= 21) || (n >= 31 && n <= 34) || n === 41 || n === 42 || (n >= 25 && n <= 27);
}
function flutterWires(rows, dy) {
  if (dy === 0) return rows;
  const out = rows.map(r => r.split(''));
  const taken = [];
  for (let y = WIRE_BOX.y0; y <= WIRE_BOX.y1; y++) for (let x = WIRE_BOX.x0; x <= WIRE_BOX.x1; x++) {
    const c = rows[y][x];
    if (c !== '.' && isWire(c)) taken.push([x, y, c]);
  }
  for (const [x, y] of taken) out[y][x] = '.';
  for (const [x, y, c] of taken) if (out[y + dy][x] === '.') out[y + dy][x] = c; else out[y][x] = c;
  return out.map(r => r.join(''));
}

export function buildFrames(cfg = CONFIG) {
  return cfg.bob.map((dy, i) => {
    let rows = breathe(src, dy, cfg.seams);
    rows = pulseReactor(rows, cfg.pulse[i], dy);
    rows = pulseVisor(rows, cfg.pulse[i]);
    rows = flutterWires(rows, cfg.wire[i]);
    return { ...master.animations[0].frames[0], rows };
  });
}

// ---- validation ----
function validate(frames) {
  for (const f of frames) {
    assert.equal(f.rows.length, H);
    for (const r of f.rows) assert.equal(r.length, W);
    // planted: everything at or below the lowest seam is untouched
    for (let y = Math.max(...CONFIG.seams); y < H; y++) {
      for (let x = 0; x < W; x++) {
        const a = f.rows[y][x], b = src[y][x];
        const inWire = x >= WIRE_BOX.x0 && x <= WIRE_BOX.x1 && y >= WIRE_BOX.y0 && y <= WIRE_BOX.y1;
        if (!inWire) assert.equal(a, b, `lower body changed at ${x},${y}`);
      }
    }
    // stays inside the 192 frame and keeps transparency binary
    for (const r of f.rows) for (const c of r) assert.ok(c === '.' || idx(c) >= 0 && idx(c) < master.palette.length);
    const top = f.rows.findIndex(r => /[^.]/.test(r));
    assert.ok(top >= 0 && top <= 20, 'head clipped or lost');
  }
  assert.equal(new Set(frames.map(f => f.rows.join(''))).size, frames.length, 'frames must all differ');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const frames = buildFrames();
  validate(frames);
  const project = { ...master, id: 'robot-idle-v2', name: 'Robot idle v2 — breathing, reactor pulse, cable flutter', animations: [{ name: 'idle-down', fps: 6, loop: true, frames }] };
  const out = path.join(root, 'output/robot-idle-v2');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'robot-idle-v2.sprite.json'), JSON.stringify(project, null, 2) + '\n');
  console.log(`Wrote ${frames.length} frames. Planted lower body verified. Zero API calls.`);
}
