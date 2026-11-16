// School scenery: the floor plan. A school building: classrooms along the
// back wall, a main corridor, the cafeteria, the front office with the bench
// outside the principal's office, the teachers' room and the computer lab;
// in front of the building a covered walkway and the schoolyard: a grass
// field for events with swings and a slide, the school garden with benches
// and a drinking fountain, the gate with the bus stop (the way in), and a
// portable classroom when the school runs out of desks.
import {
  Builder,
  buildBoss,
  buildGames,
  buildKitchen,
  buildLibrary,
  buildLounge,
  buildMeeting,
  buildPods,
  buildServerRoom,
  buildWaiting,
  clamp,
  finish,
  POD_H,
  utilities,
  via,
} from "../../themekit.ts";
import type { Access, Network, Point, Spot, WallSegment } from "../../themekit.ts";
import type { Layout, Rect } from "../../layout.ts";

/** What the school's drawing needs to know about its own floor plan. */
export interface SchoolPlan {
  /** The main corridor's y (lockers, terrazzo). */
  corridor: number;
  /** Bottom of the building's floor (the front wall). */
  front: number;
  /** The covered walkway in front of the building (a hallway), if there's a yard. */
  walk: number | null;
  /** The whole schoolyard, if any. */
  yard: Rect | null;
  /** The grass field (events gather here). */
  field: Rect | null;
  /** Spots for the swings and the slide, at the field's edges. */
  swings: Rect | null;
  slide: Rect | null;
  /** The playground corner (sandbox, climber), when there's no portable. */
  playground: Rect | null;
  /** A portable classroom in the yard. */
  portable: Rect | null;
  /** The school garden. */
  garden: Rect | null;
  /** The gate (the way in) and the bus stop beside it. */
  gate: { x: number; y: number } | null;
  /** The teacher's corner in a classroom (desk, shelf), where there's room. */
  corners: Rect[];
  /** Rooms with half-walls drawn around them, and their doorways. */
  walls: { rect: Rect; gaps: { side: "top" | "bottom" | "left" | "right"; at: number }[] }[];
}

export function planOf(L: Layout): SchoolPlan | null {
  const d = L.themeData as { school?: SchoolPlan } | undefined;
  return d?.school ?? null;
}

// ------------------------------------------------------------------ pieces

/** The copier and a recycling bin in a corner (no spot). */
function copier(b: Builder, x: number, y: number): void {
  b.prop("copier", "printer", x, y, y + 26);
  b.poke("copier", "printer", { x, y, w: 30, h: 26 });
  b.prop("copier-bin", "bin", x + 32, y + 10, y + 25);
  b.poke("copier-bin", "bin", { x: x + 32, y: y + 10, w: 16, h: 16 });
}

/** The school garden in the yard: a drinking fountain, recycling, benches among the beds. */
function schoolGarden(b: Builder, r: Rect, walk: number, aisleX: number): void {
  // Drinking fountain at the left, its spot in front; walk around its right side.
  const fx = r.x + 4;
  const fy = walk + 12;
  b.prop("cooler", "cooler", fx, fy, fy + 35);
  b.poke("cooler", "cooler", { x: fx, y: fy, w: 16, h: 36 });
  const sy = fy + 38;
  b.spot({ id: "cooler", kind: "cooler", group: "break", x: fx + 8, y: sy, facing: "back", pose: "cup", path: [{ x: fx + 24, y: walk, c: true }, { x: fx + 24, y: sy }, { x: fx + 8, y: sy }], activity: "chatting at the water cooler" });
  b.prop("yard-bin", "bin", fx + 2, sy + 4, sy + 18);
  b.poke("bin", "bin", { x: fx + 2, y: sy + 4, w: 16, h: 16 });
  // Benches facing you, among the raised beds (the gate and the bus stop are at the right).
  const room = r.w - 34 - 44;
  const n = room >= 150 ? 2 : 1;
  const y = Math.min(r.y + r.h - 6, r.y + 44);
  const acc: Access = { hallY: walk, aisleX };
  for (let i = 0; i < n; i++) {
    const cx = r.x + 34 + Math.round(((i + 0.5) * room) / n);
    b.prop(`bench-${i}`, "bench", cx - 17, y - 15, y - 2);
    for (const [k, dx] of [
      [0, -8],
      [1, 8],
    ] as const) {
      b.spot({ id: `garden-${i}-${k}`, kind: "bench", group: "lounge", x: cx + dx, y, facing: "front", pose: "sit-front", path: via(acc, y - 22, cx + dx, y), activity: "enjoying the garden", lift: 2 });
    }
  }
  if (r.h >= 76) b.plant("PLANT", r.x + 26, r.y + r.h - 32, false);
}

/** Spots on the swings (they sit) and at the slide (they climb up), at the field's edges. */
function playSpots(b: Builder, swings: Rect | null, slide: Rect | null, walk: number): void {
  if (swings) {
    const y = swings.y + swings.h - 4;
    for (const [i, dx] of [9, 21].entries()) {
      const x = swings.x + dx;
      b.spot({ id: `swing-${i}`, kind: "bench", group: "lounge", x, y, facing: "front", pose: "sit-front", path: [{ x: swings.x + swings.w + 4, y: walk, c: true }, { x: swings.x + swings.w + 4, y: y + 4 }, { x, y: y + 4 }, { x, y }], activity: "on the swings", lift: 4 });
    }
  }
  if (slide) {
    const x = slide.x + 6;
    const y = slide.y + slide.h - 2;
    b.spot({ id: "slide", kind: "bench", group: "lounge", x, y, facing: "back", pose: "stand", path: [{ x: slide.x - 4, y: walk, c: true }, { x: slide.x - 4, y: y + 4 }, { x, y: y + 4 }, { x, y }], activity: "waiting for a turn on the slide" });
  }
}

/** Half-walls around open rooms, with doorways where people walk in. */
function wallsFor(b: Builder, rooms: Rect[]): SchoolPlan["walls"] {
  const out: SchoolPlan["walls"] = [];
  for (const r of rooms) {
    const gaps: SchoolPlan["walls"][number]["gaps"] = [];
    const add = (side: "top" | "bottom" | "left" | "right", at: number) => {
      if (!gaps.some((g) => g.side === side && Math.abs(g.at - at) < 12)) gaps.push({ side, at: Math.round(at) });
    };
    for (const s of b.spots) {
      for (let i = 1; i < s.path.length; i++) {
        const p = s.path[i - 1]!;
        const q = s.path[i]!;
        const inP = p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
        const inQ = q.x > r.x && q.x < r.x + r.w && q.y > r.y && q.y < r.y + r.h;
        if (inP === inQ) continue;
        // Where the segment crosses the room's edge.
        if (p.x === q.x) add(Math.min(p.y, q.y) < r.y ? "top" : "bottom", p.x);
        else if (p.y === q.y) add(Math.min(p.x, q.x) < r.x ? "left" : "right", p.y);
      }
    }
    out.push({ rect: r, gaps });
  }
  return out;
}

// ------------------------------------------------------------------ wide

function wide(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const podCols = clamp(Math.floor((W * 0.33) / 48), 3, 6);
  const c1x = 6;
  const c1w = podCols * 48;
  const a12 = c1x + c1w + 8;
  const c3w = clamp(Math.round(W * 0.27), 150, 240);
  const c3x = W - 6 - c3w;
  const a23 = c3x - 8;
  const c2x = a12 + 8;
  const c2w = a23 - 8 - c2x;
  const d1 = 64;
  const d2 = 88;
  const d3 = 70;
  const segments: WallSegment[] = [
    { x0: 0, x1: a12 + 14, depth: d1 },
    { x0: a12 + 14, x1: a23 - 2, depth: d2 },
    { x0: a23 - 2, x1: W, depth: d3 },
  ];
  const wantPods = Math.ceil((threads + 3) / (2 * podCols));
  const midMin = 100;
  const hallFor = (rows: number) => d1 + rows * POD_H + 10;
  // The schoolyard: as big as the building leaves room for (fewer classroom
  // rows up top if needed: a portable classroom goes in the yard instead).
  const yardFor = (rows: number) => H - 14 - (hallFor(rows) + 12 + midMin + 12);
  let rows = clamp(wantPods, 1, 2);
  if (rows === 2 && yardFor(2) < 56) rows = 1;
  const yardInner = yardFor(rows) >= 56 ? Math.min(yardFor(rows), clamp(Math.round(H * 0.24), 56, 160)) : 0;
  const yard = yardInner > 0;
  const walk = yard ? H - 14 - yardInner : 0;
  const front = yard ? walk - 12 : H - 6;
  // The main corridor between the classrooms and the offices.
  const hy = clamp(Math.max(Math.round(d1 + (front - d1) * 0.55), hallFor(rows)), hallFor(1), front - 12 - midMin);
  const net: Network = { halls: yard ? [hy, walk] : [hy], aisles: [a12, a23] };
  const leftAcc: Access = { hallY: hy, aisleX: a12 };
  const open: Rect[] = [];

  // Classrooms along the back wall.
  const classroom: Rect = { x: c1x, y: d1, w: c1w, h: hy - 8 - d1 };
  buildPods(b, classroom, leftAcc);
  // The teacher's corner under the desks, when the classroom has room to spare.
  const corners: Rect[] = [];
  const podRows = Math.max(1, Math.floor((classroom.h + 8) / POD_H));
  const spare = classroom.y + classroom.h - (classroom.y + podRows * POD_H);
  if (spare >= 26) corners.push({ x: c1x + 2, y: classroom.y + podRows * POD_H, w: c1w - 4, h: spare });
  open.push({ x: c1x - 2, y: d1, w: c1w + 4, h: hy - 6 - d1 });

  // Below the corridor on the left: the cafeteria, then more classrooms, the
  // gym and the library as the height allows.
  let below: Rect = { x: c1x, y: hy + 10, w: c1w, h: front - (hy + 10) };
  const kitchenH = clamp(below.h, 64, 92);
  const kitchen: Rect = { x: c1x, y: below.y + 8, w: c1w, h: kitchenH - 8 };
  buildKitchen(b, kitchen, leftAcc);
  open.push({ x: c1x - 2, y: kitchen.y - 10, w: c1w + 4, h: kitchen.h + 12 });
  below = { ...below, y: below.y + kitchenH + 8, h: below.h - kitchenH - 8 };
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  if (below.h >= POD_H && wantPods > b.pods.length) {
    buildPods(b, { ...below, h: POD_H }, leftAcc);
    open.push({ x: c1x - 2, y: below.y - 4, w: c1w + 4, h: POD_H + 2 });
    below = { ...below, y: below.y + POD_H + 6, h: below.h - POD_H - 6 };
  }
  if (below.h >= (yard ? 90 : 104)) {
    games = { ...below, y: below.y + 6, h: Math.min(150, below.h - (yard ? 6 : 46)) };
    gamesParts = buildGames(b, games, leftAcc);
    open.push({ x: c1x - 2, y: games.y - 6, w: c1w + 4, h: games.h + 8 });
    const end = below.y + below.h;
    below = { ...below, y: games.y + games.h, h: end - (games.y + games.h) };
    if (below.h - (yard ? 6 : 46) >= 96) {
      const lib: Rect = { ...below, y: below.y + 14, h: below.h - (yard ? 6 : 46) - 14 };
      buildLibrary(b, lib, leftAcc);
      open.push({ x: c1x - 2, y: lib.y - 10, w: c1w + 4, h: lib.h + 12 });
      below = { ...below, y: lib.y + lib.h, h: end - (lib.y + lib.h) };
    }
  }

  // Center: the library corner under the smartboard, the front office below.
  const tvW = Math.min(c2w - 50, 144);
  const tvH = Math.min(Math.round(tvW * 0.56), d2 - 14);
  const wallTv: Rect = { x: c2x + Math.round((c2w - tvW) / 2), y: d2 - tvH - 6, w: tvW, h: tvH };
  const lounge: Rect = { x: c2x, y: d2, w: c2w, h: hy - 8 - d2 };
  const nook = lounge.h >= (yard ? 206 : 260);
  const loungeTop: Rect = nook ? { ...lounge, h: lounge.h - 94 } : lounge;
  const centerAcc: Access = { hallY: hy, aisleX: a23 };
  const tvParts = buildLounge(b, loungeTop, centerAcc, wallTv, games === null && !nook);
  if (nook) buildLibrary(b, { x: c2x, y: lounge.y + lounge.h - 80, w: c2w, h: 80 }, centerAcc);
  open.push({ x: c2x - 2, y: d2, w: c2w + 4, h: lounge.h + 2 });

  // Right: the teachers' room (the computer lab under it when there's
  // height), the principal's office below the corridor.
  const topH = hy - 8 - d3;
  const serverTop = topH >= 204;
  const meeting: Rect = { x: c3x, y: d3, w: c3w, h: serverTop ? Math.min(230, topH - 54) : topH };
  const whiteboard = buildMeeting(b, meeting, hy);
  if (serverTop) {
    const sy = meeting.y + meeting.h + 8;
    buildServerRoom(b, { x: c3x, y: sy, w: c3w - 28, h: Math.min(64, hy - 10 - sy) });
  }
  if (meeting.h >= 140) copier(b, meeting.x + (meeting.h >= 180 ? 46 : 6), meeting.y + meeting.h - 36);
  const m0 = hy + 12;
  const bossRoom: Rect = { x: c3x, y: m0, w: c3w, h: clamp(front - 4 - m0, 96, 230) };
  const boss = buildBoss(b, bossRoom, hy);
  const underBoss = front - (bossRoom.y + bossRoom.h + 8);
  if (!b.server && underBoss >= 44) buildServerRoom(b, { x: c3x, y: bossRoom.y + bossRoom.h + 8, w: c3w, h: Math.min(56, underBoss) });

  // The front office and its bench, with the computer lab beside it if it still needs a place.
  let wx = c2x;
  if (!b.server && c2w >= 64 + 8 + 120) {
    const sw = clamp(c2w - 8 - 180, 64, 96);
    buildServerRoom(b, { x: c2x, y: m0 + 2, w: sw, h: Math.min(60, front - m0 - 6) });
    wx = c2x + sw + 8;
  }
  const waiting: Rect = { x: wx, y: m0, w: c2x + c2w - wx, h: front - m0 };
  buildWaiting(b, waiting, hy);

  // The yard: a portable classroom or the playground on the left, the field
  // in the middle (with swings and a slide), the school garden on the right.
  let plan: SchoolPlan;
  let eventArea: Rect;
  if (yard) {
    const y0 = walk + 10;
    const yardRect: Rect = { x: 0, y: walk + 6, w: W, h: H - (walk + 6) };
    let portable: Rect | null = null;
    let playground: Rect | null = null;
    if (wantPods > b.pods.length && yardInner >= 100) {
      portable = { x: c1x, y: y0 + 2, w: c1w, h: Math.min(POD_H, yardInner - 2) };
      buildPods(b, portable, { hallY: walk, aisleX: a12 });
      // Room left under the portable: hopscotch and four square.
      const left = yardInner - 2 - portable.h - 10;
      if (left >= 36) playground = { x: c1x, y: portable.y + portable.h + 10, w: c1w, h: left };
    } else playground = { x: c1x, y: y0, w: c1w, h: yardInner };
    const field: Rect = { x: c2x, y: y0, w: c2w, h: yardInner };
    const side = c2w >= 180 ? 34 : 0;
    const swings = side ? { x: c2x + 2, y: y0 + Math.max(0, yardInner - 46), w: 30, h: 40 } : null;
    const slide = side ? { x: c2x + c2w - 30, y: y0 + Math.max(0, yardInner - 46), w: 28, h: 40 } : null;
    playSpots(b, swings, slide, walk);
    eventArea = { x: c2x + side + 4, y: y0 + 4, w: c2w - side * 2 - 8, h: yardInner - 8 };
    const garden: Rect = { x: c3x, y: y0, w: c3w, h: yardInner };
    schoolGarden(b, garden, walk, a23);
    plan = { corridor: hy, front, walk, yard: yardRect, field, swings, slide, playground, portable, garden, gate: { x: W - 22, y: H - 4 }, corners, walls: [] };
  } else {
    // No yard: events in the library corner (or the gym), the water fountain by the cafeteria.
    if (below.h >= 40) utilities(b, front + 6, c1x + 4, hy);
    const couch = tvParts.couch;
    const loungeFree = loungeTop.y + loungeTop.h - (couch.y + couch.h + 6);
    const loungeFloor: Rect = { x: lounge.x + 16, y: couch.y + couch.h + 4, w: lounge.w - 32, h: Math.max(26, loungeFree) };
    eventArea = loungeFree >= 70 || games === null ? loungeFloor : games;
    plan = { corridor: hy, front, walk: null, yard: null, field: null, swings: null, slide: null, playground: null, portable: null, garden: null, gate: null, corners, walls: [] };
  }
  b.plant("PLANT_2", a23 - 8, hy - 34);
  if (!serverTop) b.plant("PLANT", W - 18, hy - 26);
  plan.walls = wallsFor(b, open);
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
  return withGate(L, plan);
}

// ------------------------------------------------------------------ portrait

function portrait(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const aisleX = W - 8;
  const innerW = W - 20;
  const x0 = 6;
  const segments: WallSegment[] = [
    { x0: 0, x1: Math.round(W * 0.42), depth: 64 },
    { x0: Math.round(W * 0.42), x1: Math.round(W * 0.7), depth: 54 },
    { x0: Math.round(W * 0.7), x1: W, depth: 70 },
  ];
  const top = 70;
  const gap = 16;
  type Kind = "podA" | "kitchenMeeting" | "lounge" | "podB" | "games" | "library" | "office" | "yard";
  type Row = { kind: Kind; min: number; grow: number };
  const podCols = Math.max(2, Math.floor(innerW / 48));
  const rows: Row[] = [
    { kind: "podA", min: POD_H, grow: 0 },
    { kind: "kitchenMeeting", min: 112, grow: 1 },
    { kind: "lounge", min: 136, grow: 1 },
    { kind: "office", min: 136, grow: 1.2 },
  ];
  const needPods = Math.ceil((threads + 3) / (2 * podCols));
  const used = () => rows.reduce((s, r) => s + r.min, 0) + gap * rows.length;
  const fits = (r: Row) => top + used() + r.min + gap <= H - 6;
  const yardRow: Row = { kind: "yard", min: 80, grow: 0.8 };
  if (needPods >= 2) {
    const podB: Row = { kind: "podB", min: POD_H, grow: 0 };
    if (fits(podB)) rows.splice(rows.length - 1, 0, podB);
  }
  if (fits(yardRow)) rows.push(yardRow);
  for (const o of [
    { kind: "games", min: 86, grow: 0.5 },
    { kind: "library", min: 86, grow: 0.3 },
  ] as Row[]) {
    if (fits(o) && H - 6 - top - used() >= o.min + gap + 60) rows.splice(rows.findIndex((r) => r.kind === "office"), 0, o);
  }
  const extra = Math.max(0, H - 6 - top - used());
  const growSum = rows.reduce((s, r) => s + r.grow, 0) || 1;
  const halls: number[] = [];
  const plan: { row: Row; rect: Rect; hallY: number }[] = [];
  let y = top;
  const officeIndex = rows.findIndex((r) => r.kind === "office");
  rows.forEach((row, i) => {
    const h = row.min + Math.floor((extra * row.grow) / growSum);
    const rect: Rect = { x: x0, y, w: innerW, h };
    // Rows above the office open onto the hallway below them; the office and the yard onto the one above.
    const hallY = i >= officeIndex ? y - gap / 2 : y + h + gap / 2;
    plan.push({ row, rect, hallY });
    if (i < officeIndex || row.kind === "office") halls.push(i < officeIndex ? y + h + gap / 2 : -1);
    if (row.kind === "office" && rows[i + 1]?.kind === "yard") halls.push(y + h + gap / 2);
    y += h + gap;
  });
  const net: Network = { halls: [...new Set(halls.filter((v) => v > 0))], aisles: [aisleX] };
  let kitchen: Rect | null = null;
  let lounge: Rect | null = null;
  let meeting: Rect | null = null;
  let whiteboard: Rect | null = null;
  let waiting: Rect | null = null;
  let boss: Layout["boss"] | null = null;
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  let tvParts: ReturnType<typeof buildLounge> | null = null;
  let yardPlan: Pick<SchoolPlan, "walk" | "yard" | "field" | "swings" | "slide" | "playground" | "garden" | "gate"> | null = null;
  let eventArea: Rect | null = null;
  let front = H - 6;
  const open: Rect[] = [];
  for (const { row, rect, hallY } of plan) {
    const acc: Access = { hallY, aisleX };
    switch (row.kind) {
      case "podA":
      case "podB":
        buildPods(b, { ...rect, h: Math.min(rect.h, POD_H) }, acc);
        open.push({ x: rect.x - 2, y: rect.y - (row.kind === "podA" ? 0 : 4), w: rect.w + 4, h: Math.min(rect.h, POD_H) + 2 });
        break;
      case "kitchenMeeting": {
        const kw = Math.round(rect.w * 0.54);
        kitchen = { x: rect.x, y: rect.y, w: kw - 6, h: rect.h };
        buildKitchen(b, { ...kitchen, y: kitchen.y + 10, h: kitchen.h - 10 }, { hallY, aisleX: rect.x + kw - 1 });
        open.push({ x: rect.x - 2, y: rect.y - 4, w: kw - 4, h: rect.h + 6 });
        meeting = { x: rect.x + kw + 4, y: rect.y, w: rect.w - kw - 4, h: rect.h - 4 };
        whiteboard = buildMeeting(b, meeting, hallY);
        if (meeting.h >= 140) copier(b, meeting.x + 6, meeting.y + meeting.h - 36);
        break;
      }
      case "lounge":
        lounge = rect;
        tvParts = buildLounge(b, rect, acc, null, !rows.some((r) => r.kind === "games" || r.kind === "library"), !rows.some((r) => r.kind === "games"));
        open.push({ x: rect.x - 2, y: rect.y - 4, w: rect.w + 4, h: rect.h + 6 });
        break;
      case "games":
        games = rect;
        gamesParts = buildGames(b, { ...rect, y: rect.y + 6, h: rect.h - 6 }, acc);
        open.push({ x: rect.x - 2, y: rect.y, w: rect.w + 4, h: rect.h + 2 });
        break;
      case "library":
        buildLibrary(b, { ...rect, y: rect.y + 8, h: rect.h - 8 }, acc);
        open.push({ x: rect.x - 2, y: rect.y, w: rect.w + 4, h: rect.h + 2 });
        break;
      case "office": {
        // The principal on the left, the front office bench on the right with the computer lab under it.
        const bw = clamp(Math.round(rect.w * 0.44), 150, rect.w - 120);
        const bossRoom: Rect = { x: rect.x, y: rect.y + 4, w: bw, h: rect.h - 8 };
        boss = buildBoss(b, bossRoom, hallY);
        const wx = rect.x + bw + 8;
        const ww = rect.x + rect.w - wx;
        const lab = rect.h - 4 >= 84 + 48 ? Math.min(56, rect.h - 4 - 84 - 6) : 0;
        waiting = { x: wx, y: rect.y + 4, w: ww, h: rect.h - 4 - (lab ? lab + 6 : 0) };
        buildWaiting(b, waiting, hallY);
        if (lab >= 40) buildServerRoom(b, { x: wx, y: waiting.y + waiting.h + 6, w: ww - 6, h: lab });
        front = rect.y + rect.h;
        break;
      }
      case "yard": {
        const walk = hallY;
        const y0 = rect.y + 2;
        const ih = rect.h - 2;
        const swings: Rect = { x: rect.x + 2, y: y0 + Math.max(0, ih - 44), w: 30, h: 40 };
        const fountainX = rect.x + 40;
        const field: Rect = { x: rect.x + 64, y: y0, w: rect.w - 64 - 30, h: ih };
        eventArea = { x: field.x + 4, y: y0 + 4, w: field.w - 8, h: ih - 10 };
        playSpots(b, swings, null, walk);
        // Drinking fountain and recycling between the swings and the field.
        const fy = walk + 12;
        b.prop("cooler", "cooler", fountainX, fy, fy + 35);
        b.poke("cooler", "cooler", { x: fountainX, y: fy, w: 16, h: 36 });
        const sy = Math.min(fy + 38, H - 4);
        b.spot({ id: "cooler", kind: "cooler", group: "break", x: fountainX + 8, y: sy, facing: "back", pose: "cup", path: [{ x: fountainX + 22, y: walk, c: true }, { x: fountainX + 22, y: sy }, { x: fountainX + 8, y: sy }], activity: "chatting at the water cooler" });
        yardPlan = { walk, yard: { x: 0, y: walk + 6, w: W, h: H - (walk + 6) }, field, swings, slide: null, playground: null, garden: null, gate: { x: W - 20, y: H - 4 } };
        break;
      }
    }
  }
  if (!b.server && waiting) {
    // Short phones: the computer lab under the bench if there's any room.
    const w0 = waiting as Rect;
    const t0 = w0.y + w0.h + 6;
    if (H - 4 - t0 >= 34 && !yardPlan) buildServerRoom(b, { x: w0.x, y: t0, w: w0.w - 6, h: Math.min(48, H - 4 - t0) });
  }
  const yp = yardPlan as Pick<SchoolPlan, "walk" | "yard" | "field" | "swings" | "slide" | "playground" | "garden" | "gate"> | null;
  const area: Rect = eventArea ?? games ?? { x: lounge!.x + 10, y: tvParts!.couch.y + 30, w: lounge!.w - 20, h: Math.max(30, lounge!.y + lounge!.h - tvParts!.couch.y - 30) };
  const school: SchoolPlan = {
    corridor: net.halls[0]!,
    front,
    walk: yp?.walk ?? null,
    yard: yp?.yard ?? null,
    field: yp?.field ?? null,
    swings: yp?.swings ?? null,
    slide: null,
    playground: null,
    portable: null,
    garden: null,
    gate: yp?.gate ?? null,
    corners: [],
    walls: wallsFor(b, open),
  };
  const L = finish(b, W, H, true, segments, net, {
    meeting: meeting!,
    whiteboard: whiteboard!,
    boss: boss!,
    waiting: waiting!,
    kitchen: kitchen!,
    lounge: lounge!,
    games,
    eventArea: area,
    tvParts: tvParts!,
    gamesParts,
    doorX: aisleX,
    lamp: boss!.lamp,
  });
  return withGate(L, school);
}

/** Move the way in to the yard gate (by the bus stop) when there is a yard. */
function withGate(L: Layout, plan: SchoolPlan): Layout {
  L.themeData = { school: plan };
  // Events happen out in the yard only when there is one.
  if (plan.yard && L.eventArea.y >= plan.yard.y) L.words = { "in the lounge": "out in the schoolyard" };
  if (!plan.gate || plan.walk === null) return L;
  const gx = plan.gate.x;
  const door: Rect = { x: gx - 10, y: L.H - 46, w: 20, h: 42 };
  L.wall.door = door;
  const entrance: Point = { x: gx, y: L.H - 6 };
  L.entrance = entrance;
  L.entrancePath = [{ x: gx, y: plan.walk, c: true }, entrance];
  return L;
}

export function schoolLayout(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return opts.portrait ? portrait(W, H, opts.threads) : wide(W, H, opts.threads);
}

export type { Spot };
