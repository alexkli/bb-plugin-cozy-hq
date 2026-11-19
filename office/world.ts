// The living office: characters walking the hallways between spots, the
// boss (you), the dog and the cat, cleaners and the night guard, office
// events, things to click, day and night. Pure canvas, no React.

import type { WeatherKind } from "../contract.ts";
import { deliveryLine, GAME_LINES, lunchLine, type Topic } from "./chatter.ts";
import {
  ANCHOR_X,
  ANCHOR_Y,
  catSprite,
  charSprite,
  dogSprite,
  kidSprite,
  npcLook,
  skeletonSprite,
  KID_H,
  KID_W,
  OUTLINE,
  type CatPose,
  type CharPose,
  type DogPose,
  type Expression,
  type Look,
} from "./characters.ts";
import { Crew, drawLanyard, type DeskWork } from "./crew.ts";
import { learnWalkways } from "./walkways.ts";
import { buildProps, paintBackground, roombaSprite, speakerSprite, type Prop } from "./furniture.ts";
import type { Facing, Green, Layout, Point, PokeKind, Rect, Spot } from "./layout.ts";
import { waitsForYou, type DeskStyle, type Mood, type WaitKind } from "./model.ts";
import { highlightOf, keepsStarted, startsWork, type Highlight } from "./highlight.ts";
import { chairCanvas, deskCanvas, screenFor, type ChairTone } from "./desks.ts";
import { ctx2d, hash, mix, rng } from "./pixel.ts";
import { drawPixelText, pixelTextWidth } from "./pixelfont.ts";
import type { SoundName } from "./sound.ts";
import { CLASSIC } from "./themes/classic.ts";
import { withPets, type Call, type GatherCue, type GatherSpot, type Gathering, type Light, type PaintInfo, type SceneryActions, type SceneryClickable, type Theme, type VisitorKind } from "./theme.ts";
import { DEFAULT_YOU, dressYou, withPronouns, youEmblem, youLook, type You } from "./you.ts";
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
  FOODS,
  lunchTable,
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
  /** Finished (or waiting on you) and you haven't opened it since: a warm glow. */
  unopened?: boolean;
  /** Its own subagents at work (they stand by its desk). */
  subagents: number;
  /** The family it belongs to (a thread and the ones it spawned): matching lanyards. */
  family: string | null;
}

/** What a thread was doing the last time you looked at the office. */
export interface SeenState {
  spotId: string;
  mood: Mood;
  waitKind: WaitKind | null;
}

/** Sound callback; `ambient` marks background life rather than a reaction to a click. */
export type Emit = (sound: SoundName | (string & {}), ambient?: boolean) => void;

export type NpcKind = "guard" | "janitor" | "technician" | "delivery";

/**
 * What agents say when they get together. The view supplies it (it knows
 * the headlines and what each thread did); the world decides when.
 */
export interface Talk {
  /** An opening line for this speaker, and what it's about. */
  open(speakerId: string): { text: string; topic: Topic } | null;
  /** A reply on that topic. */
  reply(speakerId: string, topic: Topic): string | null;
  /** These agents just got together: a chance to look up what they did. */
  gather(ids: string[]): void;
}

/** Someone's speech bubble, for the view to draw. */
export interface SpeechBubble {
  id: string;
  x: number;
  y: number;
  text: string;
}

/** Where a title tag goes (any settled agent). */
export interface LabelAnchor {
  id: string;
  x: number;
  y: number;
  mood: Mood;
  kind: WaitKind | null;
  /** New for you (the warm glow): the tag gets a matching accent. */
  unopened: boolean;
}

export type Hit =
  | { kind: "agent"; id: string }
  | { kind: "helper"; id: string; key: string }
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
  | { kind: "egg"; index: number }
  | { kind: "window"; index: number }
  | { kind: "roomba" }
  | { kind: "lights" }
  | { kind: "scenery"; id: string; hover: string };

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
  /** In a get-together (its id), away from their own spot for a while. */
  huddle: number | null;
  /** Shuffling along after a mishap. */
  slow: boolean;
  /** Pace on this walk: a run to or from the desk, brisk on other work errands, else 1. */
  pace: number;
  /** Got to work since you last looked: a cool glow until the work ends. */
  started: boolean;
  /** Gliding along these waypoints this much faster (skiing down after a scenery's show). */
  glide?: { pace: number; pts: Set<string> } | null;
}

type HuddleKind = "coffee" | "cooler" | "chat" | "couch" | "pingpong" | "darts";

/** A few idle agents together: a coffee, a chat, a game, or a scenery's show. */
interface Huddle {
  id: number;
  /** "call": a video call between separate homes, everyone where they are. */
  kind: HuddleKind | "scenery" | "call";
  members: string[];
  spots: Spot[];
  until: number;
  nextLine: number;
  lines: number;
  maxLines: number;
  topic: Topic | null;
  lastSpeaker: string | null;
  /** A scenery's show: what it sees, how long they stay once there, and the cues left to play. */
  show?: { gathering: { size: number; arrivedAt: number | null; done: boolean; present: boolean[]; ids: string[] }; stay: number; cues: GatherCue[]; next: number; leave: (GatherSpot["leave"] | undefined)[] };
}

/** The server-room gag: poke at the cables, get zapped, lie down, shuffle off. */
interface Mishap {
  id: string;
  phase: "go" | "fiddle" | "zap" | "down" | "leave";
  until: number;
  spot: Spot;
}

type JobKind = "pc" | "bulb" | "coffee" | "printer" | "vending" | "server";

interface Job {
  kind: JobKind;
  facing: Facing;
  desk?: number;
  /** Ladder against the wall at this x (bulbs). */
  ladderX?: number;
}

interface Npc extends Walker {
  id: string;
  kind: NpcKind;
  look: Look;
  stops: Point[][];
  /** Seconds left at the current stop. */
  pause: number;
  leaving: boolean;
  /** The technician's job at each remaining stop, and the one at hand. */
  jobs: (Job | null)[];
  job: Job | null;
  jobDur: number;
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

/** You off to the putting green: walk over, line up, putt, see where it goes, walk back. */
interface Golf {
  phase: "out" | "aim" | "roll" | "react" | "fetch" | "back";
  until: number;
  outcome: "in" | "lip" | "short" | "desk";
  /** The ball rolling from `from` (bending through `via`) to `to`, `at` .. `at + dur`. */
  roll: { from: Point; via: Point | null; to: Point; at: number; dur: number } | null;
  /** The dog fetching the ball from under the desk: 0 going, 1 sniffing, 2 bringing it back. */
  fetch: { step: 0 | 1 | 2 } | null;
  fetched: boolean;
}

/** A crumpled paper ball for the hoop: wind up, fly, then through the net or off the rim onto the floor. */
interface Shot {
  phase: "windup" | "fly" | "drop" | "bounce" | "rest";
  until: number;
  swish: boolean;
  ball: { x: number; y: number; vx: number; vy: number } | null;
}

/**
 * You at the arcade while its game is open (OfficeView's cabinet): over
 * there once you're free, playing along, a cheer or a sulk when a game
 * ends, and back to your desk when it's closed.
 */
interface Visit {
  phase: "wait" | "out" | "play" | "won" | "lost" | "back";
  until: number;
  /** The game is still open (false: back to your desk after the cheer or the sulk). */
  open: boolean;
  /** Whoever came over to watch. */
  watch: Gathering | null;
}

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
  /** Chatter among the guests. */
  nextTalk: number;
  talkTopic: Topic | null;
  lastSpeaker: string | null;
  talkTurn: number;
}

export interface Env {
  /** Local time as fractional hours, 0–24. */
  hour: number;
  date: Date;
  /** The weather outside the windows. */
  weather: WeatherKind;
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
  /** Outline everything you can click (while Alt is held). */
  targets?: boolean;
}

/** Something you can click, and its box (round: the circle inside it). */
export interface ClickTarget {
  hit: Hit;
  rect: Rect;
  round?: boolean;
  /** Clickable, but left for you to find: not outlined. */
  secret?: boolean;
}

const WALK_SPEED = 32; // px/s
/** A waypoint on a glide (by where it is: a re-route keeps the points, not the objects). */
const glideKey = (p: Point) => `${Math.round(p.x)},${Math.round(p.y)}`;
const SLOW_SPEED = 11;
/** Work doesn't wait: between the waiting room, meeting room and your office. */
const BRISK = 1.3;
/** To or from the desk, and into your office when you start writing to them, they run. */
const RUN = 2.3;
const WORK_GROUPS: ReadonlySet<string> = new Set(["desk", "review", "present", "meeting", "boss"]);
const NPC_SPEED = 24;
const KID_SPEED = 40;
/** You, up from your desk. */
const BOSS_SPEED = 40;

const inRect = (x: number, y: number, r: Rect) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** The corner brackets around things to click. */
const TARGET_COLOR = "#fff7cf";

/** A little grey rain cloud over someone's head (an error; you after losing at the arcade). */
function drawRainCloud(ctx: CanvasRenderingContext2D, bx: number, by: number): void {
  ctx.fillStyle = "#8e93a8";
  ctx.fillRect(bx - 9, by + 3, 14, 5);
  ctx.fillRect(bx - 7, by + 1, 6, 3);
  ctx.fillRect(bx - 2, by, 5, 4);
  ctx.fillStyle = "#b4b8c9";
  ctx.fillRect(bx - 6, by + 2, 3, 1);
  ctx.fillRect(bx - 1, by + 1, 2, 1);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(bx - 9, by + 8, 14, 1);
}

/** The two highlight tints, warm gold and cool sky blue: a saturated rim that shows on pale floors, and a lighter haze around it. */
const GLOW: Record<Highlight, string> = { finished: "#ffb23c", started: "#4fb8ff", drafting: "#b779ff" };
/** How far the highlight rim reaches past the figure, in px. */
const RIM = 3;
/** Where the sparkles twinkle, from the top of the figure's head (x from its middle). */
const SPARKLE_SPOTS: readonly (readonly [number, number])[] = [[-10, 2], [9, 0], [-7, -4], [6, -5], [11, 7], [-12, 9], [0, -7], [-3, -6], [3, -3]];
const GLOW_HAZE: Record<Highlight, string> = { finished: "#ffdf80", started: "#a0e8ff", drafting: "#e2c6ff" };

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
  /** When the next burst of typing from the desks is heard (this.time). */
  private nextKeys = 0;
  private wipeUntil = 0;
  private ballT = 0;
  private lastHitSide = 0;
  private time = 0;
  private hour = 12;
  private doorOpenUntil = 0;
  private emit: Emit;
  private stars: { x: number; y: number; p: number }[] = [];
  private dark: HTMLCanvasElement | null = null;
  /** The lights' colored glow, added onto the scene. */
  private glow: HTMLCanvasElement | null = null;
  /** When the darkness and glow were last drawn (this.time), -1 to redraw. */
  private litAt = -1;
  private feedingUntil = 0;
  // Seeded from the clock: a different day at the office every time you open it.
  private rand = rng((Date.now() ^ 0x5eed) >>> 0);
  private anim = new Map<string, number>();
  private darts: { x: number; y: number; color: string }[] = [];
  private lampOn = true;
  private bossWaveUntil = 0;
  /** When the scenery's tick runs next (theme.tick). */
  private nextSceneryTick = 0;
  /** The scenery's drift for each person this frame (theme.drift), by id. */
  private drifts = new Map<string, { dx: number; dy: number; tilt: number }>();
  /** This frame's PaintInfo, for hooks asked while drawing people (theme.pose). */
  private info: PaintInfo = { t: 0, hour: 12, night: 0, weather: "clear", date: new Date(), season: null };
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
  private nextTech = -1;
  /** Today (from the clock), and the day the team last had lunch together. */
  private dayKey = "";
  private lunchDay = "";
  private lunchAt = -1;
  private huddles: Huddle[] = [];
  private huddleSeq = 0;
  /** The scenery's own clickables, for the current plan and theme. */
  private sceneryClicks: { L: Layout; theme: Theme; list: SceneryClickable[] } | null = null;
  private nextHuddleAt = -1;
  /** Neighbors chatting where they are, and replies on their way. */
  private nextChatAt = -1;
  private replies: { id: string; topic: Topic; at: number }[] = [];
  /** Neighbors on a quick call (a plan of separate homes), until the reply's said. */
  private chats: { key: string; ids: string[]; until: number }[] = [];
  private speech = new Map<string, { text: string; until: number }>();
  /** Bubbles a scenery asked for a moment from now (a pinecone still on its way down). */
  private sayLater: { at: number; id: string; text: string; seconds: number }[] = [];
  private talk: Talk | null = null;
  private mishap: Mishap | null = null;
  private nextMishapAt = -1;
  private flashUntil = 0;
  private weather: WeatherKind = "clear";
  private lightningAt = -99;
  private nextLightning = -1;
  private thunderAt = -1;
  /** Things the technician comes to fix. */
  private brokenDesk: number | null = null;
  private brokenBulbX: number | null = null;
  private brokenMachine: "coffee" | "printer" | "vending" | null = null;
  private rackBroken = false;
  /** Bumped when an event starts or ends (or you take or leave the arcade), so the view reassigns spots. */
  eventVersion = 0;

  private layoutKey = "";
  /** How the office looks (the scenery), and sprites dressed by it. */
  private theme: Theme = CLASSIC;
  private themed = new Map<string, unknown>();
  /** Threads' subagents, standing by their desks. */
  private crew = new Crew(() => {
    this.doorOpenUntil = this.time + 1.2;
  });
  private dressHelper = (look: Look, id: string): Look => this.lookOf(look, id);
  /** You, the boss, as picked in the settings (before the scenery dresses you). */
  private you: You = DEFAULT_YOU;
  private youBase: Look = youLook(DEFAULT_YOU);
  /** You up and about (null: at your desk). */
  private bossAt: Walker | null = null;
  private golf: Golf | null = null;
  /** The golf ball where it is or last stopped (null: under the desk, or not out yet). */
  private golfBall: (Point & { sunk?: boolean }) | null = null;
  private flagUntil = 0;
  private shot: Shot | null = null;
  private visit: Visit | null = null;

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
      const spotId = this.homeOf(a);
      if (a.leaving || !spotId) continue;
      out[a.id] = { spotId, mood: a.thread.mood, waitKind: a.thread.waitKind };
    }
    return out;
  }

  /** The spot that's theirs: where they're headed, or back to after a get-together or mishap. */
  private homeOf(a: Agent): string | null {
    if (a.huddle !== null || this.mishap?.id === a.id) return a.thread.spotId;
    return a.target ?? a.spot?.id ?? null;
  }

  /** Dress the office as another place; everyone stays where they are. */
  setTheme(theme: Theme, repaint = true): void {
    if (theme === this.theme) return;
    this.theme = theme;
    this.themed.clear();
    const L = this.L;
    if (!L || !repaint) return;
    this.bg = paintBackground(L, theme);
    this.props = buildProps(L, theme);
  }

  get scenery(): Theme {
    return this.theme;
  }

  /** How you look and which pronouns the office uses for you. */
  setYou(you: You): void {
    this.you = you;
    this.youBase = youLook(you);
  }

  /** A sprite dressed by the theme, built once per theme. */
  private dressed<T>(key: string, build: () => T): T {
    let v = this.themed.get(key) as T | undefined;
    if (v === undefined) {
      v = build();
      this.themed.set(key, v);
    }
    return v;
  }

  /** A look in the scenery's outfit (cached; the key keeps sprite caches apart). */
  private lookOf(base: Look, id: string): Look {
    const fn = this.theme.look;
    if (!fn) return base;
    return this.dressed(`look|${id}|${base.key}`, () => {
      const l = fn(base, id);
      return l.key === base.key ? { ...l, key: `${base.key}|${this.theme.id}` } : l;
    });
  }

  private npcLookOf(kind: VisitorKind): Look {
    // You: dressed by the scenery, keeping what you picked.
    if (kind === "boss") return this.dressed(`npc|boss|${this.youBase.key}`, () => dressYou(this.you, this.theme));
    const base = npcLook(kind);
    const fn = this.theme.npc;
    if (!fn) return base;
    return this.dressed(`npc|${kind}|${base.key}`, () => {
      const l = fn(kind, base);
      return l.key === base.key ? { ...l, key: `${base.key}|${this.theme.id}` } : l;
    });
  }

  private paintInfo(env: Env): PaintInfo {
    return { t: this.time, hour: env.hour, night: this.skyColors(env.hour).night, weather: env.weather, date: env.date, season: this.season, calls: this.calls() };
  }

  /** A plan of separate homes: everyone stays home, and get-togethers are video calls. */
  private get remote(): boolean {
    return (this.L?.homes?.length ?? 0) > 0;
  }

  /** The video calls going on (a plan of separate homes), for the scenery to draw. */
  private calls(): Call[] {
    if (!this.remote) return [];
    const out: Call[] = [];
    const at = (a: Agent) => ({ id: a.id, x: a.x, y: a.y });
    const talking = (ids: string[]) => ids.find((id) => this.speech.has(id)) ?? null;
    for (const h of this.huddles) {
      if (h.kind !== "call") continue;
      const members = h.members.map((id) => this.agents.get(id)).filter((a): a is Agent => a !== undefined && this.settled(a));
      if (members.length >= 2) out.push({ kind: "chat", key: `call-${h.id}`, members: members.map(at), talking: talking(h.members) });
    }
    for (const c of this.chats) {
      const members = c.ids.map((id) => this.agents.get(id)).filter((a): a is Agent => a !== undefined && this.settled(a));
      if (members.length === 2 && this.time < c.until) out.push({ kind: "chat", key: c.key, members: members.map(at), talking: talking(c.ids) });
    }
    const planners: Agent[] = [];
    for (const a of this.agents.values()) {
      if (a.leaving || !this.settled(a) || a.huddle !== null) continue;
      const g = a.spot!.group;
      if (g === "meeting" && a.thread.mood === "planning") planners.push(a);
      else if (g === "present" || g === "boss") out.push({ kind: "you", key: `you-${a.id}`, members: [at(a)], talking: talking([a.id]) });
      else if (g === "review") out.push({ kind: "lobby", key: `lobby-${a.id}`, members: [at(a)], talking: null });
    }
    if (planners.length > 0) out.push({ kind: "meeting", key: "meeting", members: planners.map(at), talking: talking(planners.map((a) => a.id)) });
    return out;
  }

  /** Who supplies the small talk. */
  setTalk(talk: Talk | null): void {
    this.talk = talk;
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
    learnWalkways(L);
    this.crew.setLayout(L);
    this.bg = paintBackground(L, this.theme);
    this.props = buildProps(L, this.theme);
    this.dark = document.createElement("canvas");
    this.dark.width = L.W;
    this.dark.height = L.H;
    this.glow = document.createElement("canvas");
    this.glow.width = L.W;
    this.glow.height = L.H;
    this.litAt = -1;
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
    // Visitors, events and get-togethers don't survive a resize.
    this.npcs = [];
    this.kids = [];
    for (const h of this.huddles) if (h.show) h.show.gathering.done = true;
    this.bossAt = null;
    this.golf = null;
    this.golfBall = null;
    this.shot = null;
    if (this.visit) this.visit = this.visit.open ? { phase: "wait", until: 0, open: true, watch: null } : null;
    this.huddles = [];
    this.replies = [];
    this.mishap = null;
    this.speech.clear();
    this.sayLater = [];
    this.brokenDesk = null;
    this.brokenBulbX = null;
    this.brokenMachine = null;
    this.rackBroken = false;
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
    for (const a of [...this.agents.values()]) {
      // On their way out: they're gone. Re-placing them would leave them with
      // no path, and a leaving agent with no path never reaches the door (an
      // archived thread shrinks the headcount, so this follows right after).
      if (a.leaving) {
        this.agents.delete(a.id);
        continue;
      }
      a.huddle = null;
      a.slow = false;
      const spot = (a.target && L.byId.get(a.target)) || (a.spot && L.byId.get(a.spot.id)) || L.byId.get(a.thread.spotId);
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
    return (
      this.L?.byId.get(id) ??
      this.event?.spots.find((s) => s.id === id) ??
      this.huddles.flatMap((h) => h.spots).find((s) => s.id === id) ??
      (this.mishap?.spot.id === id ? this.mishap.spot : undefined)
    );
  }

  /** Layout spots plus any event spots, for assignment (not the arcade while you're playing it). */
  allSpots(): Spot[] {
    const L = this.L;
    if (!L) return [];
    const spots = this.event ? [...L.spots, ...this.event.spots] : L.spots;
    return this.atArcade ? spots.filter((sp) => sp.kind !== "arcade") : spots;
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
    for (const h of [...this.huddles]) this.endHuddle(h, false);
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
      nextTalk: t + 8 + this.rand() * 4,
      talkTopic: null,
      lastSpeaker: null,
      talkTurn: 0,
    };
    if (k === "lunch") {
      this.event.food = FOODS[Math.floor(this.rand() * FOODS.length)]!;
      this.event.delivered = false;
      // A few bring their own lunchbox.
      this.event.lunchboxes = plan.spots.filter((sp, i) => hash(`${sp.id}-${Math.floor(t)}`) % 3 === 0 && i > 0).map((sp) => sp.id);
      this.lunchDay = this.dayKey;
    }
    this.eventVersion++;
    this.emit(EVENTS[k].start, ambient);
    const c = plan.center;
    this.burst(c.x, c.y - 20, "confetti", 18);
    if (k === "kids") this.spawnKids(Math.min(4, Math.max(2, Math.round(idle / 2))));
    if (k === "lunch") this.spawnNpc("delivery");
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
          huddle: null,
          slow: false,
          pace: 1,
          started: false,
          // Everyone walks a little differently: their own lane, corner cutting and pace.
          lane: { x: ((hash(t.id) >>> 2) % 11) - 5, y: ((hash(t.id) >>> 6) % 9) - 4 },
          cut: 7 + ((hash(t.id) >>> 9) % 10),
          sway: 1 + ((hash(t.id) >>> 13) % 4),
        };
        this.agents.set(t.id, a);
        const was = lastSeen?.get(t.id);
        const before = was ? this.spotById(was.spotId) : undefined;
        const same = was !== undefined && was.mood === t.mood && was.waitKind === t.waitKind;
        if (instant && spot && (!history || same)) this.place(a, spot);
        else if (instant && spot && before) {
          // Changed while you were away: from where they were to where they go now.
          this.place(a, before);
          if (before.id !== spot.id) {
            this.walkTo(a, spot);
            a.started = startsWork(was?.mood ?? null, t.mood);
          }
        } else if (spot) {
          this.emit("door", true);
          this.emit("arrive");
          this.doorOpenUntil = this.time + 1.6;
          this.burst(L.entrance.x, L.entrance.y - 16, "sparkle", 8);
          this.walkTo(a, spot);
          a.started = startsWork(was?.mood ?? null, t.mood);
          if (this.dog.state !== "follow" && this.dog.goal !== "event" && this.rand() < 0.35) this.dogTo("greet");
        }
        continue;
      }
      const prevMood = a.thread.mood;
      a.thread = t;
      if (prevMood !== t.mood) {
        a.moodSince = this.time;
        a.started = !instant && keepsStarted(a.started, prevMood, t.mood);
        if (!instant) this.onMoodChange(a, prevMood, t.mood);
      }
      a.leaving = false;
      // Mid-mishap: they get up and go in their own time.
      if (this.mishap?.id === a.id) continue;
      if (a.huddle !== null) {
        // Still idle: stay at the get-together; otherwise back to work.
        if (t.mood === "idle" && !instant) continue;
        this.leaveHuddle(a);
      }
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
      if (a.huddle !== null) this.leaveHuddle(a, false);
      if (this.mishap?.id === a.id) this.mishap = null;
      a.leaving = true;
      this.emit("leave");
      a.path = route(a, L.net, L.entrancePath);
      a.spot = null;
      a.target = null;
    }
    this.crew.sync(this.deskWork(), this.time, instant);
  }

  /** Threads at their desk (or on the way) with subagents running. */
  private deskWork(): DeskWork[] {
    const L = this.L!;
    const out: DeskWork[] = [];
    for (const a of this.agents.values()) {
      if (a.leaving || a.thread.subagents <= 0 || a.thread.mood !== "working") continue;
      const id = a.target ?? a.spot?.id;
      const desk = id?.startsWith("desk-") ? L.desks[Number(id.slice(5))] : undefined;
      if (desk && desk.spot.id === id) out.push({ id: a.id, look: a.thread.look, subagents: a.thread.subagents, desk });
    }
    return out;
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
    const from = a.spot?.group ?? this.spotById(a.target)?.group;
    a.pace =
      a.huddle !== null
        ? 1
        : spot.group === "desk" || spot.group === "boss" || from === "desk"
          ? RUN
          : from !== undefined && WORK_GROUPS.has(from) && WORK_GROUPS.has(spot.group)
            ? BRISK
            : 1;
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
      (a) =>
        a.spot &&
        a.huddle === null &&
        this.mishap?.id !== a.id &&
        a.thread.mood === "idle" &&
        a.path.length === 0 &&
        (a.spot.group === "break" || a.spot.group === "lounge"),
    );
    if (idle.length === 0) return;
    const a = idle[Math.floor(this.rand() * idle.length)]!;
    const taken = new Set(this.currentSpots().values());
    const options = L.spots.filter((s) => s.group === a.spot!.group && s.home === a.spot!.home && !taken.has(s.id));
    if (options.length === 0) return;
    const spot = options[Math.floor(this.rand() * options.length)]!;
    a.thread = { ...a.thread, spotId: spot.id };
    this.walkTo(a, spot);
  }

  currentSpots(): Map<string, string> {
    const out = new Map<string, string>();
    for (const a of this.agents.values()) {
      if (a.leaving) continue;
      const target = this.homeOf(a);
      if (target) out.set(a.id, target);
    }
    return out;
  }

  /** Everyone who's settled somewhere, for the title tags above their heads. */
  labelAnchors(): LabelAnchor[] {
    const out: LabelAnchor[] = [];
    for (const a of this.agents.values()) {
      if (a.leaving || !this.settled(a)) continue;
      const lying = this.mishap?.id === a.id && this.mishap.phase === "down";
      out.push({ id: a.id, x: Math.round(this.drawX(a)), y: Math.round(lying ? a.y - 22 : this.headTop(a)), mood: a.thread.mood, kind: a.thread.waitKind, unopened: a.thread.unopened === true });
    }
    // Ones waiting on you claim the best spots first.
    const rank = (l: LabelAnchor) => (l.kind && l.kind !== "drafting" ? 0 : 1);
    return out.sort((p, q) => rank(p) - rank(q) || p.y - q.y || p.x - q.x);
  }

  /** Speech bubbles showing right now (agents and visitors). */
  speechBubbles(): SpeechBubble[] {
    const out: SpeechBubble[] = [];
    for (const [id, s] of this.speech) {
      if (s.until <= this.time) {
        this.speech.delete(id);
        continue;
      }
      if (id === "boss" && this.L) {
        const p = this.bossAt ?? this.L.boss.seat;
        const d = this.drifts.get("boss");
        out.push({ id, x: Math.round(p.x + (d?.dx ?? 0)), y: Math.round(p.y - ANCHOR_Y + 1 + (d?.dy ?? 0)), text: s.text });
        continue;
      }
      const a = this.agents.get(id);
      if (a) {
        const lying = this.mishap?.id === id && this.mishap.phase === "down";
        out.push({ id, x: Math.round(this.drawX(a)), y: Math.round(lying ? a.y - 24 : this.headTop(a) - 2), text: s.text });
        continue;
      }
      const n = this.npcs.find((m) => m.id === id);
      if (n) out.push({ id, x: Math.round(n.x), y: Math.round(n.y - ANCHOR_Y + 1 - this.climbOf(n)), text: s.text });
    }
    return out;
  }

  private say(id: string, text: string, seconds: number): void {
    this.speech.set(id, { text: withPets(withPronouns(text, this.you.pronouns), this.theme), until: this.time + seconds });
  }

  /** Threads whose title tag is showing: their in-scene bubble is skipped. */
  setLabeled(ids: Iterable<string>): void {
    this.labeled = new Set(ids);
  }

  // ------------------------------------------------------------------ input

  hitTest(x: number, y: number): Hit | null {
    for (const t of this.clickTargets()) {
      const r = t.rect;
      const inside = t.round ? Math.hypot(x - (r.x + r.w / 2), y - (r.y + r.h / 2)) <= r.w / 2 : inRect(x, y, r);
      if (inside) return t.hit;
    }
    return null;
  }

  /**
   * Everything you can click right now and where, front to back: hitTest
   * takes the first one under the pointer, and holding Alt outlines them
   * all (but the secrets: the Easter eggs and the string lights).
   */
  clickTargets(): ClickTarget[] {
    const L = this.L;
    if (!L) return [];
    const out: ClickTarget[] = [];
    const list = [...this.agents.values()].filter((a) => !a.leaving).sort((p, q) => q.y - p.y);
    for (const a of list) {
      const top = this.headTop(a) - 2;
      out.push({ hit: { kind: "agent", id: a.id }, rect: { x: this.drawX(a) - 8, y: top, w: 17, h: this.drawY(a) + 2 - top } });
    }
    for (const h of this.crew.targets()) out.push({ hit: { kind: "helper", id: h.id, key: h.key }, rect: h.rect });
    for (const n of this.npcs) {
      const ny = n.y - this.climbOf(n);
      out.push({ hit: { kind: "npc", who: n.kind }, rect: { x: n.x - 8, y: ny - ANCHOR_Y + 2, w: 17, h: ANCHOR_Y } });
    }
    for (const k of this.kids) out.push({ hit: { kind: "npc", who: "kid" }, rect: { x: k.x - 6, y: k.y - KID_H, w: 13, h: KID_H + 2 } });
    out.push({ hit: { kind: "dog" }, rect: { x: this.dog.x - 10, y: this.dog.y - 15, w: 20, h: 17 } });
    out.push({ hit: { kind: "roomba" }, rect: { x: this.roomba.x - 8, y: this.roomba.y - 7, w: 17, h: 10 } });
    if (this.season === "easter") {
      for (const [i, p] of this.eggs.entries()) {
        if (!this.eggsFound.has(i)) out.push({ hit: { kind: "egg", index: i }, rect: { x: p.x - 4, y: p.y - 8, w: 9, h: 11 }, secret: true });
      }
    }
    out.push({ hit: { kind: "cat" }, rect: { x: this.cat.x - 9, y: this.cat.y - 13, w: 18, h: 15 } });
    const w = L.wall;
    for (const sp of L.speakers) out.push({ hit: { kind: "speaker" }, rect: sp });
    out.push({ hit: { kind: "tv" }, rect: L.tv });
    out.push({ hit: { kind: "legend" }, rect: { x: w.legendNote.x - 1, y: w.legendNote.y - 1, w: w.legendNote.w + 2, h: w.legendNote.h + 2 } });
    out.push({ hit: { kind: "pinboard" }, rect: w.pinboard });
    out.push({ hit: { kind: "door" }, rect: { x: w.door.x - 3, y: w.door.y - 15, w: w.door.w + 6, h: w.door.h + 15 } });
    out.push({ hit: { kind: "calendar" }, rect: w.calendar });
    out.push({ hit: { kind: "status" }, rect: w.status });
    const cr = w.clock.r + 2;
    out.push({ hit: { kind: "clock" }, rect: { x: w.clock.x - cr, y: w.clock.y - cr, w: cr * 2, h: cr * 2 }, round: true });
    for (let i = L.pokeables.length - 1; i >= 0; i--) {
      const p = L.pokeables[i]!;
      out.push({ hit: { kind: "poke", id: p.id, poke: p.kind }, rect: p.rect });
    }
    for (const [i, win] of w.windows.entries()) out.push({ hit: { kind: "window", index: i }, rect: win });
    out.push({ hit: { kind: "lights" }, rect: { x: 0, y: 0, w: L.W, h: 7 }, secret: true });
    const occupied = new Set([...this.agents.values()].map((a) => a.spot?.id ?? a.target));
    for (const d of L.desks) {
      if (occupied.has(d.spot.id)) continue;
      const area = d.side === "north" ? { x: d.x + 20, y: d.y - 10, w: 22, h: 30 } : { x: d.x + 20, y: d.y + 12, w: 24, h: 32 };
      out.push({ hit: { kind: "desk", index: d.index }, rect: area });
    }
    for (const c of this.sceneryClickables()) out.push({ hit: { kind: "scenery", id: c.id, hover: c.hover }, rect: c.rect, secret: c.secret });
    return out;
  }

  /** Corner brackets around everything you can click, breathing a little (Alt held). */
  private drawTargets(ctx: CanvasRenderingContext2D): void {
    const L = this.L!;
    ctx.save();
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(this.time * 3.2);
    for (const t of this.clickTargets()) {
      if (t.secret) continue;
      const x0 = Math.max(0, Math.round(t.rect.x) - 1);
      const y0 = Math.max(0, Math.round(t.rect.y) - 1);
      const x1 = Math.min(L.W - 2, Math.round(t.rect.x + t.rect.w));
      const y1 = Math.min(L.H - 2, Math.round(t.rect.y + t.rect.h));
      if (x1 - x0 < 3 || y1 - y0 < 3) continue;
      const arm = Math.max(2, Math.min(5, Math.floor(Math.min(x1 - x0, y1 - y0) / 3)));
      for (const [color, d] of [[OUTLINE, 1], [TARGET_COLOR, 0]] as const) {
        ctx.fillStyle = color;
        for (const [cx, sx] of [[x0, 1], [x1, -1]] as const) {
          for (const [cy, sy] of [[y0, 1], [y1, -1]] as const) {
            ctx.fillRect(sx > 0 ? cx + d : cx - arm + 1 + d, cy + d, arm, 1);
            ctx.fillRect(cx + d, sy > 0 ? cy + d : cy - arm + 1 + d, 1, arm);
          }
        }
      }
    }
    ctx.restore();
  }

  /** The scenery's things to click (asked once per plan and theme). */
  sceneryClickables(): SceneryClickable[] {
    const L = this.L;
    if (!L || !this.theme.clickables) return [];
    const c = this.sceneryClicks;
    if (c?.L !== L || c.theme !== this.theme) this.sceneryClicks = { L, theme: this.theme, list: this.theme.clickables(L) };
    return this.sceneryClicks!.list;
  }

  /** Something in the scenery was clicked: the theme starts its show. */
  clickScenery(id: string, x: number, y: number): void {
    const L = this.L;
    if (!L || !this.theme.click) return;
    const sound = this.theme.click(id, this.sceneryActions(L, x, y));
    if (sound) this.emit(sound, false);
  }

  /** What a scenery can do with the people in the office, from a click or its own tick. */
  private sceneryActions(L: Layout, x: number, y: number): SceneryActions {
    return {
      t: this.time,
      hour: this.hour,
      night: this.skyColors(this.hour).night,
      weather: this.weather,
      date: new Date(),
      season: this.season,
      L,
      at: { x, y },
      gather: (spots, seconds, cues, min) => this.gather(spots, seconds, cues ?? [], min ?? 1),
      near: (x, y, r) =>
        [...this.agents.values()]
          .filter((a) => !a.leaving && Math.hypot(a.x - x, a.y - y) <= r)
          .sort((p, q) => Math.hypot(p.x - x, p.y - y) - Math.hypot(q.x - x, q.y - y))
          .map((a) => ({ id: a.id, x: a.x, y: a.y })),
      say: (who, text, seconds, delay = 0) => {
        if (delay > 0) this.sayLater.push({ at: this.time + delay, id: who, text, seconds });
        else this.say(who, text, seconds);
      },
      play: (name) => this.emit(name, false),
    };
  }

  /** Native point above an agent's head, for tooltips. */
  anchorOf(id: string): Point | null {
    const a = this.agents.get(id);
    if (!a) return null;
    return { x: this.drawX(a), y: this.headTop(a) - 4 };
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

  /** Open a window for a moment: the weather comes in, and you hear it. */
  openWindow(index: number): void {
    const L = this.L;
    const win = L?.wall.windows[index];
    if (!L || !win) return;
    const t = this.time;
    this.anim.set(`window-${index}`, t + 5);
    const night = this.skyColors(this.hour).night > 0.5;
    const wx = this.weather;
    const classic: SoundName =
      wx === "storm" ? "thunder" : wx === "rain" || wx === "drizzle" ? "rainfall" : wx === "snow" || wx === "cloudy" ? "wind" : wx === "fog" ? "foghorn" : night ? "crickets" : "birds";
    const sound = this.theme.outdoor?.(wx, night) ?? classic;
    this.emit(sound, false);
    const seg = L.segments.find((sg) => win.x >= sg.x0 && win.x < sg.x1);
    const sill = win.y + win.h + 1;
    const floor = (seg?.depth ?? 64) + 14;
    const month = new Date().getMonth();
    for (let i = 0; i < 7; i++) {
      const x = win.x + 6 + this.rand() * (win.w - 12);
      const fall = Math.max(0.6, (floor - sill) / 22);
      if (wx === "snow") this.particles.push({ kind: "snow", x, y: sill, vx: (this.rand() - 0.5) * 6, vy: 10 + this.rand() * 6, life: 0, max: fall * 1.6, color: "#ffffff" });
      else if (wx === "rain" || wx === "drizzle" || wx === "storm") this.particles.push({ kind: "drop", x, y: sill, vx: 0, vy: 40, life: 0, max: 0.5 + this.rand() * 0.3, color: "#9fc8ff" });
      else if (i < 3) {
        const autumn = month >= 8 && month <= 10;
        const color = autumn ? ["#e0913a", "#c95f2c", "#e8c14a"][i % 3]! : "#86e07f";
        this.particles.push({ kind: "leaf", x, y: sill, vx: (this.rand() - 0.5) * 14, vy: 4, life: 0, max: 1.8, color, g: 14 });
      }
    }
  }

  /** Nudge the roomba: off it goes (or back home). */
  bumpRoomba(): void {
    const r = this.roomba;
    this.emit("beep", false);
    if (r.active) {
      r.returning = true;
      return;
    }
    r.active = true;
    r.returning = false;
    r.until = this.time + 35;
    r.vx = this.rand() < 0.5 ? -12 : 12;
    r.vy = -6;
  }

  /** The string lights do a little chase. */
  twinkle(): void {
    this.anim.set("lights", this.time + 6);
    this.emit("twinkle", false);
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
        if (this.dog.state !== "follow" && this.golf?.phase !== "fetch") this.dogTo("boss");
        break;
      case "putt":
        this.startPutt();
        break;
      case "cradle":
        this.anim.set("cradle", t + 1.6);
        this.emit("clack", false);
        break;
      case "hoop":
        this.startShot();
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
        // All that blinking makes someone idle curious…
        if (this.startMishap()) {
          const who = this.mishap ? this.agents.get(this.mishap.id) : undefined;
          if (who) this.say(who.id, this.rand() < 0.5 ? "I'll take a look!" : "Ooh, blinky lights.", 2.4);
        }
        for (let i = 0; i < 10; i++) {
          this.particles.push({ kind: "sparkle", x: r.x + this.rand() * r.w, y: r.y + 4 + this.rand() * (r.h - 10), vx: 0, vy: -6, life: 0, max: 0.6 + this.rand() * 0.6, color: this.rand() < 0.5 ? "#7fd1ff" : "#c39bff" });
        }
        break;
      case "couch": {
        this.anim.set("couch", t + 1.2);
        this.emit("squeak", false);
        for (let i = 0; i < 6; i++) {
          this.particles.push({ kind: "powder", x: r.x + 6 + this.rand() * (r.w - 12), y: r.y + r.h - 8, vx: (this.rand() - 0.5) * 10, vy: -6 - this.rand() * 4, life: 0, max: 0.9, color: "#e8dcc8" });
        }
        break;
      }
      case "beanbag": {
        this.anim.set(id, t + 0.8);
        this.emit("squish", false);
        for (let i = 0; i < 4; i++) {
          this.particles.push({ kind: "powder", x: r.x + 4 + this.rand() * (r.w - 8), y: r.y + r.h - 4, vx: (this.rand() - 0.5) * 12, vy: -4, life: 0, max: 0.7, color: "#f0e6f5" });
        }
        const sleeper = [...this.agents.values()].find((a) => this.settled(a) && a.spot?.id === id);
        if (sleeper) this.say(sleeper.id, this.rand() < 0.5 ? "Five more minutes…" : "Zzz… huh?", 2.4);
        break;
      }
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
      if (a.glide && !(a.path[0] && a.glide.pts.has(glideKey(a.path[0])))) a.glide = null;
      const pace = a.glide ? a.glide.pace : a.pace;
      if (a.path.length > 0 && step(a, dt, a.slow ? SLOW_SPEED : WALK_SPEED * pace * (0.82 + ((a.seed >>> 11) % 36) / 100))) {
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
        a.nextBlink = t + 2.5 + ((a.seed >>> 3) % 40) / 10 + this.rand() * 2;
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

    if (this.theme.tick && t >= this.nextSceneryTick) {
      this.nextSceneryTick = t + 0.5;
      this.theme.tick(this.sceneryActions(L, 0, 0));
    }
    this.updateCat(dt);
    this.updateDog(dt);
    this.updateRoomba(dt);
    this.updateFish(dt);
    this.updatePingPong(dt);
    this.updateWhiteboard();
    this.updateTyping();
    this.updateVisitors(dt);
    this.updateKids(dt);
    this.updateEvent(dt);
    this.updateMachines(dt);
    this.updateHuddles(dt);
    this.updateNeighborChat();
    if (this.sayLater.length > 0) {
      const due = this.sayLater.filter((s) => this.time >= s.at);
      this.sayLater = this.sayLater.filter((s) => this.time < s.at);
      for (const s of due) this.say(s.id, s.text, s.seconds);
    }
    this.updateMishap(dt);
    this.updateWeather();
    this.updateBroken(dt);
    this.crew.update(dt, t);
    this.updateGolf(dt);
    this.updateShot(dt);
    this.updateVisit(dt);
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

  /** A soft clatter of keys now and then while anyone works at a desk (an ambient sound). */
  private updateTyping(): void {
    const t = this.time;
    if (t < this.nextKeys) return;
    const typists = [...this.agents.values()].filter(
      (a) => a.spot?.kind === "desk" && a.path.length === 0 && a.thread.mood === "working" && !a.thread.visionPro && !a.leaving,
    ).length;
    if (typists === 0) {
      this.nextKeys = t + 1;
      return;
    }
    this.emit("typing", true);
    // More typists, more often, but never a wall of noise.
    this.nextKeys = t + (2.6 + this.rand() * 3) / Math.min(3, Math.sqrt(typists));
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
    const colors = this.theme.boardInk ?? ["#3e8ed0", "#e5484d", "#30a46c", "#3a3046"];
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

  /** The way into your office: your guests' path, or yours when there are no guest chairs (separate homes). */
  private bossEntry(): Point[] {
    const L = this.L!;
    return L.byId.get("boss-guest-0")?.path ?? L.boss.way ?? [{ x: L.boss.seat.x, y: L.net.halls[0]!, c: true }, L.boss.seat, L.boss.seat];
  }

  private dogBedPath(): Point[] {
    const L = this.L!;
    const g = this.bossEntry();
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
      const g = this.bossEntry();
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
    // Busy fetching your golf ball (updateGolf walks it).
    if (this.golf?.fetch) return;
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

  // ------------------------------------------------------------------ your desk toys

  /** Off to the putting green (if there is one and you're at your desk). */
  private startPutt(): void {
    const L = this.L!;
    const G = L.boss.toys?.green;
    if (!G || this.bossAt || this.shot?.ball) return;
    const r = this.rand();
    const outcome: Golf["outcome"] = r < 0.3 ? "in" : r < 0.55 ? "lip" : r < 0.8 ? "short" : "desk";
    this.bossWalk(G.walk.map((p) => ({ x: p.x, y: p.y })));
    this.golf = { phase: "out", until: 0, outcome, roll: null, fetch: null, fetched: false };
  }

  private updateGolf(dt: number): void {
    const g = this.golf;
    const b = this.bossAt;
    const L = this.L!;
    const G = L.boss.toys?.green;
    if (!g || !b || !G) return;
    const t = this.time;
    switch (g.phase) {
      case "out":
        if (step(b, dt, BOSS_SPEED)) {
          // A fresh ball on the line, a moment to line it up.
          b.facing = "right";
          this.golfBall = { x: G.tee.x, y: G.tee.y };
          g.phase = "aim";
          g.until = t + 1.2;
        }
        break;
      case "aim":
        if (t >= g.until) this.putt(g, G);
        break;
      case "roll": {
        const k = Math.min(1, (t - g.roll!.at) / g.roll!.dur);
        this.golfBall = this.rollAt(g, G, k);
        if (k >= 1) this.putted(g, G);
        break;
      }
      case "fetch":
        this.fetchBall(g, G, dt);
        break;
      case "react":
        if (t >= g.until) {
          g.phase = "back";
          b.path = [...G.walk.slice(0, -1).reverse(), L.boss.seat].map((p) => ({ x: p.x, y: p.y }));
        }
        break;
      case "back":
        if (step(b, dt, BOSS_SPEED)) {
          this.bossAt = null;
          this.golf = null;
        }
        break;
    }
  }

  private putt(g: Golf, G: Green): void {
    const L = this.L!;
    const t = this.time;
    const from = { x: G.tee.x, y: G.tee.y };
    const d = G.cup.x - from.x;
    this.emit("putt", false);
    g.phase = "roll";
    if (g.outcome === "in") g.roll = { from, via: null, to: { x: G.cup.x, y: G.cup.y }, at: t, dur: 0.6 + d / 60 };
    else if (g.outcome === "lip") g.roll = { from, via: null, to: { x: G.cup.x + 6, y: G.cup.y + 2 }, at: t, dur: 1 + d / 55 };
    else if (g.outcome === "short") {
      const k = 0.35 + this.rand() * 0.25;
      g.roll = { from, via: null, to: { x: Math.round(from.x + d * k), y: from.y }, at: t, dur: 0.5 + (d * k) / 50 };
    } else {
      // Sliced: off the green and under the desk, at the end nearer the green.
      const desk = L.boss.desk;
      const right = G.rect.x + G.rect.w / 2 > desk.x + desk.w / 2;
      const to = { x: right ? desk.x + desk.w - 10 : desk.x + 10, y: desk.y + 16 };
      g.roll = { from, via: { x: from.x + 24, y: from.y + 2 }, to, at: t, dur: 1.2 };
    }
  }

  /** Where the rolling ball is, k = 0..1 of the way. */
  private rollAt(g: Golf, G: Green, k: number): Point {
    const r = g.roll!;
    const lerp = (a: Point, b: Point, e: number) => ({ x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e });
    if (g.outcome === "lip") {
      // Up to the cup, round the rim once, and out the other side.
      const cup = G.cup;
      const ring = (a: number) => ({ x: cup.x + Math.cos(a) * 2.5, y: cup.y + Math.sin(a) * 1.5 });
      if (k < 0.55) return lerp(r.from, ring(Math.PI), 1 - (1 - k / 0.55) ** 1.4);
      if (k < 0.85) return ring(Math.PI + ((k - 0.55) / 0.3) * Math.PI * 2.2);
      return lerp(ring(Math.PI * 3.2), r.to, 1 - (1 - (k - 0.85) / 0.15) ** 2);
    }
    const e = 1 - (1 - k) ** 2;
    if (!r.via) return lerp(r.from, r.to, e);
    const u = 1 - e;
    return { x: u * u * r.from.x + 2 * u * e * r.via.x + e * e * r.to.x, y: u * u * r.from.y + 2 * u * e * r.via.y + e * e * r.to.y };
  }

  /** The ball stopped: in, lipped out, short, or under the desk (the dog may fetch it). */
  private putted(g: Golf, G: Green): void {
    const L = this.L!;
    const t = this.time;
    const pick = (lines: string[]) => lines[Math.floor(this.rand() * lines.length)]!;
    g.phase = "react";
    g.until = t + 1.8;
    if (g.outcome === "in") {
      this.golfBall = { x: G.cup.x, y: G.cup.y, sunk: true };
      this.emit("cup", false);
      this.emit("cheer", false);
      this.flagUntil = t + 1.6;
      this.burst(G.cup.x, G.cup.y - 16, "sparkle", 6);
      this.say("boss", pick(["Yes!", "In the hole!", "Still got it."]), 2);
      this.remark(["Nice putt!", "{They} sank it!", "Hole in one!"]);
    } else if (g.outcome === "lip") {
      this.flagUntil = t + 0.5;
      this.say("boss", pick(["Nooo!", "Lipped out…", "So close!"]), 2);
      this.remark(["Ooh, {they} almost had it.", "Lipped out!"]);
    } else if (g.outcome === "short") {
      this.say("boss", pick(["Hmm. Slow green.", "Bit short."]), 2);
      this.remark(["Never up, never in!", "Give it some more!"]);
    } else {
      this.golfBall = null;
      const d = this.dog;
      const room = L.boss.room;
      const around = d.state !== "follow" && d.path.length === 0 && d.goal !== "event" && inRect(d.x, d.y, { x: room.x, y: room.y - 4, w: room.w, h: room.h + 8 });
      this.say("boss", around ? "Fore! Fetch!" : pick(["Fore!", "Where did it go?"]), 2.2);
      this.remark(["It went under the desk!", "Fore!"]);
      if (around) {
        // The dog dives under the desk for it and brings it back to you.
        g.phase = "fetch";
        g.fetch = { step: 0 };
        d.state = "walk";
        d.path = [{ x: g.roll!.to.x, y: L.boss.desk.y + 32 }];
      }
    }
  }

  private fetchBall(g: Golf, G: Green, dt: number): void {
    const d = this.dog;
    const t = this.time;
    const f = g.fetch!;
    if (f.step === 0) {
      if (step(d, dt, 44)) {
        f.step = 1;
        g.until = t + 1;
        d.happyUntil = t + 1;
      }
    } else if (f.step === 1) {
      if (t >= g.until) {
        f.step = 2;
        d.path = [{ x: G.stand.x + 16, y: G.stand.y + 3 }];
      }
    } else if (step(d, dt, 40)) {
      d.facing = "left";
      d.state = "sit";
      d.goal = "boss";
      d.until = t + 8;
      d.happyUntil = t + 3;
      this.golfBall = { x: G.stand.x + 9, y: G.stand.y + 3 };
      this.hearts(d.x, d.y - 16, 3);
      this.bark(false);
      this.say("boss", "Good dog!", 2);
      g.fetch = null;
      g.fetched = true;
      g.phase = "react";
      g.until = t + 1.6;
    }
  }

  /** Someone in your office says something about your putt. */
  private remark(lines: string[]): void {
    const room = this.L!.boss.room;
    const near = [...this.agents.values()].filter((a) => this.settled(a) && inRect(a.x, a.y, room));
    const who = near[Math.floor(this.rand() * near.length)];
    if (!who || this.rand() < 0.25) return;
    const line = lines[Math.floor(this.rand() * lines.length)]!;
    window.setTimeout(() => this.say(who.id, line, 2.6), 700);
  }

  /** A crumpled paper ball at the hoop, thrown from your chair. */
  private startShot(): void {
    const hoop = this.L!.boss.toys?.hoop;
    if (!hoop || this.bossAt || (this.shot && this.shot.phase !== "rest")) return;
    this.shot = { phase: "windup", until: this.time + 0.45, swish: this.rand() < 0.55, ball: null };
    this.emit("crumple", false);
  }

  private updateShot(dt: number): void {
    const s = this.shot;
    const L = this.L!;
    const hoop = L.boss.toys?.hoop;
    if (!s || !hoop) return;
    const t = this.time;
    const G = 200;
    const b = s.ball;
    if (b && (s.phase === "fly" || s.phase === "drop" || s.phase === "bounce")) {
      b.vy += G * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    const pick = (lines: string[]) => lines[Math.floor(this.rand() * lines.length)]!;
    switch (s.phase) {
      case "windup":
        if (t >= s.until) {
          // From your raised hand onto the rim (or its near edge).
          const seat = L.boss.seat;
          const from = { x: seat.x + 5, y: seat.y - 22 };
          const side = from.x < hoop.x ? -1 : 1;
          const to = { x: hoop.x + (s.swish ? 0 : side * 4), y: hoop.y - 1 };
          const T = 0.55 + Math.abs(to.x - from.x) / 350;
          s.ball = { x: from.x, y: from.y, vx: (to.x - from.x) / T, vy: (to.y - from.y - 0.5 * G * T * T) / T };
          s.phase = "fly";
          s.until = t + T;
        }
        break;
      case "fly":
        if (t >= s.until && b) {
          if (s.swish) {
            this.emit("swish", false);
            b.x = hoop.x;
            b.vx = 0;
            b.vy = 20;
            s.phase = "drop";
            if (this.rand() < 0.6) this.say("boss", pick(["Swish!", "Nothing but net."]), 1.8);
          } else {
            this.emit("clank", false);
            b.vx = -Math.sign(b.vx || 1) * 34;
            b.vy = -46;
            s.phase = "bounce";
            if (this.rand() < 0.6) this.say("boss", pick(["Clank.", "Off the rim!"]), 1.8);
          }
          s.until = t + 1.3;
        }
        break;
      case "drop":
        // Through the net into the bin.
        if (b && b.y >= hoop.y + 7) s.ball = null;
        if (t >= s.until) this.shot = null;
        break;
      case "bounce": {
        const floor = hoop.y + 18;
        if (b && b.y >= floor && b.vy > 0) {
          b.y = floor;
          s.phase = "rest";
          s.until = t + 9;
        }
        break;
      }
      case "rest":
        if (t >= s.until) this.shot = null;
        break;
    }
  }

  /** You up from your desk (or on from wherever you are) along `path`. */
  private bossWalk(path: Point[]): Walker {
    const L = this.L!;
    const b = this.bossAt ?? { x: L.boss.seat.x, y: L.boss.seat.y, path: [], approach: [...(L.boss.way ?? [])], facing: "front", walked: 0, cut: 10 };
    b.path = path;
    this.bossAt = b;
    return b;
  }

  // ------------------------------------------------------------------ you at the arcade

  /**
   * The arcade's game opened or closed (the view's cabinet). Open: you head
   * over once you're free (not out on the green) and play along; closed:
   * back to your desk.
   */
  arcade(open: boolean): void {
    const v = this.visit;
    if (open) {
      if (!v) this.visit = { phase: "wait", until: 0, open: true, watch: null };
      else {
        v.open = true;
        if (v.phase === "back") this.toArcade(v);
      }
      return;
    }
    if (!v) return;
    v.open = false;
    if (v.phase === "wait") this.visit = null;
    else if (v.phase === "out" || v.phase === "play") this.leaveArcade(v);
  }

  /** A game on the arcade ended: if you're there, you cheer or sulk, and say `line`. */
  arcadeResult(won: boolean, line: string): void {
    const v = this.visit;
    const b = this.bossAt;
    if (!v || !b || b.path.length > 0 || (v.phase !== "play" && v.phase !== "won" && v.phase !== "lost")) return;
    const t = this.time;
    v.phase = won ? "won" : "lost";
    v.until = t + 5.2;
    if (won) this.burst(b.x, b.y - 30, "confetti", 18);
    // The jump (or the cloud) first, then the words (the bubble would hide them), then whoever
    // came to watch chimes in, one at a time.
    this.speech.delete("boss");
    this.sayLater = this.sayLater.filter((l) => l.id !== "boss");
    this.sayLater.push({ at: t + 1.4, id: "boss", text: line, seconds: 2.6 });
    const pick = (lines: string[]) => lines[Math.floor(this.rand() * lines.length)]!;
    this.watchers(v).forEach((a, i) => {
      const text = won ? pick(["Woo! Nice one!", "{They} did it!", "Teach me that!"]) : pick(["Oof. So close.", "Next time, boss.", "Ouch."]);
      this.sayLater.push({ at: t + 4.1 + i * 2.4, id: a.id, text, seconds: 2.2 });
    });
  }

  /** You're at the arcade or on your way: it's not free for anyone else. */
  private get atArcade(): boolean {
    const p = this.visit?.phase;
    return p === "out" || p === "play" || p === "won" || p === "lost";
  }

  private updateVisit(dt: number): void {
    const v = this.visit;
    const b = this.bossAt;
    if (!v) return;
    const t = this.time;
    switch (v.phase) {
      case "wait":
        // Once you're back at your desk from the green or a shot at the hoop.
        if (!b && !this.golf && !(this.shot && this.shot.phase !== "rest")) this.toArcade(v);
        break;
      case "out":
        if (b && step(b, dt, BOSS_SPEED)) {
          v.phase = "play";
          b.facing = "back";
          this.watchArcade(v);
        }
        break;
      case "won":
      case "lost":
        if (b && v.phase === "won" && this.rand() < dt * 6) {
          this.particles.push({ kind: "sparkle", x: b.x + (this.rand() - 0.5) * 22, y: b.y - 18 - this.rand() * 20, vx: 0, vy: -6, life: 0, max: 0.5, color: this.rand() < 0.5 ? "#ffd84a" : "#ffffff" });
        }
        if (b && v.phase === "lost" && this.rand() < dt * 7) {
          // Drizzle from your own little rain cloud.
          this.particles.push({ kind: "drop", x: b.x - 4 + this.rand() * 10, y: b.y - ANCHOR_Y - 4, vx: 0, vy: 22, life: 0, max: 0.4, color: "#7fb8e6" });
        }
        if (t >= v.until) {
          if (v.open) v.phase = "play";
          else this.leaveArcade(v);
        }
        break;
      case "back":
        if (b && step(b, dt, BOSS_SPEED)) {
          this.bossAt = null;
          this.visit = null;
        }
        break;
    }
  }

  /** Up from your desk (or turn round on your way back) and over to the arcade. */
  private toArcade(v: Visit): void {
    const L = this.L!;
    const spot = L.byId.get("arcade");
    if (!spot || !L.boss.way) return;
    const b = this.bossWalk([]);
    b.path = route(b, L.net, spot.path);
    v.phase = "out";
    // Whoever's playing it finds something else to do.
    this.eventVersion++;
  }

  private leaveArcade(v: Visit): void {
    const L = this.L!;
    const h = this.huddles.find((x) => x.show !== undefined && x.show.gathering === v.watch);
    if (h) this.endHuddle(h);
    v.watch = null;
    v.phase = "back";
    this.bossAt!.path = route(this.bossAt!, L.net, L.boss.way!);
    this.eventVersion++;
  }

  /** Now and then someone idle nearby comes over to watch you play. */
  private watchArcade(v: Visit): void {
    const spot = this.L!.byId.get("arcade");
    if (!spot || spot.path.length < 3 || this.rand() < 0.3) return;
    const near = this.freeIdle().filter((a) => Math.hypot(a.x - spot.x, a.y - spot.y) < 200).length;
    if (near === 0) return;
    const lane = spot.path[spot.path.length - 2]!;
    const at = (dx: number, dy: number): GatherSpot => {
      const x = spot.x + dx;
      const y = spot.y + dy;
      return { x, y, facing: "right", pose: "stand", activity: "watching you play", path: [...spot.path.slice(0, -2), { x, y: lane.y }, { x, y }] };
    };
    v.watch = this.gather([at(-20, 2), at(-34, 5)].slice(0, near), 150, [], 1);
  }

  private watchers(v: Visit): Agent[] {
    const h = this.huddles.find((x) => x.show !== undefined && x.show.gathering === v.watch);
    if (!h) return [];
    return h.members.map((id) => this.agents.get(id)).filter((a): a is Agent => a !== undefined && a.huddle === h.id && this.settled(a));
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
    // The technician does the rounds in working hours (or comes when the servers act up).
    if (this.nextTech < 0) this.nextTech = t + 360 + this.rand() * 540;
    if (t > this.nextTech && !this.npcs.some((n) => n.kind === "technician")) {
      if ((h >= 7 && h < 20) || this.rackBroken) this.spawnNpc("technician");
      this.nextTech = t + 1080 + this.rand() * 1080;
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
          else if (n.kind === "delivery") {
            n.pause = 3.4;
            this.deliver(n);
          } else if (n.kind === "technician") {
            n.job = n.jobs.shift() ?? null;
            n.pause = n.jobDur = n.job ? (n.job.kind === "bulb" ? 9 : 7.5) : 0.3;
            if (n.job) n.facing = n.job.facing;
            if (n.job?.kind === "pc" && this.rand() < 0.5) this.say(n.id, "Have you tried turning it off and on again?", 3.5);
            else if (n.job?.kind === "bulb" && this.rand() < 0.4) this.say(n.id, "How many techs does it take…", 3);
          } else {
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
        } else if (n.kind === "technician") {
          const j = n.job;
          if (j) {
            const busy = j.kind !== "bulb" || this.climbOf(n) > 8;
            if (busy && this.rand() < dt * 0.9) this.emit(this.rand() < 0.55 ? "wrench" : "drill", true);
            if (busy && this.rand() < dt * 3) {
              const hy = n.y - 18 - this.climbOf(n) - (j.kind === "bulb" ? 10 : 0);
              this.particles.push({ kind: "sparkle", x: n.x + (this.rand() - 0.5) * 10, y: hy, vx: 0, vy: -4, life: 0, max: 0.3, color: "#ffe066" });
            }
            if (n.pause <= 0) {
              this.finishJob(n, j);
              n.job = null;
            }
          }
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
      look: this.npcLookOf(kind),
      x: L.entrance.x,
      y: L.entrance.y,
      path: [],
      approach: [L.entrancePath[0]!, L.entrance],
      facing: "front",
      walked: 0,
      stops: [],
      pause: 0,
      leaving: false,
      jobs: [],
      job: null,
      jobDur: 0,
      lane: { x: Math.round((this.rand() - 0.5) * 8), y: Math.round((this.rand() - 0.5) * 6) },
      cut: 8 + Math.floor(this.rand() * 8),
      sway: 1 + Math.floor(this.rand() * 3),
    };
    if (kind === "delivery") {
      const stop = this.deliveryStop();
      if (!stop) return;
      n.stops = [stop];
    } else if (kind === "technician") {
      const plan = this.technicianJobs();
      if (plan.length === 0) return;
      n.stops = plan.map((p) => p.stop);
      n.jobs = plan.map((p) => p.job);
      for (const { job } of plan) {
        if (job.kind === "pc") this.brokenDesk = job.desk ?? null;
        else if (job.kind === "bulb") {
          const bulbs = this.bulbXs();
          const lx = job.ladderX ?? 0;
          this.brokenBulbX = bulbs.length > 0 ? bulbs.reduce((b, x) => (Math.abs(x - lx) < Math.abs(b - lx) ? x : b)) : null;
        } else if (job.kind === "coffee" || job.kind === "printer" || job.kind === "vending") this.brokenMachine = job.kind;
      }
    } else if (kind === "janitor") {
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
      // Lunch together once a day, some time after noon.
      if (this.lunchDay !== this.dayKey && this.hour >= 12 && this.hour < 13.5) {
        if (this.lunchAt < 0) this.lunchAt = t + 20 + this.rand() * 120;
        if (t > this.lunchAt) {
          const idle = [...this.agents.values()].filter((a) => this.settled(a) && a.thread.mood === "idle").length;
          this.lunchAt = -1;
          if (idle >= 2) this.startEvent("lunch", true);
          else this.lunchDay = this.dayKey;
          return;
        }
      }
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
    this.eventChatter(ev);
    if (ev.kind === "holiday" && this.rand() < 0.25) {
      // A little indoor snow around the tree.
      this.particles.push({ kind: "snow", x: ev.area.x + this.rand() * ev.area.w, y: ev.area.y - 4, vx: 0, vy: 7 + this.rand() * 4, life: 0, max: Math.max(3, ev.area.h / 9), color: "#ffffff" });
    }
    void L;
  }

  /** Guests at an event chat now and then (more at lunch). */
  private eventChatter(ev: LiveEvent): void {
    const t = this.time;
    if (t < ev.nextTalk || ev.kind === "lanterns" || ev.kind === "maifest" || ev.kind === "karaoke" || ev.kind === "yoga") return;
    const guests = this.eventPeople().filter((a) => this.settled(a) && !this.speech.has(a.id));
    ev.nextTalk = t + (ev.kind === "lunch" ? 3.5 : 6) + this.rand() * 5;
    if (guests.length < 2) return;
    const others = guests.filter((a) => a.id !== ev.lastSpeaker);
    const speaker = others[Math.floor(this.rand() * others.length)] ?? guests[0]!;
    let text: string | null = null;
    if (ev.kind === "lunch" && ev.food && (ev.talkTurn % 2 === 0 || !ev.talkTopic) && this.rand() < 0.55) {
      text = lunchLine(ev.food, (ev.lunchboxes ?? []).includes(speaker.spot!.id), ev.delivered === true, this.rand);
      ev.talkTopic = null;
    } else if (ev.talkTurn % 2 === 1 && ev.talkTopic && this.talk) {
      text = this.talk.reply(speaker.id, ev.talkTopic);
      ev.talkTopic = null;
    } else if (this.talk) {
      const line = this.talk.open(speaker.id);
      text = line?.text ?? null;
      ev.talkTopic = line?.topic ?? null;
      if (line) this.talk.gather(guests.map((a) => a.id).slice(0, 6));
    }
    ev.talkTurn++;
    if (!text) return;
    this.say(speaker.id, text, 3.4 + Math.min(3, text.length / 30));
    ev.lastSpeaker = speaker.id;
  }

  /** Where the delivery person hands over the food: the end of the lunch table. */
  private deliveryStop(): Point[] | null {
    const ev = this.event;
    if (!ev || ev.kind !== "lunch") return null;
    const via = ev.spots[0]?.path;
    if (!via || via.length < 2) return null;
    const table = lunchTable(ev);
    const x = table.x + table.w + 8;
    const y = table.y + 14;
    return [...via.slice(0, -2), { x, y: via[via.length - 2]!.y }, { x, y }];
  }

  /** The food arrives: on the table it goes, and everyone digs in. */
  private deliver(n: Npc): void {
    const ev = this.event;
    if (!ev || ev.kind !== "lunch" || ev.delivered) return;
    ev.delivered = true;
    n.facing = "left";
    this.say(n.id, deliveryLine(ev.food ?? "pizza", this.rand), 2.8);
    this.emit("dingdong", true);
    this.burst(ev.center.x, ev.center.y - 10, "sparkle", 8);
    const guest = this.eventPeople().find((a) => this.settled(a));
    if (guest) window.setTimeout(() => this.say(guest.id, this.rand() < 0.5 ? "Food's here!" : "Finally!", 2.2), 900);
    ev.nextTalk = this.time + 3.5;
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
      if (a.spot.id.endsWith("pingpong-l")) l = a;
      if (a.spot.id.endsWith("pingpong-r")) r = a;
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

  // ------------------------------------------------------------------ get-togethers

  /** Idle agents free to join something: settled in the kitchen or lounge. */
  private freeIdle(): Agent[] {
    return [...this.agents.values()].filter(
      (a) =>
        !a.leaving &&
        this.settled(a) &&
        a.thread.mood === "idle" &&
        a.huddle === null &&
        this.mishap?.id !== a.id &&
        (a.spot!.group === "break" || a.spot!.group === "lounge"),
    );
  }

  private shuffled<T>(list: T[]): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  }

  /** Get a few idle agents together (a random kind of get-together unless given). */
  startHuddle(kind?: HuddleKind): boolean {
    const L = this.L;
    if (!L || this.event) return false;
    const pool = this.shuffled(this.freeIdle());
    if (pool.length < 2) return false;
    if (this.remote) return this.startCall(pool, kind !== undefined);
    const taken = new Set(this.currentSpots().values());
    for (const h of this.huddles) for (const sp of h.spots) taken.add(sp.id.replace(/^huddle-\d+-/, ""));
    const free = (id: string) => L.byId.has(id) && !taken.has(id);
    const couch = L.spots.filter((sp) => sp.kind === "couch" && !taken.has(sp.id)).sort((p, q) => p.x - q.x);
    const options: [HuddleKind, number][] = [];
    if (L.byId.has("coffee")) options.push(["coffee", 3]);
    if (L.byId.has("cooler")) options.push(["cooler", 2]);
    options.push(["chat", 2]);
    if (free("pingpong-l") && free("pingpong-r")) options.push(["pingpong", 2]);
    if (free("darts")) options.push(["darts", 1.5]);
    if (couch.length >= 2) options.push(["couch", 1]);
    let k = kind && options.some(([o]) => o === kind) ? kind : undefined;
    if (!k) {
      let roll = this.rand() * options.reduce((n, [, w]) => n + w, 0);
      for (const [o, w] of options) {
        roll -= w;
        if (roll <= 0) {
          k = o;
          break;
        }
      }
      k ??= "chat";
    }
    const two = k === "pingpong" || k === "darts" || k === "cooler";
    const size = two ? 2 : pool.length >= 3 && this.rand() < 0.45 ? 3 : 2;
    const id = ++this.huddleSeq;
    const spots = this.huddleSpots(k, id, size, couch);
    if (!spots || spots.length < 2) return false;
    const members = pool.slice(0, spots.length);
    const t = this.time;
    const dur = { coffee: [40, 25], cooler: [30, 20], chat: [35, 25], couch: [60, 30], pingpong: [50, 30], darts: [45, 25] }[k];
    // Most get-togethers come with a chat (always when asked for one).
    const talky = k !== "pingpong" && k !== "darts" && (kind !== undefined || this.rand() < 0.9);
    const h: Huddle = {
      id,
      kind: k,
      members: members.map((a) => a.id),
      spots,
      until: t + dur[0]! + this.rand() * dur[1]!,
      nextLine: Infinity,
      lines: 0,
      maxLines: talky ? 4 + Math.floor(this.rand() * 4) : 0,
      topic: null,
      lastSpeaker: null,
    };
    this.huddles.push(h);
    members.forEach((a, i) => {
      a.huddle = id;
      this.walkTo(a, spots[i]!);
    });
    if (h.maxLines > 0) this.talk?.gather(h.members);
    return true;
  }

  /** Separate homes: a get-together is a video call, two or three people each where they are. */
  private startCall(pool: Agent[], asked: boolean): boolean {
    const size = pool.length >= 3 && this.rand() < 0.35 ? 3 : 2;
    const members = pool.slice(0, size);
    const id = ++this.huddleSeq;
    const h: Huddle = {
      id,
      kind: "call",
      members: members.map((a) => a.id),
      // They stay at their own spots.
      spots: members.map((a) => a.spot!),
      until: this.time + 35 + this.rand() * 30,
      nextLine: Infinity,
      lines: 0,
      maxLines: asked || this.rand() < 0.9 ? 4 + Math.floor(this.rand() * 4) : 0,
      topic: null,
      lastSpeaker: null,
    };
    this.huddles.push(h);
    for (const a of members) a.huddle = id;
    this.emit("ring", false);
    if (h.maxLines > 0) this.talk?.gather(h.members);
    return true;
  }

  /** A scenery's show: the nearest idle people walk over to its spots (see Theme.click). */
  private gather(spots: GatherSpot[], seconds: number, cues: GatherCue[], min: number): Gathering | null {
    const L = this.L;
    if (!L || this.event || spots.length === 0) return null;
    const at = spots[0]!;
    const pool = this.freeIdle().sort((p, q) => Math.hypot(p.x - at.x, p.y - at.y) - Math.hypot(q.x - at.x, q.y - at.y));
    const n = Math.min(spots.length, pool.length);
    if (n === 0 || n < min) return null;
    const id = ++this.huddleSeq;
    const fromHall = (x: number, y: number): Point[] => {
      const hy = L.net.halls.reduce((b, h) => (Math.abs(h - y) < Math.abs(b - y) ? h : b));
      return [{ x, y: hy, c: true }, { x, y }];
    };
    const made: Spot[] = spots.slice(0, n).map((sp, i) => ({
      id: `huddle-${id}-${i}`,
      kind: "huddle",
      group: "lounge",
      x: sp.x,
      y: sp.y,
      facing: sp.facing,
      pose: sp.pose,
      activity: sp.activity,
      lift: sp.lift,
      path: sp.path ?? fromHall(sp.x, sp.y),
    }));
    const members = pool.slice(0, n);
    const gathering = { size: n, arrivedAt: null, done: false, present: made.map(() => false), ids: members.map((a) => a.id) };
    this.huddles.push({
      id,
      kind: "scenery",
      members: members.map((a) => a.id),
      spots: made,
      // Time to walk over; the stay starts once they're all there.
      until: this.time + 45 + seconds,
      nextLine: Infinity,
      lines: 0,
      maxLines: 0,
      topic: null,
      lastSpeaker: null,
      show: { gathering, stay: seconds, cues: [...cues].sort((p, q) => p.at - q.at), next: 0, leave: spots.slice(0, n).map((sp) => sp.leave) },
    });
    members.forEach((a, i) => {
      a.huddle = id;
      this.walkTo(a, made[i]!);
    });
    return gathering;
  }

  /** A show's cues, once everyone's there. */
  private playShow(h: Huddle, members: Agent[]): void {
    const show = h.show!;
    const g = show.gathering;
    const t = this.time;
    for (const [i, sp] of h.spots.entries()) g.present[i] = members.some((a) => this.settled(a) && a.spot!.id === sp.id);
    if (g.arrivedAt === null) {
      if (!members.every((a) => this.settled(a) && a.spot!.id.startsWith(`huddle-${h.id}-`))) return;
      g.arrivedAt = t;
      h.until = t + show.stay;
    }
    while (show.next < show.cues.length && t >= g.arrivedAt + show.cues[show.next]!.at) {
      const c = show.cues[show.next++]!;
      const spot = c.who !== undefined ? h.spots[c.who] : undefined;
      const who = spot ? members.find((a) => a.spot?.id === spot.id) : undefined;
      if (who && c.say) this.say(who.id, c.say, c.seconds ?? 3);
      if (c.sound) this.emit(c.sound, false);
    }
  }

  /** Where the get-together happens: spots made up for the occasion. */
  private huddleSpots(kind: HuddleKind, id: number, n: number, couch: Spot[]): Spot[] | null {
    const L = this.L!;
    const tag = (suffix: string) => `huddle-${id}-${suffix}`;
    const near = (base: Spot, suffix: string, dx: number, dy: number, facing: Facing, pose: Spot["pose"], activity: string): Spot => {
      const x = base.x + dx;
      const y = base.y + dy;
      return { id: tag(suffix), kind: "huddle", group: "lounge", x, y, facing, pose, activity, path: [...base.path.slice(0, -1), { x, y }] };
    };
    switch (kind) {
      case "coffee": {
        const c = L.byId.get("coffee");
        if (!c) return null;
        const at: [number, Facing][] = [
          [-9, "right"],
          [9, "left"],
          [25, "left"],
        ];
        return at.slice(0, n).map(([dx, f], i) => near(c, `${i}`, dx, 2, f, "cup", "coffee with a colleague"));
      }
      case "cooler": {
        const c = L.byId.get("cooler");
        if (!c) return null;
        return [near(c, "0", -2, 0, "right", "cup", "water cooler talk"), near(c, "1", 14, 0, "left", "cup", "water cooler talk")];
      }
      case "chat": {
        const hy = L.net.halls[Math.floor(this.rand() * L.net.halls.length)]!;
        const avoid = [L.entrance.x, ...L.net.aisles];
        let x = 0;
        for (let tries = 0; tries < 12; tries++) {
          x = Math.round(L.W * (0.15 + this.rand() * 0.7));
          if (avoid.every((v) => Math.abs(v - x) > 22)) break;
        }
        const at: [number, number, Facing][] = [
          [-9, 2, "right"],
          [9, 2, "left"],
          [0, -6, "front"],
        ];
        return at.slice(0, n).map(([dx, dy, f], i) => ({
          id: tag(`${i}`),
          kind: "huddle" as const,
          group: "lounge" as const,
          x: x + dx,
          y: hy + dy,
          facing: f,
          pose: "stand" as const,
          activity: "chatting in the hallway",
          path: [{ x: x + dx, y: hy, c: true }, { x: x + dx, y: hy + dy }],
        }));
      }
      case "couch":
        return couch.slice(0, n).map((sp, i) => ({ ...sp, id: tag(`${i}`), activity: "hanging out on the couch" }));
      case "pingpong": {
        const l = L.byId.get("pingpong-l");
        const r = L.byId.get("pingpong-r");
        if (!l || !r) return null;
        return [
          { ...l, id: tag("pingpong-l"), activity: "a ping-pong match" },
          { ...r, id: tag("pingpong-r"), activity: "a ping-pong match" },
        ];
      }
      case "darts": {
        const d = L.byId.get("darts");
        if (!d) return null;
        const dx = d.facing === "right" ? -16 : 16;
        return [{ ...d, id: tag("darts"), activity: "a game of darts" }, near(d, "watch", dx, 4, d.facing, "stand", "watching the darts")];
      }
    }
  }

  private updateHuddles(dt: number): void {
    const t = this.time;
    if (this.nextHuddleAt < 0) this.nextHuddleAt = t + 6 + this.rand() * 10;
    if (t > this.nextHuddleAt) {
      this.nextHuddleAt = t + 25 + this.rand() * 35;
      if (!this.event && this.huddles.length < 3) this.startHuddle();
    }
    for (const h of [...this.huddles]) {
      const members = h.members.map((id) => this.agents.get(id)).filter((a): a is Agent => a !== undefined && a.huddle === h.id);
      if (members.length < (h.show ? 1 : 2) || t > h.until) {
        this.endHuddle(h);
        continue;
      }
      if (h.show) {
        this.playShow(h, members);
        continue;
      }
      const prefix = `huddle-${h.id}-`;
      if (!members.every((a) => this.settled(a) && (h.kind === "call" || a.spot!.id.startsWith(prefix)))) continue;
      if (h.nextLine === Infinity) h.nextLine = t + 2 + this.rand() * 2;
      if (t < h.nextLine) continue;
      if (h.kind === "pingpong" || h.kind === "darts") {
        const who = members[Math.floor(this.rand() * members.length)]!;
        const lines = GAME_LINES[h.kind];
        this.say(who.id, lines[Math.floor(this.rand() * lines.length)]!, 2.2);
        h.nextLine = t + 7 + this.rand() * 8;
        continue;
      }
      if (h.lines >= h.maxLines || !this.talk) {
        h.nextLine = h.until + 1;
        continue;
      }
      if (h.lines % 2 === 0) {
        const others = members.filter((a) => a.id !== h.lastSpeaker);
        const speaker = others[Math.floor(this.rand() * others.length)] ?? members[0]!;
        const line = this.talk.open(speaker.id);
        if (!line) {
          h.lines = h.maxLines;
          continue;
        }
        this.say(speaker.id, line.text, 4 + Math.min(3, line.text.length / 30));
        h.topic = line.topic;
        h.lastSpeaker = speaker.id;
        h.nextLine = t + 4.6 + Math.min(3, line.text.length / 30);
      } else {
        const speaker = members.find((a) => a.id !== h.lastSpeaker) ?? members[0]!;
        const text = h.topic ? this.talk.reply(speaker.id, h.topic) : null;
        if (text) this.say(speaker.id, text, 3.4);
        h.lastSpeaker = speaker.id;
        h.nextLine = t + 4 + this.rand() * 5;
      }
      h.lines++;
    }
    void dt;
  }

  /** Idle neighbors (on the couch, at the counter) chat without getting up. */
  private updateNeighborChat(): void {
    const t = this.time;
    for (const r of [...this.replies]) {
      if (t < r.at) continue;
      this.replies = this.replies.filter((x) => x !== r);
      const a = this.agents.get(r.id);
      if (!a || !this.settled(a) || a.thread.mood !== "idle" || this.speech.has(a.id)) continue;
      const text = this.talk?.reply(a.id, r.topic);
      if (text) this.say(a.id, text, 3.2);
    }
    if (this.nextChatAt < 0) this.nextChatAt = t + 5 + this.rand() * 8;
    if (t < this.nextChatAt || !this.talk || this.event) return;
    this.nextChatAt = t + 14 + this.rand() * 16;
    this.chats = this.chats.filter((c) => t < c.until);
    // Separate homes: neighbors are a quick call away, wherever they live.
    const remote = this.remote;
    const pool = this.shuffled(this.freeIdle().filter((a) => !this.speech.has(a.id)));
    for (const a of pool) {
      const b = pool.find((o) => o !== a && (remote || Math.hypot(o.x - a.x, o.y - a.y) < 80));
      if (!b) continue;
      this.talk.gather([a.id, b.id]);
      const line = this.talk.open(a.id);
      if (!line) return;
      const dur = 4 + Math.min(3, line.text.length / 30);
      this.say(a.id, line.text, dur);
      this.replies.push({ id: b.id, topic: line.topic, at: t + dur + 0.6 });
      if (remote) this.chats.push({ key: `chat-${a.id}-${Math.floor(t)}`, ids: [a.id, b.id], until: t + dur + 4.4 });
      return;
    }
  }

  /** Everyone heads back to their own spot. */
  private endHuddle(h: Huddle, walk = true): void {
    this.huddles = this.huddles.filter((x) => x !== h);
    if (h.show) {
      h.show.gathering.done = true;
      h.show.gathering.present.fill(false);
    }
    for (const id of h.members) {
      const a = this.agents.get(id);
      if (!a || a.huddle !== h.id) continue;
      a.huddle = null;
      // On a call they never left.
      const home = walk && h.kind !== "call" ? this.L?.byId.get(a.thread.spotId) : undefined;
      if (!home) continue;
      const i = h.spots.findIndex((sp) => sp.id === a.spot?.id);
      const leave = i >= 0 && this.settled(a) ? h.show?.leave[i] : undefined;
      if (leave) this.leaveBy(a, leave, home);
      else this.walkTo(a, home);
    }
  }

  /** Home from a show its own way: gliding along, then walking out to a hallway and on home. */
  private leaveBy(a: Agent, leave: NonNullable<GatherSpot["leave"]>, home: Spot): void {
    const way = [...leave.glide, ...leave.walk];
    const end = way[way.length - 1];
    if (!end || !end.c) {
      this.walkTo(a, home);
      return;
    }
    const rest = route({ ...a, x: end.x, y: end.y, path: [], approach: [] }, this.L!.net, home.path);
    a.path = [...way, ...rest];
    a.glide = leave.glide.length > 0 ? { pace: leave.pace, pts: new Set(leave.glide.map(glideKey)) } : null;
    a.pace = 1;
    a.spot = null;
    a.target = home.id;
  }

  private leaveHuddle(a: Agent, walk = false): void {
    const h = this.huddles.find((x) => x.id === a.huddle);
    a.huddle = null;
    if (walk && h?.kind !== "call") {
      const home = this.L?.byId.get(a.thread.spotId);
      if (home) this.walkTo(a, home);
    }
    if (!h) return;
    h.members = h.members.filter((id) => id !== a.id);
    if (h.members.length < (h.show ? 1 : 2)) this.endHuddle(h);
  }

  // ------------------------------------------------------------------ the server-room gag

  /** Standing at the racks, reached through the nearest aisle or the cooler corner. */
  private serverSpot(id: string, activity: string): Spot | null {
    const L = this.L!;
    const r = L.server;
    if (!r) return null;
    const sy = r.y + r.h - 3;
    const cx = r.x + r.w / 2;
    const outside = (x: number) => x < r.x - 2 || x > r.x + r.w + 2;
    const ways: Point[] = [];
    for (const ax of L.net.aisles) if (outside(ax)) for (const hy of L.net.halls) ways.push({ x: ax, y: hy });
    const cooler = L.byId.get("cooler");
    if (cooler && outside(cooler.x)) ways.push({ x: cooler.x, y: cooler.path[0]!.y });
    if (ways.length === 0) return null;
    const cost = (p: Point) => Math.abs(p.x - cx) + Math.abs(p.y - sy) * 0.6;
    const way = ways.reduce((b, p) => (cost(p) < cost(b) ? p : b));
    const x = way.x < r.x ? r.x + 14 : r.x + r.w - 14;
    return { id, kind: "huddle", group: "lounge", x, y: sy, facing: "back", pose: "stand", activity, path: [{ x: way.x, y: way.y, c: true }, { x: way.x, y: sy }, { x, y: sy }] };
  }

  /** Send someone idle to mess with the server cables (a random idle agent unless given). */
  startMishap(id?: string): boolean {
    if (!this.L?.server || this.mishap || this.event) return false;
    const pool = this.freeIdle();
    const a = (id ? pool.find((x) => x.id === id) : undefined) ?? pool[Math.floor(this.rand() * pool.length)];
    const spot = this.serverSpot("gag-server", "poking at the server cables");
    if (!a || !spot) return false;
    this.mishap = { id: a.id, phase: "go", until: 0, spot };
    this.walkTo(a, spot);
    return true;
  }

  private updateMishap(dt: number): void {
    const t = this.time;
    if (this.nextMishapAt < 0) this.nextMishapAt = t + 300 + this.rand() * 420;
    if (!this.mishap && t > this.nextMishapAt) {
      this.nextMishapAt = t + 720 + this.rand() * 900;
      this.startMishap();
    }
    const m = this.mishap;
    if (!m) return;
    const a = this.agents.get(m.id);
    if (!a || a.leaving) {
      this.mishap = null;
      return;
    }
    const hands = { x: a.x, y: a.y - 16 };
    switch (m.phase) {
      case "go":
        if (this.settled(a) && a.spot === m.spot) {
          m.phase = "fiddle";
          m.until = t + 3.6;
          if (this.rand() < 0.5) this.say(a.id, this.rand() < 0.5 ? "What does this cable do?" : "Just a quick fix…", 2.6);
        }
        break;
      case "fiddle":
        if (this.rand() < dt * 3) this.particles.push({ kind: "sparkle", x: hands.x + (this.rand() - 0.5) * 8, y: hands.y - 4, vx: 0, vy: -4, life: 0, max: 0.35, color: "#ffe066" });
        if (t > m.until) {
          m.phase = "zap";
          m.until = t + 1.7;
          this.flashUntil = t + 0.4;
          this.emit("zap", false);
          this.say(a.id, ["BZZZT!", "OUCH!!", "YEOWCH!"][Math.floor(this.rand() * 3)]!, 2);
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            this.particles.push({ kind: "sparkle", x: a.x, y: a.y - 14, vx: Math.cos(ang) * 30, vy: Math.sin(ang) * 30, life: 0, max: 0.5, color: i % 2 ? "#9fe8ff" : "#ffffff" });
          }
        }
        break;
      case "zap":
        if (t > m.until) {
          m.phase = "down";
          m.until = t + 6.5;
          this.rackBroken = true;
          if (this.rand() < 0.7) this.say(a.id, ["Ow…", "Ow… pretty stars…", "I see stars…", "Five more minutes…"][Math.floor(this.rand() * 4)]!, 3.2);
        }
        break;
      case "down":
        if (this.rand() < dt * 1.6) this.particles.push({ kind: "powder", x: a.x + (this.rand() - 0.5) * 16, y: a.y - 8, vx: 0, vy: -8, life: 0, max: 1.4, color: "#8a8a92" });
        if (t > m.until) {
          m.phase = "leave";
          a.slow = true;
          const lines = ["I'm okay!", "Note to self: don't touch that.", "Who needs eyebrows anyway…", "Totally meant to do that."];
          this.say(a.id, lines[Math.floor(this.rand() * lines.length)]!, 3);
          const home = this.L!.byId.get(a.thread.spotId);
          if (home) this.walkTo(a, home);
          else {
            a.slow = false;
            this.mishap = null;
          }
          // Someone should look at that rack.
          if (!this.npcs.some((n) => n.kind === "technician")) this.nextTech = Math.min(this.nextTech, t + 20);
        }
        break;
      case "leave":
        if (this.rand() < dt * 0.8) this.particles.push({ kind: "powder", x: a.x, y: a.y - 26, vx: 0, vy: -6, life: 0, max: 1, color: "#9a9aa2" });
        if (a.path.length === 0) {
          a.slow = false;
          this.mishap = null;
        }
        break;
    }
  }

  // ------------------------------------------------------------------ weather & broken things

  private updateWeather(): void {
    const t = this.time;
    if (this.weather !== "storm" || this.theme.windowWeather === false) {
      this.nextLightning = -1;
      return;
    }
    if (this.nextLightning < 0) this.nextLightning = t + 4 + this.rand() * 6;
    if (t > this.nextLightning) {
      this.lightningAt = t;
      this.thunderAt = t + 0.7 + this.rand() * 1.6;
      this.nextLightning = t + 10 + this.rand() * 18;
    }
    if (this.thunderAt > 0 && t > this.thunderAt) {
      this.thunderAt = -1;
      this.emit("thunder", true);
    }
  }

  /** Little signs that something needs fixing. */
  private updateBroken(dt: number): void {
    const L = this.L!;
    if (this.brokenMachine) {
      const p = L.pokeables.find((q) => q.id === (this.brokenMachine === "coffee" ? "coffee" : this.brokenMachine));
      if (p && this.rand() < dt * 1.5) {
        this.particles.push({ kind: "powder", x: p.rect.x + p.rect.w / 2 + (this.rand() - 0.5) * 6, y: p.rect.y + 4, vx: 0, vy: -7, life: 0, max: 1.3, color: "#8a8a92" });
      }
    }
    if (this.rackBroken && L.server && this.rand() < dt * 0.9) {
      const r = L.server;
      this.particles.push({ kind: "sparkle", x: r.x + 8 + this.rand() * (r.w - 16), y: r.y + r.h - 24 + this.rand() * 10, vx: 0, vy: -3, life: 0, max: 0.3, color: "#ffe066" });
    }
  }

  /** Every string-light bulb's x, left to right. */
  private bulbXs(): number[] {
    const out: number[] = [];
    for (const seg of this.L!.segments) {
      for (let x0 = seg.x0 + 6; x0 < seg.x1 - 6; x0 += 100) {
        const x1 = Math.min(seg.x1 - 6, x0 + 100);
        if (x1 - x0 < 30) continue;
        for (let x = x0; x < x1; x++) if ((x - x0) % 10 === 5) out.push(x);
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ the technician

  /** Call the technician now (debug), with a server job if the rack is broken. */
  callTechnician(): boolean {
    if (!this.L || this.npcs.some((n) => n.kind === "technician")) return false;
    this.spawnNpc("technician");
    return true;
  }

  /** Pick a few things to fix and say where to stand for each. */
  private technicianJobs(): { job: Job; stop: Point[] }[] {
    const L = this.L!;
    const out: { job: Job; stop: Point[] }[] = [];
    if (this.rackBroken) {
      const sp = this.serverSpot("tech-server", "fixing the server rack");
      if (sp) out.push({ job: { kind: "server", facing: "back" }, stop: sp.path });
    }
    const options: { job: Job; stop: Point[] }[] = [];
    const used = new Set([...this.agents.values()].map((a) => a.target ?? a.spot?.id));
    const desks = L.desks.filter((d) => !used.has(d.spot.id));
    if (desks.length > 0) {
      const d = desks[Math.floor(this.rand() * desks.length)]!;
      const dx = d.side === "north" ? 12 : -12;
      const x = d.spot.x + dx;
      options.push({ job: { kind: "pc", facing: d.side === "north" ? "front" : "back", desk: d.index }, stop: [...d.spot.path.slice(0, -1), { x, y: d.spot.y }] });
    }
    // A bulb in the string lights, reached with a ladder from an aisle by the wall.
    const top = Math.min(...L.net.halls);
    const aisles = L.net.aisles.filter((x) => Math.abs(x - L.entrance.x) > 18);
    const ax = aisles.length > 0 ? aisles[Math.floor(this.rand() * aisles.length)]! : L.entrance.x + 16;
    const seg = L.segments.find((sg) => ax >= sg.x0 && ax < sg.x1);
    if (seg && ax < L.W - 12) {
      options.push({ job: { kind: "bulb", facing: "back", ladderX: ax }, stop: [{ x: ax, y: top, c: true }, { x: ax, y: seg.depth + 10 }] });
    }
    const machines: { job: Job; stop: Point[] }[] = [];
    const coffee = L.byId.get("coffee");
    if (coffee) machines.push({ job: { kind: "coffee", facing: "back" }, stop: coffee.path });
    const vending = L.byId.get("vending");
    if (vending) machines.push({ job: { kind: "vending", facing: vending.facing }, stop: vending.path });
    const cooler = L.byId.get("cooler");
    if (cooler && L.pokeables.some((p) => p.id === "printer")) {
      const px = cooler.x + 29;
      machines.push({ job: { kind: "printer", facing: "back" }, stop: [{ x: px, y: cooler.path[0]!.y, c: true }, { x: px, y: cooler.y }] });
    }
    if (machines.length > 0) options.push(machines[Math.floor(this.rand() * machines.length)]!);
    out.push(...this.shuffled(options).slice(0, Math.max(1, 3 - out.length - (this.rand() < 0.5 ? 1 : 0))));
    return out;
  }

  /** The technician is up the ladder this many pixels. */
  private climbOf(n: Npc): number {
    if (n.kind !== "technician" || n.job?.kind !== "bulb" || n.path.length > 0 || n.pause <= 0) return 0;
    const done = n.jobDur - n.pause;
    const k = Math.max(0, Math.min(1, done / 1.2, n.pause / 1.2));
    const seg = this.L!.segments.find((sg) => n.x >= sg.x0 && n.x < sg.x1);
    return Math.round(k * Math.max(0, (seg?.depth ?? 64) - 26));
  }

  private climbMax(n: Npc): number {
    const seg = this.L!.segments.find((sg) => n.x >= sg.x0 && n.x < sg.x1);
    return Math.max(0, (seg?.depth ?? 64) - 26);
  }

  private finishJob(n: Npc, j: Job): void {
    const t = this.time;
    switch (j.kind) {
      case "pc":
        this.brokenDesk = null;
        break;
      case "bulb":
        this.brokenBulbX = null;
        break;
      case "coffee":
        this.brokenMachine = null;
        this.anim.set("coffee", t + 3);
        this.emit("brew", true);
        break;
      case "printer":
        this.brokenMachine = null;
        this.anim.set("printer", t + 2.4);
        this.emit("print", true);
        break;
      case "vending":
        this.brokenMachine = null;
        this.anim.set("vending", t + 1.4);
        break;
      case "server":
        this.rackBroken = false;
        this.anim.set("server", t + 2.5);
        break;
    }
    const lines = ["Fixed!", "Good as new.", "There we go.", "That should hold.", "Next!"];
    this.say(n.id, lines[Math.floor(this.rand() * lines.length)]!, 2.4);
    this.emit("fixed", true);
    this.burst(n.x, n.y - 30 - this.climbOf(n), "sparkle", 6);
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
    const dy = this.drifts.get(a.id)?.dy ?? 0;
    if (this.settled(a) && a.spot!.lift) return a.y - a.spot!.lift + dy;
    return a.y + dy;
  }

  /** Where someone is drawn across: their x, shifted by the scenery's drift. */
  private drawX(a: Agent): number {
    return a.x + (this.drifts.get(a.id)?.dx ?? 0);
  }

  /** The scenery's drift for someone this frame (remembered for their tags, bubbles and click area). */
  private driftFor(kind: "agent" | "boss" | "dog" | "cat", id: string, seed: number, x: number, y: number): { dx: number; dy: number; tilt: number } | null {
    const d = this.theme.drift?.({ kind, id, seed, x, y }, this.info) ?? null;
    if (!d || (d.dx === 0 && d.dy === 0 && !d.tilt)) {
      this.drifts.delete(id);
      return null;
    }
    const r = { dx: Math.round(d.dx), dy: Math.round(d.dy), tilt: d.tilt ?? 0 };
    this.drifts.set(id, r);
    return r;
  }

  /** Draw something shifted (and turned about its middle) by a drift. */
  private drifted(ctx: CanvasRenderingContext2D, d: { dx: number; dy: number; tilt: number } | null, cx: number, cy: number, draw: () => void): void {
    if (!d) return draw();
    ctx.save();
    ctx.translate(d.dx, d.dy);
    if (d.tilt) {
      ctx.translate(Math.round(cx), Math.round(cy));
      ctx.rotate(d.tilt);
      ctx.translate(-Math.round(cx), -Math.round(cy));
    }
    draw();
    ctx.restore();
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
    const m = this.mishap?.id === a.id ? this.mishap : null;
    if (!this.settled(a)) {
      const frame = Math.floor(a.walked / (a.slow ? 3 : 4)) % 4;
      return { pose: `walk${frame}` as CharPose, expr: m ? "worried" : blink ? "blink" : "open", facing: a.facing };
    }
    const s = a.spot!;
    if (m && s === m.spot) {
      if (m.phase === "zap") return { pose: "cheer", expr: "surprised", facing: "front" };
      if (m.phase === "down") return { pose: "stand", expr: "closed", facing: "front" };
      return { pose: Math.floor(t * 4) % 2 ? "draw0" : "draw1", expr: "focus", facing: "back" };
    }
    // Talking at a get-together: hands going, mouth moving.
    if (s.kind === "huddle" && this.speech.has(a.id)) {
      const gesture = Math.floor(t * 1.4 + (a.seed % 3)) % 4 === 0;
      const mouth: Expression = Math.floor(t * 7) % 2 ? "open" : "happy";
      if (s.pose === "cup") return { pose: "cup", expr: mouth, facing: s.facing };
      return { pose: gesture ? "raise" : "stand", expr: mouth, facing: s.facing };
    }
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
        const swing = Math.floor(this.ballT * 2 + (s.id.endsWith("pingpong-r") ? 1 : 0)) % 2;
        return { pose: swing ? "paddle1" : "paddle0", expr: "focus", facing: s.facing };
      }
      default:
        return { pose: "stand", expr: blink ? "blink" : "open", facing: s.facing };
    }
  }

  private eventPose(a: Agent, s: Spot, blink: boolean): { pose: CharPose; expr: Expression; facing: Facing; seated?: boolean } {
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
      case "lunch": {
        const own = (ev.lunchboxes ?? []).includes(s.id);
        const eating = own || ev.delivered === true;
        const talking = this.speech.has(a.id);
        const bite = eating && !talking && Math.floor(ph / 1.6) % 3 !== 2;
        if (facing === "back") return { pose: bite && Math.floor(ph * 2) % 2 ? "type0" : "sit-back", expr, facing, seated: true };
        return { pose: bite ? "cup" : "stand", expr: talking ? (Math.floor(t * 7) % 2 ? "open" : "happy") : expr, facing, seated: true };
      }
      case "baby-shower":
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
    this.weather = env.weather;
    this.dayKey = env.date.toDateString();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, L.W, L.H);
    this.drawSky(ctx, env);
    ctx.drawImage(this.bg, 0, 0);
    const info = this.paintInfo(env);
    this.info = info;
    this.theme.underlay?.(ctx, L, info);
    this.drawSunbeam(ctx, env);
    this.drawOpenWindows(ctx, info);
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
      const th = this.theme;
      const desk = this.dressed(`desk|${style}`, () => th.desk?.(style, () => deskCanvas(style)) ?? deskCanvas(style));
      const tone = who?.thread.chairTone ?? "green";
      const chair = this.dressed(`chair|${tone}|${d.side}`, () => th.chair?.(tone, d.side, () => chairCanvas(tone, d.side)) ?? chairCanvas(tone, d.side));
      const vision = atDesk.get(d.index)?.thread.visionPro === true;
      const scr = this.dressed(`screen|${style}|${d.side}|${d.index % 9}|${vision}`, () => th.screen?.(style, d.side, d.index, vision, () => screenFor(style, d.side, d.index, vision)) ?? screenFor(style, d.side, d.index, vision));
      const seated = atDesk.get(d.index);
      const plant = hash(`desk-plant-${d.index}`) % 3 === 0 ? hash(`plant-kind-${d.index}`) : -1;
      items.push({ z: d.y + 26, draw: () => ctx.drawImage(desk, d.x, d.y) });
      items.push({
        z: d.y + 26.5,
        draw: () => {
          ctx.drawImage(scr.canvas, d.pcX + scr.dx, d.pcY + scr.dy);
          for (const r of scr.screens) {
            const box = { x: d.pcX + scr.dx + r.x, y: d.pcY + scr.dy + r.y, w: r.w, h: r.h };
            if (this.brokenDesk === d.index) this.drawBrokenScreen(ctx, box, d.index);
            else this.drawScreen(ctx, box, seated);
          }
          if (plant >= 0) {
            if (d.side === "north") this.drawDeskPlant(ctx, d.x + 40, d.y + 9, plant);
            else this.drawDeskPlant(ctx, d.x + 8, d.y + 9, plant);
          }
        },
      });
      items.push({ z: d.side === "north" ? d.spot.y - 1 : d.spot.y + 2, draw: () => ctx.drawImage(chair, d.chairX, d.chairY) });
    }
    for (const a of this.agents.values()) items.push({ z: a.y + 0.5, draw: () => this.drawAgent(ctx, a) });
    items.push(...this.crew.items(ctx, this.time, this.dressHelper));
    items.push({ z: (this.bossAt ?? L.boss.seat).y + 0.5, draw: () => this.drawBoss(ctx) });
    const green = L.boss.toys?.green;
    if (green) items.push({ z: green.cup.y + 0.3, draw: () => this.drawFlag(ctx, green) });
    const golfBall = this.golfBall;
    if (golfBall) items.push({ z: golfBall.y + 0.2, draw: () => this.drawGolfBall(ctx, golfBall) });
    const paper = this.shot?.ball;
    if (paper) items.push({ z: this.shot!.phase === "rest" ? paper.y : 1e9, draw: () => this.drawShot(ctx, paper) });
    for (const n of this.npcs) items.push({ z: n.y + 0.5, draw: () => this.drawNpc(ctx, n) });
    for (const k of this.kids) items.push({ z: k.y + 0.4, draw: () => this.drawKid(ctx, k) });
    if (this.event) items.push(...eventDecor(ctx, this.event, this.time));
    if (this.theme.decor) items.push(...this.theme.decor(ctx, L, info));
    const r = this.roomba;
    const robot = this.dressed("roomba", () => this.theme.roomba?.(roombaSprite) ?? roombaSprite());
    items.push({ z: r.y + 0.2, draw: () => ctx.drawImage(robot, Math.round(r.x - 8), Math.round(r.y - 6)) });
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
    this.theme.overlay?.(ctx, L, info);
    this.drawZap(ctx);
    // Lightning outside lights up the room for an instant.
    const bolt = this.time - this.lightningAt;
    if (bolt >= 0 && bolt < 0.18) {
      ctx.fillStyle = `rgba(235,240,255,${(0.16 * (0.18 - bolt)) / 0.18})`;
      ctx.fillRect(0, 0, L.W, L.H);
    }
    for (const a of this.agents.values()) this.drawBubble(ctx, a);
    this.crew.drawOverlay(ctx, this.theme);
    if (env.targets) this.drawTargets(ctx);
    this.drawHover(ctx, env);
  }

  private drawPropExtras(ctx: CanvasRenderingContext2D, p: Prop, env: Env): void {
    const L = this.L!;
    const t = this.time;
    const on = (id: string) => (this.anim.get(id) ?? 0) > t;
    const left = (id: string) => Math.max(0, (this.anim.get(id) ?? 0) - t);
    switch (p.kind) {
      case "cradle":
        this.drawCradleEnds(ctx, p.x, p.y, on("cradle") ? 1.6 - left("cradle") : -1);
        break;
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
    // drawY already carries the drift's dy: shift only across here (and turn about the middle).
    const d = this.driftFor("agent", a.id, a.seed, a.x, a.y);
    this.drifted(ctx, d && { ...d, dy: 0 }, a.x, this.drawY(a) - 14, () => this.paintAgent(ctx, a));
  }

  private paintAgent(ctx: CanvasRenderingContext2D, a: Agent): void {
    const picked = this.poseOf(a);
    const onChair = picked.seated;
    let { pose, expr, facing } = picked;
    if (this.theme.pose) {
      const spot = this.settled(a) ? a.spot!.kind : null;
      const p = this.theme.pose({ kind: "agent", id: a.id, seed: a.seed, x: a.x, y: a.y, spot, pose, expr, facing }, this.info);
      if (p) ({ pose, expr, facing = facing } = p);
    }
    let sprite = charSprite({ look: this.lookOf(a.thread.look, a.id), facing, pose, expr, emblem: a.thread.emblem, seated: onChair });
    let y = this.drawY(a);
    const s = a.spot;
    const settled = this.settled(a);
    const m = settled && this.mishap?.id === a.id && s === this.mishap.spot ? this.mishap : null;
    if (m?.phase === "down") {
      this.drawLying(ctx, a, sprite);
      return;
    }
    // Zapped: flickering between an x-ray and themselves.
    if (m?.phase === "zap" && Math.floor(this.time / 0.07) % 2 === 0) sprite = this.xray(sprite);
    if (settled && s?.kind === "couch" && (this.anim.get("couch") ?? 0) > this.time) y -= Math.floor(this.time * 10) % 2;
    if (settled && s?.kind === "arcade") y += Math.floor(this.time * 3) % 2 ? 0 : -1;
    if (settled && s?.kind === "couch" && Math.floor(this.time / 7 + (a.seed % 5)) % 6 === 0) y += Math.floor(this.time * 6) % 2 ? -1 : 0;
    if (settled && s?.kind === "review" && a.thread.mood === "needs-you") y -= Math.floor(this.time * 2 + (a.seed % 3)) % 6 === 0 ? 1 : 0;
    if (settled && s?.kind === "event" && this.event?.kind === "party" && pose !== "cup") y -= Math.floor(this.time * 5 + (a.seed % 4)) % 2;
    const seated = settled && s && SEATED_KINDS.has(s.kind);
    if (!seated) {
      ctx.fillStyle = "rgba(40,20,30,0.18)";
      ctx.fillRect(Math.round(a.x - 5), Math.round(a.y - 1), 10, 2);
    }
    const glow = this.glowOf(a);
    if (glow) this.drawGlow(ctx, a, glow, sprite, y, seated === true);
    ctx.drawImage(sprite, Math.round(a.x - ANCHOR_X), Math.round(y - ANCHOR_Y));
    if (glow) this.drawSparkles(ctx, a, glow, y);
    if (this.theme.dress && m?.phase !== "zap") {
      const seatedNow = onChair === true || (settled && s !== null && SEATED_KINDS.has(s.kind));
      this.theme.dress(ctx, { x: Math.round(a.x - ANCHOR_X), y: Math.round(y - ANCHOR_Y), facing, pose, seed: a.seed, seated: seatedNow, look: this.lookOf(a.thread.look, a.id), spot: settled && s ? s.id : null, id: a.id }, this.time);
    }
    if (a.thread.family) drawLanyard(ctx, Math.round(a.x - ANCHOR_X), Math.round(y - ANCHOR_Y), facing, pose, a.thread.family);
    if (a.thread.isPinned) {
      ctx.fillStyle = "#ffd84a";
      ctx.fillRect(Math.round(a.x + 2), Math.round(y - ANCHOR_Y + 15), 2, 2);
    }
    if (settled && s?.kind === "desk" && a.thread.visionPro) this.drawVisionPro(ctx, a, y, facing);
    if (settled && s?.kind === "event" && this.event?.kind === "lunch" && pose === "cup" && facing === "front") {
      this.drawFoodInHand(ctx, Math.round(a.x) + 1, Math.round(y) - 13, (this.event.lunchboxes ?? []).includes(s.id) ? null : (this.event.food ?? "pizza"));
    }
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

  /** A bite of lunch, over the mug of the "cup" pose (null: a sandwich from home). */
  private drawFoodInHand(ctx: CanvasRenderingContext2D, x: number, y: number, food: string | null): void {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 1, y - 1, 6, 5);
    switch (food) {
      case "pizza":
        ctx.fillStyle = "#f2b24e";
        ctx.fillRect(x, y, 4, 3);
        ctx.fillStyle = "#d9482b";
        ctx.fillRect(x + 1, y + 1, 1, 1);
        ctx.fillRect(x + 3, y, 1, 1);
        ctx.fillStyle = "#c98a4a";
        ctx.fillRect(x, y, 1, 3);
        break;
      case "sushi":
        ctx.fillStyle = "#fbfaf5";
        ctx.fillRect(x, y + 1, 4, 2);
        ctx.fillStyle = "#ff8a5c";
        ctx.fillRect(x, y, 4, 1);
        ctx.fillStyle = "#8a5a34";
        ctx.fillRect(x + 4, y - 3, 1, 4);
        break;
      case "burgers":
        ctx.fillStyle = "#d9a050";
        ctx.fillRect(x, y, 4, 1);
        ctx.fillStyle = "#57b86f";
        ctx.fillRect(x, y + 1, 4, 1);
        ctx.fillStyle = "#7a4a2a";
        ctx.fillRect(x, y + 2, 4, 1);
        break;
      case "tacos":
        ctx.fillStyle = "#f2c14e";
        ctx.fillRect(x, y, 4, 3);
        ctx.fillStyle = "#57b86f";
        ctx.fillRect(x + 1, y, 2, 1);
        ctx.fillStyle = "#e5484d";
        ctx.fillRect(x + 2, y + 1, 1, 1);
        break;
      case "ramen":
        ctx.fillStyle = "#e5484d";
        ctx.fillRect(x, y + 1, 4, 2);
        ctx.fillStyle = "#f0d9a8";
        ctx.fillRect(x, y, 4, 1);
        ctx.fillStyle = "#8a5a34";
        ctx.fillRect(x + 3, y - 3, 1, 3);
        break;
      default:
        // A sandwich from home.
        ctx.fillStyle = "#f0d9a8";
        ctx.fillRect(x, y, 4, 3);
        ctx.fillStyle = "#86e07f";
        ctx.fillRect(x, y + 1, 4, 1);
    }
  }

  private rims = new WeakMap<HTMLCanvasElement, Map<Highlight, HTMLCanvasElement>>();

  /** Warm for a new finish you haven't opened, cool for work that started since you last looked (see highlight.ts). */
  private glowOf(a: Agent): Highlight | null {
    if (a.leaving) return null;
    return highlightOf(a.thread.mood, a.thread.unopened === true, a.started);
  }

  /** A bright rim of light around them (and a pool at their feet when standing), breathing. */
  private drawGlow(ctx: CanvasRenderingContext2D, a: Agent, glow: Highlight, sprite: HTMLCanvasElement, y: number, seated: boolean): void {
    const breath = 0.5 + 0.5 * Math.sin(this.time * 2.6 + (a.seed % 7));
    ctx.save();
    if (!seated) {
      const x = Math.round(a.x);
      const fy = Math.round(a.y);
      ctx.fillStyle = GLOW_HAZE[glow];
      ctx.globalAlpha = 0.22 + 0.18 * breath;
      ctx.fillRect(x - 13, fy - 2, 27, 4);
      ctx.fillRect(x - 9, fy - 3, 19, 6);
      ctx.fillStyle = GLOW[glow];
      ctx.globalAlpha = 0.35 + 0.25 * breath;
      ctx.fillRect(x - 8, fy - 1, 17, 2);
      ctx.fillRect(x - 5, fy - 2, 11, 4);
    }
    ctx.globalAlpha = 0.82 + 0.18 * breath;
    ctx.drawImage(this.rimOf(sprite, glow), Math.round(a.x - ANCHOR_X) - RIM, Math.round(y - ANCHOR_Y) - RIM);
    ctx.restore();
  }

  /** A few pixel sparkles twinkling round the head, so a highlighted agent catches the eye at a glance. */
  private drawSparkles(ctx: CanvasRenderingContext2D, a: Agent, glow: Highlight, y: number): void {
    const x0 = Math.round(a.x);
    const top = Math.round(y - ANCHOR_Y);
    ctx.save();
    for (let i = 0; i < 3; i++) {
      // Each sparkle flares and fades in turn, at its own spot round the head.
      const phase = (this.time * 1.3 + i / 3 + (a.seed % 11) / 11) % 1;
      const k = Math.sin(phase * Math.PI);
      if (k < 0.15) continue;
      const slot = (Math.floor(this.time * 1.3 + i / 3 + (a.seed % 11) / 11) * 3 + i + a.seed) % SPARKLE_SPOTS.length;
      const [dx, dy] = SPARKLE_SPOTS[slot]!;
      const sx = x0 + dx;
      const sy = top + dy - Math.round(phase * 3);
      ctx.globalAlpha = k;
      ctx.fillStyle = GLOW_HAZE[glow];
      ctx.fillRect(sx - 1, sy, 3, 1);
      ctx.fillRect(sx, sy - 1, 1, 3);
      if (k > 0.7) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(sx, sy, 1, 1);
      }
    }
    ctx.restore();
  }

  /** The figure grown by a crisp pixel and a fainter second one in the glow color (the figure covers the inside). */
  private rimOf(sprite: HTMLCanvasElement, glow: Highlight): HTMLCanvasElement {
    let byGlow = this.rims.get(sprite);
    if (!byGlow) this.rims.set(sprite, (byGlow = new Map()));
    const hit = byGlow.get(glow);
    if (hit) return hit;
    const grown = (ring: readonly (readonly [number, number])[], color: string) => {
      const c = document.createElement("canvas");
      c.width = sprite.width + RIM * 2;
      c.height = sprite.height + RIM * 2;
      const x = ctx2d(c);
      for (const [dx, dy] of ring) x.drawImage(sprite, RIM + dx, RIM + dy);
      x.globalCompositeOperation = "source-in";
      x.fillStyle = color;
      x.fillRect(0, 0, c.width, c.height);
      return c;
    };
    // Two crisp pixels of the glow color, then a softer third of haze.
    const rim = grown([[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [-2, 0], [2, 0], [0, -2], [0, 2]], GLOW[glow]);
    const x = ctx2d(rim);
    x.globalCompositeOperation = "destination-over";
    x.globalAlpha = 0.6;
    x.drawImage(grown([[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -1], [2, -1], [-2, 1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2], [-2, -2], [2, -2], [-2, 2], [2, 2]], GLOW_HAZE[glow]), 0, 0);
    byGlow.set(glow, rim);
    return rim;
  }

  private xrays = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

  /** A cartoon x-ray: a blue silhouette with the skeleton showing. */
  private xray(sprite: HTMLCanvasElement): HTMLCanvasElement {
    const hit = this.xrays.get(sprite);
    if (hit) return hit;
    const c = document.createElement("canvas");
    c.width = sprite.width;
    c.height = sprite.height;
    const x = ctx2d(c);
    x.drawImage(sprite, 0, 0);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = "#2f55d4";
    x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = "source-over";
    x.drawImage(skeletonSprite(), 0, 0);
    this.xrays.set(sprite, c);
    return c;
  }

  /** Flat on the floor after the zap, stars circling. */
  private drawLying(ctx: CanvasRenderingContext2D, a: Agent, sprite: HTMLCanvasElement): void {
    // On the floor just in front of the racks, above the room's glass front.
    const x = Math.round(a.x);
    const y = Math.round(a.y - 13);
    ctx.fillStyle = "rgba(40,20,30,0.18)";
    ctx.fillRect(x - 13, y + 7, 26, 2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(sprite, -10, -14);
    ctx.restore();
    // Head is on the left: stars go round above it.
    const hx = x - 8;
    const hy = y - 9;
    const t = this.time;
    for (let i = 0; i < 3; i++) {
      const ang = t * 4 + (i * Math.PI * 2) / 3;
      const sx = Math.round(hx + Math.cos(ang) * 7);
      const sy = Math.round(hy + Math.sin(ang) * 2.5);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(sx - 1, sy - 1, 3, 3);
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(sx - 1, sy, 3, 1);
      ctx.fillRect(sx, sy - 1, 1, 3);
    }
  }

  /** A little potted plant on some desks. */
  private drawDeskPlant(ctx: CanvasRenderingContext2D, x: number, y: number, kind: number): void {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 3, y - 4, 7, 5);
    ctx.fillStyle = ["#c96f4a", "#e8e2d4", "#6f9fd8"][kind % 3]!;
    ctx.fillRect(x - 2, y - 3, 5, 3);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x - 2, y - 3, 5, 1);
    const leaf = ["#3f9a5a", "#57b86f", "#86e07f"];
    if (kind % 3 === 0) {
      // Succulent rosette
      ctx.fillStyle = leaf[1]!;
      ctx.fillRect(x - 2, y - 6, 5, 2);
      ctx.fillRect(x - 1, y - 7, 3, 1);
      ctx.fillStyle = leaf[2]!;
      ctx.fillRect(x, y - 7, 1, 2);
    } else if (kind % 3 === 1) {
      // Little fern
      ctx.fillStyle = leaf[0]!;
      for (const [dx, dy] of [[-3, -6], [-2, -7], [-1, -9], [0, -8], [1, -9], [2, -7], [3, -6], [0, -6], [-1, -5], [1, -5]] as const) ctx.fillRect(x + dx, y + dy, 1, 1);
      ctx.fillStyle = leaf[2]!;
      ctx.fillRect(x, y - 10, 1, 2);
    } else {
      // Flowering
      ctx.fillStyle = leaf[1]!;
      ctx.fillRect(x - 1, y - 7, 3, 3);
      ctx.fillRect(x, y - 9, 1, 2);
      ctx.fillStyle = "#ff8fb1";
      ctx.fillRect(x - 2, y - 9, 2, 2);
      ctx.fillRect(x + 1, y - 10, 2, 2);
    }
  }

  /** An aluminium ladder from the floor up the wall. */
  private drawLadder(ctx: CanvasRenderingContext2D, x: number, floor: number, top: number): void {
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(x - 5, top, 1, floor - top);
    ctx.fillRect(x + 4, top, 1, floor - top);
    ctx.fillStyle = "#c9ced6";
    ctx.fillRect(x - 4, top, 1, floor - top);
    ctx.fillRect(x + 5, top, 1, floor - top);
    for (let ry = floor - 4; ry > top + 1; ry -= 5) {
      ctx.fillStyle = "#9aa1ab";
      ctx.fillRect(x - 3, ry, 7, 1);
    }
  }

  private drawDeliveryBag(ctx: CanvasRenderingContext2D, x: number, y: number, food: string): void {
    if (food === "pizza") {
      // A stack of pizza boxes.
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x - 7, y - 17 - i * 3, 14, 4);
        ctx.fillStyle = "#e9d3a8";
        ctx.fillRect(x - 6, y - 16 - i * 3, 12, 2);
        ctx.fillStyle = "#e5484d";
        ctx.fillRect(x - 1, y - 16 - i * 3, 2, 1);
      }
      return;
    }
    // An insulated delivery bag.
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 7, y - 20, 14, 10);
    ctx.fillStyle = food === "sushi" ? "#e5484d" : food === "ramen" ? "#3e8ed0" : "#30a46c";
    ctx.fillRect(x - 6, y - 19, 12, 8);
    ctx.fillStyle = "#fbfaf5";
    ctx.fillRect(x - 3, y - 16, 6, 2);
  }

  private drawToolbox(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 5, y - 6, 10, 6);
    ctx.fillRect(x - 2, y - 8, 4, 2);
    ctx.fillStyle = "#e5484d";
    ctx.fillRect(x - 4, y - 5, 8, 4);
    ctx.fillStyle = "#ff8a8d";
    ctx.fillRect(x - 4, y - 5, 8, 1);
    ctx.fillStyle = "#c9ced6";
    ctx.fillRect(x - 1, y - 7, 2, 1);
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
      for (let row = 2; row < h - 1; row += 2) ctx.fillRect(px + 2, py + row, Math.max(2, ((a.seed >>> row) % (w - 4)) + 2), 1);
      ctx.globalAlpha = 1;
    });
  }

  private drawBoss(ctx: CanvasRenderingContext2D): void {
    const L = this.L!;
    const t = this.time;
    const { x, y } = this.bossAt ?? L.boss.seat;
    const guests = [...this.agents.values()].some((a) => this.settled(a) && a.spot?.kind === "boss-guest");
    let pose: CharPose;
    let expr: Expression = Math.floor(t * 10) % 43 === 0 ? "blink" : "open";
    let facing: Facing = "front";
    const shot = this.shot;
    if (this.bossAt) ({ pose, facing, expr } = this.awayPose(this.bossAt, expr));
    else if (shot && shot.phase !== "rest") {
      // A shot at the hoop from your chair: wind up, watch it, cheer or wince.
      const watching = shot.phase === "windup" || shot.phase === "fly";
      pose = watching ? (shot.phase === "windup" ? "raise" : "sit-back") : shot.swish ? (Math.floor(t * 4) % 2 ? "cheer" : "raise") : "sit-back";
      expr = watching ? "focus" : shot.swish ? "happy" : "worried";
    } else if (t < this.bossWaveUntil) {
      pose = Math.floor(t * 4) % 2 ? "raise" : "cheer";
      expr = "happy";
    } else if (guests) {
      pose = Math.floor(t / 3) % 3 === 2 ? "type0" : "read";
      expr = Math.floor(t / 5) % 2 ? "happy" : "focus";
    } else {
      pose = Math.floor(t * 5) % 2 ? "type1" : "type0";
      expr = Math.floor(t / 4) % 4 === 0 ? "open" : "focus";
    }
    const fancy = !this.bossAt && !(shot && shot.phase !== "rest") && this.theme.pose?.({ kind: "boss", id: "boss", seed: 0, x, y, spot: null, pose, expr, facing }, this.info);
    if (fancy) ({ pose, expr, facing = facing } = fancy);
    const look = this.npcLookOf("boss");
    const sprite = charSprite({ look, facing, pose, expr, emblem: facing === "back" ? null : youEmblem(this.you) });
    const phase = this.bossAt?.path.length === 0 ? this.visit?.phase : undefined;
    // At the arcade: leaning into the game and bobbing along, or jumping for joy after a win.
    const hop = phase === "won" ? Math.round(Math.abs(Math.sin(t * 7)) * 3) : phase === "play" ? Math.floor(t * 3) % 2 : 0;
    const lean = phase === "play" ? [0, -1, 0, 1][Math.floor(t / 0.7) % 4]! : 0;
    if (this.bossAt) {
      ctx.fillStyle = "rgba(40,20,30,0.18)";
      ctx.fillRect(Math.round(x - 5), Math.round(y - 1), 10, 2);
    }
    const sx = Math.round(x - ANCHOR_X + lean);
    const sy = Math.round(y - ANCHOR_Y - hop);
    this.drifted(ctx, this.driftFor("boss", "boss", 0, x, y), x, y - 14, () => {
      ctx.drawImage(sprite, sx, sy);
      this.theme.dressVisitor?.(ctx, { x: sx, y: sy, facing, pose, kind: "boss", look }, t);
    });
    if (phase === "lost") drawRainCloud(ctx, Math.round(x + 3), Math.round(y - ANCHOR_Y - 9 + (Math.floor(t * 2) % 2)));
  }

  /** You away from your desk: walking, putting and reacting to where the ball went, at the arcade. */
  private awayPose(b: Walker, open: Expression): { pose: CharPose; facing: Facing; expr: Expression } {
    const t = this.time;
    const g = this.golf;
    const v = this.visit;
    if (b.path.length === 0 && v && !g) {
      // Button mashing, now and then a pause to lean in; then a cheer, or hanging your head.
      if (v.phase === "won") return { pose: Math.floor(t * 5) % 2 ? "cheer" : "raise", facing: "front", expr: "happy" };
      if (v.phase === "lost") return { pose: "mope", facing: "front", expr: "worried" };
      const mash = Math.floor(t * 7) % 2 === 0 && Math.floor(t / 1.7) % 4 !== 3;
      return { pose: mash ? "arcade1" : "arcade0", facing: "back", expr: "focus" };
    }
    if (b.path.length > 0 || !g) return { pose: b.path.length > 0 ? (`walk${Math.floor(b.walked / 4) % 4}` as CharPose) : "stand", facing: b.facing, expr: open };
    if (g.phase === "aim") return { pose: "putt0", facing: "right", expr: "focus" };
    if (g.phase === "roll") return { pose: t - g.roll!.at < 0.12 ? "putt0" : "putt1", facing: "right", expr: "focus" };
    if (g.outcome === "in") return { pose: Math.floor(t * 4) % 2 ? "cheer" : "raise", facing: "front", expr: "happy" };
    if (g.outcome === "desk") return g.fetched || g.fetch ? { pose: "stand", facing: "right", expr: "happy" } : { pose: "stand", facing: "front", expr: "surprised" };
    return { pose: "stand", facing: "right", expr: "worried" };
  }

  private drawGolfBall(ctx: CanvasRenderingContext2D, ball: Point & { sunk?: boolean }): void {
    const x = Math.round(ball.x);
    const y = Math.round(ball.y);
    if (ball.sunk) {
      // Just its top, down in the cup beside the flagstick.
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(x + 1, y - 1, 1, 1);
      return;
    }
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 1, y - 1, 2, 2);
    ctx.fillStyle = "#c9d1da";
    ctx.fillRect(x, y, 1, 1);
  }

  /** The flag in the cup: it flaps now and then, and wiggles when a putt drops. */
  private drawFlag(ctx: CanvasRenderingContext2D, G: Green): void {
    const t = this.time;
    const { x, y } = G.cup;
    const wiggle = t < this.flagUntil ? Math.round(Math.sin(t * 34) * 1.4) : 0;
    const flap = wiggle !== 0 ? wiggle : Math.floor(t / 0.8) % 2;
    const top = y - 16;
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 1, top - 1, 3, y - top + 1);
    ctx.fillStyle = "#e8e4dc";
    ctx.fillRect(x, top, 1, y - top);
    const fx = x + 1 + (wiggle > 0 ? 1 : 0);
    // A pennant four rows tall; the second and last rows flap.
    const row = (i: number) => (i === 0 ? 5 : i === 1 ? 4 + flap : i === 2 ? 3 : 1 + Math.max(0, flap));
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(fx, top - 1, 6, 1);
    for (let i = 0; i < 4; i++) ctx.fillRect(fx, top + i, row(i) + 1, 1);
    ctx.fillRect(fx, top + 4, 2, 1);
    ctx.fillStyle = "#e5484d";
    for (let i = 0; i < 4; i++) ctx.fillRect(fx, top + i, row(i), 1);
    ctx.fillStyle = "#ff7f84";
    ctx.fillRect(fx, top, 2, 1);
  }

  /** The cradle's end balls: hanging still, or swinging out in turn after a click (clack, clack). */
  private drawCradleEnds(ctx: CanvasRenderingContext2D, x: number, y: number, since: number): void {
    const half = 0.26;
    const n = since >= 0 ? Math.floor(since / half) : -1;
    for (let end = 0; end < 2; end++) {
      const out = n >= 0 && n < 6 && n % 2 === end ? Math.round(Math.sin(((since - n * half) / half) * Math.PI) * (2.4 - n * 0.25)) : 0;
      const sx = x + (end ? 11 : 3);
      const bx = sx + (end ? out : -out);
      const by = y + 6 - (out >= 2 ? 1 : 0);
      ctx.fillStyle = "#87909c";
      for (let yy = y + 2; yy < by; yy++) ctx.fillRect(Math.round(sx + ((bx - sx) * (yy - y - 2)) / Math.max(1, by - y - 2)), yy, 1, 1);
      ctx.fillStyle = "#c9d1da";
      ctx.fillRect(bx, by, 2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(bx, by, 1, 1);
      ctx.fillStyle = "#8d96a3";
      ctx.fillRect(bx + 1, by + 1, 1, 1);
    }
  }

  /** The paper ball for the hoop, in the air or lying where it missed. */
  private drawShot(ctx: CanvasRenderingContext2D, b: { x: number; y: number }): void {
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 2, y - 2, 5, 4);
    ctx.fillStyle = "#fbfaf5";
    ctx.fillRect(x - 1, y - 1, 3, 2);
    ctx.fillStyle = "#c9c3b8";
    ctx.fillRect(x, y - 1, 1, 1);
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
    const climb = this.climbOf(n);
    if (n.kind === "technician" && !walking && n.job) {
      facing = n.job.facing;
      const up = n.job.kind === "bulb" && climb > 0 && climb < this.climbMax(n);
      const atTop = n.job.kind === "bulb" && climb >= this.climbMax(n);
      pose = up
        ? (`walk${Math.floor(t * 6) % 4}` as CharPose)
        : atTop
          ? Math.floor(t * 2) % 2
            ? "raise"
            : "cheer"
          : n.job.kind === "pc"
            ? Math.floor(t * 5) % 2
              ? "type1"
              : "type0"
            : Math.floor(t * 3) % 2
              ? "draw0"
              : "draw1";
    }
    const emblem = n.kind === "guard" ? "badge" : n.kind === "technician" ? "wrench" : n.kind === "delivery" ? "food" : "broom";
    const sprite = charSprite({ look: n.look, facing, pose, expr: Math.floor(t * 10) % 37 === 0 ? "blink" : "open", emblem });
    const x = Math.round(n.x);
    const y = Math.round(n.y);
    if (n.kind === "technician") {
      if (!walking && n.job?.kind === "bulb") {
        const seg = this.L!.segments.find((sg) => n.x >= sg.x0 && n.x < sg.x1);
        this.drawLadder(ctx, x, y, Math.max(6, (seg?.depth ?? 64) - 52));
      }
      if (!walking && n.job) this.drawToolbox(ctx, x + (n.job.facing === "left" ? -11 : 11), y + (n.job.kind === "bulb" ? 0 : 1));
    }
    ctx.fillStyle = "rgba(40,20,30,0.18)";
    ctx.fillRect(Math.round(n.x - 5), Math.round(n.y - 1), 10, 2);
    if (climb > 0) {
      ctx.drawImage(sprite, x - ANCHOR_X, y - climb - ANCHOR_Y);
      this.theme.dressVisitor?.(ctx, { x: x - ANCHOR_X, y: y - climb - ANCHOR_Y, facing, pose, kind: n.kind }, t);
      return;
    }
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
    this.theme.dressVisitor?.(ctx, { x: x - ANCHOR_X, y: y - ANCHOR_Y, facing, pose, kind: n.kind }, t);
    if (n.kind === "delivery") {
      // The order, carried in front until it's on the table.
      const ev = this.event;
      if (ev?.kind === "lunch" && !ev.delivered) this.drawDeliveryBag(ctx, x, y, ev.food ?? "pizza");
      return;
    }
    if (n.kind === "technician") {
      // Carrying the ladder between jobs.
      if (walking && n.jobs.some((j) => j?.kind === "bulb")) {
        ctx.fillStyle = "#9aa1ab";
        ctx.fillRect(x - 13, y - 19, 26, 1);
        ctx.fillRect(x - 13, y - 16, 26, 1);
        for (let lx = x - 12; lx < x + 13; lx += 5) ctx.fillRect(lx, y - 18, 1, 2);
      } else if (walking) this.drawToolbox(ctx, x + (facing === "left" ? -6 : 6), y - 7);
      return;
    }
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
    const dog = this.dressed(`pet|dog|${pose}|${facing}|${blink}`, () => this.theme.pet?.("dog", pose, facing, blink, () => dogSprite(pose, facing, blink)) ?? dogSprite(pose, facing, blink));
    this.drifted(ctx, this.driftFor("dog", "dog", 0, d.x, d.y), d.x, d.y - 7, () => ctx.drawImage(dog, Math.round(d.x - 10), Math.round(d.y - 14)));
    if (this.golf?.fetch?.step === 2) {
      // Your golf ball, in its mouth.
      const mx = Math.round(d.x + (facing === "left" ? -9 : 8));
      const my = Math.round(d.y - 8);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(mx - 1, my - 1, 4, 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mx, my, 2, 2);
    }
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
    const bx = Math.round(this.drawX(a) + 3);
    const by = Math.round(top - 13 - bounce);
    if (kind === "error") {
      drawRainCloud(ctx, bx, by);
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
        marker(this.drawX(a), this.headTop(a) - (bubble ? 20 : 7) + bob);
        // The rest of its family (the thread that spawned it, the ones it spawned).
        if (a.thread.family) {
          for (const b of this.agents.values()) if (b !== a && !b.leaving && b.thread.family === a.thread.family) marker(this.drawX(b), this.headTop(b) - 7 + bob);
        }
        break;
      }
      case "helper": {
        const p = this.crew.anchorOf(h.key);
        if (p) marker(p.x, p.y + bob);
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

  /** A crashed computer: a blue screen, then a progress bar while it's fixed. */
  private drawBrokenScreen(ctx: CanvasRenderingContext2D, r: Rect, index: number): void {
    const { x, y, w, h } = r;
    const fixing = this.npcs.find((n) => n.kind === "technician" && n.job?.kind === "pc" && n.job.desk === index && n.path.length === 0 && n.pause > 0);
    ctx.fillStyle = "#2b62d9";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#ffffff";
    if (fixing) {
      const k = 1 - fixing.pause / fixing.jobDur;
      ctx.fillRect(x + 1, y + Math.floor(h / 2), Math.max(1, Math.round((w - 2) * k)), 1);
      return;
    }
    // :(
    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    ctx.fillRect(cx - 2, cy - 2, 1, 1);
    ctx.fillRect(cx + 1, cy - 2, 1, 1);
    ctx.fillRect(cx - 2, cy + 1, 4, 1);
    if (Math.floor(this.time * 2) % 2) ctx.fillRect(cx - 3, cy + 2, 1, 1);
  }

  /** A breeze through a window you opened. */
  private drawOpenWindows(ctx: CanvasRenderingContext2D, info: PaintInfo): void {
    const t = this.time;
    for (const [i, win] of this.L!.wall.windows.entries()) {
      const left = (this.anim.get(`window-${i}`) ?? 0) - t;
      if (left <= 0) continue;
      const k = Math.min(1, left / 1.5, (5 - left) * 3);
      if (this.theme.openWindow?.(ctx, win, k, info)) continue;
      // The lower pane slid up.
      ctx.fillStyle = `rgba(250,246,236,${0.85 * k})`;
      ctx.fillRect(win.x + 1, win.y + Math.floor(win.h / 2) - 1, win.w - 2, 2);
      ctx.fillStyle = `rgba(255,255,255,${0.5 * k})`;
      for (let j = 0; j < 3; j++) {
        const p = (t * 0.6 + j / 3) % 1;
        const wx = win.x + 8 + j * 12 + Math.round(Math.sin(t * 3 + j) * 2);
        const wy = win.y + win.h + 2 + Math.round(p * 20);
        ctx.globalAlpha = (1 - p) * k;
        ctx.fillRect(wx, wy, 4, 1);
        ctx.fillRect(wx + 3, wy + 1, 3, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  /** The zap: a white flash over everything and arcs around whoever touched the cables. */
  private drawZap(ctx: CanvasRenderingContext2D): void {
    const L = this.L!;
    const t = this.time;
    if (t < this.flashUntil) {
      ctx.fillStyle = `rgba(230,244,255,${0.55 * ((this.flashUntil - t) / 0.4)})`;
      ctx.fillRect(0, 0, L.W, L.H);
    }
    const m = this.mishap;
    if (!m || m.phase !== "zap") return;
    const a = this.agents.get(m.id);
    if (!a) return;
    ctx.fillStyle = Math.floor(t * 20) % 2 ? "#ffffff" : "#9fe8ff";
    for (let arc = 0; arc < 3; arc++) {
      let x = a.x + (this.rand() - 0.5) * 6;
      let y = a.y - 26;
      for (let i = 0; i < 7; i++) {
        x += (this.rand() - 0.5) * 8;
        y += 3 + this.rand() * 2;
        ctx.fillRect(Math.round(x + (arc - 1) * 7), Math.round(y), 1, 2);
      }
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
        const sc = this.theme.screenColors;
        ctx.fillStyle = sc?.bg ?? "#1f2a3c";
        ctx.fillRect(x, y, w, h);
        const colors = sc?.code ?? ["#60c677", "#9ff0b0", "#7fd1ff", "#ffd479", "#c39bff"];
        const scroll = Math.floor(t * 3 + (a.seed % 11));
        const rows = Math.max(1, Math.floor((h - 1) / 2));
        for (let row = 0; row < rows; row++) {
          const n = scroll + row;
          const rr = hash(`${a.id}:${n}`);
          const indent = (rr % 3) * (w > 12 ? 2 : 1);
          const len = 2 + ((rr >>> 4) % Math.max(1, w - 3 - indent));
          ctx.fillStyle = colors[(rr >>> 9) % colors.length]!;
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
    // You at the controls (and how your last game went).
    const you = this.bossAt?.path.length === 0 ? this.visit?.phase : undefined;
    const playing = you !== undefined || [...this.agents.values()].some((a) => a.spot?.id === "arcade" && a.path.length === 0);
    const coin = (this.anim.get("arcade") ?? 0) > t || you === "won";
    ctx.fillStyle = "#120f22";
    ctx.fillRect(x, y, w, h);
    if (you === "lost") {
      // Game over: a red screen blinking an X.
      ctx.fillStyle = Math.floor(t * 3) % 2 ? "#5a1730" : "#3a0f22";
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = "#ff6b8b";
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(x + 7 + i, y + 4 + i, 1, 1);
        ctx.fillRect(x + 12 - i, y + 4 + i, 1, 1);
      }
      return;
    }
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
    // A flicker now and then while you play.
    if (you === "play" && Math.floor(t * 13) % 9 === 0) {
      ctx.fillStyle = "rgba(200,230,255,0.28)";
      ctx.fillRect(x, y, w, h);
    }
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
    const cat = this.dressed(`pet|cat|${pose}|${c.facing}|${blink}`, () => this.theme.pet?.("cat", pose, c.facing, blink, () => catSprite(pose, c.facing, blink)) ?? catSprite(pose, c.facing, blink));
    this.drifted(ctx, this.driftFor("cat", "cat", 0, c.x, c.y), c.x, c.y - 6, () => ctx.drawImage(cat, Math.round(c.x - 8), Math.round(c.y - 12)));
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
    if (this.time < this.doorOpenUntil && !this.theme.doorOpen?.(ctx, d, this.paintInfo(env))) {
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
    const classic = this.classicSky(hour);
    return this.theme.sky ? this.theme.sky(hour, classic) : classic;
  }

  private classicSky(hour: number): { top: string; bottom: string; night: number } {
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
    if (this.theme.windowWeather === false) {
      this.theme.outside?.(ctx, win, index, { t, hour: env.hour, night: sky.night, weather: env.weather, date: env.date, season: this.season, sky, windows: this.L!.wall.windows });
      return;
    }
    if (sky.night > 0.4) {
      for (const s of this.stars) {
        if (!inRect(s.x, s.y, win)) continue;
        ctx.fillStyle = Math.sin(t * 1.5 + s.p) > 0.2 ? "#fff6d8" : "#a9a6d0";
        ctx.fillRect(s.x, s.y, 1, 1);
      }
    }
    const wx = env.weather;
    const overcast = wx !== "clear" && wx !== "partly";
    if (overcast) {
      // Grey it over.
      const heavy = wx === "storm" ? 0.72 : wx === "rain" ? 0.62 : 0.5;
      const tint = wx === "storm" ? "62,70,92" : wx === "rain" ? "104,114,134" : wx === "snow" ? "176,186,200" : "150,158,172";
      ctx.fillStyle = sky.night > 0.5 ? "rgba(30,32,48,0.5)" : `rgba(${tint},${heavy})`;
      ctx.fillRect(x, y, w, h);
    }
    if (index === 0 && !overcast) {
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
    const clouds = wx === "clear" ? 2 : wx === "partly" ? 3 : 5;
    const dark = wx === "rain" || wx === "storm" ? 0.7 : overcast ? 0.45 : 0;
    for (let i = 0; i < clouds; i++) {
      const cx = x + ((t * (1.2 + (i % 3) * 0.5) + i * 40 + index * 23) % (w + 30)) - 15;
      const cy = y + 5 + (i % 3) * 7 + (i >= 3 ? 3 : 0);
      const big = overcast ? 4 : 0;
      ctx.fillStyle = dark > 0 ? mix(cloud, "#6f7588", dark) : cloud;
      ctx.fillRect(Math.round(cx - big), cy, 12 + big * 2, 3 + (big ? 1 : 0));
      ctx.fillRect(Math.round(cx + 3 - big / 2), cy - 2, 6 + big, 2);
    }
    if (this.theme.outside) {
      this.theme.outside(ctx, win, index, { t, hour: env.hour, night: sky.night, weather: env.weather, date: env.date, season: this.season, sky, windows: this.L!.wall.windows });
    } else this.paintCity(ctx, env, sky, win, index);
    this.paintWeather(ctx, env, sky, win, index);
  }

  /** The classic view: a city skyline and a bird. */
  private paintCity(ctx: CanvasRenderingContext2D, env: Env, sky: { top: string; bottom: string; night: number }, win: Rect, index: number): void {
    const { x, y, w, h } = win;
    const t = this.time;
    const wx = env.weather;
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
    if (sky.night < 0.3 && index === 0 && (wx === "clear" || wx === "partly" || wx === "cloudy")) {
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
  }

  /** Festival skies and the weather, in front of the view. */
  private paintWeather(ctx: CanvasRenderingContext2D, env: Env, sky: { top: string; bottom: string; night: number }, win: Rect, index: number): void {
    const { x, y, w, h } = win;
    const t = this.time;
    const wx = env.weather;
    if (this.season) paintSeasonSky(ctx, this.season, win, index, t, sky.night);
    if (wx === "fog") {
      ctx.fillStyle = sky.night > 0.5 ? "rgba(120,124,140,0.55)" : "rgba(226,230,236,0.62)";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = sky.night > 0.5 ? "rgba(150,154,170,0.35)" : "rgba(245,247,250,0.5)";
      for (let i = 0; i < 3; i++) ctx.fillRect(x + ((Math.floor(t * 2) + i * 17) % (w + 20)) - 20, y + 8 + i * 9, 26, 3);
    }
    if ((wx === "rain" || wx === "drizzle" || wx === "storm") && this.season !== "holidays") {
      ctx.fillStyle = "rgba(220,236,255,0.9)";
      const n = wx === "drizzle" ? w / 6 : wx === "storm" ? w / 1.8 : w / 2.5;
      const slant = wx === "storm" ? 1 : 0;
      for (let i = 0; i < Math.round(n); i++) {
        const rx = x + ((i * 17 + Math.floor(t * 30)) % w);
        const ry = y + ((i * 11 + Math.floor(t * (wx === "drizzle" ? 45 : 70))) % h);
        ctx.fillRect(rx, ry, 1, wx === "drizzle" ? 1 : 2);
        if (slant) ctx.fillRect(rx - 1, ry + 2, 1, 1);
      }
    }
    if (wx === "snow" && this.season !== "holidays" && this.season !== "snowday") {
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < Math.round(w / 3); i++) {
        const fx = x + ((i * 13 + Math.round(Math.sin(t * 0.8 + i) * 2)) % w + w) % w;
        const fy = y + ((i * 7 + Math.floor(t * 9)) % h);
        ctx.fillRect(fx, fy, 1, 1);
      }
    }
    // Lightning
    const bolt = t - this.lightningAt;
    if (wx === "storm" && bolt >= 0 && bolt < 0.22) {
      ctx.fillStyle = `rgba(255,255,255,${0.75 * (1 - bolt / 0.22)})`;
      ctx.fillRect(x, y, w, h);
      if (index === 0) {
        ctx.fillStyle = "#fffbe0";
        let bx = x + w * 0.6;
        for (let by = y; by < y + h - 8; by += 3) {
          bx += hash(`bolt${Math.floor(this.lightningAt)}-${by}`) % 3 - 1;
          ctx.fillRect(Math.round(bx), by, 1, 3);
        }
      }
    }
  }

  private drawSunbeam(ctx: CanvasRenderingContext2D, env: Env): void {
    const sky = this.skyColors(env.hour);
    if (sky.night > 0.5 || (env.weather !== "clear" && env.weather !== "partly") || this.theme.lighting?.sunbeam === false) return;
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
    const night0 = this.skyColors(env.hour).night;
    const party = (this.anim.get("lights") ?? 0) > this.time;
    if (this.theme.wallLights) {
      this.theme.wallLights(ctx, this.L!, { ...this.paintInfo(env), party, brokenBulbX: this.brokenBulbX }, glowPass);
      return;
    }
    const night = party ? Math.max(night0, 0.7) : night0;
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
            const dead = this.brokenBulbX === x && Math.floor(this.time * 9) % 7 !== 0;
            const on = night > 0.3 && !dead;
            const tw = party ? ((n + Math.floor(this.time * 8)) % 4 === 0 ? 1 : 0.3) : 0.65 + 0.35 * Math.sin(this.time * 1.3 + n * 1.7);
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
              ctx.fillStyle = dead ? "#5a5050" : on ? c : mix(c, "#6b5a5a", 0.45);
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
    const sprite = this.dressed("speaker", () => this.theme.speaker?.(speakerSprite) ?? speakerSprite());
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
    if (this.theme.fishTank) {
      const info = { t, hour: this.hour, night: this.skyColors(this.hour).night, weather: this.weather, date: new Date(), season: this.season };
      if (this.theme.fishTank(ctx, this.L!.fishtank, { ...info, fish: this.fish, feeding: t < this.feedingUntil })) return;
    }
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
    const gloom = env.weather === "storm" ? 0.13 : env.weather === "rain" || env.weather === "fog" || env.weather === "snow" ? 0.08 : env.weather === "clear" || env.weather === "partly" ? 0 : 0.05;
    const classic = sky.night * 0.5 + gloom;
    const lit = this.theme.lighting;
    const darkness = lit?.darkness ? lit.darkness(sky.night, env.weather, classic) : classic;
    if (darkness < 0.02) return;
    const d = this.dark!;
    const gl = this.glow!;
    const lay = () => {
      ctx.drawImage(d, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(gl, 0, 0);
      ctx.restore();
    };
    // The pools of light are dozens of soft gradients: redraw them 10 times a
    // second (they move slowly), lay them over every frame.
    if (this.litAt >= 0 && this.time >= this.litAt && this.time - this.litAt < 0.1) return lay();
    this.litAt = this.time;
    const dc = ctx2d(d);
    dc.globalCompositeOperation = "source-over";
    dc.clearRect(0, 0, L.W, L.H);
    dc.fillStyle = `rgba(${lit?.tint ?? "16,14,44"},${darkness})`;
    dc.fillRect(0, 0, L.W, L.H);
    dc.globalCompositeOperation = "destination-out";
    const hole = (x: number, y: number, r: number, k: number) => {
      const g = dc.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${k})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      dc.fillStyle = g;
      dc.fillRect(x - r, y - r, r * 2, r * 2);
    };
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
      // Work that started since you last looked lights the desk in the cool glow.
      const glow = this.glowOf(a);
      const tint = glow ? GLOW_HAZE[glow] : a.thread.mood === "needs-you" ? "#ffcf4a" : a.thread.mood === "error" ? "#ff6b6b" : a.thread.mood === "done" ? "#7be08f" : "#8ff0b0";
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
    const zapped = this.mishap?.phase === "zap" ? this.agents.get(this.mishap.id) : undefined;
    if (zapped) lights.push([zapped.x, zapped.y - 14, 46, 1, "#bfeaff", 0.45]);
    for (const n of this.npcs) {
      if (n.kind === "technician" && this.climbOf(n) > 0) lights.push([n.x, n.y - this.climbOf(n) - 20, 20, 0.8, "#fff3c0", 0.12]);
    }
    const espresso = L.pokeables.find((q) => q.id === "coffee");
    if (espresso) lights.push([espresso.rect.x + 13, espresso.rect.y + 10, 12, 0.7, "#5ad18a", 0.12]);
    if (this.season) lights.push(...seasonLights(L, this.season));
    if (this.event) {
      lights.push(...eventLights(this.event));
      if (this.event.kind === "lanterns") {
        for (const a of this.eventPeople()) lights.push([a.x + (a.facing === "left" ? -12 : 12), a.y - 17, 18, 0.9, "#ffcf8a", 0.22]);
      }
    }
    if (lit?.lights) lights.push(...lit.lights(L, this.paintInfo(env)));
    // The glow stays gentle at night: a small pool of light goes with them (at a desk, the desk lamp has it).
    for (const a of this.agents.values()) {
      const glow = a.spot?.kind === "desk" && this.settled(a) ? null : this.glowOf(a);
      if (glow) lights.push([a.x, a.y - 10, 22, 0.5, GLOW_HAZE[glow], 0.14]);
    }
    for (const [x, y, r, k] of lights) if (r > 0) hole(x, y, r, k);
    const gc = ctx2d(gl);
    gc.globalCompositeOperation = "source-over";
    gc.clearRect(0, 0, L.W, L.H);
    gc.globalCompositeOperation = "lighter";
    for (const [x, y, r, , color, k] of lights) {
      if (r <= 0 || k <= 0) continue;
      const g = gc.createRadialGradient(x, y, 0, x, y, r * 0.8);
      g.addColorStop(0, `${color}${Math.round(255 * k * sky.night).toString(16).padStart(2, "0")}`);
      g.addColorStop(1, `${color}00`);
      gc.fillStyle = g;
      gc.fillRect(x - r, y - r, r * 2, r * 2);
    }
    lay();
  }

  /** 0 by day, 1 at night: drives overlay dimming in the view. */
  nightness(hour: number): number {
    return this.skyColors(hour).night;
  }
}
