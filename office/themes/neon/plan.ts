// Neon City floor plan: the office laid out along a neon night-market street.
// The main hallway is a wide street (asphalt, crosswalks, glowing bollards,
// lantern strings overhead); the rooms open onto it like shopfronts: capsule
// pods, a rooftop lounge under a wall of megacity windows, a holo dome, the
// noodle stall, the queue lounge, the core and your penthouse. Pure data: no
// canvas here (the layout tests run it in node).
import type { Layout, Rect } from "../../layout.ts";
import {
  Builder,
  buildBoss,
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
  utilities,
  type Access,
  type Network,
  type WallSegment,
} from "../../themekit.ts";
import type { PlantPlacement } from "../../layout.ts";
import { learnWalkways, walkwaysOf } from "../../walkways.ts";

/** What the drawing code needs to know about the plan (kept in `L.themeData`). */
export interface NeonPlan {
  neon: true;
  /** One street per hallway: the band hy − half … hy + half. */
  streets: { y: number; half: number; main: boolean }[];
  /** Glowing bollards along the curbs. */
  bollards: { x: number; y: number }[];
  /** Lantern strings hung across a street, from (x, y0) to (x + lean, y1). */
  lanterns: { x: number; y0: number; y1: number; lean: number }[];
  /** Market carts parked in the street's far lane (x, base y, kind). */
  carts: { x: number; y: number; kind: number }[];
  /** A plaza off the main street where events gather (two-street plans). */
  plaza?: Rect;
  /** Storefronts: rooms facing a street get an awning (below it) or a shop ledge (above it). */
  fronts?: Front[];
  /** Street furniture: crosswalk signals, AC units, a dumpster (with a cat), a parked hover-bike, a holo billboard. */
  bits?: { kind: "signal" | "ac" | "dumpster" | "bike" | "billboard" | "booth" | "aframe"; x: number; y: number; text?: string; color?: string }[];
}

export interface Front {
  kind: string;
  x0: number;
  x1: number;
  /** The front line: the curb side of the room. */
  y: number;
  /** "top": the room is below the street (awning); "bottom": above it (shop ledge). */
  side: "top" | "bottom";
  sign: string;
  color: string;
  /** Doorways (x centers) where people walk in. */
  gaps: number[];
  main: boolean;
}

const FRONT_SIGNS: Record<string, [string, string]> = {
  pod: ["CAPSULES", "#2ef2ff"],
  kitchen: ["RAMEN", "#ff3b5c"],
  waiting: ["TICKETS", "#ffd23f"],
  lounge: ["ROOFTOP", "#ff2fa8"],
  games: ["ARCADE", "#ff2fa8"],
  library: ["DATA", "#7dff6a"],
  garden: ["BIO DOME", "#7dff6a"],
};

export function planOf(L: Layout): NeonPlan | null {
  const d = L.themeData as NeonPlan | undefined;
  return d && d.neon ? d : null;
}

export function neonLayout(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  const L = opts.portrait ? neonPortrait(W, H, opts.threads) : H >= 460 ? neonBlocks(W, H) : neonWide(W, H, opts.threads);
  return dress(L, opts.portrait);
}

// ------------------------------------------------------------------ wide, two streets

/**
 * Tall enough panels get a proper city block: the main street, and an alley
 * market further down. Above the main street: the capsule den, the rooftop
 * lounge and the holo dome. Between the streets: the ramen shop, a plaza in
 * front of the ticket office (the queue lounge) and your penthouse. Down the
 * alley: more capsules, the arcade, the core behind its grille.
 */
function neonBlocks(W: number, H: number): Layout {
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
  const d2 = 90;
  const d3 = 70;
  const segments: WallSegment[] = [
    { x0: 0, x1: a12 + 14, depth: d1 },
    { x0: a12 + 14, x1: a23 - 2, depth: d2 },
    { x0: a23 - 2, x1: W, depth: d3 },
  ];
  const S1 = H >= 520 ? 19 : 16;
  const S2 = 10;
  const avail = H - 6 - d1 - 2 * S1 - 2 * S2;
  const extra = Math.max(0, avail - (110 + 130 + 98));
  // Tall panels: two capsule rows up top and the arcade deck under the lounge.
  const topH = extra >= 100 ? 210 : 110 + Math.floor(extra * 0.3);
  const midH = 130 + Math.floor((extra - (topH - 110)) * 0.55);
  const botH = avail - topH - midH;
  const T = d1 + topH;
  const hy1 = T + S1;
  const midTop = hy1 + S1;
  const M = midTop + midH;
  const hy2 = M + S2;
  const botTop = hy2 + S2;
  const botEnd = H - 6;
  const net: Network = { halls: [hy1, hy2], aisles: [a12, a23] };

  // Above the main street.
  buildPods(b, { x: c1x, y: d1, w: c1w, h: T - d1 - 2 }, { hallY: hy1, aisleX: a12 });
  const tvW = Math.min(c2w - 50, 144);
  const tvH = Math.min(Math.round(tvW * 0.56), d2 - 14);
  const wallTv: Rect = { x: c2x + Math.round((c2w - tvW) / 2), y: d2 - tvH - 6, w: tvW, h: tvH };
  const lounge: Rect = { x: c2x, y: d2, w: c2w, h: T - d2 - 2 };
  const arcadeDeck = lounge.h >= 166 && c2w >= 150;
  const loungeTop: Rect = arcadeDeck ? { ...lounge, h: 80 } : lounge;
  // The arcade on the deck or down the alley when there's one, else in the lounge.
  const alleyGames = !arcadeDeck && botEnd - botTop >= 74 && c2w >= 150;
  const tvParts = buildLounge(b, loungeTop, { hallY: hy1, aisleX: a23 }, wallTv, false, !arcadeDeck && !alleyGames);
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  if (arcadeDeck) {
    games = { x: c2x, y: lounge.y + 88, w: c2w, h: lounge.h - 92 };
    gamesParts = buildGames(b, games, { hallY: hy1, aisleX: a23 });
  }
  const meeting: Rect = { x: c3x, y: d3, w: c3w, h: T - d3 - 2 };
  const whiteboard = buildMeeting(b, meeting, hy1);

  // Between the streets: the ramen shop, the plaza and the ticket office, the penthouse.
  const kitchen: Rect = { x: c1x, y: midTop + 18, w: c1w, h: Math.min(84, midH - 22) };
  buildKitchen(b, kitchen, { hallY: hy1, aisleX: a12 });
  const underKitchen = M - (kitchen.y + kitchen.h) - 6;
  if (underKitchen >= 88) buildLibrary(b, { x: c1x, y: kitchen.y + kitchen.h + 14, w: c1w, h: underKitchen - 8 }, { hallY: hy2, aisleX: a12 });
  const plazaH = clamp(midH - 100, 30, 72);
  const plaza: Rect = { x: c2x, y: midTop, w: c2w, h: plazaH };
  const waiting: Rect = { x: c2x, y: midTop + plazaH, w: c2w, h: M - (midTop + plazaH) };
  buildWaiting(b, waiting, hy1);
  const bossRoom: Rect = { x: c3x, y: midTop + 4, w: c3w, h: Math.min(230, M - midTop - 4) };
  const boss = buildBoss(b, bossRoom, hy1);
  if (M - (bossRoom.y + bossRoom.h) >= 50) {
    b.plant("LARGE_PLANT", c3x + 4, M - 50);
    b.plant("PLANT_2", c3x + c3w - 20, M - 34);
  }

  // Down the alley: capsules, the arcade, the hydration tap and the core.
  const bot: Rect = { x: c1x, y: botTop, w: c1w, h: botEnd - botTop };
  if (bot.h >= 96) buildPods(b, { ...bot, y: bot.y + 2, h: bot.h - 2 }, { hallY: hy2, aisleX: a12 });
  else if (bot.h >= 86) buildLibrary(b, { ...bot, y: bot.y + 8, h: bot.h - 8 }, { hallY: hy2, aisleX: a12 });
  if (!games && botEnd - botTop >= 74) {
    games = { x: c2x, y: botTop + 6, w: c2w, h: Math.min(150, botEnd - botTop - 6) };
    gamesParts = buildGames(b, games, { hallY: hy2, aisleX: a23 });
  } else if (botEnd - botTop >= 96) buildGarden(b, { x: c2x, y: botTop + 18, w: c2w, h: botEnd - botTop - 18 }, { hallY: hy2, aisleX: a23 });
  utilities(b, H, c3x + 2, hy2);
  const coreH = Math.min(58, botEnd - botTop - 8);
  if (coreH >= 34) buildServerRoom(b, { x: c3x + 78, y: botTop + 4, w: c3w - 80, h: coreH });

  const L = finish(b, W, H, false, segments, net, {
    meeting,
    whiteboard,
    boss,
    waiting,
    kitchen,
    lounge,
    games,
    eventArea: { x: plaza.x + 12, y: plaza.y + 2, w: plaza.w - 24, h: plaza.h - 2 },
    tvParts,
    gamesParts,
    doorX: a12,
    lamp: boss.lamp,
    wallTv,
  });
  L.themeData = {
    neon: true,
    streets: [
      { y: hy1, half: S1, main: true },
      { y: hy2, half: S2, main: false },
    ],
    bollards: [],
    lanterns: [],
    carts: [],
    plaza,
  } satisfies NeonPlan;
  L.words = { "in the lounge": "on the plaza" };
  return L;
}

// ------------------------------------------------------------------ wide

function neonWide(W: number, H: number, threads: number): Layout {
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
  // The back wall: the rooftop lounge in the middle gets the deepest wall
  // (a wall of glass onto the megacity).
  const d1 = 64;
  const d2 = 90;
  const d3 = 70;
  const segments: WallSegment[] = [
    { x0: 0, x1: a12 + 14, depth: d1 },
    { x0: a12 + 14, x1: a23 - 2, depth: d2 },
    { x0: a23 - 2, x1: W, depth: d3 },
  ];
  // The street: half its width either side of the hallway line.
  const S = H < 340 ? 12 : H < 420 ? 15 : 19;
  const wantPods = Math.ceil((threads + 3) / (2 * podCols));
  const hy = clamp(Math.max(Math.round(H * 0.47), wantPods >= 2 ? d1 + 2 * POD_H + S - 8 : 0), d1 + POD_H + S - 8, H - 98 - S);
  const net: Network = { halls: [hy], aisles: [a12, a23] };
  const leftAcc: Access = { hallY: hy, aisleX: a12 };
  const top = hy - S; // rooms above the street end here
  const bot = hy + S; // and below it start here

  // Left: capsule pods above the street; below it the noodle stall, then more
  // pods, the arcade alley and the data archive as the height allows.
  buildPods(b, { x: c1x, y: d1, w: c1w, h: top - d1 }, leftAcc);
  let below: Rect = { x: c1x, y: bot + 2, w: c1w, h: H - 6 - (bot + 2) };
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
    games = { ...below, y: below.y + 6, h: Math.min(150, below.h - 46) };
    gamesParts = buildGames(b, games, leftAcc);
    const end = below.y + below.h;
    below = { ...below, y: games.y + games.h, h: end - (games.y + games.h) };
    if (below.h - 46 >= 96) {
      const lib: Rect = { ...below, y: below.y + 14, h: below.h - 46 - 14 };
      buildLibrary(b, lib, leftAcc);
      below = { ...below, y: lib.y + lib.h, h: end - (lib.y + lib.h) };
    }
  }
  const utilitiesAt = below.h >= 40 ? c1x + 4 : null;

  // Center: the rooftop lounge under the big wall screen; the queue lounge
  // across the street (a bio-dome under it when tall).
  const tvW = Math.min(c2w - 50, 144);
  const tvH = Math.min(Math.round(tvW * 0.56), d2 - 14);
  const wallTv: Rect = { x: c2x + Math.round((c2w - tvW) / 2), y: d2 - tvH - 6, w: tvW, h: tvH };
  const lounge: Rect = { x: c2x, y: d2, w: c2w, h: top - d2 };
  // A tall lounge becomes a rooftop arcade: the games under the big screen.
  const arcadeDeck = games === null && lounge.h >= 166 && c2w >= 150;
  const nook = !arcadeDeck && lounge.h >= 200;
  const loungeTop: Rect = arcadeDeck ? { ...lounge, h: 80 } : nook ? { ...lounge, h: lounge.h - 94 } : lounge;
  const centerAcc: Access = { hallY: hy, aisleX: a23 };
  const tvParts = buildLounge(b, loungeTop, centerAcc, wallTv, games === null && !nook && !arcadeDeck, !arcadeDeck);
  if (nook) buildLibrary(b, { x: c2x, y: lounge.y + lounge.h - 80, w: c2w, h: 80 }, centerAcc);
  if (arcadeDeck) {
    games = { x: c2x, y: lounge.y + 88, w: c2w, h: lounge.h - 92 };
    gamesParts = buildGames(b, games, centerAcc);
  }
  const fullWait = H - 6 - (bot + 4);
  const garden = fullWait - 162 - 16 >= 96;
  const waiting: Rect = { x: c2x, y: bot + 4, w: c2w, h: garden ? 162 : fullWait };
  buildWaiting(b, waiting, hy);
  if (garden) buildGarden(b, { x: c2x, y: waiting.y + waiting.h + 16, w: c2w, h: fullWait - 162 - 16 }, { hallY: hy, aisleX: a12 });

  // Right: the holo dome (meeting) with the core under it when there's height,
  // your penthouse across the street.
  const topH = top - d3;
  const serverTop = topH >= 204;
  const meeting: Rect = { x: c3x, y: d3, w: c3w, h: serverTop ? Math.min(230, topH - 54) : topH };
  const whiteboard = buildMeeting(b, meeting, hy);
  if (serverTop) {
    const sy = meeting.y + meeting.h + 8;
    buildServerRoom(b, { x: c3x, y: sy, w: c3w - 28, h: Math.min(64, top - 2 - sy) });
  }
  const bossRoom: Rect = { x: c3x, y: bot + 4, w: c3w, h: clamp(H - 10 - (bot + 4), 96, 230) };
  const boss = buildBoss(b, bossRoom, hy);
  const underBoss = H - 6 - (bossRoom.y + bossRoom.h + 8);

  if (utilitiesAt !== null) {
    utilities(b, H, utilitiesAt, hy);
    const sh = Math.min(48, below.h - 4);
    if (!b.server && c1w - 80 >= 60) buildServerRoom(b, { x: c1x + 78, y: H - 4 - sh, w: c1w - 80, h: sh });
    else if (b.server) {
      const row: PlantPlacement["sprite"][] = ["PLANT", "POT", "PLANT_2", "CACTUS", "PLANT"];
      for (let i = 0, x = c1x + 84; x + 16 <= c1x + c1w - 4 && i < row.length; i++, x += 34) {
        b.plant(row[i]!, x, row[i] === "POT" ? H - 20 : H - 36, i % 2 === 0);
      }
    }
  }
  // Short panels: the floor under a single pod row, above the street.
  const podRows = Math.max(1, Math.floor((top - d1 + 8) / POD_H));
  const podGapY = d1 + podRows * POD_H + 6;
  if (!b.server && underBoss < 40 && top - 4 - podGapY >= 44) {
    buildServerRoom(b, { x: c1x + 8, y: podGapY, w: Math.min(c1w - 16, 132), h: Math.min(56, top - 4 - podGapY) });
  }
  if (underBoss >= 40) {
    const y = bossRoom.y + bossRoom.h + 8;
    if (!b.server) buildServerRoom(b, { x: c3x, y, w: c3w, h: Math.min(56, underBoss) });
    else {
      b.plant("LARGE_PLANT", c3x + 4, H - 52);
      b.plant("PLANT_2", c3x + c3w - 20, H - 36);
      if (c3w >= 180) b.plant("CACTUS", c3x + Math.round(c3w / 2) - 8, H - 36);
    }
  }
  const lamp = boss.lamp;
  const couch = tvParts.couch;
  const loungeFree = loungeTop.y + loungeTop.h - (couch.y + couch.h + 6);
  const loungeFloor: Rect = { x: lounge.x + 16, y: couch.y + couch.h + 4, w: lounge.w - 32, h: Math.max(26, loungeFree) };
  // On the arcade deck, parties gather below the ping-pong table.
  const deck = games !== null && arcadeDeck ? (games as Rect) : null;
  const eventArea = loungeFree >= 70 || games === null ? loungeFloor : deck && deck.h >= 70 ? { x: deck.x + 30, y: deck.y + 40, w: deck.w - 60, h: deck.h - 40 } : games;
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
    lamp,
    wallTv,
  });
  L.themeData = { neon: true, streets: [{ y: hy, half: S, main: true }], bollards: [], lanterns: [], carts: [] } satisfies NeonPlan;
  return L;
}

// ------------------------------------------------------------------ portrait

function neonPortrait(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const aisleX = W - 8;
  const innerW = W - 20;
  const x0 = 6;
  const segments: WallSegment[] = [
    { x0: 0, x1: Math.round(W * 0.42), depth: 64 },
    { x0: Math.round(W * 0.42), x1: Math.round(W * 0.7), depth: 58 },
    { x0: Math.round(W * 0.7), x1: W, depth: 70 },
  ];
  const top = 70;
  type Row = { kind: "podA" | "kitchenMeeting" | "lounge" | "podB" | "games" | "waitingBoss" | "library"; min: number; grow: number };
  const podCols = Math.max(2, Math.floor(innerW / 48));
  // The lounge sits right under the windows (the rooftop); then the pods,
  // the noodle stall and the dome, and the queue lounge and penthouse at the end.
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
  // Streets between the rows: wider when there's height to spare.
  const base = rows.reduce((s, r) => s + r.min, 0);
  const gap = clamp(Math.floor((H - 6 - top - base) / rows.length), 16, 30);
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
        buildKitchen(b, { ...kitchen, y: kitchen.y + 10, h: kitchen.h - 10 }, { hallY, aisleX: rect.x + kw - 1 });
        meeting = { x: rect.x + kw + 4, y: rect.y, w: rect.w - kw - 4, h: rect.h - 4 };
        whiteboard = buildMeeting(b, meeting, hallY);
        break;
      }
      case "lounge":
        lounge = rect;
        tvParts = buildLounge(b, rect, acc, null, !rows.some((r) => r.kind === "games" || r.kind === "library"), !rows.some((r) => r.kind === "games"));
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
        waiting = { x: rect.x, y: rect.y + 4, w: ww - 4, h: rect.h - 54 };
        buildWaiting(b, waiting, hallY);
        const bossRoom: Rect = { x: rect.x + ww + 4, y: rect.y + 4, w: rect.w - ww - 4, h: Math.min(rect.h - 8, H - 4 - (rect.y + 4)) };
        boss = buildBoss(b, bossRoom, hallY);
        break;
      }
    }
  }
  utilities(b, H, x0 + 2, net.halls[net.halls.length - 1]!);
  if (waiting) {
    const w0 = waiting as Rect;
    const t0 = w0.y + w0.h + 6;
    const sw = w0.x + w0.w - (x0 + 78);
    if (sw >= 60 && H - 4 - t0 >= 34) buildServerRoom(b, { x: x0 + 78, y: t0, w: sw, h: Math.min(48, H - 4 - t0) });
  }
  const lamp = boss!.lamp;
  const eventArea = games ?? { x: lounge!.x + 10, y: tvParts!.couch.y + 30, w: lounge!.w - 20, h: Math.max(30, lounge!.y + lounge!.h - tvParts!.couch.y - 30) };
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
    lamp,
  });
  const loungeHall = plan.find((p) => p.row.kind === "lounge")?.hallY;
  L.themeData = { neon: true, streets: net.halls.map((hy) => ({ y: hy, half: Math.floor(gap / 2), main: hy === loungeHall })), bollards: [], lanterns: [], carts: [] } satisfies NeonPlan;
  return L;
}

// ------------------------------------------------------------------ the finishing touches

/**
 * Megacity windows wherever the wall is free (wide panes, no hanging plants),
 * and the street furniture: bollards along the curbs and lantern strings,
 * kept clear of everyone's way across the street.
 */
function dress(L: Layout, portrait: boolean): Layout {
  const plan = L.themeData as NeonPlan;
  // Windows: one wide pane per free stretch of wall.
  const busy: [number, number][] = [];
  const w = L.wall;
  busy.push([w.pinboard.x - 4, w.pinboard.x + w.pinboard.w + 4]);
  busy.push([w.calendar.x - 4, w.calendar.x + w.calendar.w + 4]);
  busy.push([w.legendNote.x - 4, w.door.x + w.door.w + 6]);
  busy.push([w.clock.x - w.clock.r - 5, w.clock.x + w.clock.r + 5]);
  for (const p of w.paintings) busy.push([p.x - 4, p.x + 20]);
  for (const px of w.pillars) busy.push([px - 8, px + 8]);
  const tvSeg = L.segments.find((s) => L.tv.x >= s.x0 && L.tv.x < s.x1);
  if (tvSeg && L.tv.y < tvSeg.depth) busy.push([L.tv.x - 19, L.tv.x + L.tv.w + 19]);
  for (const p of L.props) {
    const seg = L.segments.find((s) => p.x >= s.x0 && p.x < s.x1);
    if (seg && p.y < seg.depth - 6) busy.push([p.x - 3, p.x + (p.w ?? 32) + 3]);
  }
  for (const pl of L.plants) {
    if (pl.sprite === "HANGING_PLANT") continue;
    const seg = L.segments.find((s) => pl.x >= s.x0 && pl.x < s.x1);
    if (seg && pl.y < seg.depth - 6) busy.push([pl.x - 3, pl.x + 19]);
  }
  const windows: Rect[] = [];
  for (const s of L.segments) {
    const h = Math.min(50, s.depth - 26);
    if (h < 22) continue;
    let x = s.x0 + 6;
    while (x < s.x1 - 6) {
      const hit = busy.find(([a, z]) => x >= a && x < z);
      if (hit) {
        x = Math.max(x + 1, hit[1]);
        continue;
      }
      let end = x;
      while (end < s.x1 - 6 && !busy.some(([a, z]) => end >= a && end < z)) end++;
      const len = end - x;
      if (len >= 30) {
        const n = Math.max(1, Math.ceil(len / 124));
        const pw = Math.floor((len - (n - 1) * 8) / n);
        for (let i = 0; i < n; i++) windows.push({ x: x + i * (pw + 8), y: 8, w: pw, h });
      }
      x = end + 1;
    }
  }
  if (windows.length > 0) w.windows = windows;
  L.plants = L.plants.filter((p) => p.sprite !== "HANGING_PLANT");

  // Where people cross the curbs (their paths): keep bollards out of the way.
  const segs: [number, number, number][] = [];
  for (const sp of [...L.spots, { path: L.entrancePath }]) {
    for (let i = 1; i < sp.path.length; i++) {
      const a = sp.path[i - 1]!;
      const c = sp.path[i]!;
      if (Math.abs(a.x - c.x) < 2) segs.push([a.x, Math.min(a.y, c.y), Math.max(a.y, c.y)]);
      else segs.push([Math.min(a.x, c.x), Math.max(a.x, c.x), -1 - Math.min(a.y, c.y)]);
    }
  }
  // Things standing in or over the street: tall props at its edge, the vault door.
  const keepOut: [number, number, number, number][] = [];
  for (const p of L.props) {
    if (["vending", "fridge", "espresso", "arcade", "reception", "library-shelf", "whiteboard", "kitchen-counter"].includes(p.kind)) keepOut.push([p.x - 4, p.x + (p.w ?? 26) + 4, p.y - 4, p.y + 50]);
  }
  for (const r of L.rooms) if (r.kind === "boss" && r.doorX !== undefined) keepOut.push([r.doorX - 12, r.doorX + 30, r.rect.y - 24, r.rect.y + 4]);
  const clearAt = (x: number, y: number) =>
    !keepOut.some(([x0, x1, y0, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1) &&
    !L.net.aisles.some((ax) => Math.abs(ax - x) < 14) &&
    !segs.some(([sx, y0, y1]) => (y1 >= 0 ? Math.abs(sx - x) < 10 && y >= y0 - 6 && y <= y1 + 6 : false));
  for (const [si, st] of plan.streets.entries()) {
    if (st.half < 10) continue;
    for (const yy of [st.y - st.half - 1, st.y + st.half + 2]) {
      for (let x = 12; x < L.W - 10; x += portrait ? 30 : 36) if (clearAt(x, yy)) plan.bollards.push({ x, y: yy });
    }
    // Market carts in the far lane, clear of everyone's crossings.
    if (st.half >= 15) {
      const base = st.y + st.half - 2;
      const free = (x: number) => {
        for (let xx = x - 6; xx <= x + 30; xx += 3) if (!clearAt(xx, base - 8) || !clearAt(xx, base)) return false;
        return true;
      };
      const want = Math.min(3, Math.floor(L.W / 230));
      for (let i = 0; i < want; i++) {
        const target = Math.round(((i + 0.5) / want) * L.W) - 12;
        for (let d = 0; d < 120; d += 4) {
          const x = [target + d, target - d].find((c) => c > 8 && c < L.W - 34 && free(c) && !plan.carts.some((q) => Math.abs(q.x - c) < 60));
          if (x !== undefined) {
            plan.carts.push({ x, y: base, kind: (i + si) % 3 });
            break;
          }
        }
      }
    }
    // Lantern strings across the street, between the crossings.
    if (st.half >= 12) {
      const step = portrait ? 96 : 118;
      for (let x = 46; x < L.W - 36; x += step) {
        const lx = x + ((x * 7) % 19);
        if (!L.net.aisles.some((ax) => Math.abs(ax - lx - 5) < 22) && !plan.carts.some((c) => lx > c.x - 14 && lx < c.x + 36)) plan.lanterns.push({ x: lx, y0: st.y - st.half - 8, y1: st.y + st.half - 4, lean: 10 });
      }
    }
  }

  // Storefronts along the streets.
  plan.fronts = [];
  plan.bits = [];
  const crossingsAt = (y: number, x0: number, x1: number) => {
    const xs: number[] = [];
    for (const [sx, y0, y1] of segs) if (y1 >= 0 && sx >= x0 - 2 && sx <= x1 + 2 && y >= y0 - 2 && y <= y1 + 2 && !xs.some((q) => Math.abs(q - sx) < 12)) xs.push(sx);
    return xs.sort((a, c) => a - c);
  };
  for (const room of L.rooms) {
    const r = room.rect;
    for (const st of plan.streets) {
      const below = r.y - (st.y + st.half);
      const above = st.y - st.half - (r.y + r.h);
      const side = below >= -3 && below <= 24 ? "top" : above >= -3 && above <= 24 ? "bottom" : null;
      if (!side) continue;
      if (room.walls) {
        if (room.kind === "boss" && side === "top" && room.doorX !== undefined) plan.bits.push({ kind: "booth", x: room.doorX + 11, y: r.y - 1 });
        continue;
      }
      const def = FRONT_SIGNS[room.kind];
      if (!def) continue;
      const y = side === "top" ? st.y + st.half + 4 : st.y - st.half - 4;
      plan.fronts.push({ kind: room.kind, x0: r.x, x1: r.x + r.w, y, side, sign: def[0], color: def[1], gaps: crossingsAt(y + (side === "top" ? 6 : -6), r.x, r.x + r.w), main: st.main });
    }
  }
  // Sandwich boards on the sidewalk in front of the shops across the street.
  for (const f of plan.fronts) {
    if (f.side !== "bottom" || f.x1 - f.x0 < 60) continue;
    const st = plan.streets.find((q) => Math.abs(q.y - q.half - 4 - f.y) < 2);
    if (!st || st.half < 12) continue;
    const want = (f.x0 + f.x1) / 2 - 8;
    for (let d = 0; d < 60; d += 4) {
      const x = [want + d, want - d].find((c) => c > f.x0 + 4 && c + 16 < f.x1 - 4 && clearAt(c, f.y + 3) && clearAt(c + 16, f.y + 3) && !plan.lanterns.some((l) => Math.abs(l.x - c - 8) < 14));
      if (x !== undefined) {
        plan.bits.push({ kind: "aframe", x: Math.round(x), y: f.y + 4, text: f.sign, color: f.color });
        break;
      }
    }
  }
  // Crosswalk signals at the main street's crossings.
  for (const st of plan.streets) {
    if (!st.main || st.half < 12) continue;
    for (const ax of L.net.aisles) plan.bits.push({ kind: "signal", x: ax + 13 + 6 < L.W - 2 ? ax + 13 : ax - 13, y: st.y - st.half - 2 });
    // A holo billboard floating over the street, between the lantern strings.
    const mid = L.W / 2;
    let bx = Math.round(mid - 22);
    for (const s2 of plan.lanterns) if (bx + 48 > s2.x - 4 && bx < s2.x + 18) bx = s2.x + 22;
    if (st.half >= 15 && bx + 44 < L.W - 6 && !L.net.aisles.some((ax) => bx < ax + 14 && bx + 44 > ax - 14)) plan.bits.push({ kind: "billboard", x: bx, y: st.y - 9 });
  }
  // The alley: AC units on the backs of the buildings, a dumpster, a parked hover-bike.
  const alley = plan.streets.find((q) => !q.main && q.half <= 12);
  if (alley) {
    const top = alley.y - alley.half;
    for (const f of plan.fronts) {
      if (f.y !== top - 4 || f.side !== "bottom") continue;
      for (const k of [0.3, 0.75]) {
        const x = Math.round(f.x0 + (f.x1 - f.x0) * k);
        if (!f.gaps.some((g) => Math.abs(g - x) < 16)) plan.bits.push({ kind: "ac", x, y: f.y });
      }
    }
    const usable = (x: number, w: number) => clearAt(x, alley.y + alley.half + 2) && clearAt(x + w, alley.y + alley.half + 2) && !plan.carts.some((c) => Math.abs(c.x - x) < 40);
    let placed = 0;
    for (let x = 30; x < L.W - 40 && placed < 2; x += 6) {
      if (!usable(x, 26)) continue;
      if (plan.bits.some((q) => Math.abs(q.x - x) < 70 && Math.abs(q.y - alley.y) < 30)) continue;
      const kind = placed === 0 ? "dumpster" : "bike";
      plan.bits.push({ kind, x, y: alley.y + alley.half - 1 });
      placed++;
      x += 120;
    }
  }
  L.walls = wallsOf(L, plan);
  return L;
}

/** Rooms drawn with a neon border round their floor (the noodle bar, the arcade, the queue lounge, the archive, the bio-dome). */
const BORDERED = new Set(["kitchen", "games", "waiting", "library", "garden"]);

/**
 * What nobody cuts across: the streets' curbs (nobody jaywalks: the
 * crosswalks at the alleys and everyone's own ways are the crossings), the
 * capsules, the storefronts' awnings and ledges, the neon borders round the
 * shops, and the carts, bollards and street furniture.
 */
function wallsOf(L: Layout, plan: NeonPlan): Rect[] {
  const out: Rect[] = [];
  for (const st of plan.streets) {
    out.push({ x: 0, y: st.y - st.half - 5, w: L.W, h: 6 }, { x: 0, y: st.y + st.half - 1, w: L.W, h: 6 });
  }
  for (const p of L.pods) out.push({ x: p.x - 4, y: p.y + 2, w: p.w + 8, h: p.h - 2 });
  for (const f of plan.fronts ?? []) {
    if (f.side === "top") out.push({ x: f.x0, y: f.y - 3, w: f.x1 - f.x0, h: f.kind === "kitchen" ? 15 : 9 });
    else out.push({ x: f.x0, y: f.y - 12, w: f.x1 - f.x0, h: 14 });
  }
  for (const room of L.rooms) {
    if (!BORDERED.has(room.kind)) continue;
    const r = room.rect;
    out.push({ x: r.x, y: r.y, w: r.w, h: 3 }, { x: r.x, y: r.y + r.h - 3, w: r.w, h: 3 }, { x: r.x, y: r.y, w: 3, h: r.h }, { x: r.x + r.w - 3, y: r.y, w: 3, h: r.h });
  }
  for (const b of plan.bollards) out.push({ x: b.x - 2, y: b.y - 6, w: 4, h: 9 });
  for (const c of plan.carts) out.push({ x: c.x, y: c.y - 12, w: 26, h: 13 });
  for (const b of plan.bits ?? []) if (b.kind !== "billboard") out.push({ x: b.x - 2, y: b.y - 12, w: 28, h: 14 });
  return out;
}

/** Whether a rect of floor lies on (or just by) a way people walk: the things left about keep off them. */
export function onAWay(L: Layout, r: Rect): boolean {
  if (!walkwaysOf(L.net)) learnWalkways(L);
  return (walkwaysOf(L.net) ?? []).some(
    ({ a: p, b: q }) => r.x < Math.max(p.x, q.x) + 8 && r.x + r.w > Math.min(p.x, q.x) - 8 && r.y < Math.max(p.y, q.y) + 4 && r.y + r.h > Math.min(p.y, q.y) - 8,
  );
}
