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
  /** Beyond the deck's rail: the piste and the chairlift. */
  slope: Rect | null;
  /** The sky over the deck (east): a window without a frame. */
  open: Rect | null;
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

/** The great room under the chimney: the hearth slab first, then the lounge (sofa facing the fire, piano, trout tank). */
function buildGreatRoom(b: Builder, r: Rect, acc: Access, wallTv: Rect | null, naps: boolean): ReturnType<typeof buildLounge> {
  const parts = buildLounge(b, { ...r, y: r.y + 8, h: r.h - 8 }, acc, wallTv, naps);
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

/** An old arcade cabinet in a nook of the great room (when there's no ski room for it). */
function arcadeNook(b: Builder, x: number, y: number, acc: Access): Rect {
  const arcade: Rect = { x, y, w: 24, h: 46 };
  b.prop("arcade", "arcade", arcade.x - 1, arcade.y - 1, arcade.y + 46);
  b.poke("arcade", "arcade", arcade);
  b.spot({ id: "arcade", kind: "arcade", group: "lounge", x: arcade.x + 12, y: arcade.y + 58, facing: "back", pose: "stand", path: via(acc, arcade.y + 62, arcade.x + 12, arcade.y + 58), activity: "playing arcade games" });
  return arcade;
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

/** The chimney's geometry for a TV of tvW at the center x; the wall there is DC deep. */
function chimneyAt(cx: number, tvW: number, tvH: number): { DC: number; chimney: Rect; wallTv: Rect; box: Rect; mantel: Rect; hearth: Rect; woodpile: Rect } {
  const DC = tvH + 36;
  const cw = tvW + 40;
  const x0 = Math.round(cx - cw / 2);
  const chimney: Rect = { x: x0, y: 0, w: cw, h: DC };
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
  const door: Rect = { x: doorX - 10, y: D - 42, w: 20, h: 42 };
  L.wall.door = door;
  L.wall.legendNote = { x: door.x - 16, y: door.y + 8, w: 12, h: 12 };
  L.entrance = { x: doorX, y: D + 2 };
  L.entrancePath = [{ x: doorX, y: L.net.halls[0]!, c: true }, L.entrance];
  const ch = plan.fire.chimney;
  const winY = 5;
  const winH = D - 21;
  const busy: [number, number][] = [
    [L.wall.pinboard.x - 4, L.wall.pinboard.x + L.wall.pinboard.w + 4],
    [L.wall.calendar.x - 4, L.wall.calendar.x + 24],
    [L.wall.legendNote.x - 4, door.x + door.w + 4],
  ];
  // The clock on the timber right of the chimney (or left of it on a crowded wall).
  const right = segments.find((s, i) => plan.segKinds[i] === "timber" && s.x0 >= ch.x + ch.w);
  const cx = right && right.x1 - right.x0 >= 40 ? right.x0 + 16 : Math.max(16, ch.x - 16);
  L.wall.clock = { x: cx, y: 18, r: 9 };
  busy.push([cx - 12, cx + 12]);
  const windows: Rect[] = [];
  for (const [i, sg] of segments.entries()) {
    if (plan.segKinds[i] === "timber") windows.push(...windowsIn(sg.x0, sg.x1, winY, winH, busy));
  }
  if (plan.open) windows.push(plan.open);
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

function widePlan(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const east = W >= 640;
  const OUT = east ? clamp(Math.round(W * 0.16), 104, 190) : 0;
  const XI = W - OUT;
  const X0 = 6;
  const podCols = clamp(Math.floor(((XI - 12) * 0.36) / 48), 4, 6);
  const wL = podCols * 48;
  const a1 = X0 + wL + 8;
  const cx0 = a1 + 8;
  const wR = clamp(Math.round((XI - 6 - cx0 - 16) * 0.47), 150, 230);
  const a2 = XI - 6 - wR - 8;
  const rx0 = a2 + 8;
  const wC = a2 - 8 - cx0;
  const split = wC >= 400;
  const gw = split ? Math.max(220, Math.round(wC * 0.56)) : wC;
  const short = H < 400;
  const D = short ? 66 : 72;
  const tvW = Math.min(gw - 50, H < 330 ? 96 : short ? 108 : 120);
  const tvH = Math.round(tvW * 0.54);
  const ch = chimneyAt(cx0 + gw / 2, tvW, tvH);
  const DC = ch.DC;

  // A sun deck along the bottom when the panel's too narrow for one at the side but tall.
  const south = !east && H >= 560;
  const SB = south ? 22 : 0;
  const deckH = south ? clamp(Math.round(H * 0.15), 96, 124) : 0;
  const deckTop = H - SB - deckH;
  const bottom = south ? deckTop - 12 : H - 6;
  const hy = clamp(Math.round(Math.max(DC + 2 + 104 + 8, H * (south ? 0.4 : 0.46))), DC + 90, bottom - 114);
  const halls = south ? [hy, deckTop + 12] : [hy];
  const net: Network = { halls, aisles: [a1, a2] };

  const segments: WallSegment[] = [
    { x0: 0, x1: ch.chimney.x, depth: D },
    { x0: ch.chimney.x, x1: ch.chimney.x + ch.chimney.w, depth: DC },
    { x0: ch.chimney.x + ch.chimney.w, x1: XI, depth: D },
  ];
  const segKinds: SegKind[] = ["timber", "chimney", "timber"];
  if (east) {
    segments.push({ x0: XI, x1: W, depth: D });
    segKinds.push("open");
  }
  const plan: CabinPlan = {
    variant: "wide",
    segKinds,
    fire: { chimney: ch.chimney, box: ch.box, mantel: ch.mantel, hearth: ch.hearth },
    woodpile: ch.woodpile,
    inside: { x: 0, y: 0, w: XI, h: south ? deckTop - 3 : H },
    deck: null,
    deckSide: null,
    slope: null,
    open: null,
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
  const great: Rect = { x: cx0, y: DC + 2, w: gw, h: hy - 8 - (DC + 2) };
  const tvParts = buildGreatRoom(b, great, { hallY: hy, aisleX: a1 }, ch.wallTv, false);
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  let library = false;
  if (split) {
    const side: Rect = { x: cx0 + gw + 10, y: top + 8, w: wC - gw - 10, h: hy - 8 - (top + 8) };
    if (side.h >= 104) {
      games = side;
      gamesParts = buildGames(b, side, { hallY: hy, aisleX: cx0 + gw + 5 });
      dressSkiRoom(plan, side);
    }
  }
  const meeting: Rect = { x: rx0, y: top, w: wR, h: hy - 8 - top };
  const whiteboard = buildMeeting(b, meeting, hy);

  // ---- below: the workroom, the kitchen (and the ski room), your study
  const y0 = hy + 10;
  const wantRows = Math.ceil((threads + 3) / (2 * podCols));
  const fitRows = Math.max(1, Math.floor((bottom - y0 + 4) / POD_H));
  const rows = clamp(wantRows, 1, fitRows);
  buildPods(b, { x: X0, y: y0, w: wL, h: rows * POD_H - 4 }, { hallY: hy, aisleX: a1 });
  const leftY = y0 + rows * POD_H + 4;
  const kH = clamp(bottom - y0 - 8, 64, 92);
  const kitchen: Rect = { x: cx0, y: y0 + 8, w: wC, h: kH - 8 };
  buildKitchen(b, kitchen, { hallY: hy, aisleX: a2 });
  let cY = kitchen.y + kitchen.h + 8;
  const leftRest = bottom - leftY;
  if (leftRest >= 46) {
    const sh = Math.min(56, leftRest - 2);
    buildServerRoom(b, { x: X0 + 8, y: leftY, w: Math.min(wL - 16, 150), h: sh });
    if (leftRest - sh - 12 >= 96) {
      buildLibrary(b, { x: X0, y: leftY + sh + 20, w: wL, h: Math.min(110, leftRest - sh - 20) }, { hallY: hy, aisleX: a1 });
      library = true;
    }
  }
  const cRest = bottom - cY;
  if (!games && cRest >= 110) {
    games = { x: cx0, y: cY + 6, w: wC, h: Math.min(150, cRest - 6) };
    gamesParts = buildGames(b, games, { hallY: hy, aisleX: a2 });
    dressSkiRoom(plan, games);
    cY = games.y + games.h + 8;
  } else if (!library && cRest >= 100) {
    buildLibrary(b, { x: cx0, y: cY + 12, w: wC, h: Math.min(110, cRest - 12) }, { hallY: hy, aisleX: a2 });
    library = true;
    cY += Math.min(110, cRest - 12) + 12;
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

  // No arcade in a ski room: the old cabinet in the great room's corner, between the piano and the sofa.
  if (!gamesParts?.arcade) {
    const span = tvParts.couch.x - 2 - (great.x + 40);
    if (span >= 30 && great.h >= 76) gamesParts = { pingpong: gamesParts?.pingpong ?? null, arcade: arcadeNook(b, great.x + 40 + Math.round((span - 24) / 2), great.y + 6, { hallY: hy, aisleX: a1 }) };
  }

  // ---- outside: the sun deck
  let eventArea: Rect;
  if (east) {
    const SL = clamp(Math.round(OUT * 0.22), 24, 48);
    const deck: Rect = { x: XI + 5, y: D, w: W - SL - 3 - (XI + 5), h: H - D };
    plan.deck = deck;
    plan.deckSide = "east";
    plan.slope = { x: W - SL, y: D, w: SL, h: H - D };
    plan.open = { x: XI, y: 0, w: W - XI, h: D };
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
  } else if (south) {
    const deck: Rect = { x: 6, y: deckTop, w: W - 12, h: deckH };
    plan.deck = deck;
    plan.deckSide = "south";
    plan.slope = { x: 0, y: H - SB, w: W, h: SB };
    plan.deckWall = { x0: 0, y0: deckTop - 3, x1: W, y1: deckTop - 3, gaps: [] };
    eventArea = southDeck(b, plan, deck, halls[1]!);
  } else {
    // No deck: get-togethers on the great room floor, or in the ski room.
    const couch = tvParts.couch;
    const free = great.y + great.h - (couch.y + couch.h + 6);
    eventArea = free >= 60 || !games ? { x: great.x + 16, y: couch.y + couch.h + 4, w: great.w - 32, h: Math.max(26, free) } : games;
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
  if (plan.deck && plan.deckSide === "east") {
    L.patrol = [
      { x: 12, y: hy, c: true },
      { x: plan.deck.x + plan.deck.w - 10, y: hy, c: true },
    ];
  }
  cutDoors(L, plan);
  L.themeData = plan;
  if (plan.deck) L.words = { "in the lounge": "on the sun deck" };
  return L;
}

// ------------------------------------------------------------------ portrait

function portraitPlan(W: number, H: number, threads: number): Layout | null {
  const b = new Builder();
  const D = 72;
  const aisleX = W - 8;
  const x0 = 6;
  const innerW = W - 20;
  const gap = 16;
  // The board and calendar on the left, the chimney (TV on it) in the middle, the door at the right.
  const tvW = clamp(W - 252, 88, 112);
  const tvH = Math.round(tvW * 0.54);
  const boardEnd = Math.min(172, 8 + Math.min(128, W - 210) + 28);
  const ch = chimneyAt(Math.max(boardEnd + 6 + (tvW + 40) / 2, Math.min(W / 2, aisleX - 40 - (tvW + 40) / 2)), tvW, tvH);
  const DC = ch.DC;
  const segments: WallSegment[] = [
    { x0: 0, x1: ch.chimney.x, depth: D },
    { x0: ch.chimney.x, x1: ch.chimney.x + ch.chimney.w, depth: DC },
    { x0: ch.chimney.x + ch.chimney.w, x1: W, depth: D },
  ];
  const plan: CabinPlan = {
    variant: "portrait",
    segKinds: ["timber", "chimney", "timber"],
    fire: { chimney: ch.chimney, box: ch.box, mantel: ch.mantel, hearth: ch.hearth },
    woodpile: ch.woodpile,
    inside: { x: 0, y: 0, w: W, h: H },
    deck: null,
    deckSide: null,
    slope: null,
    open: null,
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
  const podCols = Math.max(2, Math.floor(innerW / 48));
  const needPods = Math.ceil((threads + 3) / (2 * podCols));
  type Row = { kind: "great" | "pods" | "kitchenMeeting" | "pods2" | "games" | "library" | "mudBoss" | "deck"; h: number; grow: number };
  const rows: Row[] = [
    { kind: "great", h: 88, grow: 0.5 },
    { kind: "pods", h: POD_H, grow: 0 },
    { kind: "kitchenMeeting", h: 104, grow: 1 },
    { kind: "mudBoss", h: 136, grow: 1.4 },
  ];
  const top = DC + 2;
  const SB = 20;
  const FB = H - SB;
  const used = () => top + rows.reduce((s, r) => s + r.h + gap, 0) - gap;
  const deckH = 104;
  const withDeck = used() + gap + deckH <= FB - 2;
  if (withDeck) rows.push({ kind: "deck", h: deckH, grow: 0.6 });
  const end = withDeck ? FB : H - 4;
  if (needPods >= 2 && used() + POD_H + gap <= end) rows.splice(2, 0, { kind: "pods2", h: POD_H, grow: 0 });
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
  for (const { row, rect } of placed) {
    const hallY = hallOf.get(row)!;
    const acc: Access = { hallY, aisleX };
    switch (row.kind) {
      case "great": {
        great = rect;
        tvParts = buildGreatRoom(b, rect, acc, ch.wallTv, !rows.some((r) => r.kind === "games" || r.kind === "library" || r.kind === "deck"));
        // No ski room: the old arcade cabinet stands in the corner between the piano and the sofa.
        const span = tvParts.couch.x - 2 - (rect.x + 40);
        if (!rows.some((r) => r.kind === "games") && span >= 30 && rect.h >= 70) {
          const arcade = arcadeNook(b, rect.x + 40 + Math.round((span - 24) / 2), rect.y + 6, acc);
          gamesParts = { pingpong: null, arcade };
        }
        break;
      }
      case "pods":
      case "pods2":
        buildPods(b, { ...rect, h: Math.min(rect.h, POD_H) }, acc);
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
        buildLibrary(b, { ...rect, y: rect.y + 8, h: rect.h - 8 }, acc);
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
        plan.deckWall = { x0: 0, y0: deck.y - 3, x1: W, y1: deck.y - 3, gaps: [] };
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
  const boardW = Math.min(128, ch.chimney.x - 44);
  L.wall.pinboard = { x: 8, y: 3, w: boardW, h: Math.min(53, D - 11) };
  L.wall.calendar = { x: 8 + boardW + 8, y: 6, w: 20, h: 22 };
  L.wall.status = { x: 8 + boardW + 8, y: 31, w: 20, h: 18 };
  dressWall(L, plan, segments, Math.min(aisleX, W - 14), D);
  L.entrance = { x: aisleX, y: D + 2 };
  L.entrancePath = [{ x: aisleX, y: net.halls[0]!, c: true }, L.entrance];
  cutDoors(L, plan);
  L.themeData = plan;
  if (plan.deck) L.words = { "in the lounge": "on the sun deck" };
  return L;
}

/** The Mountain Cabin floor plan for a panel (null: the classic plan). */
export function cabinPlan(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return opts.portrait ? portraitPlan(W, H, opts.threads) : widePlan(W, H, opts.threads);
}
