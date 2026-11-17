// Home Office floor plan: a neighborhood where everyone works from home.
//
// Blocks of the city between streets (cars) and cross alleys (people): along
// the top the shopfronts carry the wall fixtures and the big screen; in the
// blocks stand little homes, each its own building with a floor plan and
// furniture of its own, with yards, trees and gaps between them; the park
// with the lawn where the street meets for a block party; the co-working
// café on the corner; your house with a small garden.
//
//  ┌ shopfronts: pinboard, calendar, the big screen, the door (+), clock ──┐
//  │  [home]  [home]  ║ [ co-working café ] ║  [home]   [cottage+garden]  │
//  │══ street (cars) ═╬═════════════════════╬═════════════════════════════│
//  │  [loft]  [home]  ║ [ the park, lawn  ] ║  [home]  [home]             │
//  │══ street ════════╬═════════════════════╬═════════════════════════════│
//  │  [home]  [tiny]  ║  [home]  [shop]     ║ [ your house ][garden]      │
//  │══ street ════════╩═════════════════════╩═════════════════════════════│
//
// Every home has one resident, who works, plans, waits for you, has a
// coffee and naps there, and meets the others on video calls. More threads
// than homes: homes go to the most urgent first (and stay theirs); the rest
// work from the co-working café, and idle ones hang out in the park.
import { Builder, bossToys, buildArcade, clamp, finish, type Network, type Point, type WallSegment } from "../../themekit.ts";
import type { Desk, Home, Layout, PlantPlacement, PropKind, Rect, Spot } from "../../layout.ts";

/** A home's back wall face, and its front wall. */
export const BACK = 18;
export const FRONT = 6;
export const AVE = 24;
/** The shopfronts along the top (two stories, the big screen on one), and the sidewalk under them (less on short panels). */
const TOP = 84;
const TOP_SHORT = 62;
const GAP = 4;
const STREET = 26;
/** A block row: the tallest building plus a strip of backyard behind it. */
const ROW_H = 100;
const ROW_SHORT = 93;

/** Furniture in a home, for drawing it (the prop ids are `home-<index>-<id>`). */
export interface Piece {
  id: string;
  kind: "counter" | "armchair" | "sofa" | "beanbag" | "bed" | "loftbed" | "flipchart" | "hammock" | "shelf" | "rug" | "tvset" | "table";
  rect: Rect;
}

export type TemplateId = "studio" | "loft" | "cottage" | "tiny" | "balcony" | "corner";

/** One home and where its things stand. */
export interface Unit {
  index: number;
  template: TemplateId;
  /** The building (walls included); the cottage's garden is beside it. */
  rect: Rect;
  garden: Rect | null;
  balcony: Rect | null;
  doorX: number;
  hall: number;
  /** Windows and the whiteboard on the back wall. */
  windows: Rect[];
  board: Rect | null;
  pieces: Piece[];
  bed: Rect;
  /** Where the bed's sleeper lies (the spot), for laying them down. */
  sleep: Point;
  deskIndex: number;
  seed: number;
}

export type LotKind = "green" | "parking" | "shop" | "yard";

export interface Lot {
  kind: LotKind;
  rect: Rect;
  seed: number;
}

/** What the plan remembers for drawing the neighborhood. */
export interface HomeData {
  kind: "home";
  units: Unit[];
  /** Fillers between the buildings. */
  lots: Lot[];
  /** Each block row, and the street under it (the hallway runs along its sidewalk). */
  rows: { y: number; street: Rect; hall: number }[];
  /** Cross alleys, full height. */
  avenues: Rect[];
  house: Rect;
  garden: Rect | null;
  park: Rect;
  lawn: Rect;
  cafe: Rect | null;
  /** The café's door (its middle). */
  cafeDoor: number;
  /** Trees in the yards and along the streets (trunk base). */
  trees: { x: number; y: number; size: number; seed: number }[];
  pond: Rect;
}

export function homeData(L: Layout): HomeData | null {
  const d = L.themeData as HomeData | undefined;
  return d && d.kind === "home" ? d : null;
}

// ------------------------------------------------------------------ the grid

interface Grid {
  /** How deep the shopfronts are. */
  top: number;
  rowsTop: number;
  rows: number;
  rowH: number;
  street: number;
  /** Each block's x range, left to right. */
  blocks: { x: number; w: number }[];
  aveX: number[];
}

function makeGrid(W: number, H: number, portrait: boolean): Grid {
  // Short panels get lower shopfronts and tighter rows, so two rows of blocks still fit.
  const short = H < 420;
  const depth = short ? TOP_SHORT : TOP;
  const base = short ? ROW_SHORT : ROW_H;
  const streetH = short ? 24 : STREET;
  const top = depth + GAP;
  const rows = clamp(Math.floor((H - top + 4) / (base + streetH)), 1, 7);
  const spare = Math.max(0, H - top - rows * (base + streetH));
  const street = streetH + Math.min(6, Math.floor(spare / rows / 2));
  const rowH = base + Math.min(16, Math.floor((spare - rows * (street - streetH)) / rows));
  const aves = portrait || W < 560 ? 1 : 2;
  const inner = W - 4 - aves * AVE;
  const blocks: { x: number; w: number }[] = [];
  const aveX: number[] = [];
  if (aves === 1) {
    blocks.push({ x: 2, w: inner });
    aveX.push(2 + inner);
  } else {
    // The middle block holds the café and the park; the outer ones the homes.
    // (Short panels: a wider café, there's less room for homes.)
    const mid = rows === 1 ? 150 : short ? 230 : clamp(Math.round(inner * 0.3), 196, 240);
    const side = Math.floor((inner - mid) / 2);
    let x = 2;
    for (const [i, w] of [side, mid, inner - mid - side].entries()) {
      blocks.push({ x, w });
      x += w;
      if (i < 2) {
        aveX.push(x);
        x += AVE;
      }
    }
  }
  return { top: depth, rowsTop: top + Math.max(0, H - top - rows * (rowH + street)), rows, rowH, street, blocks, aveX };
}

// ------------------------------------------------------------------ a home

/** Sizes of each kind of home: the building, and what comes beside it. */
const TEMPLATES: Record<TemplateId, { w: number; h: number; side?: number }> = {
  studio: { w: 96, h: 80 },
  loft: { w: 124, h: 84 },
  cottage: { w: 92, h: 78, side: 42 },
  tiny: { w: 78, h: 88 },
  balcony: { w: 102, h: 92 },
  corner: { w: 108, h: 80 },
};
const ORDER: TemplateId[] = ["studio", "loft", "cottage", "tiny", "balcony", "corner"];

/** Lays out one home: its furniture, its desk and a spot for each of the office's places. */
class HomeKit {
  readonly front: number;
  readonly pieces: Piece[] = [];
  readonly windows: Rect[] = [];
  board: Rect | null = null;
  readonly b: Builder;
  readonly index: number;
  readonly r: Rect;
  readonly hall: number;
  readonly doorX: number;
  constructor(b: Builder, index: number, r: Rect, hall: number, doorX: number) {
    this.b = b;
    this.index = index;
    this.r = r;
    this.hall = hall;
    this.doorX = doorX;
    this.front = r.y + r.h - FRONT;
  }
  /** Coordinates inside the home. */
  x(dx: number): number {
    return this.r.x + dx;
  }
  y(dy: number): number {
    return this.r.y + dy;
  }
  piece(id: string, kind: Piece["kind"], rect: Rect, prop: PropKind | null, z: number): Rect {
    this.pieces.push({ id, kind, rect });
    if (prop) this.b.prop(`home-${this.index}-${id}`, prop, rect.x, rect.y, z);
    return rect;
  }
  plant(sprite: PlantPlacement["sprite"], x: number, y: number): void {
    this.b.plant(sprite, x, y);
  }
  /** Up the door's column to the spot's height, then across. */
  up(x: number, y: number): Point[] {
    const pts: Point[] = [{ x: this.doorX, y: this.hall, c: true }, { x: this.doorX, y: this.front + 3 }, { x: this.doorX, y }, { x, y }];
    return pts.filter((q, i, all) => i === 0 || q.x !== all[i - 1]!.x || q.y !== all[i - 1]!.y);
  }
  /** Along the inside of the front wall, then up to the spot. */
  low(x: number, y: number): Point[] {
    const lane = this.front - 3;
    const pts: Point[] = [{ x: this.doorX, y: this.hall, c: true }, { x: this.doorX, y: this.front + 3 }, { x: this.doorX, y: lane }, { x, y: lane }, { x, y }];
    return pts.filter((q, i, all) => i === 0 || q.x !== all[i - 1]!.x || q.y !== all[i - 1]!.y);
  }
  spot(s: Omit<Spot, "home">): Spot {
    return this.b.spot({ ...s, home: this.index });
  }
  /** The desk (30×18 at x, y) facing the back wall ("south": you see their back and the screen) or you ("north"). */
  desk(x: number, y: number, side: "north" | "south", path: "up" | "low" = "up"): { index: number; seat: Point } {
    const b = this.b;
    const seat = side === "south" ? { x: x + 15, y: y + 30 } : { x: x + 15, y: y + 12 };
    const index = b.desks.length;
    // Up to just behind the chair, then in (helpers stand either side of the seat, off that lane).
    const behind = side === "south" ? Math.min(seat.y + 10, this.front - 3) : seat.y;
    const way =
      side === "south"
        ? [{ x: this.doorX, y: this.hall, c: true }, { x: this.doorX, y: this.front + 3 }, { x: this.doorX, y: behind }, { x: seat.x, y: behind }, { x: seat.x, y: seat.y }].filter((q, i, all) => i === 0 || q.x !== all[i - 1]!.x || q.y !== all[i - 1]!.y)
        : path === "up"
          ? this.up(seat.x, seat.y)
          : this.low(seat.x, seat.y);
    const spot = this.spot({ id: `desk-${index}`, kind: "desk", group: "desk", x: seat.x, y: seat.y, facing: side === "south" ? "back" : "front", pose: side === "south" ? "sit-desk" : "sit-desk-front", path: way, activity: "working from home" });
    b.desks.push({
      index,
      side,
      x,
      y,
      pcX: side === "south" ? x + 7 : x + 7,
      pcY: side === "south" ? y - 6 : y - 6,
      chairX: seat.x - 8,
      chairY: side === "south" ? seat.y - 14 : seat.y - 22,
      spot,
      screen: null,
    } satisfies Desk);
    // A call with you about a draft: at the desk.
    this.spot({ id: `home-${this.index}-call`, kind: "boss-guest", group: "boss", x: seat.x, y: seat.y, facing: side === "south" ? "back" : "front", pose: side === "south" ? "sit-back" : "sit-desk-front", path: way, activity: "on a call with you, going over a draft" });
    return { index, seat };
  }
  /** Planning on a group call (drawing on the board), presenting a plan to you (beside it). */
  planning(x: number, y: number, facing: "back" | "left" | "right" = "back"): void {
    this.spot({ id: `home-${this.index}-board`, kind: "whiteboard", group: "meeting", x, y, facing, pose: "draw", path: this.up(x, y), activity: "planning on a group call" });
    const px = x + (facing === "right" ? -10 : facing === "left" ? 10 : -6);
    this.spot({ id: `home-${this.index}-plan`, kind: "present", group: "present", x: px, y: y + 2, facing: "front", pose: "stand", path: this.up(px, y + 2), activity: "presenting a plan to you on a call" });
  }
  coffee(x: number, y: number): void {
    this.spot({ id: `home-${this.index}-coffee`, kind: "coffee", group: "break", x, y, facing: "back", pose: "cup", path: this.up(x, y), activity: "making a coffee at home" });
  }
  /** Waiting for you in the call lobby, seated facing you (and the same seat to read in). */
  waiting(x: number, y: number, lift: number, lounge: { activity: string; pose: Spot["pose"] } | null, path: "up" | "low" = "low"): void {
    const way = path === "up" ? this.up(x, y) : this.low(x, y);
    const wait = this.spot({ id: `home-${this.index}-wait`, kind: "review", group: "review", x, y, facing: "front", pose: "sit-front", path: way, activity: "in the call lobby, waiting for you", lift });
    this.b.seats.push(wait);
    if (lounge) this.spot({ id: `home-${this.index}-read`, kind: "armchair", group: "lounge", x, y, facing: "front", pose: lounge.pose, path: way, activity: lounge.activity, lift });
  }
  lounge(id: string, x: number, y: number, kind: Spot["kind"], pose: Spot["pose"], activity: string, lift = 0, path: "up" | "low" = "low"): void {
    this.spot({ id: `home-${this.index}-${id}`, kind, group: "lounge", x, y, facing: "front", pose, path: path === "up" ? this.up(x, y) : this.low(x, y), activity, lift });
  }
  nap(x: number, y: number, path: "up" | "low" = "low"): Point {
    this.spot({ id: `home-${this.index}-bed`, kind: "bench", group: "nap", x, y, facing: "front", pose: "nap", path: path === "up" ? this.up(x, y) : this.low(x, y), activity: "napping" });
    return { x, y };
  }
  wallBoard(x: number, w: number): Rect {
    this.board = { x: this.x(x), y: this.y(3), w, h: 13 };
    return this.board;
  }
  window(x: number, w = 18): void {
    this.windows.push({ x: this.x(x), y: this.y(3), w, h: 10 });
  }
}

/** One home of a kind, its door on the front wall (the bottom), onto the street below. */
function buildHome(b: Builder, index: number, t: TemplateId, r: Rect, hall: number, seed: number): Unit {
  const { w, h } = r;
  const doorDx: Record<TemplateId, number> = { studio: 48, loft: 62, cottage: 46, tiny: 40, balcony: 30, corner: 54 };
  const doorX = r.x + doorDx[t];
  const k = new HomeKit(b, index, r, hall, doorX);
  // (Its walls are drawn with the room: helpers and the technician walk in through the door.)
  b.rooms.push({ kind: "pod", rect: r, doorX, doorSide: "bottom", variant: index });
  let bed: Rect;
  let sleep: Point;
  let deskIndex = 0;
  let balcony: Rect | null = null;
  let garden: Rect | null = null;
  switch (t) {
    case "studio": {
      // Kitchenette | desk under the window | whiteboard; armchair and bed on the floor.
      k.piece("counter", "counter", { x: k.x(4), y: k.y(12), w: 24, h: 20 }, "side-table", k.y(32));
      k.coffee(k.x(17), k.y(39));
      k.window(w / 2 - 9);
      deskIndex = k.desk(k.x(w / 2 - 15), k.y(14), "south").index;
      k.wallBoard(w - 30, 26);
      k.planning(k.x(w - 17), k.y(37));
      k.piece("chair", "armchair", { x: k.x(6), y: k.y(48), w: 18, h: 20 }, "armchair", k.y(64));
      k.waiting(k.x(15), k.y(65), 3, { activity: "reading in the armchair", pose: "read" });
      bed = k.piece("bed", "bed", { x: k.x(w - 42), y: k.y(52), w: 38, h: 20 }, "bench", k.y(58));
      sleep = k.nap(bed.x + 22, bed.y + 14);
      break;
    }
    case "loft": {
      // A big room: the desk facing you by the bookshelf, a sofa on a rug, the bed in the corner.
      k.piece("shelf", "shelf", { x: k.x(4), y: k.y(2), w: 28, h: 30 }, "bookshelf", k.y(32));
      deskIndex = k.desk(k.x(8), k.y(36), "north", "low").index;
      k.window(38);
      k.window(62);
      k.piece("counter", "counter", { x: k.x(84), y: k.y(12), w: 24, h: 20 }, "side-table", k.y(32));
      k.coffee(k.x(97), k.y(39));
      k.piece("flip", "flipchart", { x: k.x(46), y: k.y(26), w: 16, h: 24 }, "low-shelf", k.y(48));
      k.planning(k.x(54), k.y(56));
      k.piece("rug", "rug", { x: k.x(42), y: k.y(58), w: 44, h: 18 }, null, 0);
      k.piece("sofa", "sofa", { x: k.x(46), y: k.y(58), w: 36, h: 16 }, "sofa-front", k.y(72));
      k.waiting(k.x(58), k.y(72), 4, null);
      k.lounge("sofa", k.x(70), k.y(72), "couch", "sit-front", "lounging on the sofa", 4);
      bed = k.piece("bed", "bed", { x: k.x(w - 42), y: k.y(48), w: 38, h: 20 }, "bench", k.y(54));
      sleep = k.nap(bed.x + 22, bed.y + 14);
      k.plant("PLANT", k.x(w - 20), k.y(22));
      break;
    }
    case "cottage": {
      // A little house: desk under the window, armchair, bed; beside it a garden with a hammock.
      garden = { x: r.x + w, y: r.y + 12, w: TEMPLATES.cottage.side!, h: h - 12 };
      k.piece("counter", "counter", { x: k.x(4), y: k.y(12), w: 24, h: 20 }, "side-table", k.y(32));
      k.coffee(k.x(17), k.y(39));
      k.window(34, 16);
      deskIndex = k.desk(k.x(32), k.y(14), "south").index;
      k.wallBoard(w - 28, 24);
      k.planning(k.x(w - 16), k.y(37));
      bed = k.piece("bed", "bed", { x: k.x(4), y: k.y(50), w: 38, h: 20 }, "bench", k.y(56));
      sleep = k.nap(bed.x + 22, bed.y + 14);
      k.piece("chair", "armchair", { x: k.x(w - 26), y: k.y(48), w: 18, h: 20 }, "armchair", k.y(64));
      k.waiting(k.x(w - 17), k.y(65), 3, null);
      // The hammock between two posts in the garden, reached through its gate.
      const hm = k.piece("hammock", "hammock", { x: garden.x + 4, y: garden.y + 30, w: 34, h: 14 }, "bench", garden.y + 38);
      const gate = garden.x + Math.round(garden.w / 2);
      const hx = hm.x + 17;
      const hy = hm.y + 10;
      k.spot({ id: `home-${index}-hammock`, kind: "bench", group: "lounge", x: hx, y: hy, facing: "front", pose: "sit-front", path: [{ x: gate, y: hall, c: true }, { x: gate, y: garden.y + garden.h + 2 }, { x: gate, y: hy + 6 }, { x: hx, y: hy + 6 }, { x: hx, y: hy }], activity: "swinging in the hammock", lift: 2 });
      break;
    }
    case "tiny": {
      // Narrow and tall: a loft bed over the desk, a beanbag, a tiny kitchen.
      bed = k.piece("loft", "loftbed", { x: k.x(4), y: k.y(4), w: 40, h: 34 }, "bench", k.y(36));
      sleep = k.nap(k.x(26), k.y(22), "up");
      deskIndex = k.desk(k.x(8), k.y(40), "north", "low").index;
      k.window(52, 14);
      k.piece("counter", "counter", { x: k.x(50), y: k.y(14), w: 24, h: 20 }, "side-table", k.y(34));
      k.coffee(k.x(62), k.y(41));
      k.piece("bean", "beanbag", { x: k.x(48), y: k.y(62), w: 24, h: 16 }, "beanbag-pink", k.y(74));
      k.waiting(k.x(60), k.y(76), 1, { activity: "sinking into the beanbag", pose: "read" });
      k.planning(k.x(54), k.y(52), "right");
      k.plant("POT", k.x(4), k.y(66));
      break;
    }
    case "balcony": {
      // A flat with a balcony along the front: desk facing you, sofa, bed; plants and a chair outside.
      balcony = { x: r.x + 3, y: r.y + h - 22, w: w - 6, h: 16 };
      k.window(30);
      k.window(56);
      deskIndex = k.desk(k.x(w - 38), k.y(26), "north", "low").index;
      k.piece("counter", "counter", { x: k.x(4), y: k.y(12), w: 24, h: 20 }, "side-table", k.y(32));
      k.coffee(k.x(17), k.y(39));
      k.wallBoard(w - 30, 26);
      k.planning(k.x(w - 50), k.y(37), "right");
      bed = k.piece("bed", "bed", { x: k.x(4), y: k.y(44), w: 38, h: 20 }, "bench", k.y(50));
      sleep = k.nap(bed.x + 22, bed.y + 14, "up");
      k.piece("chair", "armchair", { x: k.x(54), y: k.y(50), w: 18, h: 20 }, "armchair", k.y(66));
      k.waiting(k.x(63), k.y(67), 3, null, "up");
      k.lounge("balcony", k.x(w - 20), k.y(h - 10), "bench", "sit-front", "out on the balcony", 0);
      k.plant("POT", k.x(w - 40), k.y(h - 22));
      k.plant("PLANT", k.x(6), k.y(h - 36));
      break;
    }
    case "corner": {
      // A corner flat: the desk facing you between plants, a sofa along the wall, the bed by the window.
      k.window(40);
      k.window(72);
      k.wallBoard(6, 24);
      k.planning(k.x(18), k.y(37));
      k.piece("counter", "counter", { x: k.x(w - 28), y: k.y(12), w: 24, h: 20 }, "side-table", k.y(32));
      k.coffee(k.x(w - 15), k.y(39));
      deskIndex = k.desk(k.x(36), k.y(40), "north", "low").index;
      k.plant("CACTUS", k.x(70), k.y(36));
      k.piece("sofa", "sofa", { x: k.x(4), y: k.y(54), w: 36, h: 16 }, "sofa-front", k.y(68));
      k.waiting(k.x(14), k.y(68), 4, null);
      k.lounge("sofa", k.x(28), k.y(68), "couch", "sit-front", "lounging on the sofa", 4);
      bed = k.piece("bed", "bed", { x: k.x(w - 42), y: k.y(52), w: 38, h: 20 }, "bench", k.y(58));
      sleep = k.nap(bed.x + 22, bed.y + 14);
      break;
    }
  }
  b.prop(`home-${index}-front`, "glass-front", r.x, k.front, r.y + h + 1, w);
  b.poke(`home-${index}-coffee`, "coffee", { x: r.x + 4, y: r.y + 8, w: 24, h: 16 });
  if (k.board) b.poke(`home-${index}-board`, "whiteboard", k.board);
  return { index, template: t, rect: r, garden, balcony, doorX, hall, windows: k.windows, board: k.board, pieces: k.pieces, bed: bed!, sleep: sleep!, deskIndex, seed };
}

// ------------------------------------------------------------------ the co-working café

/** Laptop desks facing you in rows, the coffee bar at the back: where those without a home (yet) work. */
function buildCafe(b: Builder, r: Rect, hall: number, want: number, arcade: boolean): number {
  // (Not a walled room: you walk in to play the arcade; the backdrop draws its walls.)
  b.rooms.push({ kind: "pod", rect: r, variant: -1 });
  b.prop("cafe-bar", "low-shelf", r.x + 6, r.y + 6, r.y + 28, Math.min(80, r.w - 70));
  b.prop("cafe-front", "glass-front", r.x, r.y + r.h - FRONT, r.y + r.h + 1, r.w);
  // The door at the right, beside the arcade cabinet in the back corner.
  const doorX = r.x + r.w - (arcade ? 44 : 14);
  const bottom = r.y + r.h - FRONT;
  const lane0 = bottom - 3;
  if (arcade) buildArcade(b, r.x + r.w - 32, r.y + 2, [{ x: doorX, y: hall, c: true }, { x: doorX, y: r.y + r.h + 3 }, { x: doorX, y: lane0 }, { x: r.x + r.w - 20, y: lane0 }, { x: r.x + r.w - 20, y: r.y + 60 }]);
  // (Desks far enough apart for a thread's helpers to stand either side.)
  const cols = Math.max(1, Math.floor((r.w - (arcade ? 50 : 24)) / 46));
  const rowsFit = Math.max(1, Math.floor((r.h - FRONT - 22 - 28) / 30) + 1);
  const n = Math.min(want, cols * rowsFit);
  let made = 0;
  for (let row = 0; row < rowsFit && made < n; row++) {
    const y = r.y + 28 + row * 30;
    const lane = y - 12;
    for (let c = 0; c < cols && made < n; c++, made++) {
      const x = r.x + 10 + c * 46;
      const seat = { x: x + 15, y: y + 12 };
      const index = b.desks.length;
      const spot = b.spot({
        id: `desk-${index}`,
        kind: "desk",
        group: "desk",
        x: seat.x,
        y: seat.y,
        facing: "front",
        pose: "sit-desk-front",
        path: [{ x: doorX, y: hall, c: true }, { x: doorX, y: r.y + r.h + 3 }, { x: doorX, y: lane }, { x: seat.x, y: lane }, seat],
        activity: "working from the co-working café",
      });
      b.desks.push({ index, side: "north", x, y, pcX: x + 7, pcY: y - 6, chairX: seat.x - 8, chairY: seat.y - 22, spot, screen: null });
    }
  }
  return made;
}

// ------------------------------------------------------------------ your house

function buildHouse(b: Builder, r: Rect, hall: number, arcade: boolean): Layout["boss"] {
  const front = r.y + r.h - FRONT;
  const doorX = r.x + 18;
  b.rooms.push({ kind: "boss", rect: r, walls: "wood", doorX, doorSide: "bottom" });
  const deskW = 60;
  const deskX = clamp(r.x + Math.round(r.w * 0.4) - deskW / 2, r.x + 34, r.x + r.w - deskW - (arcade ? 40 : 12));
  const desk: Rect = { x: deskX, y: r.y + 32, w: deskW, h: 26 };
  const seat = { x: desk.x + deskW / 2, y: desk.y + 4 };
  b.prop("boss-chair", "boss-chair", seat.x - 10, desk.y - 22, desk.y - 1);
  b.prop("boss-desk", "boss-desk", desk.x, desk.y, desk.y + 22, deskW);
  b.poke("boss", "boss", { x: seat.x - 9, y: desk.y - 24, w: 18, h: 24 });
  b.prop("lamp", "lamp", r.x + 5, r.y + 4, r.y + 54);
  b.poke("lamp", "lamp", { x: r.x + 5, y: r.y + 4, w: 16, h: 52 });
  const shelfX = arcade ? r.x + r.w - 70 : r.x + r.w - 38;
  b.prop("boss-shelf", "library-shelf", shelfX, r.y - 6, r.y + 24);
  b.poke("globe", "globe", { x: shelfX, y: r.y - 6, w: 32, h: 14 });
  const dogBed = { x: r.x + r.w - (arcade ? 54 : 22), y: front - 4 };
  b.prop("dog-bed", "dog-bed", dogBed.x - 12, dogBed.y - 8, dogBed.y - 6);
  b.prop("house-front", "glass-front", r.x, front, r.y + r.h + 1, r.w);
  const lane = front - 4;
  if (arcade) {
    const ax = r.x + r.w - 32;
    buildArcade(b, ax, r.y + 4, [{ x: doorX, y: hall, c: true }, { x: doorX, y: front + 3 }, { x: doorX, y: lane }, { x: ax + 12, y: lane }, { x: ax + 12, y: r.y + 62 }]);
  }
  b.plant("PLANT", r.x + 24, r.y + 2, false);
  const boss = bossToys(b, { room: r, seat, desk, dogBed, lamp: { x: r.x + 13, y: r.y + 6 } });
  const side = desk.x - 8;
  const way: Point[] = [
    { x: doorX, y: hall, c: true },
    { x: doorX, y: front + 3 },
    { x: doorX, y: lane },
    { x: side, y: lane },
    { x: side, y: seat.y },
    { x: seat.x, y: seat.y },
  ].filter((q, i, all) => i === 0 || q.x !== all[i - 1]!.x || q.y !== all[i - 1]!.y);
  return { ...boss, way };
}

// ------------------------------------------------------------------ the park

/** The lawn for events, benches and a picnic blanket for idle threads without a home. */
function buildPark(b: Builder, r: Rect, hall: number): { lawn: Rect; bench: Rect } {
  b.rooms.push({ kind: "lounge", rect: r });
  const lawn: Rect = { x: r.x + 34, y: r.y + 10, w: r.w - 68, h: r.h - 18 };
  // Benches either side of the lawn, facing you.
  const benches: Rect[] = [
    { x: r.x + 4, y: r.y + 26, w: 26, h: 13 },
    { x: r.x + r.w - 30, y: r.y + 26, w: 26, h: 13 },
  ];
  for (const [i, bn] of benches.entries()) {
    b.prop(`park-bench-${i}`, "bench", bn.x, bn.y, bn.y + 13);
    const x = bn.x + 13;
    const y = bn.y + 12;
    const side = i === 0 ? r.x + 2 : r.x + r.w - 2;
    b.spot({ id: `park-bench-${i}`, kind: "bench", group: "lounge", x, y, facing: "front", pose: "sit-front", path: [{ x: side, y: hall, c: true }, { x: side, y: y + 6 }, { x, y: y + 6 }, { x, y }], activity: "on a bench in the park", lift: 2 });
  }
  // Two picnic spots on the grass below the benches.
  for (const [i, x] of [r.x + 17, r.x + r.w - 17].entries()) {
    const y = r.y + 62;
    const side = i === 0 ? r.x + 2 : r.x + r.w - 2;
    b.spot({ id: `park-picnic-${i}`, kind: "huddle", group: "lounge", x, y, facing: "front", pose: "sit-front", path: [{ x: side, y: hall, c: true }, { x: side, y: y + 4 }, { x, y: y + 4 }, { x, y }], activity: "a picnic in the park" });
  }
  const bx = r.x + 16;
  const by = r.y + r.h - 6;
  b.spot({ id: "park-coffee", kind: "huddle", group: "break", x: bx, y: by, facing: "front", pose: "cup", path: [{ x: bx, y: hall, c: true }, { x: bx, y: by }], activity: "a coffee in the park" });
  const nx = r.x + r.w - 16;
  b.spot({ id: "park-nap", kind: "beanbag", group: "nap", x: nx, y: by, facing: "front", pose: "nap", path: [{ x: nx, y: hall, c: true }, { x: nx, y: by }], activity: "dozing on the grass" });
  return { lawn, bench: benches[0]! };
}

// ------------------------------------------------------------------ the plan

interface Place {
  kind: "home" | "cafe" | "park" | "house" | "filler";
  w: number;
  h: number;
  template?: TemplateId;
  gap: number;
}

export function homePlan(W: number, H: number, threads: number, portrait: boolean): Layout {
  const g = makeGrid(W, H, portrait);
  const b = new Builder();
  const rows: HomeData["rows"] = [];
  for (let r = 0; r < g.rows; r++) {
    const y = g.rowsTop + r * (g.rowH + g.street);
    rows.push({ y, street: { x: 0, y: y + g.rowH, w: W, h: g.street }, hall: y + g.rowH + 7 });
  }
  const avenues: Rect[] = g.aveX.map((x) => ({ x, y: 0, w: AVE, h: H }));
  const net: Network = { halls: rows.map((r) => r.hall), aisles: avenues.map((a) => a.x + AVE / 2) };

  // What goes where: the café and the park in the middle block, your house in the bottom
  // row of the last block, homes in the stretches left (with gaps of city between them).
  const last = g.blocks.length - 1;
  const midBlock = g.blocks.length >= 3 ? 1 : 0;
  const houseRow = g.rows - 1;
  const special = (row: number, block: number): "house" | "park" | "cafe" | null => {
    if (row === houseRow && block === last) return "house";
    if (g.rows >= 3) return block === midBlock ? (row === 0 ? "cafe" : row === 1 ? "park" : null) : null;
    if (g.rows === 2) return block === midBlock ? (row === 0 ? "park" : "cafe") : null;
    return block === midBlock ? "park" : block === 0 && last > 0 ? "cafe" : null;
  };
  const parkRowOf = () => [...Array(g.rows).keys()].find((r) => g.blocks.some((_, bi) => special(r, bi) === "park")) ?? 0;
  const units: Unit[] = [];
  const lots: Lot[] = [];
  const trees: HomeData["trees"] = [];
  let house: Rect | null = null;
  let garden: Rect | null = null;
  let park: { rect: Rect; lawn: Rect; bench: Rect } | null = null;
  let cafe: Rect | null = null;
  let cafeRowIndex = -1;
  const stretches: { x: number; w: number; row: number; bottom: number }[] = [];
  for (let row = 0; row < g.rows; row++) {
    const ry = rows[row]!.y;
    const bottom = ry + g.rowH;
    for (const [bi, blk] of g.blocks.entries()) {
      const kind = special(row, bi);
      if (kind === "house") {
        // (A one-row plan has no room for the garden: the house gets the arcade instead.)
        const gw = g.rows === 1 ? 0 : blk.w >= 230 ? 56 : blk.w >= 196 ? 44 : 0;
        const hw = clamp(blk.w - gw - 8, 116, 196);
        const hh = 84;
        house = { x: blk.x + blk.w - gw - hw - (gw ? 2 : 4), y: bottom - hh, w: hw, h: hh };
        if (gw) garden = { x: house.x + hw + 2, y: bottom - 72, w: gw - 2, h: 72 };
        if (house.x - blk.x - 6 >= 40) stretches.push({ x: blk.x + 2, w: house.x - blk.x - 6, row, bottom });
      } else if (kind === "park") {
        const rect = { x: blk.x + 4, y: ry + 6, w: blk.w - 8, h: g.rowH - 8 };
        park = { rect, ...buildPark(b, rect, rows[row]!.hall) };
      } else if (kind === "cafe") {
        cafe = { x: blk.x + 6, y: bottom - 88, w: blk.w - 12, h: 88 };
        cafeRowIndex = row;
      } else stretches.push({ x: blk.x + 4, w: blk.w - 8, row, bottom });
    }
  }
  // Homes: a few (as the panel allows), spread over the stretches; never more than the threads.
  const homeW = (t: TemplateId) => TEMPLATES[t].w + (TEMPLATES[t].side ?? 0);
  /** The homes that fit along a stretch (up to n), each kind in turn, the next that fits. */
  const choose = (st: { x: number; w: number; row: number }, n: number): TemplateId[] => {
    const list: TemplateId[] = [];
    let used = 0;
    let k = st.row * 2 + Math.floor(st.x / 97);
    while (list.length < n) {
      let found: TemplateId | null = null;
      for (let j = 0; j < ORDER.length; j++) {
        const t = ORDER[(k + j) % ORDER.length]!;
        if (used + homeW(t) + (list.length > 0 ? 12 : 0) <= st.w) {
          found = t;
          k += j + 1;
          break;
        }
      }
      if (!found) break;
      used += homeW(found) + (list.length > 0 ? 12 : 0);
      list.push(found);
    }
    return list;
  };
  const fits = stretches.map((st) => choose(st, 6).length);
  const most = Math.max(4, Math.floor((W * H) / 36000));
  let want = Math.min(threads, most, fits.reduce((a, n) => a + n, 0));
  const count = stretches.map(() => 0);
  for (let pass = 0; want > 0 && pass < 6; pass++) {
    for (let i = 0; i < stretches.length && want > 0; i++) {
      if (count[i]! < fits[i]! && count[i]! <= pass) {
        count[i]!++;
        want--;
      }
    }
  }
  const homeRects: { rect: Rect; row: number; template: TemplateId }[] = [];
  for (const [i, st] of stretches.entries()) {
    const list = choose(st, count[i]!);
    // Spread them out: the city fills the space between.
    const used = list.reduce((a, q) => a + homeW(q), 0);
    const free = st.w - used;
    const gap = list.length > 0 ? Math.floor(free / (list.length + 1)) : free;
    let x = st.x;
    const filler = (w: number) => {
      if (w < 8) return;
      const kind: LotKind = w >= 64 ? (["green", "shop", "parking", "green", "shop"] as const)[(Math.floor(x / 50) + st.row) % 5]! : "yard";
      lots.push({ kind, rect: { x, y: st.bottom - 84, w, h: 84 }, seed: x * 7 + st.row * 13 });
      if (kind === "yard" && w >= 14) trees.push({ x: x + Math.floor(w / 2), y: st.bottom - 4, size: w >= 22 ? 2 : 1, seed: x + st.row });
      if (kind === "green") trees.push({ x: x + Math.floor(w * 0.3), y: st.bottom - 30, size: 2, seed: x + 5 }, { x: x + Math.floor(w * 0.75), y: st.bottom - 46, size: 1, seed: x + 9 });
    };
    for (const t of list) {
      const T = TEMPLATES[t];
      filler(gap);
      x += gap;
      homeRects.push({ rect: { x, y: st.bottom - T.h, w: T.w, h: T.h }, row: st.row, template: t });
      x += homeW(t);
    }
    filler(st.x + st.w - x);
  }
  if (!house || !park) throw new Error("home office: no house or park");
  // The homes, in order down the rows.
  for (const [i, h] of homeRects.entries()) units.push(buildHome(b, i, h.template, h.rect, rows[h.row]!.hall, 11 + i * 17 + h.rect.x));
  // The café takes whoever has no home: desks for the rest of the threads (at least enough to work).
  const homeDesks = units.length;
  const extra = Math.max(Math.min(threads, 8) - homeDesks, threads - homeDesks, 0);
  // Your gaming corner is in your house when it's roomy; else the arcade cabinet stands in the café.
  const houseArcade = house.w >= 180;
  if (cafe) buildCafe(b, cafe, rows[cafeRowIndex]!.hall, Math.max(extra, 2), !houseArcade);
  const cafeDoor = cafe ? cafe.x + cafe.w - (houseArcade ? 14 : 44) : -99;

  const boss = buildHouse(b, house, rows[houseRow]!.hall, houseArcade);
  // Threads without a home that need you come round and wait on the bench in your garden (or in the park).
  const benchAt: Rect = garden ? { x: garden.x + 3, y: garden.y + 16, w: garden.w - 6, h: 12 } : { x: park.rect.x + Math.round(park.rect.w / 2) - 18, y: park.rect.y + park.rect.h - 20, w: 36, h: 12 };
  b.prop("porch-bench", "bench", benchAt.x, benchAt.y, benchAt.y + 10);
  const gateX = garden ? garden.x + Math.round(garden.w / 2) : benchAt.x + benchAt.w + 6;
  const hallY = rows[houseRow]!.hall;
  for (let i = 0; i < 3; i++) {
    const x = benchAt.x + 6 + Math.round(((benchAt.w - 12) * i) / 2);
    const y = benchAt.y + 11;
    const spot = b.spot({ id: `porch-${i}`, kind: "review", group: "review", x, y, facing: "front", pose: "sit-front", path: [{ x: gateX, y: garden ? hallY : rows[parkRowOf()]!.hall, c: true }, { x: gateX, y: y + 6 }, { x, y: y + 6 }, { x, y }], activity: "waiting for you at your place", lift: 2 });
    b.seats.push(spot);
  }
  const pond: Rect = garden ? { x: garden.x + Math.round(garden.w / 2) - 20, y: garden.y + 38, w: 40, h: 24 } : { x: park.rect.x + 6, y: park.rect.y + park.rect.h - 30, w: 40, h: 24 };
  b.poke("fishtank", "fishtank", pond);

  // The big screen on the shopfronts.
  const segments = topSegments(W, net.aisles[0]!, g.top, portrait);
  const tvW = g.top < TOP ? 84 : W >= 640 ? 120 : 104;
  const tvH = Math.round(tvW * 0.56);
  const tvX = portrait ? clamp(Math.round(W * 0.5 - tvW / 2), 186, W - tvW - 50) : clamp(Math.round(W * 0.5 - tvW / 2), 190, W - tvW - 60);
  const wallTv: Rect = { x: tvX, y: g.top - tvH - 8, w: tvW, h: tvH };
  b.prop("tv", "tv", wallTv.x, wallTv.y, 0, tvW);
  const tvParts = {
    tv: wallTv,
    screen: { x: wallTv.x + 4, y: wallTv.y + 4, w: tvW - 8, h: tvH - 8 },
    speakers: [
      { x: wallTv.x - 14, y: wallTv.y + tvH - 26, w: 10, h: 26 },
      { x: wallTv.x + tvW + 4, y: wallTv.y + tvH - 26, w: 10, h: 26 },
    ],
    couch: park.bench,
    fishtank: pond,
    arcade: null,
  };
  // Places the office looks for by name.
  const u0 = units[0];
  const kitchen: Rect = u0 ? { x: u0.rect.x + 4, y: u0.rect.y + BACK, w: u0.rect.w - 8, h: u0.rect.h - BACK - FRONT } : park.rect;
  const L = finish(b, W, H, portrait, segments, net, {
    meeting: u0 ? { x: u0.rect.x + 4, y: u0.rect.y + 4, w: u0.rect.w - 8, h: u0.rect.h - 12 } : park.rect,
    whiteboard: u0?.board ? { ...u0.board, h: 34 } : { x: park.rect.x, y: park.rect.y, w: 60, h: 34 },
    boss,
    waiting: { x: house.x + 4, y: house.y + 4, w: house.w - 8, h: house.h - 12 },
    kitchen,
    lounge: park.rect,
    games: null,
    eventArea: park.lawn,
    tvParts,
    gamesParts: null,
    doorX: net.aisles[0]!,
    lamp: boss.lamp,
    wallTv,
  });
  // The gaps between the shopfronts reach up to the sky; no paintings or hanging plants out here.
  L.wall.windows = L.wall.windows.map((w) => {
    const seg = L.segments.find((s) => w.x >= s.x0 && w.x < s.x1) ?? L.segments[0]!;
    return { x: w.x, y: 0, w: w.w, h: seg.depth - 14 };
  });
  L.wall.paintings = [];
  // On a narrow panel the clock hangs above the door.
  // On a narrow panel the clock hangs between the big screen and the door (clear of the buttons in the corner).
  if (portrait) L.wall.clock = { x: Math.max(wallTv.x + wallTv.w + 26, L.wall.door.x - 12), y: 24, r: 9 };
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
  // Every home is a "pod" of one (helpers stand at the desk inside), and so is the café.
  L.pods = [...units.map((u) => u.rect), ...(cafe ? [cafe] : [])];
  L.homes = units.map((u): Home => ({ rect: u.rect, door: { x: u.doorX, y: u.rect.y + u.rect.h }, desk: u.deskIndex }));
  // Trees along the sidewalks, clear of doors and alleys.
  for (const [ri, r] of rows.entries()) {
    for (let x = 30; x < W - 20; x += 64) {
      const tx = x + ((ri * 23) % 30);
      const clear = units.every((u) => Math.abs(u.doorX - tx) > 12) && avenues.every((a) => tx < a.x - 8 || tx > a.x + a.w + 8) && Math.abs(boss.way![0]!.x - tx) > 12 && (!cafe || Math.abs(cafeDoor - tx) > 14);
      if (clear) trees.push({ x: tx, y: r.street.y + r.street.h - 2, size: 0, seed: tx * 3 + ri });
    }
  }
  L.themeData = { kind: "home", units, lots, rows, avenues, house, garden, park: park.rect, lawn: park.lawn, cafe, cafeDoor, trees, pond } satisfies HomeData;
  return L;
}

/** The shopfronts along the top: a few buildings of different depth. */
function topSegments(W: number, doorX: number, top: number, portrait: boolean): WallSegment[] {
  if (portrait) return [
    { x0: 0, x1: 176, depth: top - 2 },
    { x0: 176, x1: W, depth: top },
  ];
  const a = Math.max(150, Math.round(W * 0.26));
  const b = Math.max(a + 160, Math.min(W - 80, Math.round(W * 0.74)));
  const cut = (x: number) => (Math.abs(x - doorX) < 24 ? x + 30 : x);
  return [
    { x0: 0, x1: cut(a), depth: top - 2 },
    { x0: cut(a), x1: cut(b), depth: top },
    { x0: cut(b), x1: W, depth: top - 2 },
  ];
}

export function homeLayout(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return homePlan(W, H, opts.threads, opts.portrait);
}
