// The Cozy HQ panel: the pixel office fills the whole panel; a few crisp
// HTML overlays sit on top of it (TV text, usage notes, sound controls,
// tooltips, the sticky-note legend).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { InboxItem, Story, UsageCard } from "../contract.ts";
import { lookFor } from "./characters.ts";
import { buildLayout, MIN_H_WIDE, MIN_W_WIDE, PORTRAIT_MIN_H, PORTRAIT_W, type Layout, type PokeKind, type Rect } from "./layout.ts";
import { EVENT_KINDS, type EventKind } from "./life.ts";
import { SEASONS, seasonsOf, type Season } from "./seasons.ts";
import { SAMPLE_NEWS, sampleThreads, sampleUsage } from "./sample.ts";
import {
  ago,
  assignSpots,
  diffEvents,
  deskStyleFor,
  moodLabel,
  moodOf,
  topicOf,
  visibleThreads,
  waitKindOf,
  WAIT_LABEL,
  type Mood,
  type Topic,
  type WaitKind,
  type OfficeEvent,
  type ThreadLike,
} from "./model.ts";
import { hash } from "./pixel.ts";
import { Sound, type SoundName } from "./sound.ts";
import { World, type Hit, type WorldThread } from "./world.ts";
import { chairToneFor } from "./desks.ts";

export const TOPIC_EMOJI: Record<Topic, string> = {
  game: "🎮",
  auth: "🔑",
  security: "🛡️",
  bug: "🐞",
  test: "🧪",
  review: "🔍",
  docs: "📝",
  design: "🎨",
  data: "🗄️",
  deploy: "🚀",
  speed: "⚡",
  map: "🗺️",
  chat: "💬",
  chart: "📊",
  plugin: "🧩",
  refactor: "🔧",
  music: "🎵",
  search: "🔎",
  ai: "🤖",
  api: "🔌",
};

const WAIT_ICON: Record<WaitKind, string> = {
  question: "?",
  plan: "▤",
  approval: "!",
  drafting: "✎",
  done: "✓",
  error: "✕",
};

export interface OfficeThread extends ThreadLike {
  projectName: string;
  projectHue: number;
  providerName: string;
}

export interface OfficeProps {
  storageKey: string;
  threads: OfficeThread[];
  loading: boolean;
  usage: { cards: UsageCard[]; updatedAt: number } | null;
  usageLoading: boolean;
  news: Story[];
  newsEnabled: boolean;
  inbox: { enabled: boolean; available: boolean; sources: string[]; items: InboxItem[] };
  onOpenThread: (id: string) => void;
  onNewThread: () => void;
  onOpenUrl: (url: string) => void;
  onRefreshUsage: () => void;
  buddyOn: boolean;
  onBuddy: (on: boolean) => void;
}

interface SoundPrefs {
  on: boolean;
  volume: number;
  ambient: boolean;
}

interface DebugPrefs {
  expose?: boolean;
  hour?: number;
  rainy?: boolean;
  demo?: boolean;
  /** Keep this office event running (e.g. "party"). */
  event?: string;
  /** Show made-up threads, usage and headlines instead of your own (for screenshots). */
  sample?: boolean;
  /** Pretend it's this season ("holidays", "laternenfest", "holi", …) whatever the date; "none" for none. */
  season?: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: preferences just won't persist
  }
}

/** Today's seasons, or the one the debug settings pretend it is. */
function seasonsFor(debug: string | undefined, date: Date): { season: Season | null; seasons: Season[] } {
  const list = debug === "none" ? [] : debug && (SEASONS as string[]).includes(debug) ? [debug as Season] : seasonsOf(date);
  return { season: list[0] ?? null, seasons: list };
}

function greeting(h: number): string {
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Good night";
}

/** A rainy day roughly one day in four, the same for everyone that day. */
function isRainy(d: Date): boolean {
  return hash(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) % 4 === 0;
}

/** Preview the other states on real threads (debug only, nothing is changed). */
function withDemoMoods(list: OfficeThread[]): OfficeThread[] {
  const plan = { status: "active", indicator: "plan-mode", activity: { workflows: 0, backgroundAgents: 0, backgroundCommands: 0, planMode: 1 } };
  const demo: Partial<OfficeThread>[] = [
    { indicator: "waiting-for-input", hasPendingInteraction: true, interaction: "question" },
    { indicator: "unread-error", isUnread: true },
    plan,
    { indicator: "unread-success", isUnread: true },
    { status: "active", indicator: "runtime", model: "claude-haiku-4-5" },
    plan,
    { indicator: "waiting-for-input", hasPendingInteraction: true, interaction: "plan" },
    { drafting: true },
    { indicator: "waiting-for-input", hasPendingInteraction: true, interaction: "approval" },
    { status: "active", indicator: "runtime", model: "gpt-5-codex" },
    { status: "active", indicator: "runtime", model: "claude-sonnet-5-5" },
    plan,
  ];
  const base: Partial<OfficeThread> = {
    status: "idle",
    indicator: "none",
    hasPendingInteraction: false,
    interaction: undefined,
    isUnread: false,
    drafting: false,
    activity: { workflows: 0, backgroundAgents: 0, backgroundCommands: 0, planMode: 0 },
  };
  return list.map((t, i) => (i < demo.length ? { ...t, ...base, ...demo[i] } : t));
}

interface Fit {
  /** Device pixels per native pixel. */
  s: number;
  /** Whole-number canvas backing multiple. */
  k: number;
  W: number;
  H: number;
  dpr: number;
}

/**
 * Pick the scene size for the panel: whole device pixels per native pixel
 * when that still leaves a reasonably sized office, else the exact fit.
 */
function fitPanel(cssW: number, cssH: number): Fit {
  const dpr = window.devicePixelRatio || 1;
  const devW = Math.max(1, cssW * dpr);
  const devH = Math.max(1, cssH * dpr);
  // Tall panels (a phone held upright) get the stacked portrait office.
  const portrait = devW < devH * 0.82;
  const sMax = portrait ? Math.min(devW / PORTRAIT_W, devH / PORTRAIT_MIN_H) : Math.min(devW / MIN_W_WIDE, devH / MIN_H_WIDE);
  const whole = Math.floor(sMax);
  const s = whole >= 1 && whole >= sMax * 0.85 ? whole : Math.max(0.5, sMax);
  return { s, k: Math.max(1, Math.ceil(s - 1e-6)), W: Math.floor(devW / s), H: Math.floor(devH / s), dpr };
}

export function OfficeView(input: OfficeProps) {
  const { storageKey } = input;
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundRef = useRef<Sound | null>(null);
  if (!soundRef.current) soundRef.current = new Sound();
  const sound = soundRef.current;

  const [prefs, setPrefs] = useState<SoundPrefs>(() =>
    readJson<SoundPrefs>(`${storageKey}:sound`, { on: true, volume: 0.5, ambient: true }),
  );
  const [soundOpen, setSoundOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [fit, setFit] = useState<Fit | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [hover, setHover] = useState<Hit | null>(null);
  const hoverRef = useRef<Hit | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState<OfficeEvent[]>(() => readJson(`${storageKey}:events`, { list: [] as OfficeEvent[] }).list);
  const [tvTick, setTvTick] = useState(0);
  const [channel, setChannel] = useState(0);
  // Developer overrides, set from devtools to preview other times and states:
  // localStorage["<storageKey>:debug"] = '{"hour":13,"rainy":false,"demo":true}'
  const [debug, setDebug] = useState<DebugPrefs>(() => readJson<DebugPrefs>(`${storageKey}:debug`, {}));
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = readJson<DebugPrefs>(`${storageKey}:debug`, {});
      setDebug((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, 2000);
    return () => window.clearInterval(id);
  }, [storageKey]);
  const debugRef = useRef(debug);
  debugRef.current = debug;
  // Sample mode: nothing from your real workspace, for screenshots.
  const props = useMemo<OfficeProps>(() => {
    if (!debug.sample) return input;
    const now = Date.now();
    return {
      ...input,
      threads: sampleThreads(now),
      loading: false,
      usage: sampleUsage(now),
      usageLoading: false,
      news: SAMPLE_NEWS,
      newsEnabled: true,
      inbox: { enabled: false, available: false, sources: [], items: [] },
    };
  }, [input, debug.sample]);
  const { threads } = props;
  useEffect(() => {
    if (debug.expose) (window as unknown as { __cozyHq?: unknown }).__cozyHq = worldRef.current;
  }, [debug.expose]);

  useEffect(() => {
    sound.configure(prefs.on, prefs.volume, prefs.ambient);
    writeJson(`${storageKey}:sound`, prefs);
  }, [prefs, sound, storageKey]);
  useEffect(() => {
    // bb has usually had a click already, so audio can start right away;
    // otherwise the first click anywhere in the window unlocks it.
    sound.unlock();
    const unlock = () => sound.unlock();
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      sound.dispose();
    };
  }, [sound]);
  const play = useCallback((name: SoundName) => sound.play(name), [sound]);

  const worldRef = useRef<World | null>(null);
  if (!worldRef.current) worldRef.current = new World((s, ambient) => sound.play(s, ambient));
  const world = worldRef.current;

  // ------------------------------------------------------------ sizing → layout
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const next = fitPanel(el.clientWidth, el.clientHeight);
      setFit((prev) =>
        prev && prev.s === next.s && prev.W === next.W && prev.H === next.H && prev.dpr === next.dpr ? prev : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // ------------------------------------------------------------ threads → world
  const visible = useMemo(() => {
    const list = visibleThreads(threads) as OfficeThread[];
    return debug.demo ? withDemoMoods(list) : list;
  }, [threads, debug.demo]);
  // Desk rows follow the head count (rounded up to whole rows), so a few
  // threads don't sit in a sea of empty desks.
  const headcount = props.loading ? 8 : Math.ceil(Math.max(4, visible.length) / 4) * 4;
  useEffect(() => {
    if (!fit) return;
    const L = buildLayout(fit.W, fit.H, { threads: headcount });
    world.setLayout(L);
    setLayout(L);
  }, [fit?.W, fit?.H, headcount, world]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = useMemo(() => new Map(visible.map((t) => [t.id, t])), [visible]);
  const homeDesks = useRef<Map<string, number>>(
    new Map(Object.entries(readJson<Record<string, number>>(`${storageKey}:desks`, {}))),
  );
  const [overflow, setOverflow] = useState(0);
  const synced = useRef(false);
  const prevMoods = useRef<Map<string, Mood> | null>(null);
  const titles = useRef(new Map<string, string>());

  const syncWorld = useCallback(
    (instant: boolean) => {
      const L = world.layout;
      if (!L) return;
      const { spots, overflow: over } = assignSpots(visible, world.allSpots(), world.currentSpots(), homeDesks.current, Date.now(), {
        event: world.eventActive,
      });
      let desksChanged = false;
      for (const [id, spot] of spots) {
        if (!spot.startsWith("desk-")) continue;
        const index = Number(spot.slice(5));
        if (homeDesks.current.get(id) !== index) {
          homeDesks.current.set(id, index);
          desksChanged = true;
        }
      }
      if (desksChanged) {
        const live = new Set(visible.map((t) => t.id));
        writeJson(`${storageKey}:desks`, Object.fromEntries([...homeDesks.current].filter(([id]) => live.has(id)).slice(-80)));
      }
      const list: WorldThread[] = [];
      for (const t of visible) {
        const spotId = spots.get(t.id);
        if (!spotId) continue;
        list.push({
          id: t.id,
          title: t.displayTitle,
          mood: moodOf(t),
          waitKind: waitKindOf(t),
          spotId,
          look: lookFor(t.id, t.projectHue),
          isPinned: t.isPinned,
          emblem: topicOf(t.displayTitle),
          deskStyle: deskStyleFor(t.model, t.providerId),
          chairTone: chairToneFor(t.providerId),
        });
      }
      world.sync(list, instant);
      setOverflow(over.length);
    },
    [visible, world, storageKey],
  );

  const syncRef = useRef(syncWorld);
  syncRef.current = syncWorld;
  const [officeEvent, setOfficeEvent] = useState<ReturnType<World["currentEvent"]>>(null);

  useEffect(() => {
    if (props.loading || !layout) return;
    const instant = !synced.current;
    syncWorld(instant);
    synced.current = true;
    const after = new Map(visible.map((t) => [t.id, { mood: moodOf(t), title: t.displayTitle }]));
    if (prevMoods.current) {
      const fresh = diffEvents(prevMoods.current, after, titles.current, Date.now());
      if (fresh.length > 0) {
        setEvents((prev) => {
          const next = [...fresh.reverse(), ...prev].slice(0, 30);
          writeJson(`${storageKey}:events`, { list: next });
          return next;
        });
      }
    }
    prevMoods.current = new Map([...after].map(([id, v]) => [id, v.mood]));
    for (const t of visible) titles.current.set(t.id, t.displayTitle);
  }, [visible, props.loading, layout, syncWorld, storageKey]);

  useEffect(() => {
    const id = window.setInterval(() => syncWorld(false), 30_000);
    const shuffle = window.setInterval(() => world.shuffle(), 75_000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(shuffle);
    };
  }, [syncWorld, world]);

  const counts = useMemo(() => {
    const c: Record<Mood, OfficeThread[]> = { "needs-you": [], error: [], done: [], drafting: [], planning: [], working: [], idle: [] };
    for (const t of visible) c[moodOf(t)].push(t);
    return c;
  }, [visible]);
  const countsRef = useRef(counts);
  countsRef.current = counts;
  const overflowRef = useRef(overflow);
  overflowRef.current = overflow;

  // ------------------------------------------------------------ loop
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const fitRef = useRef(fit);
  fitRef.current = fit;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const out = canvas.getContext("2d");
    if (!out) return;
    const native = document.createElement("canvas");
    const ctx = native.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastChimeHour = new Date().getHours();
    let eventVersion = world.eventVersion;
    let forcedAt = -Infinity;
    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (document.hidden) return;
      acc += dt;
      if (acc < 1 / 30) return;
      const step = acc;
      acc = 0;
      const L = world.layout;
      const f = fitRef.current;
      if (!L || !f) return;
      if (native.width !== L.W || native.height !== L.H) {
        native.width = L.W;
        native.height = L.H;
      }
      world.update(step);
      const dbgEvent = debugRef.current.event;
      if (dbgEvent && !world.eventActive && ts - forcedAt > 5000 && (EVENT_KINDS as string[]).includes(dbgEvent)) {
        forcedAt = ts;
        world.startEvent(dbgEvent as EventKind);
      }
      if (world.eventVersion !== eventVersion) {
        // An office event started or ended: idle agents head over or back.
        eventVersion = world.eventVersion;
        syncRef.current(false);
        setOfficeEvent(world.currentEvent());
      }
      const date = new Date();
      if (date.getMinutes() === 0 && date.getHours() !== lastChimeHour) {
        lastChimeHour = date.getHours();
        sound.play("chime");
      }
      const dbg = debugRef.current;
      const c = countsRef.current;
      world.render(ctx, {
        hour: dbg.hour ?? date.getHours() + date.getMinutes() / 60,
        date,
        rainy: dbg.rainy ?? isRainy(date),
        soundOn: prefsRef.current.on && prefsRef.current.volume > 0,
        soundPulse: (performance.now() - sound.lastAt) / 1000,
        hover: hoverRef.current,
        counts: {
          attention: c["needs-you"].length + c.error.length,
          done: c.done.length,
          working: c.working.length,
          planning: c.planning.length,
        },
        overflow: overflowRef.current,
        ...seasonsFor(dbg.season, date),
      });
      const bw = L.W * f.k;
      const bh = L.H * f.k;
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      out.imageSmoothingEnabled = false;
      out.drawImage(native, 0, 0, bw, bh);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [world, sound]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    const tv = window.setInterval(() => setTvTick((x) => x + 1), 9_000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(tv);
    };
  }, []);

  // ------------------------------------------------------------ input
  const scale = fit ? fit.s / fit.dpr : 1; // CSS px per native px
  const toNative = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  const onMove = (e: React.PointerEvent) => {
    const p = toNative(e);
    const hit = world.hitTest(p.x, p.y);
    hoverRef.current = hit;
    if (JSON.stringify(hit) !== JSON.stringify(hover)) setHover(hit);
    if (hit?.kind === "agent") setTipPos(world.anchorOf(hit.id));
    else setTipPos(hit ? p : null);
  };
  const onLeave = () => {
    hoverRef.current = null;
    setHover(null);
    setTipPos(null);
  };

  const waiting = useMemo(
    () => [...counts["needs-you"], ...counts.error, ...counts.done],
    [counts],
  );

  const onClick = (e: React.MouseEvent) => {
    sound.unlock();
    const hit = world.hitTest(toNative(e).x, toNative(e).y);
    setSoundOpen(false);
    if (!hit) {
      setLegendOpen(false);
      return;
    }
    switch (hit.kind) {
      case "agent":
        play("click");
        props.onOpenThread(hit.id);
        break;
      case "desk":
      case "door":
        play("click");
        props.onNewThread();
        break;
      case "legend":
        play("click");
        setLegendOpen((o) => !o);
        break;
      case "cat":
        world.petCat();
        break;
      case "dog":
        world.petDog();
        break;
      case "egg":
        world.findOfficeEgg(hit.index);
        break;
      case "clock":
        world.poke("clock");
        break;
      case "calendar": {
        // Something's on today: start an office event.
        world.startEvent();
        break;
      }
      case "npc":
        play(hit.who === "guard" ? "walkie" : hit.who === "janitor" ? "whistle" : "giggle");
        break;
      case "poke":
        world.poke(hit.id);
        if (hit.poke === "bell") {
          const first = waiting[0];
          if (first) props.onOpenThread(first.id);
        }
        break;
      case "speaker":
        setSoundOpen(true);
        play("click");
        break;
      case "tv":
        setChannel((c) => c + 1);
        setTvTick(0);
        play("channel");
        break;
      case "pinboard":
        play("click");
        props.onRefreshUsage();
        break;
      default:
        break;
    }
  };

  const [occupants, setOccupants] = useState<Occupant[]>([]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = world.waitingOccupants();
      setOccupants((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, 300);
    return () => window.clearInterval(id);
  }, [world]);
  const tags = useMemo(
    () => (layout ? placeTags(occupants, byId, scale, layout.W * scale) : []),
    [occupants, byId, scale, layout],
  );
  useEffect(() => {
    world.setLabeled(tags.map((t) => t.id));
  }, [tags, world]);

  const night = world.nightness(debug.hour ?? now.getHours() + now.getMinutes() / 60);

  const tooltip = useMemo<ReactNode>(() => {
    if (!hover) return null;
    switch (hover.kind) {
      case "agent": {
        const t = byId.get(hover.id);
        if (!t) return null;
        const mood = moodOf(t);
        const wait = waitKindOf(t);
        const topic = topicOf(t.displayTitle);
        const activity = world.activityOf(t.id);
        const when = ago(Date.now() - t.updatedAt);
        return (
          <>
            <div className="chq-tip-title">
              {topic ? <span className="chq-tip-topic">{TOPIC_EMOJI[topic]}</span> : null}
              {t.displayTitle}
            </div>
            <div className="chq-tip-meta">
              <span className="chq-dot" style={{ background: `hsl(${t.projectHue} 58% 60%)` }} />
              {t.projectName} · {t.providerName}
              {t.model ? ` · ${t.model.replace(/^claude-/, "")}` : ""}
            </div>
            <div className={`chq-tip-mood chq-mood-${mood}`}>
              {wait ? WAIT_LABEL[wait] : moodLabel(mood)}
              {mood === "idle" && activity ? ` · ${activity}` : ""} · {when}
              {when === "just now" ? "" : " ago"}
            </div>
          </>
        );
      }
      case "desk":
        return <div className="chq-tip-hint">Empty desk · start a new thread</div>;
      case "door":
        return (
          <div className="chq-tip-hint">
            New thread{overflow > 0 ? ` · ${overflow} more ${overflow === 1 ? "thread is" : "threads are"} out of the office` : ""}
          </div>
        );
      case "legend":
        return <div className="chq-tip-hint">What everyone is doing</div>;
      case "calendar":
        return (
          <>
            <div className="chq-tip-hint">
              {greeting(now.getHours())} · {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <div className="chq-tip-hint chq-tip-sub">{officeEvent ? `${officeEvent.title} in progress` : "Click for an office event"}</div>
          </>
        );
      case "clock":
        return (
          <>
            <div className="chq-tip-time">{now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
            <div className="chq-tip-hint chq-tip-sub">{now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · cuckoo</div>
          </>
        );
      case "dog":
        return <div className="chq-tip-hint">Biscuit, the office dog · pet</div>;
      case "egg": {
        const left = world.eggsLeft();
        return <div className="chq-tip-hint">An Easter egg! {left === 1 ? "The last one" : `${left} hidden around the office`}</div>;
      }
      case "npc":
        return (
          <div className="chq-tip-hint">
            {hover.who === "guard" ? "Night guard on their rounds" : hover.who === "janitor" ? "Cleaning crew · mind the wet floor" : "A visiting kid · bring your kids to work day"}
          </div>
        );
      case "poke":
        return <div className="chq-tip-hint">{pokeTip(hover.poke, waiting, counts)}</div>;
      case "status":
        return (
          <div className="chq-tip-hint">
            {counts["needs-you"].length + counts.error.length} waiting on you · {counts.done.length} done · {counts.working.length + counts.planning.length} busy
          </div>
        );
      case "cat":
        return <div className="chq-tip-hint">Pixel, the office cat · pet</div>;
      case "tv":
        return <div className="chq-tip-hint">Change the channel</div>;
      case "speaker":
        return <div className="chq-tip-hint">Sound {prefs.on ? `${Math.round(prefs.volume * 100)}%` : "off"}</div>;
      case "pinboard":
        return <div className="chq-tip-hint">Provider usage · refresh</div>;
    }
  }, [hover, byId, world, prefs, overflow, waiting, now, counts, officeEvent]);

  const W = (layout?.W ?? MIN_W_WIDE) * scale;
  const H = (layout?.H ?? MIN_H_WIDE) * scale;
  const stageStyle = { width: W, height: H, "--s": `${scale}px` } as CSSProperties;
  const box = (r: Rect): CSSProperties => ({ left: r.x * scale, top: r.y * scale, width: r.w * scale, height: r.h * scale });
  const crisp = fit ? Math.abs(fit.s - fit.k) < 1e-6 : false;

  return (
    <div className="chq-root">
      <div className="chq-stage" ref={stageRef}>
        <div className="chq-scene" style={stageStyle}>
          <canvas
            ref={canvasRef}
            className={`chq-canvas${crisp ? " is-crisp" : ""}`}
            style={{ width: W, height: H, cursor: hover ? "pointer" : "default" }}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            onClick={onClick}
            aria-label="Pixel office: each character is one of your threads"
            role="img"
          />
          {layout ? (
            <>
              <Pinboard
                style={box({ x: layout.wall.pinboard.x + 3, y: layout.wall.pinboard.y + 3, w: layout.wall.pinboard.w - 6, h: layout.wall.pinboard.h - 6 })}
                usage={props.usage}
                loading={props.usageLoading}
                night={night}
                onRefresh={() => {
                  sound.unlock();
                  play("click");
                  props.onRefreshUsage();
                }}
              />
              <Tv
                style={box(layout.tvScreen)}
                special={officeEvent ? { tag: "TODAY", text: officeEvent.tv } : null}
                channel={channel}
                tick={tvTick}
                events={events}
                counts={counts}
                news={props.newsEnabled ? props.news : []}
                inbox={props.inbox}
                onNext={() => {
                  sound.unlock();
                  setChannel((c) => c + 1);
                  setTvTick(0);
                  play("channel");
                }}
                onOpenUrl={props.onOpenUrl}
                onOpenThread={props.onOpenThread}
              />
              {soundOpen ? (
                <SoundPanel
                  style={{
                    left: Math.min((layout.speakers[1]!.x + layout.speakers[1]!.w + 4) * scale, W - 200),
                    top: layout.speakers[1]!.y * scale,
                  }}
                  prefs={prefs}
                  onChange={(next) => {
                    sound.unlock();
                    setPrefs(next);
                  }}
                  onTest={() => {
                    sound.unlock();
                    window.setTimeout(() => sound.play("done"), 30);
                  }}
                  buddyOn={props.buddyOn}
                  onBuddy={props.onBuddy}
                  onClose={() => setSoundOpen(false)}
                />
              ) : null}
              {legendOpen ? (
                <LegendNotes
                  style={{ left: layout.wall.legendNote.x * scale, top: (layout.wall.legendNote.y + layout.wall.legendNote.h + 4) * scale }}
                  onClose={() => setLegendOpen(false)}
                />
              ) : null}
            </>
          ) : null}
          <WaitTags tags={tags} width={W} height={H} onOpen={props.onOpenThread} />
          {tooltip && tipPos ? (
            <div
              className={`chq-tip${tipPos.y * scale < 96 ? " is-below" : ""}`}
              style={{ left: Math.min(Math.max(tipPos.x * scale, 130), W - 130), top: tipPos.y * scale + (tipPos.y * scale < 96 ? 18 : 0) }}
            >
              {tooltip}
            </div>
          ) : null}
          {props.loading ? <div className="chq-loading">Opening the office…</div> : null}
          {!props.loading && visible.length === 0 ? (
            <div className="chq-empty">
              The office is empty. <button onClick={props.onNewThread}>Start a thread</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- wait tags

interface Occupant {
  id: string;
  x: number;
  y: number;
  kind: WaitKind;
}

interface TagBox {
  id: string;
  kind: WaitKind;
  title: string;
  left: number;
  top: number;
  w: number;
  h: number;
  /** Head point the tag belongs to (CSS px). */
  ax: number;
  ay: number;
}

const TAG_H = 16;
const TAG_GAP = 3;

/**
 * Lay the waiting room's title tags out above their heads so none overlap:
 * each tag tries straight above, then nudged sideways, then a tier higher.
 */
function placeTags(occupants: Occupant[], byId: Map<string, OfficeThread>, scale: number, sceneW: number): TagBox[] {
  const placed: TagBox[] = [];
  const hits = (a: { left: number; top: number; w: number; h: number }) =>
    placed.some((b) => a.left < b.left + b.w + TAG_GAP && b.left < a.left + a.w + TAG_GAP && a.top < b.top + b.h + TAG_GAP && b.top < a.top + a.h + TAG_GAP);
  for (const o of occupants) {
    const t = byId.get(o.id);
    if (!t) continue;
    const title = t.displayTitle;
    const w = Math.round(Math.min(156, 24 + Math.min(title.length, 24) * 6));
    const ax = o.x * scale;
    const ay = (o.y - 2) * scale;
    let done = false;
    for (let tier = 0; tier < 5 && !done; tier++) {
      for (const shift of [0, -0.6, 0.6, -1.15, 1.15]) {
        const left = Math.max(2, Math.min(sceneW - w - 2, ax - w / 2 + shift * w));
        const top = ay - TAG_H - 4 - tier * (TAG_H + TAG_GAP);
        if (top < 2) continue;
        const box = { left, top, w, h: TAG_H };
        if (hits(box)) continue;
        placed.push({ id: o.id, kind: o.kind, title, ...box, ax, ay });
        done = true;
        break;
      }
    }
  }
  return placed;
}

/** Title tags over the agents in the waiting room, with a thin line to each head. */
function WaitTags(props: { tags: TagBox[]; width: number; height: number; onOpen: (id: string) => void }) {
  if (props.tags.length === 0) return null;
  return (
    <>
      <svg className="chq-tag-lines" width={props.width} height={props.height} aria-hidden>
        {props.tags.map((t) => {
          const x0 = Math.max(t.left + 6, Math.min(t.left + t.w - 6, t.ax));
          return <line key={t.id} x1={x0} y1={t.top + t.h} x2={t.ax} y2={t.ay} />;
        })}
      </svg>
      {props.tags.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`chq-tag chq-tag-${t.kind}`}
          style={{ left: t.left, top: t.top, width: t.w }}
          onClick={() => props.onOpen(t.id)}
          title={`${WAIT_LABEL[t.kind]}: ${t.title}`}
        >
          <i aria-hidden>{WAIT_ICON[t.kind]}</i>
          <span>{t.title}</span>
        </button>
      ))}
    </>
  );
}

const POKE_TIP: Record<PokeKind, string> = {
  coffee: "Espresso machine · brew a cup",
  kettle: "Kettle · put it on",
  vending: "Vending machine · grab a snack",
  fridge: "Fridge · have a look inside",
  microwave: "Microwave · heat up lunch",
  piano: "Piano · play a tune",
  dartboard: "Dartboard · throw a dart",
  printer: "Printer · print something",
  cooler: "Water cooler",
  lamp: "Your desk lamp · on/off",
  plant: "Water the plant",
  bin: "Bin · toss some paper",
  clock: "Clock",
  arcade: "Arcade · insert a coin",
  pingpong: "Ping-pong table · serve",
  fishtank: "Feed the fish",
  whiteboard: "Planning room whiteboard · threads in plan mode",
  bell: "Reception bell",
  boss: "That's you · whistle for Biscuit",
  cornhole: "Cornhole · toss a bag",
  globe: "Spin the globe",
};

function pokeTip(kind: PokeKind, waiting: OfficeThread[], counts: Record<Mood, OfficeThread[]>): string {
  if (kind === "bell") return waiting.length ? `Reception · open “${waiting[0]!.displayTitle}”` : "Reception · nobody is waiting for you";
  if (kind === "boss" && counts.drafting.length > 0) return `That's you · going over “${counts.drafting[0]!.displayTitle}”`;
  return POKE_TIP[kind];
}

// -------------------------------------------------------------- legend

const LEGEND: { title: string; text: string; color: string; icon: string }[] = [
  { title: "At a desk", text: "Working on it", color: "#cdeefd", icon: "⌨" },
  { title: "Meeting room", text: "Planning", color: "#e8dcff", icon: "✎" },
  { title: "Waiting room · hand up", text: "Question or approval for you", color: "#cdeefd", icon: "?" },
  { title: "Meeting room · blueprint", text: "Plan ready for your review", color: "#e8dcff", icon: "▤" },
  { title: "Your office", text: "You're drafting a prompt for it", color: "#f1ece2", icon: "✎" },
  { title: "Waiting room · page ✓", text: "Done, not read yet", color: "#d9f7c9", icon: "✓" },
  { title: "Waiting room · rain cloud", text: "Hit an error", color: "#ffd6e5", icon: "☁" },
  { title: "Desk & chair", text: "Desk = model, chair = provider", color: "#ffe9c7", icon: "◧" },
  { title: "Shirt badge", text: "What the thread is about", color: "#d9f7c9", icon: "★" },
  { title: "Kitchen · cooler", text: "Idle under 20 min", color: "#ffe9c7", icon: "☕" },
  { title: "Office events", text: "Idle agents join in", color: "#ffd6e5", icon: "★" },
  { title: "Lounge", text: "Idle a while", color: "#fff3a3", icon: "♪" },
  { title: "Beanbag", text: "Idle 8 hours+", color: "#cdeefd", icon: "z" },
];

function LegendNotes(props: { style: CSSProperties; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);
  return (
    <div className="chq-legend-pop" style={props.style} role="dialog" aria-label="What everyone is doing" onClick={props.onClose}>
      {LEGEND.map((n, i) => (
        <div
          key={n.title}
          className="chq-legend-note"
          style={{ background: n.color, transform: `rotate(${((hash(n.title) % 5) - 2) * 1.1}deg)`, animationDelay: `${i * 35}ms` }}
        >
          <i className="chq-pushpin" style={{ background: ["#e5484d", "#3e8ed0", "#30a46c", "#f5a524", "#8e4ec6"][i % 5] }} />
          <span className="chq-legend-icon" aria-hidden>
            {n.icon}
          </span>
          <b>{n.title}</b>
          <span>{n.text}</span>
        </div>
      ))}
    </div>
  );
}


// -------------------------------------------------------------- pinboard

function resetText(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const h = ms / 3_600_000;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

const NOTE_COLORS = ["#fff3a3", "#cdeefd", "#ffd6e5", "#d9f7c9", "#e8dcff"];

function Pinboard(props: {
  style: CSSProperties;
  usage: OfficeProps["usage"];
  loading: boolean;
  night: number;
  onRefresh: () => void;
}) {
  const cards = props.usage?.cards ?? [];
  const dim = 1 - props.night * 0.28;
  return (
    <div className="chq-pinboard" style={{ ...props.style, filter: `brightness(${dim})` }}>
      <div className="chq-pin-head">
        <span>USAGE</span>
        <button type="button" onClick={props.onRefresh} aria-label="Refresh usage" className={props.loading ? "is-spin" : ""}>
          ↻
        </button>
      </div>
      <div className={`chq-notes n${Math.min(cards.length, 6)}`}>
        {cards.length === 0 ? (
          <div className="chq-note" style={{ background: NOTE_COLORS[0], transform: "rotate(-1.5deg)" }}>
            <div className="chq-note-title">{props.loading || !props.usage ? "Checking quotas…" : "No usage sources"}</div>
          </div>
        ) : (
          cards.slice(0, 6).map((c, i) => {
            const worst = Math.max(0, ...c.windows.map((w) => w.usedPercent));
            const tone = c.status !== "ok" ? "off" : worst >= 90 ? "hot" : worst >= 70 ? "warm" : "ok";
            const rot = ((hash(c.id) % 5) - 2) * 0.8;
            return (
              <div
                key={c.id}
                className={`chq-note tone-${tone}`}
                style={{ background: NOTE_COLORS[i % NOTE_COLORS.length], transform: `rotate(${rot}deg)` }}
                title={`${c.providers.join(" + ")}${c.plan ? ` · ${c.plan}` : ""}`}
              >
                <i className="chq-pushpin" style={{ background: ["#e5484d", "#3e8ed0", "#30a46c", "#f5a524", "#8e4ec6"][hash(c.id) % 5] }} />
                <div className="chq-note-title">
                  {c.title}
                  {c.providers.length > 1 ? <span className="chq-note-more"> +{c.providers.length - 1}</span> : null}
                </div>
                {c.status !== "ok" ? (
                  <div className="chq-note-msg">{c.message}</div>
                ) : (
                  c.windows.slice(0, 2).map((w) => {
                    const pct = Math.round(w.usedPercent);
                    const reset = resetText(w.resetsAt);
                    return (
                      <div key={w.label} className="chq-win">
                        <div className="chq-win-row">
                          <span className="chq-win-label">{w.label}</span>
                          <span className="chq-win-pct">{pct}%</span>
                        </div>
                        <div className="chq-bar">
                          <i
                            style={{ width: `${Math.min(100, w.usedPercent)}%` }}
                            className={w.usedPercent >= 90 ? "hot" : w.usedPercent >= 70 ? "warm" : ""}
                          />
                        </div>
                        {reset ? <div className="chq-win-reset">resets in {reset}</div> : null}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- TV

type Channel = "hq" | "tech" | "inbox";

const SOURCE_LABEL: Record<string, string> = {
  slack: "SLACK",
  teams: "TEAMS",
  github: "GITHUB",
  outlook: "MAIL",
};

function eventText(e: OfficeEvent): { tag: string; text: string } {
  switch (e.kind) {
    case "arrived":
      return { tag: "NEW HIRE", text: `“${e.title}” joined the office` };
    case "left":
      return { tag: "FAREWELL", text: `“${e.title}” packed up and left` };
    case "started":
      return { tag: "AT WORK", text: `“${e.title}” is back at the desk` };
    case "done":
      return { tag: "SHIPPED", text: `“${e.title}” finished` };
    case "needs-you":
      return { tag: "BREAKING", text: `“${e.title}” needs your input` };
    case "error":
      return { tag: "ALERT", text: `“${e.title}” hit an error` };
    case "planning":
      return { tag: "PLANNING", text: `“${e.title}” is at the whiteboard` };
  }
}

function Tv(props: {
  style: CSSProperties;
  special: { tag: string; text: string } | null;
  channel: number;
  tick: number;
  events: OfficeEvent[];
  counts: Record<Mood, OfficeThread[]>;
  news: Story[];
  inbox: OfficeProps["inbox"];
  onNext: () => void;
  onOpenUrl: (url: string) => void;
  onOpenThread: (id: string) => void;
}) {
  const channels: Channel[] = ["hq"];
  if (props.news.length > 0) channels.push("tech");
  if (props.inbox.enabled && props.inbox.available && props.inbox.items.length > 0) channels.push("inbox");
  // Auto-flip channels every few items; clicks move to the next one.
  const auto = Math.floor(props.tick / 4);
  const ch = channels[(props.channel + auto) % channels.length]!;
  const item = props.tick % 4;
  const [static_, setStatic] = useState(false);
  const key = `${ch}-${props.channel}`;
  useEffect(() => {
    setStatic(true);
    const id = window.setTimeout(() => setStatic(false), 260);
    return () => window.clearTimeout(id);
  }, [key]);

  let body: ReactNode;
  if (ch === "hq") {
    const recent = props.events.filter((e) => Date.now() - e.at < 6 * 3_600_000);
    const c = props.counts;
    const summary = [
      c["needs-you"].length ? `${c["needs-you"].length} need you` : null,
      c.working.length ? `${c.working.length} at work` : null,
      c.done.length ? `${c.done.length} done` : null,
      `${c.idle.length} on a break`,
    ]
      .filter(Boolean)
      .join(" · ");
    const special = props.special && item % 2 === 0 ? props.special : null;
    const e = special ? undefined : recent[item % Math.max(1, recent.length)];
    const headline = special ?? (e ? eventText(e) : { tag: "LIVE", text: c.working.length ? "Agents hard at work. Coffee machine at full capacity." : "All quiet at HQ. Perfect time for a new idea." });
    body = (
      <>
        <div className="chq-tv-top">
          <span className="chq-tv-logo">HQ NEWS</span>
          <span className="chq-tv-live">● LIVE</span>
        </div>
        <button
          type="button"
          className="chq-tv-headline"
          onClick={(ev) => {
            ev.stopPropagation();
            if (e && e.kind !== "left") props.onOpenThread(e.threadId);
          }}
        >
          <span className={`chq-tv-tag tag-${e?.kind ?? "live"}`}>{headline.tag}</span>
          <span className="chq-tv-text">{headline.text}</span>
          {e ? <span className="chq-tv-time">{ago(Date.now() - e.at)}{ago(Date.now() - e.at) === "just now" ? "" : " ago"}</span> : null}
        </button>
        <div className="chq-tv-ticker">
          <span>{summary} · {recent.slice(0, 6).map((ev) => eventText(ev).text).join(" · ") || "Have a lovely day"} ·&nbsp;</span>
        </div>
      </>
    );
  } else if (ch === "tech") {
    const s = props.news[(Math.floor(props.tick / 1) + props.channel) % props.news.length]!;
    body = (
      <>
        <div className="chq-tv-top">
          <span className="chq-tv-logo tech">TECH ▸ HN</span>
          <span className="chq-tv-live">#{(props.news.indexOf(s) + 1).toString().padStart(2, "0")}</span>
        </div>
        <button
          type="button"
          className="chq-tv-headline"
          onClick={(ev) => {
            ev.stopPropagation();
            props.onOpenUrl(s.url);
          }}
        >
          <span className="chq-tv-text big">{s.title}</span>
        </button>
        <div className="chq-tv-ticker static">
          <span>
            ▲ {s.score} · {s.comments} comments{s.site ? ` · ${s.site}` : ""}
          </span>
        </div>
      </>
    );
  } else {
    const items = props.inbox.items;
    const it = items[(props.tick + props.channel) % items.length]!;
    body = (
      <>
        <div className="chq-tv-top">
          <span className="chq-tv-logo inbox">INBOX</span>
          <span className={`chq-tv-src src-${it.source}`}>{SOURCE_LABEL[it.source] ?? it.source.toUpperCase()}</span>
        </div>
        <button
          type="button"
          className="chq-tv-headline"
          onClick={(ev) => {
            ev.stopPropagation();
            props.onOpenUrl(it.url);
          }}
        >
          <span className="chq-tv-text big">
            {it.unread ? <b className="chq-unread">● </b> : null}
            {it.title}
          </span>
        </button>
        <div className="chq-tv-ticker static">
          <span>
            {[it.author, it.context].filter(Boolean).join(" · ")} · {ago(Date.now() - Date.parse(it.updatedAt))}
          </span>
        </div>
      </>
    );
  }

  return (
    <div className="chq-tv" style={props.style} onClick={props.onNext} role="group" aria-label="Office TV">
      <div className="chq-tv-screen" key={key}>
        {body}
      </div>
      <div className="chq-tv-scan" />
      {static_ ? <div className="chq-tv-static" /> : null}
      <div className="chq-tv-ch">
        CH{channels.indexOf(ch) + 1}/{channels.length}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- sound

function SoundPanel(props: {
  style: CSSProperties;
  prefs: SoundPrefs;
  onChange: (p: SoundPrefs) => void;
  onTest: () => void;
  onClose: () => void;
  buddyOn: boolean;
  onBuddy: (on: boolean) => void;
}) {
  const { prefs } = props;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [props]);
  return (
    <div className="chq-sound" style={props.style} ref={ref} role="dialog" aria-label="Sound">
      <div className="chq-sound-row">
        <button
          type="button"
          className={`chq-sound-toggle${prefs.on ? " is-on" : ""}`}
          aria-pressed={prefs.on}
          onClick={() => props.onChange({ ...prefs, on: !prefs.on })}
        >
          {prefs.on ? "🔊 Sound on" : "🔇 Sound off"}
        </button>
        <button type="button" className="chq-sound-x" aria-label="Close" onClick={props.onClose}>
          ×
        </button>
      </div>
      <label className="chq-sound-vol">
        <span>Volume</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(prefs.volume * 100)}
          disabled={!prefs.on}
          onChange={(e) => props.onChange({ ...prefs, volume: Number(e.target.value) / 100 })}
          aria-label="Volume"
        />
        <b>{Math.round(prefs.volume * 100)}</b>
      </label>
      <label className="chq-sound-amb">
        <input
          type="checkbox"
          checked={prefs.ambient}
          disabled={!prefs.on}
          onChange={(e) => props.onChange({ ...prefs, ambient: e.target.checked })}
        />
        <span>Ambient sounds</span>
        <small>ping-pong, fish tank, coffee, roomba</small>
      </label>
      <button type="button" className="chq-sound-test" disabled={!prefs.on} onClick={props.onTest}>
        ♪ Play a test sound
      </button>
      <label className="chq-sound-amb chq-buddy-opt">
        <input type="checkbox" checked={props.buddyOn} onChange={(e) => props.onBuddy(e.target.checked)} />
        <span>Office buddy</span>
        <small>an agent strolls in a corner of bb wherever you are; click it to come back here</small>
      </label>
    </div>
  );
}

