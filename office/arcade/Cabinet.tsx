// The arcade cabinet: clicking the arcade in the office opens it over the
// panel, with a few games to pick from. Keys (or a pad and swipes on a
// phone), sound through the office's synth, a high score per game kept per
// browser, paused while you're elsewhere. While it's open you're over at
// the arcade in the office, playing along (World.arcade).

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { GAMES } from "./games.ts";
import { C, center, noInput, SH, SW, TICK, type Dir, type Game, type Key, type Play } from "./kit.ts";
import { drawMenu, drawOver, drawPaused, drawTitle, menuRow } from "./screens.ts";

type Mode = "menu" | "title" | "play" | "over";

export interface CabinetProps {
  storageKey: string;
  /** Plays one of the office's sounds. */
  play(sound: string): void;
  /** Open on this side of the panel (away from the arcade in the office, so you can watch). */
  side: "left" | "right" | "center";
  /** A game ended: won or lost, and your line for the office. */
  onResult(won: boolean, line: string): void;
  onClose(): void;
}

const KEYS: Record<string, Key> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "fire",
  Enter: "fire",
  KeyZ: "fire",
  KeyX: "fire",
};

function readHi(storageKey: string): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(`${storageKey}:arcade`);
    const hi = raw ? (JSON.parse(raw) as { hi?: unknown }).hi : null;
    if (!hi || typeof hi !== "object") return {};
    return Object.fromEntries(Object.entries(hi).filter((e): e is [string, number] => typeof e[1] === "number" && e[1] > 0));
  } catch {
    return {};
  }
}

function writeHi(storageKey: string, hi: Record<string, number>): void {
  try {
    window.localStorage.setItem(`${storageKey}:arcade`, JSON.stringify({ hi }));
  } catch {
    // storage full or blocked: the high score just won't stick
  }
}

interface Io {
  storageKey: string;
  play(sound: string): void;
  result(won: boolean, line: string): void;
  close(): void;
  /** The screen changed (for the hint under it). */
  changed(mode: Mode, game: Game<Play>): void;
}

/** The cabinet's insides: which screen is up, the game in play, the controls. */
class Machine {
  mode: Mode = "menu";
  pick = 0;
  state: Play | null = null;
  /** A glimpse of the game behind its title card. */
  demo: Play | null = null;
  paused = false;
  record = false;
  /** Seconds on this screen, and in all. */
  since = 0;
  t = 0;
  private acc = 0;
  readonly input = noInput();
  hi: Record<string, number>;

  constructor(private io: Io) {
    this.hi = readHi(io.storageKey);
  }

  get game(): Game<Play> {
    return GAMES[this.pick]!;
  }

  go(mode: Mode): void {
    this.mode = mode;
    this.since = 0;
    this.paused = false;
    this.clearPressed();
    if (mode === "title") this.demo = this.game.init(1);
    if (mode === "play") {
      this.state = this.game.init((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
      this.io.play("arcade");
    }
    this.io.changed(mode, this.game);
  }

  /** A key went down (keyboard, pad or swipe): games read it on their next tick, screens act now. */
  press(k: Key): void {
    this.input.held[k] = true;
    this.input.pressed[k] = true;
    switch (this.mode) {
      case "menu":
        if (k === "up" || k === "down") {
          this.pick = (this.pick + (k === "up" ? GAMES.length - 1 : 1)) % GAMES.length;
          this.io.play("select");
          this.io.changed(this.mode, this.game);
        } else if (k === "fire") this.open(this.pick);
        break;
      case "title":
        if (k === "fire") this.go("play");
        break;
      case "play":
        if (this.paused && k === "fire") this.resume();
        break;
      case "over":
        if (k === "fire" && this.since > 0.8) this.go("play");
        break;
    }
  }

  release(k: Key): void {
    this.input.held[k] = false;
  }

  /** Esc: out of a game to the picker, out of the picker to the office. */
  back(): void {
    if (this.mode === "menu") this.io.close();
    else this.go("menu");
  }

  /** A game's title card, from the picker. */
  open(i: number): void {
    this.pick = i;
    this.io.play("select");
    this.go("title");
  }

  pause(): void {
    if (this.mode === "play") this.paused = true;
    for (const k of Object.keys(this.input.held) as Key[]) this.input.held[k] = false;
  }

  resume(): void {
    this.paused = false;
    this.clearPressed();
  }

  frame(dt: number): void {
    this.t += dt;
    this.since += dt;
    if (this.mode !== "play" || this.paused || !this.state) {
      this.acc = 0;
      return;
    }
    // Fixed ticks, a few at most per frame (a slow frame doesn't fast-forward the game).
    this.acc = Math.min(this.acc + dt, TICK * 5);
    while (this.acc >= TICK && this.mode === "play") {
      this.acc -= TICK;
      this.tick(this.state);
    }
  }

  private tick(s: Play): void {
    const g = this.game;
    g.step(s, this.input);
    this.clearPressed();
    for (const fx of s.sfx) this.io.play(fx);
    if (s.status === "play") return;
    const won = s.status === "won";
    this.record = s.score > (this.hi[g.id] ?? 0);
    if (this.record) {
      this.hi = { ...this.hi, [g.id]: s.score };
      writeHi(this.io.storageKey, this.hi);
    }
    this.io.play(won ? "fanfare" : "womp");
    const line = won ? (this.record ? `${g.cheer} New high score!` : g.cheer) : this.record ? "Game over, but a new high score!" : g.sigh(s);
    this.io.result(won, line);
    this.go("over");
  }

  private clearPressed(): void {
    for (const k of Object.keys(this.input.pressed) as Key[]) this.input.pressed[k] = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const hi = this.hi[this.game.id] ?? 0;
    switch (this.mode) {
      case "menu":
        drawMenu(ctx, GAMES, this.pick, this.hi, this.t);
        break;
      case "title":
        drawTitle(ctx, this.game, this.demo!, hi, this.t);
        break;
      case "play":
        this.game.draw(ctx, this.state!, hi);
        if (this.paused) drawPaused(ctx, this.t);
        break;
      case "over":
        drawOver(ctx, this.game, this.state!, hi, this.record, this.t);
        break;
    }
  }
}

/** The lit sign on top, its bulbs chasing round. */
const MARQUEE_H = 18;
function drawMarquee(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.fillStyle = "#ef6f9a";
  ctx.fillRect(0, 0, SW, MARQUEE_H);
  ctx.fillStyle = "#ffd1e0";
  ctx.fillRect(2, 3, SW - 4, MARQUEE_H - 6);
  ctx.fillStyle = "#ef6f9a";
  ctx.fillRect(3, 4, SW - 6, MARQUEE_H - 8);
  center(ctx, "ARCADE", 4, C.yellow, 2);
  const lit = Math.floor(t * 4) % 2;
  for (let x = 4, i = 0; x < SW - 2; x += 8, i++) {
    ctx.fillStyle = i % 2 === lit ? C.yellow : "#a8406a";
    ctx.fillRect(x, 1, 2, 1);
    ctx.fillRect(SW - x - 2, MARQUEE_H - 2, 2, 1);
  }
}

const ARROW: Record<Dir, string> = { up: "▲", down: "▼", left: "◀", right: "▶" };

function hintFor(mode: Mode, game: Game<Play>): string {
  switch (mode) {
    case "menu":
      return "↑ ↓ pick · Enter play · Esc close";
    case "title":
      return `${game.keys} · Enter start · Esc back`;
    case "play":
      return `${game.keys} · P pause · Esc quit`;
    case "over":
      return "Enter play again · Esc menu";
  }
}

export function Cabinet(props: CabinetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLCanvasElement>(null);
  const marqueeRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [screen, setScreen] = useState<{ mode: Mode; game: Game<Play> }>({ mode: "menu", game: GAMES[0]! });
  const machine = useMemo(
    () =>
      new Machine({
        storageKey: props.storageKey,
        play: (s) => propsRef.current.play(s),
        result: (won, line) => propsRef.current.onResult(won, line),
        close: () => propsRef.current.onClose(),
        changed: (mode, game) => setScreen({ mode, game }),
      }),
    [props.storageKey],
  );
  const [touch] = useState(() => window.matchMedia?.("(pointer: coarse)").matches === true);
  const [scale, setScale] = useState(2);

  // As big as fits, in whole pixels.
  useEffect(() => {
    const root = rootRef.current!;
    const measure = () => {
      const chrome = (touch ? 210 : 90) + 3 * MARQUEE_H;
      const k = Math.floor(Math.min((root.clientWidth - 64) / SW, (root.clientHeight - chrome) / (SH + MARQUEE_H)));
      setScale(Math.max(1, Math.min(3, k)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [touch]);

  // Keys go to the cabinet while it has focus; anywhere else, the game pauses.
  useEffect(() => {
    const root = rootRef.current!;
    root.focus({ preventScroll: true });
    const pause = () => machine.pause();
    const onFocusOut = (e: FocusEvent) => {
      if (!(e.relatedTarget instanceof Node) || !root.contains(e.relatedTarget)) pause();
    };
    const onVisible = () => {
      if (document.hidden) pause();
    };
    root.addEventListener("focusout", onFocusOut);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      root.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [machine]);

  useEffect(() => {
    const ctx = screenRef.current!.getContext("2d")!;
    const sign = marqueeRef.current!.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      machine.frame(Math.min(0.1, Math.max(0, (now - last) / 1000)));
      last = now;
      machine.draw(ctx);
      drawMarquee(sign, machine.t);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [machine]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      machine.back();
      return;
    }
    if (e.code === "KeyP" && machine.mode === "play") {
      e.preventDefault();
      if (machine.paused) machine.resume();
      else machine.pause();
      return;
    }
    const k = KEYS[e.code];
    if (!k) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) machine.input.held[k] = true;
    else machine.press(k);
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    const k = KEYS[e.code];
    if (k) machine.release(k);
  };

  // On the screen: tap a game in the picker, tap to start, swipe to steer, tap to fire.
  const touchAt = useRef<{ x: number; y: number; at: number; swiped: boolean } | null>(null);
  const onScreenDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * SW;
    const y = ((e.clientY - r.top) / r.height) * SH;
    touchAt.current = { x: e.clientX, y: e.clientY, at: performance.now(), swiped: false };
    if (machine.mode === "menu") {
      const i = GAMES.findIndex((_, j) => {
        const row = menuRow(j);
        return x >= row.x && x < row.x + row.w && y >= row.y && y < row.y + row.h;
      });
      if (i >= 0) machine.open(i);
    } else if (machine.mode !== "play" || machine.paused) machine.press("fire");
  };
  const onScreenMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const t = touchAt.current;
    if (!t || machine.mode !== "play") return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (Math.hypot(dx, dy) < 18) return;
    const d: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    machine.press(d);
    machine.release(d);
    touchAt.current = { x: e.clientX, y: e.clientY, at: t.at, swiped: true };
  };
  const onScreenUp = () => {
    const t = touchAt.current;
    touchAt.current = null;
    if (t && !t.swiped && machine.mode === "play" && !machine.paused && performance.now() - t.at < 300) {
      machine.press("fire");
      machine.release("fire");
    }
  };

  // The pad: held while a finger is on a button.
  const hold = (k: Key) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      machine.press(k);
    },
    onPointerUp: () => machine.release(k),
    onPointerCancel: () => machine.release(k),
    onLostPointerCapture: () => machine.release(k),
  });

  const px = (n: number) => n * scale;
  return (
    <div
      ref={rootRef}
      className={`chq-arcade is-${props.side}`}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Arcade"
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      <div className="chq-cab" style={{ "--k": `${scale}px` } as CSSProperties}>
        <button type="button" className="chq-cab-x" aria-label="Close the arcade" title="Close (Esc)" onClick={props.onClose}>
          ✕
        </button>
        <canvas ref={marqueeRef} className="chq-cab-marquee" width={SW} height={MARQUEE_H} style={{ width: px(SW), height: px(MARQUEE_H) }} aria-hidden />
        <div className="chq-cab-bezel">
          <canvas
            ref={screenRef}
            className="chq-cab-screen"
            width={SW}
            height={SH}
            style={{ width: px(SW), height: px(SH) }}
            aria-label={screen.mode === "menu" ? `Pick a game: ${screen.game.name}` : screen.game.name}
            onPointerDown={onScreenDown}
            onPointerMove={onScreenMove}
            onPointerUp={onScreenUp}
            onPointerCancel={onScreenUp}
          />
          <i className="chq-cab-glass" aria-hidden />
        </div>
        <div className="chq-cab-deck">
          {touch ? (
            <div className="chq-cab-pad">
              <div className="chq-cab-dpad">
                {(["up", "left", "right", "down"] as Dir[]).map((d) => (
                  <button key={d} type="button" tabIndex={-1} className={`is-${d}`} aria-label={d} {...hold(d)}>
                    {ARROW[d]}
                  </button>
                ))}
              </div>
              <button type="button" tabIndex={-1} className="chq-cab-menu" onClick={() => machine.back()}>
                {screen.mode === "menu" ? "Close" : "Menu"}
              </button>
              <button type="button" tabIndex={-1} className="chq-cab-a" aria-label="Start, fire" {...hold("fire")}>
                A
              </button>
            </div>
          ) : (
            <div className="chq-cab-hint">{hintFor(screen.mode, screen.game)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
