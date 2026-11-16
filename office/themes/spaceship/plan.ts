// Spaceship: the floor plan. One deck of a long-haul ship, the stern on the
// left and the bow on the right. The main corridor runs the length of the
// deck (its spine) and the compartments open off it: crew stations
// amidships, the rec room under the news screen, the bridge at the bow under
// its viewscreen and the captain's cabin below it; the galley, the muster
// station and the cargo bay along the belly; the engine room aft with the
// drive core. The airlock is in the hull wall, portholes beside it. On wider
// panels the deck stops short of the sides and the bottom: the hull, and
// space beyond. Pure geometry (no canvas): the layout tests run it in Node.
import type { Layout, PropPlacement, Rect } from "../../layout.ts";
import {
  Builder,
  buildBoss,
  buildGames,
  buildKitchen,
  buildLibrary,
  buildLounge,
  buildMeeting,
  buildPods,
  clamp,
  finish,
  POD_H,
  via,
  type Access,
  type Network,
  type Point,
  type Spot,
  type WallSegment,
} from "../../themekit.ts";

/** What the drawing needs to know about the deck (kept in `L.themeData`). */
export interface ShipPlan {
  ship: true;
  portrait: boolean;
  /** Hull and space beyond the deck at the panel's sides, and at the bottom. */
  edgeX: number;
  edgeY: number;
  /** The bridge's viewscreen in the hull wall. */
  viewscreen: Rect;
  /** Wall panels: the ship's AI, the gravity switch, the airlock controls (null when the wall is full). */
  ai: Rect | null;
  gravity: Rect | null;
  airlock: Rect | null;
  /** The food synthesizer on the galley counter. */
  synth: Rect | null;
  /** The drive core in the engine room (its base on the floor). */
  core: Rect | null;
  /** The cargo bay's floor, and its crates. */
  cargo: Rect | null;
  crates: Rect[];
  /** Hydroponic troughs under grow lights: in the hydroponics bay, or a grow tower by the corridor. */
  troughs: Rect[];
  /** Where the hydroponics click shows (the bay, or the tower). */
  hydro: Rect | null;
  /** The bridge (the meeting room) and the captain's cabin. */
  bridge: Rect;
}

export function planOf(L: Layout): ShipPlan | null {
  const d = L.themeData as Partial<ShipPlan> | undefined;
  return d && d.ship === true ? (d as ShipPlan) : null;
}

// ------------------------------------------------------------------ compartments

/** The muster station: rows of jump seats facing you, the comms desk (the bell) in the far corner. */
function buildMuster(b: Builder, r: Rect, acc: Access, maxRows: number): void {
  b.rooms.push({ kind: "waiting", rect: r });
  const fromLeft = acc.aisleX < r.x + r.w / 2;
  const recX = fromLeft ? r.x + r.w - 40 : r.x + 4;
  b.prop("reception", "reception", recX, r.y + 2, r.y + 20);
  b.poke("bell", "bell", { x: recX, y: r.y - 4, w: 34, h: 24 });
  const seats: Spot[] = [];
  for (let row = 0, y = r.y + 38; y <= r.y + r.h - 4 && row < maxRows; row++, y += 30) {
    // The first row stops short of the comms desk.
    const xa = r.x + 14 + (row === 0 && !fromLeft ? 42 : 0);
    const xb = r.x + r.w - 12 - (row === 0 && fromLeft ? 42 : 0);
    const n = clamp(Math.floor((xb - xa) / 22) + 1, 0, 8);
    if (n === 0) continue;
    // A row of seats, centered when it's short of the room.
    const x0 = n === 8 ? Math.round((xa + xb) / 2 - 77) : xa;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 22;
      seats.push({
        id: `wait-${row}-${i}`,
        kind: "review",
        group: "review",
        x,
        y,
        facing: "front",
        pose: "sit-front",
        path: [{ x: acc.aisleX, y: acc.hallY, c: true }, { x: acc.aisleX, y: y - 22 }, { x, y: y - 22 }, { x, y }],
        activity: "waiting for you",
        lift: 2,
      });
      b.prop(`wait-seat-${row}-${i}`, "waiting-chair", x - 8, y - 16, y - 2);
    }
  }
  for (const s of seats) b.spot(s);
  b.seats.push(...seats);
}

/** The engine room: a glass bulkhead, the drive core on one side and power racks along the floor. Returns the core. */
function buildEngine(b: Builder, r: Rect, coreLeft: boolean): Rect {
  b.rooms.push({ kind: "server", rect: r, walls: "glass", doorX: coreLeft ? r.x + r.w - 12 : r.x + 12, doorSide: "top" });
  const coreW = 30;
  const coreH = clamp(r.h - 10, 36, 76);
  const core: Rect = { x: coreLeft ? r.x + 6 : r.x + r.w - 6 - coreW, y: r.y + r.h - 5 - coreH, w: coreW, h: coreH };
  const rx0 = coreLeft ? core.x + coreW + 6 : r.x + 5;
  const rx1 = coreLeft ? r.x + r.w - 4 : core.x - 6;
  const n = Math.max(1, Math.floor((rx1 - rx0 + 2) / 18));
  const ai = Math.floor(n / 2);
  const rackY = r.y + r.h - 4 - 32;
  let right = rx0;
  for (let i = 0; i < n; i++) {
    const x = rx0 + i * 18 + (i > ai ? 4 : 0);
    if (x + (i === ai ? 20 : 16) > rx1) break;
    b.prop(`rack-${i}`, i === ai ? "ai-rack" : "server-rack", x, rackY, rackY + 31, i === ai ? 20 : 16);
    right = x + (i === ai ? 20 : 16);
  }
  // Clicking the racks runs the office's diagnostic; the core is the ship's own to click.
  b.poke("server", "server", { x: rx0 - 2, y: rackY - 2, w: right - rx0 + 4, h: r.y + r.h - rackY + 2 });
  b.prop("server-glass", "glass-front", r.x, r.y + r.h - 10, r.y + r.h + 1, r.w);
  b.server = r;
  return core;
}

/** Sleep pods in crew quarters: rows of capsule bunks for long naps. */
function buildQuarters(b: Builder, r: Rect, acc: Access): void {
  b.rooms.push({ kind: "library", rect: r });
  const cols = clamp(Math.floor((r.w - 8) / 34), 1, 6);
  const rows = clamp(Math.floor((r.h - 6) / 34), 1, 3);
  const x0 = r.x + Math.round((r.w - cols * 34) / 2) + 17;
  let n = 0;
  for (let row = 0; row < rows; row++) {
    const by = r.y + 22 + row * 34;
    for (let col = 0; col < cols; col++) {
      const bx = x0 + col * 34;
      const id = `bunk-${++n}`;
      b.prop(id, n % 2 ? "beanbag-blue" : "beanbag-pink", bx - 13, by - 10, by - 6);
      b.poke(id, "beanbag", { x: bx - 13, y: by - 10, w: 26, h: 14 });
      b.spot({ id, kind: "beanbag", group: "nap", x: bx, y: by, facing: "front", pose: "nap", path: via(acc, by + 8, bx, by), activity: "asleep in a bunk" });
    }
  }
}

/** The hydroponics bay: troughs under grow lights along the back, benches to sit among the greens. */
function buildHydroponics(b: Builder, r: Rect, acc: Access, plan: ShipPlan): void {
  b.rooms.push({ kind: "garden", rect: r });
  const trough: Rect = { x: r.x + 22, y: r.y + 2, w: r.w - 44, h: 20 };
  plan.troughs.push(trough);
  plan.hydro = { x: trough.x, y: trough.y - 10, w: trough.w, h: trough.h + 10 };
  b.plant("LARGE_PLANT", r.x - 2, r.y + r.h - 50);
  b.plant("LARGE_PLANT", r.x + r.w - 30, r.y + r.h - 50);
  const n = r.w >= 200 ? 2 : 1;
  const y = r.y + Math.min(r.h - 10, 58);
  for (let i = 0; i < n; i++) {
    const cx = r.x + Math.round(((i + 0.5) * r.w) / n);
    b.prop(`bench-${i}`, "bench", cx - 17, y - 15, y - 2);
    for (const [k, dx] of [
      [0, -8],
      [1, 8],
    ] as const) {
      b.spot({ id: `garden-${i}-${k}`, kind: "bench", group: "lounge", x: cx + dx, y, facing: "front", pose: "sit-front", path: via(acc, y - 22, cx + dx, y), activity: "enjoying the garden", lift: 2 });
    }
  }
}

/** The cargo bay: open deck plating for get-togethers, crates stacked along the far side. Returns the event area. */
function buildCargo(r: Rect, plan: ShipPlan): Rect {
  plan.cargo = r;
  const crates = r.h >= 70 ? r.y + r.h - 22 : -1;
  if (crates > 0) {
    for (let x = r.x + 4, i = 0; x + 18 <= r.x + r.w - 4; i++) {
      const w = i % 3 === 1 ? 14 : 18;
      if (i % 4 !== 3) plan.crates.push({ x, y: crates + (w === 14 ? 4 : 0), w, h: w === 14 ? 14 : 18 });
      x += w + 6;
    }
  }
  return { x: r.x + 6, y: r.y + 6, w: r.w - 12, h: Math.max(26, (crates > 0 ? crates - 4 : r.y + r.h - 4) - (r.y + 6)) };
}

/** Water recycler, fabricator (the printer) and recycling chute (the bin) in a row standing at baseY, reached straight from a hall. */
function utilitiesAt(b: Builder, x: number, baseY: number, hallY: number): void {
  b.prop("cooler", "cooler", x, baseY - 36, baseY - 1);
  b.poke("cooler", "cooler", { x, y: baseY - 36, w: 16, h: 36 });
  b.prop("printer", "printer", x + 22, baseY - 26, baseY);
  b.poke("printer", "printer", { x: x + 22, y: baseY - 26, w: 30, h: 26 });
  b.prop("bin", "bin", x + 54, baseY - 14, baseY + 1);
  b.poke("bin", "bin", { x: x + 54, y: baseY - 14, w: 16, h: 16 });
  b.spot({ id: "cooler", kind: "cooler", group: "break", x: x + 8, y: baseY + 4, facing: "back", pose: "cup", path: [{ x: x + 8, y: hallY, c: true }, { x: x + 8, y: baseY + 4 }], activity: "chatting at the water cooler" });
}

/** The food synthesizer stands on the galley counter between the kettle and the microwave. */
function synthOn(b: Builder, kitchen: Rect): Rect | null {
  const counter = b.props.find((p) => p.kind === "kitchen-counter");
  if (!counter) return null;
  const cw = counter.w ?? 100;
  const x = counter.x + 46;
  if (x + 18 > counter.x + (cw >= 100 ? cw - 28 : cw - 2)) return null;
  return { x, y: kitchen.y - 22, w: 18, h: 24 };
}

// ------------------------------------------------------------------ the hull wall

/** Free stretches of the hull wall: [x0, x1] runs on segments, clear of what's busy. */
function freeRuns(segments: WallSegment[], busy: [number, number][], minDepth = 0): { x0: number; x1: number; depth: number }[] {
  const out: { x0: number; x1: number; depth: number }[] = [];
  for (const s of segments) {
    if (s.depth < minDepth) continue;
    let runs: [number, number][] = [[s.x0 + 6, s.x1 - 6]];
    for (const [a, z] of busy) runs = runs.flatMap(([p, q]) => (z <= p || a >= q ? [[p, q] as [number, number]] : ([[p, a], [z, q]] as [number, number][]).filter(([u, v]) => v - u > 0)));
    for (const [p, q] of runs) out.push({ x0: p, x1: q, depth: s.depth });
  }
  return out;
}

/**
 * The hull wall's fixtures where a ship has them: the viewscreen over the
 * bridge with its console under it (the AI's eye, the gravity switch), and
 * portholes in what's left. finish() hung windows, paintings and plants the
 * classic way: they're redone here.
 */
function dressWall(L: Layout, plan: ShipPlan, bridgeSeg: WallSegment, wallTv?: Rect): void {
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
  L.wall.paintings = [];
  const w = L.wall;
  const vs = plan.viewscreen;
  const band = bridgeSeg.depth - 24;
  plan.ai = { x: vs.x + 8, y: band, w: 16, h: 18 };
  plan.gravity = vs.w >= 90 ? { x: vs.x + vs.w - 24, y: band, w: 14, h: 18 } : null;
  const busy: [number, number][] = [
    [w.pinboard.x - 4, w.pinboard.x + w.pinboard.w + 4],
    [w.calendar.x - 4, w.calendar.x + w.calendar.w + 4],
    [w.legendNote.x - 4, w.door.x + w.door.w + 4],
    [w.clock.x - w.clock.r - 4, w.clock.x + w.clock.r + 4],
    [vs.x - 6, vs.x + vs.w + 6],
  ];
  if (wallTv) busy.push([wallTv.x - 18, wallTv.x + wallTv.w + 18]);
  // Portholes in the free stretches (not under the office's buttons in the top-right corner).
  const corner = L.W - 34;
  const ports: Rect[] = [];
  for (const r of freeRuns(L.segments, busy, 56)) {
    const x1 = Math.min(r.x1, corner);
    const n = Math.floor((x1 - r.x0 + 10) / 34);
    if (n <= 0) continue;
    const pad = Math.floor((x1 - r.x0 - (n * 24 + (n - 1) * 10)) / 2);
    for (let i = 0; i < n; i++) ports.push({ x: r.x0 + pad + i * 34, y: Math.round((r.depth - 18) / 2) - 10, w: 24, h: 24 });
  }
  w.windows = ports.sort((a, z) => a.x - z.x);
  w.pillars = L.segments.slice(1).map((s) => s.x0);
}

/** The suit locker by the airlock (the spacewalk), on free floor near the door. */
function suitLocker(L: Layout, plan: ShipPlan): void {
  const d = L.wall.door;
  const x0 = Math.max(plan.edgeX + 2, d.x - 120);
  const x1 = Math.min(L.W - plan.edgeX - 2, d.x + d.w + 120);
  const near = { x: d.x + d.w / 2, y: d.y + d.h + 30 };
  // Close to the airlock if there's floor for it, else the nearest free floor on the deck.
  plan.airlock = freeFloor(L, 16, 32, near, { x: x0, y: 0, w: x1 - x0, h: d.y + d.h + 140 }) ?? freeFloor(L, 16, 32, near, { x: plan.edgeX + 2, y: 0, w: L.W - 2 * plan.edgeX - 4, h: L.H - plan.edgeY });
}

// ------------------------------------------------------------------ floor space (for small fixtures)

/** Rough classic footprints of what the builders place, for finding free floor in pure geometry. */
const SIZE: Partial<Record<PropPlacement["kind"], [number, number]>> = {
  espresso: [26, 30],
  fridge: [20, 34],
  vending: [24, 44],
  stool: [12, 10],
  couch: [84, 28],
  "coffee-table": [38, 14],
  piano: [32, 32],
  "fishtank-stand": [42, 22],
  "beanbag-blue": [26, 16],
  "beanbag-pink": [26, 16],
  reception: [36, 22],
  "waiting-chair": [16, 16],
  "meeting-table": [68, 30],
  "meeting-chair-front": [16, 32],
  "meeting-chair-back": [16, 32],
  "server-rack": [16, 33],
  "ai-rack": [20, 33],
  "boss-chair": [22, 26],
  "guest-chair": [16, 32],
  "library-shelf": [32, 32],
  "dog-bed": [26, 14],
  lamp: [16, 52],
  hoop: [16, 30],
  cooler: [17, 36],
  printer: [30, 26],
  bin: [16, 16],
  dartboard: [20, 34],
  pingpong: [76, 26],
  arcade: [26, 48],
  armchair: [28, 26],
  "library-table": [32, 32],
  bench: [36, 16],
  "plan-rolls": [18, 28],
  whiteboard: [86, 46],
};

/** A spot of free floor of w×h near (x, y), clear of furniture, spots, paths, halls, aisles and walled rooms. */
function freeFloor(L: Layout, w: number, h: number, near: Point, within: Rect): Rect | null {
  const taken: Rect[] = [];
  for (const p of L.props) {
    const [sw, sh] = SIZE[p.kind] ?? [(p.w ?? 16) + 2, p.kind === "glass-front" ? 11 : p.kind === "kitchen-counter" ? 36 : p.kind === "kitchen-island" ? 26 : p.kind === "planter" ? 20 : p.kind === "putting-green" ? 14 : 30];
    taken.push({ x: p.x - 2, y: p.y - 2, w: sw + 4, h: sh + 4 });
  }
  for (const pl of L.plants) taken.push({ x: pl.x, y: pl.y, w: pl.sprite === "LARGE_PLANT" ? 32 : 16, h: Math.max(16, pl.z - pl.y + 2) });
  for (const d of L.desks) taken.push({ x: d.x - 2, y: d.y - 12, w: 52, h: 50 });
  for (const s of L.spots) {
    taken.push({ x: s.x - 8, y: s.y - 26, w: 16, h: 28 });
    for (let i = 1; i < s.path.length; i++) {
      const a = s.path[i - 1]!;
      const q = s.path[i]!;
      taken.push({ x: Math.min(a.x, q.x) - 7, y: Math.min(a.y, q.y) - 7, w: Math.abs(q.x - a.x) + 14, h: Math.abs(q.y - a.y) + 14 });
    }
  }
  for (const hy of L.net.halls) taken.push({ x: 0, y: hy - 9, w: L.W, h: 18 });
  for (const ax of L.net.aisles) taken.push({ x: ax - 9, y: 0, w: 18, h: L.H });
  for (const r of L.rooms) {
    if (r.walls) taken.push({ x: r.rect.x - 4, y: r.rect.y - 10, w: r.rect.w + 8, h: r.rect.h + 14 });
    // Open compartments have low bulkheads along their edges: stand clear of them.
    else if (r.kind !== "pod") {
      const q = r.rect;
      taken.push({ x: q.x - 6, y: q.y - 6, w: q.w + 12, h: 8 }, { x: q.x - 6, y: q.y + q.h - 2, w: q.w + 12, h: 8 });
      taken.push({ x: q.x - 6, y: q.y - 6, w: 8, h: q.h + 12 }, { x: q.x + q.w - 2, y: q.y - 6, w: 8, h: q.h + 12 });
    }
  }
  // The ship's own fixtures placed so far.
  const plan = planOf(L);
  for (const q of [plan?.cargo, plan?.airlock, plan?.core, ...(plan?.troughs ?? [])]) if (q) taken.push({ x: q.x - 6, y: q.y - 6, w: q.w + 12, h: q.h + 12 });
  taken.push({ x: L.eventArea.x, y: L.eventArea.y, w: L.eventArea.w, h: L.eventArea.h });
  taken.push(L.tv, ...L.speakers, { x: L.fishtank.x - 2, y: L.fishtank.y - 4, w: L.fishtank.w + 4, h: L.fishtank.h + 28 });
  for (const s of L.segments) taken.push({ x: s.x0, y: 0, w: s.x1 - s.x0, h: s.depth + 4 });
  taken.push({ x: L.entrance.x - 10, y: 0, w: 20, h: L.net.halls[0] ?? L.H });
  const hit = (r: Rect) => taken.some((q) => r.x < q.x + q.w && q.x < r.x + r.w && r.y < q.y + q.h && q.y < r.y + r.h);
  let best: Rect | null = null;
  let cost = Infinity;
  for (let y = within.y; y + h <= within.y + within.h; y += 3) {
    for (let x = within.x; x + w <= within.x + within.w; x += 3) {
      const r = { x, y, w, h };
      if (hit(r)) continue;
      const c = Math.abs(x + w / 2 - near.x) + Math.abs(y + h - near.y);
      if (c < cost) {
        cost = c;
        best = r;
      }
    }
  }
  return best;
}

/** No hydroponics bay on this plan: a grow tower by the corridor instead, where there's floor for it. */
function growTower(L: Layout, plan: ShipPlan): void {
  if (plan.hydro) return;
  const hy = L.net.halls[0]!;
  const r = freeFloor(L, 18, 34, { x: L.W / 2, y: hy - 10 }, { x: 0, y: 0, w: L.W - plan.edgeX, h: L.H - plan.edgeY });
  if (!r) return;
  plan.troughs.push(r);
  plan.hydro = r;
}

// ------------------------------------------------------------------ wide

function widePlan(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const E = clamp(Math.floor((W - 600) / 5), 0, 16);
  const EB = H >= 420 ? 12 : 0;
  const FB = H - EB;
  const X0 = E + 6;
  const X1 = W - E - 6;
  // Wide decks have room aft for the engine room over the cargo bay.
  const stern = W >= 860;
  const sW = stern ? clamp(Math.round(W * 0.13), 116, 160) : 0;
  const aS = X0 + sW + 8;
  const c1x = stern ? aS + 8 : X0;
  const inner = X1 - c1x;
  const podCols = clamp(Math.floor((inner * 0.36) / 48), 3, 6);
  const c1w = podCols * 48;
  const a12 = c1x + c1w + 8;
  const c3w = clamp(Math.round(inner * 0.3), 150, 240);
  const c3x = X1 - c3w;
  const a23 = c3x - 8;
  const c2x = a12 + 8;
  const c2w = a23 - 8 - c2x;
  const D = 64;
  const DT = 88;
  const wantPods = Math.ceil((threads + 3) / (2 * podCols));
  const hy = clamp(Math.max(Math.round(FB * 0.56), wantPods >= 2 ? D + 2 * POD_H + 10 : 0), D + POD_H + 10, FB - 110);
  // The viewscreen's wall is deep, but not so deep that the bridge's chart table can't seat its crew.
  const DV = hy - 8 - 92 < 120 ? clamp(hy - 8 - 120, 80, 92) : 92;
  const segments: WallSegment[] = [
    { x0: 0, x1: a12 + 14, depth: D },
    { x0: a12 + 14, x1: a23 - 2, depth: DT },
    { x0: a23 - 2, x1: W, depth: DV },
  ];
  const net: Network = { halls: [hy], aisles: stern ? [aS, a12, a23] : [a12, a23] };
  const leftAcc: Access = { hallY: hy, aisleX: a12 };
  const plan: ShipPlan = {
    ship: true,
    portrait: false,
    edgeX: E,
    edgeY: EB,
    viewscreen: { x: 0, y: 0, w: 0, h: 0 },
    ai: null,
    gravity: null,
    airlock: null,
    synth: null,
    core: null,
    cargo: null,
    crates: [],
    troughs: [],
    hydro: null,
    bridge: { x: c3x, y: DV, w: c3w, h: 0 },
  };

  // Aft: crew quarters over the engine room above the corridor, the cargo bay below it.
  let eventArea: Rect | null = null;
  if (stern) {
    const colH = hy - 8 - (D + 4);
    const engH = clamp(colH - 104, 72, 112);
    const eng: Rect = { x: X0, y: hy - 8 - engH, w: sW, h: engH };
    plan.core = buildEngine(b, eng, true);
    const qH = eng.y - 10 - (D + 4);
    if (qH >= 40) buildQuarters(b, { x: X0, y: D + 4, w: sW, h: qH }, { hallY: hy, aisleX: aS });
    eventArea = buildCargo({ x: X0, y: hy + 12, w: sW, h: FB - 6 - (hy + 12) }, plan);
  }

  // Amidships, port side: crew stations above the corridor; the galley below, more
  // stations, the rec deck and crew quarters as the height allows.
  buildPods(b, { x: c1x, y: D, w: c1w, h: hy - 8 - D }, leftAcc);
  let below: Rect = { x: c1x, y: hy + 10, w: c1w, h: FB - 6 - (hy + 10) };
  const kitchenH = clamp(below.h, 64, 92);
  const kitchen: Rect = { x: c1x, y: below.y + 8, w: c1w, h: kitchenH - 8 };
  buildKitchen(b, kitchen, leftAcc);
  plan.synth = synthOn(b, kitchen);
  below = { ...below, y: below.y + kitchenH + 8, h: below.h - kitchenH - 8 };
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  if (below.h >= POD_H && wantPods > b.pods.length) {
    buildPods(b, { ...below, h: POD_H }, leftAcc);
    below = { ...below, y: below.y + POD_H + 6, h: below.h - POD_H - 6 };
  }
  if (below.h >= 104) {
    games = { ...below, y: below.y + 6, h: Math.min(150, below.h - 46) };
    gamesParts = buildGames(b, games, leftAcc);
    const end = below.y + below.h;
    below = { ...below, y: games.y + games.h, h: end - (games.y + games.h) };
    if (below.h - 46 >= 80 && !stern) {
      const q: Rect = { ...below, y: below.y + 14, h: Math.min(110, below.h - 46 - 14) };
      buildQuarters(b, q, leftAcc);
      below = { ...below, y: q.y + q.h, h: end - (q.y + q.h) };
    }
  }

  // Amidships: the rec room under the news screen; the muster station below (the cargo
  // bay beside it when there's no room aft), hydroponics at the bottom when tall.
  // A little narrower than the classic TV: room for a porthole beside it.
  const tvW = Math.min(c2w - 60, 132);
  const tvH = Math.min(Math.round(tvW * 0.56), DT - 14);
  const wallTv: Rect = { x: c2x + Math.round((c2w - tvW) / 2), y: DT - tvH - 6, w: tvW, h: tvH };
  const lounge: Rect = { x: c2x, y: DT, w: c2w, h: hy - 8 - DT };
  // Tall rec rooms get the rec deck (darts, zero-g ping-pong, the sim pod) on the floor under the couch.
  // When it has the rec deck elsewhere, crew quarters with sleep pods.
  const deckY = DT + 88;
  const lower = hy - 8 - deckY >= 76 && c2w >= 150;
  const recDeck = lower && games === null;
  const quarters = lower && !recDeck && !b.rooms.some((r) => r.kind === "library");
  const tvParts = buildLounge(b, lounge, { hallY: hy, aisleX: a23 }, wallTv, games === null && !recDeck && !b.rooms.some((r) => r.kind === "library"));
  if (recDeck) {
    games = { x: c2x, y: deckY, w: c2w, h: Math.min(150, hy - 8 - deckY) };
    gamesParts = buildGames(b, games, { hallY: hy, aisleX: a23 });
  } else if (quarters) {
    buildQuarters(b, { x: c2x + 8, y: hy - 8 - Math.min(110, hy - 8 - deckY), w: c2w - 16, h: Math.min(110, hy - 8 - deckY) }, { hallY: hy, aisleX: a23 });
  }
  const fullBelow = FB - 6 - (hy + 12);
  const hydro = fullBelow - 132 - 16 >= 96 && c2w >= 150;
  const belowH = hydro ? 132 : fullBelow;
  const musterW = stern ? c2w : clamp(Math.round(c2w * 0.56), 104, c2w - 76);
  const waiting: Rect = { x: c2x, y: hy + 12, w: musterW, h: belowH };
  buildMuster(b, waiting, leftAcc, 3);
  // The cargo bay beside the muster station (short decks may need that slot for the engine room: see below).
  const cargoSlot: Rect | null = stern ? null : { x: c2x + musterW + 8, y: hy + 12, w: c2w - musterW - 8, h: belowH };
  if (hydro) buildHydroponics(b, { x: c2x, y: waiting.y + waiting.h + 16, w: c2w, h: fullBelow - 132 - 16 }, { hallY: hy, aisleX: a12 }, plan);

  // The bow: the bridge under the viewscreen, the captain's cabin below.
  const topH = hy - 8 - DV;
  const serverTop = !stern && topH >= 204;
  const meeting: Rect = { x: c3x, y: DV, w: c3w, h: serverTop ? Math.min(230, topH - 54) : topH };
  plan.bridge = meeting;
  const whiteboard = buildMeeting(b, meeting, hy);
  if (serverTop) {
    const sy = meeting.y + meeting.h + 8;
    plan.core = buildEngine(b, { x: c3x, y: sy, w: c3w - 28, h: Math.min(64, hy - 10 - sy) }, true);
  }
  const bossRoom: Rect = { x: c3x, y: hy + 12, w: c3w, h: clamp(FB - 10 - (hy + 12), 96, 230) };
  const boss = buildBoss(b, bossRoom, hy);
  const underBoss = FB - 6 - (bossRoom.y + bossRoom.h + 8);

  // Utilities and (aft) the engine room along the bottom of the port side.
  if (below.h >= 40) {
    utilitiesAt(b, c1x + 4, FB - 5, hy);
    const sh = Math.min(56, below.h - 4);
    if (!b.server && c1w - 80 >= 60) plan.core = buildEngine(b, { x: c1x + 78, y: FB - 4 - sh, w: c1w - 80, h: sh }, false);
    else {
      const row = ["PLANT", "POT", "PLANT_2", "CACTUS"] as const;
      for (let i = 0, x = c1x + 84; x + 16 <= c1x + c1w - 4 && i < row.length; i++, x += 34) b.plant(row[i]!, x, row[i] === "POT" ? FB - 20 : FB - 36, i % 2 === 0);
    }
  }
  // Short panels: the engine room in the gap under the crew stations, or under your cabin.
  const podRows = Math.max(1, Math.floor((hy - 8 - D + 8) / POD_H));
  const podGapY = D + podRows * POD_H + 6;
  if (!b.server && underBoss < 40 && hy - 12 - podGapY >= 44) {
    plan.core = buildEngine(b, { x: c1x + 8, y: podGapY, w: Math.min(c1w - 16, 150), h: Math.min(56, hy - 12 - podGapY) }, false);
  }
  if (underBoss >= 40) {
    const y = bossRoom.y + bossRoom.h + 8;
    if (!b.server) plan.core = buildEngine(b, { x: c3x, y, w: c3w, h: Math.min(56, underBoss) }, false);
    else {
      b.plant("LARGE_PLANT", c3x + 4, FB - 52);
      b.plant("PLANT_2", c3x + c3w - 20, FB - 36);
    }
  }
  if (cargoSlot) {
    // Short decks: no room for the engine room anywhere else, so it takes the cargo bay's place.
    if (!b.server && cargoSlot.w >= 76 && cargoSlot.h >= 44) plan.core = buildEngine(b, { ...cargoSlot, y: cargoSlot.y + 4, h: Math.min(64, cargoSlot.h - 4) }, true);
    else eventArea = buildCargo(cargoSlot, plan);
  }
  const loungeFree = lounge.y + lounge.h - (tvParts.couch.y + tvParts.couch.h + 6);
  eventArea ??= loungeFree >= 70 || games === null ? { x: lounge.x + 16, y: tvParts.couch.y + tvParts.couch.h + 4, w: lounge.w - 32, h: Math.max(26, loungeFree) } : games;
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
  // The roster clear of the hull; the ship's chronometer by the bridge, the viewscreen beside it.
  const shift = Math.max(0, E + 6 - L.wall.pinboard.x);
  for (const r of [L.wall.pinboard, L.wall.calendar, L.wall.status]) r.x += shift;
  const bridgeSeg = segments[2]!;
  L.wall.clock = { x: bridgeSeg.x0 + 16, y: 20, r: 9 };
  plan.viewscreen = { x: bridgeSeg.x0 + 32, y: 6, w: W - Math.max(E, 4) - 6 - (bridgeSeg.x0 + 32), h: DV - 34 };
  L.themeData = plan;
  dressWall(L, plan, bridgeSeg, wallTv);
  suitLocker(L, plan);
  growTower(L, plan);
  if (plan.cargo) L.words = { "in the lounge": "in the cargo bay", "on the lounge floor": "in the cargo bay" };
  return L;
}

// ------------------------------------------------------------------ portrait

function portraitPlan(W: number, H: number, threads: number): Layout | null {
  const b = new Builder();
  const E = W >= 380 ? 9 : 0;
  const aisleX = W - E - 8;
  const innerW = W - 2 * E - 20;
  const x0 = E + 6;
  const kw = Math.round(innerW * 0.52);
  const DV = 78;
  const segments: WallSegment[] = [
    { x0: 0, x1: x0 + kw - 2, depth: 64 },
    { x0: x0 + kw - 2, x1: W, depth: DV },
  ];
  const top = DV;
  const gap = 16;
  const podCols = Math.max(2, Math.floor(innerW / 48));
  type Row = { kind: "galleyBridge" | "pods" | "lounge" | "pods2" | "cargo" | "quarters" | "musterBoss"; h: number; grow: number };
  const rows: Row[] = [
    { kind: "galleyBridge", h: 116, grow: 1 },
    { kind: "pods", h: POD_H, grow: 0 },
    { kind: "lounge", h: 136, grow: 1 },
    { kind: "musterBoss", h: 140, grow: 1.5 },
  ];
  const needPods = Math.ceil((threads + 3) / (2 * podCols));
  const used = () => top + rows.reduce((s, r) => s + r.h + gap, 0);
  if (needPods >= 2 && used() + POD_H + gap <= H - 6) rows.splice(2, 0, { kind: "pods2", h: POD_H, grow: 0 });
  if (used() + 86 + gap <= H - 6) rows.splice(rows.length - 1, 0, { kind: "cargo", h: 86, grow: 0.6 });
  if (used() + 76 + gap <= H - 6) rows.splice(rows.length - 1, 0, { kind: "quarters", h: 76, grow: 0.2 });
  if (used() > H + 24) return null;
  const extra = Math.max(0, H - 6 - used());
  const growSum = rows.reduce((s, r) => s + r.grow, 0) || 1;
  const placed: { row: Row; rect: Rect }[] = [];
  let y = top;
  for (const row of rows) {
    const h = row.h + Math.floor((extra * row.grow) / growSum);
    placed.push({ row, rect: { x: x0, y, w: innerW, h } });
    y += h + gap;
  }
  const hallBelow = (r: Rect) => r.y + r.h + gap / 2;
  const halls: number[] = [];
  placed.forEach(({ row, rect }, i) => {
    if (i < placed.length - 1) halls.push(hallBelow(rect));
    if (row.kind === "musterBoss" || row.kind === "cargo") halls.push(rect.y - gap / 2);
  });
  const net: Network = { halls: [...new Set(halls)].sort((a, z) => a - z), aisles: [aisleX] };
  const plan: ShipPlan = {
    ship: true,
    portrait: true,
    edgeX: E,
    edgeY: 0,
    viewscreen: { x: 0, y: 0, w: 0, h: 0 },
    ai: null,
    gravity: null,
    airlock: null,
    synth: null,
    core: null,
    cargo: null,
    crates: [],
    troughs: [],
    hydro: null,
    bridge: { x: 0, y: 0, w: 0, h: 0 },
  };
  let kitchen: Rect | null = null;
  let lounge: Rect | null = null;
  let meeting: Rect | null = null;
  let whiteboard: Rect | null = null;
  let waiting: Rect | null = null;
  let boss: Layout["boss"] | null = null;
  let tvParts: ReturnType<typeof buildLounge> | null = null;
  let eventArea: Rect | null = null;
  for (const { row, rect } of placed) {
    const below = hallBelow(rect);
    const above = rect.y - gap / 2;
    switch (row.kind) {
      case "galleyBridge": {
        // The galley against the hull, the bridge beside it under the viewscreen.
        kitchen = { x: rect.x, y: rect.y, w: kw - 6, h: rect.h };
        const k: Rect = { ...kitchen, y: kitchen.y + 14, h: kitchen.h - 14 };
        buildKitchen(b, k, { hallY: below, aisleX: rect.x + kw - 1 });
        plan.synth = synthOn(b, k);
        meeting = { x: rect.x + kw + 4, y: rect.y, w: rect.w - kw - 4, h: rect.h - 4 };
        plan.bridge = meeting;
        whiteboard = buildMeeting(b, meeting, below);
        break;
      }
      case "pods":
      case "pods2":
        buildPods(b, { ...rect, h: Math.min(rect.h, POD_H) }, { hallY: below, aisleX });
        break;
      case "lounge":
        lounge = rect;
        tvParts = buildLounge(b, rect, { hallY: below, aisleX }, null, !rows.some((r) => r.kind === "quarters"));
        break;
      case "cargo":
        eventArea = buildCargo({ ...rect, w: rect.w - 6 }, plan);
        break;
      case "quarters":
        buildQuarters(b, { ...rect, y: rect.y + 4, h: rect.h - 4 }, { hallY: below, aisleX });
        break;
      case "musterBoss": {
        const ww = Math.round(rect.w * 0.56);
        waiting = { x: rect.x, y: rect.y + 4, w: ww - 4, h: rect.h - 54 };
        buildMuster(b, waiting, { hallY: above, aisleX: rect.x + ww }, 2);
        const bossRoom: Rect = { x: rect.x + ww + 4, y: rect.y + 4, w: rect.w - ww - 4, h: Math.min(rect.h - 8, H - 4 - (rect.y + 4)) };
        boss = buildBoss(b, bossRoom, above);
        const sTop = waiting.y + waiting.h + 6;
        const sw = waiting.x + waiting.w - (x0 + 78);
        utilitiesAt(b, x0 + 2, rect.y + rect.h - 4, above);
        if (sw >= 60 && rect.y + rect.h - sTop >= 34) plan.core = buildEngine(b, { x: x0 + 78, y: sTop, w: sw, h: Math.min(52, rect.y + rect.h - sTop) }, false);
        break;
      }
    }
  }
  if (!meeting || !whiteboard || !kitchen || !lounge || !tvParts || !waiting || !boss) return null;
  const tv = tvParts as ReturnType<typeof buildLounge>;
  const lng = lounge as Rect;
  eventArea ??= { x: lng.x + 10, y: tv.couch.y + 30, w: lng.w - 20, h: Math.max(30, lng.y + lng.h - tv.couch.y - 30) };
  const L = finish(b, W, H, true, segments, net, {
    meeting,
    whiteboard,
    boss,
    waiting,
    kitchen,
    lounge,
    games: null,
    eventArea,
    tvParts: tv,
    gamesParts: null,
    doorX: aisleX,
    lamp: boss.lamp,
  });
  // The roster and calendar on the hull by the galley, the clock and the viewscreen over the bridge.
  const seg0 = segments[0]!;
  const bridgeSeg = segments[1]!;
  L.wall.pinboard = { x: E + 6, y: 3, w: Math.min(128, seg0.x1 - 54 - E), h: 53 };
  L.wall.calendar = { x: L.wall.pinboard.x + L.wall.pinboard.w + 6, y: 6, w: 20, h: 22 };
  L.wall.status = { x: L.wall.calendar.x, y: 31, w: 20, h: 18 };
  const door: Rect = { x: Math.min(aisleX, W - 14) - 10, y: DV - 42, w: 20, h: 42 };
  L.wall.door = door;
  L.wall.legendNote = { x: door.x - 16, y: door.y + 8, w: 12, h: 12 };
  L.entrance = { x: aisleX, y: DV + 2 };
  L.entrancePath = [{ x: aisleX, y: net.halls[0]!, c: true }, L.entrance];
  L.wall.clock = { x: bridgeSeg.x0 + 14, y: 20, r: 9 };
  plan.viewscreen = { x: bridgeSeg.x0 + 28, y: 6, w: L.wall.legendNote.x - 6 - (bridgeSeg.x0 + 28), h: DV - 34 };
  L.themeData = plan;
  dressWall(L, plan, bridgeSeg);
  suitLocker(L, plan);
  growTower(L, plan);
  if (plan.cargo) L.words = { "in the lounge": "in the cargo bay", "on the lounge floor": "in the cargo bay" };
  return L;
}

/** The deck for a panel (null: the classic plan). */
export function spaceshipPlan(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return opts.portrait ? portraitPlan(W, H, opts.threads) : widePlan(W, H, opts.threads);
}
