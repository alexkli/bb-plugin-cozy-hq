// Redwood Camp floor plan: tents and decks among giant redwoods.
//
// Like the classic plan, boardwalks (the hallways and aisles) connect
// everything, but the rooms leave strips of forest floor between them where
// huge trunks stand, the outdoor screen hangs between two trees, a creek runs
// down beside the big tent past the trout pond, and your cabin is a treehouse
// against a giant redwood.
import {
  type Access,
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
  type Network,
  type Point,
  POD_H,
  utilities,
  type WallSegment,
} from "../../themekit.ts";
import type { Layout, PlantPlacement, Rect } from "../../layout.ts";
import { campBold } from "./camp.ts";
import { outdoors } from "./outdoors.ts";

/** A giant redwood standing on the floor: its base (roots) at y = base, rising h px. */
export interface Tree {
  x: number;
  w: number;
  base: number;
  h: number;
  seed: number;
  /** Trees around the clearing carry the festoon lights; the treehouse tree grows through your cabin. */
  role?: "clearing" | "treehouse";
}

/** What the camp remembers about its plan, for drawing it. */
export interface CampData {
  trees: Tree[];
  /** Forest strips between the rooms (no rooms, few paths). */
  strips: Rect[];
  /** The creek: a wiggly line from the back wall to the bottom edge. */
  creek: { pts: Point[]; w: number } | null;
  /** Where people cross the creek: little plank bridges. */
  bridges: Rect[];
  /** Ropes from the trees to the outdoor screen. */
  screenTrees: [Tree, Tree] | null;
  /** Desk tents: each pod row (or part of one) on its own deck under canvas. */
  tents?: Rect[];
  /** Trails are packed dirt (true) or boardwalks. */
  trails?: boolean;
  /** The treeline along the top: trunks between the sky gaps, posts under the fixtures. */
  line?: Treeline;
}

/** A trunk (or a log post) standing in the treeline, roots at y = d. */
export interface LineTrunk {
  x: number;
  w: number;
  d: number;
  seed: number;
  kind: "trunk" | "post";
  /** Where a post starts (trunks run up out of the picture). */
  top?: number;
  /** A birdhouse nailed on, at this y. */
  house?: number;
}

export interface Treeline {
  trunks: LineTrunk[];
}

/** A pod row split into desk tents of up to `max` columns with forest between them. */
export function deskTents(b: Builder, r: Rect, acc: Access, max = 3, gap = 24, drop = false): Rect[] {
  // Fewer, bigger tents when it's tight (or one column fewer, when `drop`).
  let n = Math.max(1, Math.floor(r.w / 48));
  let k = Math.ceil(n / max);
  if (drop && k > 1 && n * 48 + (k - 1) * gap > r.w) n--;
  k = Math.ceil(n / max);
  while (k > 1 && n * 48 + (k - 1) * gap > r.w) k--;
  const sizes: number[] = [];
  for (let i = 0; i < k; i++) sizes.push(Math.floor(n / k) + (i < n % k ? 1 : 0));
  const total = n * 48 + (k - 1) * gap;
  let x = r.x + Math.floor((r.w - total) / 2);
  const out: Rect[] = [];
  for (const c of sizes) {
    const t: Rect = { x, y: r.y, w: c * 48, h: Math.min(r.h, POD_H) };
    buildPods(b, t, acc);
    out.push(t);
    x += c * 48 + gap;
  }
  return out;
}

export function campData(L: Layout): CampData | null {
  const d = L.themeData as CampData | undefined;
  return d && Array.isArray(d.trees) ? d : null;
}

// ------------------------------------------------------------------ helpers

export function overlaps(a: Rect, b: Rect, m = 0): boolean {
  return a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
}

/** Everything a tree base must keep clear of: paths, spots, props, halls, aisles, rooms. */
export function blockers(L: Layout, open: string[] = []): Rect[] {
  const out: Rect[] = [];
  for (const r of L.rooms) if (!open.includes(r.kind)) out.push({ x: r.rect.x - 2, y: r.rect.y - 4, w: r.rect.w + 4, h: r.rect.h + 6 });
  for (const s of L.spots) {
    out.push({ x: s.x - 7, y: s.y - 4, w: 14, h: 6 });
    for (let i = 1; i < s.path.length; i++) {
      const a = s.path[i - 1]!;
      const c = s.path[i]!;
      out.push({ x: Math.min(a.x, c.x) - 6, y: Math.min(a.y, c.y) - 5, w: Math.abs(c.x - a.x) + 12, h: Math.abs(c.y - a.y) + 8 });
    }
  }
  for (const hy of L.net.halls) out.push({ x: 0, y: hy - 9, w: L.W, h: 18 });
  for (const ax of L.net.aisles) out.push({ x: ax - 8, y: 0, w: 16, h: L.H });
  for (const p of L.props) out.push({ x: p.x, y: p.z - 6, w: 20, h: 8 });
  out.push({ x: L.eventArea.x, y: L.eventArea.y, w: L.eventArea.w, h: L.eventArea.h });
  return out;
}

/** Drop wall plants that would hang behind a tree. */
export function clearPlants(L: Layout, trees: Tree[]): void {
  L.plants = L.plants.filter((p) => {
    if (p.sprite !== "HANGING_PLANT") return true;
    return !trees.some((t) => p.x < t.x + t.w + 2 && p.x + 16 > t.x - 2 && t.base - t.h < 34);
  });
}

export function dropPlant(L: Layout, pred: (p: PlantPlacement) => boolean): void {
  const gone = L.plants.filter(pred);
  if (gone.length === 0) return;
  L.plants = L.plants.filter((p) => !pred(p));
  // Its watering clickable goes too.
  L.pokeables = L.pokeables.filter((k) => !(k.kind === "plant" && gone.some((p) => Math.abs(k.rect.x - p.x) < 1 && k.rect.y >= p.y)));
}

/** Trees along a strip of forest floor, wherever their roots are clear. */
export function stripTrees(L: Layout, strip: Rect, block: Rect[], seed: number, opts: { top?: boolean; maxH?: number; spacing?: number; max?: number; wide?: boolean; roof?: number; w?: number } = {}): Tree[] {
  const out: Tree[] = [];
  const w = opts.w ?? (opts.wide ? clamp(strip.w + 6, 14, 36) : clamp(strip.w - 2, 14, 32));
  const x = Math.round(strip.x + (strip.w - w) / 2);
  const spacing = opts.spacing ?? 120;
  const y0 = strip.y + (opts.top ? 8 : 40);
  const inset = Math.max(4, Math.ceil((w - strip.w) / 2) + 2);
  for (let base = y0; base <= strip.y + strip.h - 2; base += 6) {
    const foot: Rect = { x: x + inset, y: base - 7, w: Math.max(4, w - inset * 2), h: 9 };
    if (foot.y + foot.h > L.H) break;
    if (block.some((b) => overlaps(foot, b))) continue;
    if (out.some((t) => Math.abs(t.base - base) < spacing)) continue;
    // Trees lower down stop short of the one above them.
    const above = out[out.length - 1];
    const h = above ? Math.min(opts.maxH ?? 150, base - above.base - 24) : Math.min(base - (opts.roof ?? 0), opts.maxH ?? 170);
    if (h < (opts.roof !== undefined ? 60 : 50)) continue;
    out.push({ x, w, base, h, seed: seed + out.length * 31 });
    if (out.length >= (opts.max ?? 99)) break;
  }
  return out;
}

/** What a whole tree (trunk and crown) must not hide: rooms, props, people, boardwalks, the wall. */
export function sightBlockers(L: Layout, trees: Tree[]): Rect[] {
  const out: Rect[] = [];
  for (const r of L.rooms) out.push({ x: r.rect.x - 4, y: r.rect.y - 12, w: r.rect.w + 8, h: r.rect.h + 16 });
  for (const p of L.props) out.push({ x: p.x - 2, y: p.y - 2, w: (p.w ?? 24) + 4, h: Math.max(10, p.z - p.y + 4) });
  for (const pl of L.plants) out.push({ x: pl.x, y: pl.y, w: pl.sprite === "LARGE_PLANT" ? 32 : 16, h: pl.z - pl.y + 2 });
  for (const s of L.spots) out.push({ x: s.x - 9, y: s.y - 30, w: 18, h: 33 });
  for (const hy of L.net.halls) out.push({ x: 0, y: hy - 9, w: L.W, h: 18 });
  for (const ax of L.net.aisles) out.push({ x: ax - 9, y: 0, w: 18, h: L.H });
  out.push({ x: 0, y: 0, w: L.W, h: Math.max(...L.segments.map((s) => s.depth)) + 2 });
  out.push({ x: L.eventArea.x - 4, y: L.eventArea.y - 4, w: L.eventArea.w + 8, h: L.eventArea.h + 8 });
  for (const t of trees) out.push({ x: t.x - 14, y: t.base - t.h - 4, w: t.w + 28, h: t.h + 10 });
  return out;
}

/** More giants wherever a whole tree fits on open forest floor. */
export function fillTrees(L: Layout, block: Rect[], trees: Tree[], max: number, seed: number): Tree[] {
  const out: Tree[] = [];
  for (const w of [26, 20, 16]) {
    for (let base = L.H - 4; base > 120 && out.length < max; base -= 5) {
      for (let x = -6; x + w < L.W + 6 && out.length < max; x += 5) {
        const foot: Rect = { x: x + 4, y: base - 7, w: w - 8, h: 9 };
        if (block.some((b) => overlaps(foot, b))) continue;
        const sight = sightBlockers(L, [...trees, ...out]);
        let h = 0;
        for (let hh = 130; hh >= 64; hh -= 6) {
          const crown: Rect = { x: x - 12, y: base - hh, w: w + 24, h: hh - 8 };
          if (!sight.some((b) => overlaps(crown, b))) {
            h = hh;
            break;
          }
        }
        if (h === 0) continue;
        out.push({ x, w, base, h, seed: seed + out.length * 17 });
      }
    }
  }
  return out;
}

// ------------------------------------------------------------------ wide

export function campWide(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const G = W >= 860 ? 34 : W >= 720 ? 30 : W >= 650 ? 26 : 16;
  const edge = W >= 900 ? 30 : W >= 780 ? 18 : 6;
  const podCols = clamp(Math.floor((W * 0.33) / 48), 3, 6);
  const c1x = edge;
  const c1w = podCols * 48 + (W >= 660 && podCols >= 4 ? 24 : 0);
  const a12 = c1x + c1w + 8;
  const c3w = clamp(Math.round(W * 0.24), 150, 230);
  const c3x = W - edge - c3w;
  const a23 = c3x - 8;
  const c2x = a12 + 8 + G;
  const c2w = a23 - 8 - G - c2x;
  const leftStrip: Rect = { x: a12 + 8, y: 0, w: G, h: H };
  const rightStrip: Rect = { x: a23 - 8 - G, y: 0, w: G, h: H };
  const d1 = 64;
  const d2 = 88;
  const d3 = 66;
  const p1 = Math.round(leftStrip.x + G / 2);
  const p2 = Math.round(rightStrip.x + G / 2);
  const segments: WallSegment[] = [
    { x0: 0, x1: p1, depth: d1 },
    { x0: p1, x1: p2, depth: d2 },
    { x0: p2, x1: W, depth: d3 },
  ];
  const wantPods = Math.ceil((threads + 3) / (2 * podCols));
  const hy = clamp(Math.max(Math.round(H * 0.56), wantPods >= 2 ? d1 + 2 * POD_H + 10 : 0), d1 + POD_H + 10, H - 110);
  const net: Network = { halls: [hy], aisles: [a12, a23] };
  const leftAcc: Access = { hallY: hy, aisleX: a12 };

  // Left: pods on decks; below the boardwalk the camp kitchen, more pods,
  // the lawn games and a reading nook as the height allows.
  const tents: Rect[] = [];
  const topRows = Math.max(1, Math.floor((hy - 8 - d1 + 8) / POD_H));
  for (let row = 0; row < topRows; row++) tents.push(...deskTents(b, { x: c1x, y: d1 + row * POD_H, w: c1w, h: POD_H }, leftAcc));
  let below: Rect = { x: c1x, y: hy + 10, w: c1w, h: H - 6 - (hy + 10) };
  const kitchenH = clamp(below.h, 64, 92);
  // The camp kitchen is a pavilion beside the trail, with forest on its other side.
  const kw = c1w >= 216 ? clamp(c1w - 72, 144, 192) : c1w;
  const kitchen: Rect = { x: c1x + c1w - kw, y: below.y + 8, w: kw, h: kitchenH - 8 };
  buildKitchen(b, kitchen, leftAcc);
  below = { ...below, y: below.y + kitchenH + 8, h: below.h - kitchenH - 8 };
  let games: Rect | null = null;
  let gamesParts: ReturnType<typeof buildGames> | null = null;
  if (below.h >= POD_H && wantPods > topRows) {
    tents.push(...deskTents(b, { ...below, h: POD_H }, leftAcc));
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

  // Center: the campfire clearing under the outdoor screen (reached from the
  // left boardwalk, so the creek on the right stays clear), the porch below.
  const tvW = Math.min(c2w - 84, 144);
  const tvH = Math.min(Math.round(tvW * 0.56), d2 - 14);
  const wallTv: Rect = { x: c2x + Math.round((c2w - tvW) / 2), y: d2 - tvH - 6, w: tvW, h: tvH };
  const lounge: Rect = { x: c2x, y: d2, w: c2w, h: hy - 8 - d2 };
  const nook = lounge.h >= 260;
  const loungeTop: Rect = nook ? { ...lounge, h: lounge.h - 94 } : lounge;
  const centerAcc: Access = { hallY: hy, aisleX: a12 };
  const tvParts = buildLounge(b, loungeTop, centerAcc, wallTv, games === null && !nook);
  if (nook) buildLibrary(b, { x: c2x, y: lounge.y + lounge.h - 80, w: c2w, h: 80 }, centerAcc);
  const fullWait = H - 6 - (hy + 12);
  const garden = fullWait - 162 - 16 >= 96;
  const waiting: Rect = { x: c2x, y: hy + 12, w: c2w, h: garden ? 162 : fullWait };
  buildWaiting(b, waiting, hy);
  if (garden) buildGarden(b, { x: c2x, y: waiting.y + waiting.h + 16, w: c2w, h: fullWait - 162 - 16 }, { hallY: hy, aisleX: a12 });

  // Right: the big safari tent, the solar hut, the treehouse cabin.
  const topH = hy - 8 - d3;
  const serverTop = topH >= 204;
  const meeting: Rect = { x: c3x, y: d3, w: c3w, h: serverTop ? Math.min(230, topH - 54) : topH };
  const whiteboard = buildMeeting(b, meeting, hy);
  if (serverTop) {
    const sy = meeting.y + meeting.h + 8;
    buildServerRoom(b, { x: c3x, y: sy, w: c3w - 28, h: Math.min(64, hy - 10 - sy) });
  }
  const bossRoom: Rect = { x: c3x, y: hy + 12, w: c3w, h: clamp(H - 10 - (hy + 12), 96, 230) };
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
  const podRows = Math.max(1, Math.floor((hy - 8 - d1 + 8) / POD_H));
  const podGapY = d1 + podRows * POD_H + 6;
  if (!b.server && underBoss < 40 && hy - 12 - podGapY >= 44) {
    buildServerRoom(b, { x: c1x + 8, y: podGapY, w: Math.min(c1w - 16, 132), h: Math.min(56, hy - 12 - podGapY) });
  }
  if (underBoss >= 40) {
    const y = bossRoom.y + bossRoom.h + 8;
    if (!b.server) buildServerRoom(b, { x: c3x, y, w: c3w, h: Math.min(56, underBoss) });
    else {
      b.plant("LARGE_PLANT", c3x + 4, H - 52);
      b.plant("PLANT_2", c3x + c3w - 20, H - 36);
    }
  }
  const couch = tvParts.couch;
  const loungeFree = loungeTop.y + loungeTop.h - (couch.y + couch.h + 6);
  const side = lounge.w - 2 * 34 >= 110 ? 34 : 16;
  const loungeFloor: Rect = { x: lounge.x + side, y: couch.y + couch.h + 4, w: lounge.w - 2 * side, h: Math.max(26, loungeFree) };
  const eventArea = loungeFree >= 70 || games === null ? loungeFloor : games;
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

  // The young tree in the lounge corner makes way for the giants by the screen.
  dropPlant(L, (p) => p.sprite === "LARGE_PLANT" && p.y < lounge.y + 10 && p.x > lounge.x && p.x < lounge.x + lounge.w);

  // ---- the forest
  const block = blockers(L);
  const trees: Tree[] = [];
  // Giants along the forest strips, the first at the back wall; those two hold the outdoor screen on ropes.
  const tops: Tree[] = [];
  for (const [i, s] of [leftStrip, rightStrip].entries()) {
    const deep = Math.max(segments[i]!.depth, segments[i + 1]!.depth);
    const row = stripTrees(L, { ...s, y: deep - 4, h: H - deep + 4 }, block, 100 + i * 50, { top: true, spacing: 120, max: 3 });
    if (row[0]) tops.push(row[0]);
    trees.push(...row);
  }
  const screenTrees: [Tree, Tree] | null = tops.length === 2 ? [tops[0]!, tops[1]!] : null;
  // Giants along the sides of the clearing, beside where the events gather.
  const openBlock = blockers(L, ["lounge"]);
  if (side >= 30 && eventArea === loungeFloor) {
    const tops = L.props.filter((p) => (p.kind === "piano" || p.kind === "fishtank-stand") && p.y < hy).map((p) => p.z);
    const roof = Math.max(lounge.y + 20, ...tops) + 4;
    const bottom = (nook ? loungeTop.y + loungeTop.h : hy - 4) + 2;
    for (const [i, sx] of [lounge.x + 2, lounge.x + lounge.w - side + 2].entries()) {
      trees.push(...stripTrees(L, { x: sx, y: roof + 40, w: side - 4, h: bottom - roof - 40 }, openBlock, 60 + i * 9, { roof, spacing: 100, max: 2, w: side - 6, maxH: 130 }).map((t) => ({ ...t, role: "clearing" as const })));
    }
  }
  // The edges of the camp are forest too.
  if (edge >= 18) {
    for (const [i, s] of [
      { x: -8, y: d1 + 50, w: edge + 4, h: H - d1 - 50 },
      { x: W - edge + 4, y: d3 + 50, w: edge + 4, h: H - d3 - 50 },
    ].entries()) {
      trees.push(...stripTrees(L, s, block, 300 + i * 40, { spacing: 100, wide: true, roof: (i ? d3 : d1) + 4 }));
    }
  }
  // More giants wherever one fits whole.
  trees.push(...fillTrees(L, block, trees, 4, 500));
  // The creek runs down the strip beside the big tent.
  const springTree = trees.find((t) => t.x >= rightStrip.x - 8 && t.x + t.w <= rightStrip.x + rightStrip.w + 8);
  const creek = creekPath(rightStrip, springTree ? springTree.base - 2 : d3 - 2, H);
  const bridges: Rect[] = [];
  if (creek && b.server && b.server.x > rightStrip.x) {
    // The shock gag and the technician cross over to the solar hut here.
    bridges.push({ x: rightStrip.x - 2, y: b.server.y + b.server.h - 9, w: rightStrip.w + 4, h: 10 });
  }
  if (creek) {
    for (const s of L.spots) {
      for (let i = 1; i < s.path.length; i++) {
        const a = s.path[i - 1]!;
        const c = s.path[i]!;
        if (a.y !== c.y || a.c) continue;
        const x0 = Math.min(a.x, c.x);
        const x1 = Math.max(a.x, c.x);
        if (x0 < rightStrip.x && x1 > rightStrip.x + rightStrip.w && !bridges.some((q) => Math.abs(q.y - (a.y - 6)) < 10)) bridges.push({ x: rightStrip.x - 2, y: a.y - 6, w: rightStrip.w + 4, h: 10 });
      }
    }
    // Keep the creek out from under the trees on its strip.
    const free = trees.filter((t) => t === springTree || !(t.x >= rightStrip.x - 8 && t.x + t.w <= rightStrip.x + rightStrip.w + 8));
    trees.length = 0;
    trees.push(...free);
  }
  const door = L.wall.door;
  for (const t of trees) {
    if (t.base - t.h < door.y + door.h && t.x < door.x + door.w + 4 && t.x + t.w > door.x - 4) t.x = Math.max(t.x, door.x + door.w + 4);
  }
  clearPlants(L, trees);
  const data: CampData = { trees, strips: [leftStrip, rightStrip], creek, bridges, screenTrees, tents, trails: true };
  L.themeData = data;
  return L;
}

export function creekPath(strip: Rect, y0: number, H: number): CampData["creek"] {
  if (strip.w < 14) return null;
  const pts: Point[] = [];
  const amp = Math.max(1, (strip.w - 10) / 2);
  const cx = strip.x + strip.w / 2;
  for (let y = y0; y <= H + 4; y += 4) pts.push({ x: Math.round(cx + Math.sin(y * 0.045) * amp * 0.8 + Math.sin(y * 0.11) * amp * 0.25), y });
  return { pts, w: clamp(Math.round(strip.w * 0.36), 6, 10) };
}

// ------------------------------------------------------------------ portrait

export function campPortrait(W: number, H: number, threads: number): Layout {
  const b = new Builder();
  const aisleX = W - 8;
  const grove = W >= 360 ? 20 : 14;
  const x0 = 6 + grove;
  const innerW = W - 14 - x0;
  const segments: WallSegment[] = [
    { x0: 0, x1: Math.round(W * 0.42), depth: 64 },
    { x0: Math.round(W * 0.42), x1: Math.round(W * 0.7), depth: 54 },
    { x0: Math.round(W * 0.7), x1: W, depth: 70 },
  ];
  const top = 70;
  const gap = 16;
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
    const hallY = row.kind === "waitingBoss" ? y - gap / 2 : y + h + gap / 2;
    plan.push({ row, rect, hallY });
    if (row.kind !== "waitingBoss") halls.push(y + h + gap / 2);
    y += h + gap;
  }
  const net: Network = { halls: [...new Set(halls)], aisles: [aisleX] };
  const tents: Rect[] = [];
  for (const { row, rect, hallY } of plan) {
    const acc: Access = { hallY, aisleX };
    switch (row.kind) {
      case "podA":
      case "podB":
        tents.push(...deskTents(b, { ...rect, h: Math.min(rect.h, POD_H) }, acc, 4, 48, true));
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
        waiting = { x: rect.x, y: rect.y + 4, w: ww - 4, h: rect.h - 54 };
        buildWaiting(b, waiting, hallY);
        const bossRoom: Rect = { x: rect.x + ww + 4, y: rect.y + 4, w: rect.w - ww - 4, h: Math.min(rect.h - 8, H - 4 - (rect.y + 4)) };
        // The treehouse giant grows up at the right edge (below): your toys keep clear of it.
        boss = buildBoss(b, bossRoom, hallY, [{ x: bossRoom.x + bossRoom.w - 32, y: bossRoom.y - 12, w: 30, h: 68 }]);
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
  const lng = lounge!;
  const tvp = tvParts!;
  const eventArea = games ?? { x: lng.x + 10, y: tvp.couch.y + 30, w: lng.w - 20, h: Math.max(30, lng.y + lng.h - tvp.couch.y - 30) };
  const L = finish(b, W, H, true, segments, net, {
    meeting: meeting!,
    whiteboard: whiteboard!,
    boss: boss!,
    waiting: waiting!,
    kitchen: kitchen!,
    lounge: lng,
    games,
    eventArea,
    tvParts: tvp,
    gamesParts,
    doorX: aisleX,
    lamp: boss!.lamp,
  });
  dropPlant(L, (p) => p.sprite === "LARGE_PLANT" && p.y < lng.y + 10 && p.x > lng.x && p.x < lng.x + lng.w);

  const block = blockers(L);
  const trees: Tree[] = [];
  // Two giants hold the outdoor screen (standing in the clearing here).
  const tv = tvp.tv;
  const sw = clamp(Math.floor((tv.x - 18 - (lng.x + 40)) * 0.8), 0, 26);
  let screenTrees: [Tree, Tree] | null = null;
  if (sw >= 14) {
    const base = tv.y + tv.h + 14;
    const h = base - (lng.y - 6);
    const l: Tree = { x: tv.x - 18 - sw, w: sw, base, h, seed: 7 };
    const r: Tree = { x: tv.x + tv.w + 18, w: sw, base, h, seed: 19 };
    screenTrees = [l, r];
    trees.push(l, r);
  }
  // The treehouse: a giant grows up through the cabin's deck, its lowest boughs over the roof.
  const br = boss!.room;
  const tw = 22;
  const house: Tree = { x: br.x + br.w - tw - 6, w: tw, base: br.y + 52, h: 62, seed: 211, role: "treehouse" };
  for (const p of L.props) if (p.id === "boss-shelf") p.x -= tw + 12;
  for (const k of L.pokeables) if (k.kind === "globe") k.rect = { ...k.rect, x: k.rect.x - tw - 12 };
  dropPlant(L, (p) => p.sprite === "PLANT" && p.y < br.y && p.x > br.x + br.w - 70);
  trees.push(house);
  // A strip of forest down the left side.
  const strip: Rect = { x: -6, y: 130, w: grove + 6, h: H - 130 };
  trees.push(...stripTrees(L, strip, block, 400, { spacing: 110, wide: true, roof: 70 }));
  trees.push(...fillTrees(L, block, trees, 2, 500));
  clearPlants(L, trees);
  L.themeData = { trees, strips: [strip], creek: null, bridges: [], screenTrees, tents, trails: true } satisfies CampData;
  return L;
}

export function campLayout(W: number, H: number, opts: { threads: number; portrait: boolean }): Layout | null {
  const L = opts.portrait ? campPortrait(W, H, opts.threads) : (campBold(W, H, opts.threads) ?? campWide(W, H, opts.threads));
  outdoors(L);
  return L;
}
