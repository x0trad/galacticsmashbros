export const roster = [
  'green',
  'grey',
  'purple',
  'smg',
  'taiyu',
  'horned-core',
] as const;
export type Character = (typeof roster)[number];
export type Direction = 'left' | 'right' | 'up' | 'down';
export type Input = { seq: number; x: number; y: number; punch: boolean };
export const RULES = {
  width: 1100,
  height: 660,
  speed: 245,
  hp: 100,
  damage: 10,
  cooldown: 0.45,
  reach: 100,
  roundMs: 90000,
  disconnectMs: 10000,
  tick: 1 / 30,
};
export type Fighter = {
  name: string;
  character: Character;
  x: number;
  y: number;
  dir: Direction;
  hp: number;
  vx: number;
  vy: number;
  attack: number;
  hurt: number;
  cooldown: number;
  moving: boolean;
  connected: boolean;
  ready: boolean;
  lastSeen: number;
  inputAt: number;
  input: Input;
  hits: number;
  punches: number;
};
export type Phase = 'lobby' | 'countdown' | 'fight' | 'over';
export type Match = {
  phase: Phase;
  round: number;
  startsAt: number;
  endsAt: number;
  players: (Fighter | null)[];
  winner: number | null;
  reason: string;
  finishedAt: number;
};
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export function newMatch(): Match {
  return {
    phase: 'lobby',
    round: 0,
    startsAt: 0,
    endsAt: 0,
    players: [null, null],
    winner: null,
    reason: '',
    finishedAt: 0,
  };
}
export function fighter(
  name: string,
  character: Character,
  slot: number,
  now: number,
): Fighter {
  return {
    name,
    character,
    x: slot ? 820 : 280,
    y: 330,
    dir: slot ? 'left' : 'right',
    hp: 100,
    vx: 0,
    vy: 0,
    attack: 0,
    hurt: 0,
    cooldown: 0,
    moving: false,
    connected: false,
    ready: false,
    lastSeen: now,
    inputAt: 0,
    input: { seq: -1, x: 0, y: 0, punch: false },
    hits: 0,
    punches: 0,
  };
}
export function applyInput(p: Fighter, data: unknown, now: number): boolean {
  if (!data || typeof data !== 'object') return false;
  const v = data as Record<string, unknown>;
  if (
    !Number.isSafeInteger(v.seq) ||
    Number(v.seq) < 0 ||
    Number(v.seq) <= p.input.seq ||
    typeof v.x !== 'number' ||
    typeof v.y !== 'number' ||
    !Number.isFinite(v.x) ||
    !Number.isFinite(v.y) ||
    typeof v.punch !== 'boolean'
  )
    return false;
  const x = clamp(v.x, -1, 1),
    y = clamp(v.y, -1, 1),
    length = Math.max(1, Math.hypot(x, y));
  p.input = {
    seq: Number(v.seq),
    x: x / length,
    y: y / length,
    punch: v.punch,
  };
  p.inputAt = now;
  p.lastSeen = now;
  return true;
}
export function finish(
  m: Match,
  winner: number | null,
  reason: string,
  now: number,
) {
  if (m.phase === 'over') return;
  m.phase = 'over';
  m.winner = winner;
  m.reason = reason;
  m.finishedAt = now;
  for (const p of m.players)
    if (p) {
      p.ready = false;
      p.moving = false;
      p.input = { ...p.input, x: 0, y: 0, punch: false };
    }
}
export function ready(m: Match, slot: number, now: number) {
  const p = m.players[slot];
  if (!p || !p.connected || !['lobby', 'over'].includes(m.phase)) return;
  p.ready = true;
  if (m.players.every((p) => p?.connected && p.ready)) {
    m.round++;
    m.phase = 'countdown';
    m.startsAt = now + 3000;
    m.endsAt = m.startsAt + RULES.roundMs;
    m.winner = null;
    m.reason = '';
    m.finishedAt = 0;
    m.players = m.players.map((old, i) => ({
      ...fighter(old!.name, old!.character, i, now),
      connected: true,
      input: { seq: old!.input.seq, x: 0, y: 0, punch: false },
    }));
  }
}
export function step(m: Match, dt: number, now: number) {
  dt = clamp(dt, 0, 0.05);
  if (m.phase === 'countdown') {
    if (m.players.some((p) => !p?.connected)) {
      m.phase = 'lobby';
      for (const p of m.players) if (p) p.ready = false;
      return;
    }
    if (now >= m.startsAt) m.phase = 'fight';
    else return;
  }
  if (m.phase !== 'fight') return;
  const stale = m.players.map(
    (p) => !p || now - p.lastSeen > RULES.disconnectMs,
  );
  if (stale.some(Boolean)) {
    finish(
      m,
      stale.every(Boolean) ? null : stale[0] ? 1 : 0,
      stale.every(Boolean)
        ? 'Both players disconnected'
        : 'Opponent disconnected',
      now,
    );
    return;
  }
  const ps = m.players as Fighter[];
  const attacks: number[] = [];
  for (let i = 0; i < 2; i++) {
    const p = ps[i];
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.attack = Math.max(0, p.attack - dt);
    p.hurt = Math.max(0, p.hurt - dt);
    const active = p.connected && now - p.inputAt < 300,
      x = active ? p.input.x : 0,
      y = active ? p.input.y : 0;
    p.moving = !!(x || y);
    if (p.moving)
      p.dir =
        Math.abs(x) >= Math.abs(y)
          ? x < 0
            ? 'left'
            : 'right'
          : y < 0
            ? 'up'
            : 'down';
    p.x = clamp(p.x + (x * RULES.speed + p.vx) * dt, 60, 1040);
    p.y = clamp(p.y + (y * RULES.speed + p.vy) * dt, 95, 610);
    p.vx *= Math.exp(-dt * 10);
    p.vy *= Math.exp(-dt * 10);
    if (active && p.input.punch && p.cooldown <= 0) {
      p.cooldown = RULES.cooldown;
      p.attack = 0.24;
      p.punches++;
      attacks.push(i);
    }
  }
  // Resolve both punches from the same positions before applying either hit.
  const hits = attacks.filter((i) => {
    const a = ps[i],
      b = ps[1 - i],
      x = b.x - a.x,
      y = b.y - a.y,
      d = Math.hypot(x, y),
      dot =
        a.dir === 'left' ? -x : a.dir === 'right' ? x : a.dir === 'up' ? -y : y;
    return d < RULES.reach && (d < 30 || dot / d > 0.25);
  });
  for (const i of hits) {
    const a = ps[i],
      b = ps[1 - i],
      dx = b.x - a.x,
      dy = b.y - a.y,
      d = Math.hypot(dx, dy) || 1;
    b.hp = Math.max(0, b.hp - RULES.damage);
    b.hurt = 0.2;
    b.vx = (dx / d) * 160;
    b.vy = (dy / d) * 160;
    a.hits++;
  }
  const dx = ps[1].x - ps[0].x,
    dy = ps[1].y - ps[0].y,
    d = Math.hypot(dx, dy);
  if (d < 40) {
    const nx = d ? dx / d : 1,
      ny = d ? dy / d : 0,
      shift = (40 - d) / 2;
    ps[0].x = clamp(ps[0].x - nx * shift, 60, 1040);
    ps[0].y = clamp(ps[0].y - ny * shift, 95, 610);
    ps[1].x = clamp(ps[1].x + nx * shift, 60, 1040);
    ps[1].y = clamp(ps[1].y + ny * shift, 95, 610);
  }
  if (ps.some((p) => p.hp === 0) || now >= m.endsAt)
    finish(
      m,
      ps[0].hp === ps[1].hp ? null : ps[0].hp > ps[1].hp ? 0 : 1,
      ps.some((p) => p.hp === 0) ? 'Knockout' : 'Time up',
      now,
    );
}
