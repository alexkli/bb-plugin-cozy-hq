// Mountain Cabin: the lodge's floor plans. A timber lodge above the treeline:
// the mudroom by the door (where threads wait for you), the great room round
// a stone fireplace with the TV on the chimney, the map room with the peaks
// in its windows, the workroom, the lodge kitchen, the ski room, a cold room
// for the servers and your corner study. Outside the log wall a sun deck
// (where the office gets together) with a barrel sauna, and beyond its rail
// the piste and the chairlift. Wide panels have the deck along the east side
// (the sky and the peaks over it); narrow tall ones and phones along the
// bottom.
import type { Layout, Rect, WallSegment } from "../../layout.ts";
import {
  bossToys,
  Builder,
  buildArcade,
  buildGames,
  buildKitchen,
  buildLibrary,
  buildLounge,
  buildMeeting,
  buildPods,
  buildServerRoom,
  clamp,
  finish,
  POD_H,
  via,
  type Access,
  type Network,
  type Point,
  type Spot,
} from "../../themekit.ts";
import { row, squeezeIn, type Nook, type Zone } from "./squeeze.ts";

export type SegKind = "timber" | "chimney" | "open";

/** What the backdrop and the live layers need to know about the plan (L.themeData). */
export interface CabinPlan {
  variant: "wide" | "portrait";
  /** The kind of each back-wall segment, by index. */
  segKinds: SegKind[];
  /** The fireplace: the stone chimney, the firebox in its face, the mantel beam, the hearth slab on the floor. */
  fire: { chimney: Rect; box: Rect; mantel: Rect; hearth: Rect };
  /** Split logs stacked on the hearth beside the fire. */
  woodpile: Rect;
  /** Inside the lodge's walls. */
  inside: Rect;
  /** The sun deck and which side of the lodge it's on (null: no room for one). */
  deck: Rect | null;
  deckSide: "east" | "south" | null;
  /** Beyond the deck's rail on phones: the strip of piste the lift runs along. */
  slope: Rect | null;
  /** The little chairlift up the mountainside and its piste (null: no room for one). */
  lift: SkiLift | null;
  /** Sky over the roof and over the deck: windows without frames (the distant peaks show there). */
  opens: Rect[];
  /** Where the back wall's top is (the summits show over the roof above it). */
  top: number;
  /** The lodge itself, inside its log walls; everything else is the mountainside. */
  lodge: Rect;
  /** The snowy yard in front of the lodge (wide panels with the height for it). */
  yard: Rect | null;
  /** The mountainside around the lodge. */
  terrain: Terrain;
  /** Where the busy ones squeeze in with a laptop when the desks are full. */
  nooks: Nook[];
  /** The log wall between inside and the deck; gaps are the doorways people walk through. */
  deckWall: { x0: number; y0: number; x1: number; y1: number; gaps: [number, number][] } | null;
  /** The barrel sauna on the deck (its footprint; it stands on its bottom edge). */
  sauna: Rect | null;
  /** Deck chairs (where nappers lie, feet positions). */
  chairs: Point[];
  /** Skis and poles stuck in the snow by the deck wall. */
  skiRack: Rect | null;
  /** The telescope at the study window (its feet) and the window in the study's side wall. */
  telescope: Point | null;
  studyWindow: Rect | null;
  /** The mudroom (the waiting room) and the boot rack along its bottom. */
  mudroom: Rect;
  bootRack: Rect | null;
  /** The snowy doormat inside the door. */
  mat: Rect;
  /** The ski room's waxing bench (a ski on it, an iron) and the skis racked along its back. */
  wax: Rect | null;
  skiWall: Rect | null;
  /** Where a snowman gets built on the deck once enough snow has fallen (its feet). */
  snowman: Point | null;
}

/**
 * The lodge's own little chairlift and the groomed piste beside it. Points are
 * feet positions on the ground; the cable runs CABLE px above them. "y": up
 * the mountainside beside the lodge (the top is up the screen); "x": along the
 * bottom of a phone (the top is at the right).
 */
export interface SkiLift {
  axis: "x" | "y";
  /** Where you get on (the bull wheel) and off at the top station. */
  bottom: Point;
  top: Point;
  /** The groomed piste. */
  piste: Rect;
  /** Where a skier sets off and pulls up at the bottom. */
  start: Point;
  finish: Point;
  /** A kicker on the piste (its middle), for the odd jump. */
  kicker: Point;
  /** The lift operator's hut by the bottom station (it stands on its bottom edge). */
  hut: Rect;
  /** The summit flag at the top of the piste: the secret way to send someone down. */
  flag: Point;
  /** Where someone who rode up stands and waves (a gather spot's feet). */
  wave: Point;
  /** The way out from a hallway to the bottom station (starts on a hallway, ends at `bottom`). */
  way: Point[];
  /** A skier's walk back in from the finish: along a hallway to a door, the last point at the wall. */
  home: Point[];
  /** Everything to click (the lift and the piste). */
  area: Rect;
}

/** How high the cable runs over the ground. */
export const CABLE = 30;

/** What's out on the mountainside: rocks, pines, ice, the path to the door. */
export interface Terrain {
  /** Outcrops and boulders: top-left corner, size, and whether it's a jagged outcrop. */
  rocks: { x: number; y: number; w: number; h: number; jagged: boolean }[];
  /** Stunted pines (feet and height). */
  pines: { x: number; y: number; h: number }[];
  /** Scree: loose stones fanned out below the rocks. */
  scree: Rect[];
  /** A frozen stream down the hillside (its points, top to bottom). */
  stream: Point[] | null;
  /** A small frozen tarn. */
  tarn: Rect | null;
  /** A cairn and a trail sign. */
  cairn: Point | null;
  sign: Point | null;
  /** The trodden path from the front door, with footprints, and the sled beside it. */
  path: { x: number; y0: number; y1: number } | null;
  sled: Point | null;
  /** Firewood stacked against the outside of the west wall. */
  logs: Rect | null;
}

/** Whether a window is one of the plan's open stretches of sky (no frame, no sill). */
export function isOpen(p: CabinPlan | null, win: Rect): boolean {
  return !!p && p.opens.some((o) => o.x === win.x && o.y === win.y && o.w === win.w);
}

export function planOf(L: Layout): CabinPlan | null {
  const d = L.themeData as CabinPlan | undefined;
  return d && Array.isArray(d.segKinds) && d.fire ? d : null;
}

// ------------------------------------------------------------------ rooms

/**
 * The mudroom: pine benches with boot cubbies, the first row against the
 * wall under the coat hooks; a hut desk with the bell by the door. Seats face
 * you. `below`: the hallway is under the room (else above).
 */
function buildMudroom(b: Builder, r: Rect, hallY: number, aisleX: number, below: boolean, rows: number, deskRight: boolean): { recX: number } {
  b.rooms.push({ kind: "waiting", rect: r });
  const recX = deskRight ? r.x + r.w - 40 : r.x + 4;
  b.prop("reception", "reception", recX, r.y + 4, r.y + 22);
  b.poke("bell", "bell", { x: recX, y: r.y - 2, w: 34, h: 24 });
  const seats: Spot[] = [];
  const seat = (id: string, x: number, y: number) => {
    const lane = below ? y + 10 : y - 24;
    seats.push({
      id,
      kind: "review",
      group: "review",
      x,
      y,
      facing: "front",
      pose: "sit-front",
      path: [{ x: aisleX, y: hallY, c: true }, { x: aisleX, y: lane }, { x, y: lane }, { x, y }],
      activity: "waiting for you",
      lift: 3,
    });
  };
  for (let row = 0; row < rows; row++) {
    const y = r.y + 30 + row * 44;
    // Row 0 stays clear of the hut desk; the free-standing row is centered.
    const x0 = row === 0 ? (deskRight ? r.x + 8 : recX + 44) : r.x + 16;
    const x1 = row === 0 ? (deskRight ? recX - 8 : r.x + r.w - 8) : r.x + r.w - 16;
    const n = Math.max(1, Math.floor((x1 - x0 - 6) / 20));
    // Benches of three or four with a gap between them.
    const per = n >= 7 ? Math.ceil(n / 2) : n;
    const benches = Math.ceil(n / per);
    const total = n * 20 + (benches - 1) * 12;
    let sx = Math.round(x0 + (x1 - x0 - total) / 2);
    for (let k = 0, left = n; k < benches; k++) {
      const m = Math.min(per, left);
      left -= m;
      const bw = m * 20 + 4;
      b.prop(`mud-bench-${row}-${k}`, "waiting-sofa", sx - 2, y - 19, y - 2, bw);
      for (let i = 0; i < m; i++) seat(`mud-${row}-${k}-${i}`, sx + 10 + i * 20, y);
      sx += m * 20 + 12;
    }
  }
  for (const s of seats) b.spot(s);
  b.seats.push(...seats);
  return { recX };
}

/** The spring-water barrel, the printer and the basket in a row standing at baseY; `approach` leads from a hall to the barrel. */
function utilitiesAt(b: Builder, x: number, baseY: number, approach: Point[]): void {
  b.prop("cooler", "cooler", x, baseY - 36, baseY - 1);
  b.poke("cooler", "cooler", { x, y: baseY - 36, w: 16, h: 36 });
  b.prop("printer", "printer", x + 22, baseY - 26, baseY);
  b.poke("printer", "printer", { x: x + 22, y: baseY - 26, w: 30, h: 26 });
  b.prop("bin", "bin", x + 54, baseY - 14, baseY + 1);
  b.poke("bin", "bin", { x: x + 54, y: baseY - 14, w: 16, h: 16 });
  b.spot({ id: "cooler", kind: "cooler", group: "break", x: x + 8, y: baseY + 4, facing: "back", pose: "cup", path: [...approach, { x: x + 8, y: baseY + 4 }], activity: "chatting at the water cooler" });
}

/**
 * The great room under the chimney: the hearth slab first, then the lounge (sofa facing
 * the fire, piano, trout tank, and the arcade cabinet when there's no ski room for it).
 */
function buildGreatRoom(b: Builder, r: Rect, acc: Access, wallTv: Rect | null, naps: boolean, arcade: boolean): ReturnType<typeof buildLounge> {
  const parts = buildLounge(b, { ...r, y: r.y + 8, h: r.h - 8 }, acc, wallTv, naps, arcade);
  const room = b.rooms[b.rooms.length - 1]!;
  if (room.kind === "lounge") room.rect = r;
  return parts;
}

/**
 * Your corner study: the map table off to the left with your chair behind
 * it, the bookshelf with the globe against the wall, and the telescope in
 * the corner by the side window, so there's floor left for the putting green.
 */
function buildStudy(b: Builder, r: Rect, hallY: number, plan: CabinPlan): Layout["boss"] {
  const doorX = r.x + 16;
  b.rooms.push({ kind: "boss", rect: r, walls: "wood", doorX, doorSide: "top" });
  const deskW = 60;
  const desk: Rect = { x: r.x + clamp(Math.round(r.w * 0.2), 30, Math.round((r.w - deskW) / 2) + 8), y: r.y + Math.min(30, Math.round(r.h * 0.26)), w: deskW, h: 26 };
  const seat = { x: desk.x + deskW / 2, y: desk.y + 4 };
  b.prop("boss-chair", "boss-chair", seat.x - 10, desk.y - 22, desk.y - 1);
  b.prop("boss-desk", "boss-desk", desk.x, desk.y, desk.y + 22, deskW);
  b.poke("boss", "boss", { x: seat.x - 9, y: desk.y - 24, w: 18, h: 24 });
  const guestY = desk.y + 44;
  const lane = r.y + r.h - 8;
  for (const [i, dx] of [-12, 12].entries()) {
    const x = Math.round(seat.x + dx);
    b.spot({
      id: `boss-guest-${i}`,
      kind: "boss-guest",
      group: "boss",
      x,
      y: guestY,
      facing: "back",
      pose: "sit-back",
      path: [{ x: doorX, y: hallY, c: true }, { x: doorX, y: r.y - 3 }, { x: doorX, y: lane }, { x, y: lane }, { x, y: guestY }],
      activity: "going over a draft with you",
    });
    b.prop(`guest-chair-${i}`, "guest-chair", x - 8, guestY - 14, guestY + 2);
  }
  const scope = { x: r.x + r.w - 13, y: r.y + 30 };
  plan.telescope = scope;
  plan.studyWindow = { x: r.x + r.w - 3, y: r.y + 2, w: 4, h: 26 };
  const shelfX = Math.max(desk.x + deskW - 20, r.x + r.w - 68);
  b.prop("boss-shelf", "library-shelf", shelfX, r.y - 6, r.y + 24);
  b.poke("globe", "globe", { x: shelfX, y: r.y - 6, w: 32, h: 14 });
  b.plant("LARGE_PLANT", r.x + 2, r.y + r.h - 58);
  const dogBed = { x: r.x + r.w - 20, y: r.y + r.h - 10 };
  b.prop("dog-bed", "dog-bed", dogBed.x - 12, dogBed.y - 8, dogBed.y - 6);
  b.prop("boss-glass", "glass-front", r.x, r.y + r.h - 10, r.y + r.h + 1, r.w);
  b.prop("lamp", "lamp", r.x + 6, r.y + 4, r.y + 54);
  b.poke("lamp", "lamp", { x: r.x + 6, y: r.y + 4, w: 16, h: 52 });
  return bossToys(b, { room: r, seat, desk, dogBed, lamp: { x: r.x + 14, y: r.y + 6 } }, [{ x: scope.x - 10, y: r.y - 4, w: 22, h: 40 }]);
}

/** The ski room's extras: skis racked along the back between the dartboard and the arcade, a waxing bench in the middle. */
function dressSkiRoom(plan: CabinPlan, r: Rect): void {
  const x0 = r.x + 30;
  const x1 = r.x + r.w - (r.w >= 150 ? 32 : 6);
  if (x1 - x0 >= 24) plan.skiWall = { x: x0, y: r.y - 10, w: x1 - x0, h: 20 };
  const top = r.y + 52;
  const bottom = r.h >= 70 ? r.y + r.h - 30 : r.y + r.h - 4;
  if (bottom - top >= 16) plan.wax = { x: r.x + Math.round(r.w / 2) - 20, y: top + Math.round((bottom - top - 14) / 2), w: 40, h: 14 };
}

/**
 * Short panels with no room for the cabinet elsewhere: it stands in the kitchen's front
 * corner left of the table, played from the floor below the stools.
 */
function kitchenArcade(b: Builder, k: Rect, acc: Access, bottom: number): void {
  const island = b.props.find((p) => p.kind === "kitchen-island");
  const top = k.y + 30;
  if (!island || island.x - k.x < 32 || top + 64 > bottom) return;
  buildArcade(b, k.x + 4, top, via(acc, top + 62, k.x + 16, top + 58));
}

/** Deck chairs on the deck: nappers under wool blankets. */
function deckChair(b: Builder, plan: CabinPlan, i: number, x: number, y: number, acc: Access, laneY: number): void {
  plan.chairs.push({ x, y });
  b.spot({ id: `deckchair-${i}`, kind: "bench", group: "nap", x, y, facing: "front", pose: "nap", path: via(acc, laneY, x, y), activity: "dozing in a deck chair" });
}

/** Windows along a stretch of wall, avoiding fixtures: as wide as they fit, 8 px posts between. */
function windowsIn(x0: number, x1: number, y: number, h: number, avoid: [number, number][]): Rect[] {
  const out: Rect[] = [];
  let runs: [number, number][] = [[x0 + 6, x1 - 6]];
  for (const [a, z] of avoid) {
    runs = runs.flatMap(([s, e]) => (z <= s || a >= e ? [[s, e] as [number, number]] : ([[s, a - 4], [z + 4, e]] as [number, number][]).filter(([p, q]) => q - p >= 34)));
  }
  for (const [s, e] of runs) {
    const len = e - s;
    if (len < 34) continue;
    const n = Math.max(1, Math.floor((len + 8) / 60));
    const w = Math.floor((len - (n - 1) * 8) / n);
    for (let i = 0; i < n; i++) out.push({ x: s + i * (w + 8), y, w, h });
  }
  return out;
}

/** The chimney's geometry for a TV of tvW at the center x, the wall's top at `top`; the wall there is DC deep. */
function chimneyAt(cx: number, tvW: number, tvH: number, top = 0): { DC: number; chimney: Rect; wallTv: Rect; box: Rect; mantel: Rect; hearth: Rect; woodpile: Rect } {
  const DC = top + tvH + 36;
  const cw = tvW + 40;
  const x0 = Math.round(cx - cw / 2);
  const chimney: Rect = { x: x0, y: top, w: cw, h: DC - top };
  const wallTv: Rect = { x: x0 + 20, y: DC - 30 - tvH, w: tvW, h: tvH };
  const bw = clamp(Math.round(tvW * 0.42), 38, 54);
  const box: Rect = { x: Math.round(cx - bw / 2), y: DC - 22, w: bw, h: 22 };
  const mantel: Rect = { x: box.x - 12, y: DC - 27, w: bw + 24, h: 4 };
  const hearth: Rect = { x: x0 - 2, y: DC, w: cw + 4, h: 8 };
  const woodpile: Rect = { x: x0 + 4, y: DC - 12, w: Math.min(30, box.x - x0 - 8), h: 18 };
  return { DC, chimney, wallTv, box, mantel, hearth, woodpile };
}

/** Wall fixtures where the lodge wants them: board and calendar by the door, the clock and windows over the map room. */
function dressWall(L: Layout, plan: CabinPlan, segments: WallSegment[], doorX: number, D: number): void {
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
  L.wall.paintings = [];
  const top = plan.top;
  if (plan.variant === "wide") {
    // The board and the calendar on the mudroom wall, inside the lodge.
    const x = plan.lodge.x + 10;
    L.wall.pinboard = { x, y: top + 3, w: 128, h: Math.min(53, D - top - 11) };
    L.wall.calendar = { x: x + 136, y: top + 6, w: 20, h: 22 };
    L.wall.status = { x: x + 136, y: top + 31, w: 20, h: 18 };
  }
  const door: Rect = { x: doorX - 10, y: D - 42, w: 20, h: 42 };
  L.wall.door = door;
  L.wall.legendNote = { x: door.x - 16, y: door.y + 8, w: 12, h: 12 };
  L.entrance = { x: doorX, y: D + 2 };
  L.entrancePath = [{ x: doorX, y: L.net.halls[0]!, c: true }, L.entrance];
  const ch = plan.fire.chimney;
  const winY = top + 5;
  const winH = D - top - 21;
  const busy: [number, number][] = [
    [L.wall.pinboard.x - 4, L.wall.pinboard.x + L.wall.pinboard.w + 4],
    [L.wall.calendar.x - 4, L.wall.calendar.x + 24],
    [L.wall.legendNote.x - 4, door.x + door.w + 4],
  ];
  // The clock on the timber right of the chimney (or left of it on a crowded wall).
  const right = segments.find((s, i) => plan.segKinds[i] === "timber" && s.x0 >= ch.x + ch.w);
  const cx = right && right.x1 - right.x0 >= 40 ? right.x0 + 16 : Math.max(16, ch.x - 16);
  L.wall.clock = { x: cx, y: top + 18, r: 9 };
  busy.push([cx - 12, cx + 12]);
  const windows: Rect[] = [];
  for (const [i, sg] of segments.entries()) {
    if (plan.segKinds[i] === "timber") windows.push(...windowsIn(sg.x0, sg.x1, winY, winH, busy));
  }
  windows.push(...plan.opens);
  L.wall.windows = windows;
  L.wall.pillars = segments.slice(1).map((s) => s.x0);
}

/** Open the deck wall wherever a path crosses it. */
function cutDoors(L: Layout, plan: CabinPlan): void {
  const w = plan.deckWall;
  if (!w) return;
  const vertical = w.x0 === w.x1;
  const segs: [Point, Point][] = [];
  for (const s of L.spots) for (let i = 1; i < s.path.length; i++) segs.push([s.path[i - 1]!, s.path[i]!]);
  for (const hy of L.net.halls) segs.push([{ x: 0, y: hy }, { x: L.W, y: hy }]);
  for (const ax of L.net.aisles) segs.push([{ x: ax, y: 0 }, { x: ax, y: L.H }]);
  for (const [a, z] of segs) {
    if (vertical) {
      if (a.y !== z.y || a.y < w.y0 || a.y > w.y1) continue;
      if ((a.x - w.x0) * (z.x - w.x0) < 0) w.gaps.push([a.y - 14, a.y + 7]);
    } else {
      if (a.x !== z.x || a.x < w.x0 || a.x > w.x1) continue;
      if ((a.y - w.y0) * (z.y - w.y0) < 0) w.gaps.push([a.x - 10, a.x + 10]);
    }
  }
  // Merge overlapping doorways.
  w.gaps.sort((p, q) => p[0] - q[0]);
  const merged: [number, number][] = [];
  for (const g of w.gaps) {
    const last = merged[merged.length - 1];
    if (last && g[0] <= last[1] + 4) last[1] = Math.max(last[1], g[1]);
    else merged.push([g[0], g[1]]);
  }
  w.gaps = merged;
}

/** The sun deck along the bottom: the hallway runs along it, the sauna and the skis at one end, deck chairs at the other. */
function southDeck(b: Builder, plan: CabinPlan, deck: Rect, hall: number): Rect {
  const below = hall + 10;
  const saunaW = 46;
  plan.sauna = { x: deck.x + 6, y: below + 2, w: saunaW, h: Math.min(40, deck.y + deck.h - 6 - (below + 2)) };
  const chairsN = deck.w >= 300 ? 2 : 1;
  const chairY = deck.y + deck.h - 10;
  const cx1 = deck.x + deck.w - 16;
  for (let i = 0; i < chairsN; i++) deckChair(b, plan, i, cx1 - i * 24, chairY, { hallY: hall, aisleX: cx1 - i * 24 }, below + 4);
  plan.skiRack = { x: deck.x + saunaW + 16, y: below + 4, w: 28, h: 30 };
  plan.snowman = { x: deck.x + saunaW + 64, y: Math.min(deck.y + deck.h - 8, below + 30) };
  // Get-togethers in the middle of the deck.
  const ax = deck.x + saunaW + 84;
  const bx = cx1 - (chairsN - 1) * 24 - 18;
  const w = Math.min(240, Math.max(60, bx - ax));
  return { x: Math.round(ax + Math.max(0, (bx - ax - w) / 2)), y: below, w, h: Math.max(26, deck.y + deck.h - 6 - below) };
}

// ------------------------------------------------------------------ wide

/** How many desks the lodge has: as the head count needs, eight at most (the rest squeeze in with laptops). */
function deskCount(threads: number): number {
  return threads <= 4 ? 4 : 8;
}

/** A pod row of `cols` desk pairs, centered in the column at x (the rest of the floor stays free). */
function podsIn(b: Builder, x: number, w: number, y: number, cols: number, acc: Access): void {
  const pw = cols * 48;
  buildPods(b, { x: x + Math.floor((w - pw) / 2), y, w: pw, h: POD_H - 4 }, acc);
}

/** An empty mountainside to fill in. */
function bareTerrain(): Terrain {
  return { rocks: [], pines: [], scree: [], stream: null, tarn: null, cairn: null, sign: null, path: null, sled: null, logs: null };
}

/**
 * Rocks, pines and scree scattered over the bits of mountainside in `areas`,
 * clear of `keep` (decks, paths, the tarn); a seeded scatter, the same every time.
 */
function scatter(t: Terrain, areas: Rect[], keep: Rect[], seed: number): void {
  const taken: Rect[] = [...keep];
  const free = (r: Rect) => !taken.some((q) => r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h);
  let k = seed;
  const rnd = () => {
    k = (Math.imul(k ^ (k >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    return (k % 10000) / 10000;
  };
  for (const a of areas) {
    if (a.w < 10 || a.h < 14) continue;
    const n = Math.round((a.w * a.h) / 900);
    for (let i = 0; i < n * 3 && i < 200; i++) {
      const kind = rnd();
      const jagged = kind < 0.35;
      const w = jagged ? 14 + Math.floor(rnd() * 14) : kind < 0.75 ? 7 + Math.floor(rnd() * 7) : 0;
      if (w > 0) {
        const h = jagged ? Math.round(w * (0.8 + rnd() * 0.5)) : Math.round(w * 0.75);
        const r = { x: Math.round(a.x + rnd() * (a.w - w)), y: Math.round(a.y + rnd() * (a.h - h)), w, h };
        if (r.x < a.x || r.y < a.y || !free({ x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 })) continue;
        t.rocks.push({ ...r, jagged });
        taken.push(r);
        if (jagged && rnd() < 0.6) t.scree.push({ x: r.x - 4, y: r.y + r.h, w: r.w + 8, h: 8 });
      } else {
        const h = 10 + Math.floor(rnd() * 8);
        const p = { x: Math.round(a.x + 6 + rnd() * (a.w - 12)), y: Math.round(a.y + h + 3 + rnd() * (a.h - h - 3)), h };
        const r = { x: p.x - 6, y: p.y - h - 3, w: 12, h: h + 3 };
        if (r.y < a.y || r.x < a.x - 2 || !free(r)) continue;
        t.pines.push(p);
        taken.push(r);
      }
    }
  }
}

/**
 * The chairlift up the right edge of the panel, the piste down beside it
 * (from x0 to the lift, y0 to y1). The operator's hut stands left of the
 * piste's foot, or (no room there) in its bottom corner. `way` and `home`
 * are filled in once the doors are cut.
 */
function sideLift(W: number, x0: number, y0: number, y1: number, hutLeft: boolean): SkiLift {
  // The cable down the far side hangs its chairs 12 px further right: they stay on the panel.
  const LX = W - 24;
  const piste: Rect = { x: x0, y: y0, w: W - 37 - x0, h: y1 - y0 };
  const top = { x: LX, y: y0 + CABLE + 2 };
  const bottom = { x: LX, y: y1 - 6 };
  const pc = Math.round(piste.x + piste.w / 2);
  const hut: Rect = hutLeft ? { x: piste.x - 22, y: y1 - 24, w: 18, h: 20 } : { x: piste.x + 1, y: y1 - 22, w: 18, h: 20 };
  const ax = Math.min(piste.x, hut.x) - 2;
  const ay = Math.max(0, top.y - CABLE - 8);
  return {
    axis: "y",
    bottom,
    top,
    piste,
    start: { x: pc, y: top.y + 2 },
    finish: hutLeft ? { x: pc, y: y1 - 12 } : { x: pc, y: hut.y - 3 },
    kicker: { x: pc, y: Math.round(piste.y + piste.h * 0.56) },
    hut,
    flag: { x: piste.x + 5, y: top.y - 3 },
    wave: { x: LX - 13, y: top.y + 3 },
    way: [],
    home: [],
    area: { x: ax, y: ay, w: W - ax, h: y1 - ay },
  };
}

/** The phone's lift along the strip of piste at the bottom: from about the middle up to the right edge. */
function stripLift(W: number, s: Rect): SkiLift {
  const gy = s.y + s.h - 6;
  const bottom = { x: Math.round(W * 0.42), y: gy };
  const top = { x: W - 16, y: gy };
  const hut: Rect = { x: bottom.x - 26, y: s.y + s.h - 22, w: 18, h: 20 };
  return {
    axis: "x",
    bottom,
    top,
    piste: { x: hut.x - 4, y: s.y, w: W - (hut.x - 4), h: s.h },
    start: { x: W - 30, y: gy - 3 },
    finish: { x: bottom.x + 12, y: gy - 3 },
    kicker: { x: Math.round((bottom.x + W) / 2), y: gy - 2 },
    hut,
    flag: { x: W - 8, y: gy - 6 },
    wave: { x: W - 14, y: gy - 3 },
    way: [],
    home: [],
    area: { x: hut.x - 2, y: s.y, w: W - hut.x + 2, h: s.h },
  };
}

/**
 * The walk out to the bottom station: along the hallway onto the piste, down
 * its far edge from the lift (not under the chairs), across above the hut
 * and the foot of the piste, and over to the bull wheel. Straight down the
 * side by the lift (`side`) when the hallway meets the piste lower down.
 */
function wayDown(l: SkiLift, from: number, hall: number, side: number): Point[] {
  const s = l.piste;
  const h = l.hut;
  const wx = s.x + 4;
  let yb = Math.min(s.y + s.h - 4, l.bottom.y);
  if (h.x < s.x + s.w && h.x + h.w > s.x) yb = Math.min(yb, h.y - 4);
  const pts: Point[] =
    hall < yb - 20 && wx < side - 8
      ? [{ x: from, y: hall, c: true }, { x: wx, y: hall }, { x: wx, y: yb }, { x: side, y: yb }, { x: side, y: l.bottom.y }, { ...l.bottom }]
      : [{ x: from, y: hall, c: true }, { x: side, y: hall }, { x: side, y: l.bottom.y }, { ...l.bottom }];
  return pts.filter((p, i) => i === 0 || p.x !== pts[i - 1]!.x || p.y !== pts[i - 1]!.y);
}

/** A skier's walk back in from the finish: to the hallway, along it to the nearest door, in at the wall. */
function walkHome(p: CabinPlan, from: Point, hall: number): Point[] {
  const w = p.deckWall;
  if (!w || w.gaps.length === 0) return [{ x: from.x, y: hall }];
  const vertical = w.x0 === w.x1;
  const mid = (g: [number, number]) => Math.round((g[0] + g[1]) / 2);
  const at = vertical ? from.y : from.x;
  const g = w.gaps.reduce((b, q) => (Math.abs(mid(q) - at) < Math.abs(mid(b) - at) ? q : b));
  if (vertical) return [{ x: from.x, y: mid(g) }, { x: w.x0 + 2, y: mid(g) }];
  return [{ x: from.x, y: hall }, { x: mid(g), y: hall }, { x: mid(g), y: w.y0 + 2 }];
}

function widePlan(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const desks = deskCount(threads);
  // The summits show over the roof on panels with the height for it.
  const MT = H >= 440 ? 22 : 0;
  const short = H < 400;
  const D = MT + (short ? 66 : 72);
  const tvCap = H < 330 ? 96 : short ? 108 : 120;
  const DCguess = MT + Math.round(tvCap * 0.54) + 36;
  // A snowy front yard with the sun deck when there's the height; else the deck along the side.
  const yardH = clamp(H - (DCguess + 94) - 140, 0, 130);
  const front = yardH >= 84;
  const east = !front && W >= 640;
  const OUT = east ? clamp(Math.round(W * 0.15), 96, 170) : 0;
  // The lodge: three columns (the mudroom over the workroom, the great room over the
  // kitchen, the map room over your study), the mountainside round it.
  const NEED = 6 + 192 + 16 + 168 + 16 + 140 + 6;
  let ML: number;
  let lodgeW: number;
  // The lift: up the right-hand mountainside when there's the room for it and its piste (the
  // lodge moves over to the left), else up the yard beside the deck, or (deck along the side)
  // in a strip beyond the deck.
  let liftSide = false;
  let liftEast: "deck" | "snow" | null = null;
  let B = OUT - 84;
  if (east) {
    // Beyond the east wall: the deck and a strip for the lift and its piste when there's the room
    // for both, else (just) the lift and the piste, the sauna on the snow at the bottom.
    const avail = W - NEED;
    if (avail - 6 >= 150) liftEast = "deck";
    else if (avail - 6 >= 100) liftEast = "snow";
    if (liftEast) {
      ML = liftEast === "deck" ? clamp(6 + Math.floor((avail - 156) / 3), 6, 40) : 6;
      lodgeW = NEED;
      B = liftEast === "deck" ? clamp(Math.round((avail - ML) * 0.4), 70, 110) : avail - ML;
    } else {
      ML = clamp(W - OUT - NEED, 16, 70);
      lodgeW = W - OUT - ML;
    }
  } else {
    lodgeW = Math.max(NEED, W - 2 * clamp(Math.round(W * 0.09), 16, 100));
    const spare = W - lodgeW;
    liftSide = front && spare >= 118;
    ML = liftSide ? spare - clamp(Math.round(spare * 0.62), 80, 150) : Math.floor(spare / 2);
  }
  const XI = ML + lodgeW;
  const X0 = ML + 6;
  const wL = 192;
  const a1 = X0 + wL + 8;
  const cx0 = a1 + 8;
  const rest = lodgeW - 236;
  const wR = clamp(Math.min(Math.round(rest * 0.45), rest - 168), 140, 230);
  const a2 = XI - 6 - wR - 8;
  const rx0 = a2 + 8;
  const wC = a2 - 8 - cx0;
  const split = wC >= 400;
  const gw = split ? Math.max(220, Math.round(wC * 0.56)) : wC;
  const tvW = Math.min(gw - 50, tvCap);
  const tvH = Math.round(tvW * 0.54);
  const ch = chimneyAt(cx0 + gw / 2, tvW, tvH, MT);
  const DC = ch.DC;

  const yardTop = front ? H - yardH : H;
  const bottom = front ? yardTop - 12 : H - 6;
  const hy = clamp(Math.round(Math.max(DC + 2 + 104 + 8, H * (front ? 0.4 : 0.46))), DC + 90, bottom - 114);
  const halls = front ? [hy, yardTop + 12] : [hy];
  const net: Network = { halls, aisles: [a1, a2] };

  const segments: WallSegment[] = [
    { x0: ML, x1: ch.chimney.x, depth: D },
    { x0: ch.chimney.x, x1: ch.chimney.x + ch.chimney.w, depth: DC },
    { x0: ch.chimney.x + ch.chimney.w, x1: XI, depth: D },
  ];
  const segKinds: SegKind[] = ["timber", "chimney", "timber"];
  const lodge: Rect = { x: ML, y: MT, w: lodgeW, h: (front ? yardTop - 3 : H) - MT };
  const plan: CabinPlan = {
    variant: "wide",
    segKinds,
    fire: { chimney: ch.chimney, box: ch.box, mantel: ch.mantel, hearth: ch.hearth },
    woodpile: ch.woodpile,
    inside: lodge,
    deck: null,
    deckSide: null,
    slope: null,
    lift: null,
    opens: MT > 0 ? [{ x: 0, y: 0, w: W, h: MT - 5 }] : [],
    top: MT,
    lodge,
    yard: front ? { x: 0, y: yardTop, w: W, h: yardH } : null,
    terrain: bareTerrain(),
    nooks: [],
    deckWall: null,
    sauna: null,
    chairs: [],
    skiRack: null,
    telescope: null,
    studyWindow: null,
    mudroom: { x: 0, y: 0, w: 0, h: 0 },
    bootRack: null,
    mat: { x: a1 - 9, y: D + 1, w: 18, h: 9 },
    wax: null,
    skiWall: null,
    snowman: null,
  };

  // ---- above the hallway: the mudroom by the door, the great room, the map room
  const top = D + 2;
  const mud: Rect = { x: X0, y: top, w: wL, h: hy - 8 - top };
  plan.mudroom = mud;
  // The ski room: beside the great room on very wide panels, else under the kitchen when
  // there's height. It has the arcade cabinet when it's wide enough; if not, the great room.
  const y0 = hy + 10;
  const kH = clamp(bottom - y0 - 8, 64, 92);
  const side: Rect = { x: cx0 + gw + 10, y: top + 8, w: wC - gw - 10, h: hy - 8 - (top + 8) };
  const below: Rect = { x: cx0, y: y0 + kH + 14, w: wC, h: Math.min(150, bottom - (y0 + kH + 8) - 6) };
  const ski = split ? (side.h >= 104 ? side : null) : below.h >= 104 ? below : null;
  const great: Rect = { x: cx0, y: DC + 2, w: gw, h: hy - 8 - (DC + 2) };
  const tvParts = buildGreatRoom(b, great, { hallY: hy, aisleX: a1 }, ch.wallTv, false, !ski || ski.w < 150);
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  let library: Rect | null = null;
  if (ski === side) {
    games = side;
    gamesParts = buildGames(b, side, { hallY: hy, aisleX: cx0 + gw + 5 });
    dressSkiRoom(plan, side);
  }
  const meeting: Rect = { x: rx0, y: top, w: wR, h: hy - 8 - top };
  const whiteboard = buildMeeting(b, meeting, hy);

  // ---- below: the workroom (one row of desks, as many as needed), the kitchen (and the ski room), your study
  podsIn(b, X0, wL, y0, desks / 2, { hallY: hy, aisleX: a1 });
  const leftY = y0 + POD_H + 4;
  const kitchen: Rect = { x: cx0, y: y0 + 8, w: wC, h: kH - 8 };
  buildKitchen(b, kitchen, { hallY: hy, aisleX: a2 });
  let cY = kitchen.y + kitchen.h + 8;
  const leftRest = bottom - leftY;
  if (leftRest >= 46) {
    const sh = Math.min(56, leftRest - 2);
    buildServerRoom(b, { x: X0 + 8, y: leftY, w: Math.min(wL - 16, 150), h: sh });
    if (leftRest - sh - 12 >= 96) {
      library = { x: X0, y: leftY + sh + 20, w: wL, h: Math.min(110, leftRest - sh - 20) };
      buildLibrary(b, library, { hallY: hy, aisleX: a1 });
    }
  }
  const cRest = bottom - cY;
  if (ski === below) {
    games = below;
    gamesParts = buildGames(b, games, { hallY: hy, aisleX: a2 });
    dressSkiRoom(plan, games);
    cY = games.y + games.h + 8;
  } else if (!library && cRest >= 100) {
    library = { x: cx0, y: cY + 12, w: wC, h: Math.min(110, cRest - 12) };
    buildLibrary(b, library, { hallY: hy, aisleX: a2 });
    cY += library.h + 12;
  }
  const rightAvail = bottom - (hy + 12);
  let bossH = clamp(rightAvail, 96, 210);
  const serverRight = !b.server && rightAvail >= 152 + 8 + 46;
  if (serverRight) bossH = rightAvail - 8 - Math.min(56, rightAvail - 160);
  const bossRoom: Rect = { x: rx0, y: hy + 12, w: wR, h: bossH };
  const boss = buildStudy(b, bossRoom, hy, plan);
  if (serverRight) buildServerRoom(b, { x: rx0, y: bossRoom.y + bossRoom.h + 8, w: Math.min(wR, 150), h: Math.min(56, rightAvail - bossH - 8) });
  if (!b.server && cRest - (cY - (kitchen.y + kitchen.h + 8)) >= 46) {
    const top2 = Math.max(cY, kitchen.y + kitchen.h + 8);
    if (bottom - top2 >= 46) buildServerRoom(b, { x: cx0 + 8, y: top2, w: Math.min(wC - 16, 150), h: Math.min(56, bottom - top2) });
  }
  // The mudroom: two rows of benches when there's height, else one and (short panels) the cold room behind it.
  const coldInMud = !b.server && mud.h >= 100;
  const mudRows = mud.h >= 126 && !coldInMud ? 2 : 1;
  buildMudroom(b, mud, hy, a1, true, mudRows, true);
  if (coldInMud) {
    const sw = Math.min(mud.w - 96, 120);
    if (sw >= 60) buildServerRoom(b, { x: mud.x + mud.w - sw - 6, y: mud.y + 60, w: sw, h: Math.min(48, mud.h - 64) });
  }
  const mudFree = mud.y + 30 + (mudRows - 1) * 44 + 14;
  if (mud.y + mud.h - mudFree >= 40) {
    utilitiesAt(b, mud.x + 4, mud.y + mud.h - 2, [{ x: mud.x + 12, y: hy, c: true }]);
    if (!coldInMud) plan.bootRack = { x: mud.x + 80, y: mud.y + mud.h - 16, w: Math.min(mud.w - 96, 90), h: 14 };
  }

  // Neither the ski room nor the great room had room for the cabinet: the kitchen corner (unless the cold room is under the kitchen).
  const sv = b.server;
  const coldBelow = sv !== null && sv.x < kitchen.x + kitchen.w && sv.x + sv.w > kitchen.x && sv.y > kitchen.y;
  if (!coldBelow) kitchenArcade(b, kitchen, { hallY: hy, aisleX: a2 }, cY === kitchen.y + kitchen.h + 8 ? bottom : cY - 8);

  // ---- outside: the sun deck in the front yard, or along the side
  const t = plan.terrain;
  // No deck: get-togethers on the great room floor, or in the ski room.
  const indoorEvents = (): Rect => {
    const couch = tvParts.couch;
    const free = great.y + great.h - (couch.y + couch.h + 6);
    return free >= 60 || !games ? { x: great.x + 16, y: couch.y + couch.h + 4, w: great.w - 32, h: Math.max(26, free) } : games;
  };
  let eventArea: Rect;
  const keep: Rect[] = [];
  if (front) {
    // The yard in front of the lodge: the hallway runs along it, in through the front doors;
    // the sun deck between the doors (deck chairs at its end), the sauna on the snow to the
    // left, the tarn to the right, the path down from the deck with the sled beside it.
    const hall2 = halls[1]!;
    const deck: Rect = { x: a1 - 12, y: yardTop + 2, w: a2 + 12 - (a1 - 12), h: yardH - 34 };
    plan.deck = deck;
    plan.deckSide = "south";
    plan.deckWall = { x0: ML, y0: yardTop - 3, x1: XI, y1: yardTop - 3, gaps: [] };
    plan.sauna = { x: Math.max(ML + 6, deck.x - 62), y: hall2 + 12, w: 46, h: Math.min(40, yardTop + yardH - 6 - (hall2 + 12)) };
    const chairY = deck.y + deck.h - 10;
    const cx1 = deck.x + deck.w - 16;
    for (let i = 0; i < 2; i++) deckChair(b, plan, i, cx1 - i * 24, chairY, { hallY: hall2, aisleX: cx1 - i * 24 }, hall2 + 14);
    const evX = deck.x + 8;
    eventArea = { x: evX, y: hall2 + 10, w: Math.max(60, cx1 - 24 - 16 - evX), h: Math.max(26, deck.y + deck.h - 6 - (hall2 + 10)) };
    plan.skiRack = { x: a1 + 13, y: yardTop - 4, w: 28, h: 6 };
    const snowY = deck.y + deck.h;
    t.path = { x: deck.x + 30, y0: snowY, y1: H };
    t.sled = { x: deck.x + 52, y: Math.min(H - 6, snowY + 18) };
    plan.snowman = { x: Math.round((plan.sauna.x + plan.sauna.w + deck.x) / 2), y: Math.min(H - 6, yardTop + yardH - 14) };
    // The lift up the mountainside right of the lodge, or a short one up the yard.
    if (liftSide) plan.lift = sideLift(W, XI + 4, MT + 4, H - 2, true);
    else if (W - (deck.x + deck.w) >= 150) plan.lift = sideLift(W, W - 37 - 44, yardTop + 4, H - 2, true);
    const right = deck.x + deck.w + 8;
    const rightEnd = plan.lift ? Math.min(XI - 8, plan.lift.hut.x - 8) : XI - 8;
    if (rightEnd - right >= 50) t.tarn = { x: right + Math.round((rightEnd - right - 48) / 2), y: hall2 + 16, w: 48, h: 24 };
    keep.push(
      { x: deck.x - 4, y: deck.y - 4, w: deck.w + 8, h: deck.h + 8 },
      { x: plan.sauna.x - 4, y: plan.sauna.y - 30, w: plan.sauna.w + 8, h: plan.sauna.h + 34 },
      { x: t.path.x - 10, y: snowY, w: 44, h: H - snowY },
      { x: plan.snowman.x - 10, y: plan.snowman.y - 24, w: 20, h: 26 },
      { x: 0, y: hall2 - 10, w: W, h: 20 },
    );
    if (t.tarn) keep.push({ x: t.tarn.x - 4, y: t.tarn.y - 4, w: t.tarn.w + 8, h: t.tarn.h + 8 });
  } else if (liftEast === "snow") {
    // No room for a deck as well: the lift and the piste beyond the east wall (a door out to them),
    // the sauna on the snow at the foot of the piste beside the lift hut; get-togethers inside.
    eventArea = indoorEvents();
    plan.deckWall = { x0: XI - 5, y0: MT, x1: XI - 5, y1: H, gaps: [] };
    plan.sauna = { x: XI + 6, y: H - 44, w: 46, h: 40 };
    const lift = sideLift(W, XI + 6, 6, H - 50, false);
    lift.hut = { x: XI + 58, y: H - 22, w: 18, h: 20 };
    lift.bottom = { x: lift.bottom.x, y: H - 8 };
    lift.finish = { x: lift.start.x, y: H - 60 };
    lift.area = { ...lift.area, h: H - lift.area.y };
    plan.lift = lift;
    keep.push({ x: XI - 6, y: 0, w: W - XI + 6, h: H });
  } else if (east) {
    const deck: Rect = { x: XI + 5, y: D, w: W - B - 3 - (XI + 5), h: H - D };
    plan.deck = deck;
    plan.deckSide = "east";
    plan.opens.push({ x: XI, y: 0, w: (liftEast ? W - B : W) - XI, h: D });
    plan.deckWall = { x0: XI, y0: D, x1: XI, y1: H, gaps: [] };
    plan.sauna = { x: deck.x + 4, y: D + 8, w: Math.min(48, deck.w - 10), h: 40 };
    plan.skiRack = { x: deck.x + deck.w - 14, y: D + 4, w: 12, h: 30 };
    const evTop = Math.max(plan.sauna.y + plan.sauna.h + 12, hy - 56);
    const evBot = Math.min(H - 48, hy + 62);
    eventArea = { x: deck.x + 6, y: evTop, w: deck.w - 12, h: Math.max(26, evBot - evTop) };
    const acc: Access = { hallY: hy, aisleX: deck.x + Math.round(deck.w / 2) };
    const cy = H - 14;
    if (cy - 40 > eventArea.y + eventArea.h + 24) plan.snowman = { x: deck.x + 12, y: eventArea.y + eventArea.h + 30 };
    if (cy - 20 > eventArea.y + eventArea.h) {
      const n = deck.w >= 70 ? 2 : 1;
      for (let i = 0; i < n; i++) deckChair(b, plan, i, n === 1 ? deck.x + deck.w / 2 : deck.x + 16 + i * (deck.w - 32), cy, acc, cy - 18);
    }
    keep.push({ x: XI, y: 0, w: deck.w + 10, h: H });
    if (liftEast === "deck") plan.lift = sideLift(W, W - B + 2, 6, H - 2, false);
  } else {
    eventArea = indoorEvents();
  }

  // ---- the mountainside: firewood against the west wall, a frozen stream, rocks and pines
  const hillTop = MT;
  const hillBottom = front ? yardTop : H;
  if (ML >= 20) {
    t.logs = { x: ML - 13, y: Math.round(hy - 30), w: 12, h: 44 };
    keep.push({ x: ML - 16, y: t.logs.y - 4, w: 16, h: t.logs.h + 8 });
    if (ML >= 34) {
      t.stream = [];
      for (let y = hillTop; y <= H; y += 6) t.stream.push({ x: Math.round(ML * 0.45 + Math.sin(y * 0.035) * ML * 0.2), y });
      t.cairn = { x: Math.round(ML * 0.78), y: hillTop + 30 };
      keep.push({ x: t.cairn.x - 8, y: t.cairn.y - 16, w: 16, h: 18 });
    }
  }
  if (plan.lift) keep.push({ x: plan.lift.area.x - 3, y: plan.lift.area.y, w: plan.lift.area.w + 3, h: plan.lift.area.h + 4 });
  if (W - XI >= 34 && !east && !liftSide) {
    t.sign = { x: XI + Math.round((W - XI) / 2), y: hillTop + 34 };
    keep.push({ x: t.sign.x - 10, y: t.sign.y - 24, w: 20, h: 26 });
  }

  const L = finish(b, W, H, false, segments, net, {
    meeting,
    whiteboard,
    boss,
    waiting: mud,
    kitchen,
    lounge: great,
    games,
    eventArea,
    tvParts,
    gamesParts,
    doorX: a1,
    lamp: boss.lamp,
    wallTv: ch.wallTv,
  });
  dressWall(L, plan, segments, a1, D);
  // The guard's rounds: the lodge's hallway, and the deck.
  L.patrol = [{ x: X0 + 6, y: hy, c: true }, { x: XI - 8, y: hy, c: true }];
  if (plan.deck && plan.deckSide === "east") L.patrol.push({ x: plan.deck.x + plan.deck.w - 10, y: hy, c: true });
  if (front) L.patrol.push({ x: XI - 12, y: halls[1]!, c: true }, { x: ML + 12, y: halls[1]!, c: true });
  cutDoors(L, plan);
  // The way out to the lift (from the yard's path, or along the hallway over the deck) and a skier's way back in.
  const lift = plan.lift;
  if (lift) {
    const hall = front ? halls[1]! : hy;
    const side = lift.bottom.x - 13;
    const from = front ? Math.min(XI - 10, side) : plan.deck ? plan.deck.x + plan.deck.w - 10 : XI + 4;
    lift.way = wayDown(lift, from, hall, side);
    lift.home = walkHome(plan, lift.finish, hall);
  }
  // When the desks are full the rest squeeze in: by the fire, on the window seat and the boot bench, on kitchen stools, out on the deck.
  const outside = [...keep];
  if (plan.sauna) outside.push({ x: plan.sauna.x - 4, y: plan.sauna.y - 30, w: plan.sauna.w + 8, h: plan.sauna.h + 34 });
  if (t.stream) outside.push({ x: 0, y: 0, w: ML - 4, h: H });
  plan.nooks = squeezeIn(L, cabinZones(L, plan, { great, mud, kitchen, library, hall: hy, a1, a2 }), threads - L.desks.length, outside);
  // Then the rocks and pines, round everything (the stumps out in the snow too).
  keep.push(...plan.nooks.map((n) => ({ x: n.x - 10, y: n.y - 24, w: 20, h: 28 })));
  const streamBand = t.stream ? [{ x: Math.round(ML * 0.25) - 4, y: 0, w: Math.round(ML * 0.4) + 8, h: H }] : [];
  scatter(t, [{ x: 2, y: hillTop + 4, w: ML - 6, h: hillBottom - hillTop - 6 }, ...(east ? [{ x: W - B + 2, y: D + 4, w: B - 4, h: H - D - 8 }] : [{ x: XI + 4, y: hillTop + 4, w: W - XI - 6, h: hillBottom - hillTop - 6 }]), ...(front ? [{ x: 2, y: yardTop + 6, w: W - 4, h: yardH - 8 }] : [])], [...keep, ...streamBand], W * 31 + H);

  L.themeData = plan;
  if (plan.deck) L.words = { "in the lounge": "on the sun deck" };
  return L;
}

/** Where the busy ones squeeze in, in the order they fill. */
function cabinZones(L: Layout, plan: CabinPlan, r: { great: Rect; mud: Rect; kitchen: Rect; library: Rect | null; hall: number; a1: number; a2: number }): Zone[] {
  const out: Zone[] = [];
  const f = plan.fire;
  const near = (x: number) => L.net.aisles.reduce((b, a) => (Math.abs(a - x) < Math.abs(b - x) ? a : b));
  // Sheepskins on the hearth, either side of the fire.
  const hy = f.hearth.y + 15;
  const hall = (y: number) => L.net.halls.reduce((b, h) => (h > y && (b < y || h < b) ? h : b), L.net.halls[L.net.halls.length - 1]!);
  out.push({ at: [f.box.x - 10, f.box.x + f.box.w + 10, f.box.x - 30, f.box.x + f.box.w + 30].map((x) => ({ x, y: hy })), seat: "sheepskin", entry: { x: r.a1, y: hall(hy) }, lane: hy, max: 4, open: true });
  // The window seat along the great room's floor below the sofa.
  const c = L.couch;
  out.push({ at: row(r.great.x + 14, r.great.x + r.great.w - 14, c.y + c.h + 26), seat: "seat", entry: { x: near(r.great.x), y: hall(c.y) }, max: 6 });
  // The boot bench: the mudroom's free floor.
  for (const y of [r.mud.y + 70, r.mud.y + 100]) out.push({ at: row(r.mud.x + 14, r.mud.x + r.mud.w - 14, y), seat: "boots", entry: { x: r.a1, y: hall(y) }, max: 6 });
  // Kitchen stools by the table.
  const stool = L.byId.get("stool-0");
  if (stool && stool.path.length >= 3) {
    const lane = stool.path[1]!.y;
    out.push({ at: [lane - 4, lane + 20].flatMap((y) => row(r.kitchen.x + 12, r.kitchen.x + r.kitchen.w - 12, y, 22)), seat: "stool", entry: stool.path[0]!, lane, max: 4 });
  }
  // Knitted poufs in the reading loft.
  if (r.library) out.push({ at: row(r.library.x + 14, r.library.x + r.library.w - 14, r.library.y + r.library.h - 6), seat: "pouf", entry: { x: near(r.library.x + r.library.w / 2), y: hall(r.library.y) }, max: 6 });
  // Log stumps out on the deck, clear of the get-togethers.
  const d = plan.deck;
  if (d) {
    const ev = L.eventArea;
    const avoid = [{ x: ev.x - 6, y: ev.y - 4, w: ev.w + 12, h: ev.h + 8 }];
    if (plan.deckSide === "south") {
      const hall2 = L.net.halls[L.net.halls.length - 1]!;
      const yard = plan.yard ?? { x: 0, y: d.y, w: L.W, h: L.H - d.y };
      const rows = [d.y + d.h - 10, d.y + d.h - 36, hall2 + 40, hall2 + 66];
      if (plan.yard) rows.push(L.H - 10);
      for (const y of rows) out.push({ at: row(yard.x + 14, yard.x + yard.w - 14, y, 22), seat: "stump", entry: { x: near(d.x + d.w / 2), y: hall2 }, lane: y + 5, avoid });
    } else {
      for (let y = d.y + 30; y < d.y + d.h - 8; y += 28) out.push({ at: row(d.x + 14, d.x + d.w - 14, y, 22), seat: "stump", entry: { x: d.x + Math.round(d.w / 2), y: r.hall }, lane: y + 5, avoid });
    }
  }
  return out;
}

// ------------------------------------------------------------------ portrait

function portraitPlan(W: number, H: number, threads: number): Layout | null {
  const b = new Builder();
  const desks = deskCount(threads);
  // The lodge stands a little in from the sides; tall phones see the summits over the roof.
  const M = clamp(Math.round((W - 340) * 0.5) + 6, 6, 24);
  const MT = H >= 760 ? 20 : 0;
  const D = MT + 72;
  const aisleX = W - M - 8;
  const x0 = M + 6;
  const innerW = W - 2 * M - 20;
  const gap = 16;
  // The board and calendar on the left, the chimney (TV on it) in the middle, the door at the right.
  const tvW = clamp(W - 2 * M - 252, 88, 112);
  const tvH = Math.round(tvW * 0.54);
  const boardEnd = M + Math.min(172, 8 + Math.min(128, W - 2 * M - 210) + 28);
  const ch = chimneyAt(Math.max(boardEnd + 6 + (tvW + 40) / 2, Math.min(W / 2, aisleX - 40 - (tvW + 40) / 2)), tvW, tvH, MT);
  const DC = ch.DC;
  const segments: WallSegment[] = [
    { x0: M, x1: ch.chimney.x, depth: D },
    { x0: ch.chimney.x, x1: ch.chimney.x + ch.chimney.w, depth: DC },
    { x0: ch.chimney.x + ch.chimney.w, x1: W - M, depth: D },
  ];
  const lodge: Rect = { x: M, y: MT, w: W - 2 * M, h: H - MT };
  const plan: CabinPlan = {
    variant: "portrait",
    segKinds: ["timber", "chimney", "timber"],
    fire: { chimney: ch.chimney, box: ch.box, mantel: ch.mantel, hearth: ch.hearth },
    woodpile: ch.woodpile,
    inside: lodge,
    deck: null,
    deckSide: null,
    slope: null,
    lift: null,
    opens: MT > 0 ? [{ x: 0, y: 0, w: W, h: MT - 5 }] : [],
    top: MT,
    lodge,
    yard: null,
    terrain: bareTerrain(),
    nooks: [],
    deckWall: null,
    sauna: null,
    chairs: [],
    skiRack: null,
    telescope: null,
    studyWindow: null,
    mudroom: { x: 0, y: 0, w: 0, h: 0 },
    bootRack: null,
    mat: { x: aisleX - 9, y: D + 1, w: 16, h: 9 },
    wax: null,
    skiWall: null,
    snowman: null,
  };
  type Row = { kind: "great" | "pods" | "kitchenMeeting" | "pods2" | "games" | "library" | "mudBoss" | "deck"; h: number; grow: number };
  const rows: Row[] = [
    { kind: "great", h: 88, grow: 0.5 },
    { kind: "pods", h: POD_H, grow: 0 },
    { kind: "kitchenMeeting", h: 104, grow: 1 },
    { kind: "mudBoss", h: 136, grow: 1.4 },
  ];
  const top = DC + 2;
  const used = () => top + rows.reduce((s, r) => s + r.h + gap, 0) - gap;
  const deckH = 104;
  // The strip of piste below the deck: tall enough for the lift's chairs when there's the room.
  const SB = used() + gap + deckH <= H - 40 - 2 ? 40 : 20;
  const FB = H - SB;
  const withDeck = used() + gap + deckH <= FB - 2;
  if (withDeck) rows.push({ kind: "deck", h: deckH, grow: 0.6 });
  const end = withDeck ? FB : H - 4;
  if (used() + 100 + gap <= end - 30) rows.splice(rows.length - (withDeck ? 2 : 1), 0, { kind: "games", h: 100, grow: 0.4 });
  if (used() + 96 + gap <= end - 30) rows.splice(rows.length - (withDeck ? 2 : 1), 0, { kind: "library", h: 96, grow: 0.3 });
  const extra = end - used();
  if (extra < -10) return null;
  const growSum = rows.reduce((s, r) => s + r.grow, 0) || 1;
  let y = top;
  const placed: { row: Row; rect: Rect }[] = [];
  for (const row of rows) {
    const h = Math.max(row.h + Math.floor((Math.max(0, extra) * row.grow) / growSum), row.h + Math.min(0, extra));
    placed.push({ row, rect: { x: x0, y, w: innerW, h: row.kind === "mudBoss" && !withDeck ? Math.min(h, H - 4 - y) : h } });
    y += h + gap;
  }
  // Rooms open onto the hallway below them; the study row and the deck onto the one above (the deck's runs along it).
  const halls: number[] = [];
  const hallOf = new Map<Row, number>();
  for (const [i, { row, rect }] of placed.entries()) {
    if (row.kind === "mudBoss") hallOf.set(row, rect.y - gap / 2);
    else if (row.kind === "deck") hallOf.set(row, rect.y + 12);
    else if (i < placed.length - 1) hallOf.set(row, rect.y + rect.h + gap / 2);
    else hallOf.set(row, rect.y - gap / 2);
    halls.push(hallOf.get(row)!);
  }
  const net: Network = { halls: [...new Set(halls)].sort((a, z) => a - z), aisles: [aisleX] };
  let kitchen: Rect | null = null;
  let meeting: Rect | null = null;
  let whiteboard: Rect | null = null;
  let mud: Rect | null = null;
  let boss: Layout["boss"] | null = null;
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  let tvParts: ReturnType<typeof buildLounge> | null = null;
  let great: Rect | null = null;
  let eventArea: Rect | null = null;
  let deckHall: number | null = null;
  let library: Rect | null = null;
  for (const { row, rect } of placed) {
    const hallY = hallOf.get(row)!;
    const acc: Access = { hallY, aisleX };
    switch (row.kind) {
      case "great": {
        great = rect;
        // The cabinet stands by the piano unless the ski room has it.
        tvParts = buildGreatRoom(b, rect, acc, ch.wallTv, !rows.some((r) => r.kind === "games" || r.kind === "library" || r.kind === "deck"), !rows.some((r) => r.kind === "games"));
        break;
      }
      case "pods":
      case "pods2":
        podsIn(b, rect.x, rect.w, rect.y, desks / 2, acc);
        break;
      case "kitchenMeeting": {
        const kw = Math.round(rect.w * 0.54);
        kitchen = { x: rect.x, y: rect.y, w: kw - 6, h: rect.h };
        buildKitchen(b, { ...kitchen, y: kitchen.y + 10, h: kitchen.h - 10 }, { hallY, aisleX: rect.x + kw - 1 });
        meeting = { x: rect.x + kw + 4, y: rect.y, w: rect.w - kw - 4, h: rect.h - 4 };
        whiteboard = buildMeeting(b, meeting, hallY);
        break;
      }
      case "games":
        games = rect;
        gamesParts = buildGames(b, { ...rect, y: rect.y + 6, h: rect.h - 6 }, acc);
        dressSkiRoom(plan, { ...rect, y: rect.y + 6, h: rect.h - 6 });
        break;
      case "library":
        library = { ...rect, y: rect.y + 8, h: rect.h - 8 };
        buildLibrary(b, library, acc);
        break;
      case "mudBoss": {
        const ww = Math.round(rect.w * 0.56);
        mud = { x: rect.x, y: rect.y + 4, w: ww - 4, h: rect.h - 4 };
        plan.mudroom = mud;
        const mudRows = mud.h >= 140 ? 2 : 1;
        buildMudroom(b, mud, hallY, mud.x + 4, false, mudRows, true);
        const bossRoom: Rect = { x: rect.x + ww + 4, y: rect.y + 4, w: rect.w - ww - 4, h: rect.h - 8 };
        boss = buildStudy(b, bossRoom, hallY, plan);
        // The cold room and the utilities under the benches.
        const sTop = mud.y + 30 + (mudRows - 1) * 44 + 20;
        const room = mud.y + mud.h - sTop;
        if (room >= 40) {
          const sw = Math.min(mud.w - 84, 110);
          if (sw >= 56) buildServerRoom(b, { x: mud.x + 82, y: sTop, w: sw, h: Math.min(48, room - 2) });
          // Down the mudroom's left wall to the barrel in the corner.
          const base = mud.y + mud.h - 2;
          utilitiesAt(b, mud.x + 10, base, [{ x: mud.x + 3, y: hallY, c: true }, { x: mud.x + 3, y: base + 4 }]);
        }
        break;
      }
      case "deck": {
        const deck: Rect = { x: 6, y: rect.y, w: W - 12, h: FB - rect.y };
        plan.deck = deck;
        plan.deckSide = "south";
        plan.slope = { x: 0, y: FB, w: W, h: SB };
        if (SB >= 40) plan.lift = stripLift(W, plan.slope);
        deckHall = hallY;
        plan.deckWall = { x0: M, y0: deck.y - 3, x1: W - M, y1: deck.y - 3, gaps: [] };
        lodge.h = deck.y - 3 - MT;
        eventArea = southDeck(b, plan, deck, hallY);
        break;
      }
    }
  }
  if (!meeting || !whiteboard || !kitchen || !great || !tvParts || !mud || !boss) return null;
  const tv = tvParts as ReturnType<typeof buildLounge>;
  const gr = great as Rect;
  if (!b.pokeables.some((p) => p.id === "cooler")) utilitiesAt(b, x0 + 2, H - 4, [{ x: x0 + 10, y: net.halls[net.halls.length - 1]!, c: true }]);
  eventArea ??= games ?? { x: gr.x + 10, y: tv.couch.y + 30, w: gr.w - 20, h: Math.max(30, gr.y + gr.h - tv.couch.y - 30) };
  const L = finish(b, W, H, true, segments, net, {
    meeting,
    whiteboard,
    boss,
    waiting: mud,
    kitchen,
    lounge: gr,
    games,
    eventArea,
    tvParts: tv,
    gamesParts,
    doorX: aisleX,
    lamp: (boss as Layout["boss"]).lamp,
    wallTv: ch.wallTv,
  });
  // The board, calendar and status on the left; finish() put the door at the aisle.
  const boardW = Math.min(128, ch.chimney.x - M - 44);
  L.wall.pinboard = { x: M + 8, y: MT + 3, w: boardW, h: Math.min(53, D - MT - 11) };
  L.wall.calendar = { x: M + 8 + boardW + 8, y: MT + 6, w: 20, h: 22 };
  L.wall.status = { x: M + 8 + boardW + 8, y: MT + 31, w: 20, h: 18 };
  dressWall(L, plan, segments, Math.min(aisleX, W - M - 14), D);
  L.entrance = { x: aisleX, y: D + 2 };
  L.entrancePath = [{ x: aisleX, y: net.halls[0]!, c: true }, L.entrance];
  // The guard's rounds stay in the lodge (and on the deck).
  L.patrol = net.halls.flatMap((hy, i) => (i % 2 ? [W - M - 12, M + 12] : [M + 12, W - M - 12]).map((x) => ({ x, y: hy, c: true })));
  cutDoors(L, plan);
  const lift = plan.lift;
  if (lift && deckHall !== null) {
    lift.way = [{ x: lift.bottom.x, y: deckHall, c: true }, { ...lift.bottom }];
    lift.home = walkHome(plan, lift.finish, deckHall);
  }
  // Firewood against the west wall and a few rocks and pines in the margins.
  const t = plan.terrain;
  const hillBottom = plan.deck ? plan.deck.y - 3 : H;
  if (M >= 16) {
    t.logs = { x: M - 13, y: Math.round(gr.y + 20), w: 12, h: 44 };
    scatter(t, [{ x: 1, y: MT + 4, w: M - 3, h: hillBottom - MT - 6 }, { x: W - M + 2, y: MT + 4, w: M - 3, h: hillBottom - MT - 6 }], [{ x: M - 16, y: t.logs.y - 4, w: 16, h: t.logs.h + 8 }], W * 17 + H);
  }
  plan.nooks = squeezeIn(L, cabinZones(L, plan, { great: gr, mud: mud as Rect, kitchen: kitchen as Rect, library, hall: net.halls[0]!, a1: aisleX, a2: aisleX }), threads - L.desks.length);
  L.themeData = plan;
  if (plan.deck) L.words = { "in the lounge": "on the sun deck" };
  return L;
}

/** The Mountain Cabin floor plan for a panel (null: the classic plan). */
export function cabinPlan(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return opts.portrait ? portraitPlan(W, H, opts.threads) : widePlan(W, H, opts.threads);
}
