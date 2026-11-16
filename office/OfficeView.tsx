// The Cozy HQ panel: the pixel office fills the whole panel; a few crisp
// HTML overlays sit on top of it (TV text, usage notes, sound controls,
// tooltips, the sticky-note legend).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { InboxItem, Story, UsageCard, Weather, WeatherKind } from "../contract.ts";
import { openLine, pickTopic, replyLine, type TalkContext, type Talker } from "./chatter.ts";
import { lookFor } from "./characters.ts";
import { buildLayout, layoutSize, MIN_H_WIDE, MIN_W_WIDE, PORTRAIT_MIN_H, PORTRAIT_W, type Layout, type PokeKind, type Rect } from "./layout.ts";
import { EVENT_KINDS, type EventKind } from "./life.ts";
import { SEASON_TITLE, SEASONS, seasonsOf, type Season } from "./seasons.ts";
import { SAMPLE_WEATHER, sampleNews, sampleRecap, sampleThreads, sampleUsage } from "./sample.ts";
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
import { isUnopened, NO_RECORD, noteOpened, updateOpened, type OpenedRecord } from "./highlight.ts";
import { hash } from "./pixel.ts";
import { Sound, type SoundName } from "./sound.ts";
import { familiesOf, subagentsOf } from "./subagents.ts";
import { World, type Hit, type LabelAnchor, type SeenState, type SpeechBubble, type Talk, type WorldThread } from "./world.ts";
import { chairToneFor } from "./desks.ts";
import { relabel, type Theme, type ThemeLabels } from "./theme.ts";
import { THEMES, themeById } from "./themes/index.ts";

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
  /** Force a Vision Pro (sample data); otherwise one or two threads get one. */
  visionPro?: boolean;
}

/**
 * The office keeps living while you're elsewhere in bb: one world per
 * plugin, so coming back shows everyone where they were.
 */
const WORLDS = new Map<string, World>();

/** When you last looked at the office (the buddy counts news since then). */
export function lookKey(storageKey: string): string {
  return `${storageKey}:look`;
}

export interface OfficeProps {
  storageKey: string;
  threads: OfficeThread[];
  loading: boolean;
  usage: { cards: UsageCard[]; updatedAt: number } | null;
  usageLoading: boolean;
  news: Story[];
  /** The TV's name for the tech news source ("HN", "Mix", a feed's title). */
  newsSource: string;
  newsEnabled: boolean;
  inbox: { enabled: boolean; available: boolean; sources: string[]; items: InboxItem[] };
  /** Live weather outside (null until known, or when turned off). */
  weather: Weather | null;
  /** What these threads did last, one line each (null: work talk is off). */
  onRecap: (threadIds: string[]) => Promise<Record<string, string> | null>;
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
  /** Pretend the weather is this ("clear", "partly", "cloudy", "fog", "drizzle", "rain", "snow", "storm"). */
  weather?: string;
  /** Set something off now: "shock" (the server-room gag), "technician", "huddle" or a kind of get-together. */
  gag?: string;
  /** Show this scenery whatever you picked ("neon", "redwoods", "beach", "skyline", "annex", "school", "classic"). */
  scenery?: string;
  demo?: boolean;
  /** Keep this office event running (e.g. "party"). */
  event?: string;
  /** Show made-up threads, usage and headlines instead of your own (for screenshots). */
  sample?: boolean;
  /** Pretend it's this season ("holidays", "laternenfest", "holi", …) whatever the date; "none" for none. */
  season?: string;
  /** With `sample`: headlines from a "mix" of sources or a plain "feed" instead of Hacker News. */
  news?: string;
  /** Change sample threads by id to try out state changes, e.g. {"sample-1": {"indicator": "unread-success"}}. */
  patch?: Record<string, Partial<OfficeThread>>;
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

/** Without live weather: a rainy day roughly one day in four, the same for everyone that day. */
function isRainy(d: Date): boolean {
  return hash(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) % 4 === 0;
}

const WEATHER_KINDS: WeatherKind[] = ["clear", "partly", "cloudy", "fog", "drizzle", "rain", "snow", "storm"];

/** The weather outside: debug override, then live weather, then the made-up rainy days. */
function weatherNow(debug: DebugPrefs, live: Weather | null, date: Date): WeatherKind {
  if (debug.weather && (WEATHER_KINDS as string[]).includes(debug.weather)) return debug.weather as WeatherKind;
  if (debug.rainy !== undefined) return debug.rainy ? "rain" : "clear";
  if (live?.kind) return live.kind;
  return isRainy(date) ? "rain" : "clear";
}

/** °F where people expect it, °C everywhere else. */
function tempText(c: number): string {
  const region = (navigator.language || "").split("-")[1]?.toUpperCase();
  return region === "US" || region === "LR" || region === "MM" ? `${Math.round((c * 9) / 5 + 32)}°F` : `${Math.round(c)}°C`;
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    const news = sampleNews(debug.news, now);
    return {
      ...input,
      threads: sampleThreads(now).map((t) => ({ ...t, ...debug.patch?.[t.id] })),
      loading: false,
      usage: sampleUsage(now),
      usageLoading: false,
      news: news.stories,
      newsSource: news.source,
      newsEnabled: true,
      inbox: { enabled: false, available: false, sources: [], items: [] },
      weather: SAMPLE_WEATHER,
      onRecap: async (ids: string[]) => Object.fromEntries(ids.map((id) => [id, sampleRecap(id)]).filter((e): e is [string, string] => e[1] !== null)),
    };
  }, [input, debug.sample, debug.news, debug.patch]);
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
  if (!worldRef.current) {
    let w = WORLDS.get(storageKey);
    if (!w) {
      w = new World((s, ambient) => sound.play(s, ambient));
      WORLDS.set(storageKey, w);
    }
    worldRef.current = w;
  }
  const world = worldRef.current;
  useEffect(() => {
    world.setEmit((s, ambient) => sound.play(s, ambient));
    return () => world.setEmit(() => undefined);
  }, [world, sound]);

  // The scenery: the same office dressed as another place, with its own floor plan.
  const [sceneryId, setSceneryId] = useState(() => readJson(`${storageKey}:scenery`, { id: "classic" }).id);
  useEffect(() => writeJson(`${storageKey}:scenery`, { id: sceneryId }), [sceneryId, storageKey]);
  const theme = themeById(debug.scenery ?? sceneryId);
  // The scenery's words plus the ones that hold for this floor plan only.
  const named = useMemo(
    () => (layout?.words ? { ...theme, labels: { ...theme.labels, words: { ...theme.labels?.words, ...layout.words } } } : theme),
    [theme, layout],
  );
  useEffect(() => sound.setRecipes(theme.sounds), [theme, sound]);

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
    const size = layoutSize(fit.W, fit.H);
    const L = theme.layout?.(size.W, size.H, { threads: headcount, portrait: size.portrait }) ?? buildLayout(fit.W, fit.H, { threads: headcount });
    world.setTheme(theme, false);
    world.setLayout(L, `${theme.id}:${fit.W}x${fit.H}:${headcount}`);
    setLayout(world.layout);
  }, [fit?.W, fit?.H, headcount, world, theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const byId = useMemo(() => new Map(visible.map((t) => [t.id, t])), [visible]);
  const homeDesks = useRef<Map<string, number>>(
    new Map(Object.entries(readJson<Record<string, number>>(`${storageKey}:desks`, {}))),
  );
  const [overflow, setOverflow] = useState(0);
  const synced = useRef(false);
  const prevMoods = useRef<Map<string, Mood> | null>(null);
  const titles = useRef(new Map<string, string>());
  const pretendOpened = useRef<OpenedRecord>(NO_RECORD);

  const syncWorld = useCallback(
    (instant: boolean) => {
      const L = world.layout;
      if (!L) return;
      // A fresh office (bb was reloaded): start from what you saw last time.
      const pretend = debugRef.current.sample === true || debugRef.current.demo === true;
      const lastSeen = instant && !pretend
        ? new Map(Object.entries(readJson<Record<string, SeenState>>(`${storageKey}:seen`, {})))
        : undefined;
      const previous = world.currentSpots();
      if (lastSeen) for (const [id, s] of lastSeen) if (!previous.has(id)) previous.set(id, s.spotId);
      const { spots, overflow: over } = assignSpots(visible, world.allSpots(), previous, homeDesks.current, Date.now(), {
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
      // New for you since you last opened them (the overlay notes the thread you open, wherever you are in bb).
      const opened = pretend
        ? (pretendOpened.current = noteOpened(pretendOpened.current, visible, Date.now(), null))
        : updateOpened(storageKey, visible, Date.now(), null);
      // One or two people work in a Vision Pro.
      const vision = new Set(
        visible
          .filter((t) => t.visionPro ?? hash(t.id) % 5 === 2)
          .map((t) => t.id)
          .sort()
          .slice(0, 2),
      );
      const families = familiesOf(visible);
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
          visionPro: vision.has(t.id),
          unopened: isUnopened(t, opened),
          subagents: subagentsOf(t),
          family: families.get(t.id) ?? null,
        });
      }
      world.sync(list, instant, lastSeen);
      setOverflow(over.length);
      // Remember what you're looking at, for next time.
      if (!document.hidden && !pretend) {
        writeJson(`${storageKey}:seen`, Object.fromEntries(Object.entries(world.seenStates()).slice(-200)));
        writeJson(lookKey(storageKey), Date.now());
      }
    },
    [visible, world, storageKey],
  );

  const syncRef = useRef(syncWorld);
  syncRef.current = syncWorld;
  useEffect(() => {
    const look = () => {
      if (document.hidden || debugRef.current.sample || debugRef.current.demo) return;
      writeJson(lookKey(storageKey), Date.now());
      writeJson(`${storageKey}:seen`, Object.fromEntries(Object.entries(world.seenStates()).slice(-200)));
    };
    look();
    const id = window.setInterval(look, 5_000);
    document.addEventListener("visibilitychange", look);
    return () => {
      look();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", look);
    };
  }, [storageKey, world]);
  const [officeEvent, setOfficeEvent] = useState<ReturnType<World["currentEvent"]>>(null);

  useEffect(() => {
    if (props.loading || !layout) return;
    // Everyone is placed at once only in a fresh office; otherwise just the
    // threads whose state changed since you last looked get up and walk.
    const instant = world.isEmpty;
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
  const weatherRef = useRef(props.weather);
  weatherRef.current = props.weather;

  // ------------------------------------------------------------ small talk
  const recaps = useRef(new Map<string, string | null>());
  const asking = useRef(new Set<string>());
  const talkData = useRef({ byId: new Map<string, OfficeThread>(), news: [] as string[], festival: null as string | null });
  const onRecapRef = useRef(props.onRecap);
  onRecapRef.current = props.onRecap;
  useEffect(() => {
    const rand = Math.random;
    const talker = (id: string): Talker | null => {
      const t = talkData.current.byId.get(id);
      if (!t) return null;
      const m = moodOf(t);
      return {
        id,
        title: t.displayTitle,
        project: t.projectName,
        recap: recaps.current.get(id) ?? null,
        mood: m === "idle" ? "idle" : m === "done" ? "done" : m === "error" ? "error" : "other",
      };
    };
    const context = (): TalkContext => {
      const d = new Date();
      return {
        news: talkData.current.news,
        weather: weatherNow(debugRef.current, weatherRef.current, d),
        hour: debugRef.current.hour ?? d.getHours(),
        festival: talkData.current.festival,
      };
    };
    const talk: Talk = {
      open(id) {
        const who = talker(id);
        if (!who) return null;
        const ctx = context();
        const topic = pickTopic(who, ctx, rand);
        return { text: openLine(topic, who, ctx, rand), topic };
      },
      reply(id, topic) {
        const who = talker(id);
        return who ? replyLine(topic, who, rand) : null;
      },
      gather(ids) {
        const missing = ids.filter((id) => !recaps.current.has(id) && !asking.current.has(id));
        if (missing.length === 0) return;
        for (const id of missing) asking.current.add(id);
        onRecapRef.current(missing).then(
          (got) => {
            for (const id of missing) {
              asking.current.delete(id);
              recaps.current.set(id, got?.[id] ?? null);
            }
            // Forget them after a while: threads move on.
            window.setTimeout(() => missing.forEach((id) => recaps.current.delete(id)), 5 * 60_000);
          },
          () => missing.forEach((id) => asking.current.delete(id)),
        );
      },
    };
    world.setTalk(talk);
    return () => world.setTalk(null);
  }, [world]);

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
    let gagAt = -Infinity;
    let gagTry = -Infinity;
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
      const gag = debugRef.current.gag;
      // A gag goes off as soon as it can (someone idle and settled), then every 45 s.
      if (gag && ts - gagAt > 45_000 && ts - gagTry > 1_000) {
        gagTry = ts;
        const ok =
          gag === "shock"
            ? world.startMishap()
            : gag === "technician"
              ? world.callTechnician()
              : gag === "lunch"
                ? world.startEvent("lunch") !== null
                : world.startHuddle(gag === "huddle" ? undefined : (gag as Parameters<World["startHuddle"]>[0]));
        if (ok) gagAt = ts;
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
        weather: weatherNow(dbg, weatherRef.current, date),
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
    setSettingsOpen(false);
    if (!hit) {
      setLegendOpen(false);
      return;
    }
    switch (hit.kind) {
      case "agent":
      case "helper":
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
        play(hit.who === "guard" ? "walkie" : hit.who === "janitor" ? "whistle" : hit.who === "technician" ? "wrench" : hit.who === "delivery" ? "dingdong" : "giggle");
        break;
      case "window":
        world.openWindow(hit.index);
        break;
      case "roomba":
        world.bumpRoomba();
        break;
      case "lights":
        world.twinkle();
        break;
      case "scenery": {
        const at = toNative(e);
        world.clickScenery(hit.id, at.x, at.y);
        break;
      }
      case "status":
        play("beep");
        break;
      case "poke":
        world.poke(hit.id);
        if (hit.poke === "bell") {
          const first = waiting[0];
          if (first) props.onOpenThread(first.id);
        }
        break;
      case "speaker":
        setSettingsOpen(true);
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


  // Name tags over everyone's head, when you want them.
  const [labelsOn, setLabelsOn] = useState(() => readJson(`${storageKey}:labels`, { on: false }).on);
  useEffect(() => writeJson(`${storageKey}:labels`, { on: labelsOn }), [labelsOn, storageKey]);
  const [anchors, setAnchors] = useState<LabelAnchor[]>([]);
  const [speech, setSpeech] = useState<SpeechBubble[]>([]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = labelsOn ? world.labelAnchors() : [];
      setAnchors((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      const said = world.speechBubbles();
      setSpeech((prev) => (JSON.stringify(prev) === JSON.stringify(said) ? prev : said));
    }, 250);
    return () => window.clearInterval(id);
  }, [world, labelsOn]);
  const tags = useMemo(
    () => (layout ? placeTags(anchors, byId, scale, layout.W * scale) : []),
    [anchors, byId, scale, layout],
  );
  useEffect(() => {
    world.setLabeled(tags.map((t) => t.id));
  }, [tags, world]);

  const night = world.nightness(debug.hour ?? now.getHours() + now.getMinutes() / 60);
  const today = seasonsFor(debug.season, now);
  const festival = today.season ? SEASON_TITLE[today.season] : null;
  const outside = weatherNow(debug, props.weather, now);
  const tvWeather: TvWeather =
    today.season === "holidays" || today.season === "snowday"
      ? "snow"
      : outside === "clear" || outside === "partly"
        ? night > 0.5
          ? "night"
          : night > 0.15
            ? "dusk"
            : outside === "partly"
              ? "partly"
              : "sun"
        : outside === "drizzle"
          ? "rain"
          : outside === "cloudy"
            ? "cloud"
            : outside;
  const live = props.weather?.kind && !debug.weather && debug.rainy === undefined ? props.weather : null;
  const weatherLine = [WEATHER_TEXT[tvWeather], live?.tempC != null ? tempText(live.tempC) : null, live?.place ?? null].filter(Boolean).join(" · ");
  talkData.current = { byId, news: (props.newsEnabled ? props.news : []).map((n) => n.title), festival };

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
        const family = familyLine(t, visible, named);
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
              {mood === "idle" && activity ? ` · ${relabel(named, activity)}` : ""} · {when}
              {when === "just now" ? "" : " ago"}
            </div>
            {family ? <div className="chq-tip-hint">{family}</div> : null}
          </>
        );
      }
      case "helper": {
        const t = byId.get(hover.id);
        if (!t) return null;
        const n = subagentsOf(t);
        return (
          <>
            <div className="chq-tip-title">
              {relabel(named, "Subagent helping")} {t.displayTitle}
            </div>
            <div className="chq-tip-meta">
              <span className="chq-dot" style={{ background: `hsl(${t.projectHue} 58% 60%)` }} />
              {n} {n === 1 ? "subagent" : "subagents"} at work · open the thread
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
            <div className="chq-tip-hint chq-tip-sub">{relabel(named, officeEvent ? `${officeEvent.title} in progress` : "Click for an office event")}</div>
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
        return <div className="chq-tip-hint">{named.labels?.npc?.dog ?? relabel(named, "Biscuit, the office dog · pet")}</div>;
      case "egg": {
        const left = world.eggsLeft();
        return <div className="chq-tip-hint">An Easter egg! {left === 1 ? "The last one" : `${left} hidden around the office`}</div>;
      }
      case "npc":
        return (
          <div className="chq-tip-hint">
            {theme.labels?.npc?.[hover.who]
              ? theme.labels.npc[hover.who]
              : hover.who === "guard"
              ? "Night guard on their rounds"
              : hover.who === "janitor"
                ? "Cleaning crew · mind the wet floor"
                : hover.who === "technician"
                  ? "The technician · fixing things around the office"
                  : hover.who === "delivery"
                    ? "Lunch delivery for the team"
                    : "A visiting kid · bring your kids to work day"}
          </div>
        );
      case "poke":
        return <div className="chq-tip-hint">{relabel(named, theme.labels?.poke?.[hover.poke] ?? pokeTip(hover.poke, waiting, counts))}</div>;
      case "status":
        return (
          <div className="chq-tip-hint">
            {counts["needs-you"].length + counts.error.length} waiting on you · {counts.done.length} done · {counts.working.length + counts.planning.length} busy
          </div>
        );
      case "cat":
        return <div className="chq-tip-hint">{named.labels?.npc?.cat ?? relabel(named, "Pixel, the office cat · pet")}</div>;
      case "tv":
        return <div className="chq-tip-hint">Change the channel</div>;
      case "speaker":
        return <div className="chq-tip-hint">Sound {prefs.on ? `${Math.round(prefs.volume * 100)}%` : "off"} · settings</div>;
      case "pinboard":
        return <div className="chq-tip-hint">Provider usage · refresh</div>;
      case "window":
        return (
          <>
            <div className="chq-tip-hint">{weatherLine}</div>
            <div className="chq-tip-hint chq-tip-sub">{relabel(named, "Open the window")}</div>
          </>
        );
      case "roomba":
        return <div className="chq-tip-hint">{named.labels?.npc?.roomba ?? relabel(named, "The roomba · send it off (or home)")}</div>;
      case "lights":
        return <div className="chq-tip-hint">{relabel(named, "String lights · make them twinkle")}</div>;
      case "scenery":
        return <div className="chq-tip-hint">{hover.hover}</div>;
    }
  }, [hover, byId, visible, world, prefs, overflow, waiting, now, counts, officeEvent, weatherLine, theme]);

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
                special={officeEvent ? { tag: "TODAY", text: relabel(named, officeEvent.tv) } : null}
                now={now}
                weather={tvWeather}
                weatherLine={weatherLine}
                labels={theme.labels}
                festival={festival}
                channel={channel}
                tick={tvTick}
                events={events}
                counts={counts}
                news={props.newsEnabled ? props.news : []}
                newsSource={props.newsSource}
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
              {settingsOpen ? (
                <SettingsPanel
                  prefs={prefs}
                  scenery={theme}
                  onScenery={(id) => {
                    setSceneryId(id);
                    play("chime");
                  }}
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
                  onClose={() => setSettingsOpen(false)}
                />
              ) : null}
              {legendOpen ? (
                <LegendNotes
                  theme={named}
                  style={{ left: layout.wall.legendNote.x * scale, top: (layout.wall.legendNote.y + layout.wall.legendNote.h + 4) * scale }}
                  onClose={() => setLegendOpen(false)}
                />
              ) : null}
            </>
          ) : null}
          <NameTags tags={tags} width={W} height={H} onOpen={props.onOpenThread} />
          <Speech bubbles={speech} scale={scale} width={W} />
          {layout ? (
            <button
              type="button"
              className={`chq-labels-btn${labelsOn ? " is-on" : ""}`}
              aria-pressed={labelsOn}
              title={labelsOn ? "Hide the name tags" : "Show a name tag over everyone"}
              onClick={() => {
                sound.unlock();
                play("click");
                setLabelsOn((on) => !on);
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
                <path d="M1.5 2.5v5l7 7 6-6-7-7h-5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <circle cx="5" cy="6" r="1.3" fill="currentColor" />
              </svg>
              <span>Names</span>
            </button>
          ) : null}
          {layout ? (
            <button
              type="button"
              className={`chq-gear-btn${settingsOpen ? " is-on" : ""}`}
              aria-expanded={settingsOpen}
              aria-label="Settings"
              title="Settings: sound, scenery, buddy"
              onClick={() => {
                sound.unlock();
                play("click");
                setSettingsOpen((o) => !o);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
                <path
                  d="M6.6 1h2.8l.4 1.9 1.3.6 1.7-1 2 2-1 1.7.5 1.3 1.9.4v2.8l-1.9.4-.5 1.3 1 1.7-2 2-1.7-1-1.3.5-.4 1.9H6.6l-.4-1.9-1.3-.5-1.7 1-2-2 1-1.7-.5-1.3L0 9.4V6.6l1.9-.4.5-1.3-1-1.7 2-2 1.7 1 1.3-.6z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          ) : null}
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

// -------------------------------------------------------------- name tags

interface TagBox {
  id: string;
  /** Glyph in the chip, and the chip's color class. */
  icon: string;
  tone: string;
  unread: boolean;
  /** Finished and not opened since: a warm accent, like the glow. */
  unopened: boolean;
  title: string;
  label: string;
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

const MOOD_ICON: Partial<Record<Mood, string>> = { working: "▸", planning: "✎", idle: "~" };

/**
 * Lay the name tags out above their heads so none overlap: each tag tries
 * straight above, then nudged sideways, then a tier higher. Ones waiting
 * on you come first and get the best places.
 */
function placeTags(anchors: LabelAnchor[], byId: Map<string, OfficeThread>, scale: number, sceneW: number): TagBox[] {
  const placed: TagBox[] = [];
  const hits = (a: { left: number; top: number; w: number; h: number }) =>
    placed.some((b) => a.left < b.left + b.w + TAG_GAP && b.left < a.left + a.w + TAG_GAP && a.top < b.top + b.h + TAG_GAP && b.top < a.top + a.h + TAG_GAP);
  const chars = anchors.length > 10 ? 16 : 24;
  for (const o of anchors) {
    const t = byId.get(o.id);
    if (!t) continue;
    const title = t.displayTitle;
    const w = Math.round(Math.min(156, 24 + Math.min(title.length, chars) * 6));
    const ax = o.x * scale;
    const ay = (o.y - 2) * scale;
    const unread = t.isUnread || o.kind === "done" || o.kind === "error";
    const icon = o.kind ? WAIT_ICON[o.kind] : (MOOD_ICON[o.mood] ?? "·");
    const tone = o.kind ?? o.mood;
    const label = `${o.kind ? WAIT_LABEL[o.kind] : moodLabel(o.mood)} · ${unread ? "unread" : "read"}${o.unopened ? ", new" : ""}: ${title}`;
    let done = false;
    for (let tier = 0; tier < 5 && !done; tier++) {
      for (const shift of [0, -0.6, 0.6, -1.15, 1.15]) {
        const left = Math.max(2, Math.min(sceneW - w - 2, ax - w / 2 + shift * w));
        const top = ay - TAG_H - 4 - tier * (TAG_H + TAG_GAP);
        if (top < 2) continue;
        const box = { left, top, w, h: TAG_H };
        if (hits(box)) continue;
        placed.push({ id: o.id, icon, tone, unread, unopened: o.unopened, title, label, ...box, ax, ay });
        done = true;
        break;
      }
    }
  }
  return placed;
}

/** Name tags over the agents, with a thin line to each head. Unread threads get a solid chip, read ones an outlined one. */
function NameTags(props: { tags: TagBox[]; width: number; height: number; onOpen: (id: string) => void }) {
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
          className={`chq-tag chq-tag-${t.tone} ${t.unread ? "is-unread" : "is-read"}${t.unopened ? " is-new" : ""}`}
          style={{ left: t.left, top: t.top, width: t.w }}
          onClick={() => props.onOpen(t.id)}
          title={t.label}
        >
          <i aria-hidden>{t.icon}</i>
          <span>{t.title}</span>
        </button>
      ))}
    </>
  );
}

/** Its subagents and family, for a thread's tooltip ("3 subagents helping · Child thread of …"). */
function familyLine(t: OfficeThread, visible: readonly OfficeThread[], theme: Theme): string | null {
  const parts: string[] = [];
  const n = subagentsOf(t);
  if (n > 0) parts.push(`${n} ${relabel(theme, n === 1 ? "subagent" : "subagents")} helping`);
  const parent = t.parentThreadId ? visible.find((p) => p.id === t.parentThreadId) : undefined;
  if (parent) parts.push(`Child thread of ${parent.displayTitle}`);
  const kids = visible.filter((c) => c.parentThreadId === t.id).length;
  if (kids > 0) parts.push(`${kids} child ${kids === 1 ? "thread" : "threads"}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Comic speech bubbles over whoever is talking. */
function Speech(props: { bubbles: SpeechBubble[]; scale: number; width: number }) {
  if (props.bubbles.length === 0) return null;
  return (
    <>
      {props.bubbles.map((b) => {
        const x = b.x * props.scale;
        const half = Math.min(95, 14 + b.text.length * 3);
        const left = Math.max(half + 4, Math.min(props.width - half - 4, x));
        return (
          <div key={b.id} className="chq-say" style={{ left, top: b.y * props.scale - 8 }} aria-live="polite">
            {b.text}
            <i style={{ left: `calc(50% + ${Math.round(x - left)}px)` }} />
          </div>
        );
      })}
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
  server: "Server room · the AI cluster · click to train a model",
  couch: "The couch · bounce on it",
  beanbag: "Beanbag · squish",
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
  { title: "Helpers in caps", text: "Its subagents lending a hand", color: "#d9f7c9", icon: "+" },
  { title: "Meeting room", text: "Planning", color: "#e8dcff", icon: "✎" },
  { title: "Waiting room · hand up", text: "Question or approval for you", color: "#cdeefd", icon: "?" },
  { title: "Meeting room · blueprint", text: "Plan ready for your review", color: "#e8dcff", icon: "▤" },
  { title: "Your office", text: "You're drafting a prompt for it", color: "#f1ece2", icon: "✎" },
  { title: "Waiting room · page ✓", text: "Done, not read yet", color: "#d9f7c9", icon: "✓" },
  { title: "Waiting room · rain cloud", text: "Hit an error", color: "#ffd6e5", icon: "☁" },
  { title: "Desk & chair", text: "Desk = model, chair = provider", color: "#ffe9c7", icon: "◧" },
  { title: "Name tags", text: "Solid = unread, outlined = read", color: "#fff3a3", icon: "▸" },
  { title: "A soft glow", text: "Warm: finished, not opened yet · cool: off to work", color: "#ffe9c7", icon: "✧" },
  { title: "Shirt badge", text: "What the thread is about", color: "#d9f7c9", icon: "★" },
  { title: "Matching lanyards", text: "A thread and its child threads", color: "#e8dcff", icon: "∪" },
  { title: "Kitchen · cooler", text: "Idle under 20 min", color: "#ffe9c7", icon: "☕" },
  { title: "Lounge", text: "Idle a while", color: "#fff3a3", icon: "♪" },
  { title: "Beanbag", text: "Idle 8 hours+", color: "#cdeefd", icon: "z" },
];

function LegendNotes(props: { style: CSSProperties; theme: Theme; onClose: () => void }) {
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
          <b>{relabel(props.theme, n.title)}</b>
          <span>{relabel(props.theme, n.text)}</span>
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

type Channel = "hq" | "office" | "tech" | "inbox";

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

export type TvWeather = "sun" | "partly" | "dusk" | "cloud" | "fog" | "rain" | "snow" | "storm" | "night";

const WEATHER_ICON: Record<TvWeather, string> = { sun: "☀️", partly: "🌤️", dusk: "⛅", cloud: "☁️", fog: "🌫️", rain: "🌧️", snow: "❄️", storm: "⛈️", night: "🌙" };
const WEATHER_TEXT: Record<TvWeather, string> = {
  sun: "Sunny",
  partly: "Partly cloudy",
  dusk: "Fair",
  cloud: "Cloudy",
  fog: "Foggy",
  rain: "Rainy",
  snow: "Snow",
  storm: "Thunderstorms",
  night: "Clear night",
};

function Tv(props: {
  style: CSSProperties;
  special: { tag: string; text: string } | null;
  channel: number;
  tick: number;
  events: OfficeEvent[];
  counts: Record<Mood, OfficeThread[]>;
  news: Story[];
  newsSource: string;
  inbox: OfficeProps["inbox"];
  now: Date;
  weather: TvWeather;
  /** "Rainy · 14°C · Basel" */
  weatherLine: string;
  labels?: ThemeLabels;
  festival: string | null;
  onNext: () => void;
  onOpenUrl: (url: string) => void;
  onOpenThread: (id: string) => void;
}) {
  const channels: Channel[] = ["hq", "office"];
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
  const clock = props.now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const top = (logo: string, tone: string, right: ReactNode, showClock = true) => (
    <div className="chq-tv-top">
      <span className={`chq-tv-logo ${tone}`}>{logo}</span>
      <span className="chq-tv-clock">{showClock ? clock : ""}</span>
      {right}
    </div>
  );

  let body: ReactNode;
  if (ch === "hq") {
    const recent = props.events.filter((e) => Date.now() - e.at < 6 * 3_600_000);
    const c = props.counts;
    const special = props.special && item % 2 === 0 ? props.special : null;
    const e = special ? undefined : recent[item % Math.max(1, recent.length)];
    const headline = special ?? (e ? eventText(e) : { tag: "LIVE", text: c.working.length ? "Agents hard at work. Coffee machine at full capacity." : "All quiet at HQ. Perfect time for a new idea." });
    const need = c["needs-you"].length + c.error.length;
    const stats: [number, string, string][] = [
      [need, "need you", "need"],
      [c.working.length + c.planning.length, "at work", "work"],
      [c.done.length, "done", "done"],
      [c.idle.length + c.drafting.length, "on a break", "idle"],
    ];
    body = (
      <>
        {top(props.labels?.tvNews ?? "HQ NEWS", "", <span className="chq-tv-live">● LIVE</span>)}
        <div className="chq-tv-body">
          <button
            type="button"
            className="chq-tv-card"
            onClick={(ev) => {
              ev.stopPropagation();
              if (e && e.kind !== "left") props.onOpenThread(e.threadId);
            }}
          >
            <span className={`chq-tv-tag tag-${special ? "today" : (e?.kind ?? "live")}`}>{headline.tag}</span>
            <span className="chq-tv-text">{headline.text}</span>
            {e ? (
              <span className="chq-tv-time">
                {ago(Date.now() - e.at)}
                {ago(Date.now() - e.at) === "just now" ? "" : " ago"}
              </span>
            ) : null}
          </button>
          <div className="chq-tv-stats">
            {stats.map(([n, label, tone]) => (
              <div key={label} className={`chq-tv-stat ${tone}${n === 0 ? " zero" : ""}`}>
                <b>{n}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="chq-tv-ticker">
          <i>HQ</i>
          <span>{recent.slice(0, 6).map((ev) => eventText(ev).text).join("  ·  ") || "Have a lovely day at the office"} ·&nbsp;</span>
        </div>
      </>
    );
  } else if (ch === "office") {
    const date = props.now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    body = (
      <>
        {top(props.labels?.tvWeather ?? "HQ WEATHER", "weather", null, false)}
        <div className="chq-tv-weather">
          <div className="chq-tv-sky">
            <span className="chq-tv-icon">{WEATHER_ICON[props.weather]}</span>
          </div>
          <div className="chq-tv-today">
            <b>{clock}</b>
            <span>{date}</span>
            <span className="chq-tv-forecast">
              {props.weatherLine}
              {props.festival ? ` · ${props.festival}` : ""}
            </span>
          </div>
        </div>
        <div className="chq-tv-ticker">
          <i>TODAY</i>
          <span>{props.special ? props.special.text : props.festival ? `It's ${props.festival} season at the office` : "Forecast: a good day to ship something"} ·&nbsp;</span>
        </div>
      </>
    );
  } else if (ch === "tech") {
    const s = props.news[(props.tick + props.channel) % props.news.length]!;
    const rank = props.news.indexOf(s) + 1;
    // Feeds have no points: their badge says how fresh the headline is.
    const age = s.at === null ? null : ago(Date.now() - s.at);
    const badge = s.score !== null ? `▲ ${s.score}` : age === null ? "NEW" : age === "just now" ? age : `${age} ago`;
    body = (
      <>
        {top(
          `TECH ▸ ${props.newsSource.toUpperCase()}`,
          "tech",
          // A mix names each headline's own source, as the inbox does.
          s.source === props.newsSource ? (
            <span className="chq-tv-live">#{rank.toString().padStart(2, "0")}</span>
          ) : (
            <span className="chq-tv-src">{s.source.toUpperCase()}</span>
          ),
        )}
        <button
          type="button"
          className="chq-tv-card big"
          onClick={(ev) => {
            ev.stopPropagation();
            props.onOpenUrl(s.url);
          }}
        >
          <span className="chq-tv-rank">{rank}</span>
          <span className="chq-tv-text">{s.title}</span>
        </button>
        <div className="chq-tv-ticker">
          <i>{badge}</i>
          <span className="static">{[s.comments === null ? "" : `${s.comments} comments`, s.site].filter(Boolean).join(" · ")}</span>
        </div>
      </>
    );
  } else {
    const items = props.inbox.items;
    const it = items[(props.tick + props.channel) % items.length]!;
    body = (
      <>
        {top("INBOX", "inbox", <span className={`chq-tv-src src-${it.source}`}>{SOURCE_LABEL[it.source] ?? it.source.toUpperCase()}</span>)}
        <button
          type="button"
          className="chq-tv-card big"
          onClick={(ev) => {
            ev.stopPropagation();
            props.onOpenUrl(it.url);
          }}
        >
          <span className="chq-tv-text">
            {it.unread ? <b className="chq-unread">● </b> : null}
            {it.title}
          </span>
        </button>
        <div className="chq-tv-ticker">
          <i>{it.author ?? "NEW"}</i>
          <span className="static">
            {[it.context].filter(Boolean).join(" · ")} · {ago(Date.now() - Date.parse(it.updatedAt))}
          </span>
        </div>
      </>
    );
  }

  return (
    <div className={`chq-tv chq-ch-${ch} chq-wx-${props.weather}`} style={props.style} onClick={props.onNext} role="group" aria-label="Office TV">
      <div className="chq-tv-bg" />
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

/** Top right, behind the gear (and the speakers): sound, scenery and the buddy. */
function SettingsPanel(props: {
  prefs: SoundPrefs;
  scenery: Theme;
  onScenery: (id: string) => void;
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
    <div className="chq-sound chq-settings" ref={ref} role="dialog" aria-label="Settings">
      <div className="chq-settings-head">
        <b>Settings</b>
        <button type="button" className="chq-sound-x" aria-label="Close" onClick={props.onClose}>
          ×
        </button>
      </div>
      <div className="chq-settings-label">Sound</div>
      <div className="chq-sound-row">
        <button
          type="button"
          className={`chq-sound-toggle${prefs.on ? " is-on" : ""}`}
          aria-pressed={prefs.on}
          onClick={() => props.onChange({ ...prefs, on: !prefs.on })}
        >
          {prefs.on ? "🔊 Sound on" : "🔇 Sound off"}
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
      <div className="chq-settings-label">Scenery</div>
      <div className="chq-scenery-list" role="radiogroup" aria-label="Scenery">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={t.id === props.scenery.id}
            className={`chq-scenery-item${t.id === props.scenery.id ? " is-current" : ""}`}
            onClick={() => props.onScenery(t.id)}
          >
            <i aria-hidden>{t.icon}</i>
            <b>{t.name}</b>
            <span>{t.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

