// Villain's Lair: the floor plans. A secret base hollowed into a volcano.
//
// Wide (tall enough):                              Phone:
//  ┌ rock │ the big world map + countdown │ rock ┐   ┌ board │ world map ──┐
//  │ briefing │ control room: consoles  │ lair  │   │ control room         │
//  │ room     │ facing the map          │ (you) │   │ canteen │ briefing   │
//  │══════════ steel catwalk (the hallway) ═════│   │ lounge (shark tank)  │
//  │ canteen  │ concourse │ lounge      │ ante- │   │ antechamber │ lair   │
//  │ reactor  │ (hatch)   │ shark tank  │chamber│   │ crater ledge         │
//  └~~~~~~ the crater: lava far below, the monorail ~~~~~~┘
//
// Short panels keep the classic arrangement (consoles under the map on the
// left, the lounge under the screen wall), dressed the same way.
import type { Layout, Rect, WallSegment } from "../../layout.ts";
import {
  bossToys,
  Builder,
  buildArcade,
  buildKitchen,
  buildMeeting,
  buildPods,
  buildServerRoom,
  buildWaiting,
  buildWide,
  clamp,
  finish,
  POD_H,
  via,
  type Access,
  type Network,
} from "../../themekit.ts";

export type SegKind = "rock" | "map" | "media";

/** What the backdrop and the live layers need to know about the plan (L.themeData). */
export interface LairPlan {
  variant: "tall" | "short" | "portrait";
  /** The kind of each wall segment, by index. */
  segKinds: SegKind[];
  /** The world map screen on the wall, and the countdown board over it. */
  map: Rect;
  countdown: Rect;
  /** Reel-to-reel tape computers set into the wall beside the map. */
  tapes: Rect[];
  /** The drop at the bottom of the panel: a rail, then the lava far below (null on short panels). */
  crater: Rect | null;
  /** The monorail's beam across the crater (its top y), and where it stops. */
  rail: { y: number; station: number } | null;
  /** The trapdoor in the concourse floor (the ball pit under it). */
  hatch: Rect;
  /** Where people stand at the crater rail (feet), each reached down an aisle. */
  railSpots: { x: number; y: number; aisle: number; hall: number }[];
  /** The big red button on your desk. */
  button: Rect;
}

export function planOf(L: Layout): LairPlan | null {
  const d = L.themeData as LairPlan | undefined;
  return d && Array.isArray(d.segKinds) && d.map ? d : null;
}

// ------------------------------------------------------------------ rooms

/** The mastermind's lair: door at the bottom left, the desk with the big red button, a globe in the corner. */
function buildLair(b: Builder, r: Rect, hallY: number): Layout["boss"] {
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
  // The globe on its cabinet in the far corner, the lava lamp by the door, a palm.
  const shelfY = r.y + r.h - 42;
  b.prop("boss-shelf", "library-shelf", r.x + r.w - 36, shelfY, shelfY + 30);
  b.poke("globe", "globe", { x: r.x + r.w - 36, y: shelfY - 12, w: 32, h: 14 });
  b.plant("LARGE_PLANT", r.x + r.w - 34, r.y - 4);
  const dogBed = { x: r.x + 52, y: r.y + r.h - 10 };
  b.prop("dog-bed", "dog-bed", dogBed.x - 12, dogBed.y - 8, dogBed.y - 6);
  b.prop("boss-glass", "glass-front", r.x, r.y + r.h - 10, r.y + r.h + 1, r.w);
  b.prop("lamp", "lamp", r.x + 4, r.y + 2, r.y + 52);
  b.poke("lamp", "lamp", { x: r.x + 4, y: r.y + 2, w: 16, h: 52 });
  // A tall room gets a second palm, over the globe.
  if (r.h >= 200) b.plant("LARGE_PLANT", r.x + r.w - 36, r.y + r.h - 106);
  return bossToys(b, { room: r, seat, desk, dogBed, lamp: { x: r.x + 12, y: r.y + 4 } }, [buttonOf(desk)]);
}

/** The big red button sits on the left of the desk top. */
function buttonOf(desk: Rect): Rect {
  return { x: desk.x + 5, y: desk.y - 1, w: 10, h: 9 };
}

/** The arcade cabinet with its top-left at x, y, reached along a lane just below where its player stands. */
function arcadeAt(b: Builder, x: number, y: number, acc: Access): Rect | null {
  return buildArcade(b, x, y, via(acc, y + 62, x + 12, y + 58));
}

/**
 * The lounge with a standing TV sized to the room (classic `buildLounge`
 * with a smaller set when it's short): TV, couch, piano, the shark tank, and
 * the arcade cabinet in the corner left of the TV when it fits there.
 */
function buildDen(b: Builder, r: Rect, acc: Access, naps: boolean, cabinet: boolean): { tv: Rect; screen: Rect; speakers: Rect[]; couch: Rect; fishtank: Rect; arcade: Rect | null } {
  b.rooms.push({ kind: "lounge", rect: r });
  const tvH = clamp(r.h - 80, 45, 72);
  const tvW = Math.min(Math.round(tvH / 0.56), r.w - 70);
  const tv: Rect = { x: r.x + Math.round((r.w - tvW) / 2), y: r.y + 2, w: tvW, h: Math.round(tvW * 0.56) };
  const screen: Rect = { x: tv.x + 4, y: tv.y + 4, w: tv.w - 8, h: tv.h - 8 };
  b.prop("tv", "tv", tv.x, tv.y, tv.y + tv.h + 18, tv.w);
  const speakers: Rect[] = [
    { x: tv.x - 14, y: tv.y + tv.h - 26, w: 10, h: 26 },
    { x: tv.x + tv.w + 4, y: tv.y + tv.h - 26, w: 10, h: 26 },
  ];
  const couchW = 82;
  const couchX = r.x + Math.round((r.w - couchW) / 2);
  const couchY = tv.y + tv.h + 34;
  const couch: Rect = { x: couchX, y: couchY, w: couchW, h: 26 };
  b.prop("couch", "couch", couchX - 1, couchY - 1, couchY + 26);
  b.poke("couch", "couch", { x: couchX, y: couchY - 2, w: couchW, h: 28 });
  b.prop("coffee-table", "coffee-table", couchX + 22, couchY - 22, couchY - 10);
  const lane = couchY - 8;
  for (const [i, dx] of [20, 41, 62].entries()) {
    b.spot({ id: `couch-${i + 1}`, kind: "couch", group: "lounge", x: couchX + dx, y: couchY + 13, facing: "back", pose: "sit-back", path: via(acc, lane, couchX + dx, couchY + 13), activity: "watching TV" });
  }
  const px = r.x + 4;
  const py = couchY - 8;
  b.prop("piano", "piano", px, py, py + 30);
  b.poke("piano", "piano", { x: px, y: py, w: 30, h: 30 });
  b.spot({ id: "piano", kind: "piano", group: "lounge", x: px + 15, y: py + 40, facing: "back", pose: "play", path: via(acc, py + 46, px + 15, py + 40), activity: "playing the piano" });
  const fishtank: Rect = { x: r.x + r.w - 44, y: couchY - 14, w: 40, h: 24 };
  b.prop("fishtank-stand", "fishtank-stand", fishtank.x - 1, fishtank.y + 24, fishtank.y + 44);
  b.poke("fishtank", "fishtank", { x: fishtank.x, y: fishtank.y, w: 40, h: 44 });
  b.spot({ id: "fishtank", kind: "fishtank", group: "lounge", x: fishtank.x + 20, y: fishtank.y + 54, facing: "back", pose: "stand", path: via(acc, fishtank.y + 58, fishtank.x + 20, fishtank.y + 54), activity: "watching the fish" });
  // The arcade (or a potted palm) in the top left corner, a palm in the right one, when there's room beside the speakers.
  const left = speakers[0]!.x - 4 - r.x;
  let arcade: Rect | null = null;
  if (cabinet && left >= 32 && r.y + 2 + 62 < py - 2) arcade = arcadeAt(b, r.x + Math.max(4, Math.floor((left - 24) / 2)), r.y + 2, acc);
  else if (left >= 36) b.plant("LARGE_PLANT", r.x + Math.round((speakers[0]!.x - r.x - 32) / 2), r.y);
  if (r.x + r.w - (speakers[1]!.x + speakers[1]!.w + 4) >= 36) b.plant("LARGE_PLANT", speakers[1]!.x + speakers[1]!.w + Math.round((r.x + r.w - speakers[1]!.x - speakers[1]!.w - 32) / 2), r.y);
  const by = r.y + r.h - 8;
  if (naps && by - (fishtank.y + 58) >= 30) {
    for (const [i, bx] of [r.x + 20, r.x + r.w - 20].entries()) {
      b.prop(`beanbag-${i + 1}`, i ? "beanbag-pink" : "beanbag-blue", bx - 13, by - 10, by - 6);
      b.poke(`beanbag-${i + 1}`, "beanbag", { x: bx - 13, y: by - 10, w: 26, h: 14 });
      b.spot({ id: `beanbag-${i + 1}`, kind: "beanbag", group: "nap", x: bx, y: by, facing: "front", pose: "nap", path: via(acc, by + 5, bx, by), activity: "napping" });
    }
  }
  return { tv, screen, speakers, couch, fishtank, arcade };
}

/** The water cooler, printer and bin in a row standing at baseY, reached straight from a hall. */
function utilitiesAt(b: Builder, x: number, baseY: number, hallY: number): void {
  b.prop("cooler", "cooler", x, baseY - 36, baseY - 1);
  b.poke("cooler", "cooler", { x, y: baseY - 36, w: 16, h: 36 });
  b.prop("printer", "printer", x + 22, baseY - 26, baseY);
  b.poke("printer", "printer", { x: x + 22, y: baseY - 26, w: 30, h: 26 });
  b.prop("bin", "bin", x + 54, baseY - 14, baseY + 1);
  b.poke("bin", "bin", { x: x + 54, y: baseY - 14, w: 16, h: 16 });
  b.spot({ id: "cooler", kind: "cooler", group: "break", x: x + 8, y: baseY + 4, facing: "back", pose: "cup", path: [{ x: x + 8, y: hallY, c: true }, { x: x + 8, y: baseY + 4 }], activity: "chatting at the water cooler" });
}

/** A trapdoor in the middle of an open floor, clear of the hallway below it. */
function hatchIn(area: Rect, net: Network): Rect {
  const w = 30;
  const h = 14;
  const y = Math.round(area.y + area.h / 2 - h / 2 + 6);
  const hall = net.halls.find((hy) => hy > y);
  return { x: Math.round(area.x + area.w / 2 - w / 2), y: hall !== undefined ? Math.min(y, hall - 10 - h) : y, w, h };
}

/** Spots at the crater rail, one each side of each aisle that reaches it. */
function railSpotsFor(net: Network, rail: number, W: number): LairPlan["railSpots"] {
  const out: LairPlan["railSpots"] = [];
  const hall = Math.max(...net.halls);
  for (const ax of net.aisles) {
    for (const dx of [-7, 7]) {
      const x = ax + dx;
      if (x > 8 && x < W - 8) out.push({ x, y: rail - 3, aisle: ax, hall });
    }
  }
  return out;
}

// ------------------------------------------------------------------ the wall

/** Windows along a stretch of wall, avoiding some spans. */
function windowsIn(x0: number, x1: number, y: number, h: number, avoid: [number, number][] = [], maxW = 48): Rect[] {
  const out: Rect[] = [];
  let runs: [number, number][] = [[x0 + 8, x1 - 8]];
  for (const [a, z] of avoid) {
    runs = runs.flatMap(([s, e]) => (z <= s || a >= e ? [[s, e] as [number, number]] : ([[s, a - 6], [z + 6, e]] as [number, number][]).filter(([p, q]) => q - p >= 30)));
  }
  for (const [s, e] of runs) {
    const len = e - s;
    const n = Math.max(1, Math.floor((len + 10) / (maxW + 10)));
    const w = Math.min(maxW, Math.floor((len - (n - 1) * 10) / n));
    if (w < 28) continue;
    const used = n * w + (n - 1) * 10;
    const start = s + Math.floor((len - used) / 2);
    for (let i = 0; i < n; i++) out.push({ x: start + i * (w + 10), y, w, h });
  }
  return out;
}

/** The map wall: the countdown over the map, tape computers either side when there's room. */
function mapWall(x0: number, x1: number, depth: number): { map: Rect; countdown: Rect; tapes: Rect[] } {
  const avail = x1 - x0;
  const tapeW = 22;
  const mapW = Math.min(avail, avail >= 200 ? clamp(avail - 2 * (tapeW + 6), 180, 300) : avail);
  const mapX = x0 + Math.floor((avail - mapW) / 2);
  const top = depth >= 90 ? 24 : 18;
  const map: Rect = { x: mapX, y: top, w: mapW, h: Math.max(30, depth - top - 12) };
  const tapes: Rect[] = [];
  const tapeY = depth - 50;
  for (let x = mapX - 6 - tapeW; x >= x0; x -= tapeW + 4) tapes.push({ x, y: tapeY, w: tapeW, h: 44 });
  for (let x = mapX + mapW + 6; x + tapeW <= x1; x += tapeW + 4) tapes.push({ x, y: tapeY, w: tapeW, h: 44 });
  const cw = Math.min(mapW - 8, 96);
  const countdown: Rect = { x: mapX + Math.round((mapW - cw) / 2), y: top - 15, w: cw, h: 12 };
  return { map, countdown, tapes };
}

// ------------------------------------------------------------------ wide, tall enough

function tallPlan(W: number, H: number, threads: number): Layout | null {
  const b = new Builder();
  const D = 64;
  const DM = 100;
  const EB = H >= 440 ? 34 : 26;
  const FB = H - EB;
  const X0 = 6;
  const X1 = W - 6;
  let wL = clamp(Math.round(W * 0.25), 150, 220);
  let wR = clamp(Math.round(W * 0.26), 156, 230);
  // The control room holds eight consoles abreast at most: wide panels give the rest to the rooms either side.
  const over = X1 - X0 - wL - wR - 38 - (8 * 48 + 24);
  if (over > 0) {
    wL += Math.floor(over / 2);
    wR += over - Math.floor(over / 2);
  }
  const a1 = X0 + wL + 8;
  const a2 = X1 - wR - 14;
  const cx0 = a1 + 8;
  const cW = a2 - 8 - cx0;
  const rx0 = a2 + 14;
  const segments: WallSegment[] = [
    { x0: 0, x1: a1 - 5, depth: D },
    { x0: a1 - 5, x1: a2 + 12, depth: DM },
    { x0: a2 + 12, x1: W, depth: D },
  ];
  const podCols = Math.max(1, Math.floor(cW / 48));
  const wantRows = Math.ceil((threads + 3) / (2 * podCols));
  const podTop = DM + 6;
  const topRoom = clamp(Math.round((H - D) * 0.38), 130, 170);
  const rows = wantRows >= 2 && FB - (podTop + 2 * POD_H + 12) >= 200 ? 2 : 1;
  const hy = Math.max(podTop + rows * POD_H + 4, D + 2 + topRoom + 8);
  const y0 = hy + 10;
  const bottomH = FB - 4 - y0;
  const side = cW >= 380;
  const EV = 46;
  if (bottomH < (side ? 132 : EV + 8 + 132)) return null;
  const net: Network = { halls: [hy], aisles: [a1, a2] };
  const accL: Access = { hallY: hy, aisleX: a1 };
  const accR: Access = { hallY: hy, aisleX: a2 };

  // ---- above the catwalk: the briefing room, the control room, your lair
  const meeting: Rect = { x: X0, y: D + 2, w: wL, h: hy - 8 - (D + 2) };
  const whiteboard = buildMeeting(b, meeting, hy);
  buildPods(b, { x: cx0, y: podTop, w: cW, h: rows * POD_H - 4 }, accL);
  const bossRoom: Rect = { x: rx0, y: D + 2, w: X1 - rx0, h: hy - 8 - (D + 2) };
  const boss = buildLair(b, bossRoom, hy);

  // ---- below: the canteen (and the reactor), the concourse and the lounge, the antechamber
  const kH = clamp(Math.round(bottomH * 0.55), 72, 100);
  const kitchen: Rect = { x: X0, y: y0 + 8, w: wL, h: kH - 8 };
  buildKitchen(b, kitchen, accL);
  let leftY = y0 + kH + 10;
  if (rows < wantRows && FB - 4 - leftY >= POD_H) {
    buildPods(b, { x: X0, y: leftY, w: wL, h: POD_H - 4 }, accL);
    leftY += POD_H + 4;
  }
  const reactorAt = (x: number, y: number, w: number, h: number) => buildServerRoom(b, { x, y, w, h });
  if (FB - 4 - leftY >= 48) reactorAt(X0 + 4, leftY + 2, Math.min(wL - 8, 160), Math.min(62, FB - 6 - leftY));

  let eventArea: Rect;
  let lounge: Rect;
  let tvParts: ReturnType<typeof buildDen>;
  if (side) {
    const denW = clamp(Math.round(cW * 0.55), 200, 250);
    lounge = { x: a2 - 8 - denW, y: y0 + 4, w: denW, h: bottomH - 4 };
    tvParts = buildDen(b, lounge, accR, true, true);
    // No room beside the TV: the cabinet stands at the head of the concourse instead.
    if (!tvParts.arcade) arcadeAt(b, cx0 + 6, y0 + 4, accL);
    const left = tvParts.arcade ? cx0 + 6 : cx0 + 40;
    const concW = lounge.x - 10 - left;
    eventArea = { x: left, y: y0 + 2, w: concW - 6, h: Math.min(84, bottomH - 52) };
    utilitiesAt(b, left + 2, FB - 8, hy);
  } else {
    utilitiesAt(b, cx0 + 4, y0 + 38, hy);
    eventArea = { x: cx0 + 82, y: y0 + 2, w: cW - 88, h: EV };
    lounge = { x: cx0, y: y0 + EV + 10, w: cW, h: bottomH - EV - 10 };
    tvParts = buildDen(b, lounge, accL, true, true);
  }

  const wx = a2 + 8;
  const wW = X1 - wx;
  const roomForReactor = !b.server && bottomH >= 80 + 66;
  const waiting: Rect = { x: wx, y: y0 + 4, w: wW, h: roomForReactor ? bottomH - 70 : bottomH - 4 };
  buildWaiting(b, waiting, hy);
  if (roomForReactor) reactorAt(wx + 30, FB - 4 - 58, Math.min(wW - 34, 150), 56);

  const L = finish(b, W, H, false, segments, net, {
    meeting,
    whiteboard,
    boss,
    waiting,
    kitchen,
    lounge,
    games: null,
    eventArea,
    tvParts,
    gamesParts: null,
    doorX: a2,
    lamp: boss.lamp,
  });

  // The wall: the corkboard over the briefing room, the map over the control room, the blast door, windows over your lair.
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
  L.wall.paintings = [];
  const mapSeg = segments[1]!;
  const door: Rect = { x: a2 - 10, y: DM - 42, w: 20, h: 42 };
  L.wall.door = door;
  L.wall.legendNote = { x: door.x - 16, y: door.y + 8, w: 12, h: 12 };
  L.entrance = { x: a2, y: DM + 2 };
  L.entrancePath = [{ x: a2, y: hy, c: true }, L.entrance];
  L.wall.pinboard = { x: 10, y: 3, w: 128, h: 53 };
  const calOnRock = segments[0]!.x1 >= 172;
  const calX = calOnRock ? 146 : mapSeg.x0 + 8;
  L.wall.calendar = { x: calX, y: 6, w: 20, h: 22 };
  L.wall.status = { x: calX, y: 31, w: 20, h: 18 };
  const right = segments[2]!;
  L.wall.clock = { x: right.x0 + 16, y: 20, r: 9 };
  const windows: Rect[] = [];
  if (calOnRock) windows.push(...windowsIn(174, segments[0]!.x1, 8, 36));
  windows.push(...windowsIn(right.x0 + 28, right.x1, 8, 36));
  L.wall.windows = windows;
  L.wall.pillars = segments.slice(1).map((s) => s.x0);
  const wall = mapWall(calOnRock ? mapSeg.x0 + 8 : calX + 28, L.wall.legendNote.x - 8, DM);
  const crater: Rect = { x: 0, y: FB, w: W, h: EB };
  const plan: LairPlan = {
    variant: "tall",
    segKinds: ["rock", "map", "rock"],
    ...wall,
    crater,
    rail: { y: FB + Math.round(EB * 0.55), station: Math.round(eventArea.x + eventArea.w / 2) },
    hatch: hatchIn(eventArea, net),
    railSpots: railSpotsFor(net, FB, W),
    button: buttonOf(boss.desk),
  };
  L.themeData = plan;
  L.words = { "in the lounge": "on the concourse" };
  return L;
}

// ------------------------------------------------------------------ wide and short: the classic arrangement

function shortPlan(W: number, H: number, threads: number): Layout {
  // The crater along the bottom when the rooms still get the classic minimum height above it.
  const EB = H - 28 >= 300 ? 28 : 0;
  const L = buildWide(W, H - EB, { threads });
  L.H = H;
  // The classic rooms: consoles under the map on the left, the screen wall in the middle.
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
  L.wall.paintings = [];
  const [s0, s1, s2] = L.segments as [WallSegment, WallSegment, WallSegment];
  L.wall.clock = { x: L.wall.legendNote.x - 14, y: 20, r: 9 };
  // The calendar, the status board and the corkboard go over the briefing room, clear of the
  // panel's buttons in the top right corner.
  const calX = s2.x0 + 8;
  L.wall.calendar = { x: calX, y: 6, w: 20, h: 22 };
  L.wall.status = { x: calX, y: 31, w: 20, h: 18 };
  const pinX = calX + 28;
  L.wall.pinboard = { x: pinX, y: 3, w: Math.min(128, Math.max(96, W - 56 - pinX)), h: Math.min(53, s2.depth - 11) };
  const tv = L.tv;
  const windows: Rect[] = [];
  windows.push(...windowsIn(s1.x0, s1.x1, 8, 34, [[tv.x - 18, tv.x + tv.w + 18]], 40));
  L.wall.windows = windows;
  const wall = mapWall(8, L.wall.clock.x - 14, s0.depth);
  const plan: LairPlan = {
    variant: "short",
    segKinds: ["map", "media", "rock"],
    ...wall,
    crater: EB > 0 ? { x: 0, y: H - EB, w: W, h: EB } : null,
    rail: EB > 0 ? { y: H - EB + Math.round(EB * 0.55), station: Math.round(L.eventArea.x + L.eventArea.w / 2) } : null,
    hatch: hatchIn(L.eventArea, L.net),
    railSpots: EB > 0 ? railSpotsFor(L.net, H - EB, W) : [],
    button: buttonOf(L.boss.desk),
  };
  L.themeData = plan;
  return L;
}

// ------------------------------------------------------------------ portrait

function portraitPlan(W: number, H: number, threads: number): Layout | null {
  const b = new Builder();
  const aisleX = W - 8;
  const innerW = W - 20;
  const x0 = 6;
  const DM = 76;
  const top = 84;
  const gap = 16;
  const segments: WallSegment[] = [
    { x0: 0, x1: 170, depth: 64 },
    { x0: 170, x1: W, depth: DM },
  ];
  const podCols = Math.max(2, Math.floor(innerW / 48));
  const needPods = Math.ceil((threads + 3) / (2 * podCols));
  type Row = { kind: "pods" | "kitchenMeeting" | "lounge" | "pods2" | "waitingBoss" | "ledge"; h: number; grow: number };
  const rows: Row[] = [
    { kind: "pods", h: POD_H, grow: 0 },
    { kind: "kitchenMeeting", h: 112, grow: 1 },
    { kind: "lounge", h: 140, grow: 0.6 },
    { kind: "waitingBoss", h: 136, grow: 1.4 },
  ];
  const EB0 = 30;
  const used = () => top + rows.reduce((s, r) => s + r.h + gap, 0);
  const ledgeH = 96;
  const withLedge = used() + ledgeH + gap + EB0 <= H - 2;
  if (withLedge) rows.push({ kind: "ledge", h: ledgeH, grow: 0.8 });
  if (needPods >= 2 && used() + POD_H + gap + EB0 <= H - 2) rows.splice(3, 0, { kind: "pods2", h: POD_H, grow: 0 });
  const EB = used() + EB0 <= H - 2 ? EB0 : 0;
  const FB = H - EB;
  if (used() > FB + gap + 4) return null;
  const extra = Math.max(0, FB - 2 - used());
  const growSum = rows.reduce((s, r) => s + r.grow, 0) || 1;
  let y = top;
  const placed: { row: Row; rect: Rect }[] = [];
  for (const row of rows) {
    const h = row.h + Math.floor((extra * row.grow) / growSum);
    placed.push({ row, rect: { x: x0, y, w: innerW, h } });
    y += h + gap;
  }
  // Each room opens onto the hallway below it; the antechamber row and the ledge onto the one above.
  const hallBelow = (r: Rect) => r.y + r.h + gap / 2;
  const halls: number[] = [];
  placed.forEach(({ row, rect }, i) => {
    if (i < placed.length - 1 && row.kind !== "waitingBoss") halls.push(hallBelow(rect));
    if (row.kind === "waitingBoss" || row.kind === "ledge") halls.push(rect.y - gap / 2);
  });
  const net: Network = { halls: [...new Set(halls)].sort((a, z) => a - z), aisles: [aisleX] };
  let kitchen: Rect | null = null;
  let lounge: Rect | null = null;
  let meeting: Rect | null = null;
  let whiteboard: Rect | null = null;
  let waiting: Rect | null = null;
  let boss: Layout["boss"] | null = null;
  let tvParts: ReturnType<typeof buildDen> | null = null;
  let eventArea: Rect | null = null;
  let ledge: Rect | null = null;
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
        tvParts = buildDen(b, rect, { hallY: below, aisleX }, !withLedge, true);
        break;
      case "waitingBoss": {
        const ww = Math.round(rect.w * 0.56);
        waiting = { x: rect.x, y: rect.y + 4, w: ww - 4, h: rect.h - 54 };
        buildWaiting(b, waiting, above);
        const bossRoom: Rect = { x: rect.x + ww + 4, y: rect.y + 4, w: rect.w - ww - 4, h: rect.h - 8 };
        boss = buildLairTop(b, bossRoom, above);
        const sTop = waiting.y + waiting.h + 6;
        const sw = waiting.x + waiting.w - (x0 + 78);
        if (sw >= 60 && rect.y + rect.h - sTop >= 34) {
          buildServerRoom(b, { x: x0 + 78, y: sTop, w: sw, h: Math.min(48, rect.y + rect.h - sTop) });
          utilitiesAt(b, x0 + 2, rect.y + rect.h - 4, above);
        }
        break;
      }
      case "ledge": {
        ledge = rect;
        // An open rock ledge over the crater: where the base gets together.
        eventArea = { x: rect.x + 8, y: rect.y + 4, w: rect.w - 30, h: rect.h - 10 };
        break;
      }
    }
  }
  if (!meeting || !whiteboard || !kitchen || !lounge || !tvParts || !waiting || !boss) return null;
  const tv = tvParts as ReturnType<typeof buildDen>;
  const lng = lounge as Rect;
  if (!b.spots.some((s) => s.id === "cooler")) utilitiesAt(b, x0 + 2, FB - 6, net.halls[net.halls.length - 1]!);
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
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");
  L.wall.paintings = [];
  const mapSeg = segments[1]!;
  const door: Rect = { x: Math.min(aisleX, W - 14) - 10, y: mapSeg.depth - 42, w: 20, h: 42 };
  L.wall.door = door;
  L.wall.legendNote = { x: door.x - 16, y: door.y + 8, w: 12, h: 12 };
  L.entrance = { x: door.x + 10, y: mapSeg.depth + 2 };
  L.entrancePath = [{ x: door.x + 10, y: net.halls[0]!, c: true }, L.entrance];
  L.wall.pinboard = { x: 8, y: 3, w: 128, h: 53 };
  L.wall.calendar = { x: 144, y: 6, w: 20, h: 22 };
  L.wall.status = { x: 144, y: 31, w: 20, h: 18 };
  const free = L.wall.legendNote.x - 8 - (mapSeg.x0 + 8);
  const winW = free - 120 - 8 >= 34 ? Math.min(44, free - 128) : 0;
  const mapX1 = L.wall.legendNote.x - 8 - (winW > 0 ? winW + 8 : 0);
  L.wall.windows = winW > 0 ? [{ x: mapX1 + 8, y: 10, w: winW, h: 36 }] : [];
  L.wall.clock = { x: door.x + 10, y: 13, r: 8 };
  L.wall.pillars = [mapSeg.x0];
  const wall = mapWall(mapSeg.x0 + 8, mapX1, DM);
  const crater: Rect | null = EB > 0 ? { x: 0, y: FB, w: W, h: EB } : null;
  const ev = L.eventArea;
  const plan: LairPlan = {
    variant: "portrait",
    segKinds: ["rock", "map"],
    ...wall,
    crater,
    rail: crater ? { y: FB + Math.round(EB * 0.55), station: Math.round(W / 2) } : null,
    hatch: hatchIn(ev, net),
    railSpots: crater && ledge ? [{ x: aisleX - 40, y: FB - 3, aisle: aisleX, hall: net.halls[net.halls.length - 1]! }, { x: aisleX - 62, y: FB - 3, aisle: aisleX, hall: net.halls[net.halls.length - 1]! }] : [],
    button: buttonOf(boss.desk),
  };
  L.themeData = plan;
  if (ledge) L.words = { "in the lounge": "out on the crater ledge" };
  return L;
}

/** Your lair in the portrait plan's bottom row: the door on top. */
function buildLairTop(b: Builder, r: Rect, hallY: number): Layout["boss"] {
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
  return bossToys(b, { room: r, seat, desk, dogBed, lamp: { x: r.x + 14, y: r.y + 6 } }, [buttonOf(desk)]);
}

/** The Villain's Lair floor plan for a panel. */
export function lairPlan(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  if (opts.portrait) return portraitPlan(W, H, opts.threads);
  return tallPlan(W, H, opts.threads) ?? shortPlan(W, H, opts.threads);
}

