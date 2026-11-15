// The office floor plan, generated for the panel's size and shape. Native
// pixels; the view scales the scene so it fills the panel.
//
// Rooms are laid out by a template (wide, tall or phone-portrait), connected
// by hallways. Every spot's path starts on a hallway point (`c: true`); the
// network routes between hallway points along hallways and aisles.
//
// Wide:                                         Portrait:
//  ┌ wall (segments of different depth) ┐       ┌ wall ───────────┐
//  │ pods   │ kitchen   │ meeting room  │       │ pod A            │
//  │        │ lounge/TV │ (glass)       │       │ kitchen │ meeting│
//  │════════╪═══ hallway ═══════════════│       │ lounge (TV)      │
//  │ pod B  │ waiting   │ boss office   │       │ pod B / games    │
//  │ games  │ room      │ (you)         │       │ waiting │ boss   │
//  └────────┴───────────┴───────────────┘       └──────────────────┘

export type Facing = "front" | "back" | "left" | "right";

export type SpotKind =
  | "desk"
  | "review"
  | "present"
  | "boss-guest"
  | "whiteboard"
  | "meeting-seat"
  | "couch"
  | "armchair"
  | "beanbag"
  | "coffee"
  | "tea"
  | "vending"
  | "fridge"
  | "stool"
  | "cooler"
  | "pingpong"
  | "darts"
  | "cornhole"
  | "arcade"
  | "piano"
  | "fishtank"
  | "event";

export type SpotGroup = "desk" | "meeting" | "present" | "review" | "boss" | "break" | "lounge" | "nap" | "event";

export type Pose =
  | "stand"
  | "sit-desk"
  | "sit-desk-front"
  | "sit-back"
  | "sit-front"
  | "nap"
  | "paddle"
  | "cup"
  | "read"
  | "draw"
  | "throw"
  | "play";

export interface Point {
  x: number;
  y: number;
  /** On a hallway: routing joins paths here. */
  c?: boolean;
}

export interface Spot {
  id: string;
  kind: SpotKind;
  group: SpotGroup;
  /** Feet position. */
  x: number;
  y: number;
  facing: Facing;
  pose: Pose;
  /** Waypoints from a hallway to the spot; the first point is on a hallway. */
  path: Point[];
  activity: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One workstation in a pod. North seats face you; south seats face their screen. */
export interface Desk {
  index: number;
  side: "north" | "south";
  x: number;
  y: number;
  pcX: number;
  pcY: number;
  chairX: number;
  chairY: number;
  spot: Spot;
  screen: Rect | null;
}

export type PropKind =
  | "couch"
  | "coffee-table"
  | "pingpong"
  | "arcade"
  | "beanbag-blue"
  | "beanbag-pink"
  | "armchair"
  | "bookshelf"
  | "lamp"
  | "printer"
  | "cooler"
  | "meeting-table"
  | "meeting-chair-back"
  | "meeting-chair-front"
  | "plan-rolls"
  | "glass-front"
  | "library-shelf"
  | "library-table"
  | "sofa-front"
  | "sofa-back"
  | "low-shelf"
  | "planter"
  | "kitchen-island"
  | "kitchen-counter"
  | "stool"
  | "fridge"
  | "vending"
  | "fishtank-stand"
  | "whiteboard"
  | "tv"
  | "piano"
  | "dartboard"
  | "cornhole"
  | "waiting-chair"
  | "waiting-sofa"
  | "side-table"
  | "reception"
  | "boss-desk"
  | "boss-chair"
  | "guest-chair"
  | "dog-bed"
  | "bin";

export interface PropPlacement {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  /** Depth: props and characters draw in ascending z. */
  z: number;
  /** Width for stretchy props. */
  w?: number;
  variant?: number;
}

export interface PlantPlacement {
  sprite: "PLANT" | "PLANT_2" | "LARGE_PLANT" | "CACTUS" | "POT" | "HANGING_PLANT";
  x: number;
  y: number;
  z: number;
}

export type RoomKind = "pod" | "meeting" | "boss" | "waiting" | "kitchen" | "lounge" | "games" | "library";

export interface Room {
  kind: RoomKind;
  rect: Rect;
  /** Glass/wood walls around the room, if it is a closed room. */
  walls?: "glass" | "wood";
  /** Door gap x on the bottom (or top) wall. */
  doorX?: number;
  doorSide?: "top" | "bottom";
  variant?: number;
}

/** Something you can click for fun. */
export type PokeKind =
  | "coffee"
  | "kettle"
  | "vending"
  | "fridge"
  | "microwave"
  | "piano"
  | "dartboard"
  | "printer"
  | "cooler"
  | "lamp"
  | "plant"
  | "bin"
  | "clock"
  | "arcade"
  | "pingpong"
  | "fishtank"
  | "whiteboard"
  | "bell"
  | "boss"
  | "cornhole"
  | "globe";

export interface Pokeable {
  id: string;
  kind: PokeKind;
  rect: Rect;
}

export interface WallSegment {
  x0: number;
  x1: number;
  depth: number;
}

export interface Network {
  /** y of each hallway (they run the full width). */
  halls: number[];
  /** x of each aisle (they connect all hallways). */
  aisles: number[];
}

export interface Layout {
  W: number;
  H: number;
  portrait: boolean;
  segments: WallSegment[];
  net: Network;
  rooms: Room[];
  pods: Rect[];
  meeting: Rect;
  whiteboard: Rect;
  boss: { room: Rect; seat: Point; desk: Rect; dogBed: Point; lamp: Point };
  waiting: Rect;
  kitchen: Rect;
  lounge: Rect;
  games: Rect | null;
  /** Where office events gather. */
  eventArea: Rect;
  tv: Rect;
  tvScreen: Rect;
  speakers: Rect[];
  desks: Desk[];
  /** Waiting-room seats in fill order. */
  seats: Spot[];
  spots: Spot[];
  byId: Map<string, Spot>;
  props: PropPlacement[];
  plants: PlantPlacement[];
  pokeables: Pokeable[];
  /** The office door: newcomers walk in, leavers walk out. */
  entrance: Point;
  entrancePath: Point[];
  /** A loop through the hallways, for the guard and the cleaner. */
  patrol: Point[];
  fishtank: Rect;
  arcade: Rect | null;
  pingpong: Rect | null;
  couch: Rect;
  lamp: Point;
  wall: {
    pinboard: Rect;
    legendNote: Rect;
    calendar: Rect;
    status: Rect;
    door: Rect;
    windows: Rect[];
    clock: { x: number; y: number; r: number };
    pillars: number[];
    paintings: { sprite: "SMALL_PAINTING" | "SMALL_PAINTING_2" | "LARGE_PAINTING"; x: number; y: number }[];
  };
}

export const MIN_W_WIDE = 600;
export const MIN_H_WIDE = 300;
export const PORTRAIT_W = 340;
export const PORTRAIT_MIN_H = 600;
const POD_H = 104;
const POD_GAP = 30;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface LayoutOptions {
  threads?: number;
}

/** Route between two hallway points along hallways and aisles. Excludes `a`. */
export function connect(net: Network, a: Point, b: Point): Point[] {
  if (a.y === b.y) return a.x === b.x ? [] : [{ x: b.x, y: b.y, c: true }];
  let best = net.aisles[0] ?? a.x;
  let cost = Infinity;
  for (const x of net.aisles) {
    const c = Math.abs(x - a.x) + Math.abs(x - b.x);
    if (c < cost) {
      cost = c;
      best = x;
    }
  }
  const out: Point[] = [];
  if (best !== a.x) out.push({ x: best, y: a.y, c: true });
  out.push({ x: best, y: b.y, c: true });
  if (best !== b.x) out.push({ x: b.x, y: b.y, c: true });
  return out;
}

class Builder {
  spots: Spot[] = [];
  props: PropPlacement[] = [];
  plants: PlantPlacement[] = [];
  desks: Desk[] = [];
  pods: Rect[] = [];
  rooms: Room[] = [];
  pokeables: Pokeable[] = [];
  seats: Spot[] = [];

  prop(id: string, kind: PropKind, x: number, y: number, z: number, w?: number): void {
    this.props.push({ id, kind, x: Math.round(x), y: Math.round(y), z, w });
  }

  plant(sprite: PlantPlacement["sprite"], x: number, y: number, poke = true): void {
    const h = sprite === "LARGE_PLANT" ? 48 : sprite === "POT" ? 16 : 32;
    const w = sprite === "LARGE_PLANT" ? 32 : 16;
    this.plants.push({ sprite, x: Math.round(x), y: Math.round(y), z: y + h - 2 });
    if (poke) this.poke(`plant-${this.plants.length}`, "plant", { x, y: y + h - 28, w, h: 28 });
  }

  poke(id: string, kind: PokeKind, rect: Rect): void {
    this.pokeables.push({ id, kind, rect });
  }

  spot(s: Spot): Spot {
    this.spots.push(s);
    return s;
  }
}

/** Access to a room: the hallway it hangs off and an aisle beside it. */
interface Access {
  hallY: number;
  aisleX: number;
}

const via = (acc: Access, laneY: number, x: number, y: number): Point[] => [
  { x: acc.aisleX, y: acc.hallY, c: true },
  { x: acc.aisleX, y: laneY },
  { x, y: laneY },
  { x, y },
];

// ------------------------------------------------------------------ rooms

function buildPods(b: Builder, r: Rect, acc: Access): void {
  const cols = Math.max(1, Math.floor(r.w / 48));
  const rows = Math.max(1, Math.floor((r.h + 8) / POD_H));
  const x0 = r.x + Math.floor((r.w - cols * 48) / 2);
  for (let row = 0; row < rows; row++) {
    const ry = r.y + row * POD_H;
    if (row > 0) b.prop(`planter-pod-${b.pods.length}`, "planter", x0 + 4, ry - 12, ry + 2, cols * 48 - 8);
    const py = ry + 18;
    b.pods.push({ x: x0, y: ry, w: cols * 48, h: POD_H - 4 });
    for (let i = 0; i < cols; i++) {
      const dx = x0 + i * 48;
      const nIndex = b.desks.length;
      const nx = dx + 30;
      const north = b.spot({
        id: `desk-${nIndex}`,
        kind: "desk",
        group: "desk",
        x: nx,
        y: py + 18,
        facing: "front",
        pose: "sit-desk-front",
        path: via(acc, py - 12, nx, py + 18),
        activity: "at the desk",
      });
      b.desks.push({ index: nIndex, side: "north", x: dx, y: py, pcX: dx + 4, pcY: py + 2, chairX: dx + 22, chairY: py - 8, spot: north, screen: null });
      const sIndex = b.desks.length;
      const sx = dx + 32;
      const south = b.spot({
        id: `desk-${sIndex}`,
        kind: "desk",
        group: "desk",
        x: sx,
        y: py + POD_GAP + 43,
        facing: "back",
        pose: "sit-desk",
        path: via(acc, py + POD_GAP + 52, sx, py + POD_GAP + 43),
        activity: "at the desk",
      });
      b.desks.push({
        index: sIndex,
        side: "south",
        x: dx,
        y: py + POD_GAP,
        pcX: dx + 24,
        pcY: py + POD_GAP - 6,
        chairX: dx + 24,
        chairY: py + POD_GAP + 29,
        spot: south,
        screen: { x: dx + 27, y: py + POD_GAP - 1, w: 10, h: 5 },
      });
    }
  }
  b.rooms.push({ kind: "pod", rect: r });
}

function buildMeeting(b: Builder, r: Rect, hallY: number): Rect {
  const doorX = r.x + r.w - 16;
  b.rooms.push({ kind: "meeting", rect: r, walls: "glass", doorX, doorSide: "bottom" });
  // Leave room beside the board for whoever presents a plan to you.
  const boardW = Math.max(56, Math.min(84, r.w - 62));
  const board: Rect = { x: r.x + 8, y: r.y + 4, w: boardW, h: 34 };
  b.prop("whiteboard", "whiteboard", board.x, board.y, board.y + 40, boardW);
  b.poke("whiteboard", "whiteboard", board);
  const lane = (x: number, y: number, laneY: number): Point[] => [
    { x: doorX, y: hallY, c: true },
    { x: doorX, y: r.y + r.h + 3 },
    { x: doorX, y: laneY },
    { x, y: laneY },
    { x, y },
  ];
  const boardY = r.y + 50;
  for (const [i, k] of [0.3, 0.7].entries()) {
    const x = Math.round(board.x + boardW * k);
    b.spot({ id: `board-${i}`, kind: "whiteboard", group: "meeting", x, y: boardY, facing: "back", pose: "draw", path: lane(x, boardY, boardY + 2), activity: "planning at the whiteboard" });
  }
  // Presenters stand beside the board, blueprint in hand, facing you.
  const presentY = boardY - 2;
  for (let i = 0, x = board.x + boardW + 14; i < 2 && x <= r.x + r.w - 10; i++, x += 22) {
    b.spot({ id: `present-${i}`, kind: "present", group: "present", x, y: presentY, facing: "front", pose: "stand", path: lane(x, presentY, presentY + 8), activity: "presenting a plan for your review" });
  }
  const tableX = r.x + Math.round((r.w - 68) / 2) - 6;
  if (r.h >= 150) {
    // A big planning table with seats on both sides.
    const tableY = boardY + 26;
    b.prop("meeting-table", "meeting-table", tableX, tableY, tableY + 30);
    const topY = tableY + 4;
    const bottomY = tableY + 38;
    for (const [i, dx] of [12, 34, 56].entries()) {
      const x = tableX + dx;
      b.spot({ id: `meet-t${i}`, kind: "meeting-seat", group: "meeting", x, y: topY, facing: "front", pose: "sit-front", path: lane(x, topY, tableY - 6), activity: "going through the plans" });
      b.prop(`meet-chair-t${i}`, "meeting-chair-front", x - 8, topY - 24, topY - 1);
    }
    for (const [i, dx] of [12, 34, 56].entries()) {
      const x = tableX + dx;
      b.spot({ id: `meet-${i}`, kind: "meeting-seat", group: "meeting", x, y: bottomY, facing: "back", pose: "sit-back", path: lane(x, bottomY, bottomY + 6), activity: "planning in the meeting room" });
      b.prop(`meet-chair-${i}`, "meeting-chair-back", x - 8, bottomY - 14, bottomY + 2);
    }
    if (r.h >= 180) b.prop("plan-rolls", "plan-rolls", r.x + 6, r.y + r.h - 34, r.y + r.h - 6);
  } else if (r.h >= 104) {
    const tableY = r.y + 56;
    const seatY = tableY + 38;
    b.prop("meeting-table", "meeting-table", tableX, tableY, tableY + 30);
    for (const [i, dx] of [12, 34, 56].entries()) {
      const x = tableX + dx;
      b.spot({ id: `meet-${i}`, kind: "meeting-seat", group: "meeting", x, y: seatY, facing: "back", pose: "sit-back", path: lane(x, seatY, seatY + 6), activity: "planning in the meeting room" });
      b.prop(`meet-chair-${i}`, "meeting-chair-back", x - 8, seatY - 14, seatY + 2);
    }
  }
  b.prop("meeting-glass", "glass-front", r.x, r.y + r.h - 10, r.y + r.h + 1, r.w);
  b.plant("PLANT_2", r.x + r.w - 18, r.y + 2);
  return board;
}

function buildBoss(b: Builder, r: Rect, hallY: number): Layout["boss"] {
  const doorX = r.x + 16;
  b.rooms.push({ kind: "boss", rect: r, walls: "wood", doorX, doorSide: "top" });
  const deskW = 60;
  const desk: Rect = { x: r.x + Math.round((r.w - deskW) / 2) + 8, y: r.y + Math.min(30, Math.round(r.h * 0.26)), w: deskW, h: 26 };
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
  b.prop("boss-shelf", "library-shelf", r.x + r.w - 38, r.y - 6, r.y + 24);
  b.poke("globe", "globe", { x: r.x + r.w - 38, y: r.y - 6, w: 32, h: 14 });
  b.plant("LARGE_PLANT", r.x + 2, r.y + r.h - 58);
  const dogBed = { x: r.x + r.w - 20, y: r.y + r.h - 10 };
  b.prop("dog-bed", "dog-bed", dogBed.x - 12, dogBed.y - 8, dogBed.y - 6);
  b.prop("boss-glass", "glass-front", r.x, r.y + r.h - 10, r.y + r.h + 1, r.w);
  b.prop("lamp", "lamp", r.x + 6, r.y + 4, r.y + 54);
  b.poke("lamp", "lamp", { x: r.x + 6, y: r.y + 4, w: 16, h: 52 });
  return { room: r, seat, desk, dogBed, lamp: { x: r.x + 14, y: r.y + 6 } };
}

function buildWaiting(b: Builder, r: Rect, hallY: number): void {
  b.rooms.push({ kind: "waiting", rect: r });
  const aisleX = r.x + 7;
  // A small reception stand with a bell, top right.
  const recX = r.x + r.w - 40;
  b.prop("reception", "reception", recX, r.y + 2, r.y + 20);
  b.poke("bell", "bell", { x: recX, y: r.y - 4, w: 34, h: 24 });
  const rowPitch = 38;
  const firstRow = r.y + 36;
  const pitch = 22;
  const seat = (id: string, x: number, y: number) => {
    const s = b.spot({
      id,
      kind: "review",
      group: "review",
      x,
      y,
      facing: "front",
      pose: "sit-front",
      path: [{ x: aisleX, y: hallY, c: true }, { x: aisleX, y: y - 22 }, { x, y: y - 22 }, { x, y }],
      activity: "waiting for you",
    });
    b.seats.push(s);
  };
  for (let row = 0, y = firstRow; y <= r.y + r.h - 4; row++, y += rowPitch) {
    const xMax = row === 0 ? recX - 8 : r.x + r.w - 10;
    if (row % 2 === 1) {
      // Sofa rows: two-seaters with a little table between them.
      for (let i = 0, x = r.x + 14; x + 42 <= xMax + 10; i++, x += 64) {
        b.prop(`wait-sofa-${row}-${i}`, "waiting-sofa", x, y - 19, y - 2, 42);
        seat(`wait-${row}-${i}a`, x + 11, y);
        seat(`wait-${row}-${i}b`, x + 31, y);
        if (x + 64 <= xMax + 10) b.prop(`wait-table-${row}-${i}`, "side-table", x + 44, y - 12, y - 1);
      }
      continue;
    }
    const x0 = r.x + 22 + (row % 4 === 2 ? 8 : 0);
    for (let i = 0, x = x0; x <= xMax; i++, x += pitch) {
      // Every fourth slot is a little table with magazines.
      if (i % 4 === 3) {
        b.prop(`wait-table-${row}-${i}`, "side-table", x - 8, y - 12, y - 1);
        continue;
      }
      seat(`wait-${row}-${i}`, x, y);
      b.prop(`wait-chair-${row}-${i}`, "waiting-chair", x - 8, y - 15, y - 2);
    }
  }
  b.plant("PLANT", recX - 18, r.y - 8);
  if (r.h > 90) b.plant("PLANT_2", r.x - 2, r.y + r.h - 32);
}

function buildKitchen(b: Builder, r: Rect, acc: Access): void {
  b.rooms.push({ kind: "kitchen", rect: r });
  // Counter along the top: coffee machine, kettle, sink, microwave.
  const cw = Math.min(r.w - 52, 120);
  const cx = r.x + 4;
  b.prop("kitchen-counter", "kitchen-counter", cx, r.y - 8, r.y + 18, cw);
  b.poke("coffee", "coffee", { x: cx + 4, y: r.y - 14, w: 16, h: 30 });
  b.poke("kettle", "kettle", { x: cx + 24, y: r.y - 6, w: 12, h: 20 });
  if (cw >= 100) b.poke("microwave", "microwave", { x: cx + cw - 26, y: r.y - 8, w: 22, h: 22 });
  const counterLane = r.y + 30;
  b.spot({ id: "coffee", kind: "coffee", group: "break", x: cx + 12, y: r.y + 26, facing: "back", pose: "stand", path: via(acc, counterLane, cx + 12, r.y + 26), activity: "making coffee" });
  b.spot({ id: "tea", kind: "tea", group: "break", x: cx + 30, y: r.y + 26, facing: "back", pose: "stand", path: via(acc, counterLane, cx + 30, r.y + 26), activity: "brewing tea" });
  // Fridge and vending machine on the right.
  const fx = r.x + r.w - 46;
  b.prop("fridge", "fridge", fx, r.y - 12, r.y + 22);
  b.poke("fridge", "fridge", { x: fx, y: r.y - 12, w: 20, h: 34 });
  b.spot({ id: "fridge", kind: "fridge", group: "break", x: fx + 10, y: r.y + 30, facing: "back", pose: "stand", path: via(acc, counterLane + 4, fx + 10, r.y + 30), activity: "raiding the fridge" });
  const vx = r.x + r.w - 24;
  b.prop("vending", "vending", vx, r.y - 18, r.y + 24);
  b.poke("vending", "vending", { x: vx, y: r.y - 18, w: 22, h: 42 });
  b.spot({ id: "vending", kind: "vending", group: "break", x: vx + 11, y: r.y + 34, facing: "back", pose: "stand", path: via(acc, counterLane + 6, vx + 11, r.y + 34), activity: "picking a snack" });
  // Island with snacks and stools.
  if (r.h >= 70) {
    const iw = Math.min(72, r.w - 40);
    const ix = r.x + Math.round((r.w - iw) / 2) - 6;
    const iy = r.y + 40;
    b.prop("island", "kitchen-island", ix, iy, iy + 20, iw);
    const stools = Math.max(2, Math.floor(iw / 22));
    for (let i = 0; i < stools; i++) {
      const x = ix + 12 + i * Math.floor((iw - 16) / Math.max(1, stools - 1));
      b.prop(`island-stool-${i}`, "stool", x - 5, iy + 30, iy + 38);
      b.spot({ id: `stool-${i}`, kind: "stool", group: i % 2 ? "break" : "lounge", x, y: iy + 36, facing: "back", pose: i === 1 ? "cup" : "sit-back", path: via(acc, iy + 46, x, iy + 36), activity: i === 1 ? "having a tea" : "snacking at the island" });
    }
  }
}

function buildLounge(b: Builder, r: Rect, acc: Access, wallTv: Rect | null, naps = false): { tv: Rect; screen: Rect; speakers: Rect[]; couch: Rect; fishtank: Rect } {
  b.rooms.push({ kind: "lounge", rect: r });
  let tv: Rect;
  if (wallTv) {
    tv = wallTv;
  } else {
    const tvW = Math.min(128, r.w - 70);
    tv = { x: r.x + Math.round((r.w - tvW) / 2), y: r.y + 2, w: tvW, h: Math.round(tvW * 0.56) };
  }
  const { x: tvX, y: tvY, w: tvW, h: tvH } = tv;
  const screen: Rect = { x: tvX + 4, y: tvY + 4, w: tvW - 8, h: tvH - 8 };
  b.prop("tv", "tv", tvX, tvY, wallTv ? 0 : tvY + tvH + 18, tvW);
  const speakers: Rect[] = [
    { x: tvX - 14, y: tvY + tvH - 26, w: 10, h: 26 },
    { x: tvX + tvW + 4, y: tvY + tvH - 26, w: 10, h: 26 },
  ];
  const couchW = 82;
  const couchX = r.x + Math.round((r.w - couchW) / 2);
  const couchY = wallTv ? r.y + 30 : tvY + tvH + 34;
  const couch: Rect = { x: couchX, y: couchY, w: couchW, h: 26 };
  b.prop("couch", "couch", couchX - 1, couchY - 1, couchY + 26);
  b.prop("coffee-table", "coffee-table", couchX + 22, couchY - 22, couchY - 10);
  const lane = couchY - 8;
  for (const [i, dx] of [20, 41, 62].entries()) {
    b.spot({ id: `couch-${i + 1}`, kind: "couch", group: "lounge", x: couchX + dx, y: couchY + 13, facing: "back", pose: "sit-back", path: via(acc, lane, couchX + dx, couchY + 13), activity: "watching TV" });
  }
  // Piano on the left, fish tank on the right.
  const px = r.x + 4;
  const py = couchY - 8;
  b.prop("piano", "piano", px, py, py + 30);
  b.poke("piano", "piano", { x: px, y: py, w: 30, h: 30 });
  b.spot({ id: "piano", kind: "piano", group: "lounge", x: px + 15, y: py + 40, facing: "back", pose: "play", path: via(acc, py + 46, px + 15, py + 40), activity: "playing the piano" });
  const fishtank: Rect = { x: r.x + r.w - 44, y: couchY - 14, w: 40, h: 24 };
  b.prop("fishtank-stand", "fishtank-stand", fishtank.x - 1, fishtank.y + 24, fishtank.y + 44);
  b.poke("fishtank", "fishtank", { x: fishtank.x, y: fishtank.y, w: 40, h: 44 });
  b.spot({ id: "fishtank", kind: "fishtank", group: "lounge", x: fishtank.x + 20, y: fishtank.y + 54, facing: "back", pose: "stand", path: via(acc, fishtank.y + 58, fishtank.x + 20, fishtank.y + 54), activity: "watching the fish" });
  if (r.w >= 220) b.plant("LARGE_PLANT", r.x + 34, r.y + 2);
  // No games room or library: beanbags in the lounge corners for long naps.
  const by = r.y + r.h - 8;
  if (naps && by - (fishtank.y + 58) >= 30) {
    for (const [i, bx] of [r.x + 20, r.x + r.w - 20].entries()) {
      b.prop(`beanbag-${i + 1}`, i ? "beanbag-pink" : "beanbag-blue", bx - 13, by - 10, by - 6);
      b.spot({ id: `beanbag-${i + 1}`, kind: "beanbag", group: "nap", x: bx, y: by, facing: "front", pose: "nap", path: via(acc, by + 5, bx, by), activity: "napping" });
    }
  }
  return { tv, screen, speakers, couch, fishtank };
}

function buildGames(b: Builder, r: Rect, acc: Access): { pingpong: Rect | null; arcade: Rect | null } {
  b.rooms.push({ kind: "games", rect: r });
  let pingpong: Rect | null = null;
  let arcade: Rect | null = null;
  // Dartboard on a stand at the left, throwers stand a few steps away.
  b.prop("dartboard", "dartboard", r.x + 4, r.y + 2, r.y + 34);
  b.poke("dartboard", "dartboard", { x: r.x + 4, y: r.y + 2, w: 18, h: 32 });
  b.spot({ id: "darts", kind: "darts", group: "lounge", x: r.x + 40, y: r.y + 36, facing: "left", pose: "throw", path: via(acc, r.y + 44, r.x + 40, r.y + 36), activity: "playing darts" });
  if (r.w >= 190) {
    const ppW = 74;
    pingpong = { x: r.x + Math.round((r.w - ppW) / 2) + 6, y: r.y + 14, w: ppW, h: 24 };
    b.prop("pingpong", "pingpong", pingpong.x - 1, pingpong.y - 1, pingpong.y + 24);
    b.poke("pingpong", "pingpong", pingpong);
    b.spot({ id: "pingpong-l", kind: "pingpong", group: "lounge", x: pingpong.x - 11, y: pingpong.y + 18, facing: "right", pose: "paddle", path: via(acc, pingpong.y + 28, pingpong.x - 11, pingpong.y + 18), activity: "playing ping-pong" });
    b.spot({ id: "pingpong-r", kind: "pingpong", group: "lounge", x: pingpong.x + ppW + 11, y: pingpong.y + 18, facing: "left", pose: "paddle", path: via(acc, pingpong.y + 28, pingpong.x + ppW + 11, pingpong.y + 18), activity: "playing ping-pong" });
  }
  if (r.w >= 150) {
    arcade = { x: r.x + r.w - 26, y: r.y - 4, w: 24, h: 46 };
    b.prop("arcade", "arcade", arcade.x - 1, arcade.y - 1, arcade.y + 46);
    b.poke("arcade", "arcade", arcade);
    b.spot({ id: "arcade", kind: "arcade", group: "lounge", x: arcade.x + 12, y: arcade.y + 58, facing: "back", pose: "stand", path: via(acc, arcade.y + 62, arcade.x + 12, arcade.y + 58), activity: "playing arcade games" });
  }
  if (r.h >= 70) {
    const by = r.y + r.h - 8;
    for (const [i, bx] of [r.x + 22, r.x + r.w - 22].entries()) {
      b.prop(`beanbag-${i + 1}`, i ? "beanbag-pink" : "beanbag-blue", bx - 13, by - 10, by - 6);
      b.spot({ id: `beanbag-${i + 1}`, kind: "beanbag", group: "nap", x: bx, y: by, facing: "front", pose: "nap", path: via(acc, by - 16, bx, by), activity: "napping" });
    }
  }
  return { pingpong, arcade };
}

function buildLibrary(b: Builder, r: Rect, acc: Access): void {
  b.rooms.push({ kind: "library", rect: r });
  const shelves = Math.max(1, Math.floor((r.w - 40) / 34));
  const sx = r.x + Math.floor((r.w - shelves * 34) / 2);
  for (let i = 0; i < shelves; i++) b.prop(`lib-shelf-${i}`, "library-shelf", sx + i * 34, r.y - 8, r.y + 22);
  const chairs = Math.min(3, Math.max(1, Math.floor((r.w - 20) / 60)));
  const chairY = r.y + Math.min(r.h - 6, 58);
  for (let i = 0; i < chairs; i++) {
    const cx = r.x + Math.round(((i + 0.5) * r.w) / chairs);
    b.prop(`lib-chair-${i}`, "armchair", cx - 14, chairY - 24, chairY - 8);
    b.spot({ id: `library-${i}`, kind: "armchair", group: i === chairs - 1 ? "nap" : "lounge", x: cx, y: chairY, facing: "front", pose: i === chairs - 1 ? "nap" : "read", path: via(acc, chairY + 8, cx, chairY), activity: i === chairs - 1 ? "dozing off in the library" : "reading in the library" });
  }
  if (chairs > 1) b.prop("lib-table", "library-table", r.x + Math.round(r.w / 2) - 16, chairY - 26, chairY - 10);
  b.plant("LARGE_PLANT", r.x - 4, r.y);
}

// ------------------------------------------------------------------ templates

export function buildLayout(Win: number, Hin: number, opts: LayoutOptions = {}): Layout {
  const portrait = Win < Hin * 0.82;
  return portrait ? buildPortrait(Math.max(PORTRAIT_W, Math.floor(Win)), Math.max(PORTRAIT_MIN_H, Math.floor(Hin)), opts) : buildWide(Math.max(MIN_W_WIDE, Math.floor(Win)), Math.max(MIN_H_WIDE, Math.floor(Hin)), opts);
}

function finish(
  b: Builder,
  W: number,
  H: number,
  portrait: boolean,
  segments: WallSegment[],
  net: Network,
  parts: {
    meeting: Rect;
    whiteboard: Rect;
    boss: Layout["boss"];
    waiting: Rect;
    kitchen: Rect;
    lounge: Rect;
    games: Rect | null;
    eventArea: Rect;
    tvParts: ReturnType<typeof buildLounge>;
    gamesParts: ReturnType<typeof buildGames> | null;
    doorX: number;
    lamp: Point;
    wallTv?: Rect;
  },
): Layout {
  // Wall decorations across the segments.
  const seg0 = segments[0]!;
  const pinboard: Rect = { x: 10, y: 3, w: 128, h: Math.min(53, seg0.depth - 11) };
  const calendar: Rect = { x: pinboard.x + pinboard.w + 8, y: 6, w: 20, h: 22 };
  const status: Rect = { x: calendar.x, y: 31, w: 20, h: 18 };
  const doorW = 20;
  const doorSeg = segments.find((s) => parts.doorX >= s.x0 && parts.doorX < s.x1) ?? seg0;
  const doorCx = Math.min(parts.doorX, W - doorW / 2 - 4);
  const door: Rect = { x: doorCx - doorW / 2, y: doorSeg.depth - 42, w: doorW, h: 42 };
  const legendNote: Rect = { x: door.x - 16, y: Math.max(8, door.y + 8), w: 12, h: 12 };
  const pillars = segments.slice(1).map((s) => s.x0);
  const windows: Rect[] = [];
  const paintings: Layout["wall"]["paintings"] = [];
  const busy: [number, number][] = [
    [pinboard.x - 4, status.x + status.w + 4],
    [legendNote.x - 4, door.x + door.w + 4],
  ];
  const clockSeg = segments[segments.length - 1]!;
  const clock = { x: clockSeg.x0 + 20, y: 18, r: 9 };
  busy.push([clock.x - 12, clock.x + 12]);
  if (parts.wallTv) busy.push([parts.wallTv.x - 18, parts.wallTv.x + parts.wallTv.w + 18]);
  for (const s of segments) {
    let x = s.x0 + 8;
    while (x + 40 <= s.x1 - 8) {
      const free = !busy.some(([a, z]) => x < z && x + 40 > a) && !pillars.some((p) => x < p + 6 && x + 40 > p - 6);
      if (free) {
        const h = Math.min(38, s.depth - 22);
        windows.push({ x, y: 9, w: 40, h });
        busy.push([x - 2, x + 42]);
        x += 52;
        // A painting between some windows.
        if (x + 16 < s.x1 - 8 && windows.length % 3 === 0 && !busy.some(([a, z]) => x < z && x + 16 > a)) {
          paintings.push({ sprite: windows.length % 2 ? "SMALL_PAINTING" : "SMALL_PAINTING_2", x, y: 1 });
          busy.push([x - 2, x + 18]);
          x += 24;
        }
      } else x += 6;
    }
  }
  const patrol: Point[] = [];
  for (const [i, hy] of net.halls.entries()) {
    const row = i % 2 ? [W - 12, 12] : [12, W - 12];
    for (const x of row) patrol.push({ x, y: hy, c: true });
  }
  const aisle0 = parts.doorX;
  const hall0 = net.halls[0]!;
  const entrance = { x: aisle0, y: doorSeg.depth + 2 };
  const byId = new Map(b.spots.map((s) => [s.id, s]));
  return {
    W,
    H,
    portrait,
    segments,
    net,
    rooms: b.rooms,
    pods: b.pods,
    meeting: parts.meeting,
    whiteboard: parts.whiteboard,
    boss: parts.boss,
    waiting: parts.waiting,
    kitchen: parts.kitchen,
    lounge: parts.lounge,
    games: parts.games,
    eventArea: parts.eventArea,
    tv: parts.tvParts.tv,
    tvScreen: parts.tvParts.screen,
    speakers: parts.tvParts.speakers,
    desks: b.desks,
    seats: b.seats,
    spots: b.spots,
    byId,
    props: b.props,
    plants: b.plants,
    pokeables: b.pokeables,
    entrance,
    entrancePath: [{ x: aisle0, y: hall0, c: true }, entrance],
    patrol,
    fishtank: parts.tvParts.fishtank,
    arcade: parts.gamesParts?.arcade ?? null,
    pingpong: parts.gamesParts?.pingpong ?? null,
    couch: parts.tvParts.couch,
    lamp: parts.lamp,
    wall: { pinboard, legendNote, calendar, status, door, windows, clock, pillars, paintings },
  };
}

/** Water cooler, printer and bin along the bottom edge at x. */
function utilities(b: Builder, H: number, x: number, hallY: number): void {
  b.prop("cooler", "cooler", x, H - 40, H - 5);
  b.poke("cooler", "cooler", { x, y: H - 40, w: 16, h: 36 });
  b.prop("printer", "printer", x + 22, H - 30, H - 4);
  b.poke("printer", "printer", { x: x + 22, y: H - 30, w: 30, h: 26 });
  b.prop("bin", "bin", x + 54, H - 18, H - 3);
  b.poke("bin", "bin", { x: x + 54, y: H - 18, w: 16, h: 16 });
  b.spot({ id: "cooler", kind: "cooler", group: "break", x: x + 8, y: H - 2, facing: "back", pose: "cup", path: [{ x: x + 8, y: hallY, c: true }, { x: x + 8, y: H - 2 }], activity: "chatting at the water cooler" });
}

function buildWide(W: number, H: number, opts: LayoutOptions): Layout {
  const b = new Builder();
  const threads = opts.threads ?? 8;
  const podCols = clamp(Math.floor((W * 0.33) / 48), 3, 6);
  const c1x = 6;
  const c1w = podCols * 48;
  const a12 = c1x + c1w + 8;
  const c3w = clamp(Math.round(W * 0.27), 150, 240);
  const c3x = W - 6 - c3w;
  const a23 = c3x - 8;
  const c2x = a12 + 8;
  const c2w = a23 - 8 - c2x;
  // The wall steps in and out: the TV wall in the middle is the deepest.
  const d1 = 64;
  const d2 = 88;
  const d3 = 70;
  const segments: WallSegment[] = [
    { x0: 0, x1: a12 + 14, depth: d1 },
    { x0: a12 + 14, x1: a23 - 2, depth: d2 },
    { x0: a23 - 2, x1: W, depth: d3 },
  ];
  // The hallway between the top and bottom halves; low enough for two pod
  // rows when the head count needs them.
  const wantPods = Math.ceil((threads + 3) / (2 * podCols));
  const hy = clamp(Math.max(Math.round(H * 0.56), wantPods >= 2 ? d1 + 2 * POD_H + 10 : 0), d1 + POD_H + 10, H - 110);
  const net: Network = { halls: [hy], aisles: [a12, a23] };
  const leftAcc: Access = { hallY: hy, aisleX: a12 };

  // Left column: pods above the hallway; kitchen (+ pods or games) below.
  buildPods(b, { x: c1x, y: d1, w: c1w, h: hy - 8 - d1 }, leftAcc);
  let below: Rect = { x: c1x, y: hy + 10, w: c1w, h: H - 6 - (hy + 10) };
  const kitchenH = clamp(below.h, 64, 92);
  const kitchen: Rect = { x: c1x, y: below.y + 8, w: c1w, h: kitchenH - 8 };
  buildKitchen(b, kitchen, leftAcc);
  below = { ...below, y: below.y + kitchenH + 8, h: below.h - kitchenH - 8 };
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  if (below.h >= POD_H && wantPods > b.pods.length) {
    buildPods(b, { ...below, h: POD_H }, leftAcc);
    below = { ...below, y: below.y + POD_H + 6, h: below.h - POD_H - 6 };
  }
  if (below.h >= 104) {
    games = { ...below, y: below.y + 6, h: below.h - 46 };
    gamesParts = buildGames(b, games, leftAcc);
  }
  const utilitiesAt = below.h >= 40 ? c1x + 4 : null;

  // Center: the lounge under the big wall TV, the waiting room below.
  const tvW = Math.min(c2w - 50, 144);
  const tvH = Math.min(Math.round(tvW * 0.56), d2 - 14);
  const wallTv: Rect = { x: c2x + Math.round((c2w - tvW) / 2), y: d2 - tvH - 6, w: tvW, h: tvH };
  const lounge: Rect = { x: c2x, y: d2, w: c2w, h: hy - 8 - d2 };
  const tvParts = buildLounge(b, lounge, { hallY: hy, aisleX: a23 }, wallTv, games === null);
  const waiting: Rect = { x: c2x, y: hy + 12, w: c2w, h: H - 6 - (hy + 12) };
  buildWaiting(b, waiting, hy);

  // Right: the glass meeting room on top, your office below.
  const meeting: Rect = { x: c3x, y: d3, w: c3w, h: hy - 8 - d3 };
  const whiteboard = buildMeeting(b, meeting, hy);
  const bossRoom: Rect = { x: c3x, y: hy + 12, w: c3w, h: clamp(H - 10 - (hy + 12), 96, 190) };
  const boss = buildBoss(b, bossRoom, hy);

  if (utilitiesAt !== null) utilities(b, H, utilitiesAt, hy);
  const lamp = boss.lamp;
  const couch = tvParts.couch;
  const loungeFree = lounge.y + lounge.h - (couch.y + couch.h + 6);
  const eventArea = games ?? { x: lounge.x + 16, y: couch.y + couch.h + 4, w: lounge.w - 32, h: Math.max(26, loungeFree) };
  b.plant("PLANT_2", a23 - 8, hy - 34);
  return finish(b, W, H, false, segments, net, {
    meeting,
    whiteboard,
    boss,
    waiting,
    kitchen,
    lounge,
    games,
    eventArea,
    tvParts,
    gamesParts,
    doorX: a12,
    lamp,
    wallTv,
  });
}

function buildPortrait(W: number, H: number, opts: LayoutOptions): Layout {
  const b = new Builder();
  const threads = opts.threads ?? 8;
  const aisleX = W - 8;
  const innerW = W - 20;
  const x0 = 6;
  const segments: WallSegment[] = [
    { x0: 0, x1: Math.round(W * 0.42), depth: 64 },
    { x0: Math.round(W * 0.42), x1: Math.round(W * 0.7), depth: 54 },
    { x0: Math.round(W * 0.7), x1: W, depth: 70 },
  ];
  const top = 70;
  const gap = 16; // hallway rows between room rows
  // Rows: [name, min height, grow weight]
  type Row = { kind: "podA" | "kitchenMeeting" | "lounge" | "podB" | "games" | "waitingBoss" | "library"; min: number; grow: number };
  const podCols = Math.max(2, Math.floor(innerW / 48));
  const rows: Row[] = [
    { kind: "podA", min: POD_H, grow: 0 },
    { kind: "kitchenMeeting", min: 112, grow: 1 },
    { kind: "lounge", min: 136, grow: 1 },
    { kind: "waitingBoss", min: 136, grow: 1.5 },
  ];
  const optional: Row[] = [
    { kind: "podB", min: POD_H, grow: 0 },
    { kind: "games", min: 86, grow: 0.5 },
    { kind: "library", min: 86, grow: 0.3 },
  ];
  const needPods = Math.ceil((threads + 3) / (2 * podCols));
  const used = () => rows.reduce((s, r) => s + r.min, 0) + gap * rows.length;
  for (const o of optional) {
    if (o.kind === "podB" && needPods < 2 && H - top - used() < o.min + gap + 220) continue;
    if (top + used() + o.min + gap <= H - 6) rows.splice(rows.length - 1, 0, o);
  }
  const extra = Math.max(0, H - 6 - top - used());
  const growSum = rows.reduce((s, r) => s + r.grow, 0) || 1;
  const halls: number[] = [];
  let y = top;
  let kitchen: Rect | null = null;
  let lounge: Rect | null = null;
  let meeting: Rect | null = null;
  let whiteboard: Rect | null = null;
  let waiting: Rect | null = null;
  let boss: Layout["boss"] | null = null;
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  let tvParts: ReturnType<typeof buildLounge> | null = null;
  const plan: { row: Row; rect: Rect; hallY: number }[] = [];
  for (const row of rows) {
    const h = row.min + Math.floor((extra * row.grow) / growSum);
    const rect: Rect = { x: x0, y, w: innerW, h };
    // Rows above the last open onto the hallway below; the last onto the one above.
    const hallY = row.kind === "waitingBoss" ? y - gap / 2 : y + h + gap / 2;
    plan.push({ row, rect, hallY });
    if (row.kind !== "waitingBoss") halls.push(y + h + gap / 2);
    y += h + gap;
  }
  const net: Network = { halls: [...new Set(halls)], aisles: [aisleX] };
  for (const { row, rect, hallY } of plan) {
    const acc: Access = { hallY, aisleX };
    switch (row.kind) {
      case "podA":
      case "podB":
        buildPods(b, { ...rect, h: Math.min(rect.h, POD_H) }, acc);
        break;
      case "kitchenMeeting": {
        const kw = Math.round(rect.w * 0.54);
        kitchen = { x: rect.x, y: rect.y, w: kw - 6, h: rect.h };
        buildKitchen(b, { ...kitchen, y: kitchen.y + 10, h: kitchen.h - 10 }, acc);
        meeting = { x: rect.x + kw + 4, y: rect.y, w: rect.w - kw - 4, h: rect.h - 4 };
        whiteboard = buildMeeting(b, meeting, hallY);
        break;
      }
      case "lounge":
        lounge = rect;
        tvParts = buildLounge(b, rect, acc, null, !rows.some((r) => r.kind === "games" || r.kind === "library"));
        break;
      case "games":
        games = rect;
        gamesParts = buildGames(b, { ...rect, y: rect.y + 6, h: rect.h - 6 }, acc);
        break;
      case "library":
        buildLibrary(b, { ...rect, y: rect.y + 8, h: rect.h - 8 }, acc);
        break;
      case "waitingBoss": {
        const ww = Math.round(rect.w * 0.56);
        waiting = { x: rect.x, y: rect.y + 4, w: ww - 4, h: rect.h - 44 };
        buildWaiting(b, waiting, hallY);
        const bossRoom: Rect = { x: rect.x + ww + 4, y: rect.y + 4, w: rect.w - ww - 4, h: Math.min(rect.h - 8, H - 4 - (rect.y + 4)) };
        boss = buildBoss(b, bossRoom, hallY);
        break;
      }
    }
  }
  utilities(b, H, x0 + 2, net.halls[net.halls.length - 1]!);
  const lamp = boss!.lamp;
  const eventArea = games ?? { x: lounge!.x + 10, y: tvParts!.couch.y + 30, w: lounge!.w - 20, h: Math.max(30, lounge!.y + lounge!.h - tvParts!.couch.y - 30) };
  return finish(b, W, H, true, segments, net, {
    meeting: meeting!,
    whiteboard: whiteboard!,
    boss: boss!,
    waiting: waiting!,
    kitchen: kitchen!,
    lounge: lounge!,
    games,
    eventArea,
    tvParts: tvParts!,
    gamesParts,
    doorX: aisleX,
    lamp,
  });
}

/** Spots around the event area for an office event. */
export function eventSpots(area: Rect, net: Network, count: number, layoutKind: "circle" | "rows"): Spot[] {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const hall = net.halls.reduce((best, y) => (Math.abs(y - cy) < Math.abs(best - cy) ? y : best), net.halls[0]!);
  const out: Spot[] = [];
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    if (layoutKind === "circle") {
      const a = (i / count) * Math.PI * 2 + 0.4;
      x = Math.round(cx + Math.cos(a) * Math.min(area.w / 2 - 10, 46));
      y = Math.round(cy + 8 + Math.sin(a) * Math.min(area.h / 2 - 6, 18));
    } else {
      x = Math.round(area.x + 16 + (i % 6) * Math.min(26, (area.w - 32) / 5));
      y = Math.round(area.y + area.h - 6 - Math.floor(i / 6) * 22);
    }
    out.push({
      id: `event-${i}`,
      kind: "event",
      group: "event",
      x,
      y,
      facing: x < cx ? "right" : "left",
      pose: "stand",
      path: [{ x, y: hall, c: true }, { x, y }],
      activity: "at the office event",
    });
  }
  return out;
}
