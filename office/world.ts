// The living office: characters walking the hallways between spots, the
// boss (you), the dog and the cat, cleaners and the night guard, office
// events, things to click, day and night. Pure canvas, no React.

import {
  ANCHOR_X,
  ANCHOR_Y,
  catSprite,
  charSprite,
  dogSprite,
  kidSprite,
  npcLook,
  KID_H,
  KID_W,
  OUTLINE,
  type CatPose,
  type CharPose,
  type DogPose,
  type Expression,
  type Look,
} from "./characters.ts";
import { buildProps, paintBackground, roombaSprite, speakerSprite, type Prop } from "./furniture.ts";
import type { Facing, Layout, Point, PokeKind, Rect, Spot } from "./layout.ts";
import { waitsForYou, type DeskStyle, type Mood, type WaitKind } from "./model.ts";
import { chairCanvas, deskCanvas, screenFor, type ChairTone } from "./desks.ts";
import { hash, mix, rng } from "./pixel.ts";
import { drawPixelText, pixelTextWidth } from "./pixelfont.ts";
import type { SoundName } from "./sound.ts";
import {
  drawAccessory,
  drawCarriedLantern,
  drawEgg,
  drawSeasonFloor,
  drawSeasonWall,
  drawTree,
  eggSpots,
  eventLights,
  paintSeasonSky,
  seasonItems,
  seasonLights,
} from "./seasons.ts";
import {
  besideSpot,
  drawEventFloor,
  eventDecor,
  EVENTS,
  pickEventKind,
  planEvent,
  route,
  step,
  type Drawable,
  type EventKind,
  type EventPlan,
  type Season,
  type Walker,
} from "./life.ts";

export interface WorldThread {
  id: string;
  title: string;
  mood: Mood;
  /** What they are waiting for you about, if anything. */
  waitKind: WaitKind | null;
  spotId: string;
  look: Look;
  isPinned: boolean;
  /** Topic badge on the shirt. */
  emblem: string | null;
  deskStyle: DeskStyle;
  chairTone: ChairTone;
  /** Works in a Vision Pro instead of on monitors. */
  visionPro: boolean;
}

/** What a thread was doing the last time you looked at the office. */
export interface SeenState {
  spotId: string;
  mood: Mood;
  waitKind: WaitKind | null;
}

/** Sound callback; `ambient` marks background life rather than a reaction to a click. */
export type Emit = (sound: SoundName, ambient?: boolean) => void;

export type NpcKind = "guard" | "janitor";

export type Hit =
  | { kind: "agent"; id: string }
  | { kind: "desk"; index: number }
  | { kind: "door" }
  | { kind: "legend" }
  | { kind: "status" }
  | { kind: "calendar" }
  | { kind: "clock" }
  | { kind: "tv" }
  | { kind: "speaker" }
  | { kind: "cat" }
  | { kind: "dog" }
  | { kind: "pinboard" }
  | { kind: "npc"; who: NpcKind | "kid" }
  | { kind: "poke"; id: string; poke: PokeKind }
  | { kind: "egg"; index: number };

interface Agent extends Walker {
  id: string;
  thread: WorldThread;
  spot: Spot | null;
  target: string | null;
  leaving: boolean;
  seed: number;
  moodSince: number;
  nextBlink: number;
  blinkUntil: number;
  /** Next time a hobby makes a sound (piano, darts). */
  nextHobby: number;
}

interface Npc extends Walker {
  id: string;
  kind: NpcKind;
  look: Look;
  stops: Point[][];
  /** Seconds left at the current stop. */
  pause: number;
  leaving: boolean;
}

interface Kid extends Walker {
  id: string;
  look: Look;
  tx: number;
  ty: number;
  roaming: boolean;
  pause: number;
  leaving: boolean;
}

type DogGoal = "bed" | "visit" | "greet" | "boss" | "event";

interface Dog extends Walker {
  state: "bed" | "walk" | "sit" | "follow";
  goal: DogGoal;
  until: number;
  lastBark: number;
  happyUntil: number;
}

interface Particle {
  kind: "zzz" | "heart" | "confetti" | "steam" | "drop" | "sparkle" | "food" | "bubble" | "note" | "paper" | "bag" | "leaf" | "snow" | "powder";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  /** Gravity, px/s². */
  g?: number;
  /** Dies when it rises above this. */
  minY?: number;
}

type CatState = "wander" | "sit" | "groom" | "loaf" | "visit" | "ride";

interface Cat {
  x: number;
  y: number;
  tx: number;
  ty: number;
  state: CatState;
  until: number;
  facing: "left" | "right";
  step: number;
  visiting: string | null;
  lastMeow: number;
}

interface Roomba {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  until: number;
  nextAt: number;
  returning: boolean;
}

interface Fish {
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  color: string;
  phase: number;
  depth: number;
}

interface Stroke {
  kind: "box" | "line" | "arrow" | "note" | "check" | "circle";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  born: number;
}

interface LiveEvent extends EventPlan {
  until: number;
  startedAt: number;
  nextAmbient: number;
  turn: number;
  throwAt: number;
  /** Next little visual flourish (powder, candy, hearts, a ball pass). */
  nextFx: number;
  /** The beach ball at a summer party: in the air from → to, caught by holder. */
  ball: { from: Point; to: Point; at: number; holder: string } | null;
  /** Who just found an Easter egg. */
  cheerId: string | null;
  cheerAt: number;
  /** Holi color hits per agent. */
  splash: Map<string, number>;
  /** When each walker joined the lantern parade. */
  orbit: Map<string, number>;
}

export interface Env {
  /** Local time as fractional hours, 0–24. */
  hour: number;
  date: Date;
  rainy: boolean;
  soundOn: boolean;
  /** Seconds since the last sound effect; drives speaker pulses. */
  soundPulse: number;
  hover: Hit | null;
  counts: { attention: number; done: number; working: number; planning: number };
  overflow: number;
  /** The season that decorates the office, if any. */
  season: Season | null;
  /** Every season or festival on today (for seasonal parties). */
  seasons: Season[];
}

const WALK_SPEED = 32; // px/s
const NPC_SPEED = 24;
const KID_SPEED = 40;

const inRect = (x: number, y: number, r: Rect) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

const SEATED_KINDS = new Set(["desk", "couch", "beanbag", "armchair", "meeting-seat", "review", "boss-guest", "stool", "bench"]);

export class World {
  private L: Layout | null = null;
  private bg: HTMLCanvasElement | null = null;
  private props: Prop[] = [];
  private agents = new Map<string, Agent>();
  private particles: Particle[] = [];
  private cat: Cat;
  private dog: Dog;
  private roomba: Roomba;
  private npcs: Npc[] = [];
  private kids: Kid[] = [];
  private fish: Fish[] = [];
  private strokes: Stroke[] = [];
  private nextStroke = 0;
  private wipeUntil = 0;
  private ballT = 0;
  private lastHitSide = 0;
  private time = 0;
  private hour = 12;
  private doorOpenUntil = 0;
  private emit: Emit;
  private stars: { x: number; y: number; p: number }[] = [];
  private dark: HTMLCanvasElement | null = null;
  private feedingUntil = 0;
  private rand = rng(0x5eed);
  private anim = new Map<string, number>();
  private darts: { x: number; y: number; color: string }[] = [];
  private lampOn = true;
  private bossWaveUntil = 0;
  private labeled = new Set<string>();
  private event: LiveEvent | null = null;
  private season: Season | null = null;
  private seasons: Season[] = [];
  /** Easter eggs hidden around the office, and which ones you found. */
  private eggs: Point[] = [];
  private eggsFound = new Set<number>();
  /** The big plant in your office, which becomes a tree for the holidays. */
  private bossPlantId: string | null = null;
  private nextEventAt = -1;
  private nextJanitor = -1;
  private nextGuard = -1;
  /** Bumped when an event starts or ends, so the view reassigns spots. */
  eventVersion = 0;

  private layoutKey = "";

  constructor(emit: Emit) {
    this.emit = emit;
    this.cat = { x: 0, y: 0, tx: 0, ty: 0, state: "loaf", until: 20, facing: "left", step: 0, visiting: null, lastMeow: -999 };
    this.dog = { x: 0, y: 0, path: [], approach: [], facing: "left", walked: 0, state: "bed", goal: "bed", until: 40, lastBark: -999, happyUntil: 0 };
    this.roomba = { active: false, x: 0, y: 0, vx: 0, vy: 0, until: 0, nextAt: 90 + this.rand() * 240, returning: false };
  }

  get layout(): Layout | null {
    return this.L;
  }

  /** Point sounds at a new player (the office keeps living across visits). */
  setEmit(emit: Emit): void {
    this.emit = emit;
  }

  /** What everyone is doing right now, to remember for next time. */
  seenStates(): Record<string, SeenState> {
    const out: Record<string, SeenState> = {};
    for (const a of this.agents.values()) {
      const spotId = a.target ?? a.spot?.id;
      if (a.leaving || !spotId) continue;
      out[a.id] = { spotId, mood: a.thread.mood, waitKind: a.thread.waitKind };
    }
    return out;
  }

  /** True until the first threads arrive. */
  get isEmpty(): boolean {
    return this.agents.size === 0;
  }

  /** Swap in a layout for a new panel size; everyone hops to their places. */
  setLayout(L: Layout, key = ""): void {
    // Same panel size and head count as before: keep everything as it is.
    if (key && key === this.layoutKey && this.L) return;
    this.layoutKey = key;
    const first = this.L === null;
    this.L = L;
    this.bg = paintBackground(L);
    this.props = buildProps(L);
    this.dark = document.createElement("canvas");
    this.dark.width = L.W;
    this.dark.height = L.H;
    const r = rng(42);
    this.stars = L.wall.windows.flatMap((w) =>
      Array.from({ length: Math.round((w.w * w.h) / 140) }, () => ({
        x: w.x + 6 + Math.floor(r() * (w.w - 12)),
        y: w.y + 4 + Math.floor(r() * (w.h - 18)),
        p: r() * 6,
      })),
    );
    const t = L.fishtank;
    this.fish = [
      { x: t.x + 8, y: t.y + 8, dir: 1, speed: 6, color: "#ff8a3d", phase: 0, depth: 0 },
      { x: t.x + 26, y: t.y + 12, dir: -1, speed: 4.5, color: "#ffd84a", phase: 2, depth: 1 },
      { x: t.x + 18, y: t.y + 16, dir: 1, speed: 5.2, color: "#7fd1ff", phase: 4, depth: 2 },
    ];
    const rug = this.catSpots()[1]!;
    if (first) {
      this.cat.x = this.cat.tx = rug.x;
      this.cat.y = this.cat.ty = rug.y;
    } else {
      this.cat.x = Math.min(this.cat.x, L.W - 10);
      this.cat.y = Math.min(this.cat.y, L.H - 4);
      this.cat.tx = this.cat.x;
      this.cat.ty = this.cat.y;
    }
    const dock = this.dock();
    this.roomba.active = false;
    this.roomba.x = dock.x;
    this.roomba.y = dock.y;
    // Visitors and events don't survive a resize.
    this.npcs = [];
    this.kids = [];
    if (this.event) {
      this.event = null;
      this.eventVersion++;
    }
    this.strokes = [];
    this.darts = [];
    const bp = L.plants.find((pl) => pl.sprite === "LARGE_PLANT" && inRect(pl.x + 8, pl.y + 40, L.boss.room));
    this.bossPlantId = bp ? `plant-${bp.x}-${bp.y}` : null;
    this.eggs = eggSpots(L);
    this.eggsFound.clear();
    this.dogToBed(true);
    for (const a of this.agents.values()) {
      const spot = (a.target && L.byId.get(a.target)) || (a.spot && L.byId.get(a.spot.id));
      if (spot) this.place(a, spot);
      else {
        a.path = [];
        a.spot = null;
        a.x = L.entrance.x;
        a.y = L.entrance.y;
        a.approach = [L.entrancePath[0]!, L.entrance];
      }
    }
  }

  private dock(): Point {
    const A = this.L!.eventArea;
    return { x: A.x + A.w - 12, y: A.y + A.h - 4 };
  }

  private catSpots(): Point[] {
    const L = this.L!;
    const w = L.wall.windows[0];
    const seg = w ? L.segments.find((s) => w.x >= s.x0 && w.x < s.x1) : undefined;
    const hall = L.net.halls[0]!;
    return [
      { x: (w?.x ?? 40) + 24, y: (seg?.depth ?? 64) + 30 }, // sunbeam
      { x: L.couch.x + L.couch.w + 12, y: L.couch.y + 20 }, // rug
      { x: L.waiting.x + 14, y: L.waiting.y + 20 },
      { x: L.kitchen.x + 20, y: L.kitchen.y + L.kitchen.h - 4 },
      { x: L.meeting.x + 30, y: L.meeting.y + L.meeting.h - 18 },
      { x: L.W * 0.3, y: hall + 4 },
      { x: L.W * 0.7, y: hall + 3 },
      { x: L.boss.room.x + 28, y: L.boss.room.y + L.boss.room.h - 14 },
      { x: L.eventArea.x + L.eventArea.w / 2, y: L.eventArea.y + L.eventArea.h / 2 },
    ];
  }

  // ------------------------------------------------------------------ spots & events

  private spotById(id: string | null | undefined): Spot | undefined {
    if (!id) return undefined;
    return this.L?.byId.get(id) ?? this.event?.spots.find((s) => s.id === id);
  }

  /** Layout spots plus any event spots, for assignment. */
  allSpots(): Spot[] {
    const L = this.L;
    if (!L) return [];
    return this.event ? [...L.spots, ...this.event.spots] : L.spots;
  }

  get eventActive(): boolean {
    return this.event !== null;
  }

  currentEvent(): { kind: EventKind; title: string; tv: string; left: number } | null {
    const e = this.event;
    if (!e) return null;
    return { kind: e.kind, title: EVENTS[e.kind].title, tv: EVENTS[e.kind].tv, left: Math.max(0, e.until - this.time) };
  }

  /** Start an office event now (a random one that suits the hour unless given). */
  startEvent(kind?: EventKind, ambient = false): EventKind | null {
    const L = this.L;
    if (!L) return null;
    if (this.event) return this.event.kind;
    const k = kind ?? pickEventKind(this.hour, L.games !== null, this.rand, this.seasons);
    const area = k === "darts" && L.games ? { x: L.games.x + 20, y: L.games.y + 24, w: Math.min(130, L.games.w - 50), h: 44 } : L.eventArea;
    const idle = [...this.agents.values()].filter((a) => !a.leaving && a.thread.mood === "idle").length;
    const plan = planEvent(k, area, L.net, Math.max(2, idle));
    const t = this.time;
    this.event = {
      ...plan,
      until: t + 150 + this.rand() * 90,
      startedAt: t,
      nextAmbient: t + 3,
      turn: 0,
      throwAt: t + 2,
      nextFx: t + 4,
      ball: null,
      cheerId: null,
      cheerAt: 0,
      splash: new Map(),
      orbit: new Map(),
    };
    this.eventVersion++;
    this.emit(EVENTS[k].start, ambient);
    const c = plan.center;
    this.burst(c.x, c.y - 20, "confetti", 18);
    if (k === "kids") this.spawnKids(Math.min(4, Math.max(2, Math.round(idle / 2))));
    if (this.roomba.active) this.roomba.returning = true;
    if (this.dog.state !== "follow") this.dogTo("event");
    return k;
  }

  private endEvent(): void {
    if (!this.event) return;
    this.event = null;
    this.eventVersion++;
    for (const k of this.kids) this.kidLeaves(k);
    if (this.dog.goal === "event") this.dogToBed();
  }

  // ------------------------------------------------------------------ sync

  /** Bring characters in line with the latest threads and assignments. */
  /**
   * Bring characters in line with the latest threads and assignments.
   * `instant` places everyone without walking (a fresh office); `lastSeen`
   * then says what each thread was doing when you last looked, so only the
   * ones that changed since get up and walk, and new ones come in the door.
   */
  sync(threads: readonly WorldThread[], instant: boolean, lastSeen?: ReadonlyMap<string, SeenState>): void {
    const L = this.L;
    if (!L) return;
    const seen = new Set<string>();
    const history = lastSeen !== undefined && lastSeen.size > 0;
    for (const t of threads) {
      seen.add(t.id);
      const spot = this.spotById(t.spotId) ?? null;
      let a = this.agents.get(t.id);
      if (!a) {
        a = {
          id: t.id,
          thread: t,
          x: L.entrance.x,
          y: L.entrance.y,
          path: [],
          approach: [L.entrancePath[0]!, L.entrance],
          spot: null,
          target: null,
          facing: "front",
          walked: 0,
          leaving: false,
          seed: hash(t.id),
          moodSince: this.time - (instant ? 30 : 0),
          nextBlink: this.time + 1 + (hash(t.id) % 5),
          blinkUntil: 0,
          nextHobby: this.time + 4 + (hash(t.id) % 7),
        };
        this.agents.set(t.id, a);
        const was = lastSeen?.get(t.id);
        const before = was ? this.spotById(was.spotId) : undefined;
        const same = was !== undefined && was.mood === t.mood && was.waitKind === t.waitKind;
        if (instant && spot && (!history || same)) this.place(a, spot);
        else if (instant && spot && before) {
          // Changed while you were away: from where they were to where they go now.
          this.place(a, before);
          if (before.id !== spot.id) this.walkTo(a, spot);
        } else if (spot) {
          this.emit("door", true);
          this.emit("arrive");
          this.doorOpenUntil = this.time + 1.6;
          this.burst(L.entrance.x, L.entrance.y - 16, "sparkle", 8);
          this.walkTo(a, spot);
          if (this.dog.state !== "follow" && this.dog.goal !== "event" && this.rand() < 0.35) this.dogTo("greet");
        }
        continue;
      }
      const prevMood = a.thread.mood;
      a.thread = t;
      if (prevMood !== t.mood) {
        a.moodSince = this.time;
        if (!instant) this.onMoodChange(a, prevMood, t.mood);
      }
      a.leaving = false;
      if (spot && a.spot?.id !== spot.id && a.target !== spot.id) {
        if (instant) this.place(a, spot);
        else this.walkTo(a, spot);
      }
    }
    for (const a of this.agents.values()) {
      if (seen.has(a.id) || a.leaving) continue;
      if (instant) {
        this.agents.delete(a.id);
        continue;
      }
      a.leaving = true;
      this.emit("leave");
      a.path = route(a, L.net, L.entrancePath);
      a.spot = null;
      a.target = null;
    }
  }

  private place(a: Agent, spot: Spot): void {
    a.x = spot.x;
    a.y = spot.y;
    a.spot = spot;
    a.target = null;
    a.path = [];
    a.approach = [...spot.path];
  }

  private walkTo(a: Agent, spot: Spot): void {
    a.path = route(a, this.L!.net, spot.path);
    a.spot = null;
    a.target = spot.id;
  }

  private onMoodChange(a: Agent, from: Mood, to: Mood): void {
    const head = { x: a.x, y: a.y - 30 };
    if (to === "done" || (to === "idle" && from === "working")) {
      this.emit("done");
      this.burst(head.x, head.y, "confetti", 16);
    } else if (to === "needs-you") {
      this.emit("needs-you");
      this.cat.state = "visit";
      this.cat.visiting = a.id;
      this.cat.until = this.time + 45;
    } else if (to === "error") {
      this.emit("error");
    } else if ((to === "working" || to === "planning") && from !== "working" && from !== "planning") {
      this.emit("start");
    }
  }

  /** Move one idle character to another free spot in the same kind of area. */
  shuffle(): void {
    const L = this.L;
    if (!L) return;
    const idle = [...this.agents.values()].filter(
      (a) => a.spot && a.thread.mood === "idle" && a.path.length === 0 && (a.spot.group === "break" || a.spot.group === "lounge"),
    );
    if (idle.length === 0) return;
    const a = idle[Math.floor(this.rand() * idle.length)]!;
    const taken = new Set(this.currentSpots().values());
    const options = L.spots.filter((s) => s.group === a.spot!.group && !taken.has(s.id));
    if (options.length === 0) return;
    const spot = options[Math.floor(this.rand() * options.length)]!;
    a.thread = { ...a.thread, spotId: spot.id };
    this.walkTo(a, spot);
  }

  currentSpots(): Map<string, string> {
    const out = new Map<string, string>();
    for (const a of this.agents.values()) {
      if (a.leaving) continue;
      const target = a.target ?? a.spot?.id;
      if (target) out.set(a.id, target);
    }
    return out;
  }

  /** Who sits in the waiting room, for the title tags above their heads. */
  waitingOccupants(): { id: string; x: number; y: number; kind: WaitKind }[] {
    const out: { id: string; x: number; y: number; kind: WaitKind }[] = [];
    for (const a of this.agents.values()) {
      if (this.settled(a) && (a.spot?.kind === "review" || a.spot?.kind === "present") && a.thread.waitKind) {
        out.push({ id: a.id, x: Math.round(a.x), y: Math.round(this.headTop(a)), kind: a.thread.waitKind });
      }
    }
    return out.sort((p, q) => p.y - q.y || p.x - q.x);
  }

  /** Threads whose title tag is showing: their in-scene bubble is skipped. */
  setLabeled(ids: Iterable<string>): void {
    this.labeled = new Set(ids);
  }

  // ------------------------------------------------------------------ input

  hitTest(x: number, y: number): Hit | null {
    const L = this.L;
    if (!L) return null;
    const list = [...this.agents.values()].filter((a) => !a.leaving).sort((p, q) => q.y - p.y);
    for (const a of list) {
      const top = this.headTop(a);
      if (x >= a.x - 8 && x <= a.x + 8 && y >= top - 2 && y <= this.drawY(a) + 1) return { kind: "agent", id: a.id };
    }
    for (const n of this.npcs) {
      if (Math.abs(x - n.x) <= 8 && y >= n.y - ANCHOR_Y + 2 && y <= n.y + 1) return { kind: "npc", who: n.kind };
    }
    for (const k of this.kids) {
      if (Math.abs(x - k.x) <= 6 && y >= k.y - KID_H && y <= k.y + 1) return { kind: "npc", who: "kid" };
    }
    if (Math.abs(x - this.dog.x) < 10 && y > this.dog.y - 15 && y < this.dog.y + 2) return { kind: "dog" };
    if (this.season === "easter") {
      for (const [i, p] of this.eggs.entries()) {
        if (!this.eggsFound.has(i) && Math.abs(x - p.x) <= 4 && y >= p.y - 8 && y <= p.y + 2) return { kind: "egg", index: i };
      }
    }
    if (Math.abs(x - this.cat.x) < 9 && y > this.cat.y - 13 && y < this.cat.y + 2) return { kind: "cat" };
    const w = L.wall;
    for (const s of L.speakers) if (inRect(x, y, s)) return { kind: "speaker" };
    if (inRect(x, y, L.tv)) return { kind: "tv" };
    if (inRect(x, y, { x: w.legendNote.x - 1, y: w.legendNote.y - 1, w: w.legendNote.w + 2, h: w.legendNote.h + 2 })) return { kind: "legend" };
    if (inRect(x, y, w.pinboard)) return { kind: "pinboard" };
    if (inRect(x, y, { x: w.door.x - 3, y: w.door.y - 15, w: w.door.w + 6, h: w.door.h + 15 })) return { kind: "door" };
    if (inRect(x, y, w.calendar)) return { kind: "calendar" };
    if (inRect(x, y, w.status)) return { kind: "status" };
    if (Math.hypot(x - w.clock.x, y - w.clock.y) <= w.clock.r + 2) return { kind: "clock" };
    for (let i = L.pokeables.length - 1; i >= 0; i--) {
      const p = L.pokeables[i]!;
      if (inRect(x, y, p.rect)) return { kind: "poke", id: p.id, poke: p.kind };
    }
    const occupied = new Set([...this.agents.values()].map((a) => a.spot?.id ?? a.target));
    for (const d of L.desks) {
      if (occupied.has(d.spot.id)) continue;
      const area = d.side === "north" ? { x: d.x + 20, y: d.y - 10, w: 22, h: 30 } : { x: d.x + 20, y: d.y + 12, w: 24, h: 32 };
      if (inRect(x, y, area)) return { kind: "desk", index: d.index };
    }
    return null;
  }

  /** Native point above an agent's head, for tooltips. */
  anchorOf(id: string): Point | null {
    const a = this.agents.get(id);
    if (!a) return null;
    return { x: a.x, y: this.headTop(a) - 4 };
  }

  activityOf(id: string): string | null {
    const a = this.agents.get(id);
    if (!a) return null;
    if (a.path.length > 0) return a.leaving ? "heading home" : "walking over";
    return a.spot?.activity ?? null;
  }

  petCat(): void {
    this.cat.state = "sit";
    this.cat.until = this.time + 6;
    this.hearts(this.cat.x, this.cat.y - 14, 4);
    this.emit(this.rand() < 0.5 ? "meow" : "purr", false);
  }

  petDog(): void {
    const d = this.dog;
    d.happyUntil = this.time + 4;
    if (d.state === "bed") d.until = this.time + 60;
    if (d.state === "walk" && d.path.length === 0) d.state = "sit";
    this.hearts(d.x, d.y - 16, 4);
    this.bark(false);
  }

  feedFish(): void {
    const t = this.L?.fishtank;
    if (!t) return;
    this.feedingUntil = this.time + 8;
    for (let i = 0; i < 8; i++) {
      this.particles.push({ kind: "food", x: t.x + 8 + this.rand() * (t.w - 16), y: t.y + 3, vx: 0, vy: 2 + this.rand() * 2, life: 0, max: 8, color: "#c98a4a" });
    }
    this.emit("bubble", false);
  }

  /** Something in the office was clicked: make it do its thing. */
  poke(id: string): void {
    const L = this.L;
    if (!L) return;
    const t = this.time;
    if (id === "clock") {
      this.anim.set("clock", t + 2.4);
      this.emit("cuckoo", false);
      return;
    }
    const p = L.pokeables.find((q) => q.id === id);
    if (!p) return;
    const r = p.rect;
    switch (p.kind) {
      case "coffee":
        this.anim.set("coffee", t + 3.5);
        this.emit("brew", false);
        break;
      case "kettle":
        this.anim.set("kettle", t + 3);
        this.emit("kettle", false);
        break;
      case "vending":
        this.anim.set("vending", t + 1.4);
        this.emit("vending", false);
        break;
      case "fridge":
        this.anim.set("fridge", t + 2.6);
        this.emit("fridge", false);
        break;
      case "microwave":
        this.anim.set("microwave", t + 4);
        this.emit("microwave", false);
        break;
      case "piano":
        this.notes(r.x + r.w / 2, r.y + 4, 4);
        this.emit("piano", false);
        break;
      case "dartboard":
        this.throwDart();
        this.emit("dart", false);
        break;
      case "printer":
        this.anim.set("printer", t + 2.4);
        this.emit("print", false);
        break;
      case "cooler":
        for (let i = 0; i < 6; i++) {
          this.particles.push({ kind: "bubble", x: r.x + 6 + this.rand() * 5, y: r.y + 12, vx: 0, vy: -5 - this.rand() * 4, life: 0, max: 2.4, color: "#e6f7ff", minY: r.y + 3 });
        }
        this.emit("glug", false);
        break;
      case "lamp":
        this.lampOn = !this.lampOn;
        this.emit("switch", false);
        break;
      case "plant":
        for (let i = 0; i < 7; i++) {
          this.particles.push({ kind: "drop", x: r.x + 3 + this.rand() * (r.w - 6), y: r.y - 6 - this.rand() * 6, vx: 0, vy: 26, life: 0, max: 0.5, color: "#7fc4ff" });
        }
        for (let i = 0; i < 3; i++) {
          this.particles.push({ kind: "leaf", x: r.x + r.w / 2, y: r.y + 4, vx: (this.rand() - 0.5) * 12, vy: -8, life: 0, max: 1.4, color: "#86e07f", g: 18 });
        }
        this.emit("water", false);
        break;
      case "bin": {
        const bx = r.x + r.w / 2;
        const by = r.y + 4;
        const sx = bx - 26;
        const sy = by - 18;
        const T = 0.8;
        this.particles.push({ kind: "paper", x: sx, y: sy, vx: (bx - sx) / T, vy: (by - sy) / T - 0.5 * 90 * T, life: 0, max: T, color: "#fbfaf5", g: 90 });
        this.emit("crumple", false);
        break;
      }
      case "arcade":
        this.anim.set("arcade", t + 3);
        this.emit("arcade", false);
        break;
      case "pingpong":
        this.anim.set("pingpong", t + 2);
        this.emit("pingpong", false);
        break;
      case "fishtank":
        this.feedFish();
        break;
      case "whiteboard":
        this.addStroke(true);
        this.emit("marker", false);
        break;
      case "bell":
        this.burst(r.x + 9, r.y + 2, "sparkle", 6);
        this.emit("chime", false);
        break;
      case "boss":
        this.bossWaveUntil = t + 2;
        this.emit("whistle", false);
        if (this.dog.state !== "follow") this.dogTo("boss");
        break;
      case "globe":
        this.anim.set("globe", t + 2.6);
        this.emit("spin", false);
        break;
      case "cornhole":
        this.emit("toss", false);
        break;
      case "server":
        this.anim.set("server", t + 3.5);
        this.emit("server", false);
        for (let i = 0; i < 10; i++) {
          this.particles.push({ kind: "sparkle", x: r.x + this.rand() * r.w, y: r.y + 4 + this.rand() * (r.h - 10), vx: 0, vy: -6, life: 0, max: 0.6 + this.rand() * 0.6, color: this.rand() < 0.5 ? "#7fd1ff" : "#c39bff" });
        }
        break;
      case "clock":
        break;
    }
  }

  // ------------------------------------------------------------------ update

  update(dt: number): void {
    const L = this.L;
    if (!L) return;
    this.time += dt;
    const t = this.time;
    for (const a of [...this.agents.values()]) {
      if (a.path.length > 0 && step(a, dt, WALK_SPEED)) {
        if (a.leaving) {
          this.agents.delete(a.id);
          this.doorOpenUntil = this.time + 1.2;
          this.emit("door", true);
          continue;
        }
        const spot = this.spotById(a.target);
        if (spot) {
          this.place(a, spot);
          this.onArrive(a, spot);
        }
      }
      if (t > a.nextBlink) {
        a.blinkUntil = t + 0.14;
        a.nextBlink = t + 2.5 + ((a.seed >> 3) % 40) / 10 + this.rand() * 2;
      }
      if (a.spot && a.path.length === 0) this.agentLife(a, dt);
      if (a.thread.mood === "error" && a.path.length === 0 && this.rand() < dt * 5) {
        this.particles.push({ kind: "drop", x: a.x - 5 + this.rand() * 10, y: this.headTop(a) - 7, vx: 0, vy: 22, life: 0, max: 0.45, color: "#7fb8e6" });
      }
    }

    for (const p of this.particles) {
      p.life += dt;
      if (p.kind === "confetti") p.vy += 40 * dt;
      if (p.g) p.vy += p.g * dt;
      if (p.kind === "food" && p.y > L.fishtank.y + L.fishtank.h - 4) p.vy = 0;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "zzz") p.vx = Math.sin(p.life * 3) * 4;
      if (p.kind === "steam") p.vx = Math.sin(p.life * 5 + p.x) * 2;
      if (p.kind === "note") p.vx = Math.sin(p.life * 4 + p.x) * 5;
      if (p.kind === "snow") p.vx = Math.sin(p.life * 2 + p.y * 0.1) * 3;
      if (p.kind === "powder") {
        p.vx *= 1 - dt * 2;
        p.vy *= 1 - dt * 2;
      }
      if (p.minY !== undefined && p.y < p.minY) p.life = p.max;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);

    this.updateCat(dt);
    this.updateDog(dt);
    this.updateRoomba(dt);
    this.updateFish(dt);
    this.updatePingPong(dt);
    this.updateWhiteboard();
    this.updateVisitors(dt);
    this.updateKids(dt);
    this.updateEvent(dt);
    this.updateMachines(dt);
  }

  private onArrive(a: Agent, spot: Spot): void {
    switch (spot.kind) {
      case "coffee":
        this.anim.set("coffee", this.time + 3.5);
        this.emit("brew", true);
        break;
      case "tea":
        this.anim.set("kettle", this.time + 3);
        this.emit("kettle", true);
        break;
      case "vending":
        this.anim.set("vending", this.time + 1.4);
        this.emit("vending", true);
        break;
      case "fridge":
        this.anim.set("fridge", this.time + 2.6);
        this.emit("fridge", true);
        break;
      case "cooler":
        this.emit("glug", true);
        break;
      default:
        break;
    }
    void a;
  }

  /** Little things people do once settled. */
  private agentLife(a: Agent, dt: number): void {
    const s = a.spot!;
    const t = this.time;
    if (s.kind === "event" && (this.event?.kind === "lanterns" || this.event?.kind === "maifest")) this.parade(a);
    if (s.pose === "nap" && this.rand() < dt * 0.5) {
      this.particles.push({ kind: "zzz", x: a.x + 5, y: a.y - 22, vx: 3, vy: -5, life: 0, max: 2.6, color: "#ffffff" });
    }
    if ((s.pose === "cup" || s.kind === "stool") && this.rand() < dt * 0.5) {
      const mx = a.facing === "left" ? a.x - 4 : a.x + 3;
      this.particles.push({ kind: "steam", x: mx, y: a.y - 13, vx: 0, vy: -4, life: 0, max: 1.4, color: "#ffffff" });
    }
    if (a.thread.mood !== "idle" || t < a.nextHobby) return;
    if (s.kind === "piano") {
      this.notes(a.x, a.y - 30, 2);
      this.emit("piano", true);
      a.nextHobby = t + 6 + this.rand() * 6;
    } else if (s.kind === "darts") {
      this.throwDart();
      this.emit("dart", true);
      a.nextHobby = t + 4 + this.rand() * 4;
    } else if (s.kind === "arcade") {
      if (this.rand() < 0.4) this.emit("arcade", true);
      a.nextHobby = t + 12 + this.rand() * 10;
    } else {
      a.nextHobby = t + 30;
    }
  }

  private updateMachines(dt: number): void {
    const L = this.L!;
    const t = this.time;
    const steamAt = (id: string, dx: number, dy: number, rate: number) => {
      const p = L.pokeables.find((q) => q.id === id);
      if (p && this.rand() < dt * rate) {
        this.particles.push({ kind: "steam", x: p.rect.x + dx + this.rand() * 2, y: p.rect.y + dy, vx: 0, vy: -5, life: 0, max: 1.4, color: "#ffffff" });
      }
    };
    if ((this.anim.get("coffee") ?? 0) > t) {
      steamAt("coffee", 8, 17, 7);
      steamAt("coffee", 23, 14, 3);
    } else steamAt("coffee", 7, 0, 0.7);
    if ((this.anim.get("kettle") ?? 0) > t) steamAt("kettle", 9, 2, 14);
    const island = L.props.find((p) => p.kind === "kitchen-island");
    if (island && this.rand() < dt * 0.5) {
      this.particles.push({ kind: "steam", x: island.x + 8 + this.rand() * 3, y: island.y, vx: 0, vy: -3, life: 0, max: 1.6, color: "#ffffff" });
    }
  }

  private updateWhiteboard(): void {
    const drawing = [...this.agents.values()].filter((a) => a.spot?.kind === "whiteboard" && a.path.length === 0);
    const t = this.time;
    if (this.wipeUntil > t) {
      if (this.strokes.length > 0 && t > this.nextStroke) {
        this.strokes.shift();
        this.nextStroke = t + 0.15;
      }
      return;
    }
    if (drawing.length === 0 || t < this.nextStroke) return;
    this.addStroke(false);
    this.nextStroke = t + 2.2 / drawing.length + this.rand() * 1.5;
    this.emit("marker", true);
  }

  private addStroke(byHand: boolean): void {
    const b = this.L!.whiteboard;
    const t = this.time;
    if (this.strokes.length >= 22) {
      this.wipeUntil = t + 5;
      return;
    }
    if (byHand && this.wipeUntil > t) return;
    const kinds: Stroke["kind"][] = ["box", "box", "arrow", "line", "note", "check", "circle", "line"];
    const colors = ["#3e8ed0", "#e5484d", "#30a46c", "#3a3046"];
    const kind = kinds[Math.floor(this.rand() * kinds.length)]!;
    const iw = b.w - 10;
    const ih = 30 - 10;
    this.strokes.push({
      kind,
      x: b.x + 5 + Math.floor(this.rand() * (iw - 12)),
      y: b.y + 5 + Math.floor(this.rand() * (ih - 8)),
      w: 6 + Math.floor(this.rand() * 10),
      h: 4 + Math.floor(this.rand() * 5),
      color: kind === "note" ? "#ffe066" : colors[Math.floor(this.rand() * colors.length)]!,
      born: t,
    });
  }

  private throwDart(): void {
    const p = this.L!.pokeables.find((q) => q.kind === "dartboard");
    if (!p) return;
    if (this.darts.length >= 5) this.darts = [];
    const a = this.rand() * Math.PI * 2;
    const d = Math.sqrt(this.rand()) * 6.5;
    const colors = ["#e5484d", "#3e8ed0", "#ffd84a", "#30a46c"];
    this.darts.push({ x: Math.round(p.rect.x + 10 + Math.cos(a) * d), y: Math.round(p.rect.y + 10 + Math.sin(a) * d), color: colors[this.darts.length % colors.length]! });
  }

  private updateCat(dt: number): void {
    const c = this.cat;
    const t = this.time;
    if (c.state === "ride") {
      if (!this.roomba.active) {
        c.state = "sit";
        c.until = t + 4;
      } else {
        c.x = this.roomba.x;
        c.y = this.roomba.y - 3;
        c.facing = this.roomba.vx < 0 ? "left" : "right";
        return;
      }
    }
    if (c.state === "visit") {
      const a = c.visiting ? this.agents.get(c.visiting) : undefined;
      if (!a || a.thread.mood !== "needs-you" || t > c.until) {
        c.state = "wander";
        c.visiting = null;
        this.pickCatTarget();
      } else {
        c.tx = a.x + 13;
        c.ty = Math.min(this.L!.H - 3, a.y + 1);
        if (Math.hypot(c.tx - c.x, c.ty - c.y) < 1.5) {
          if (t - c.lastMeow > 25) {
            c.lastMeow = t;
            this.emit("meow", true);
            this.particles.push({ kind: "heart", x: c.x, y: c.y - 14, vx: 0, vy: -8, life: 0, max: 1.4, color: "#ff6b8b" });
          }
          return;
        }
      }
    }
    if (c.state === "wander" || c.state === "visit") {
      const dx = c.tx - c.x;
      const dy = c.ty - c.y;
      const d = Math.hypot(dx, dy);
      const speed = c.state === "visit" ? 28 : 14;
      if (d < 1) {
        if (c.state === "wander") {
          const roll = this.rand();
          c.state = roll < 0.35 ? "sit" : roll < 0.55 ? "groom" : "loaf";
          c.until = t + (c.state === "loaf" ? 40 + this.rand() * 60 : 6 + this.rand() * 10);
        }
      } else {
        const s = Math.min(d, speed * dt);
        c.x += (dx / d) * s;
        c.y += (dy / d) * s;
        c.step += s;
        if (Math.abs(dx) > 0.3) c.facing = dx < 0 ? "left" : "right";
      }
      return;
    }
    if (t > c.until) {
      const r = this.roomba;
      if (r.active && !r.returning && Math.hypot(r.x - c.x, r.y - c.y) < 70 && this.rand() < 0.6) {
        c.state = "ride";
        return;
      }
      c.state = "wander";
      this.pickCatTarget();
    }
  }

  private pickCatTarget(): void {
    const spots = this.catSpots();
    const s = spots[Math.floor(this.rand() * spots.length)]!;
    this.cat.tx = s.x + (this.rand() - 0.5) * 16;
    this.cat.ty = s.y + (this.rand() - 0.5) * 8;
  }

  // ------------------------------------------------------------------ the dog

  private dogBedPath(): Point[] {
    const L = this.L!;
    const g = L.byId.get("boss-guest-0")!.path;
    const bed = L.boss.dogBed;
    const lane = g[2]!.y;
    return [g[0]!, g[1]!, g[2]!, { x: bed.x, y: lane }, { x: bed.x, y: bed.y }];
  }

  private dogToBed(instant = false): void {
    const d = this.dog;
    const L = this.L!;
    const path = this.dogBedPath();
    d.goal = "bed";
    if (instant) {
      d.x = L.boss.dogBed.x;
      d.y = L.boss.dogBed.y;
      d.path = [];
      d.approach = [...path];
      d.state = "bed";
      d.until = this.time + 40 + this.rand() * 60;
      return;
    }
    d.state = "walk";
    d.path = route(d, L.net, path);
  }

  private dogTo(goal: Exclude<DogGoal, "bed">): void {
    const L = this.L!;
    const d = this.dog;
    let target: Point[] | null = null;
    if (goal === "greet") {
      target = [L.entrancePath[0]!, { x: L.entrance.x + 14, y: L.entrance.y + 10 }];
    } else if (goal === "boss") {
      const g = L.byId.get("boss-guest-0")!.path;
      const desk = L.boss.desk;
      target = [g[0]!, g[1]!, g[2]!, { x: desk.x - 4, y: g[2]!.y }, { x: desk.x - 4, y: desk.y + 34 }];
    } else if (goal === "event" && this.event) {
      const s0 = this.event.spots[0];
      if (s0) target = [...s0.path.slice(0, -1), { x: this.event.center.x + 22, y: this.event.center.y + 12 }];
    } else {
      // Visit someone hanging out, or beg in the kitchen.
      const idle = [...this.agents.values()].filter((a) => this.settled(a) && a.thread.mood === "idle" && a.spot && a.spot.group !== "event");
      const pick = idle.length > 0 && this.rand() < 0.7 ? idle[Math.floor(this.rand() * idle.length)]!.spot! : L.byId.get(this.rand() < 0.5 ? "fridge" : "couch-1");
      if (pick) target = besideSpot(pick, 12);
    }
    if (!target) return;
    d.goal = goal;
    d.state = "walk";
    d.path = route(d, L.net, target);
  }

  private bark(ambient = true): void {
    const d = this.dog;
    if (this.time - d.lastBark < 1) return;
    d.lastBark = this.time;
    this.emit("bark", ambient);
  }

  private updateDog(dt: number): void {
    const d = this.dog;
    const L = this.L!;
    const t = this.time;
    const guard = this.npcs.find((n) => n.kind === "guard" && !n.leaving);
    if (d.state === "follow") {
      if (!guard) {
        d.approach = [];
        this.dogToBed();
        return;
      }
      const side = guard.facing === "left" ? 14 : -14;
      const tx = guard.x + side;
      const ty = guard.y + 2;
      const dx = tx - d.x;
      const dy = ty - d.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const s = Math.min(dist, (dist > 30 ? 46 : 28) * dt);
        d.x += (dx / dist) * s;
        d.y += (dy / dist) * s;
        d.walked += s;
        if (Math.abs(dx) > 0.3) d.facing = dx < 0 ? "left" : "right";
      }
      return;
    }
    if (d.path.length > 0) {
      const fast = d.goal === "greet" || d.goal === "boss" || d.goal === "event";
      if (step(d, dt, fast ? 44 : 28)) {
        d.state = d.goal === "bed" ? "bed" : "sit";
        d.until = t + (d.goal === "bed" ? 90 + this.rand() * 150 : d.goal === "boss" ? 16 : d.goal === "event" ? 1e9 : 10 + this.rand() * 14);
        if (d.goal === "greet" || d.goal === "boss") {
          this.bark();
          d.happyUntil = t + 3;
        }
        if (d.goal === "bed") d.facing = "left";
      }
      return;
    }
    if (d.state === "bed" && this.rand() < dt * 0.25) {
      this.particles.push({ kind: "zzz", x: d.x + 4, y: d.y - 12, vx: 2, vy: -4, life: 0, max: 2, color: "#ffffff" });
    }
    if (d.goal === "event" && !this.event) {
      this.dogToBed();
      return;
    }
    if (t > d.until) {
      if (this.event && d.goal !== "event") this.dogTo("event");
      else if (d.state === "sit" && this.rand() < 0.45) this.dogToBed();
      else this.dogTo("visit");
    }
    void L;
  }

  // ------------------------------------------------------------------ visitors

  private updateVisitors(dt: number): void {
    const L = this.L!;
    const t = this.time;
    const h = this.hour;
    const cleaningHours = (h >= 5 && h < 8.5) || (h >= 18 && h < 23);
    const night = h >= 21 || h < 6;
    if (this.nextJanitor < 0) this.nextJanitor = t + (cleaningHours ? 30 + this.rand() * 60 : 900 + this.rand() * 900);
    if (this.nextGuard < 0) this.nextGuard = t + (night ? 90 + this.rand() * 120 : 600 + this.rand() * 600);
    if (t > this.nextJanitor && !this.npcs.some((n) => n.kind === "janitor")) {
      this.spawnNpc("janitor");
      this.nextJanitor = t + (cleaningHours ? 240 + this.rand() * 240 : 1500 + this.rand() * 1200);
    }
    if (t > this.nextGuard && !this.npcs.some((n) => n.kind === "guard")) {
      this.spawnNpc("guard");
      this.nextGuard = t + (night ? 420 + this.rand() * 480 : 900 + this.rand() * 900);
    }
    for (const n of [...this.npcs]) {
      if (n.path.length > 0) {
        if (step(n, dt, NPC_SPEED)) {
          if (n.leaving) {
            this.npcs = this.npcs.filter((m) => m !== n);
            this.doorOpenUntil = t + 1.2;
            this.emit("door", true);
            continue;
          }
          if (n.kind === "janitor") n.pause = 5 + this.rand() * 4;
          else {
            n.pause = this.rand() < 0.5 ? 3 : 0.4;
            if (n.pause > 1) this.emit("walkie", true);
          }
        }
        continue;
      }
      if (n.pause > 0) {
        n.pause -= dt;
        if (n.kind === "janitor") {
          if (this.rand() < dt * 3) this.particles.push({ kind: "sparkle", x: n.x + 6 + this.rand() * 8, y: n.y - 2 - this.rand() * 4, vx: 0, vy: -3, life: 0, max: 0.6, color: "#d9f4ff" });
          if (this.rand() < dt * 0.06) this.emit("whistle", true);
        } else {
          n.facing = Math.floor(n.pause * 1.2) % 2 ? "left" : "right";
        }
        continue;
      }
      const next = n.stops.shift();
      if (next) n.path = route(n, L.net, next);
      else {
        n.leaving = true;
        n.path = route(n, L.net, L.entrancePath);
      }
    }
  }

  private spawnNpc(kind: NpcKind): void {
    const L = this.L!;
    const n: Npc = {
      id: `${kind}-${Math.floor(this.time)}`,
      kind,
      look: npcLook(kind),
      x: L.entrance.x,
      y: L.entrance.y,
      path: [],
      approach: [L.entrancePath[0]!, L.entrance],
      facing: "front",
      walked: 0,
      stops: [],
      pause: 0,
      leaving: false,
    };
    if (kind === "janitor") {
      const pool = L.spots.filter((s) => s.group !== "desk" || this.rand() < 0.15);
      const picks = new Set<Spot>();
      while (picks.size < Math.min(4, pool.length)) picks.add(pool[Math.floor(this.rand() * pool.length)]!);
      n.stops = [...picks].map((s) => besideSpot(s, 8));
    } else {
      n.stops = L.patrol.map((p) => [p]);
      const coffee = L.byId.get("coffee");
      if (coffee && this.rand() < 0.5) n.stops.splice(1, 0, besideSpot(coffee, 0));
      if (this.dog.state !== "walk" && this.rand() < 0.65) {
        this.dog.state = "follow";
        this.dog.path = [];
        this.dog.approach = [];
        this.dog.goal = "visit";
        this.bark();
      }
    }
    n.path = route(n, L.net, n.stops.shift()!);
    this.npcs.push(n);
    this.doorOpenUntil = this.time + 1.6;
    this.emit("door", true);
  }

  private spawnKids(count: number): void {
    const L = this.L!;
    const ev = this.event;
    if (!ev) return;
    const parents = [...this.agents.values()];
    const shirts = ["#ff6b8b", "#ffd84a", "#5ad1ff", "#86e07f", "#c39bff", "#ff9a3d"];
    for (let i = 0; i < count; i++) {
      const p = parents[Math.floor(this.rand() * Math.max(1, parents.length))];
      const base = p?.thread.look ?? npcLook("janitor");
      const look: Look = { ...base, key: `${base.key}-kid${i}`, accent: shirts[i % shirts.length]! };
      const k: Kid = {
        id: `kid-${i}-${Math.floor(this.time)}`,
        look,
        x: L.entrance.x,
        y: L.entrance.y,
        path: [],
        approach: [L.entrancePath[0]!, L.entrance],
        facing: "front",
        walked: 0,
        tx: 0,
        ty: 0,
        roaming: false,
        pause: i * 0.7,
        leaving: false,
      };
      const s0 = ev.spots[0]!;
      const tx = ev.area.x + 10 + this.rand() * (ev.area.w - 20);
      const ty = ev.area.y + 14 + this.rand() * Math.max(4, ev.area.h - 20);
      k.path = route(k, L.net, [...s0.path.slice(0, -1), { x: Math.round(tx), y: Math.round(ty) }]);
      this.kids.push(k);
    }
    this.doorOpenUntil = this.time + 2;
  }

  private kidLeaves(k: Kid): void {
    k.leaving = true;
    k.roaming = false;
    k.path = route(k, this.L!.net, this.L!.entrancePath);
  }

  private updateKids(dt: number): void {
    const ev = this.event;
    for (const k of [...this.kids]) {
      if (k.pause > 0 && !k.roaming && k.path.length > 0 && !k.leaving) {
        k.pause -= dt;
        continue;
      }
      if (k.path.length > 0) {
        if (step(k, dt, KID_SPEED) && k.leaving) {
          this.kids = this.kids.filter((m) => m !== k);
          this.doorOpenUntil = this.time + 1;
        } else if (k.path.length === 0 && ev) {
          k.roaming = true;
          k.tx = k.x;
          k.ty = k.y;
          // Walk back out through the event's lane later.
          const s0 = ev.spots[0]!;
          k.approach = [...s0.path.slice(0, -1).slice(0, 2), { x: Math.round(k.x), y: s0.path[1]!.y }];
        }
        continue;
      }
      if (!k.roaming || !ev) continue;
      if (k.pause > 0) {
        k.pause -= dt;
        continue;
      }
      const dx = k.tx - k.x;
      const dy = k.ty - k.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) {
        k.pause = 0.4 + this.rand() * 1.6;
        k.tx = ev.area.x + 8 + this.rand() * (ev.area.w - 16);
        k.ty = ev.area.y + 16 + this.rand() * Math.max(4, ev.area.h - 20);
        if (this.rand() < 0.15) this.particles.push({ kind: "heart", x: k.x, y: k.y - KID_H - 2, vx: 0, vy: -8, life: 0, max: 1.2, color: "#ffd84a" });
      } else {
        const s = Math.min(d, KID_SPEED * dt);
        k.x += (dx / d) * s;
        k.y += (dy / d) * s;
        k.walked += s;
        k.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : "front";
      }
    }
  }

  // ------------------------------------------------------------------ events

  private updateEvent(dt: number): void {
    const t = this.time;
    const L = this.L!;
    if (this.nextEventAt < 0) this.nextEventAt = t + 600 + this.rand() * 900;
    const ev = this.event;
    if (!ev) {
      if (t > this.nextEventAt) {
        const idle = [...this.agents.values()].filter((a) => this.settled(a) && a.thread.mood === "idle").length;
        if (idle >= 2) this.startEvent(undefined, true);
        this.nextEventAt = t + (idle >= 2 ? 900 + this.rand() * 1200 : 120);
      }
      return;
    }
    if (t > ev.until) {
      this.endEvent();
      return;
    }
    const info = EVENTS[ev.kind];
    if (info.ambient && t > ev.nextAmbient) {
      const [sound, every] = info.ambient;
      ev.nextAmbient = t + every * (0.7 + this.rand() * 0.6);
      if (ev.kind === "cornhole") this.cornholeThrow(ev);
      else if (ev.kind === "easter") this.findEgg(ev);
      else if (ev.kind === "darts") {
        this.throwDart();
        this.emit("dart", true);
      } else {
        this.emit(sound, true);
        if (ev.kind === "karaoke") {
          const singer = this.atEventSpot(0);
          if (singer) this.notes(singer.x, singer.y - 30, 3);
        }
      }
    }
    if ((ev.kind === "party" || ev.kind === "birthday") && this.rand() < 0.02) {
      this.burst(ev.center.x + (this.rand() - 0.5) * 40, ev.center.y - 26, "confetti", 6);
    }
    this.festivalFx(ev, dt);
    if (ev.kind === "holiday" && this.rand() < 0.25) {
      // A little indoor snow around the tree.
      this.particles.push({ kind: "snow", x: ev.area.x + this.rand() * ev.area.w, y: ev.area.y - 4, vx: 0, vy: 7 + this.rand() * 4, life: 0, max: Math.max(3, ev.area.h / 9), color: "#ffffff" });
    }
    void L;
  }

  /** Lantern walkers circle the St. Martin's fire. */
  private parade(a: Agent): void {
    const ev = this.event!;
    const i = Number(a.spot!.id.slice(6));
    let since = ev.orbit.get(a.id);
    if (since === undefined) {
      since = this.time;
      ev.orbit.set(a.id, since);
    }
    // A slow lantern walk; a lively dance round the maypole.
    const speed = ev.kind === "maifest" ? 0.42 : 0.16;
    const ang = (i / ev.spots.length) * Math.PI * 2 + 0.5 + speed * (this.time - since);
    const nx = ev.center.x + Math.cos(ang) * ev.rx;
    const ny = ev.center.y + Math.sin(ang) * ev.ry;
    const dx = nx - a.x;
    a.walked += Math.hypot(dx, ny - a.y);
    if (Math.abs(dx) > 0.02) a.facing = dx > 0 ? "right" : "left";
    a.x = nx;
    a.y = ny;
  }

  /** Agents settled at the event. */
  private eventPeople(): Agent[] {
    return [...this.agents.values()].filter((a) => this.settled(a) && a.spot!.kind === "event");
  }

  private findEgg(ev: LiveEvent): void {
    if (ev.found >= ev.items.length) return;
    const egg = ev.items[ev.found]!;
    ev.found++;
    this.burst(egg.x, egg.y - 4, "sparkle", 5);
    this.emit("chime", true);
    let best: Agent | undefined;
    for (const a of this.eventPeople()) if (!best || Math.hypot(a.x - egg.x, a.y - egg.y) < Math.hypot(best.x - egg.x, best.y - egg.y)) best = a;
    if (best) {
      ev.cheerId = best.id;
      ev.cheerAt = this.time;
    }
    if (ev.found === ev.items.length) this.burst(ev.center.x, ev.center.y - 20, "confetti", 16);
  }

  /** Find one of the Easter eggs hidden around the office. */
  findOfficeEgg(index: number): number {
    const p = this.eggs[index];
    if (!p || this.eggsFound.has(index)) return this.eggsLeft();
    this.eggsFound.add(index);
    this.burst(p.x, p.y - 4, "sparkle", 7);
    const left = this.eggsLeft();
    this.emit(left === 0 ? "cheer" : "chime", false);
    if (left === 0) this.burst(p.x, p.y - 10, "confetti", 18);
    return left;
  }

  eggsLeft(): number {
    return this.eggs.length - this.eggsFound.size;
  }

  private festivalFx(ev: LiveEvent, dt: number): void {
    const t = this.time;
    const people = this.eventPeople();
    const pick = () => people[Math.floor(this.rand() * people.length)];
    const c = ev.center;
    switch (ev.kind) {
      case "lanterns":
        if (this.rand() < dt * 5) {
          this.particles.push({ kind: "sparkle", x: c.x - 4 + this.rand() * 8, y: c.y - 10, vx: (this.rand() - 0.5) * 6, vy: -14 - this.rand() * 8, life: 0, max: 0.9 + this.rand() * 0.6, color: this.rand() < 0.5 ? "#ffcf6a" : "#ff8a3d" });
        }
        break;
      case "thanksgiving":
        if (this.rand() < dt * 1.4) {
          const colors = ["#e5484d", "#ff8a3d", "#d9a531", "#b0632a"];
          this.particles.push({ kind: "leaf", x: ev.area.x + this.rand() * ev.area.w, y: ev.area.y, vx: (this.rand() - 0.5) * 8, vy: 6, life: 0, max: Math.max(3, ev.area.h / 8), color: colors[Math.floor(this.rand() * colors.length)]!, g: 1 });
        }
        break;
      case "valentines":
        if (t > ev.nextFx && people.length > 0) {
          const a = pick()!;
          this.particles.push({ kind: "heart", x: a.x - 2, y: a.y - 30, vx: 0, vy: -9, life: 0, max: 1.8, color: this.rand() < 0.5 ? "#ff6b8b" : "#e5484d" });
          ev.nextFx = t + 1.2 + this.rand() * 2;
        }
        break;
      case "stpatricks":
        if (t > ev.nextFx && people.length > 0) {
          const a = pick()!;
          for (let i = 0; i < 10; i++) {
            const ang = (i / 10) * Math.PI * 2;
            this.particles.push({ kind: "confetti", x: a.x, y: a.y - 30, vx: Math.cos(ang) * 18, vy: Math.sin(ang) * 12 - 16, life: 0, max: 1.4, color: i % 3 === 0 ? "#ffd84a" : i % 2 ? "#30a46c" : "#86e07f" });
          }
          ev.nextFx = t + 3.5 + this.rand() * 3;
        }
        break;
      case "diwali":
        for (const a of people) {
          if (a.seed % 2 !== 0 || this.rand() > dt * 9) continue;
          const hx = a.x + (a.facing === "left" ? -6 : 6);
          this.particles.push({ kind: "sparkle", x: hx, y: a.y - 31, vx: (this.rand() - 0.5) * 16, vy: (this.rand() - 0.7) * 14, life: 0, max: 0.35 + this.rand() * 0.3, color: this.rand() < 0.5 ? "#fff3a3" : "#ffd84a" });
        }
        break;
      case "holi":
        if (t > ev.nextFx && people.length > 0) {
          const a = pick()!;
          const colors = ["#ff4fa0", "#ffd84a", "#30c46c", "#3e8ed0", "#8e5bd8"];
          const col = colors[Math.floor(this.rand() * colors.length)]!;
          for (let i = 0; i < 9; i++) {
            const ang = this.rand() * Math.PI * 2;
            this.particles.push({ kind: "powder", x: a.x, y: a.y - 18, vx: Math.cos(ang) * (8 + this.rand() * 12), vy: Math.sin(ang) * 8 - 6, life: 0, max: 1 + this.rand() * 0.6, color: col });
          }
          ev.splash.set(a.id, (ev.splash.get(a.id) ?? 0) + 1);
          ev.nextFx = t + 0.9 + this.rand() * 1.3;
        }
        break;
      case "summer":
        if (this.rand() < dt * 2.5) {
          this.particles.push({ kind: "steam", x: c.x - 6 + this.rand() * 8, y: c.y - 12, vx: 0, vy: -6, life: 0, max: 1.6, color: "#ffffff" });
        }
        if (t > ev.nextFx && people.length >= 2) {
          const holder = ev.ball?.holder;
          const options = people.filter((a) => a.id !== holder);
          const to = options[Math.floor(this.rand() * options.length)]!;
          const fromAgent = holder ? this.agents.get(holder) : undefined;
          ev.ball = { from: fromAgent ? { x: fromAgent.x, y: fromAgent.y - 30 } : { x: c.x, y: c.y - 20 }, to: { x: to.x, y: to.y - 30 }, at: t, holder: to.id };
          this.emit("toss", true);
          ev.nextFx = t + 2.2 + this.rand() * 1.5;
        }
        break;
      case "snowday":
        if (this.rand() < 0.25) {
          this.particles.push({ kind: "snow", x: ev.area.x + this.rand() * ev.area.w, y: ev.area.y - 4, vx: 0, vy: 7 + this.rand() * 4, life: 0, max: Math.max(3, ev.area.h / 9), color: "#ffffff" });
        }
        if (this.rand() < dt * 2) this.particles.push({ kind: "steam", x: c.x + 11 + this.rand() * 2, y: c.y - 8, vx: 0, vy: -5, life: 0, max: 1.4, color: "#ffffff" });
        break;
      case "lunarnewyear":
        if (t > ev.nextFx) {
          // Firecrackers pop by the dragon.
          const fx = c.x + (this.rand() - 0.5) * ev.area.w * 0.7;
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            this.particles.push({ kind: "sparkle", x: fx, y: c.y - 18, vx: Math.cos(ang) * 22, vy: Math.sin(ang) * 16 - 6, life: 0, max: 0.5 + this.rand() * 0.3, color: i % 3 ? "#e5484d" : "#ffd84a" });
          }
          ev.nextFx = t + 2.5 + this.rand() * 3;
        }
        break;
      case "maifest":
        if (this.rand() < dt * 1.5) {
          const petals = ["#ff9fb2", "#ffd84a", "#fbfaf5", "#c39bff"];
          this.particles.push({ kind: "leaf", x: c.x + (this.rand() - 0.5) * 30, y: c.y - 40, vx: (this.rand() - 0.5) * 14, vy: 4, life: 0, max: 3, color: petals[Math.floor(this.rand() * petals.length)]!, g: 2 });
        }
        break;
      case "oktoberfest":
        if (t > ev.nextFx) {
          ev.cheerAt = t;
          if (people.length > 0) this.emit("cheer", true);
          ev.nextFx = t + 8 + this.rand() * 6;
        }
        break;
      case "carnival":
        if (t > ev.nextFx) {
          // Kamelle! Candy flies out into the crowd.
          const colors = ["#e5484d", "#ffd84a", "#3e8ed0", "#30a46c", "#ff6b8b"];
          for (let i = 0; i < 4; i++) {
            const T = 0.8 + this.rand() * 0.4;
            const tx = c.x + (this.rand() - 0.5) * ev.area.w * 0.8;
            const ty = c.y + (this.rand() - 0.5) * ev.area.h * 0.5;
            const sx = c.x;
            const sy = c.y - 16;
            this.particles.push({ kind: "bag", x: sx, y: sy, vx: (tx - sx) / T, vy: (ty - sy) / T - 0.5 * 110 * T, life: 0, max: T, color: colors[i % colors.length]!, g: 110 });
          }
          if (this.rand() < 0.35) this.burst(c.x + (this.rand() - 0.5) * 40, c.y - 26, "confetti", 8);
          ev.nextFx = t + 1.1 + this.rand() * 1.4;
        }
        break;
      default:
        break;
    }
  }

  private atEventSpot(i: number): Agent | undefined {
    for (const a of this.agents.values()) if (this.settled(a) && a.spot?.id === `event-${i}`) return a;
    return undefined;
  }

  private cornholeThrow(ev: LiveEvent): void {
    const n = ev.spots.length;
    for (let tries = 0; tries < n; tries++) {
      ev.turn = (ev.turn + 1) % n;
      const a = this.atEventSpot(ev.turn);
      if (!a) continue;
      const board = ev.boards.reduce((best, b) => (Math.abs(b.x - a.x) > Math.abs(best.x - a.x) ? b : best), ev.boards[0]!);
      const T = 0.9;
      const sx = a.x;
      const sy = a.y - 18;
      const tx = board.x + (this.rand() - 0.5) * 6;
      const ty = board.y - 10;
      this.particles.push({ kind: "bag", x: sx, y: sy, vx: (tx - sx) / T, vy: (ty - sy) / T - 0.5 * 120 * T, life: 0, max: T, color: ev.turn % 2 ? "#e5484d" : "#3e8ed0", g: 120 });
      ev.throwAt = this.time;
      this.emit("toss", true);
      return;
    }
  }

  // ------------------------------------------------------------------ roomba, fish, ping-pong

  private updateRoomba(dt: number): void {
    const r = this.roomba;
    const t = this.time;
    const dock = this.dock();
    const A = this.L!.eventArea;
    const box = { x0: A.x + 8, x1: A.x + A.w - 8, y0: A.y + 10, y1: A.y + A.h - 4 };
    if (!r.active) {
      if (t > r.nextAt && !this.event) {
        r.active = true;
        r.returning = false;
        r.until = t + 50 + this.rand() * 30;
        r.vx = -12;
        r.vy = -6;
        this.emit("roomba", true);
      }
      return;
    }
    if (!r.returning && t > r.until) r.returning = true;
    if (r.returning) {
      const dx = dock.x - r.x;
      const dy = dock.y - r.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) {
        r.active = false;
        r.x = dock.x;
        r.y = dock.y;
        r.nextAt = t + 300 + this.rand() * 420;
        return;
      }
      r.vx = (dx / d) * 14;
      r.vy = (dy / d) * 14;
    }
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    if (!r.returning) {
      if (r.x < box.x0 || r.x > box.x1) {
        r.vx = -r.vx;
        r.vy += (this.rand() - 0.5) * 6;
      }
      if (r.y < box.y0 || r.y > box.y1) {
        r.vy = -r.vy;
        r.vx += (this.rand() - 0.5) * 4;
      }
      r.x = Math.max(box.x0, Math.min(box.x1, r.x));
      r.y = Math.max(box.y0, Math.min(box.y1, r.y));
    }
  }

  private updateFish(dt: number): void {
    const T = this.L!.fishtank;
    const left = T.x + 4;
    const right = T.x + T.w - 6;
    const feeding = this.time < this.feedingUntil;
    for (const f of this.fish) {
      f.phase += dt;
      f.x += f.dir * f.speed * dt * (feeding ? 2 : 1);
      if (f.x < left) {
        f.x = left;
        f.dir = 1;
      }
      if (f.x > right) {
        f.x = right;
        f.dir = -1;
      }
      const baseY = feeding ? T.y + 6 : T.y + 8 + f.depth * 4;
      f.y += (baseY + Math.sin(f.phase * 1.3) * 2 - f.y) * Math.min(1, dt * 2);
    }
    if (this.rand() < dt * 1.2) {
      this.particles.push({ kind: "bubble", x: T.x + 6 + this.rand() * (T.w - 12), y: T.y + T.h - 4, vx: 0, vy: -6, life: 0, max: 2.6, color: "#d9f4ff", minY: T.y + 2 });
    }
  }

  private pingPongPlayers(): { l: Agent | undefined; r: Agent | undefined } {
    let l: Agent | undefined;
    let r: Agent | undefined;
    for (const a of this.agents.values()) {
      if (a.path.length > 0 || !a.spot) continue;
      if (a.spot.id === "pingpong-l") l = a;
      if (a.spot.id === "pingpong-r") r = a;
    }
    return { l, r };
  }

  private updatePingPong(dt: number): void {
    const { l, r } = this.pingPongPlayers();
    if (l && r) {
      this.ballT += dt / 1.1;
      const side = Math.floor(this.ballT) % 2;
      if (side !== this.lastHitSide) {
        this.lastHitSide = side;
        this.emit("pingpong", true);
      }
    } else if (l || r) {
      this.ballT += dt / 0.7;
    }
  }

  // ------------------------------------------------------------------ particles

  private burst(x: number, y: number, kind: Particle["kind"], n: number): void {
    const colors = ["#ff6b8b", "#ffd84a", "#5ad1ff", "#86e07f", "#c39bff"];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.particles.push({
        kind,
        x,
        y,
        vx: Math.cos(a) * (14 + this.rand() * 14),
        vy: Math.sin(a) * (10 + this.rand() * 10) - 18,
        life: 0,
        max: 1.2 + this.rand() * 0.6,
        color: colors[i % colors.length]!,
      });
    }
  }

  private hearts(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      this.particles.push({ kind: "heart", x: x + (this.rand() - 0.5) * 8, y, vx: (this.rand() - 0.5) * 6, vy: -10 - this.rand() * 6, life: 0, max: 1.6 + this.rand(), color: "#ff6b8b" });
    }
  }

  private notes(x: number, y: number, n: number): void {
    const colors = ["#6b5a9a", "#c4383f", "#3e8ed0"];
    for (let i = 0; i < n; i++) {
      this.particles.push({ kind: "note", x: x + (this.rand() - 0.5) * 10, y: y - i * 4, vx: 0, vy: -9 - this.rand() * 4, life: 0, max: 1.8, color: colors[i % colors.length]! });
    }
  }

  // ------------------------------------------------------------------ poses

  private settled(a: Agent): boolean {
    return a.path.length === 0 && a.spot !== null;
  }

  private drawY(a: Agent): number {
    if (this.settled(a) && a.spot!.lift) return a.y - a.spot!.lift;
    return a.y;
  }

  private headTop(a: Agent): number {
    return this.drawY(a) - ANCHOR_Y + 3;
  }

  private cheering(a: Agent): boolean {
    return this.time - a.moodSince < 4 || (Math.floor((this.time + (a.seed % 7)) / 9) % 3 === 0 && this.time % 9 < 1.4);
  }

  private poseOf(a: Agent): { pose: CharPose; expr: Expression; facing: Facing; seated?: boolean } {
    const t = this.time;
    const blink = t < a.blinkUntil;
    if (!this.settled(a)) {
      const frame = Math.floor(a.walked / 4) % 4;
      return { pose: `walk${frame}` as CharPose, expr: blink ? "blink" : "open", facing: a.facing };
    }
    const s = a.spot!;
    const mood = a.thread.mood;
    // The waiting room: seated, facing you.
    if (s.kind === "review") {
      const facing = s.facing;
      const back = facing === "back";
      const seated = !back;
      switch (a.thread.waitKind) {
        case "question":
        case "approval":
          return { pose: "raise", expr: Math.floor(t * 2) % 4 === 0 ? "open" : "surprised", facing, seated };
        case "plan":
          return { pose: back ? "sit-back" : "present-plan", expr: blink ? "blink" : "open", facing, seated };
        case "error":
          return { pose: back ? "sit-back" : "slump", expr: "worried", facing, seated };
        case "drafting":
          return { pose: back ? "sit-back" : "read", expr: blink ? "blink" : "open", facing, seated };
        default:
          return this.cheering(a) && !back
            ? { pose: "cheer", expr: "happy", facing, seated }
            : { pose: back ? "sit-back" : "present", expr: blink ? "blink" : "happy", facing, seated };
      }
    }
    // Presenting a plan for your review at the whiteboard, now and then
    // turning to point at it.
    if (s.kind === "present" || (a.thread.waitKind === "plan" && s.kind === "meeting-seat")) {
      if (s.kind === "meeting-seat") return { pose: s.facing === "front" ? "present-plan" : "sit-back", expr: blink ? "blink" : "open", facing: s.facing, seated: s.facing === "front" };
      const point = (t + (a.seed % 7)) % 8 < 1.6;
      return point ? { pose: "draw0", expr: "happy", facing: "left" } : { pose: "present-plan", expr: blink ? "blink" : "happy", facing: "front" };
    }
    // Planners around the table, going through papers and blueprints.
    if (s.kind === "meeting-seat" && mood === "planning") {
      const k = Math.floor((t + (a.seed % 11)) / 2.2) % 4;
      if (s.facing === "front") return { pose: k === 0 ? "type0" : k === 2 ? "type1" : "read", expr: k === 1 ? "focus" : blink ? "blink" : "open", facing: "front" };
      return { pose: k === 1 ? "type0" : "sit-back", expr: "open", facing: "back" };
    }
    // Going over a draft with you in your office.
    if (s.kind === "boss-guest") {
      const lean = Math.floor((t + (a.seed % 9)) / 2.5) % 3 === 0;
      return { pose: lean ? "type0" : "sit-back", expr: "open", facing: "back" };
    }
    // Waiting for you at their desk when the waiting room is full.
    if (waitsForYou(mood) && s.kind === "desk") {
      const facing = s.facing;
      switch (a.thread.waitKind) {
        case "error":
          return { pose: "slump", expr: "worried", facing };
        case "drafting":
          return { pose: "type0", expr: blink ? "blink" : "happy", facing };
        default:
          return { pose: facing === "front" && this.cheering(a) ? "cheer" : "type0", expr: blink ? "blink" : "open", facing };
      }
    }
    if (s.kind === "event") return this.eventPose(a, s, blink);
    switch (s.pose) {
      case "sit-desk-front":
      case "sit-desk":
        if (a.thread.visionPro) {
          const pinch = Math.floor((t + (a.seed % 9)) / 2.2) % 4 === 0;
          return { pose: pinch ? "raise" : "type0", expr: "focus", facing: s.pose === "sit-desk" ? "back" : "front" };
        }
        {
          const typing = Math.floor((t + (a.seed % 10) / 10) * 6) % 2;
          const pause = Math.floor((t + (a.seed % 13)) / 3) % 5 === 0;
          const pose: CharPose = pause ? "type0" : typing ? "type1" : "type0";
          if (s.pose === "sit-desk") return { pose, expr: "focus", facing: "back" };
          return { pose, expr: blink ? "blink" : pause ? "open" : "focus", facing: "front" };
        }
      case "draw": {
        const scribble = Math.floor((t + (a.seed % 7) / 7) * 3) % 2;
        return { pose: scribble ? "draw1" : "draw0", expr: "focus", facing: "back" };
      }
      case "play":
        return { pose: Math.floor(t * 4 + (a.seed % 3)) % 2 ? "type1" : "type0", expr: "happy", facing: "back" };
      case "throw": {
        const since = t - (a.nextHobby - 6);
        return { pose: since >= 0 && since < 0.5 ? "raise" : "stand", expr: "focus", facing: s.facing };
      }
      case "sit-back":
        return { pose: "sit-back", expr: "open", facing: "back" };
      case "sit-front":
        return { pose: "stand", expr: blink ? "blink" : "open", facing: "front", seated: true };
      case "nap":
        return { pose: "nap", expr: "closed", facing: "front" };
      case "read":
        return { pose: "read", expr: blink ? "blink" : "open", facing: "front" };
      case "cup":
        return { pose: "cup", expr: blink ? "blink" : "happy", facing: s.facing };
      case "paddle": {
        const swing = Math.floor(this.ballT * 2 + (s.id === "pingpong-r" ? 1 : 0)) % 2;
        return { pose: swing ? "paddle1" : "paddle0", expr: "focus", facing: s.facing };
      }
      default:
        return { pose: "stand", expr: blink ? "blink" : "open", facing: s.facing };
    }
  }

  private eventPose(a: Agent, s: Spot, blink: boolean): { pose: CharPose; expr: Expression; facing: Facing } {
    const ev = this.event;
    const t = this.time;
    const facing = s.facing;
    const expr: Expression = blink ? "blink" : "happy";
    if (!ev) return { pose: "stand", expr, facing };
    const i = Number(s.id.slice(6));
    const ph = t + (a.seed % 10) * 0.37;
    switch (ev.kind) {
      case "party": {
        if (a.seed % 3 === 0) return { pose: "cup", expr, facing };
        const beat = Math.floor(ph * 2.5) % 4;
        return { pose: beat === 0 ? "cheer" : beat === 2 ? "raise" : "stand", expr, facing };
      }
      case "birthday":
        return t - ev.startedAt < 9 ? { pose: Math.floor(ph * 2) % 2 ? "cheer" : "stand", expr, facing } : { pose: a.seed % 2 ? "cup" : "stand", expr, facing };
      case "baby-shower":
      case "pizza":
      case "ice-cream":
        return { pose: Math.floor(ph / 4) % 3 === 2 ? "stand" : "cup", expr, facing };
      case "karaoke":
        if (i === 0) return { pose: Math.floor(t * 2) % 2 ? "raise" : "cheer", expr: Math.floor(t * 3) % 2 ? "happy" : "open", facing };
        return { pose: Math.floor(ph * 1.2) % 2 ? "cheer" : "stand", expr, facing };
      case "cornhole": {
        const throwing = i === ev.turn && t - ev.throwAt < 0.5;
        const cheer = t - ev.throwAt > 0.9 && t - ev.throwAt < 1.6 && a.seed % 2 === 0;
        return { pose: throwing ? "raise" : cheer ? "cheer" : "stand", expr: throwing ? "focus" : expr, facing };
      }
      case "darts":
        return { pose: Math.floor(ph / 3) % 4 === 0 ? "cheer" : "stand", expr, facing };
      case "kids":
        return { pose: Math.floor(ph / 2) % 3 === 0 ? "cheer" : "stand", expr, facing };
      case "yoga": {
        const phase = Math.floor((t - ev.startedAt) / 3) % 3;
        return { pose: phase === 0 ? "raise" : phase === 1 ? "cheer" : "stand", expr: "closed", facing: "front" };
      }
      case "holiday":
        if (t - ev.startedAt < 7) return { pose: Math.floor(ph * 2) % 2 ? "cheer" : "stand", expr, facing };
        return { pose: Math.floor(ph / 3.5) % 3 === 2 ? "cheer" : "cup", expr, facing };
      case "halloween":
        return { pose: Math.floor(ph / 2.5) % 3 === 0 ? "raise" : "stand", expr: Math.floor(ph / 2.5) % 3 === 0 ? "surprised" : expr, facing };
      case "lanterns":
        return { pose: `walk${Math.floor(a.walked / 4) % 4}` as CharPose, expr: Math.floor(ph / 3) % 3 === 0 ? "happy" : "open", facing: a.facing };
      case "maifest":
        return { pose: `walk${Math.floor(a.walked / 3) % 4}` as CharPose, expr: "happy", facing: a.facing };
      case "snowday":
        return { pose: Math.floor(ph / 4) % 3 === 2 ? "cheer" : "cup", expr, facing };
      case "lunarnewyear":
        return { pose: Math.floor(ph / 2.5) % 3 === 0 ? "cheer" : "stand", expr, facing };
      case "oktoberfest":
        // "Prost!" Everyone raises their stein together now and then.
        return { pose: t - ev.cheerAt < 1.4 ? "raise" : Math.floor(ph / 5) % 4 === 3 ? "cheer" : "cup", expr, facing };
      case "thanksgiving":
        return { pose: Math.floor(ph / 4) % 4 === 3 ? "cheer" : "cup", expr, facing };
      case "valentines":
        return { pose: Math.floor(ph / 3) % 3 === 0 ? "cheer" : "cup", expr, facing };
      case "stpatricks": {
        const beat = Math.floor(ph * 3) % 4;
        return { pose: beat === 0 ? "cheer" : beat === 2 ? "raise" : "stand", expr, facing };
      }
      case "easter":
        return { pose: ev.cheerId === a.id && t - ev.cheerAt < 1.6 ? "cheer" : "stand", expr, facing };
      case "diwali":
        return a.seed % 2 === 0 ? { pose: "raise", expr, facing } : { pose: Math.floor(ph / 3) % 3 === 0 ? "cheer" : "cup", expr, facing };
      case "holi": {
        const k = Math.floor(ph * 2) % 3;
        return { pose: k === 0 ? "raise" : k === 1 ? "cheer" : "stand", expr, facing };
      }
      case "summer":
        if (ev.ball && ev.ball.holder === a.id && t - ev.ball.at < 1.6) return { pose: "cheer", expr, facing };
        return { pose: a.seed % 3 === 0 ? "cup" : Math.floor(ph / 3) % 4 === 0 ? "cheer" : "stand", expr, facing };
      case "carnival": {
        const beat = Math.floor(ph * 2.2) % 4;
        return { pose: beat === 1 ? "raise" : beat === 3 ? "cheer" : "stand", expr, facing };
      }
    }
  }

  // ------------------------------------------------------------------ render

  render(ctx: CanvasRenderingContext2D, env: Env): void {
    const L = this.L;
    if (!L || !this.bg) return;
    this.hour = env.hour;
    this.season = env.season;
    this.seasons = env.seasons;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, L.W, L.H);
    this.drawSky(ctx, env);
    ctx.drawImage(this.bg, 0, 0);
    this.drawSunbeam(ctx, env);
    this.drawStringLights(ctx, env, false);
    this.drawClock(ctx, env.date);
    this.drawCalendar(ctx, env.date);
    this.drawStatusBoard(ctx, env);
    this.drawDoor(ctx, env);
    const night = this.skyColors(env.hour).night;
    if (this.season) {
      drawSeasonWall(ctx, L, this.season, this.time, night);
      drawSeasonFloor(ctx, L, this.season);
    }
    if (this.event) drawEventFloor(ctx, this.event, this.time, night);

    const items: Drawable[] = [];
    const atDesk = new Map<number, Agent>();
    for (const a of this.agents.values()) {
      if (a.spot?.kind === "desk" && a.path.length === 0) atDesk.set(Number(a.spot.id.slice(5)), a);
    }
    for (const p of this.props) {
      if (this.season === "holidays" && p.id === this.bossPlantId) {
        // Your office plant makes way for a decorated tree.
        items.push({ z: p.z, draw: () => drawTree(ctx, p.x + 16, p.y + 47, 34, this.time) });
        continue;
      }
      items.push({
        z: p.z,
        draw: () => {
          ctx.drawImage(p.canvas, p.x, p.y);
          this.drawPropExtras(ctx, p, env);
        },
      });
    }
    if (this.season) items.push(...seasonItems(ctx, L, this.season, this.time, night));
    if (this.season === "easter") {
      this.eggs.forEach((p, i) => {
        if (!this.eggsFound.has(i)) items.push({ z: p.y, draw: () => drawEgg(ctx, p, i) });
      });
    }
    // Workstations, dressed by whoever sits (or is about to sit) there.
    const owner = new Map<string, Agent>();
    for (const a of this.agents.values()) {
      const id = a.spot?.id ?? a.target;
      if (id?.startsWith("desk-") && !a.leaving) owner.set(id, a);
    }
    for (const d of L.desks) {
      const who = owner.get(d.spot.id);
      const style: DeskStyle = who?.thread.deskStyle ?? "default";
      const desk = deskCanvas(style);
      const chair = chairCanvas(who?.thread.chairTone ?? "green", d.side);
      const scr = screenFor(style, d.side, d.index, atDesk.get(d.index)?.thread.visionPro === true);
      const seated = atDesk.get(d.index);
      items.push({ z: d.y + 26, draw: () => ctx.drawImage(desk, d.x, d.y) });
      items.push({
        z: d.y + 26.5,
        draw: () => {
          ctx.drawImage(scr.canvas, d.pcX + scr.dx, d.pcY + scr.dy);
          for (const r of scr.screens) {
            this.drawScreen(ctx, { x: d.pcX + scr.dx + r.x, y: d.pcY + scr.dy + r.y, w: r.w, h: r.h }, seated);
          }
        },
      });
      items.push({ z: d.side === "north" ? d.spot.y - 1 : d.spot.y + 2, draw: () => ctx.drawImage(chair, d.chairX, d.chairY) });
    }
    for (const a of this.agents.values()) items.push({ z: a.y + 0.5, draw: () => this.drawAgent(ctx, a) });
    items.push({ z: L.boss.seat.y + 0.5, draw: () => this.drawBoss(ctx) });
    for (const n of this.npcs) items.push({ z: n.y + 0.5, draw: () => this.drawNpc(ctx, n) });
    for (const k of this.kids) items.push({ z: k.y + 0.4, draw: () => this.drawKid(ctx, k) });
    if (this.event) items.push(...eventDecor(ctx, this.event, this.time));
    const r = this.roomba;
    items.push({ z: r.y + 0.2, draw: () => ctx.drawImage(roombaSprite(), Math.round(r.x - 8), Math.round(r.y - 6)) });
    items.push({ z: this.cat.y + (this.cat.state === "ride" ? 3.5 : 0.3), draw: () => this.drawCat(ctx) });
    items.push({ z: this.dog.y + 0.3, draw: () => this.drawDog(ctx) });
    if (L.pingpong) items.push({ z: L.pingpong.y + 6, draw: () => this.drawBall(ctx) });
    items.sort((p, q) => p.z - q.z);
    for (const it of items) it.draw();
    if (this.event?.kind === "maifest") this.drawRibbons(ctx, this.event);

    this.drawParticles(ctx);
    this.drawBeachBall(ctx);
    this.drawLighting(ctx, env, atDesk);
    this.drawStringLights(ctx, env, true);
    for (const a of this.agents.values()) this.drawBubble(ctx, a);
    this.drawHover(ctx, env);
  }

  private drawPropExtras(ctx: CanvasRenderingContext2D, p: Prop, env: Env): void {
    const L = this.L!;
    const t = this.time;
    const on = (id: string) => (this.anim.get(id) ?? 0) > t;
    const left = (id: string) => Math.max(0, (this.anim.get(id) ?? 0) - t);
    switch (p.kind) {
      case "arcade":
        this.drawArcadeScreen(ctx);
        break;
      case "fishtank-stand":
        this.drawFishTank(ctx);
        break;
      case "whiteboard":
        this.drawWhiteboard(ctx);
        break;
      case "tv": {
        const scr = L.tvScreen;
        ctx.fillStyle = "#0d0c14";
        ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
        this.drawSpeakers(ctx, env);
        break;
      }
      case "espresso":
        // Brewing: the display blinks and a thin stream runs into the cup.
        if (on("coffee")) {
          ctx.fillStyle = Math.floor(t * 4) % 2 ? "#ffd84a" : "#5ad18a";
          ctx.fillRect(p.x + 10, p.y + 10, 6, 1);
          ctx.fillStyle = "#6b3e1e";
          ctx.fillRect(p.x + 9, p.y + 18 + (Math.floor(t * 10) % 2), 1, 2);
          ctx.fillStyle = "#c48a52";
          ctx.fillRect(p.x + 8, p.y + 20, 3, 1);
        } else if (Math.floor(t * 0.7) % 5 === 0) {
          ctx.fillStyle = "#9ff0b0";
          ctx.fillRect(p.x + 10, p.y + 10, 1, 1);
        }
        break;
      case "server-rack":
      case "ai-rack":
        this.drawRack(ctx, p);
        break;
      case "kitchen-counter": {
        const w = p.canvas.width - 2;
        if (on("kettle")) {
          ctx.fillStyle = "#ffcf4a";
          ctx.fillRect(p.x + 34, p.y + 13, 2, 1);
        }
        if (w >= 100 && on("microwave")) {
          const mx = p.x + w - 24;
          ctx.fillStyle = "#ffd98a";
          ctx.fillRect(mx, p.y + 2, 13, 10);
          ctx.fillStyle = "#e0a050";
          const a = t * 3;
          ctx.fillRect(Math.round(mx + 6 + Math.cos(a) * 3), p.y + 8, 2, 2);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(mx + 13 + 3, p.y + 4, 1, 1);
          if (left("microwave") < 0.4) {
            drawPixelText(ctx, "!", mx + 5, p.y + 3, "#c4383f");
          }
        }
        break;
      }
      case "fridge":
        if (on("fridge")) {
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(p.x + 1, p.y + 1, 18, 32);
          ctx.fillStyle = "#f4fbff";
          ctx.fillRect(p.x + 2, p.y + 2, 16, 30);
          ctx.fillStyle = "#cfe0ea";
          for (const yy of [10, 18, 25]) ctx.fillRect(p.x + 2, p.y + yy, 16, 1);
          for (const [dx, dy, c] of [[4, 6, "#ffd84a"], [10, 6, "#86e07f"], [5, 14, "#ff9fb2"], [12, 13, "#7fb8d6"], [7, 21, "#ff8a3d"]] as const) {
            ctx.fillStyle = c;
            ctx.fillRect(p.x + dx, p.y + dy, 3, 3);
          }
          // The door swung open to the left.
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(p.x - 6, p.y + 1, 7, 32);
          ctx.fillStyle = "#dfe6ec";
          ctx.fillRect(p.x - 5, p.y + 2, 5, 30);
          ctx.fillStyle = "#b9c2cc";
          ctx.fillRect(p.x - 4, p.y + 8, 3, 1);
          ctx.fillRect(p.x - 4, p.y + 18, 3, 1);
        }
        break;
      case "vending": {
        const glow = 0.5 + 0.5 * Math.sin(t * 2);
        ctx.fillStyle = `rgba(160,220,255,${0.08 + glow * 0.06})`;
        ctx.fillRect(p.x + 3, p.y + 5, 13, 28);
        if (on("vending")) {
          const k = 1 - left("vending") / 1.4;
          const y = p.y + 9 + Math.min(1, k * 1.6) * 26;
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(p.x + 7, Math.round(y) - 1, 5, 5);
          ctx.fillStyle = "#ffd84a";
          ctx.fillRect(p.x + 8, Math.round(y), 3, 3);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(p.x + 17, p.y + 18, 5, 2);
        }
        break;
      }
      case "dartboard":
        for (const d of this.darts) {
          ctx.fillStyle = "#2a2633";
          ctx.fillRect(d.x, d.y, 1, 1);
          ctx.fillStyle = "#9aa3ad";
          ctx.fillRect(d.x + 1, d.y - 1, 1, 1);
          ctx.fillStyle = d.color;
          ctx.fillRect(d.x + 2, d.y - 3, 2, 2);
        }
        break;
      case "printer":
        if (on("printer")) {
          const k = Math.min(1, 1 - left("printer") / 2.4);
          const h = Math.round(2 + k * 9);
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(p.x + 7, p.y + 2 - h, 16, h + 1);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(p.x + 8, p.y + 3 - h, 14, h);
          ctx.fillStyle = "#b9b0a2";
          for (let yy = p.y + 5 - h; yy < p.y + 1; yy += 2) ctx.fillRect(p.x + 10, yy, 9, 1);
        }
        break;
      case "library-shelf":
        if (p.id === "boss-shelf") this.drawGlobe(ctx, p.x + 22, p.y - 1, on("globe"));
        break;
      case "meeting-table":
        this.drawMeetingTable(ctx, p);
        break;
      case "boss-desk":
        if ([...this.agents.values()].some((a) => this.settled(a) && a.spot?.kind === "boss-guest")) {
          const cx = p.x + Math.round((p.canvas.width - 2) / 2);
          for (const [dx, rot] of [[-12, 0], [2, 1]] as const) {
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(cx + dx - 1, p.y + 3 + rot, 11, 9);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(cx + dx, p.y + 4 + rot, 9, 7);
            ctx.fillStyle = "#b9b0a2";
            for (let yy = 0; yy < 3; yy++) ctx.fillRect(cx + dx + 1, p.y + 5 + rot + yy * 2, 6 - (yy % 2) * 2, 1);
          }
          const px = cx - 6 + Math.round(Math.sin(t * 1.6) * 6);
          ctx.fillStyle = "#3e8ed0";
          ctx.fillRect(px, p.y + 6, 1, 3);
        }
        break;
      default:
        break;
    }
  }

  /** Papers and blueprints on the meeting table, with whoever is planning. */
  private drawMeetingTable(ctx: CanvasRenderingContext2D, p: Prop): void {
    const t = this.time;
    const around = [...this.agents.values()].filter((a) => this.settled(a) && (a.spot?.kind === "meeting-seat" || a.spot?.kind === "present" || a.spot?.kind === "whiteboard"));
    if (around.length === 0) return;
    const seated = around.filter((a) => a.spot!.kind === "meeting-seat");
    const presenting = around.some((a) => a.spot!.kind === "present" && a.thread.waitKind === "plan");
    // The big blueprint in the middle.
    const bx = p.x + 18;
    const by = p.y + 6;
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(bx - 1, by - 1, 33, 13);
    ctx.fillStyle = "#3f78c8";
    ctx.fillRect(bx, by, 31, 11);
    ctx.fillStyle = "#9fc4ff";
    for (let x = bx + 3; x < bx + 31; x += 5) ctx.fillRect(x, by + 1, 1, 9);
    ctx.fillStyle = "#e6f0ff";
    ctx.fillRect(bx + 3, by + 3, 9, 1);
    ctx.fillRect(bx + 3, by + 3, 1, 5);
    ctx.fillRect(bx + 3, by + 8, 14, 1);
    ctx.fillRect(bx + 16, by + 5, 1, 4);
    ctx.fillRect(bx + 20, by + 2, 7, 4);
    ctx.fillStyle = "#3f78c8";
    ctx.fillRect(bx + 21, by + 3, 5, 2);
    // A rolled blueprint beside it.
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(bx + 33, by + 7, 13, 4);
    ctx.fillStyle = "#7fb3e6";
    ctx.fillRect(bx + 34, by + 8, 11, 2);
    // Papers and notepads in front of each person at the table.
    for (const a of seated) {
      const top = a.spot!.facing === "front";
      const x = Math.round(a.x) - 5;
      const y = top ? p.y + 2 : p.y + 13;
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x - 1, y - 1, 11, 8);
      ctx.fillStyle = top ? "#ffffff" : "#fff3a3";
      ctx.fillRect(x, y, 9, 6);
      ctx.fillStyle = top ? "#b9b0a2" : "#c9a83c";
      const lines = 1 + (Math.floor(t / 3 + (a.seed % 5)) % 3);
      for (let i = 0; i < lines; i++) ctx.fillRect(x + 1, y + 1 + i * 2, 6 - (i % 2) * 2, 1);
    }
    // Sticky notes pile up while a plan waits for you.
    if (presenting) {
      for (const [dx, dy, c] of [[4, 3, "#ff9fb2"], [56, 12, "#a8e6a1"], [8, 13, "#fff3a3"]] as const) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(p.x + dx - 1, p.y + dy - 1, 7, 6);
        ctx.fillStyle = c;
        ctx.fillRect(p.x + dx, p.y + dy, 5, 4);
      }
    }
  }

  /** Ribbons from the top of the maypole to each dancer's hand. */
  private drawRibbons(ctx: CanvasRenderingContext2D, ev: LiveEvent): void {
    const colors = ["#e5484d", "#5aa9e6", "#ffd84a", "#ff9fb2", "#86e07f", "#c39bff"];
    const top = { x: ev.center.x, y: ev.center.y - 38 };
    for (const a of this.eventPeople()) {
      const hx = a.x + (a.facing === "left" ? -5 : 5);
      const hy = a.y - 15;
      const n = Math.max(Math.abs(hx - top.x), Math.abs(hy - top.y));
      ctx.fillStyle = colors[a.seed % colors.length]!;
      for (let i = 0; i <= n; i += 1) {
        const k = i / n;
        ctx.fillRect(Math.round(top.x + (hx - top.x) * k), Math.round(top.y + (hy - top.y) * k + Math.sin(k * Math.PI) * 4), 1, 1);
      }
    }
  }

  private drawBeachBall(ctx: CanvasRenderingContext2D): void {
    const b = this.event?.kind === "summer" ? this.event.ball : null;
    if (!b) return;
    const k = Math.min(1, (this.time - b.at) / 1.1);
    const holder = this.agents.get(b.holder);
    const to = k >= 1 && holder ? { x: holder.x, y: holder.y - 30 } : b.to;
    const x = Math.round(b.from.x + (to.x - b.from.x) * k);
    const y = Math.round(b.from.y + (to.y - b.from.y) * k - Math.sin(k * Math.PI) * 22);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 3, y - 3, 7, 7);
    ctx.fillStyle = "#fbfaf5";
    ctx.fillRect(x - 2, y - 2, 5, 5);
    ctx.fillStyle = "#e5484d";
    ctx.fillRect(x - 2, y - 2, 2, 2);
    ctx.fillStyle = "#3e8ed0";
    ctx.fillRect(x + 1, y + 1, 2, 2);
    ctx.fillStyle = "#ffd84a";
    ctx.fillRect(x + 1, y - 2, 2, 1);
  }

  private drawGlobe(ctx: CanvasRenderingContext2D, x: number, y: number, spinning: boolean): void {
    ctx.fillStyle = "#8a5a34";
    ctx.fillRect(x - 2, y, 5, 1);
    ctx.fillRect(x, y - 2, 1, 2);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 4, y - 10, 9, 8);
    ctx.fillRect(x - 3, y - 11, 7, 10);
    ctx.fillStyle = "#5aa9d6";
    ctx.fillRect(x - 3, y - 10, 7, 8);
    ctx.fillRect(x - 2, y - 11 + 1, 5, 0.01);
    const off = Math.floor(this.time * (spinning ? 12 : 0.4)) % 7;
    ctx.fillStyle = "#6fbf73";
    for (const [dx, dy, w] of [[0, 1, 2], [3, 2, 2], [1, 4, 3], [5, 5, 1], [2, 6, 2]] as const) {
      const xx = ((dx + off) % 7) - 3;
      ctx.fillRect(x + xx, y - 11 + dy, Math.min(w, 4 - xx), 1);
    }
    ctx.fillStyle = "#ffffff66";
    ctx.fillRect(x - 2, y - 9, 1, 2);
  }

  private drawAgent(ctx: CanvasRenderingContext2D, a: Agent): void {
    const { pose, expr, facing, seated: onChair } = this.poseOf(a);
    const sprite = charSprite({ look: a.thread.look, facing, pose, expr, emblem: a.thread.emblem, seated: onChair });
    let y = this.drawY(a);
    const s = a.spot;
    const settled = this.settled(a);
    if (settled && s?.kind === "arcade") y += Math.floor(this.time * 3) % 2 ? 0 : -1;
    if (settled && s?.kind === "couch" && Math.floor(this.time / 7 + (a.seed % 5)) % 6 === 0) y += Math.floor(this.time * 6) % 2 ? -1 : 0;
    if (settled && s?.kind === "review" && a.thread.mood === "needs-you") y -= Math.floor(this.time * 2 + (a.seed % 3)) % 6 === 0 ? 1 : 0;
    if (settled && s?.kind === "event" && this.event?.kind === "party" && pose !== "cup") y -= Math.floor(this.time * 5 + (a.seed % 4)) % 2;
    const seated = settled && s && SEATED_KINDS.has(s.kind);
    if (!seated) {
      ctx.fillStyle = "rgba(40,20,30,0.18)";
      ctx.fillRect(Math.round(a.x - 5), Math.round(a.y - 1), 10, 2);
    }
    ctx.drawImage(sprite, Math.round(a.x - ANCHOR_X), Math.round(y - ANCHOR_Y));
    if (a.thread.isPinned) {
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(Math.round(a.x + 2), Math.round(y - ANCHOR_Y + 15), 2, 2);
    }
    if (settled && s?.kind === "desk" && a.thread.visionPro) this.drawVisionPro(ctx, a, y, facing);
    if (settled && s?.kind === "event" && this.event) {
      const k = this.event.kind;
      if (k === "lanterns") drawCarriedLantern(ctx, a.x, y, facing, a.seed, this.time, true);
      else drawAccessory(ctx, k, a.x, y, a.seed, this.time, facing, this.event.splash.get(a.id) ?? 0);
    }
    // Party hats at a birthday or party.
    if (settled && s?.kind === "event" && (this.event?.kind === "birthday" || this.event?.kind === "party")) {
      const hx = Math.round(a.x - 1);
      const hy = Math.round(y - ANCHOR_Y + 1);
      const c = ["#ff6b8b", "#5ad1ff", "#ffd84a", "#86e07f"][a.seed % 4]!;
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(hx - 1, hy - 4, 5, 5);
      ctx.fillStyle = c;
      ctx.fillRect(hx, hy - 3, 3, 3);
      ctx.fillRect(hx + 1, hy - 5, 1, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(hx + 1, hy - 6, 1, 1);
    }
  }

  /** Blinking drive lights, GPU fans and a cool glow in the server room. */
  private drawRack(ctx: CanvasRenderingContext2D, p: Prop): void {
    const t = this.time;
    const busy = (this.anim.get("server") ?? 0) > t;
    const speed = busy ? 14 : 3;
    if (p.kind === "server-rack") {
      for (let row = 0, y = p.y + 4; y < p.y + 29; row++, y += 4) {
        for (let i = 0; i < 3; i++) {
          const on = hash(`${p.id}:${row}:${i}:${Math.floor(t * speed + i * 0.37 + row * 0.21)}`) % 3 !== 0;
          ctx.fillStyle = on ? (i === 2 ? "#ffcf4a" : row % 3 === 0 ? "#5ad1ff" : "#5ad18a") : "#1a2a22";
          ctx.fillRect(p.x + 10 + i * 1, y + 1, 1, 1);
        }
      }
    } else {
      // The AI cluster: spinning fans and a breathing light bar.
      const pulse = 0.5 + 0.5 * Math.sin(t * (busy ? 8 : 2));
      ctx.fillStyle = `rgba(160,110,255,${0.55 + pulse * 0.45})`;
      ctx.fillRect(p.x + 2, p.y + 2, 16, 5);
      drawPixelText(ctx, "AI", p.x + 7, p.y + 2, busy ? "#ffffff" : "#f0e6ff");
      for (let row = 0, y = p.y + 8; y < p.y + 29; row++, y += 6) {
        for (const fx of [6.5, 12.5]) {
          const a = t * (busy ? 30 : 9) + row + fx;
          ctx.fillStyle = "#7fd1ff";
          ctx.fillRect(Math.round(p.x + fx + Math.cos(a) * 1.2), Math.round(y + 1.5 + Math.sin(a) * 1.2), 1, 1);
        }
        ctx.fillStyle = Math.floor(t * 3 + row) % 4 ? "#86e07f" : "#c39bff";
        ctx.fillRect(p.x + 15, y + 2, 1, 1);
      }
    }
    // Glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const cx = p.x + p.canvas.width / 2;
    const g = ctx.createRadialGradient(cx, p.y + 16, 0, cx, p.y + 16, 18);
    const tint = p.kind === "ai-rack" ? "140,90,255" : "60,190,255";
    g.addColorStop(0, `rgba(${tint},${busy ? 0.32 : 0.14})`);
    g.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(cx - 18, p.y - 2, 36, 36);
    ctx.restore();
  }

  /** A Vision Pro headset, and a peek at the windows floating around them. */
  private drawVisionPro(ctx: CanvasRenderingContext2D, a: Agent, y: number, facing: Facing): void {
    const x = Math.round(a.x) - 1;
    const top = Math.round(y - 24);
    if (facing === "back") {
      ctx.fillStyle = "#6b6f7a";
      ctx.fillRect(x - 6, top + 5, 13, 2);
      ctx.fillStyle = "#9aa3ad";
      ctx.fillRect(x - 6, top + 5, 13, 1);
    } else {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x - 6, top + 4, 13, 5);
      ctx.fillStyle = "#1c1f2a";
      ctx.fillRect(x - 5, top + 5, 11, 3);
      ctx.fillStyle = "#d5dbe2";
      ctx.fillRect(x - 6, top + 4, 13, 1);
      ctx.fillStyle = "#6fd3ff";
      ctx.fillRect(x - 4, top + 5, 3, 1);
      ctx.fillStyle = "#c9a2ff";
      ctx.fillRect(x + 2, top + 6, 2, 1);
      ctx.fillStyle = "#9aa3ad";
      ctx.fillRect(x - 7, top + 5, 1, 3);
      ctx.fillRect(x + 7, top + 5, 1, 3);
    }
    const t = this.time;
    const panes: [number, number, number, number][] =
      facing === "back"
        ? [
            [-18, -50, 14, 9],
            [2, -53, 17, 11],
          ]
        : [
            [-25, -36, 13, 9],
            [12, -39, 14, 10],
          ];
    panes.forEach(([dx, dy, w, h], i) => {
      const px = x + dx;
      const py = Math.round(y + dy + Math.sin(t * 1.2 + a.seed + i) * 1.2);
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = "#e8f6ff";
      ctx.fillRect(px, py, w, h);
      ctx.fillStyle = "#7fd1ff";
      ctx.fillRect(px, py, w, 1);
      ctx.fillStyle = "#9fb6d6";
      for (let row = 2; row < h - 1; row += 2) ctx.fillRect(px + 2, py + row, Math.max(2, ((a.seed >> row) % (w - 4)) + 2), 1);
      ctx.globalAlpha = 1;
    });
  }

  private drawBoss(ctx: CanvasRenderingContext2D): void {
    const L = this.L!;
    const t = this.time;
    const { x, y } = L.boss.seat;
    const guests = [...this.agents.values()].some((a) => this.settled(a) && a.spot?.kind === "boss-guest");
    let pose: CharPose;
    let expr: Expression = Math.floor(t * 10) % 43 === 0 ? "blink" : "open";
    if (t < this.bossWaveUntil) {
      pose = Math.floor(t * 4) % 2 ? "raise" : "cheer";
      expr = "happy";
    } else if (guests) {
      pose = Math.floor(t / 3) % 3 === 2 ? "type0" : "read";
      expr = Math.floor(t / 5) % 2 ? "happy" : "focus";
    } else {
      pose = Math.floor(t * 5) % 2 ? "type1" : "type0";
      expr = Math.floor(t / 4) % 4 === 0 ? "open" : "focus";
    }
    const sprite = charSprite({ look: npcLook("boss"), facing: "front", pose, expr, emblem: "tie" });
    ctx.drawImage(sprite, Math.round(x - ANCHOR_X), Math.round(y - ANCHOR_Y));
  }

  private drawNpc(ctx: CanvasRenderingContext2D, n: Npc): void {
    const t = this.time;
    const walking = n.path.length > 0;
    let pose: CharPose = walking ? (`walk${Math.floor(n.walked / 4) % 4}` as CharPose) : "stand";
    let facing: Facing = n.facing;
    if (!walking && n.kind === "janitor") {
      pose = Math.floor(t * 3) % 2 ? "draw0" : "draw1";
      facing = "left";
    }
    const sprite = charSprite({ look: n.look, facing, pose, expr: Math.floor(t * 10) % 37 === 0 ? "blink" : "open", emblem: n.kind === "guard" ? "badge" : "broom" });
    ctx.fillStyle = "rgba(40,20,30,0.18)";
    ctx.fillRect(Math.round(n.x - 5), Math.round(n.y - 1), 10, 2);
    const x = Math.round(n.x);
    const y = Math.round(n.y);
    if (n.kind === "janitor") {
      // Wet-floor sign and bucket while mopping.
      if (!walking) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x + 12, y - 9, 7, 9);
        ctx.fillStyle = "#ffd84a";
        ctx.fillRect(x + 13, y - 8, 5, 7);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x + 15, y - 7, 1, 3);
        ctx.fillRect(x + 15, y - 3, 1, 1);
        ctx.fillStyle = "rgba(170,220,255,0.35)";
        ctx.fillRect(x - 16, y - 3, 14, 4);
      }
      // Rolling bucket.
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x - 13, y - 8, 9, 8);
      ctx.fillStyle = "#f2c14e";
      ctx.fillRect(x - 12, y - 7, 7, 5);
      ctx.fillStyle = "#7fc4ff";
      ctx.fillRect(x - 12, y - 7, 7, 1);
      ctx.fillStyle = "#3a3546";
      ctx.fillRect(x - 12, y - 1, 2, 1);
      ctx.fillRect(x - 7, y - 1, 2, 1);
    }
    ctx.drawImage(sprite, x - ANCHOR_X, y - ANCHOR_Y);
    if (n.kind === "janitor") {
      const sway = walking ? 0 : Math.round(Math.sin(t * 6) * 2);
      const hx = facing === "right" ? x + 6 : x - 6;
      ctx.fillStyle = "#b9c2cc";
      for (let i = 0; i < 13; i++) ctx.fillRect(Math.round(hx + (i / 13) * (sway - 3)), y - 16 + i, 1, 1);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(hx + sway - 7, y - 4, 8, 4);
      ctx.fillStyle = "#fbfaf5";
      ctx.fillRect(hx + sway - 6, y - 3, 6, 2);
    } else {
      const night = this.skyColors(this.hour).night;
      if (night > 0.3) {
        const fx = facing === "left" ? x - 7 : x + 6;
        ctx.fillStyle = "#3a3546";
        ctx.fillRect(fx, y - 12, 2, 2);
        ctx.fillStyle = "#fff3c0";
        ctx.fillRect(facing === "left" ? fx - 1 : fx + 2, y - 12, 1, 2);
      }
    }
  }

  private drawKid(ctx: CanvasRenderingContext2D, k: Kid): void {
    const moving = k.path.length > 0 || (k.roaming && k.pause <= 0);
    const frame = moving ? Math.floor(k.walked / 3) % 2 : 0;
    const facing = k.facing === "left" || k.facing === "right" ? k.facing : "front";
    const hop = moving ? frame : 0;
    ctx.fillStyle = "rgba(40,20,30,0.16)";
    ctx.fillRect(Math.round(k.x - 4), Math.round(k.y - 1), 8, 2);
    ctx.drawImage(kidSprite(k.look, frame, facing), Math.round(k.x - KID_W / 2), Math.round(k.y - KID_H + 1 - hop));
  }

  private drawDog(ctx: CanvasRenderingContext2D): void {
    const d = this.dog;
    const t = this.time;
    let pose: DogPose;
    const moving = d.path.length > 0 || (d.state === "follow" && Math.floor(d.walked) % 1000 !== Math.floor(d.walked - 0.01));
    if (d.state === "bed") pose = "loaf";
    else if (d.path.length > 0) pose = Math.floor(d.walked / 3) % 2 ? "walk1" : "walk0";
    else if (d.state === "follow") pose = Math.floor(d.walked / 3) % 2 ? "walk1" : "walk0";
    else pose = t < d.happyUntil || Math.floor(t / 4) % 3 === 0 ? (Math.floor(t * 8) % 2 ? "wag0" : "wag1") : "sit";
    void moving;
    const facing = d.facing === "left" ? "left" : d.facing === "right" ? "right" : "left";
    const blink = Math.floor(t * 10) % 41 === 0;
    ctx.fillStyle = "rgba(40,20,30,0.16)";
    ctx.fillRect(Math.round(d.x - 7), Math.round(d.y - 1), 14, 2);
    ctx.drawImage(dogSprite(pose, facing, blink), Math.round(d.x - 10), Math.round(d.y - 14));
  }

  private drawBubble(ctx: CanvasRenderingContext2D, a: Agent): void {
    if (!this.settled(a)) return;
    const kind = a.thread.waitKind;
    if (!kind || !waitsForYou(a.thread.mood)) return;
    if (a.spot?.kind === "boss-guest") return;
    if (this.labeled.has(a.id)) return;
    const t = this.time;
    const top = this.headTop(a);
    const urgent = kind === "question" || kind === "approval";
    const bounce = urgent ? Math.round(Math.abs(Math.sin(t * 4)) * 2) : 0;
    const bx = Math.round(a.x + 3);
    const by = Math.round(top - 13 - bounce);
    if (kind === "error") {
      ctx.fillStyle = "#8e93a8";
      ctx.fillRect(bx - 9, by + 3, 14, 5);
      ctx.fillRect(bx - 7, by + 1, 6, 3);
      ctx.fillRect(bx - 2, by, 5, 4);
      ctx.fillStyle = "#b4b8c9";
      ctx.fillRect(bx - 6, by + 2, 3, 1);
      ctx.fillRect(bx - 1, by + 1, 2, 1);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(bx - 9, by + 8, 14, 1);
      return;
    }
    // In the waiting room, the page or blueprint they hold says "done" / "plan".
    if ((kind === "done" || kind === "plan") && (a.spot?.kind === "review" || a.spot?.kind === "present")) return;
    const fill = kind === "question" ? "#9fd0ff" : kind === "approval" ? "#ffcf4a" : kind === "drafting" ? "#ffffff" : kind === "plan" ? "#9fc4ff" : "#7be08f";
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(bx - 1, by - 1, 12, 11);
    ctx.fillRect(bx, by + 10, 3, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bx, by, 10, 9);
    ctx.fillRect(bx + 1, by + 9, 1, 1);
    ctx.fillStyle = fill;
    ctx.fillRect(bx + 1, by + 1, 8, 7);
    ctx.fillStyle = OUTLINE;
    if (kind === "question") {
      ctx.fillRect(bx + 3, by + 2, 4, 1);
      ctx.fillRect(bx + 6, by + 3, 1, 1);
      ctx.fillRect(bx + 4, by + 4, 2, 1);
      ctx.fillRect(bx + 4, by + 6, 2, 1);
    } else if (kind === "approval") {
      ctx.fillRect(bx + 4, by + 2, 2, 3);
      ctx.fillRect(bx + 4, by + 6, 2, 1);
    } else if (kind === "drafting") {
      const n = Math.floor(t * 3) % 4;
      for (let i = 0; i < 3; i++) if (i < n) ctx.fillRect(bx + 2 + i * 2, by + 5, 1, 1);
    } else if (kind === "plan") {
      ctx.fillRect(bx + 2, by + 3, 6, 1);
      ctx.fillRect(bx + 2, by + 5, 4, 1);
    } else {
      for (const [dx, dy] of [[2, 4], [3, 5], [4, 6], [5, 5], [6, 4], [7, 3]] as const) ctx.fillRect(bx + dx, by + dy, 1, 1);
    }
  }

  private drawHover(ctx: CanvasRenderingContext2D, env: Env): void {
    const h = env.hover;
    const L = this.L!;
    if (!h) return;
    const marker = (x: number, y: number) => {
      x = Math.round(x);
      y = Math.round(y);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x - 3, y - 1, 7, 2);
      ctx.fillRect(x - 2, y + 1, 5, 1);
      ctx.fillRect(x - 1, y + 2, 3, 1);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 2, y - 1, 5, 1);
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y + 1, 1, 1);
    };
    const bob = Math.round(Math.sin(this.time * 6) * 1.2);
    switch (h.kind) {
      case "agent": {
        const a = this.agents.get(h.id);
        if (!a) return;
        const bubble =
          this.settled(a) &&
          waitsForYou(a.thread.mood) &&
          !this.labeled.has(a.id) &&
          a.spot?.kind !== "boss-guest" &&
          !((a.thread.waitKind === "done" || a.thread.waitKind === "plan") && (a.spot?.kind === "review" || a.spot?.kind === "present"));
        marker(a.x, this.headTop(a) - (bubble ? 20 : 7) + bob);
        break;
      }
      case "desk": {
        const d = L.desks[h.index]!;
        const cx = d.spot.x;
        const cy = d.side === "north" ? d.spot.y - 14 : d.spot.y - 12;
        marker(cx, cy - 12 + bob);
        ctx.fillStyle = "#ffffffcc";
        ctx.fillRect(cx - 1, cy - 4, 3, 9);
        ctx.fillRect(cx - 4, cy - 1, 9, 3);
        break;
      }
      case "door":
        marker(L.wall.door.x + L.wall.door.w / 2, L.wall.door.y - 20 + bob);
        break;
      case "legend":
        marker(L.wall.legendNote.x + L.wall.legendNote.w / 2, L.wall.legendNote.y - 5 + bob);
        break;
      case "dog":
        marker(this.dog.x, this.dog.y - 20 + bob);
        break;
      case "cat":
        marker(this.cat.x, this.cat.y - 18 + bob);
        break;
      case "poke": {
        const p = L.pokeables.find((q) => q.id === h.id);
        if (p) marker(p.rect.x + p.rect.w / 2, Math.max(4, p.rect.y - 6) + bob);
        break;
      }
      default:
        break;
    }
  }

  private drawScreen(ctx: CanvasRenderingContext2D, r: Rect, a: Agent | undefined): void {
    const { x, y, w, h } = r;
    const t = this.time;
    if (!a) return; // switched off
    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    switch (a.thread.mood) {
      case "needs-you":
        ctx.fillStyle = Math.floor(t * 2) % 2 === 0 ? "#ffcf4a" : "#e0a92c";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#4a3410";
        ctx.fillRect(cx - 1, cy - 2, 2, 3);
        ctx.fillRect(cx - 1, cy + 2, 2, 1);
        return;
      case "done":
        ctx.fillStyle = "#3fbf6b";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#e9ffe9";
        for (const [dx, dy] of [[-3, 0], [-2, 1], [-1, 2], [0, 1], [1, 0], [2, -1], [3, -2]] as const) ctx.fillRect(cx + dx, cy + dy, 1, 1);
        return;
      case "error":
        ctx.fillStyle = "#b8383f";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#ffe0e0";
        for (let i = -2; i <= 2; i++) {
          ctx.fillRect(cx + i, cy + i, 1, 1);
          ctx.fillRect(cx - i, cy + i, 1, 1);
        }
        return;
      default: {
        ctx.fillStyle = "#1f2a3c";
        ctx.fillRect(x, y, w, h);
        const colors = ["#60c677", "#9ff0b0", "#7fd1ff", "#ffd479", "#c39bff"];
        const scroll = Math.floor(t * 3 + (a.seed % 11));
        const rows = Math.max(1, Math.floor((h - 1) / 2));
        for (let row = 0; row < rows; row++) {
          const n = scroll + row;
          const rr = hash(`${a.id}:${n}`);
          const indent = (rr % 3) * (w > 12 ? 2 : 1);
          const len = 2 + ((rr >> 4) % Math.max(1, w - 3 - indent));
          ctx.fillStyle = colors[(rr >> 9) % colors.length]!;
          ctx.fillRect(x + 1 + indent, y + 1 + row * 2, Math.min(len, w - 2 - indent), 1);
        }
      }
    }
  }

  private drawArcadeScreen(ctx: CanvasRenderingContext2D): void {
    const A = this.L!.arcade;
    if (!A) return;
    const x = A.x + 2;
    const y = A.y + 9;
    const w = 20;
    const h = 14;
    const t = this.time;
    const playing = [...this.agents.values()].some((a) => a.spot?.id === "arcade" && a.path.length === 0);
    const coin = (this.anim.get("arcade") ?? 0) > t;
    ctx.fillStyle = "#120f22";
    ctx.fillRect(x, y, w, h);
    if (coin) {
      const colors = ["#ff6b8b", "#ffd84a", "#5ad1ff", "#86e07f", "#c39bff"];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[(i + Math.floor(t * 10)) % colors.length]!;
        ctx.fillRect(x + 1, y + 1 + i * 2.6, w - 2, 2);
      }
      return;
    }
    if (!playing) {
      if (Math.floor(t * 1.5) % 2) {
        ctx.fillStyle = "#ffd84a";
        ctx.fillRect(x + 4, y + 6, 12, 2);
      }
      return;
    }
    const march = Math.floor(t * 2) % 4;
    ctx.fillStyle = "#86e07f";
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 2 + i * 4 + march, y + 2, 2, 2);
    ctx.fillStyle = "#ff6b8b";
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 4 + i * 4 + march, y + 5, 2, 1);
    const shipX = x + 3 + Math.floor((Math.sin(t * 2.3) * 0.5 + 0.5) * (w - 8));
    ctx.fillStyle = "#5ad1ff";
    ctx.fillRect(shipX, y + h - 3, 3, 2);
    ctx.fillRect(shipX + 1, y + h - 4, 1, 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(shipX + 1, y + h - 5 - ((t * 18) % h), 1, 2);
  }

  private drawCat(ctx: CanvasRenderingContext2D): void {
    const c = this.cat;
    let pose: CatPose;
    switch (c.state) {
      case "wander":
        pose = Math.floor(c.step / 3) % 2 ? "walk1" : "walk0";
        break;
      case "visit":
        pose = Math.hypot(c.tx - c.x, c.ty - c.y) < 1.5 ? "sit" : Math.floor(c.step / 3) % 2 ? "walk1" : "walk0";
        break;
      case "ride":
        pose = "ride";
        break;
      case "groom":
        pose = Math.floor(this.time * 2) % 2 ? "groom" : "sit";
        break;
      case "loaf":
        pose = "loaf";
        break;
      default:
        pose = "sit";
    }
    const blink = Math.floor(this.time * 10) % 37 === 0;
    ctx.fillStyle = "rgba(40,20,30,0.16)";
    ctx.fillRect(Math.round(c.x - 6), Math.round(c.y - 1), 12, 2);
    ctx.drawImage(catSprite(pose, c.facing, blink), Math.round(c.x - 8), Math.round(c.y - 12));
    if (c.state === "loaf" && this.rand() < 0.01) {
      this.particles.push({ kind: "zzz", x: c.x + 4, y: c.y - 12, vx: 2, vy: -4, life: 0, max: 2, color: "#ffffff" });
    }
  }

  private drawBall(ctx: CanvasRenderingContext2D): void {
    const P = this.L!.pingpong;
    if (!P) return;
    const { l, r } = this.pingPongPlayers();
    const t = this.time;
    ctx.fillStyle = "#ffffff";
    if (!l && !r) {
      const left = (this.anim.get("pingpong") ?? 0) - t;
      if (left <= 0) return;
      const k = 1 - left / 2;
      const bx = P.x + 4 + k * (P.w - 8);
      const by = P.y + 5 - Math.abs(Math.sin(k * Math.PI * 3)) * 8;
      ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
      return;
    }
    if (l && r) {
      const phase = this.ballT % 1;
      const dirRight = Math.floor(this.ballT) % 2 === 0;
      const x0 = P.x + 2;
      const x1 = P.x + P.w - 2;
      const bx = dirRight ? x0 + (x1 - x0) * phase : x1 - (x1 - x0) * phase;
      const local = phase < 0.5 ? phase * 2 : (phase - 0.5) * 2;
      const by = P.y + 5 - Math.sin(local * Math.PI) * 9;
      ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(Math.round(bx), P.y + 8, 2, 1);
    } else {
      const a = (l ?? r)!;
      const hx = a.spot!.facing === "right" ? a.x + 6 : a.x - 6;
      const by = a.y - 18 - Math.abs(Math.sin(this.ballT * Math.PI)) * 8;
      ctx.fillRect(Math.round(hx), Math.round(by), 2, 2);
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const k = 1 - p.life / p.max;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      ctx.globalAlpha = p.kind === "bag" || p.kind === "paper" ? 1 : Math.max(0, Math.min(1, k * 1.5));
      switch (p.kind) {
        case "zzz":
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(x - 1, y - 1, 5, 5);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x, y, 3, 1);
          ctx.fillRect(x + 1, y + 1, 1, 1);
          ctx.fillRect(x, y + 2, 3, 1);
          break;
        case "heart":
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, 2, 2);
          ctx.fillRect(x + 3, y, 2, 2);
          ctx.fillRect(x, y + 1, 5, 2);
          ctx.fillRect(x + 1, y + 3, 3, 1);
          ctx.fillRect(x + 2, y + 4, 1, 1);
          break;
        case "steam":
          ctx.fillStyle = `rgba(255,255,255,${0.55 * k})`;
          ctx.fillRect(x, y, 1, 2);
          break;
        case "drop":
        case "food":
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, 1, p.kind === "drop" ? 2 : 1);
          break;
        case "bubble":
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, 1, 1);
          break;
        case "sparkle":
          ctx.fillStyle = p.color;
          ctx.fillRect(x - 1, y, 3, 1);
          ctx.fillRect(x, y - 1, 1, 3);
          break;
        case "note":
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y + 3, 2, 2);
          ctx.fillRect(x + 1, y, 1, 4);
          ctx.fillRect(x + 2, y, 1, 1);
          break;
        case "paper":
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(x - 2, y - 2, 4, 4);
          ctx.fillStyle = p.color;
          ctx.fillRect(x - 1, y - 1, 2, 2);
          break;
        case "bag":
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(x - 2, y - 1, 4, 3);
          ctx.fillStyle = p.color;
          ctx.fillRect(x - 1, y, 2, 1);
          break;
        case "snow":
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, 1, 1);
          break;
        case "powder": {
          const r = 1 + Math.floor((p.life / p.max) * 3);
          ctx.globalAlpha = Math.max(0, 0.7 * k);
          ctx.fillStyle = p.color;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
          break;
        }
        case "leaf":
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, 2, 1);
          ctx.fillRect(x + 1, y + 1, 1, 1);
          break;
        default:
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, 2, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------------ wall widgets

  private drawCalendar(ctx: CanvasRenderingContext2D, date: Date): void {
    const c = this.L!.wall.calendar;
    const month = date.toLocaleString("en", { month: "short" }).toUpperCase().slice(0, 3);
    drawPixelText(ctx, month, c.x + Math.floor((c.w - pixelTextWidth(month)) / 2), c.y + 1, "#ffffff");
    const day = String(date.getDate());
    const s = 2;
    drawPixelText(ctx, day, c.x + Math.floor((c.w - pixelTextWidth(day, s)) / 2), c.y + 9, "#3a3046", s);
    if (this.event) {
      // A star sticker: something's on today.
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(c.x + c.w - 5, c.y + c.h - 6, 3, 3);
      ctx.fillRect(c.x + c.w - 4, c.y + c.h - 7, 1, 5);
      ctx.fillRect(c.x + c.w - 6, c.y + c.h - 5, 5, 1);
    }
  }

  private drawStatusBoard(ctx: CanvasRenderingContext2D, env: Env): void {
    const s = this.L!.wall.status;
    const rows: [number, string][] = [
      [env.counts.attention, "#ffcf4a"],
      [env.counts.done, "#7be08f"],
      [env.counts.working + env.counts.planning, "#7fc4ff"],
    ];
    rows.forEach(([n, color], i) => {
      const y = s.y + 2 + i * 5;
      const lit = n > 0;
      const pulse = i === 0 && lit && Math.floor(this.time * 2) % 2 === 0;
      ctx.fillStyle = lit ? (pulse ? "#ffffff" : color) : "#3a3546";
      ctx.fillRect(s.x + 3, y + 1, 3, 3);
      const text = n > 99 ? "99" : String(n);
      drawPixelText(ctx, text, s.x + s.w - 2 - pixelTextWidth(text), y, lit ? color : "#4a4458");
    });
  }

  private drawDoor(ctx: CanvasRenderingContext2D, env: Env): void {
    const d = this.L!.wall.door;
    if (this.time < this.doorOpenUntil) {
      ctx.fillStyle = "#2a1e2e";
      ctx.fillRect(d.x, d.y + 1, d.w, d.h - 1);
      ctx.fillStyle = "#4a3a56";
      ctx.fillRect(d.x + 2, d.y + 3, d.w - 4, d.h - 4);
      ctx.fillStyle = "#c48a52";
      ctx.fillRect(d.x - 3, d.y + 1, 3, d.h - 1);
    }
    if (env.overflow > 0) {
      const text = `+${Math.min(env.overflow, 99)}`;
      const w = pixelTextWidth(text) + 4;
      const x = Math.min(d.x + d.w + 2, this.L!.W - w - 2);
      const y = d.y + 6;
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x - 1, y - 1, w + 2, 9);
      ctx.fillStyle = "#fff3a3";
      ctx.fillRect(x, y, w, 7);
      drawPixelText(ctx, text, x + 2, y + 1, "#6b5a2e");
    }
  }

  private drawWhiteboard(ctx: CanvasRenderingContext2D): void {
    const b = this.L!.whiteboard;
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x + 3, b.y + 3, b.w - 4, 30);
    ctx.clip();
    for (const s of this.strokes) {
      ctx.fillStyle = s.color;
      switch (s.kind) {
        case "box":
          ctx.fillRect(s.x, s.y, s.w, 1);
          ctx.fillRect(s.x, s.y + s.h, s.w + 1, 1);
          ctx.fillRect(s.x, s.y, 1, s.h);
          ctx.fillRect(s.x + s.w, s.y, 1, s.h);
          break;
        case "line":
          ctx.fillRect(s.x, s.y + 2, s.w + 4, 1);
          break;
        case "arrow":
          ctx.fillRect(s.x, s.y + 2, s.w, 1);
          ctx.fillRect(s.x + s.w - 1, s.y + 1, 1, 3);
          ctx.fillRect(s.x + s.w - 2, s.y, 1, 1);
          ctx.fillRect(s.x + s.w - 2, s.y + 4, 1, 1);
          break;
        case "note":
          ctx.fillRect(s.x, s.y, 6, 5);
          ctx.fillStyle = "#c9a83c";
          ctx.fillRect(s.x + 1, s.y + 2, 4, 1);
          break;
        case "check":
          for (const [dx, dy] of [[0, 2], [1, 3], [2, 2], [3, 1], [4, 0]] as const) ctx.fillRect(s.x + dx, s.y + dy, 1, 1);
          break;
        case "circle":
          ctx.fillRect(s.x + 1, s.y, 3, 1);
          ctx.fillRect(s.x + 1, s.y + 4, 3, 1);
          ctx.fillRect(s.x, s.y + 1, 1, 3);
          ctx.fillRect(s.x + 4, s.y + 1, 1, 3);
          break;
      }
    }
    // A plan up for your review: written out neatly at the top left of the
    // board, above the heads of whoever is sketching.
    if ([...this.agents.values()].some((a) => this.settled(a) && a.spot?.kind === "present" && a.thread.waitKind === "plan")) {
      const x = b.x + 6;
      const y = b.y + 5;
      ctx.fillStyle = "#fbfcfd";
      ctx.fillRect(x - 2, y - 1, 32, 26);
      drawPixelText(ctx, "PLAN", x, y, "#3e8ed0");
      ctx.fillStyle = "#3e8ed0";
      ctx.fillRect(x, y + 6, 17, 1);
      const done = Math.floor(this.time / 2.5) % 5;
      for (let i = 0; i < 4; i++) {
        const ry = y + 9 + i * 4;
        ctx.fillStyle = "#3a3046";
        ctx.fillRect(x, ry, 3, 1);
        ctx.fillRect(x, ry + 2, 3, 1);
        ctx.fillRect(x, ry, 1, 3);
        ctx.fillRect(x + 2, ry, 1, 3);
        ctx.fillRect(x + 5, ry + 1, 12 + ((i * 5) % 7), 1);
        if (i < done) {
          ctx.fillStyle = "#30a46c";
          ctx.fillRect(x + 1, ry + 1, 1, 1);
        }
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ scenery

  private skyColors(hour: number): { top: string; bottom: string; night: number } {
    const keys: [number, string, string, number][] = [
      [0, "#0d1030", "#1f2350", 1],
      [5, "#1a1f4a", "#3b3a6b", 0.9],
      [6.5, "#f7a07a", "#ffd9a0", 0.2],
      [8, "#7cc4f0", "#c7ecff", 0],
      [16.5, "#6fb8ec", "#c2e8ff", 0],
      [18.5, "#f08a7a", "#ffcf8f", 0.25],
      [19.6, "#5a4a8a", "#e08a8f", 0.6],
      [21, "#141838", "#2a2c5a", 1],
      [24, "#0d1030", "#1f2350", 1],
    ];
    for (let i = 0; i < keys.length - 1; i++) {
      const [h0, t0, b0, n0] = keys[i]!;
      const [h1, t1, b1, n1] = keys[i + 1]!;
      if (hour >= h0 && hour <= h1) {
        const k = (hour - h0) / (h1 - h0);
        return { top: mix(t0, t1, k), bottom: mix(b0, b1, k), night: n0 + (n1 - n0) * k };
      }
    }
    return { top: "#7cc4f0", bottom: "#c7ecff", night: 0 };
  }

  private drawSky(ctx: CanvasRenderingContext2D, env: Env): void {
    const sky = this.skyColors(env.hour);
    for (const [i, win] of this.L!.wall.windows.entries()) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(win.x, win.y, win.w, win.h);
      ctx.clip();
      this.paintSky(ctx, env, sky, win, i);
      ctx.restore();
    }
  }

  private paintSky(ctx: CanvasRenderingContext2D, env: Env, sky: { top: string; bottom: string; night: number }, win: Rect, index: number): void {
    const { x, y, w, h } = win;
    const bands = 8;
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = mix(sky.top, sky.bottom, i / (bands - 1));
      ctx.fillRect(x, y + Math.floor((i * h) / bands), w, Math.ceil(h / bands) + 1);
    }
    const t = this.time;
    if (sky.night > 0.4) {
      for (const s of this.stars) {
        if (!inRect(s.x, s.y, win)) continue;
        ctx.fillStyle = Math.sin(t * 1.5 + s.p) > 0.2 ? "#fff6d8" : "#a9a6d0";
        ctx.fillRect(s.x, s.y, 1, 1);
      }
    }
    if (index === 0) {
      const dayK = (env.hour - 6) / 13;
      if (dayK > 0 && dayK < 1 && sky.night < 0.7) {
        const sx = x + 8 + dayK * (w - 16);
        const sy = y + h - 12 - Math.sin(dayK * Math.PI) * (h - 20);
        ctx.fillStyle = sky.night > 0.1 ? "#ffb36b" : "#fff1a8";
        ctx.fillRect(Math.round(sx - 2), Math.round(sy - 3), 5, 7);
        ctx.fillRect(Math.round(sx - 3), Math.round(sy - 2), 7, 5);
      } else {
        const nk = ((env.hour + 24 - 19) % 24) / 11;
        const mx = x + 10 + nk * (w - 20);
        const my = y + h - 14 - Math.sin(nk * Math.PI) * (h - 22);
        ctx.fillStyle = "#f4f1dc";
        ctx.fillRect(Math.round(mx - 2), Math.round(my - 3), 5, 7);
        ctx.fillRect(Math.round(mx - 3), Math.round(my - 2), 7, 5);
        ctx.fillStyle = mix(sky.top, sky.bottom, 0.3);
        ctx.fillRect(Math.round(mx), Math.round(my - 3), 3, 5);
      }
    }
    const cloud = mix(sky.night > 0.5 ? "#3a3d6a" : "#ffffff", sky.bottom, 0.15);
    for (let i = 0; i < 3; i++) {
      const cx = x + ((t * (1.2 + i * 0.5) + i * 40 + index * 23) % (w + 30)) - 15;
      const cy = y + 6 + i * 7;
      ctx.fillStyle = env.rainy ? mix(cloud, "#7a8094", 0.6) : cloud;
      ctx.fillRect(Math.round(cx), cy, 12, 3);
      ctx.fillRect(Math.round(cx + 3), cy - 2, 6, 2);
    }
    const city = mix("#4a5f7a", sky.top, 0.35);
    const lit = sky.night > 0.45;
    for (let bx = 0; bx < w; bx += 8) {
      const bh = 8 + (hash(`b${index}-${bx}`) % 14);
      ctx.fillStyle = city;
      ctx.fillRect(x + bx, y + h - bh, 7, bh);
      if (lit) {
        for (let wy = y + h - bh + 2; wy < y + h - 2; wy += 3) {
          for (let wx = 1; wx < 6; wx += 3) {
            if (hash(`${index}-${bx}-${wy}-${wx}`) % 3 === 0) {
              ctx.fillStyle = "#ffd98a";
              ctx.fillRect(x + bx + wx, wy, 1, 1);
            }
          }
        }
      }
    }
    if (sky.night < 0.3 && index === 0) {
      const bp = (t * 9) % 260;
      if (bp < w + 10) {
        const bx = x + bp - 5;
        const by = y + 12 + Math.sin(t) * 2;
        const flap = Math.floor(t * 4) % 2;
        ctx.fillStyle = "#3a3046";
        ctx.fillRect(Math.round(bx), Math.round(by + flap), 1, 1);
        ctx.fillRect(Math.round(bx + 1), Math.round(by + 1 - flap), 1, 1);
        ctx.fillRect(Math.round(bx + 2), Math.round(by + flap), 1, 1);
      }
    }
    if (this.season) paintSeasonSky(ctx, this.season, win, index, t, sky.night);
    if (env.rainy && this.season !== "holidays") {
      ctx.fillStyle = "rgba(200,225,255,0.65)";
      for (let i = 0; i < Math.round(w / 2.5); i++) {
        ctx.fillRect(x + ((i * 17 + Math.floor(t * 30)) % w), y + ((i * 11 + Math.floor(t * 70)) % h), 1, 2);
      }
    }
  }

  private drawSunbeam(ctx: CanvasRenderingContext2D, env: Env): void {
    const sky = this.skyColors(env.hour);
    if (sky.night > 0.5 || env.rainy) return;
    const L = this.L!;
    const strength = (1 - sky.night) * 0.13;
    for (const win of L.wall.windows) {
      const seg = L.segments.find((s) => win.x >= s.x0 && win.x < s.x1);
      const F = seg?.depth ?? 64;
      const { x, w } = win;
      ctx.fillStyle = `rgba(255,236,180,${strength})`;
      ctx.beginPath();
      ctx.moveTo(x + 6, F);
      ctx.lineTo(x + w - 4, F);
      ctx.lineTo(x + w + 30, F + 60);
      ctx.lineTo(x + 36, F + 60);
      ctx.closePath();
      ctx.fill();
      const t = this.time;
      ctx.fillStyle = `rgba(255,250,220,${strength * 4})`;
      for (let i = 0; i < Math.round(w / 8); i++) {
        const k = (t * 0.04 + i * 0.13) % 1;
        ctx.fillRect(Math.round(x + 8 + i * 7 + k * 30 + Math.sin(t * 0.7 + i) * 3), Math.round(F + 4 + k * 52), 1, 1);
      }
    }
  }

  private drawStringLights(ctx: CanvasRenderingContext2D, env: Env, glowPass: boolean): void {
    const night = this.skyColors(env.hour).night;
    const colors = ["#ffd27a", "#ff9fb2", "#9fd8ff", "#b6f5a0"];
    let n = 0;
    for (const seg of this.L!.segments) {
      for (let x0 = seg.x0 + 6; x0 < seg.x1 - 6; x0 += 100) {
        const x1 = Math.min(seg.x1 - 6, x0 + 100);
        if (x1 - x0 < 30) continue;
        for (let x = x0; x < x1; x++) {
          const k = (x - x0) / (x1 - x0);
          const y = 1 + Math.round(Math.sin(k * Math.PI) * 3);
          if (!glowPass) {
            ctx.fillStyle = "#4a3a46";
            ctx.fillRect(x, y, 1, 1);
          }
          if ((x - x0) % 10 === 5) {
            const c = colors[n++ % colors.length]!;
            const on = night > 0.3;
            const tw = 0.65 + 0.35 * Math.sin(this.time * 1.3 + n * 1.7);
            if (glowPass) {
              if (!on) continue;
              const g = ctx.createRadialGradient(x + 0.5, y + 2.5, 0, x + 0.5, y + 2.5, 6);
              g.addColorStop(0, `${c}${Math.round(90 * tw * night).toString(16).padStart(2, "0")}`);
              g.addColorStop(1, `${c}00`);
              ctx.fillStyle = g;
              ctx.fillRect(x - 6, y - 4, 13, 13);
              ctx.fillStyle = c;
              ctx.fillRect(x, y + 1, 1, 2);
            } else {
              ctx.fillStyle = on ? c : mix(c, "#6b5a5a", 0.45);
              ctx.fillRect(x, y + 1, 1, 2);
            }
          }
        }
      }
    }
  }

  private drawClock(ctx: CanvasRenderingContext2D, date: Date): void {
    const { x, y, r } = this.L!.wall.clock;
    const h = date.getHours() % 12;
    const m = date.getMinutes();
    const s = date.getSeconds();
    const line = (angle: number, len: number, color: string) => {
      ctx.fillStyle = color;
      for (let i = 0; i <= len; i += 0.5) ctx.fillRect(Math.round(x + Math.sin(angle) * i), Math.round(y - Math.cos(angle) * i), 1, 1);
    };
    const k = r / 7;
    line(((h + m / 60) / 12) * Math.PI * 2, 3.6 * k, "#3a3046");
    line((m / 60) * Math.PI * 2, 5.6 * k, "#3a3046");
    const sa = (s / 60) * Math.PI * 2;
    ctx.fillStyle = "#e5484d";
    ctx.fillRect(Math.round(x + Math.sin(sa) * 5.5 * k), Math.round(y - Math.cos(sa) * 5.5 * k), 1, 1);
    ctx.fillRect(x, y, 1, 1);
    // Cuckoo!
    const left = (this.anim.get("clock") ?? 0) - this.time;
    if (left > 0) {
      const out = Math.min(1, (2.4 - left) * 4, left * 4);
      const by = Math.round(y - r - 2 - out * 5);
      ctx.fillStyle = "#4b3d5c";
      ctx.fillRect(x - 3, y - r - 3, 7, 3);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x - 3, by - 3, 7, 5);
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(x - 2, by - 2, 5, 3);
      ctx.fillStyle = "#ff9a3d";
      ctx.fillRect(x + 3, by - 1, 2, 1);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(x + 1, by - 2, 1, 1);
    }
  }

  private drawSpeakers(ctx: CanvasRenderingContext2D, env: Env): void {
    const t = this.time;
    const sprite = speakerSprite();
    for (const s of this.L!.speakers) {
      ctx.drawImage(sprite, s.x - 1, s.y - 1);
      const cx = s.x + Math.floor(s.w / 2);
      if (env.soundOn) {
        if (env.soundPulse < 0.5) {
          ctx.fillStyle = "#8b7fb0";
          ctx.fillRect(cx - 2, s.y + 14, 4, 4);
        }
        const k = (t * 0.35 + (s.x % 7) * 0.13) % 1;
        if (k < 0.7) {
          const nx = Math.round(s.x + s.w / 2 + Math.sin(k * 6) * 4);
          const ny = Math.round(s.y - 2 - k * 10);
          ctx.globalAlpha = 1 - k / 0.7;
          ctx.fillStyle = "#6b5a9a";
          ctx.fillRect(nx, ny, 2, 2);
          ctx.fillRect(nx + 1, ny - 4, 1, 4);
          ctx.fillRect(nx + 2, ny - 4, 1, 1);
          ctx.globalAlpha = 1;
        }
      } else {
        ctx.fillStyle = "#e5484d";
        for (let i = 0; i < 5; i++) ctx.fillRect(cx - 2 + i, s.y + 13 + i, 1, 1);
      }
    }
  }

  private drawFishTank(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.L!.fishtank;
    const t = this.time;
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = "#cfe9f2";
    ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = "#4fa8c9";
    ctx.fillRect(x, y + 2, w, h - 2);
    ctx.fillStyle = "#62bcd9";
    ctx.fillRect(x, y + 2, w, 5);
    ctx.fillStyle = "#e7d39a";
    ctx.fillRect(x, y + h - 4, w, 4);
    for (const [sx, hgt] of [[6, 12], [9, 9], [30, 14], [33, 10]] as const) {
      for (let j = 0; j < hgt; j++) {
        const off = Math.round(Math.sin(t * 1.4 + j * 0.5 + sx) * (j / hgt) * 1.5);
        ctx.fillStyle = j % 3 ? "#3f9a5a" : "#57b86f";
        ctx.fillRect(x + sx + off, y + h - 4 - j, 1, 1);
      }
    }
    ctx.fillStyle = "#b9a9c9";
    ctx.fillRect(x + 18, y + h - 9, 5, 5);
    ctx.fillRect(x + 18, y + h - 10, 1, 1);
    ctx.fillRect(x + 20, y + h - 10, 1, 1);
    ctx.fillRect(x + 22, y + h - 10, 1, 1);
    for (const f of this.fish) {
      const fx = Math.round(f.x);
      const fy = Math.round(f.y);
      const flick = Math.floor(f.phase * 6) % 2;
      ctx.fillStyle = f.color;
      ctx.fillRect(fx, fy, 3, 2);
      ctx.fillRect(f.dir > 0 ? fx - 1 : fx + 3, fy - flick, 1, 2 + flick);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(f.dir > 0 ? fx + 2 : fx, fy, 1, 1);
    }
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x + 2, y + 3, 1, h - 8);
  }

  private drawLighting(ctx: CanvasRenderingContext2D, env: Env, desks: Map<number, Agent>): void {
    const L = this.L!;
    const sky = this.skyColors(env.hour);
    const darkness = sky.night * 0.5 + (env.rainy ? 0.08 : 0);
    if (darkness < 0.02) return;
    const d = this.dark!;
    const dc = d.getContext("2d")!;
    dc.globalCompositeOperation = "source-over";
    dc.clearRect(0, 0, L.W, L.H);
    dc.fillStyle = `rgba(16,14,44,${darkness})`;
    dc.fillRect(0, 0, L.W, L.H);
    dc.globalCompositeOperation = "destination-out";
    const hole = (x: number, y: number, r: number, k: number) => {
      const g = dc.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${k})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      dc.fillStyle = g;
      dc.fillRect(x - r, y - r, r * 2, r * 2);
    };
    type Light = [number, number, number, number, string, number];
    const flicker = 0.85 + Math.sin(this.time * 7) * 0.05 + Math.sin(this.time * 2.3) * 0.08;
    const tv = L.tv;
    const lights: Light[] = [
      [tv.x + tv.w / 2, tv.y + tv.h / 2 + 6, Math.max(74, tv.w * 0.7), 0.8 * flicker, "#9fc4ff", 0.12],
      [L.fishtank.x + L.fishtank.w / 2, L.fishtank.y + 10, 28, 0.8, "#7fe0ff", 0.16],
      [L.kitchen.x + L.kitchen.w / 2, L.kitchen.y + 14, 60, 0.6, "#ffe2b0", 0.1],
      [L.meeting.x + L.meeting.w / 2, L.meeting.y + 40, 64, 0.55, "#fff2d0", 0.08],
      [L.waiting.x + L.waiting.w - 22, L.waiting.y + 10, 80, 0.65, "#ffd28a", 0.12],
      [L.boss.seat.x - 10, L.boss.desk.y + 2, 30, 0.7, "#9fd0ff", 0.1],
    ];
    if (this.lampOn) lights.push([L.lamp.x, L.lamp.y + 6, 64, 0.95, "#ffcf8a", 0.22]);
    if (L.arcade) lights.push([L.arcade.x + 12, L.arcade.y + 16, 26, 0.75, "#ff8fe0", 0.16]);
    for (const win of L.wall.windows) lights.push([win.x + win.w / 2, win.y + win.h / 2, 40, 0.4, "#c9d6ff", 0.04]);
    for (const [index, a] of desks) {
      const desk = L.desks[index]!;
      const tint = a.thread.mood === "needs-you" ? "#ffcf4a" : a.thread.mood === "error" ? "#ff6b6b" : a.thread.mood === "done" ? "#7be08f" : "#8ff0b0";
      lights.push([desk.spot.x, desk.side === "north" ? desk.y + 4 : desk.y + 10, 28, 0.85, tint, 0.16]);
    }
    const fridge = L.pokeables.find((p) => p.id === "fridge");
    if (fridge && (this.anim.get("fridge") ?? 0) > this.time) lights.push([fridge.rect.x + 10, fridge.rect.y + 16, 30, 0.9, "#e9f6ff", 0.18]);
    for (const n of this.npcs) {
      if (n.kind !== "guard") continue;
      const dir = n.facing === "left" ? -1 : n.facing === "right" ? 1 : 0;
      const dy = n.facing === "back" ? -18 : n.facing === "front" ? 14 : 0;
      lights.push([n.x + dir * 22, n.y - 6 + dy, 24, 0.95, "#fff3c0", 0.22]);
    }
    if (this.event && (this.event.kind === "party" || this.event.kind === "karaoke")) {
      const c = this.event.center;
      const colors = ["#ff6b8b", "#5ad1ff", "#ffd84a"];
      for (let i = 0; i < 3; i++) {
        const a = this.time * 1.1 + i * 2.1;
        lights.push([c.x + Math.cos(a) * 30, c.y + Math.sin(a) * 12, 34, 0.8, colors[i]!, 0.2]);
      }
    }
    if (L.server) lights.push([L.server.x + L.server.w / 2, L.server.y + L.server.h / 2, Math.max(36, L.server.w * 0.6), 0.9, "#7fb8ff", 0.24]);
    const espresso = L.pokeables.find((q) => q.id === "coffee");
    if (espresso) lights.push([espresso.rect.x + 13, espresso.rect.y + 10, 12, 0.7, "#5ad18a", 0.12]);
    if (this.season) lights.push(...seasonLights(L, this.season));
    if (this.event) {
      lights.push(...eventLights(this.event));
      if (this.event.kind === "lanterns") {
        for (const a of this.eventPeople()) lights.push([a.x + (a.facing === "left" ? -12 : 12), a.y - 17, 18, 0.9, "#ffcf8a", 0.22]);
      }
    }
    for (const [x, y, r, k] of lights) if (r > 0) hole(x, y, r, k);
    ctx.drawImage(d, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const [x, y, r, , color, k] of lights) {
      if (r <= 0 || k <= 0) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.8);
      g.addColorStop(0, `${color}${Math.round(255 * k * sky.night).toString(16).padStart(2, "0")}`);
      g.addColorStop(1, `${color}00`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  /** 0 by day, 1 at night: drives overlay dimming in the view. */
  nightness(hour: number): number {
    return this.skyColors(hour).night;
  }
}
