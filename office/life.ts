// Office life beyond the threads: how anyone walks the hallways, and the
// little office events (parties, cake, cornhole…) idle agents drop in on.

import { connect, type Facing, type Network, type Point, type Rect, type Spot } from "./layout.ts";
import { cornholeSprite } from "./furniture.ts";
import { gift, roundTable, seasonalEventDecor, seasonalEventFloor, type Season } from "./seasons.ts";

export { seasonOf, seasonsOf, type Season } from "./seasons.ts";
import { OUTLINE } from "./characters.ts";
import { drawPixelText, pixelTextWidth } from "./pixelfont.ts";
import type { SoundName } from "./sound.ts";

// ------------------------------------------------------------------ walking

export interface Walker {
  x: number;
  y: number;
  /** Remaining waypoints. */
  path: Point[];
  /** Waypoints walked since the last hallway point, for walking back out. */
  approach: Point[];
  facing: Facing;
  walked: number;
}

export function nearestHall(net: Network, y: number): number {
  return net.halls.reduce((best, h) => (Math.abs(h - y) < Math.abs(best - y) ? h : best), net.halls[0] ?? y);
}

/** Waypoints from where a walker is back out to the hallway; the last one is on it. */
export function backout(w: Walker, net: Network): Point[] {
  if (w.path.length > 0) {
    const i = w.path.findIndex((p) => p.c);
    if (i >= 0) return w.path.slice(0, i + 1);
  }
  const back = [...w.approach].reverse();
  if (back.length > 0 && back[back.length - 1]!.c) return back;
  return [{ x: Math.round(w.x), y: nearestHall(net, w.y), c: true }];
}

/** Full route from where the walker is to the end of `target` (which starts on a hallway). */
export function route(w: Walker, net: Network, target: readonly Point[]): Point[] {
  const back = backout(w, net);
  const hall = back[back.length - 1]!;
  const start = target[0];
  if (!start) return back;
  return [...back, ...connect(net, hall, start), ...target.slice(1)];
}

/** Advance along the path; true when the last waypoint was reached in this step. */
export function step(w: Walker, dt: number, speed: number): boolean {
  if (w.path.length === 0) return false;
  let budget = speed * dt;
  while (budget > 0 && w.path.length > 0) {
    const p = w.path[0]!;
    const dx = p.x - w.x;
    const dy = p.y - w.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.01) w.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "front" : "back";
    if (d <= budget) {
      w.x = p.x;
      w.y = p.y;
      budget -= d;
      w.walked += d;
      w.path.shift();
      if (p.c) w.approach = [p];
      else w.approach.push(p);
    } else {
      w.x += (dx / d) * budget;
      w.y += (dy / d) * budget;
      w.walked += budget;
      budget = 0;
    }
  }
  return w.path.length === 0;
}

/** A spot's path, but stopping beside it (on the lane in front) instead of on it. */
export function besideSpot(s: Spot, dx = 0): Point[] {
  const p = s.path;
  if (p.length <= 2) return p.map((q, i) => (i === p.length - 1 ? { x: q.x + dx, y: q.y } : q));
  const lane = p[p.length - 2]!;
  return [...p.slice(0, -2), { x: lane.x + dx, y: lane.y }];
}

// ------------------------------------------------------------------ events

export type EventKind =
  | "holiday"
  | "halloween"
  | "lanterns"
  | "thanksgiving"
  | "valentines"
  | "stpatricks"
  | "easter"
  | "diwali"
  | "holi"
  | "summer"
  | "carnival"
  | "snowday"
  | "lunarnewyear"
  | "maifest"
  | "oktoberfest"
  | "party"
  | "birthday"
  | "baby-shower"
  | "pizza"
  | "karaoke"
  | "cornhole"
  | "darts"
  | "kids"
  | "yoga"
  | "ice-cream";

export interface EventInfo {
  title: string;
  /** TV headline. */
  tv: string;
  banner: string;
  start: SoundName;
  /** Repeating sound while it runs, and roughly how often (s). */
  ambient?: [SoundName, number];
  /** Local hours it can happen at random. */
  hours: [number, number];
  needsGames?: boolean;
  /** Only happens in this season. */
  season?: Season;
}

export const EVENTS: Record<EventKind, EventInfo> = {
  holiday: { title: "Holiday party", tv: "Holiday party! Cocoa and cookies by the tree", banner: "HAPPY HOLIDAYS", start: "jingle", ambient: ["jingle", 26], hours: [11, 23], season: "holidays" },
  halloween: { title: "Costume party", tv: "Halloween costume party. Trick or treat!", banner: "BOO!", start: "spooky", ambient: ["spooky", 24], hours: [13, 24], season: "halloween" },
  lanterns: { title: "Lantern walk", tv: "Laternenfest: lantern walk around the St. Martin's fire", banner: "LATERNENFEST", start: "lantern", ambient: ["lantern", 20], hours: [16, 21.5], season: "laternenfest" },
  thanksgiving: { title: "Thanksgiving dinner", tv: "Thanksgiving dinner in the lounge. Save room for pie!", banner: "HAPPY THANKSGIVING", start: "chime", ambient: ["cheer", 26], hours: [12, 21], season: "thanksgiving" },
  valentines: { title: "Valentine's party", tv: "Valentine's Day: chocolates and cards in the lounge", banner: "BE MINE", start: "harp", ambient: ["harp", 16], hours: [10, 22], season: "valentines" },
  stpatricks: { title: "St. Patrick's Day party", tv: "St. Patrick's Day! Wear something green", banner: "ST PATRICK'S DAY", start: "jig", ambient: ["jig", 13], hours: [12, 23], season: "stpatricks" },
  easter: { title: "Easter egg hunt", tv: "Easter egg hunt in the lounge. How many can you find?", banner: "HAPPY EASTER", start: "giggle", ambient: ["chime", 4.5], hours: [9, 17], season: "easter" },
  diwali: { title: "Diwali", tv: "Happy Diwali! Lights, rangoli and sweets in the lounge", banner: "HAPPY DIWALI", start: "sitar", ambient: ["sitar", 15], hours: [16, 23], season: "diwali" },
  holi: { title: "Holi", tv: "Happy Holi! Mind the colors", banner: "HAPPY HOLI", start: "dhol", ambient: ["dhol", 8], hours: [10, 18], season: "holi" },
  summer: { title: "Summer party", tv: "Summer party: BBQ and lemonade in the lounge", banner: "SUMMER PARTY", start: "steeldrum", ambient: ["steeldrum", 15], hours: [14, 21.5], season: "summer" },
  carnival: { title: "Carnival", tv: "Helau! Carnival in the lounge", banner: "HELAU!", start: "tusch", ambient: ["tusch", 13], hours: [11, 23], season: "carnival" },
  snowday: { title: "Snow day", tv: "Snow day! Hot cocoa and a snowman in the lounge", banner: "SNOW DAY", start: "jingle", ambient: ["bubble", 14], hours: [10, 18], season: "snowday" },
  lunarnewyear: { title: "Lunar New Year", tv: "Happy Lunar New Year! Dragon dance in the lounge", banner: "LUNAR NEW YEAR", start: "firecracker", ambient: ["firecracker", 11], hours: [11, 21], season: "lunarnewyear" },
  maifest: { title: "Maifest", tv: "Maifest: dancing around the maypole", banner: "MAIFEST", start: "oompah", ambient: ["oompah", 14], hours: [10, 19], season: "spring" },
  oktoberfest: { title: "Oktoberfest", tv: "O'zapft is! Oktoberfest in the lounge", banner: "O'ZAPFT IS!", start: "oompah", ambient: ["oompah", 15], hours: [12, 22], season: "oktoberfest" },
  party: { title: "Office party", tv: "Office party! Snacks and music in the lounge", banner: "PARTY!", start: "party", ambient: ["cheer", 18], hours: [15, 22] },
  birthday: { title: "Birthday cake", tv: "Happy birthday! There's cake in the lounge", banner: "HAPPY BIRTHDAY", start: "birthday", hours: [10, 18] },
  "baby-shower": { title: "Baby shower", tv: "Baby shower in the lounge. Sign the card!", banner: "OH BABY!", start: "party", ambient: ["giggle", 20], hours: [11, 17] },
  pizza: { title: "Pizza lunch", tv: "Free pizza in the lounge. First come, first served", banner: "PIZZA!", start: "cheer", hours: [11.5, 14] },
  karaoke: { title: "Karaoke", tv: "Karaoke hour. Who's next on the mic?", banner: "KARAOKE", start: "party", ambient: ["piano", 5], hours: [16, 23] },
  cornhole: { title: "Cornhole tournament", tv: "Cornhole tournament in progress", banner: "CORNHOLE CUP", start: "whistle", ambient: ["toss", 2.6], hours: [12, 19] },
  darts: { title: "Darts night", tv: "Darts night in the games room", banner: "DARTS NIGHT", start: "whistle", ambient: ["dart", 3.2], hours: [15, 23], needsGames: true },
  kids: { title: "Bring your kids to work day", tv: "Bring your kids to work day! Mind the little ones", banner: "KIDS DAY", start: "giggle", ambient: ["giggle", 9], hours: [9, 17] },
  yoga: { title: "Stretch break", tv: "Stretch break: reach for the ceiling", banner: "STRETCH", start: "chime", hours: [7, 12] },
  "ice-cream": { title: "Ice cream social", tv: "Ice cream social. Sprinkles are free", banner: "ICE CREAM", start: "cheer", hours: [12, 18] },
};

export const EVENT_KINDS = Object.keys(EVENTS) as EventKind[];

/**
 * A random event that suits the time of day and the season (anything that is
 * possible at all as a fallback). In season, the seasonal party comes up half
 * the time.
 */
export function pickEventKind(hour: number, hasGames: boolean, rand: () => number, seasons: readonly Season[] = []): EventKind {
  const possible = EVENT_KINDS.filter((k) => {
    const e = EVENTS[k];
    return (!e.needsGames || hasGames) && (!e.season || seasons.includes(e.season));
  });
  const inHours = (k: EventKind) => hour >= EVENTS[k].hours[0] && hour < EVENTS[k].hours[1];
  const seasonal = possible.filter((k) => EVENTS[k].season && inHours(k));
  if (seasonal.length > 0 && rand() < 0.5) return seasonal[Math.floor(rand() * seasonal.length)]!;
  const fits = possible.filter((k) => !EVENTS[k].season && inHours(k));
  const pool = fits.length > 0 ? fits : possible;
  return pool[Math.floor(rand() * pool.length)]!;
}

export interface EventPlan {
  kind: EventKind;
  area: Rect;
  center: Point;
  spots: Spot[];
  /** Where cornhole boards stand, if any. */
  boards: Point[];
  /** The circle people stand on. */
  rx: number;
  ry: number;
  /** Hidden things to find (Easter eggs), and how many are found. */
  items: Point[];
  found: number;
}

/** Where people stand for an event, and how they get there. */
export function planEvent(kind: EventKind, area: Rect, net: Network, count: number): EventPlan {
  const cx = Math.round(area.x + area.w / 2);
  const cy = Math.round(area.y + area.h / 2 + 4);
  const lane = Math.round(area.y + area.h + 2);
  const hall = nearestHall(net, lane);
  const aisle = net.aisles.reduce((best, x) => (Math.abs(x - cx) < Math.abs(best - cx) ? x : best), net.aisles[0] ?? cx);
  const pathTo = (x: number, y: number): Point[] => [
    { x: aisle, y: hall, c: true },
    { x: aisle, y: lane },
    { x, y: lane },
    { x, y },
  ];
  const n = Math.max(2, Math.min(count, 12));
  const spots: Spot[] = [];
  const boards: Point[] = [];
  const parade = kind === "lanterns" || kind === "maifest";
  const rx = Math.max(24, Math.min(area.w / 2 - 12, parade ? 64 : 56));
  const ry = Math.max(10, Math.min(area.h / 2 - 8, parade ? 26 : 20));
  const add = (i: number, x: number, y: number, facing: Facing) => {
    spots.push({
      id: `event-${i}`,
      kind: "event",
      group: "event",
      x: Math.round(x),
      y: Math.round(y),
      facing,
      pose: "stand",
      path: pathTo(Math.round(x), Math.round(y)),
      activity: `at the ${EVENTS[kind].title.toLowerCase()}`,
    });
  };
  const faceCenter = (x: number, y: number): Facing => {
    const dx = cx - x;
    const dy = cy - y;
    return Math.abs(dx) * 0.6 > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "front" : "back";
  };
  if (kind === "yoga") {
    const cols = Math.max(2, Math.min(5, Math.floor((area.w - 10) / 26)));
    for (let i = 0; i < n; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      add(i, area.x + (area.w - (cols - 1) * 26) / 2 + col * 26, area.y + area.h - 6 - row * 24, "front");
    }
  } else if (kind === "karaoke") {
    // A singer at the mic, everyone else in a little crowd facing them.
    add(0, cx, area.y + 22, "front");
    for (let i = 1; i < n; i++) {
      const col = (i - 1) % 5;
      const row = Math.floor((i - 1) / 5);
      add(i, cx - 44 + col * 22 + (row % 2) * 11, Math.min(area.y + area.h - 4, area.y + 50 + row * 18), "back");
    }
  } else if (kind === "darts") {
    for (let i = 0; i < n; i++) add(i, area.x + 30 + (i % 5) * 20, area.y + area.h - 6 - Math.floor(i / 5) * 18, "left");
  } else {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.5;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      add(i, x, y, faceCenter(x, y));
    }
    if (kind === "cornhole") boards.push({ x: cx - Math.round(rx * 0.45), y: cy }, { x: cx + Math.round(rx * 0.45), y: cy });
  }
  const items: Point[] = [];
  if (kind === "easter") {
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4 + 0.3;
      const r = 0.35 + ((i * 0.37) % 0.6);
      items.push({ x: Math.round(cx + Math.cos(a) * (area.w / 2 - 8) * r), y: Math.round(cy + Math.sin(a) * (area.h / 2 - 6) * r + 4) });
    }
  }
  return { kind, area, center: { x: cx, y: cy }, spots, boards, rx, ry, items, found: 0 };
}

// ------------------------------------------------------------------ event decor

export interface Drawable {
  z: number;
  draw: () => void;
}

const BALLOONS: Record<string, string[]> = {
  lanterns: ["#ff8a3d", "#ffd84a", "#e5484d", "#5ad1ff"],
  thanksgiving: ["#e5484d", "#ff8a3d", "#d9a531", "#b0632a"],
  valentines: ["#e5484d", "#ff9fb2", "#fbfaf5", "#ff6b8b"],
  stpatricks: ["#30a46c", "#fbfaf5", "#ffd84a", "#257a42"],
  easter: ["#ffc4d6", "#bfe3ff", "#fff3b8", "#d7f5d0"],
  diwali: ["#ff9a3d", "#ffd84a", "#e5484d", "#c45aa8"],
  holi: ["#ff4fa0", "#ffd84a", "#30c46c", "#3e8ed0"],
  summer: ["#ff6b8b", "#ffd84a", "#5ad1ff", "#86e07f"],
  carnival: ["#e5484d", "#ffd84a", "#3e8ed0", "#30a46c"],
  snowday: ["#5aa9e6", "#fbfaf5", "#e5484d", "#bfe3ff"],
  lunarnewyear: ["#e5484d", "#ffd84a", "#c4383f", "#ffd84a"],
  maifest: ["#5aa9e6", "#fbfaf5", "#ff9fb2", "#ffd84a"],
  oktoberfest: ["#5aa9e6", "#fbfaf5", "#5aa9e6", "#fbfaf5"],
  holiday: ["#e5484d", "#30a46c", "#ffd84a", "#fbfaf5"],
  halloween: ["#ff8a3d", "#3a3046", "#8e5bd8", "#86e07f"],
  party: ["#ff6b8b", "#ffd84a", "#5ad1ff", "#86e07f", "#c39bff"],
  birthday: ["#ff6b8b", "#ffd84a", "#5ad1ff", "#ff9a3d"],
  "baby-shower": ["#ffc4d6", "#bfe3ff", "#fff3b8", "#d7f5d0"],
  kids: ["#ff6b8b", "#ffd84a", "#86e07f", "#5ad1ff"],
};

function balloon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, anchorY: number): void {
  ctx.fillStyle = "#6b5a6e";
  for (let yy = y + 6; yy < anchorY; yy += 2) ctx.fillRect(Math.round(x + Math.sin(yy * 0.4) * 0.6), yy, 1, 1);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 3, y, 7, 5);
  ctx.fillRect(x - 2, y - 1, 5, 7);
  ctx.fillStyle = color;
  ctx.fillRect(x - 2, y, 5, 5);
  ctx.fillRect(x - 1, y + 5, 3, 0.01);
  ctx.fillStyle = "#ffffff99";
  ctx.fillRect(x - 1, y + 1, 1, 1);
}

function banner(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, width: number, colors: string[], t: number): void {
  const x0 = Math.round(cx - width / 2);
  const x1 = Math.round(cx + width / 2);
  // Poles
  ctx.fillStyle = "#8a5a34";
  ctx.fillRect(x0 - 1, y, 2, 26);
  ctx.fillRect(x1 - 1, y, 2, 26);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x0 - 3, y + 25, 6, 2);
  ctx.fillRect(x1 - 3, y + 25, 6, 2);
  // Pennant string
  for (let x = x0; x <= x1; x++) {
    const k = (x - x0) / Math.max(1, x1 - x0);
    const yy = y + 1 + Math.round(Math.sin(k * Math.PI) * 4);
    ctx.fillStyle = "#4a3a46";
    ctx.fillRect(x, yy, 1, 1);
    if ((x - x0) % 6 === 3 && x < x1 - 2) {
      ctx.fillStyle = colors[Math.floor((x - x0) / 6) % colors.length]!;
      ctx.fillRect(x - 1, yy + 1, 3, 2);
      ctx.fillRect(x, yy + 3, 1, 1 + (Math.floor(t * 2 + x) % 2));
    }
  }
  // Sign below the pennants
  const tw = pixelTextWidth(text);
  if (tw + 8 <= width) {
    const sx = Math.round(cx - tw / 2) - 3;
    const sy = y + 10;
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(sx - 1, sy - 1, tw + 8, 9);
    ctx.fillStyle = "#fff8e6";
    ctx.fillRect(sx, sy, tw + 6, 7);
    drawPixelText(ctx, text, sx + 3, sy + 1, colors[0] === "#ffc4d6" ? "#c45a8a" : "#c4383f");
  }
}

function cake(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 6, y - 8, 12, 8);
  ctx.fillStyle = "#fbe3ec";
  ctx.fillRect(x - 5, y - 7, 10, 6);
  ctx.fillStyle = "#ff9fb2";
  ctx.fillRect(x - 5, y - 4, 10, 1);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 5, y - 7, 10, 1);
  for (const dx of [-3, 0, 3]) {
    ctx.fillStyle = "#5ad1ff";
    ctx.fillRect(x + dx, y - 10, 1, 3);
    ctx.fillStyle = Math.floor(t * 8 + dx) % 2 ? "#ffd84a" : "#ff9a3d";
    ctx.fillRect(x + dx, y - 12, 1, 2);
  }
}

function pizzaBox(ctx: CanvasRenderingContext2D, x: number, y: number, slices: number): void {
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 6, y - 6, 12, 7);
  ctx.fillStyle = "#e9d3a8";
  ctx.fillRect(x - 5, y - 5, 10, 5);
  ctx.fillStyle = "#f2b24e";
  ctx.fillRect(x - 4, y - 5, 8, 4);
  ctx.fillStyle = "#d9482b";
  for (let i = 0; i < slices; i++) ctx.fillRect(x - 3 + (i % 3) * 3, y - 4 + Math.floor(i / 3) * 2, 1, 1);
}

function iceCreamCart(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  // Umbrella
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 13, y - 31, 26, 6);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? "#ffffff" : "#ff8fb2";
    ctx.fillRect(x - 12 + i * 4, y - 30, 4, 4);
  }
  ctx.fillStyle = "#6b5a6e";
  ctx.fillRect(x, y - 26, 1, 12);
  // Cart
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 11, y - 15, 22, 12);
  ctx.fillStyle = "#bfe3ff";
  ctx.fillRect(x - 10, y - 14, 20, 10);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 10, y - 14, 20, 2);
  for (const [dx, c] of [[-7, "#ff9fb2"], [-2, "#fff3b8"], [3, "#a8e6a1"]] as const) {
    ctx.fillStyle = c;
    ctx.fillRect(x + dx, y - 17, 3, 3);
  }
  ctx.fillStyle = OUTLINE;
  const wob = Math.floor(t * 2) % 2;
  ctx.fillRect(x - 8, y - 3, 3, 3);
  ctx.fillRect(x + 5, y - 3 + wob * 0, 3, 3);
}

function micStand(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = "#4b4458";
  ctx.fillRect(x, y - 16, 1, 16);
  ctx.fillRect(x - 3, y, 7, 1);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 1, y - 19, 3, 4);
  ctx.fillStyle = "#b9b9c9";
  ctx.fillRect(x, y - 18, 1, 2);
}

function floorSpeaker(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 5, y - 14, 10, 14);
  ctx.fillStyle = "#3a3546";
  ctx.fillRect(x - 4, y - 13, 8, 12);
  const pump = Math.floor(t * 4) % 2;
  ctx.fillStyle = "#6b6280";
  ctx.fillRect(x - 2 - pump, y - 8 - pump, 4 + pump * 2, 4 + pump * 2);
  ctx.fillStyle = "#2a2633";
  ctx.fillRect(x - 1, y - 7, 2, 2);
}

/** Floor-level decor (mats, dance-floor light) drawn under everyone. */
export function drawEventFloor(ctx: CanvasRenderingContext2D, plan: EventPlan, t: number, night: number): void {
  const { kind, center: c } = plan;
  if (kind === "yoga") {
    const mats = ["#7fc4b8", "#c39bff", "#ff9fb2", "#ffd479", "#86c5ff"];
    plan.spots.forEach((s, i) => {
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(s.x - 7, s.y - 5, 14, 8);
      ctx.fillStyle = mats[i % mats.length]!;
      ctx.fillRect(s.x - 6, s.y - 4, 12, 6);
      ctx.fillStyle = "#ffffff44";
      ctx.fillRect(s.x - 6, s.y - 4, 12, 1);
    });
  }
  if (kind === "party" || kind === "karaoke") {
    const colors = ["#ff6b8b", "#5ad1ff", "#ffd84a", "#86e07f"];
    ctx.globalAlpha = 0.16 + night * 0.18;
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + i * 1.7;
      const x = c.x + Math.cos(a) * plan.area.w * 0.3;
      const y = c.y + Math.sin(a * 1.3) * plan.area.h * 0.25;
      ctx.fillStyle = colors[i % colors.length]!;
      ctx.fillRect(Math.round(x - 6), Math.round(y - 3), 12, 6);
      ctx.fillRect(Math.round(x - 4), Math.round(y - 4), 8, 8);
    }
    ctx.globalAlpha = 1;
  }
  if (EVENTS[kind].season) seasonalEventFloor(ctx, plan, t, night);
  if (kind === "kids") {
    // A play mat with hopscotch.
    ctx.fillStyle = "#ffe9a8";
    ctx.fillRect(c.x - 20, c.y - 6, 40, 12);
    ctx.fillStyle = "#e5a04e";
    for (let i = 0; i < 5; i++) ctx.fillRect(c.x - 18 + i * 8, c.y - 5, 1, 10);
    drawPixelText(ctx, "123", c.x - 15, c.y - 2, "#c4383f");
  }
}

/** Upright decor (tables, balloons, banner), depth-sorted with the people. */
export function eventDecor(ctx: CanvasRenderingContext2D, plan: EventPlan, t: number): Drawable[] {
  const { kind, center: c, area } = plan;
  const info = EVENTS[kind];
  const out: Drawable[] = [];
  const colors = BALLOONS[kind] ?? BALLOONS.party!;
  const back = Math.round(area.y + 2);
  const bannerW = Math.min(area.w - 16, Math.max(70, pixelTextWidth(info.banner) + 24));
  if (kind !== "darts") out.push({ z: back + 26, draw: () => banner(ctx, info.banner, c.x, back - 6, bannerW, colors, t) });
  const bunch = (x: number, y: number, n: number) => {
    out.push({
      z: y,
      draw: () => {
        for (let i = 0; i < n; i++) {
          const bx = x - (n - 1) * 3 + i * 6 + Math.round(Math.sin(t * 1.3 + i) * 1);
          const by = y - 26 - (i % 2) * 5 + Math.round(Math.sin(t * 1.7 + i * 2) * 1.5);
          balloon(ctx, bx, by, colors[i % colors.length]!, y - 1);
        }
        ctx.fillStyle = "#6b5a6e";
        ctx.fillRect(x - 1, y - 2, 3, 2);
      },
    });
  };
  if (EVENTS[kind].season) {
    out.push(...seasonalEventDecor(ctx, plan, t));
    return out;
  }
  switch (kind) {
    case "party":
      out.push({
        z: c.y + 2,
        draw: () => {
          roundTable(ctx, c.x, c.y + 2, "#c39bff");
          ctx.fillStyle = OUTLINE;
          ctx.fillRect(c.x - 4, c.y - 9, 9, 5);
          ctx.fillStyle = "#ff6b8b";
          ctx.fillRect(c.x - 3, c.y - 8, 7, 3);
          for (const [dx, col] of [[-10, "#ffd84a"], [-7, "#86e07f"], [8, "#5ad1ff"], [11, "#ffd84a"]] as const) {
            ctx.fillStyle = col;
            ctx.fillRect(c.x + dx, c.y - 6, 2, 2);
          }
        },
      });
      bunch(area.x + 12, c.y + 8, 3);
      bunch(area.x + area.w - 12, c.y + 8, 3);
      break;
    case "birthday":
      out.push({
        z: c.y + 2,
        draw: () => {
          roundTable(ctx, c.x, c.y + 2, "#fff3b8");
          cake(ctx, c.x, c.y - 4, t);
        },
      });
      bunch(area.x + 12, c.y + 8, 4);
      break;
    case "baby-shower":
      out.push({
        z: c.y + 2,
        draw: () => {
          roundTable(ctx, c.x, c.y + 2, "#ffe1ec");
          gift(ctx, c.x - 6, c.y - 4, "#bfe3ff", "#ffffff");
          gift(ctx, c.x + 4, c.y - 4, "#ffc4d6", "#ffffff");
          gift(ctx, c.x - 1, c.y - 9, "#fff3b8", "#ff9fb2");
        },
      });
      bunch(area.x + 12, c.y + 8, 4);
      bunch(area.x + area.w - 12, c.y + 8, 3);
      break;
    case "pizza":
      out.push({
        z: c.y + 2,
        draw: () => {
          roundTable(ctx, c.x, c.y + 2, "#e8f0f8");
          const left = Math.max(1, 6 - Math.floor((t % 120) / 20));
          pizzaBox(ctx, c.x - 7, c.y - 3, left);
          pizzaBox(ctx, c.x + 7, c.y - 3, Math.max(0, left - 2));
        },
      });
      break;
    case "ice-cream":
      out.push({ z: c.y + 2, draw: () => iceCreamCart(ctx, c.x, c.y + 2, t) });
      break;
    case "karaoke":
      out.push({ z: area.y + 24, draw: () => micStand(ctx, plan.spots[0] ? plan.spots[0].x + 7 : c.x, area.y + 24) });
      out.push({ z: area.y + 20, draw: () => floorSpeaker(ctx, c.x - 30, area.y + 20, t) });
      out.push({ z: area.y + 20, draw: () => floorSpeaker(ctx, c.x + 30, area.y + 20, t) });
      break;
    case "cornhole": {
      const board = cornholeSprite();
      for (const b of plan.boards) out.push({ z: b.y + 6, draw: () => ctx.drawImage(board, b.x - 8, b.y - 14) });
      break;
    }
    case "kids":
      bunch(area.x + 12, c.y + 8, 4);
      bunch(area.x + area.w - 12, c.y + 8, 2);
      break;
    case "yoga":
      out.push({ z: area.y + 12, draw: () => floorSpeaker(ctx, area.x + area.w - 10, area.y + 14, t) });
      break;
    case "darts":
      break;
  }
  return out;
}
