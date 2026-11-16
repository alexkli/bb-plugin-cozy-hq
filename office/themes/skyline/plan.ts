// Sky Loft: the penthouse floor plan. An elevator core in the middle of the
// north wall, glass all round, the boardroom and your corner office against
// the skyline, the espresso bar, a lounge, desks along the west glass and an
// outdoor terrace with the city far below (where the office gets together).
import type { Layout, Rect, WallSegment } from "../../layout.ts";
import {
  bossToys,
  Builder,
  buildGames,
  buildGarden,
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
  via,
  type Access,
  type Network,
} from "../../themekit.ts";

export type SegKind = "glass" | "core" | "feature";

/** What the backdrop needs to know about the plan (L.themeData). */
export interface SkyPlan {
  variant: "tall" | "short" | "portrait";
  /** The kind of each north wall segment, by index. */
  segKinds: SegKind[];
  /** The outdoor deck (null when there's no room for one). */
  terrace: Rect | null;
  /** Beyond the balustrade: the city far below. */
  beyond: Rect[];
  /** Glass balustrade runs (rects on the deck edge). */
  rails: Rect[];
  /** The glass wall between inside and the terrace, with open doors. */
  terraceWall: { x0: number; x1: number; y: number; gaps: [number, number][] } | null;
  terraceSide: { x: number; y0: number; y1: number; gaps: [number, number][] } | null;
  /** Glass bands along the panel's west, east and south edges (inside). */
  glassLeft: [number, number][];
  glassRight: [number, number][];
  glassBottom: [number, number][];
  /** Where the fire table, loungers and planters go on the terrace. */
  fire: Rect | null;
  loungers: { x: number; y: number }[];
  /** The hot tub on the terrace, and the telescope by the rail. */
  tub: Rect | null;
  scope: { x: number; y: number } | null;
  /** Width of the city strip outside the west and east glass, height of the one outside the south glass. */
  edgeX: number;
  edgeY: number;
}

export function planOf(L: Layout): SkyPlan | null {
  const d = L.themeData as SkyPlan | undefined;
  return d && Array.isArray(d.segKinds) ? d : null;
}

// ------------------------------------------------------------------ rooms

/** Your corner office: door at the bottom left, the skyline behind the desk. */
function buildCornerOffice(b: Builder, r: Rect, hallY: number): Layout["boss"] {
  const doorX = r.x + 16;
  b.rooms.push({ kind: "boss", rect: r, walls: "wood", doorX, doorSide: "bottom" });
  const deskW = 60;
  const desk: Rect = { x: r.x + Math.round((r.w - deskW) / 2) + 10, y: r.y + Math.min(30, Math.round(r.h * 0.24)), w: deskW, h: 26 };
  const seat = { x: desk.x + deskW / 2, y: desk.y + 4 };
  b.prop("boss-chair", "boss-chair", seat.x - 10, desk.y - 22, desk.y - 1);
  b.prop("boss-desk", "boss-desk", desk.x, desk.y, desk.y + 22, deskW);
  b.poke("boss", "boss", { x: seat.x - 9, y: desk.y - 24, w: 18, h: 24 });
  const guestY = desk.y + 44;
  const lane = Math.min(r.y + r.h - 8, guestY + 12);
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
      path: [{ x: doorX, y: hallY, c: true }, { x: doorX, y: r.y + r.h + 3 }, { x: doorX, y: lane }, { x, y: lane }, { x, y: guestY }],
      activity: "going over a draft with you",
    });
    b.prop(`guest-chair-${i}`, "guest-chair", x - 8, guestY - 14, guestY + 2);
  }
  // A shelf with the globe in the far corner, the lamp by the glass, a fig.
  const shelfY = r.y + r.h - 42;
  b.prop("boss-shelf", "library-shelf", r.x + r.w - 36, shelfY, shelfY + 30);
  b.poke("globe", "globe", { x: r.x + r.w - 36, y: shelfY - 12, w: 32, h: 14 });
  b.plant("LARGE_PLANT", r.x + r.w - 34, r.y - 4);
  const dogBed = { x: r.x + 52, y: r.y + r.h - 10 };
  b.prop("dog-bed", "dog-bed", dogBed.x - 12, dogBed.y - 8, dogBed.y - 6);
  b.prop("boss-glass", "glass-front", r.x, r.y + r.h - 10, r.y + r.h + 1, r.w);
  b.prop("lamp", "lamp", r.x + 4, r.y + 2, r.y + 52);
  b.poke("lamp", "lamp", { x: r.x + 4, y: r.y + 2, w: 16, h: 52 });
  return bossToys(b, { room: r, seat, desk, dogBed, lamp: { x: r.x + 12, y: r.y + 4 } });
}

/** The sparkling water tap, printer and bin in a row, standing at baseY, reached straight from a hall. */
function utilitiesAt(b: Builder, x: number, baseY: number, hallY: number): void {
  b.prop("cooler", "cooler", x, baseY - 36, baseY - 1);
  b.poke("cooler", "cooler", { x, y: baseY - 36, w: 16, h: 36 });
  b.prop("printer", "printer", x + 22, baseY - 26, baseY);
  b.poke("printer", "printer", { x: x + 22, y: baseY - 26, w: 30, h: 26 });
  b.prop("bin", "bin", x + 54, baseY - 14, baseY + 1);
  b.poke("bin", "bin", { x: x + 54, y: baseY - 14, w: 16, h: 16 });
  b.spot({ id: "cooler", kind: "cooler", group: "break", x: x + 8, y: baseY + 4, facing: "back", pose: "cup", path: [{ x: x + 8, y: hallY, c: true }, { x: x + 8, y: baseY + 4 }], activity: "chatting at the water cooler" });
}

/** The terrace out to the building's edge: a glass balustrade, the fire table, a hot tub, loungers by the rail; returns the event area. */
function buildTerrace(b: Builder, r: Rect, plan: SkyPlan, acc: Access, opts: { right: boolean; bottom: boolean; left?: boolean }): Rect {
  const deck: Rect = { x: r.x + (opts.left ? 3 : 0), y: r.y, w: r.w - (opts.right ? 3 : 0) - (opts.left ? 3 : 0), h: r.h - (opts.bottom ? 3 : 0) };
  plan.terrace = deck;
  if (opts.right) plan.rails.push({ x: deck.x + deck.w, y: r.y - 6, w: 3, h: r.h + 6 });
  if (opts.left) plan.rails.push({ x: r.x, y: r.y - 6, w: 3, h: r.h + 6 });
  if (opts.bottom) plan.rails.push({ x: r.x - (opts.left ? 0 : 6), y: deck.y + deck.h, w: r.w + (opts.left ? 0 : 6), h: 3 });
  // Sun loungers along the rail facing the view (for long naps outdoors).
  const loungers = deck.w >= 120 && deck.h >= 96 ? 2 : deck.h >= 80 ? 1 : 0;
  const lx = deck.x + deck.w - 18;
  for (let i = 0; i < loungers; i++) {
    const y = deck.y + 30 + i * 34;
    plan.loungers.push({ x: lx, y });
    b.spot({ id: `lounger-${i + 1}`, kind: "bench", group: "nap", x: lx, y, facing: "front", pose: "nap", path: via(acc, y + 8, lx, y), activity: "dozing on a sun lounger" });
  }
  // The fire table at the top of the deck, a hot tub under it.
  const fireW = Math.min(56, deck.w - 70);
  if (fireW >= 32 && deck.h >= 70) plan.fire = { x: deck.x + 12, y: deck.y + 8, w: fireW, h: 12 };
  const top = plan.fire ? plan.fire.y + 22 : deck.y + 8;
  let areaX = deck.x + 8;
  if (deck.w >= 150 && deck.h >= 96) {
    const tub: Rect = { x: deck.x + 6, y: top + 2, w: 44, h: 30 };
    plan.tub = tub;
    for (const [i, dx] of [12, 31].entries()) {
      const sx = tub.x + dx;
      const sy = tub.y + 22;
      b.spot({ id: `hot-tub-${i + 1}`, kind: "bench", group: "lounge", x: sx, y: sy, facing: "front", pose: "sit-front", path: via(acc, tub.y + tub.h + 6, sx, sy), activity: "soaking in the hot tub" });
    }
    areaX = tub.x + tub.w + 8;
  }
  const right = loungers > 0 ? lx - 16 : deck.x + deck.w - 8;
  const fullH = deck.y + deck.h - 6 - top;
  const area: Rect = { x: areaX, y: top, w: Math.max(60, right - areaX), h: Math.max(26, Math.min(fullH, 104)) };
  if (deck.h >= 110 && loungers > 0) plan.scope = { x: deck.x + deck.w - 14, y: deck.y + deck.h - 5 };
  // A long deck: a lawn with benches facing the view below the open floor.
  const lawnY = area.y + area.h + 26;
  const lawnH = deck.y + deck.h - 4 - lawnY;
  if (lawnH >= 84 && deck.w >= 110) {
    buildGarden(b, { x: deck.x + 6, y: lawnY, w: deck.w - 12, h: lawnH }, acc);
  } else {
    // An olive tree in a planter in the corner.
    b.plant("PLANT", deck.x + 2, deck.y + deck.h - 34, false);
    if (deck.w >= 140 && !plan.scope) b.plant("PLANT", deck.x + deck.w - 18, deck.y + deck.h - 34, false);
  }
  return area;
}

/** The city outside the west, east and south glass. */
function addEdges(plan: SkyPlan, W: number, H: number, top: number): void {
  const E = plan.edgeX;
  const EB = plan.edgeY;
  if (E >= 8) plan.beyond.push({ x: 0, y: top, w: E, h: H - top }, { x: W - E, y: top, w: E, h: H - top });
  if (EB >= 8) plan.beyond.push({ x: 0, y: H - EB, w: W, h: EB });
}

// ------------------------------------------------------------------ wide

function windowsIn(x0: number, x1: number, y: number, h: number, avoid: [number, number][] = []): Rect[] {
  const out: Rect[] = [];
  let runs: [number, number][] = [[x0 + 8, x1 - 8]];
  for (const [a, z] of avoid) {
    runs = runs.flatMap(([s, e]) => (z <= s || a >= e ? [[s, e] as [number, number]] : ([[s, a - 6], [z + 6, e]] as [number, number][]).filter(([p, q]) => q - p >= 30)));
  }
  for (const [s, e] of runs) {
    const len = e - s;
    const n = Math.max(1, Math.floor((len + 8) / 52));
    const w = Math.floor((len - (n - 1) * 8) / n);
    if (w < 28) continue;
    for (let i = 0; i < n; i++) out.push({ x: s + i * (w + 8), y, w, h });
  }
  return out;
}

function widePlan(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const tall = H >= 400;
  const D = 64;
  const DC = tall ? 96 : 88;
  const podCols = clamp(Math.floor((W * 0.3) / 48), 4, 6);
  const wL = podCols * 48;
  // The floor stops short of the panel's sides: the city far below shows through the glass.
  const E = tall ? clamp(12 + Math.floor((W - 600) / 10), 12, 20) : clamp(Math.floor((W - 600) / 3), 0, 18);
  const X0 = E + 6;
  const X1 = W - E - 6;
  const inner = X1 - X0;
  // Short panels need room for the espresso bar and reception side by side in the middle; tall ones for the lounge.
  const wR = clamp(Math.min(Math.round(W * (tall ? 0.3 : 0.27)), inner - wL - 32 - (tall ? 180 : 214)), 150, 250);
  const a1 = X0 + wL + 8;
  const a2 = X1 - wR - 8;
  const cx0 = a1 + 8;
  const wC = a2 - 8 - cx0;
  const rx0 = a2 + 14;
  const rW = X1 - rx0;
  const coreX0 = a1 - 6;
  const coreX1 = a2 + 12;
  const segments: WallSegment[] = [
    { x0: 0, x1: coreX0, depth: D },
    { x0: coreX0, x1: coreX1, depth: DC },
    { x0: coreX1, x1: W, depth: D },
  ];
  const plan: SkyPlan = {
    variant: tall ? "tall" : "short",
    segKinds: [tall ? "glass" : "feature", "core", "glass"],
    terrace: null,
    beyond: [],
    rails: [],
    terraceWall: null,
    terraceSide: null,
    glassLeft: [],
    glassRight: [],
    glassBottom: [],
    fire: null,
    loungers: [],
    tub: null,
    scope: null,
    edgeX: E,
    edgeY: 0,
  };
  const topH = tall ? clamp(Math.round((H - D) * 0.4), 118, 160) : clamp(Math.round(H * 0.58) - D - 10, 104, H - 100 - D - 10);
  const hy = D + 2 + topH + 8;
  const net: Network = { halls: [hy], aisles: [a1, a2] };
  const accL: Access = { hallY: hy, aisleX: a1 };
  const accR: Access = { hallY: hy, aisleX: a2 };
  const y0 = hy + 10;
  const EB0 = tall ? 16 : clamp(H - 4 - y0 - 104, 0, 16);
  const EB = EB0 >= 10 ? EB0 : 0;
  plan.edgeY = EB;
  const FB = H - EB;
  const bottomH = FB - 4 - y0;

  // ---- above the hallway
  const meeting: Rect = { x: X0, y: D + 2, w: wL, h: topH };
  const whiteboard = buildMeeting(b, meeting, hy);
  const bossRoom: Rect = { x: rx0, y: D + 2, w: rW, h: topH };
  const boss = buildCornerOffice(b, bossRoom, hy);
  let waiting: Rect;
  let lounge: Rect;
  let tvParts: ReturnType<typeof buildLounge>;
  let kitchen: Rect;
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  let wallTv: Rect | undefined;
  let eventArea: Rect;

  if (tall) {
    // The reception lobby in front of the elevators.
    waiting = { x: cx0, y: DC + 4, w: wC, h: hy - 8 - (DC + 4) };
    buildWaiting(b, waiting, hy);
    const islandsEnd = waiting.y + 50 + 25 + (waiting.h >= 152 ? 72 : 0);
    if (waiting.y + waiting.h - islandsEnd >= 44 && wC >= 160) utilitiesAt(b, a2 - 8 - 74, waiting.y + waiting.h - 4, hy);
    // Below: desks along the west glass, the lounge, the espresso bar, the terrace.
    const wantRows = Math.ceil((threads + 3) / (2 * podCols));
    const fitRows = Math.max(1, Math.floor((bottomH + 4) / POD_H));
    const rows = clamp(wantRows, 1, fitRows);
    buildPods(b, { x: X0, y: y0, w: wL, h: rows * POD_H - 4 }, accL);
    let leftY = y0 + rows * POD_H + 4;
    // Center: the lounge (TV on a console), a games room beside it when wide.
    const splitGames = wC >= 400;
    const lw = splitGames ? Math.max(200, Math.round(wC * 0.52)) : wC;
    const tvW = Math.min(128, lw - 70);
    const tvH = Math.round(tvW * 0.56);
    // Keep room under the lounge for the server closet when it's tight.
    const roomy = bottomH - (tvH + 104) - 8 >= 48 || splitGames;
    const loungeH = Math.min(bottomH, tvH + (roomy ? 104 : 86));
    lounge = { x: cx0, y: y0, w: lw, h: loungeH };
    tvParts = buildLounge(b, lounge, accL, null, true);
    if (splitGames) {
      games = { x: cx0 + lw + 10, y: y0 + 8, w: wC - lw - 10, h: Math.min(150, bottomH - 8) };
      gamesParts = buildGames(b, games, { hallY: hy, aisleX: cx0 + lw + 5 });
    }
    // Right: the espresso bar, then the terrace out to the edge.
    const kH = clamp(Math.round(bottomH * 0.42), 72, 92);
    kitchen = { x: rx0, y: y0 + 8, w: rW, h: kH - 8 };
    buildKitchen(b, kitchen, accR);
    const tY = y0 + kH + 12;
    eventArea = buildTerrace(b, { x: rx0, y: tY, w: W - E - rx0, h: FB - tY }, plan, accR, { right: true, bottom: true });
    plan.terraceWall = { x0: a2 + 6, x1: W - E, y: tY - 6, gaps: [[rx0 + 10, rx0 + 46]] };
    plan.terraceSide = { x: a2 + 6, y0: tY - 6, y1: FB, gaps: [] };
    // The rest of the center: a games room when there's height, the server closet by the aisle.
    let cY = lounge.y + lounge.h + 8;
    if (!splitGames && FB - 6 - cY >= 172 && lw >= 150) {
      games = { x: cx0, y: cY + 8, w: lw, h: Math.min(150, FB - 6 - cY - 66) };
      gamesParts = buildGames(b, games, accL);
      cY = games.y + games.h + 8;
    }
    const cBottom = FB - 6 - cY;
    if (cBottom >= 40) {
      const sw = Math.min(150, lw - 10);
      buildServerRoom(b, { x: splitGames ? cx0 + 2 : a2 - 8 - sw, y: cY, w: sw, h: Math.min(56, cBottom) });
    }
    // The rest of the west column: the library, or the server closet.
    const leftRest = FB - 6 - leftY;
    if (!b.server && leftRest >= 40) {
      buildServerRoom(b, { x: X0 + 8, y: leftY, w: Math.min(wL - 16, 150), h: Math.min(56, leftRest) });
      leftY += Math.min(56, leftRest) + 8;
    } else if (leftRest >= 96) {
      buildLibrary(b, { x: X0, y: leftY + 12, w: wL, h: Math.min(110, leftRest - 12) }, accL);
      leftY += Math.min(110, leftRest - 12) + 12;
    }
    if (splitGames && games) {
      const under = FB - 6 - (games.y + games.h + 12);
      if (under >= 96) buildGarden(b, { x: games.x, y: games.y + games.h + 26, w: games.w, h: Math.min(120, under - 14) }, { hallY: hy, aisleX: games.x - 5 });
    }
    plan.glassLeft.push([D, FB]);
    plan.glassRight.push([D, tY - 6]);
    plan.glassBottom.push([E, a2 + 6]);
  } else {
    // Short panels: the lounge under the TV on the core, the reception below.
    const tvW = Math.min(wC - 50, 144);
    const tvH = Math.min(Math.round(tvW * 0.56), DC - 14);
    wallTv = { x: cx0 + Math.round((wC - tvW) / 2), y: DC - tvH - 6, w: tvW, h: tvH };
    lounge = { x: cx0, y: DC, w: wC, h: hy - 8 - DC };
    tvParts = buildLounge(b, lounge, accL, wallTv, false);
    buildPods(b, { x: X0, y: y0, w: wL, h: bottomH }, accL);
    const kw = clamp(Math.round(wC * 0.56), 120, wC - 94);
    kitchen = { x: cx0, y: y0 + 8, w: kw, h: Math.min(92, bottomH - 8) };
    buildKitchen(b, kitchen, accL);
    waiting = { x: cx0 + kw + 8, y: y0 + 4, w: wC - kw - 8, h: bottomH - 4 };
    buildWaiting(b, waiting, hy);
    // The server closet by the aisle, the terrace beyond it.
    let tx = rx0;
    if (rW >= 170 && bottomH >= 60) {
      buildServerRoom(b, { x: rx0, y: y0 + 8, w: 50, h: Math.min(52, bottomH - 12) });
      tx = rx0 + 58;
    }
    eventArea = buildTerrace(b, { x: tx, y: y0 + 4, w: W - E - tx, h: FB - y0 - 4 }, plan, { hallY: hy, aisleX: tx - 5 }, { right: true, bottom: true });
    plan.terraceWall = { x0: tx - 6, x1: W - E, y: y0 - 2, gaps: [[tx + 10, tx + 50]] };
    plan.terraceSide = { x: tx - 6, y0: y0 - 2, y1: FB, gaps: [] };
    plan.glassLeft.push([D, FB]);
    plan.glassRight.push([D, y0 - 2]);
    plan.glassBottom.push([E, tx - 6]);
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
    doorX: a2,
    lamp: boss.lamp,
    wallTv,
  });
  dressWall(L, plan, segments, a2, wallTv);
  cutDoors(L, plan);
  addEdges(plan, W, H, D);
  L.themeData = plan;
  L.words = { "in the lounge": "on the terrace" };
  return L;
}

/** Open the terrace's glass wherever a path or the event lane passes through it. */
function cutDoors(L: Layout, plan: SkyPlan): void {
  const ev = L.eventArea;
  const lane = ev.y + ev.h + 2;
  const segs: [{ x: number; y: number }, { x: number; y: number }][] = [];
  for (const s of L.spots) for (let i = 1; i < s.path.length; i++) segs.push([s.path[i - 1]!, s.path[i]!]);
  for (const x of L.net.aisles) segs.push([{ x, y: lane }, { x: ev.x + ev.w, y: lane }]);
  const side = plan.terraceSide;
  if (side) {
    for (const [a, z] of segs) {
      if (a.y !== z.y || a.y < side.y0 || a.y > side.y1) continue;
      if ((a.x - side.x) * (z.x - side.x) < 0) side.gaps.push([a.y - 12, a.y + 6]);
    }
  }
  const wall = plan.terraceWall;
  if (wall) {
    for (const [a, z] of segs) {
      if (a.x !== z.x || a.x < wall.x0 || a.x > wall.x1) continue;
      if ((a.y - wall.y) * (z.y - wall.y) < 0) wall.gaps.push([a.x - 9, a.x + 9]);
    }
  }
}

/** Wall fixtures where the Sky Loft wants them: the core holds the board, the elevator and the clock; glass elsewhere. */
function dressWall(L: Layout, plan: SkyPlan, segments: WallSegment[], doorX: number, wallTv: Rect | undefined): void {
  // finish() hung plants and windows the classic way: redo them.
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
  L.wall.paintings = [];
  const coreI = plan.segKinds.indexOf("core");
  const core = segments[coreI]!;
  const door: Rect = { x: doorX - 10, y: core.depth - 42, w: 20, h: 42 };
  L.wall.door = door;
  L.wall.legendNote = { x: door.x - 16, y: door.y + 8, w: 12, h: 12 };
  L.entrance = { x: doorX, y: core.depth + 2 };
  L.entrancePath = [{ x: doorX, y: L.net.halls[0]!, c: true }, L.entrance];
  const windows: Rect[] = [];
  if (plan.variant === "tall") {
    const top = core.depth - 60;
    L.wall.pinboard = { x: core.x0 + 10, y: top, w: 128, h: 53 };
    L.wall.calendar = { x: core.x0 + 146, y: top + 2, w: 20, h: 22 };
    L.wall.status = { x: core.x0 + 146, y: top + 27, w: 20, h: 18 };
    // The clock right after the board; a second elevator by the real one when there's room.
    const free1 = L.wall.legendNote.x - 4;
    L.wall.clock = { x: core.x0 + 186, y: top + 14, r: 9 };
    if (free1 - (core.x0 + 172) < 24) L.wall.clock = { x: segments[2]!.x0 + 16, y: 18, r: 9 };
  } else {
    // The boardroom's walnut wall carries the board; the core carries the TV.
    const feature = segments[0]!;
    L.wall.pinboard = { x: 10, y: 3, w: 128, h: Math.min(53, feature.depth - 11) };
    const calX = feature.x1 - 10 >= 172 ? 146 : core.x0 + 8;
    L.wall.calendar = { x: calX, y: 6, w: 20, h: 22 };
    L.wall.status = { x: calX, y: 31, w: 20, h: 18 };
    L.wall.clock = { x: segments[2]!.x0 + 16, y: 18, r: 9 };
    if (feature.x1 - 154 >= 44) windows.push(...windowsIn(feature.x0 + 146 + (calX === 146 ? 24 : 0), feature.x1, 6, feature.depth - 24));
  }
  for (const [i, sg] of segments.entries()) {
    if (plan.segKinds[i] !== "glass") continue;
    const avoid: [number, number][] = [];
    const c = L.wall.clock;
    if (c.x >= sg.x0 && c.x < sg.x1) avoid.push([c.x - 12, c.x + 12]);
    windows.push(...windowsIn(sg.x0, sg.x1, 6, sg.depth - 24, avoid));
  }
  L.wall.windows = windows;
  L.wall.pillars = segments.slice(1).map((s) => s.x0);
  // A couple of hanging plants on the core, clear of the fixtures.
  const busy: [number, number][] = [
    [L.wall.pinboard.x - 4, L.wall.pinboard.x + L.wall.pinboard.w + 4],
    [L.wall.calendar.x - 4, L.wall.calendar.x + 24],
    [L.wall.legendNote.x - 4, door.x + door.w + 4],
    [L.wall.clock.x - 12, L.wall.clock.x + 12],
  ];
  if (wallTv) busy.push([wallTv.x - 18, wallTv.x + wallTv.w + 18]);
  let hung = 0;
  for (let x = core.x0 + 10; x + 16 <= core.x1 - 10 && hung < 2; x += 4) {
    if (busy.some(([a, z]) => x < z + 2 && x + 16 > a - 2)) continue;
    L.plants.push({ sprite: "HANGING_PLANT", x, y: 0, z: 1 });
    busy.push([x, x + 16]);
    hung++;
    x += 30;
  }
}

// ------------------------------------------------------------------ portrait

function portraitPlan(W: number, H: number, threads: number): Layout | null {
  const b = new Builder();
  const E = W >= 380 ? 12 : 0;
  const EB = W >= 380 ? 16 : 0;
  const FB = H - EB;
  const aisleX = W - E - 8;
  const innerW = W - 2 * E - 20;
  const x0 = E + 6;
  const top = 72;
  const gap = 16;
  const coreX = W - 34;
  const segments: WallSegment[] = [
    { x0: 0, x1: Math.min(176, Math.round(W * 0.48)), depth: 64 },
    { x0: Math.min(176, Math.round(W * 0.48)), x1: coreX, depth: 64 },
    { x0: coreX, x1: W, depth: 70 },
  ];
  const plan: SkyPlan = {
    variant: "portrait",
    segKinds: ["feature", "glass", "core"],
    terrace: null,
    beyond: [],
    rails: [],
    terraceWall: null,
    terraceSide: null,
    glassLeft: [],
    glassRight: [],
    glassBottom: [],
    fire: null,
    loungers: [],
    tub: null,
    scope: null,
    edgeX: E,
    edgeY: EB,
  };
  const podCols = Math.max(2, Math.floor(innerW / 48));
  const needPods = Math.ceil((threads + 3) / (2 * podCols));
  type Row = { kind: "pods" | "kitchenMeeting" | "lounge" | "pods2" | "library" | "waitingBoss" | "terrace"; h: number; grow: number };
  const rows: Row[] = [
    { kind: "pods", h: POD_H, grow: 0 },
    { kind: "kitchenMeeting", h: 112, grow: 1 },
    { kind: "lounge", h: 160, grow: 0.6 },
    { kind: "waitingBoss", h: 140, grow: 1.4 },
  ];
  const used = () => top + rows.reduce((s, r) => s + r.h + gap, 0);
  const terraceH = 104;
  const withTerrace = used() + terraceH + gap <= FB - 2;
  if (withTerrace) rows.push({ kind: "terrace", h: terraceH, grow: 1 });
  if (needPods >= 2 && used() + POD_H + gap <= FB - 2) rows.splice(3, 0, { kind: "pods2", h: POD_H, grow: 0 });
  if (used() + 96 + gap <= FB - 40) rows.splice(rows.length - (withTerrace ? 2 : 1), 0, { kind: "library", h: 96, grow: 0.3 });
  if (used() > H + 24) return null;
  const extra = Math.max(0, FB - 2 - used());
  const growSum = rows.reduce((s, r) => s + r.grow, 0) || 1;
  let y = top;
  const placed: { row: Row; rect: Rect }[] = [];
  for (const row of rows) {
    const h = row.h + Math.floor((extra * row.grow) / growSum);
    placed.push({ row, rect: { x: x0, y, w: innerW, h } });
    y += h + gap;
  }
  // Each room opens onto the hallway below it; the last rows onto the one above.
  const hallBelow = (r: Rect) => r.y + r.h + gap / 2;
  const halls: number[] = [];
  placed.forEach(({ row, rect }, i) => {
    if (i < placed.length - 1 && row.kind !== "waitingBoss") halls.push(hallBelow(rect));
    if (row.kind === "waitingBoss" || row.kind === "terrace") halls.push(rect.y - gap / 2);
  });
  const net: Network = { halls: [...new Set(halls)].sort((a, z) => a - z), aisles: [aisleX] };
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
      case "pods":
      case "pods2":
        buildPods(b, { ...rect, h: Math.min(rect.h, POD_H) }, { hallY: below, aisleX });
        break;
      case "kitchenMeeting": {
        const kw = Math.round(rect.w * 0.54);
        kitchen = { x: rect.x, y: rect.y, w: kw - 6, h: rect.h };
        buildKitchen(b, { ...kitchen, y: kitchen.y + 10, h: kitchen.h - 10 }, { hallY: below, aisleX: rect.x + kw - 1 });
        meeting = { x: rect.x + kw + 4, y: rect.y, w: rect.w - kw - 4, h: rect.h - 4 };
        whiteboard = buildMeeting(b, meeting, below);
        break;
      }
      case "lounge":
        lounge = rect;
        tvParts = buildLounge(b, rect, { hallY: below, aisleX }, null, !rows.some((r) => r.kind === "library"));
        break;
      case "library":
        buildLibrary(b, { ...rect, y: rect.y + 8, h: rect.h - 8 }, { hallY: below, aisleX });
        break;
      case "waitingBoss": {
        const ww = Math.round(rect.w * 0.56);
        waiting = { x: rect.x, y: rect.y + 4, w: ww - 4, h: rect.h - 54 };
        buildWaiting(b, waiting, above);
        const bossRoom: Rect = { x: rect.x + ww + 4, y: rect.y + 4, w: rect.w - ww - 4, h: rect.h - 8 };
        boss = buildBossTop(b, bossRoom, above);
        const sTop = waiting.y + waiting.h + 6;
        const sw = waiting.x + waiting.w - (x0 + 78);
        if (sw >= 60 && rect.y + rect.h - sTop >= 34) {
          buildServerRoom(b, { x: x0 + 78, y: sTop, w: sw, h: Math.min(48, rect.y + rect.h - sTop) });
          utilitiesAt(b, x0 + 2, rect.y + rect.h - 4, above);
        }
        break;
      }
      case "terrace":
        eventArea = buildTerrace(b, { x: E, y: rect.y, w: W - 2 * E, h: FB - rect.y }, plan, { hallY: above, aisleX }, { right: E > 0, left: E > 0, bottom: true });
        plan.terraceWall = { x0: E, x1: W - E, y: rect.y - 4, gaps: [[aisleX - 22, aisleX + 8]] };
        break;
    }
  }
  if (!meeting || !whiteboard || !kitchen || !lounge || !tvParts || !waiting || !boss) return null;
  const tv = tvParts as ReturnType<typeof buildLounge>;
  const lng = lounge as Rect;
  eventArea ??= { x: lng.x + 10, y: tv.couch.y + 30, w: lng.w - 20, h: Math.max(30, lng.y + lng.h - tv.couch.y - 30) };
  const lastY = plan.terrace ? (plan.terrace as Rect).y - 8 : FB;
  plan.glassLeft.push([64, lastY]);
  plan.glassRight.push([70, lastY]);
  if (!plan.terrace) plan.glassBottom.push([E, W - E]);
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
  // Board and calendar on the walnut wall, the elevator in the core, glass between.
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
  L.wall.paintings = [];
  const core = segments[2]!;
  const door: Rect = { x: Math.min(aisleX, W - 14) - 10, y: core.depth - 42, w: 20, h: 42 };
  L.wall.door = door;
  L.wall.legendNote = { x: door.x - 16, y: door.y + 8, w: 12, h: 12 };
  L.entrance = { x: door.x + 10, y: core.depth + 2 };
  L.entrancePath = [{ x: door.x + 10, y: net.halls[0]!, c: true }, L.entrance];
  L.wall.pinboard = { x: 8, y: 3, w: Math.min(128, segments[0]!.x1 - 46), h: 53 };
  L.wall.calendar = { x: L.wall.pinboard.x + L.wall.pinboard.w + 8, y: 6, w: 20, h: 22 };
  L.wall.status = { x: L.wall.calendar.x, y: 31, w: 20, h: 18 };
  const glass = segments[1]!;
  L.wall.clock = { x: glass.x0 + 16, y: 18, r: 9 };
  L.wall.windows = windowsIn(glass.x0 + 24, glass.x1, 6, glass.depth - 24, [[L.wall.legendNote.x - 2, L.wall.legendNote.x + 14]]);
  L.wall.pillars = segments.slice(1).map((s) => s.x0);
  cutDoors(L, plan);
  addEdges(plan, W, H, 64);
  L.themeData = plan;
  if (plan.terrace) L.words = { "in the lounge": "on the terrace" };
  return L;
}

/** The classic office with the door on top, for the portrait plan's bottom row. */
function buildBossTop(b: Builder, r: Rect, hallY: number): Layout["boss"] {
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
  return bossToys(b, { room: r, seat, desk, dogBed, lamp: { x: r.x + 14, y: r.y + 6 } });
}

/** The Sky Loft floor plan for a panel (null: the classic plan). */
export function skylinePlan(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return opts.portrait ? portraitPlan(W, H, opts.threads) : widePlan(W, H, opts.threads);
}

