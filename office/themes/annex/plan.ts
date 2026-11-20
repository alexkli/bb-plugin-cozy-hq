// Dusty Annex: the floor plan. A narrow, run-down building squeezed in
// between a neighbour's brick wall, the street and a back yard full of bins:
// corridors of scuffed lino with rooms crammed off them behind mismatched
// partitions, short flights of creaky stairs where the floors don't quite
// line up, a storeroom in every leftover corner, only as many desks as there
// are people (shoved against the filing cabinets), the comms cupboard tucked
// away at the back, the old meeting hall in the middle for office dos, and
// your office at the far end. Pure geometry (no canvas): the layout tests run
// it in Node.

import type { Layout, PropPlacement, Rect } from "../../layout.ts";
import {
  arcadeFromAbove,
  Builder,
  buildBoss,
  buildGames,
  buildKitchen,
  buildLibrary,
  buildLounge,
  buildMeeting,
  buildPods,
  buildServerRoom,
  clamp,
  finish,
  hash,
  utilities,
  POD_H,
  type Access,
  type Network,
  type Point,
  type Spot,
  type WallSegment,
} from "../../themekit.ts";
import { stageOf } from "./fixtures.ts";
import { learnWalkways, walkwaysOf } from "../../walkways.ts";

export type CellKind = "pen" | "break" | "kitchen" | "storage" | "hall" | "waiting" | "games" | "archive" | "nook" | "walled" | "junk";

/** The building inside the panel; the rest is the neighbour's wall (left), the street (right) and the back yard (below). */
export interface Site {
  x: number;
  w: number;
  h: number;
}

/** A room as the building has it: its floor area and which sides get a partition. */
export interface Cell {
  kind: CellKind;
  r: Rect;
  /** Sides with a partition (top, bottom, left, right). */
  sides: { t: boolean; b: boolean; l: boolean; r: boolean };
}

export interface AnnexPlan {
  annex: true;
  site: Site;
  cells: Cell[];
  /** Aisle stretches between two hallways: drawn as flights of creaky stairs. */
  flights: Rect[];
  /** Where people walk besides the spots' own paths (the gags, the technician): partitions open there too. */
  extra: Point[][];
}

/** The plan stashed on an Annex layout (null on any other). */
export function planOf(L: Layout): AnnexPlan | null {
  const d = L.themeData as Partial<AnnexPlan> | undefined;
  return d && d.annex === true ? (d as AnnexPlan) : null;
}

/** The building inside the panel (the whole panel for layouts that aren't ours). */
export function siteOf(L: Layout): Site {
  return planOf(L)?.site ?? { x: 0, w: L.W, h: L.H };
}

/** Whether a rect of floor lies on (or just by) a way people walk: what gets left about keeps off them. */
export function onAWay(L: Layout, r: Rect, extra: Point[][] = []): boolean {
  if (!walkwaysOf(L.net)) learnWalkways(L);
  const near = (p: Point, q: Point) =>
    r.x < Math.max(p.x, q.x) + 8 && r.x + r.w > Math.min(p.x, q.x) - 8 && r.y < Math.max(p.y, q.y) + 4 && r.y + r.h > Math.min(p.y, q.y) - 8;
  if (extra.some((path) => path.some((p, i) => i + 1 < path.length && near(p, path[i + 1]!)))) return true;
  return (walkwaysOf(L.net) ?? []).some((s) => near(s.a, s.b));
}

const ALL = { t: true, b: true, l: true, r: true };
const HALF = 10; // corridors are 20 px wide

/** Rows of mismatched chairs facing you, a battered counter with the bell: the corridor where people wait. */
/** Rows of odd chairs, only as many as people who might be waiting; the rest of the room fills up with junk. */
function buildChairRows(b: Builder, r: Rect, hallY: number, seats: number): void {
  b.rooms.push({ kind: "waiting", rect: r });
  const aisleX = r.x + 8;
  const hasDesk = r.w >= 100;
  const deskX = r.x + r.w - 40;
  if (hasDesk) {
    b.prop("reception", "reception", deskX, r.y + 2, r.y + 20);
    b.poke("bell", "bell", { x: deskX, y: r.y - 4, w: 34, h: 24 });
  }
  const rows: Spot[][] = [];
  let left = Math.max(3, seats);
  for (let row = 0, y = r.y + 38; y <= r.y + r.h - 4 && left > 0; row++, y += 30) {
    const list: Spot[] = [];
    const xEnd = row === 0 && hasDesk ? deskX - 12 : r.x + r.w - 12;
    for (let i = 0, x = r.x + 26; x <= xEnd && left > 0; i++, x += 20, left--) {
      const laneY = y - 22;
      list.push({
        id: `wait-${row}-${i}`,
        kind: "review",
        group: "review",
        x,
        y,
        facing: "front",
        pose: "sit-front",
        path: [{ x: aisleX, y: hallY, c: true }, { x: aisleX, y: laneY }, { x, y: laneY }, { x, y }],
        activity: "waiting for you",
        lift: 2,
      });
      b.prop(`wait-chair-${row}-${i}`, "waiting-chair", x - 8, y - 15, y - 2);
    }
    rows.push(list);
  }
  const order = rows.flat();
  for (const s of order) b.spot(s);
  b.seats.push(...order);
  if (r.h >= 70 && rows.length * 30 + 70 > r.h) b.plant("PLANT_2", r.x + r.w - 18, r.y + r.h - 32);
}

/** Where the shock gag sends people (mirrors the office's own choice), so the cupboard's partition opens there. */
function serverWay(net: Network, server: Rect | null, cooler: Spot | undefined): Point[] | null {
  if (!server) return null;
  const sy = server.y + server.h - 3;
  const cx = server.x + server.w / 2;
  const outside = (x: number) => x < server.x - 2 || x > server.x + server.w + 2;
  const ways: Point[] = [];
  for (const ax of net.aisles) if (outside(ax)) for (const hy of net.halls) ways.push({ x: ax, y: hy });
  if (cooler && outside(cooler.x)) ways.push({ x: cooler.x, y: cooler.path[0]!.y });
  if (ways.length === 0) return null;
  const cost = (p: Point) => Math.abs(p.x - cx) + Math.abs(p.y - sy) * 0.6;
  const way = ways.reduce((a, p) => (cost(p) < cost(a) ? p : a));
  const x = way.x < server.x ? server.x + 14 : server.x + server.w - 14;
  return [{ x: way.x, y: way.y }, { x: way.x, y: sy }, { x, y: sy }];
}

function extras(L: Layout): Point[][] {
  const out: Point[][] = [];
  const cooler = L.byId.get("cooler");
  const way = serverWay(L.net, L.server, cooler);
  if (way) out.push(way);
  if (cooler) out.push([{ x: cooler.x + 29, y: cooler.path[0]!.y }, { x: cooler.x + 29, y: cooler.y }]);
  out.push(L.entrancePath);
  return out;
}

/** The aisle stretches between consecutive hallways, as stair flights. */
function flightsOf(net: Network): Rect[] {
  const halls = [...net.halls].sort((a, b) => a - b);
  const out: Rect[] = [];
  for (const x of net.aisles) {
    for (let i = 0; i + 1 < halls.length; i++) {
      const y0 = halls[i]! + HALF;
      const y1 = halls[i + 1]! - HALF;
      if (y1 - y0 >= 24) out.push({ x: x - HALF + 1, y: y0, w: HALF * 2 - 2, h: y1 - y0 });
    }
  }
  return out;
}

function done(L: Layout, cells: Cell[], site: Site): Layout {
  const plan: AnnexPlan = { annex: true, site, cells, flights: flightsOf(L.net), extra: [] };
  L.themeData = plan;
  plan.extra = extras(L);
  L.walls = wallsOf(plan);
  // Events happen in the old hall only when the plan has one.
  const e = L.eventArea;
  const ex = e.x + e.w / 2;
  const ey = e.y + e.h / 2;
  if (cells.some((c) => c.kind === "hall" && ex >= c.r.x && ex <= c.r.x + c.r.w && ey >= c.r.y && ey <= c.r.y + c.r.h)) L.words = { "in the lounge": "in the old hall" };
  return L;
}

/**
 * What nobody cuts across: the building's own walls (the street and the yard
 * are outside), every partition, the storerooms and junk corners (crammed with
 * boxes and cabinets), the banisters of the stair flights, and the old hall's
 * stage and tea urn. The rest of the clutter keeps off the ways across (live.ts).
 */
function wallsOf(plan: AnnexPlan): Rect[] {
  const s = plan.site;
  const out: Rect[] = [
    { x: s.x - 1, y: 0, w: 6, h: s.h },
    { x: s.x + s.w - 5, y: 0, w: 6, h: s.h },
    { x: s.x, y: s.h - 5, w: s.w, h: 6 },
  ];
  for (const c of plan.cells) {
    const r = c.r;
    if (c.kind === "storage" || c.kind === "junk") out.push(r);
    if (c.sides.t) out.push({ x: r.x, y: r.y - 2, w: r.w, h: 6 });
    if (c.sides.b) out.push({ x: r.x, y: r.y + r.h - 1, w: r.w, h: 8 });
    if (c.sides.l) out.push({ x: r.x - 1, y: r.y, w: 4, h: r.h + 4 });
    if (c.sides.r) out.push({ x: r.x + r.w - 3, y: r.y, w: 4, h: r.h + 4 });
    if (c.kind === "hall") {
      const st = stageOf(c);
      if (st) out.push({ x: st.x - 3, y: st.y, w: st.w + 3, h: st.h + 3 });
      if (r.h >= 40) out.push({ x: r.x + 5, y: r.y + 6, w: 18, h: 24 });
    }
  }
  for (const f of plan.flights) out.push(f);
  return out;
}

/**
 * One row of desk pairs, only as many as are still needed, shoved up against
 * the aisle (on the right); the rest of the row is a corner of filing
 * cabinets and junk. Returns how many desks it made.
 */
function deskRow(b: Builder, cells: Cell[], r: Rect, acc: Access, need: number): number {
  const cols = Math.max(1, Math.floor(r.w / 48));
  const use = clamp(Math.ceil(need / 2), 1, cols);
  const x = r.x + r.w - use * 48;
  buildPods(b, { x, y: r.y, w: use * 48, h: POD_H }, acc);
  if (x - 4 - r.x >= 24) cells.push({ kind: "junk", r: { x: r.x, y: r.y + 6, w: x - 4 - r.x, h: POD_H - 12 }, sides: { t: false, b: false, l: false, r: false } });
  return use * 2;
}

/** Desks for everyone, and no more (a few threads don't sit in a sea of empty desks). */
const desksFor = (threads: number) => Math.max(6, threads);
/** Chairs in the waiting room: a few, not a lecture hall. */
const seatsFor = (threads: number) => clamp(Math.ceil(threads / 3) + 2, 6, 14);

/**
 * Move the wall fixtures the classic finish put at the panel's left edge to
 * the building's, then hang the windows, prints and plants again around them.
 */
function refit(L: Layout, site: Site, W: number, H: number): void {
  const w = L.wall;
  for (const r of [w.pinboard, w.calendar, w.status]) r.x += site.x;
  const busy: [number, number][] = [
    [w.pinboard.x - 4, w.status.x + w.status.w + 4],
    [w.legendNote.x - 4, w.door.x + w.door.w + 4],
    [w.clock.x - 12, w.clock.x + 12],
  ];
  const tv = L.props.find((p) => p.kind === "tv");
  if (tv && tv.z === 0) busy.push([L.tv.x - 18, L.tv.x + L.tv.w + 18]);
  w.windows = [];
  w.paintings = [];
  for (const s of L.segments) {
    let x = s.x0 + 8;
    while (x + 40 <= s.x1 - 8) {
      const free = !busy.some(([a, z]) => x < z && x + 40 > a) && !w.pillars.some((p) => x < p + 6 && x + 40 > p - 6);
      if (!free) {
        x += 6;
        continue;
      }
      w.windows.push({ x, y: 9, w: 40, h: Math.min(38, s.depth - 22) });
      busy.push([x - 2, x + 42]);
      x += 52;
      if (x + 16 < s.x1 - 8 && w.windows.length % 3 === 0 && !busy.some(([a, z]) => x < z && x + 16 > a)) {
        w.paintings.push({ sprite: w.windows.length % 2 ? "SMALL_PAINTING" : "SMALL_PAINTING_2", x, y: 1 });
        busy.push([x - 2, x + 18]);
        x += 24;
      }
    }
  }
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
  let hanging = 0;
  for (const s of L.segments) {
    for (let x = s.x0 + 10; x + 16 <= s.x1 - 10 && hanging < 5; x += 4) {
      if (busy.some(([a, z]) => x < z + 2 && x + 16 > a - 2) || w.pillars.some((p) => x < p + 8 && x + 16 > p - 8)) continue;
      L.plants.push({ sprite: "HANGING_PLANT", x, y: 0, z: 1 });
      busy.push([x, x + 16]);
      hanging++;
      x += 40;
    }
  }
  // The guard and the cleaner do their rounds inside the building, not out in the street.
  const x0 = site.x + 12;
  const x1 = site.x + site.w - 12;
  L.patrol = L.net.halls.flatMap((hy, i) => (i % 2 ? [x1, x0] : [x0, x1]).map((x) => ({ x, y: hy, c: true })));
  L.W = W;
  L.H = H;
}

/** A storeroom in a leftover corner (no spots: boxes and dead kit, drawn as decor). */
function storage(cells: Cell[], r: Rect, sides = ALL): void {
  if (r.w >= 30 && r.h >= 26) cells.push({ kind: "storage", r, sides });
}

// ------------------------------------------------------------------ wide panels

/**
 * Wide panels: a building squeezed in between the neighbour's wall (left),
 * the street (right) and the back yard (below). On big panels it still fills
 * most of the width, so the office's own wanderings stay indoors.
 */
function wideSite(W: number, H: number): Site {
  // Short panels have no yard and need the width for the lounge's arcade.
  const w = clamp(W - (H >= 400 ? 84 : 56), Math.min(W - 40, 560), Math.max(740, Math.ceil(W * 0.78)));
  const yard = H >= 400 ? clamp(Math.round(H * 0.1), 32, 72) : H >= 340 ? 26 : 0;
  return { x: Math.round((W - w) * 0.35), w, h: H - yard };
}

function wide(PW: number, PH: number, threads: number): Layout {
  const site = wideSite(PW, PH);
  const ox = site.x;
  // Inside the building: W is its right wall, H its bottom wall.
  const W = ox + site.w;
  const H = site.h;
  const b = new Builder();
  const cells: Cell[] = [];
  const podCols = clamp(Math.floor((site.w * 0.36) / 48), 3, 5);
  const c1x = ox + 6;
  const c1w = podCols * 48;
  const a12 = c1x + c1w + HALF;
  const c3w = clamp(Math.round(site.w * 0.27), 150, 200);
  const c3x = W - 6 - c3w;
  const a23 = c3x - HALF;
  const c2x = a12 + HALF;
  const c2w = a23 - HALF - c2x;
  const d1 = 64;
  const d2 = 88;
  const d3 = 70;
  const segments: WallSegment[] = [
    { x0: ox, x1: a12 + 14, depth: d1 },
    { x0: a12 + 14, x1: a23 - 2, depth: d2 },
    { x0: a23 - 2, x1: W, depth: d3 },
  ];
  let need = desksFor(threads);
  const wantRows = Math.ceil(need / (2 * podCols));
  // Two corridors when the building is tall enough, one when it isn't.
  const twoFloors = H >= 420;
  const topRows = twoFloors && wantRows >= 3 && H >= 560 ? 2 : !twoFloors && wantRows >= 2 && H >= 360 ? 2 : 1;
  const h1 = twoFloors ? Math.max(d1 + topRows * POD_H + HALF, 178) : clamp(Math.max(Math.round(H * 0.56), topRows >= 2 ? d1 + 2 * POD_H + HALF : 0), d1 + POD_H + HALF, H - 110);
  const bottomH = twoFloors ? clamp(Math.round((H - h1) * 0.42), 100, 200) : 0;
  const h2 = twoFloors ? H - 6 - bottomH - HALF : h1;
  const net: Network = { halls: twoFloors ? [h1, h2] : [h1], aisles: [a12, a23] };
  const topAcc: Access = { hallY: h1, aisleX: a12 };

  // ---- top floor: the pen, the break room under the telly, the kitchenette
  cells.push({ kind: "pen", r: { x: c1x - 2, y: d1, w: c1w + 4, h: h1 - HALF - d1 }, sides: { t: false, b: true, l: false, r: true } });
  for (let row = 0; row * POD_H + POD_H <= h1 - 8 - d1 + 8; row++) {
    const y = d1 + row * POD_H;
    if (need > 0) need -= deskRow(b, cells, { x: c1x, y, w: c1w, h: POD_H }, topAcc, need);
    else cells.push({ kind: "junk", r: { x: c1x, y: y + 6, w: c1w, h: POD_H - 12 }, sides: { t: false, b: false, l: false, r: false } });
  }

  const tvW = Math.min(c2w - 50, 144);
  const tvH = Math.min(Math.round(tvW * 0.56), d2 - 14);
  const wallTv: Rect = { x: c2x + Math.round((c2w - tvW) / 2), y: d2 - tvH - 6, w: tvW, h: tvH };
  const lounge: Rect = { x: c2x, y: d2, w: c2w, h: h1 - 8 - d2 };
  const centerAcc: Access = { hallY: h1, aisleX: a23 };
  cells.push({ kind: "break", r: { x: c2x, y: d2, w: c2w, h: h1 - HALF - d2 }, sides: { t: false, b: true, l: true, r: true } });

  // Right of the top floor: the kitchenette (a closet when there's width to spare).
  let meeting: Rect;
  let whiteboard: Rect;
  let kitchen: Rect;
  let eventArea: Rect;
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  let waiting: Rect;
  let boss: Layout["boss"];
  let tvParts: ReturnType<typeof buildLounge>;

  if (twoFloors) {
    // A poky kitchenette; under two rows of desks there's a storeroom below it.
    const kw = Math.min(c3w, 176);
    const kh = h1 - 8 - (d3 + 26) > 160 ? 118 : h1 - 8 - (d3 + 26);
    kitchen = { x: c3x, y: d3 + 26, w: kw, h: kh };
    buildKitchen(b, kitchen, { hallY: h1, aisleX: a23 });
    const kb = kitchen.y + kh + 4;
    const under = h1 - HALF - kb >= 34;
    cells.push({ kind: "kitchen", r: { x: c3x, y: d3, w: kw, h: (under ? kb : h1 - HALF) - d3 }, sides: { t: false, b: true, l: true, r: c3w - kw >= 30 } });
    if (under) storage(cells, { x: c3x, y: kb + 2, w: kw, h: h1 - HALF - kb - 2 }, { t: false, b: true, l: true, r: false });
    storage(cells, { x: c3x + kw, y: d3, w: c3w - kw, h: h1 - HALF - d3 }, { t: false, b: true, l: false, r: false });

    // ---- the middle floor: more desks or the rec room, the old hall, the fishbowl
    const midY = h1 + HALF;
    const midH = h2 - HALF - midY;
    const midAcc: Access = { hallY: h1, aisleX: a12 };
    let left: Rect = { x: c1x, y: midY, w: c1w, h: midH };
    while (need > 0 && left.h >= POD_H + 2) {
      cells.push({ kind: "pen", r: { x: c1x - 2, y: left.y, w: c1w + 4, h: POD_H + 2 }, sides: { t: true, b: true, l: false, r: true } });
      need -= deskRow(b, cells, { ...left, y: left.y + 2, h: POD_H }, midAcc, need);
      left = { ...left, y: left.y + POD_H + 4, h: left.h - POD_H - 4 };
    }
    if (left.h >= 104 && c1w >= 150) {
      games = { ...left, y: left.y + 6, h: Math.min(150, left.h - 6) };
      gamesParts = buildGames(b, games, midAcc);
      cells.push({ kind: "games", r: { ...left, h: games.y + games.h - left.y }, sides: { t: true, b: true, l: false, r: true } });
      left = { ...left, y: games.y + games.h + 2, h: left.y + left.h - (games.y + games.h + 2) };
    }
    if (left.h >= 96) {
      const lib = { ...left, y: left.y + 14, h: Math.min(120, left.h - 14) };
      buildLibrary(b, lib, { hallY: h2, aisleX: a12 });
      cells.push({ kind: "archive", r: { ...left, h: lib.y + lib.h - left.y }, sides: { t: true, b: true, l: false, r: true } });
      left = { ...left, y: lib.y + lib.h + 2, h: left.y + left.h - (lib.y + lib.h + 2) };
    }
    storage(cells, left, { t: true, b: true, l: false, r: true });

    // The old meeting hall: the one open room, for office dos.
    // Chairs stacked down one side, a little stage at the other end (when it's wide enough),
    // and the arcade cabinet by the stage when there's no games room.
    const stage = c2w >= 160 && midH >= 70 ? 44 : 10;
    const cabinet = midH >= 76 && c2w - 28 - stage - 34 >= 60 ? arcadeFromAbove(b, c2x + c2w - stage - 30, midY, h1) : null;
    eventArea = { x: c2x + 28, y: midY + 10, w: c2w - 28 - stage - (cabinet ? 34 : 0), h: midH - 20 };
    cells.push({ kind: "hall", r: { x: c2x, y: midY, w: c2w, h: midH }, sides: { t: false, b: false, l: true, r: true } });

    // The fishbowl sits on the lower corridor (its door opens onto it); a storeroom over it if it's tall.
    const mh = Math.min(midH, 200);
    if (midH - mh >= 30) storage(cells, { x: c3x, y: midY, w: c3w, h: midH - mh - 8 }, { t: true, b: true, l: true, r: false });
    meeting = { x: c3x, y: midY + midH - mh, w: c3w, h: mh };
    whiteboard = buildMeeting(b, meeting, h2);
    cells.push({ kind: "walled", r: meeting, sides: { t: false, b: false, l: false, r: false } });

    // ---- the ground floor: the back passage with the dripping tap, the comms
    // cupboard, the waiting corridor, and your office at the far end
    const lowY = h2 + HALF;
    const lowH = H - 4 - lowY;
    const nookW = 76;
    utilities(b, H, c1x + 2, h2);
    cells.push({ kind: "nook", r: { x: c1x - 2, y: lowY, w: nookW + 2, h: H - lowY }, sides: { t: false, b: false, l: false, r: true } });
    const sw = c1w - nookW - 4;
    const sh = Math.min(56, lowH - 4);
    const server: Rect = { x: c1x + nookW + 4, y: H - 6 - sh, w: sw, h: sh };
    if (sw >= 60 && sh >= 34) {
      buildServerRoom(b, server);
      cells.push({ kind: "walled", r: server, sides: { t: false, b: false, l: false, r: false } });
      storage(cells, { x: server.x - 2, y: lowY, w: sw + 4, h: server.y - 10 - lowY }, { t: false, b: true, l: true, r: true });
    } else storage(cells, { x: c1x + nookW, y: lowY, w: c1w - nookW, h: lowH }, { t: false, b: false, l: true, r: true });

    waiting = { x: c2x, y: lowY + 2, w: c2w, h: lowH - 4 };
    buildChairRows(b, waiting, h2, seatsFor(threads));
    cells.push({ kind: "waiting", r: { x: c2x, y: lowY, w: c2w, h: H - lowY }, sides: { t: true, b: false, l: true, r: true } });

    const bossRoom: Rect = { x: c3x, y: lowY + 2, w: c3w, h: clamp(lowH - 4, 96, 230) };
    boss = buildBoss(b, bossRoom, h2);
    cells.push({ kind: "walled", r: bossRoom, sides: { t: false, b: false, l: false, r: false } });
    if (H - 6 - (bossRoom.y + bossRoom.h) >= 30) storage(cells, { x: c3x, y: bossRoom.y + bossRoom.h + 8, w: c3w, h: H - 4 - (bossRoom.y + bossRoom.h + 8) }, { t: true, b: false, l: true, r: false });

    tvParts = buildLounge(b, lounge, centerAcc, wallTv, games === null);
  } else {
    // One corridor: the fishbowl top right; the kitchenette closet, the
    // cupboard, the waiting corridor and your office below.
    const topH = h1 - 8 - d3;
    meeting = { x: c3x, y: d3, w: c3w, h: topH };
    whiteboard = buildMeeting(b, meeting, h1);
    cells.push({ kind: "walled", r: meeting, sides: { t: false, b: false, l: false, r: false } });

    const lowY = h1 + HALF;
    const lowH = H - 4 - lowY;
    // The kitchenette is reached down a narrow gap beside the cupboard.
    const serverW = c1w >= 200 ? 76 : 66;
    const kw = c1w - serverW - 12;
    kitchen = { x: c1x, y: lowY + 26, w: kw, h: Math.min(92, H - 6 - (lowY + 26)) };
    buildKitchen(b, kitchen, { hallY: h1, aisleX: c1x + kw + 6 });
    cells.push({ kind: "kitchen", r: { x: c1x - 2, y: lowY, w: kw + 2, h: kitchen.y + kitchen.h - lowY }, sides: { t: true, b: kitchen.y + kitchen.h < H - 12, l: false, r: true } });
    if (kitchen.y + kitchen.h + 30 <= H - 4) storage(cells, { x: c1x - 2, y: kitchen.y + kitchen.h + 2, w: kw + 2, h: H - 4 - (kitchen.y + kitchen.h + 2) }, { t: true, b: false, l: false, r: true });
    const sh = Math.min(56, lowH - 4);
    const server: Rect = { x: c1x + kw + 12, y: H - 6 - sh, w: serverW - 2, h: sh };
    buildServerRoom(b, server);
    cells.push({ kind: "walled", r: server, sides: { t: false, b: false, l: false, r: false } });
    storage(cells, { x: server.x - 2, y: lowY, w: server.w + 4, h: server.y - 10 - lowY }, { t: true, b: true, l: true, r: false });

    // The waiting chairs on the left of the lower middle, the old hall on the right.
    const splitHall = c2w >= 190 && lowH >= 70;
    const ww = splitHall ? Math.max(104, Math.round(c2w * 0.52)) : c2w;
    waiting = { x: c2x, y: lowY + 2, w: ww, h: lowH - 4 };
    buildChairRows(b, waiting, h1, seatsFor(threads));
    cells.push({ kind: "waiting", r: { x: c2x, y: lowY, w: ww, h: H - lowY }, sides: { t: true, b: false, l: true, r: !splitHall } });
    if (splitHall) {
      const hx = c2x + ww + 6;
      eventArea = { x: hx + 6, y: lowY + 6, w: c2x + c2w - hx - 12, h: lowH - 10 };
      cells.push({ kind: "hall", r: { x: hx, y: lowY, w: c2x + c2w - hx, h: H - lowY }, sides: { t: false, b: false, l: true, r: true } });
    } else eventArea = { x: 0, y: 0, w: 0, h: 0 };

    const bossRoom: Rect = { x: c3x, y: lowY + 2, w: c3w, h: clamp(H - 10 - (lowY + 2), 96, 230) };
    boss = buildBoss(b, bossRoom, h1);
    cells.push({ kind: "walled", r: bossRoom, sides: { t: false, b: false, l: false, r: false } });

    tvParts = buildLounge(b, lounge, centerAcc, wallTv, true);
    if (!splitHall) {
      const couch = tvParts.couch;
      const free = lounge.y + lounge.h - (couch.y + couch.h + 6);
      eventArea = { x: lounge.x + 16, y: couch.y + couch.h + 4, w: lounge.w - 32, h: Math.max(26, free) };
    }
  }

  const L = finish(b, W, H, false, segments, net, {
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
    lamp: boss.lamp,
    wallTv,
  });
  refit(L, site, PW, PH);
  return done(L, cells, site);
}

// ------------------------------------------------------------------ the phone held upright: a narrow townhouse

function portrait(PW: number, PH: number, threads: number): Layout {
  // A sliver of street down the right on wider phones; the back yard gets what height is spare.
  const W = PW >= 370 ? PW - 20 : PW;
  let H = PH;
  const b = new Builder();
  const cells: Cell[] = [];
  // The stairwell runs down the right side, past every floor.
  const aisleX = W - 10;
  const x0 = 6;
  const innerW = aisleX - HALF - x0;
  const segments: WallSegment[] = [
    { x0: 0, x1: Math.round(W * 0.42), depth: 64 },
    { x0: Math.round(W * 0.42), x1: Math.round(W * 0.7), depth: 54 },
    { x0: Math.round(W * 0.7), x1: W, depth: 70 },
  ];
  const top = 70;
  const gap = HALF * 2;
  type Kind = "podA" | "kitchenMeeting" | "lounge" | "podB" | "hall" | "games" | "library" | "waitingBoss";
  type Row = { kind: Kind; min: number; grow: number };
  const podCols = Math.max(2, Math.floor(innerW / 48));
  const rows: Row[] = [
    { kind: "podA", min: POD_H, grow: 0 },
    { kind: "kitchenMeeting", min: 112, grow: 1 },
    { kind: "lounge", min: 136, grow: 0.6 },
    { kind: "waitingBoss", min: 150, grow: 1.4 },
  ];
  const optional: Row[] = [
    { kind: "podB", min: POD_H, grow: 0 },
    { kind: "hall", min: 76, grow: 0.8 },
    { kind: "games", min: 96, grow: 0.4 },
    { kind: "library", min: 86, grow: 0.2 },
  ];
  let need = desksFor(threads);
  const needPods = Math.ceil(need / (2 * podCols));
  const used = () => rows.reduce((s, r) => s + r.min, 0) + gap * rows.length;
  for (const o of optional) {
    if (o.kind === "podB" && needPods < 2) continue;
    if (top + used() + o.min + gap <= H - 6) rows.splice(rows.length - 1, 0, o);
  }
  H -= Math.min(56, Math.floor(Math.max(0, H - 6 - top - used()) * 0.5));
  const extra = Math.max(0, H - 6 - top - used());
  const growSum = rows.reduce((s, r) => s + r.grow, 0) || 1;
  const halls: number[] = [];
  const plan: { row: Row; rect: Rect; hallY: number }[] = [];
  let y = top;
  for (const row of rows) {
    const h = row.min + Math.floor((extra * row.grow) / growSum);
    const rect: Rect = { x: x0, y, w: innerW, h };
    // Floors above the last open onto the landing below them; the last onto the one above.
    const hallY = row.kind === "waitingBoss" ? y - gap / 2 : y + h + gap / 2;
    plan.push({ row, rect, hallY });
    if (row.kind !== "waitingBoss") halls.push(y + h + gap / 2);
    y += h + gap;
  }
  const net: Network = { halls: [...new Set(halls)], aisles: [aisleX] };
  let kitchen: Rect | null = null;
  let lounge: Rect | null = null;
  let meeting: Rect | null = null;
  let whiteboard: Rect | null = null;
  let waiting: Rect | null = null;
  let boss: Layout["boss"] | null = null;
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  let tvParts: ReturnType<typeof buildLounge> | null = null;
  let hall: Rect | null = null;
  const hasRest = rows.some((r) => r.kind === "games" || r.kind === "library");
  for (const { row, rect, hallY } of plan) {
    const acc: Access = { hallY, aisleX };
    const cell = (kind: CellKind, sides = { t: rect.y > top, b: true, l: false, r: true }) => cells.push({ kind, r: { x: x0 - 2, y: rect.y, w: rect.w + 2, h: rect.h }, sides });
    switch (row.kind) {
      case "podA":
      case "podB":
        cell("pen");
        if (need > 0) need -= deskRow(b, cells, { ...rect, h: POD_H }, acc, need);
        break;
      case "kitchenMeeting": {
        const kw = Math.round(rect.w * 0.54);
        kitchen = { x: rect.x, y: rect.y + 26, w: kw - 6, h: rect.h - 26 };
        // In through the gap between the kitchenette and the fishbowl.
        buildKitchen(b, kitchen, { hallY, aisleX: rect.x + kw - 1 });
        cells.push({ kind: "kitchen", r: { x: x0 - 2, y: rect.y, w: kw - 4, h: rect.h }, sides: { t: true, b: true, l: false, r: true } });
        meeting = { x: rect.x + kw + 4, y: rect.y, w: rect.w - kw - 4, h: rect.h - 4 };
        whiteboard = buildMeeting(b, meeting, hallY);
        break;
      }
      case "lounge":
        lounge = rect;
        tvParts = buildLounge(b, rect, acc, null, !hasRest, !rows.some((r) => r.kind === "games"));
        cell("break");
        break;
      case "hall":
        hall = rect;
        cell("hall", { t: false, b: false, l: false, r: true });
        break;
      case "games":
        games = rect;
        gamesParts = buildGames(b, { ...rect, y: rect.y + 6, h: rect.h - 6 }, acc);
        cell("games");
        break;
      case "library":
        buildLibrary(b, { ...rect, y: rect.y + 8, h: rect.h - 8 }, acc);
        cell("archive");
        break;
      case "waitingBoss": {
        const ww = Math.round(rect.w * 0.56);
        waiting = { x: rect.x, y: rect.y + 4, w: ww - 4, h: rect.h - 58 };
        buildChairRows(b, waiting, hallY, seatsFor(threads));
        cells.push({ kind: "waiting", r: { x: x0 - 2, y: rect.y, w: ww - 2, h: waiting.h + 8 }, sides: { t: true, b: false, l: false, r: true } });
        const bossRoom: Rect = { x: rect.x + ww + 4, y: rect.y + 4, w: rect.w - ww - 4, h: Math.min(rect.h - 8, H - 4 - (rect.y + 4)) };
        boss = buildBoss(b, bossRoom, hallY);
        break;
      }
    }
  }
  utilities(b, H, x0 + 2, net.halls[net.halls.length - 1]!);
  const w0 = waiting as Rect | null;
  if (w0) {
    const sTop = w0.y + w0.h + 10;
    const sx = x0 + 80;
    const sw = w0.x + w0.w - sx;
    if (sw >= 60 && H - 4 - sTop >= 34) buildServerRoom(b, { x: sx, y: sTop, w: sw, h: Math.min(48, H - 4 - sTop) });
    cells.push({ kind: "nook", r: { x: x0 - 2, y: w0.y + w0.h + 8, w: 78, h: H - (w0.y + w0.h + 8) }, sides: { t: false, b: false, l: false, r: false } });
  }
  const couch = tvParts!.couch;
  const loungeFloor = { x: lounge!.x + 10, y: couch.y + 30, w: lounge!.w - 20, h: Math.max(30, lounge!.y + lounge!.h - couch.y - 30) };
  const h0 = hall as Rect | null;
  const eventArea = h0 ? { x: h0.x + 10, y: h0.y + 8, w: h0.w - 20, h: h0.h - 14 } : games ?? loungeFloor;
  const L = finish(b, W, H, true, segments, net, {
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
    lamp: boss!.lamp,
  });
  const site = { x: 0, w: W, h: H };
  refit(L, site, PW, PH);
  return done(L, cells, site);
}

/** The Annex floor plan for a panel (already at least the minimum size). */
export function annexLayout(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return opts.portrait ? portrait(W, H, opts.threads) : wide(W, H, opts.threads);
}

/** Which waiting chair this is (they're all different). */
export function chairVariant(p: PropPlacement): number {
  return hash(p.id) % 4;
}
