import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
const js = ts.transpileModule(readFileSync('pvp/engine.ts', 'utf8'), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { newMatch, fighter, applyInput, ready, step, RULES } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);
function match() {
  const m = newMatch();
  m.players = [fighter('A', 'green', 0, 1000), fighter('B', 'taiyu', 1, 1000)];
  m.players.forEach((p) => (p.connected = true));
  ready(m, 0, 1000);
  assert.equal(m.phase, 'lobby');
  ready(m, 1, 1000);
  assert.equal(m.phase, 'countdown');
  step(m, RULES.tick, 4000);
  assert.equal(m.phase, 'fight');
  return m;
}
let m = match(),
  p = m.players[0];
assert(!applyInput(p, { seq: 0, x: NaN, y: 0, punch: true }, 4000));
assert(applyInput(p, { seq: 0, x: 999, y: 999, punch: true }, 4000));
assert(Math.abs(Math.hypot(p.input.x, p.input.y) - 1) < 1e-9);
assert(!applyInput(p, { seq: 0, x: 0, y: 0, punch: false }, 4000));
m = match();
m.players[0].x = 500;
m.players[1].x = 570;
m.players.forEach((p) => {
  p.hp = 10;
  applyInput(p, { seq: 0, x: 0, y: 0, punch: true }, 4000);
});
step(m, RULES.tick, 4000);
assert.equal(m.phase, 'over');
assert.equal(m.winner, null);
assert.equal(m.players[0].hp, 0);
assert.equal(m.players[1].hp, 0);
ready(m, 0, 5000);
ready(m, 1, 5000);
assert.equal(m.round, 2);
assert.equal(m.players[0].hp, 100);
m = match();
applyInput(m.players[0], { seq: 0, x: 1, y: 0, punch: true }, 4000);
for (let i = 0; i < 8; i++) step(m, RULES.tick, 4000 + i * 33);
assert.equal(m.players[0].punches, 1);
const x = m.players[0].x;
step(m, RULES.tick, 4400);
assert.equal(m.players[0].x, x);
m = match();
m.players[1].lastSeen = 15000;
step(m, RULES.tick, 15000);
assert.equal(m.winner, 1);
assert.equal(m.phase, 'over');
m = match();
m.players.forEach((p) => (p.lastSeen = m.endsAt));
m.players[0].hp = 90;
step(m, RULES.tick, m.endsAt);
assert.equal(m.winner, 1);
const bundled = await build({
  entryPoints: ['pvp/worker.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  external: ['cloudflare:workers'],
});
const mf = new Miniflare({
  modules: true,
  script: bundled.outputFiles[0].text,
  compatibilityDate: '2026-05-15',
  durableObjects: { ROOMS: { className: 'MatchRoom', useSQLite: true } },
  bindings: { ALLOWED_ORIGINS: 'http://localhost:5173' },
});
const request = (path, init = {}) =>
  mf.dispatchFetch('http://localhost' + path, init);
const post = (path, name) =>
  request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
    },
    body: JSON.stringify({ name, character: 'green' }),
  });
const clients = [];
try {
  assert.equal(
    (await request('/health', { headers: { Origin: 'https://evil.example' } }))
      .status,
    403,
  );
  const host = await (await post('/rooms', 'Host')).json();
  assert.equal(host.code.length, 8);
  const joinResults = await Promise.all([
    post(`/rooms/${host.code}/join`, 'Guest'),
    post(`/rooms/${host.code}/join`, 'Third'),
  ]);
  assert.deepEqual(joinResults.map((r) => r.status).sort(), [200, 409]);
  const guest = await joinResults.find((r) => r.status === 200).json();
  assert.equal(
    (
      await request(`/rooms/${host.code}/socket`, {
        headers: {
          Upgrade: 'websocket',
          'Sec-WebSocket-Protocol': 'gd-pvp, auth.fake',
        },
      })
    ).status,
    401,
  );
  async function connect(session) {
    const response = await request(`/rooms/${session.code}/socket`, {
      headers: {
        Upgrade: 'websocket',
        'Sec-WebSocket-Protocol': `gd-pvp, auth.${session.token}`,
      },
    });
    assert.equal(response.status, 101);
    const ws = response.webSocket;
    const messages = [];
    ws.addEventListener('message', (e) => messages.push(JSON.parse(e.data)));
    ws.accept();
    clients.push(ws);
    return { ws, messages };
  }
  const a = await connect(host),
    b = await connect(guest);
  const wait = async (test) => {
    const end = Date.now() + 6000;
    while (!test()) {
      if (Date.now() > end) throw Error('Timed out waiting for room state');
      await new Promise((r) => setTimeout(r, 30));
    }
  };
  await wait(() =>
    a.messages.some(
      (v) => v.type === 'state' && v.players.every((p) => p?.connected),
    ),
  );
  a.ws.send(JSON.stringify({ type: 'ready' }));
  b.ws.send(JSON.stringify({ type: 'ready' }));
  await wait(() => a.messages.some((v) => v.phase === 'fight'));
  a.ws.send(JSON.stringify({ type: 'input', seq: 1, x: 1, y: 0, punch: true }));
  await wait(() =>
    a.messages.some((v) => v.phase === 'fight' && v.players[0].x > 280),
  );
  b.ws.send(JSON.stringify({ type: 'leave' }));
  await wait(() =>
    a.messages.some((v) => v.phase === 'over' && v.winner === 0),
  );
  console.log(
    'PASS: authoritative movement, malformed/replayed inputs, cooldown, stale-input stop, simultaneous KO, timer, disconnect, rematch, CORS, seat race, session authentication, two real WebSockets, ready/countdown/fight/forfeit.',
  );
} finally {
  for (const ws of clients)
    try {
      ws.close();
    } catch {}
  await mf.dispose();
}
