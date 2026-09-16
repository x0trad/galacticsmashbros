import { DurableObject } from 'cloudflare:workers';
import {
  applyInput,
  fighter,
  finish,
  newMatch,
  ready,
  roster,
  RULES,
  step,
  type Character,
  type Match,
} from './engine';
interface Env {
  ROOMS: DurableObjectNamespace;
  ALLOWED_ORIGINS: string;
}
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const codePattern = /^[A-HJ-NP-Z2-9]{8}$/;
function identity(v: unknown) {
  if (!v || typeof v !== 'object')
    throw Error('Choose a nickname and character.');
  const x = v as Record<string, unknown>;
  if (
    typeof x.name !== 'string' ||
    !x.name.trim() ||
    x.name.trim().length > 20 ||
    !roster.includes(x.character as Character)
  )
    throw Error('Choose a nickname (1–20 letters) and a valid character.');
  return {
    name: x.name.trim().replace(/[\x00-\x1f]/g, ''),
    character: x.character as Character,
  };
}
async function body(request: Request) {
  const text = await request.text();
  if (text.length > 1024) throw Error('Request too large.');
  return JSON.parse(text);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url),
      origin = request.headers.get('Origin') || '',
      allowed = env.ALLOWED_ORIGINS.split(',');
    if (origin && !allowed.includes(origin))
      return json({ error: 'Origin not allowed' }, 403);
    const cors = {
      'Access-Control-Allow-Origin': origin || allowed[0],
      Vary: 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    };
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors });
    let response: Response;
    try {
      if (url.pathname === '/health')
        response = json({ ok: true, mode: 'private-1v1' });
      else if (request.method === 'POST' && url.pathname === '/rooms') {
        const ip = request.headers.get('CF-Connecting-IP') || 'local';
        const limited = await env.ROOMS.get(
          env.ROOMS.idFromName('limit:' + ip),
        ).fetch(new Request('https://room/limit'));
        if (limited.status !== 200)
          return new Response(limited.body, {
            status: 429,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        const id = identity(await body(request));
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const bytes = crypto.getRandomValues(new Uint8Array(8)),
          code = Array.from(bytes, (b) => alphabet[b % 32]).join('');
        response = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(
          new Request('https://room/create', {
            method: 'POST',
            body: JSON.stringify({ ...id, code }),
          }),
        );
      } else {
        const match = url.pathname.match(
          /^\/rooms\/([A-HJ-NP-Z2-9]{8})\/(join|socket)$/,
        );
        if (!match || !codePattern.test(match[1]))
          response = json(
            { error: 'Room not found. Check the eight-character code.' },
            404,
          );
        else
          response = await env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(
            request,
          );
      }
    } catch (e) {
      response = json(
        { error: e instanceof Error ? e.message : 'Unable to connect.' },
        400,
      );
    }
    if (response.status === 101) return response;
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(response.body, { status: response.status, headers });
  },
};
type Stored = {
  match: Match;
  tokens: (string | null)[];
  code: string;
  expires: number;
};
export class MatchRoom extends DurableObject<Env> {
  match = newMatch();
  tokens: (string | null)[] = [null, null];
  code = '';
  expires = 0;
  clock: ReturnType<typeof setInterval> | null = null;
  last = 0;
  accumulator = 0;
  broadcastTick = 0;
  peers = new Map<WebSocket, { slot: number; count: number; window: number }>();
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<Stored>('room');
      if (saved) {
        this.match = saved.match;
        this.tokens = saved.tokens;
        this.code = saved.code;
        this.expires = saved.expires;
        for (const p of this.match.players)
          if (p) {
            p.connected = false;
            p.ready = false;
          }
        if (['fight', 'countdown'].includes(this.match.phase))
          finish(
            this.match,
            null,
            'Match interrupted. Both players can ready up again.',
            Date.now(),
          );
      }
    });
  }
  async persist() {
    await this.ctx.storage.put('room', {
      match: this.match,
      tokens: this.tokens,
      code: this.code,
      expires: this.expires,
    });
  }
  snapshot() {
    return { type: 'state', code: this.code, now: Date.now(), ...this.match };
  }
  broadcast() {
    const text = JSON.stringify(this.snapshot());
    for (const [ws] of this.peers)
      try {
        ws.send(text);
      } catch {
        this.disconnected(ws);
      }
  }
  startClock() {
    if (this.clock) return;
    this.last = Date.now();
    this.clock = setInterval(() => {
      const now = Date.now();
      this.accumulator += Math.min((now - this.last) / 1000, 0.25);
      this.last = now;
      const phase = this.match.phase;
      for (const [ws, { slot }] of this.peers) {
        const p = this.match.players[slot];
        if (p && now - p.lastSeen > 5000) {
          try {
            ws.close(4000, 'Connection timed out');
          } catch {}
          this.disconnected(ws);
        }
      }
      while (this.accumulator >= RULES.tick) {
        step(this.match, RULES.tick, now);
        this.accumulator -= RULES.tick;
      }
      if (phase !== this.match.phase) this.ctx.waitUntil(this.persist());
      if (++this.broadcastTick % 2 === 0) this.broadcast();
      if (
        !this.peers.size &&
        !['fight', 'countdown'].includes(this.match.phase)
      ) {
        clearInterval(this.clock!);
        this.clock = null;
        this.ctx.waitUntil(this.persist());
      }
    }, 1000 / 30);
  }
  disconnected(ws: WebSocket) {
    const peer = this.peers.get(ws);
    if (!peer) return;
    this.peers.delete(ws);
    const p = this.match.players[peer.slot];
    if (p) {
      p.connected = false;
      p.ready = false;
      p.input = { ...p.input, x: 0, y: 0, punch: false };
    }
    this.broadcast();
  }
  async fetch(request: Request) {
    const url = new URL(request.url),
      now = Date.now();
    if (url.pathname === '/limit')
      return this.ctx.blockConcurrencyWhile(async () => {
        let limit = await this.ctx.storage.get<{
          start: number;
          count: number;
        }>('limit');
        if (!limit || now - limit.start > 60000)
          limit = { start: now, count: 0 };
        limit.count++;
        await this.ctx.storage.put('limit', limit);
        await this.ctx.storage.setAlarm(now + 60000);
        return json(
          limit.count > 6
            ? { error: 'Too many rooms. Please wait a minute.' }
            : { ok: true },
          limit.count > 6 ? 429 : 200,
        );
      });
    if (url.pathname === '/create' && request.method === 'POST') {
      if (this.code) return json({ error: 'Please create another room.' }, 409);
      const data = await body(request),
        id = identity(data);
      this.code = data.code;
      this.tokens[0] = crypto.randomUUID();
      this.match.players[0] = fighter(id.name, id.character, 0, now);
      this.expires = now + 2 * 60 * 60 * 1000;
      await this.persist();
      await this.ctx.storage.setAlarm(this.expires);
      return json({ code: this.code, token: this.tokens[0], slot: 0 });
    }
    if (!this.code || now >= this.expires)
      return json({ error: 'This room has expired. Create a new room.' }, 404);
    if (url.pathname.endsWith('/join') && request.method === 'POST') {
      // Serialize joins across storage awaits so a third request cannot take the second seat.
      return this.ctx.blockConcurrencyWhile(async () => {
        if (this.match.players[1])
          return json({ error: 'This room is full.' }, 409);
        if (this.match.phase !== 'lobby')
          return json({ error: 'This match has already started.' }, 409);
        const id = identity(await body(request));
        this.tokens[1] = crypto.randomUUID();
        this.match.players[1] = fighter(id.name, id.character, 1, now);
        await this.persist();
        this.broadcast();
        return json({ code: this.code, token: this.tokens[1], slot: 1 });
      });
    }
    if (
      !url.pathname.endsWith('/socket') ||
      request.headers.get('Upgrade')?.toLowerCase() !== 'websocket'
    )
      return json({ error: 'WebSocket connection required' }, 400);
    const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '')
        .split(',')
        .map((s) => s.trim()),
      auth = protocols.find((p) => p.startsWith('auth.'))?.slice(5);
    const slot = auth ? this.tokens.indexOf(auth) : -1;
    if (slot < 0 || !protocols.includes('gd-pvp'))
      return json({ error: 'Invalid room session.' }, 401);
    for (const [old, peer] of this.peers)
      if (peer.slot === slot) {
        this.peers.delete(old);
        try {
          old.close(4001, 'Connected in another tab');
        } catch {}
      }
    const pair = new WebSocketPair(),
      client = pair[0],
      server = pair[1];
    server.accept();
    this.peers.set(server, { slot, count: 0, window: now });
    const p = this.match.players[slot]!;
    p.connected = true;
    p.lastSeen = now;
    server.addEventListener('message', (event) =>
      this.message(server, event.data),
    );
    server.addEventListener('close', () => this.disconnected(server));
    server.addEventListener('error', () => this.disconnected(server));
    server.send(JSON.stringify({ type: 'welcome', slot, seq: p.input.seq }));
    this.startClock();
    this.broadcast();
    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: { 'Sec-WebSocket-Protocol': 'gd-pvp' },
    });
  }
  message(ws: WebSocket, raw: string | ArrayBuffer) {
    const peer = this.peers.get(ws);
    if (!peer) return;
    const now = Date.now();
    if (now - peer.window > 1000) {
      peer.window = now;
      peer.count = 0;
    }
    if (++peer.count > 90 || typeof raw !== 'string' || raw.length > 512) {
      ws.close(4002, 'Too many messages');
      this.disconnected(ws);
      return;
    }
    try {
      const msg = JSON.parse(raw),
        p = this.match.players[peer.slot]!;
      p.lastSeen = now;
      if (msg.type === 'input') applyInput(p, msg, now);
      else if (msg.type === 'ping')
        ws.send(JSON.stringify({ type: 'pong', sent: msg.sent }));
      else if (msg.type === 'ready') {
        ready(this.match, peer.slot, now);
        this.ctx.waitUntil(this.persist());
        this.broadcast();
      } else if (msg.type === 'leave') {
        if (['fight', 'countdown'].includes(this.match.phase))
          finish(this.match, 1 - peer.slot, 'Opponent left the match', now);
        this.tokens[peer.slot] = null;
        this.peers.delete(ws);
        p.connected = false;
        this.broadcast();
        ws.close(1000, 'Left room');
        this.ctx.waitUntil(this.persist());
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
    }
  }
  async alarm() {
    for (const [ws] of this.peers)
      try {
        ws.close(4003, 'Room expired');
      } catch {}
    this.peers.clear();
    if (this.clock) clearInterval(this.clock);
    this.clock = null;
    await this.ctx.storage.deleteAll();
    this.code = '';
    this.tokens = [null, null];
    this.match = newMatch();
  }
}
