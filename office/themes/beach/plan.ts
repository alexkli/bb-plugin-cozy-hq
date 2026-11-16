// Surf Villa: the floor plan. A beach villa on its own stretch of coast: the
// villa and its terrace along the top (the work deck under sail shades, the
// living room with the big TV, the planning cabana), a pool deck in the
// middle (the tiki bar, the infinity pool, the board shed), and the beach
// along the bottom (deck chairs under umbrellas, the bonfire, the surf shack,
// your bungalow) down to the surf.
import type { Layout, Rect, Spot } from "../../layout.ts";
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
  clamp,
  finish,
  POD_H,
  utilities,
  type Access,
  type Network,
  type WallSegment,
} from "../../themekit.ts";

/** What the drawing needs to know about the plan (kept in L.themeData). */
export interface BeachPlan {
  /** The villa's deck ends here; below is the pool deck or the sand. */
  terraceEnd: number;
  /** The paved pool deck band, when there is one. */
  pavers: { y0: number; y1: number } | null;
  /** The sand starts here. */
  sandY: number;
  pools: Rect[];
  /** The surf along the bottom. */
  sea: Rect | null;
  /** Beach umbrellas over the deck chairs (pole base), and towels under them. */
  umbrellas: { x: number; y: number }[];
  towels: Rect[];
  bonfire: { x: number; y: number } | null;
  tower: { x: number; y: number } | null;
  /** Boardwalks over the sand (halls and aisles). */
  walks: Rect[];
  /** A sign over the surf shack. */
  shack: Rect | null;
}

export function planOf(L: Layout): BeachPlan | null {
  const d = L.themeData as { beach?: BeachPlan } | undefined;
  return d?.beach ?? null;
}

function emptyPlan(): BeachPlan {
  return { terraceEnd: 0, pavers: null, sandY: 0, pools: [], sea: null, umbrellas: [], towels: [], bonfire: null, tower: null, walks: [], shack: null };
}

/** Deck chairs in pairs under beach umbrellas, a front desk at the top right: the veranda where threads wait for you. */
function beachChairs(b: Builder, r: Rect, hallY: number, plan: BeachPlan, maxRows: number): void {
  b.rooms.push({ kind: "waiting", rect: r });
  const aisleX = r.x + 6;
  const recX = r.x + r.w - 38;
  b.prop("reception", "reception", recX, r.y + 2, r.y + 20);
  b.poke("bell", "bell", { x: recX, y: r.y - 4, w: 34, h: 24 });
  const seats: Spot[] = [];
  for (let row = 0, y = r.y + 34; row < maxRows && y + 4 <= r.y + r.h; row++, y += 46) {
    const end = row === 0 ? recX - 4 : r.x + r.w - 4;
    for (let px = r.x + 12; px + 40 <= end; px += 50) {
      for (const dx of [8, 30]) {
        const x = px + dx;
        const n = seats.length;
        seats.push({
          id: `wait-${n}`,
          kind: "review",
          group: "review",
          x,
          y,
          facing: "front",
          pose: "sit-front",
          path: [{ x: aisleX, y: hallY, c: true }, { x: aisleX, y: y - 22 }, { x, y: y - 22 }, { x, y }],
          activity: "waiting for you",
          lift: 2,
        });
        b.prop(`wait-chair-${n}`, "waiting-chair", x - 8, y - 15, y - 2);
      }
      plan.umbrellas.push({ x: px + 19, y: y - 3 });
      plan.towels.push({ x: px - 1, y: y - 11, w: 42, h: 15 });
    }
  }
  for (const s of seats) b.spot(s);
  b.seats.push(...seats);
}

/** The beach below the chairs or beside them: the bonfire, a lifeguard tower, open sand for events. */
function beachEvents(area: Rect, plan: BeachPlan): Rect {
  let ev = { ...area };
  if (ev.w >= 150) {
    plan.tower = { x: ev.x + 12, y: ev.y + ev.h - 2 };
    ev = { ...ev, x: ev.x + 28, w: ev.w - 28 };
  }
  if (ev.w >= 130) {
    plan.bonfire = { x: ev.x + ev.w - 16, y: ev.y + Math.round(ev.h / 2) + 4 };
    ev = { ...ev, w: ev.w - 32 };
  }
  return ev;
}

// ------------------------------------------------------------------ wide

function wide(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const plan = emptyPlan();
  const podCols = clamp(Math.floor((W * 0.34) / 48), 3, 6);
  const c1x = 6;
  const c1w = podCols * 48;
  const a12 = c1x + c1w + 8;
  const c3w = clamp(Math.round(W * 0.27), 150, 240);
  const c3x = W - 6 - c3w;
  const a23 = c3x - 8;
  const c2x = a12 + 8;
  const c2w = a23 - 8 - c2x;
  // The villa: the TV wall of the living room is the deepest.
  const d1 = 64;
  const d2 = 88;
  const d3 = 70;
  const segments: WallSegment[] = [
    { x0: 0, x1: a12 + 14, depth: d1 },
    { x0: a12 + 14, x1: a23 - 2, depth: d2 },
    { x0: a23 - 2, x1: W, depth: d3 },
  ];
  const wantPods = Math.ceil((threads + 3) / (2 * podCols));
  const seaH = H >= 380 ? clamp(Math.round(H * 0.045), 14, 26) : 0;
  const shore = H - seaH;
  // Three levels (terrace, pool deck, beach) when there's height; else two.
  const oneRow = Math.max(d1 + POD_H + 10, d3 + 8 + 112);
  const twoTop = wantPods >= 2 && shore - (d1 + 2 * POD_H + 10) >= 230;
  let hy1 = twoTop ? d1 + 2 * POD_H + 10 : oneRow;
  const three = shore - hy1 >= 205;
  if (!three) hy1 = clamp(Math.max(Math.round(H * 0.56), hy1), oneRow, H - 110);
  const midH = three ? clamp(Math.round((shore - hy1 - 20) * 0.38), 70, 104) : 0;
  const hy2 = three ? hy1 + 10 + midH + 10 : hy1;
  const net: Network = { halls: three ? [hy1, hy2] : [hy1], aisles: [a12, a23] };
  const bandY = (three ? hy2 : hy1) + 12;
  // Two levels: a narrow strip of surf along the bottom when there's room under your bungalow.
  const lowSea = three ? 0 : Math.min(14, H - 6 - (hy1 + 12) - 134);
  const bandEnd = three ? shore - 4 : lowSea >= 10 ? H - lowSea - 4 : H - 6;
  plan.terraceEnd = hy1 + 9;
  plan.pavers = three ? { y0: hy1 + 9, y1: hy2 - 2 } : null;
  plan.sandY = three ? hy2 - 2 : hy1 + 9;
  plan.sea = seaH > 0 && three ? { x: 0, y: shore, w: W, h: seaH } : lowSea >= 10 ? { x: 0, y: H - lowSea, w: W, h: lowSea } : null;

  // ---- the terrace: the work deck, the living room, the cabana
  buildPods(b, { x: c1x, y: d1, w: c1w, h: hy1 - 8 - d1 }, { hallY: hy1, aisleX: a12 });
  const leftBelow = bandEnd - bandY;
  const podsBelow = three && !twoTop && wantPods >= 2 && leftBelow >= POD_H;
  const gamesH = three ? Math.min(150, leftBelow - (podsBelow ? POD_H + 10 : 0)) : 0;
  const hasGames = gamesH >= 80;
  const tvW = Math.min(c2w - 50, 144);
  const tvH = Math.min(Math.round(tvW * 0.56), d2 - 14);
  const wallTv: Rect = { x: c2x + Math.round((c2w - tvW) / 2), y: d2 - tvH - 6, w: tvW, h: tvH };
  const lounge: Rect = { x: c2x, y: d2, w: c2w, h: hy1 - 8 - d2 };
  // A tall living room gets a reading nook with peacock chairs at the back.
  const nook = lounge.h >= 166;
  const loungeTop: Rect = nook ? { ...lounge, h: lounge.h - 94 } : lounge;
  const tvParts = buildLounge(b, loungeTop, { hallY: hy1, aisleX: a23 }, wallTv, !hasGames && !nook);
  if (nook) buildLibrary(b, { x: c2x, y: lounge.y + lounge.h - 80, w: c2w, h: 80 }, { hallY: hy1, aisleX: a23 });
  const topH = hy1 - 8 - d3;
  const serverTop = topH >= 204;
  const meeting: Rect = { x: c3x, y: d3, w: c3w, h: serverTop ? Math.min(230, topH - 54) : topH };
  const whiteboard = buildMeeting(b, meeting, hy1);
  if (serverTop) {
    const sy = meeting.y + meeting.h + 8;
    buildServerRoom(b, { x: c3x, y: sy, w: c3w - 28, h: Math.min(64, hy1 - 10 - sy) });
  }

  // ---- the pool deck: the tiki bar, the infinity pool, the board shed
  let kitchen: Rect;
  const leftAcc: Access = { hallY: hy1, aisleX: a12 };
  if (three) {
    kitchen = { x: c1x, y: hy1 + 18, w: c1w, h: midH - 8 };
    buildKitchen(b, kitchen, leftAcc);
    plan.pools.push({ x: c2x + 10, y: hy1 + 16, w: c2w - 20, h: midH - 10 });
    const bandBottom = hy2 - 8;
    if (!b.server && c3w - 78 >= 60) buildServerRoom(b, { x: c3x, y: hy1 + 14, w: c3w - 78, h: Math.min(56, midH - 12) });
    utilities(b, bandBottom, c3x + c3w - 72, hy1);
  } else {
    const kh = clamp(bandEnd - (hy1 + 10), 64, 92);
    kitchen = { x: c1x, y: hy1 + 18, w: c1w, h: kh - 8 };
    buildKitchen(b, kitchen, leftAcc);
  }

  // ---- the beach: the surf shack, the deck chairs and the bonfire, your bungalow
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  const bottomAcc: Access = { hallY: three ? hy2 : hy1, aisleX: a12 };
  if (three) {
    let y = bandY;
    if (podsBelow) {
      buildPods(b, { x: c1x, y, w: c1w, h: POD_H }, bottomAcc);
      y += POD_H + 10;
    }
    if (hasGames) {
      games = { x: c1x, y: y + 4, w: c1w, h: Math.min(gamesH, bandEnd - y - 4) };
      gamesParts = buildGames(b, games, bottomAcc);
      plan.shack = { x: games.x + 30, y: games.y - 9, w: Math.min(80, games.w - 60), h: 9 };
    }
  } else {
    const below = bandEnd - (kitchen.y + kitchen.h + 8);
    if (below >= 104) {
      games = { x: c1x, y: kitchen.y + kitchen.h + 14, w: c1w, h: Math.min(150, below - 6) };
      gamesParts = buildGames(b, games, leftAcc);
    } else if (below >= 42 && !b.server) {
      buildServerRoom(b, { x: c1x + 8, y: kitchen.y + kitchen.h + 8, w: c1w - 16, h: Math.min(56, below - 2) });
    } else if (below >= 40) {
      utilities(b, H, c1x + 4, hy1);
    }
  }
  // Center: the deck chairs, and the beach for events.
  const beach: Rect = { x: c2x, y: bandY, w: c2w, h: bandEnd - bandY };
  let waiting: Rect;
  let eventArea: Rect | null = null;
  if (beach.w >= 380) {
    const ww = clamp(Math.round(beach.w * 0.56), 200, 420);
    waiting = { x: beach.x, y: beach.y, w: ww, h: beach.h };
    beachChairs(b, waiting, bottomAcc.hallY, plan, beach.h >= 190 ? 3 : 2);
    eventArea = beachEvents({ x: beach.x + ww + 14, y: beach.y + 6, w: beach.w - ww - 20, h: Math.min(beach.h - 10, 110) }, plan);
  } else {
    const rows = beach.h >= 200 ? 3 : beach.h >= 134 ? 2 : 1;
    const wh = 34 + (rows - 1) * 46 + 8;
    waiting = { x: beach.x, y: beach.y, w: beach.w, h: wh };
    beachChairs(b, waiting, bottomAcc.hallY, plan, rows);
    const rest: Rect = { x: beach.x + 6, y: waiting.y + wh + 4, w: beach.w - 12, h: Math.min(110, beach.y + beach.h - (waiting.y + wh + 4)) };
    if (!b.server && rest.w >= 170 && rest.h >= 40) {
      // No room elsewhere: the board shed stands on the beach.
      buildServerRoom(b, { x: rest.x + rest.w - 96, y: rest.y + 2, w: 96, h: Math.min(56, rest.h - 2) });
      rest.w -= 104;
    }
    if (!three && rest.w >= 100 && rest.h >= 36) {
      // No pool deck at this height: a plunge pool on the beach instead (events gather on the terrace).
      plan.pools.push({ x: rest.x + 8, y: rest.y + 7, w: rest.w - 16, h: rest.h - 12 });
    } else if (rest.h >= 30) eventArea = beachEvents(rest, plan);
  }
  const bossRoom: Rect = { x: c3x, y: bandY, w: c3w, h: clamp(bandEnd - bandY, 96, 230) };
  const boss = buildBoss(b, bossRoom, bottomAcc.hallY);
  if (!b.server) {
    // Short panels: the board shed goes under the work deck or beside the tiki bar.
    const podGapY = d1 + POD_H + 6;
    if (hy1 - 12 - podGapY >= 44) buildServerRoom(b, { x: c1x + 8, y: podGapY, w: Math.min(c1w - 16, 132), h: Math.min(56, hy1 - 12 - podGapY) });
    else if (bossRoom.y + bossRoom.h + 8 + 40 <= H - 4) buildServerRoom(b, { x: c3x, y: bossRoom.y + bossRoom.h + 8, w: c3w, h: Math.min(56, H - 4 - (bossRoom.y + bossRoom.h + 8)) });
  }
  // Boardwalks over the sand.
  if (three) {
    plan.walks.push({ x: 0, y: hy2 - 7, w: W, h: 14 });
    for (const ax of net.aisles) plan.walks.push({ x: ax - 7, y: hy2 + 7, w: 14, h: shore - hy2 - 7 });
  } else {
    for (const ax of net.aisles) plan.walks.push({ x: ax - 7, y: hy1 + 9, w: 14, h: (plan.sea?.y ?? H) - hy1 - 9 });
  }
  const couch = tvParts.couch;
  if (!eventArea) {
    const loungeFree = lounge.y + lounge.h - (couch.y + couch.h + 6);
    eventArea = loungeFree >= 50 || games === null ? { x: lounge.x + 16, y: couch.y + couch.h + 4, w: lounge.w - 32, h: Math.max(26, loungeFree) } : games;
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
  L.themeData = { beach: plan };
  return L;
}

// ------------------------------------------------------------------ portrait

function portrait(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const plan = emptyPlan();
  const aisleX = W - 8;
  const innerW = W - 20;
  const x0 = 6;
  const segments: WallSegment[] = [
    { x0: 0, x1: Math.round(W * 0.42), depth: 64 },
    { x0: Math.round(W * 0.42), x1: Math.round(W * 0.7), depth: 54 },
    { x0: Math.round(W * 0.7), x1: W, depth: 70 },
  ];
  const baseRows = POD_H + 112 + 136 + 136 + 16 * 4;
  const seaH = H - (70 + baseRows) >= 100 ? clamp(Math.round(H * 0.022), 12, 22) : 0;
  const shore = H - seaH;
  const top = 70;
  const gap = 16;
  type Kind = "podA" | "kitchenMeeting" | "lounge" | "pool" | "podB" | "games" | "waitingBoss";
  type Row = { kind: Kind; min: number; grow: number };
  const podCols = Math.max(2, Math.floor(innerW / 48));
  const rows: Row[] = [
    { kind: "podA", min: POD_H, grow: 0 },
    { kind: "kitchenMeeting", min: 112, grow: 1 },
    { kind: "lounge", min: 136, grow: 1 },
    { kind: "waitingBoss", min: 136, grow: 1.5 },
  ];
  const optional: Row[] = [
    { kind: "pool", min: 64, grow: 0.6 },
    { kind: "podB", min: POD_H, grow: 0 },
    { kind: "games", min: 86, grow: 0.5 },
  ];
  const needPods = Math.ceil((threads + 3) / (2 * podCols));
  const used = () => rows.reduce((s, r) => s + r.min, 0) + gap * rows.length;
  for (const o of optional) {
    if (o.kind === "podB" && needPods < 2 && shore - top - used() < o.min + gap + 220) continue;
    if (top + used() + o.min + gap > shore - 6) continue;
    // The pool deck goes right under the living room; the rest above the beach.
    if (o.kind === "pool") rows.splice(rows.findIndex((r) => r.kind === "lounge") + 1, 0, o);
    else rows.splice(rows.length - 1, 0, o);
  }
  const extra = Math.max(0, shore - 6 - top - used());
  const growSum = rows.reduce((s, r) => s + r.grow, 0) || 1;
  const halls: number[] = [];
  const laid: { row: Row; rect: Rect; hallY: number }[] = [];
  let y = top;
  for (const row of rows) {
    const h = row.min + Math.floor((extra * row.grow) / growSum);
    const rect: Rect = { x: x0, y, w: innerW, h };
    const hallY = row.kind === "waitingBoss" ? y - gap / 2 : y + h + gap / 2;
    laid.push({ row, rect, hallY });
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
  let eventArea: Rect | null = null;
  for (const { row, rect, hallY } of laid) {
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
        tvParts = buildLounge(b, rect, acc, null, !rows.some((r) => r.kind === "games"));
        plan.terraceEnd = rect.y + rect.h + gap / 2 + 1;
        break;
      case "pool": {
        // The pool deck: open paving for events on the left, the infinity pool on the right.
        const ew = clamp(Math.round(rect.w * 0.4), 80, 160);
        eventArea = { x: rect.x + 8, y: rect.y + 4, w: ew, h: rect.h - 8 };
        plan.pools.push({ x: rect.x + ew + 22, y: rect.y + 4, w: rect.w - ew - 30, h: rect.h - 8 });
        plan.pavers = { y0: plan.terraceEnd, y1: rect.y + rect.h + gap / 2 - 2 };
        plan.sandY = plan.pavers.y1;
        break;
      }
      case "games":
        games = rect;
        gamesParts = buildGames(b, { ...rect, y: rect.y + 6, h: rect.h - 6 }, acc);
        plan.shack = { x: rect.x + 30, y: rect.y - 3, w: Math.min(80, rect.w - 60), h: 9 };
        break;
      case "waitingBoss": {
        const ww = Math.round(rect.w * 0.56);
        waiting = { x: rect.x, y: rect.y + 4, w: ww - 4, h: rect.h - 54 };
        beachChairs(b, waiting, hallY, plan, waiting.h >= 84 ? 2 : 1);
        const bossRoom: Rect = { x: rect.x + ww + 4, y: rect.y + 4, w: rect.w - ww - 4, h: Math.min(rect.h - 8, shore - 4 - (rect.y + 4)) };
        boss = buildBoss(b, bossRoom, hallY);
        break;
      }
    }
  }
  utilities(b, shore, x0 + 2, net.halls[net.halls.length - 1]!);
  if (waiting) {
    const w0 = waiting as Rect;
    const t = w0.y + w0.h + 6;
    const sw = w0.x + w0.w - (x0 + 78);
    if (sw >= 60 && shore - 4 - t >= 34) buildServerRoom(b, { x: x0 + 78, y: t, w: sw, h: Math.min(48, shore - 4 - t) });
  }
  plan.sea = seaH > 0 ? { x: 0, y: shore, w: W, h: seaH } : null;
  if (!plan.pavers) plan.sandY = plan.terraceEnd;
  const lastHall = net.halls[net.halls.length - 1]!;
  plan.walks.push({ x: aisleX - 7, y: plan.sandY, w: 14, h: shore - plan.sandY });
  for (const hy of net.halls) if (hy > plan.sandY + 4) plan.walks.push({ x: 0, y: hy - 7, w: W, h: 14 });
  void lastHall;
  const L = finish(b, W, H, true, segments, net, {
    meeting: meeting!,
    whiteboard: whiteboard!,
    boss: boss!,
    waiting: waiting!,
    kitchen: kitchen!,
    lounge: lounge!,
    games,
    eventArea: eventArea ?? games ?? { x: lounge!.x + 10, y: tvParts!.couch.y + 30, w: lounge!.w - 20, h: Math.max(30, lounge!.y + lounge!.h - tvParts!.couch.y - 30) },
    tvParts: tvParts!,
    gamesParts,
    doorX: aisleX,
    lamp: boss!.lamp,
  });
  L.themeData = { beach: plan };
  return L;
}

export function beachLayout(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  return opts.portrait ? portrait(W, H, opts.threads) : wide(W, H, opts.threads);
}
