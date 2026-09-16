'use client';
import { useEffect, useRef, useState } from 'react';
import { roster, type Character, type Match } from '../../pvp/engine';
import { characterNames, loadSprites } from '../arena';
import { Joystick } from '../joystick';
import './pvp.css';
type Session = { code: string; token: string; slot: number };
type Snapshot = Match & { now: number };
export default function PvP() {
  const [endpoint, setEndpoint] = useState<string | null>(null),
    [name, setName] = useState(''),
    [character, setCharacter] = useState<Character>('green'),
    [code, setCode] = useState(''),
    [session, setSession] = useState<Session | null>(null),
    [state, setState] = useState<Snapshot | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [connected, setConnected] = useState(false),
    [ping, setPing] = useState(0),
    [clock, setClock] = useState(Date.now()),
    [assets, setAssets] = useState(false),
    [confirmLeave, setConfirmLeave] = useState(false);
  const socket = useRef<WebSocket | null>(null),
    latest = useRef<Snapshot | null>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    images = useRef(new Map<string, HTMLImageElement>()),
    seq = useRef(0),
    keys = useRef(new Set<string>()),
    stick = useRef(new Joystick()),
    knob = useRef<HTMLSpanElement>(null),
    punch = useRef<number | null>(null),
    tap = useRef(false),
    offset = useRef(0);
  const active = state?.phase === 'fight' || state?.phase === 'countdown';
  function reset() {
    keys.current.clear();
    stick.current.reset();
    punch.current = null;
    tap.current = false;
    paintStick();
  }
  function paintStick() {
    if (knob.current)
      knob.current.style.transform = `translate(${stick.current.knob.x}px,${stick.current.knob.y}px)`;
  }
  function send(data: object) {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify(data));
  }
  useEffect(() => {
    fetch('/api/pvp/config')
      .then((r) => r.json())
      .then((v) => setEndpoint((v as { endpoint: string }).endpoint))
      .catch(() => {
        setEndpoint('');
        setError('Unable to load multiplayer configuration.');
      });
    setCode(
      new URLSearchParams(location.search).get('room')?.toUpperCase() || '',
    );
    try {
      const saved = sessionStorage.getItem('gd-pvp');
      if (saved) {
        const v = JSON.parse(saved);
        if (v.code && v.token && [0, 1].includes(v.slot)) setSession(v);
      }
    } catch {}
    loadSprites()
      .then((v) => {
        images.current = v;
        setAssets(true);
      })
      .catch(() =>
        setError('Character images failed to load. Reload to retry.'),
      );
  }, []);
  useEffect(() => {
    if (!session || !endpoint) return;
    let disposed = false,
      retry: ReturnType<typeof setTimeout>,
      attempt = 0;
    const connect = () => {
      if (disposed) return;
      const url =
        endpoint.replace(/^http/, 'ws') + '/rooms/' + session.code + '/socket';
      const ws = new WebSocket(url, ['gd-pvp', 'auth.' + session.token]);
      socket.current = ws;
      ws.onmessage = (e) => {
        let v;
        try {
          v = JSON.parse(e.data);
        } catch {
          return;
        }
        if (v.type === 'welcome') {
          seq.current = v.seq + 1;
          attempt = 0;
          setConnected(true);
          setError('');
        }
        if (v.type === 'state') {
          offset.current = v.now - Date.now();
          latest.current = v;
          setState(v);
        }
        if (v.type === 'pong') setPing(Math.max(0, Date.now() - v.sent));
        if (v.type === 'error') setError(v.message);
      };
      ws.onclose = (e) => {
        if (disposed) return;
        setConnected(false);
        reset();
        if ([4001, 4002, 4003].includes(e.code)) {
          setError(e.reason || 'Room closed. Leave and create another room.');
          return;
        }
        setError(
          'Reconnecting… A disconnect lasting 10 seconds forfeits an active round.',
        );
        retry = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 5000));
      };
      ws.onerror = () => ws.close();
    };
    connect();
    const timer = setInterval(() => {
      send({ type: 'ping', sent: Date.now() });
    }, 1000);
    const inputs = setInterval(() => {
      const s = latest.current;
      if (s?.phase !== 'fight') return;
      const k = keys.current;
      let x =
          stick.current.value.x +
          Number(k.has('d') || k.has('arrowright')) -
          Number(k.has('a') || k.has('arrowleft')),
        y =
          stick.current.value.y +
          Number(k.has('s') || k.has('arrowdown')) -
          Number(k.has('w') || k.has('arrowup'));
      const n = Math.max(1, Math.hypot(x, y));
      send({
        type: 'input',
        seq: seq.current++,
        x: x / n,
        y: y / n,
        punch: punch.current !== null || k.has(' ') || tap.current,
      });
      tap.current = false;
    }, 50);
    return () => {
      disposed = true;
      clearTimeout(retry);
      clearInterval(timer);
      clearInterval(inputs);
      socket.current?.close();
      socket.current = null;
      reset();
    };
  }, [session, endpoint]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now() + offset.current), 100);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        [
          ' ',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
          'w',
          'a',
          's',
          'd',
        ].includes(k)
      ) {
        e.preventDefault();
        keys.current.add(k);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => reset();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', blur);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', blur);
      reset();
    };
  }, [active]);
  useEffect(() => {
    let frame = 0;
    let previousTime = 0;
    const rendered: {x:number;y:number}[] = [];
    const loop = (now: number) => {
      const blend = 1-Math.exp(-Math.min((now-previousTime)/1000,.1)*24);
      previousTime = now;
      const c = canvas.current,
        ctx = c?.getContext('2d'),
        s = latest.current;
      if (c && ctx && s) {
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#10212a';
        ctx.fillRect(0, 0, 1100, 660);
        ctx.strokeStyle = '#213944';
        ctx.lineWidth = 1;
        for (let x = 0; x < 1100; x += 55) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 660);
          ctx.stroke();
        }
        for (let y = 0; y < 660; y += 55) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(1100, y);
          ctx.stroke();
        }
        ctx.strokeStyle = '#c6ff4d';
        ctx.strokeRect(30, 65, 1040, 565);
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#c6ff4d';
        ctx.font = 'bold 70px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('1 V 1', 550, 350);
        ctx.globalAlpha = 1;
        for (const [i, authoritative] of s.players.entries()) {
          if (!authoritative) continue;
          const position=rendered[i]??{x:authoritative.x,y:authoritative.y};
          position.x+=(authoritative.x-position.x)*blend;
          position.y+=(authoritative.y-position.y)*blend;
          rendered[i]=position;
          const p={...authoritative,...position};
          const action = p.attack > 0 ? 'punch' : p.moving ? 'walk' : 'idle',
            dir =
              action === 'punch'
                ? p.dir === 'left'
                  ? 'left'
                  : 'right'
                : p.dir;
          const f = (Math.floor(now / (action === 'idle' ? 180 : 85)) % 4) + 1;
          const img = images.current.get(
            `${p.character}-${action}-${dir}-${f}`,
          );
          ctx.fillStyle = i === session?.slot ? '#c6ff4d' : '#ff788f';
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + 12, 30, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          if (img) {
            ctx.globalAlpha = p.hurt > 0 ? 0.6 : 1;
            ctx.drawImage(img, p.x - 70, p.y - 113, 140, 140);
            ctx.globalAlpha = 1;
          }
          ctx.font = 'bold 18px monospace';
          ctx.fillText(
            p.name + (i === session?.slot ? ' · YOU' : ''),
            p.x,
            p.y - 119,
          );
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [session, active]);
  async function enter(join: boolean) {
    if (!endpoint || busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch(
        endpoint +
          (join ? `/rooms/${code.trim().toUpperCase()}/join` : '/rooms'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, character }),
        },
      );
      const v = (await r.json()) as Session & { error?: string };
      if (!r.ok) throw Error(v.error || 'Could not enter room.');
      sessionStorage.setItem('gd-pvp', JSON.stringify(v));
      setSession(v);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function leave() {
    send({ type: 'leave' });
    socket.current?.close();
    sessionStorage.removeItem('gd-pvp');
    setSession(null);
    setState(null);
    latest.current = null;
    setConnected(false);
    setConfirmLeave(false);
    setError('');
    reset();
  }
  const me = state?.players[session?.slot ?? 0],
    opponent = state?.players[1 - (session?.slot ?? 0)];
  return (
    <main className={`pvp ${active ? 'pvp-active' : ''}`}>
      <header>
        <a href="/">← GALACTIC DOG SMASH</a>
        <span>PRIVATE 1V1</span>
      </header>
      {error && (
        <p className="pvp-error" role="status">
          {error}
        </p>
      )}
      {!session ? (
        <section className="pvp-lobby">
          <p className="pvp-eyebrow">CHALLENGE A FRIEND</p>
          <h1>
            ONE ARENA.
            <br />
            TWO FIGHTERS.
          </h1>
          <p>
            90 seconds. Equal stats. Basic punches. Most health wins when time
            runs out.
          </p>
          <label>
            YOUR NAME
            <input
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fighter name"
            />
          </label>
          <fieldset>
            <legend>CHOOSE YOUR FIGHTER</legend>
            <div className="pvp-roster">
              {roster.map((c) => (
                <label key={c}>
                  <input
                    type="radio"
                    name="fighter"
                    checked={c === character}
                    onChange={() => setCharacter(c)}
                  />
                  <img src={`/sprites/${c}-idle-down-1.png`} alt="" />
                  <span>{characterNames[c]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            disabled={!endpoint || !assets || !name.trim() || busy}
            onClick={() => enter(false)}
          >
            CREATE ROOM
          </button>
          <div className="pvp-join">
            <input
              aria-label="Room code"
              maxLength={8}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))
              }
              placeholder="8-CHARACTER CODE"
            />
            <button
              disabled={
                !endpoint ||
                !assets ||
                !name.trim() ||
                code.length !== 8 ||
                busy
              }
              onClick={() => enter(true)}
            >
              JOIN ROOM
            </button>
          </div>
          {endpoint === '' && (
            <p>
              Online PvP is waiting for the match server connection. Solo play
              is available.
            </p>
          )}
          {endpoint === null && <p>Connecting…</p>}
        </section>
      ) : (
        <>
          {!active && (
            <section className="pvp-lobby">
              <p className="pvp-eyebrow">ROOM {session.code}</p>
              <button
                className="pvp-secondary"
                onClick={() =>
                  navigator.clipboard
                    .writeText(`${location.origin}/pvp?room=${session.code}`)
                    .then(() => setError('Invite link copied.'))
                    .catch(() =>
                      setError(`Share this room code: ${session.code}`),
                    )
                }
              >
                COPY INVITE LINK
              </button>
              <h1>
                {state?.phase === 'over'
                  ? state.winner === null
                    ? 'DRAW'
                    : state.winner === session.slot
                      ? 'YOU WIN'
                      : 'ROUND LOST'
                  : 'GET READY'}
              </h1>
              {state?.phase === 'over' && (
                <p>
                  {state.reason} · Round {state.round}
                </p>
              )}
              <div className="pvp-seats">
                {[0, 1].map((i) => {
                  const p = state?.players[i];
                  return (
                    <div key={i}>
                      {p ? (
                        <>
                          <img
                            src={`/sprites/${p.character}-idle-down-1.png`}
                            alt=""
                          />
                          <strong>{p.name}</strong>
                          <span>
                            {p.connected
                              ? p.ready
                                ? 'READY'
                                : 'CONNECTED'
                              : 'DISCONNECTED'}
                          </span>
                          {state?.phase === 'over' && (
                            <span>
                              {p.hp} HP · {p.hits} hits
                            </span>
                          )}
                        </>
                      ) : (
                        <span>Waiting for a friend…</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                disabled={
                  !connected || !opponent?.connected || me?.ready || !assets
                }
                onClick={() => send({ type: 'ready' })}
              >
                {me?.ready
                  ? 'WAITING FOR OPPONENT'
                  : state?.phase === 'over'
                    ? 'READY FOR REMATCH'
                    : 'READY TO FIGHT'}
              </button>
              <p>
                WASD / arrow keys to move · Hold Space to punch.
                <br />
                On mobile, use the stick and Smash together.
              </p>
              <button className="pvp-secondary" onClick={leave}>
                LEAVE ROOM
              </button>
            </section>
          )}
          {active && (
            <>
              <div className="pvp-hud">
                {state.players.map((p, i) => (
                  <div key={i}>
                    <span>
                      {p?.name} {i === session.slot ? '· YOU' : ''}
                    </span>
                    <meter min={0} max={100} value={p?.hp ?? 0} />
                    <b>{p?.hp ?? 0} HP</b>
                  </div>
                ))}
                <strong>
                  {Math.min(90, Math.max(0, Math.ceil((state.endsAt - clock) / 1000)))}s
                </strong>
                <small>{connected ? `${ping}ms` : 'RECONNECTING'}</small>
                <button
                  className="pvp-secondary"
                  onClick={() => setConfirmLeave(true)}
                >
                  LEAVE
                </button>
              </div>
              <div className="pvp-arena">
                <canvas
                  ref={canvas}
                  width={1100}
                  height={660}
                  aria-label="Live PvP arena"
                />
                {state.phase === 'countdown' && (
                  <div className="pvp-countdown">
                    {Math.max(1, Math.ceil((state.startsAt - clock) / 1000))}
                  </div>
                )}
              </div>
              <div className="pvp-controls">
                <div
                  className="pvp-stick"
                  role="group"
                  aria-label="Drag to move"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    const r = e.currentTarget.getBoundingClientRect();
                    if (
                      stick.current.begin(
                        e.pointerId,
                        { x: r.left + r.width / 2, y: r.top + r.height / 2 },
                        { x: e.clientX, y: e.clientY },
                      )
                    )
                      e.currentTarget.setPointerCapture(e.pointerId);
                    paintStick();
                  }}
                  onPointerMove={(e) => {
                    stick.current.move(e.pointerId, {
                      x: e.clientX,
                      y: e.clientY,
                    });
                    paintStick();
                  }}
                  onPointerUp={(e) => {
                    stick.current.end(e.pointerId);
                    paintStick();
                  }}
                  onPointerCancel={(e) => {
                    stick.current.end(e.pointerId);
                    paintStick();
                  }}
                  onLostPointerCapture={(e) => {
                    stick.current.end(e.pointerId);
                    paintStick();
                  }}
                >
                  <span ref={knob} />
                </div>
                <button
                  className="pvp-smash"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (punch.current !== null) return;
                    punch.current = e.pointerId;
                    tap.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerUp={(e) => {
                    if (punch.current === e.pointerId) punch.current = null;
                  }}
                  onPointerCancel={() => {
                    punch.current = null;
                  }}
                  onLostPointerCapture={() => {
                    punch.current = null;
                  }}
                  onClick={(e) => {
                    if (e.detail === 0) tap.current = true;
                  }}
                >
                  SMASH
                </button>
              </div>
            </>
          )}
        </>
      )}
      {confirmLeave && (
        <div
          className="pvp-confirm"
          role="dialog"
          aria-modal="true"
          aria-label="Leave match?"
        >
          <p>Leaving forfeits this round.</p>
          <button onClick={leave}>LEAVE MATCH</button>
          <button onClick={() => setConfirmLeave(false)}>KEEP PLAYING</button>
        </div>
      )}
    </main>
  );
}
