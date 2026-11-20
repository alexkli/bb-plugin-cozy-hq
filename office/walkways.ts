// The floor you can walk on, as a graph: the hallways, the aisles and every
// spot's way in. A spot's way in only says how to reach it from its own
// hallway point, so routing along the hallway network alone sends people the
// long way round when the lane they want crosses a hallway right beside them.
// Here every crossing of two walkways is a place to change from one to the
// other, and the shortest way over them is taken. It only ever uses ground
// some route walks anyway, so it can't cut through walls or furniture.

import type { Layout, Network, Point, Rect } from "./layout.ts";

interface Seg {
  a: Point;
  b: Point;
  /** A way across open floor (see `acrossFloor`), not a hallway, aisle or spot's path. */
  across?: boolean;
}

type Edge = [to: number, length: number];

interface Walkways {
  segs: Seg[];
  /** The points along each walkway (ends and crossings), in order, with their node. */
  along: { t: number; n: number }[][];
  pts: Point[];
  ids: Map<string, number>;
  adj: Edge[][];
  halls: number[];
  walled: Rect[];
}

const known = new WeakMap<Network, Walkways>();

const EPS = 0.5;
const key = (p: Point) => `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`;
const inside = (p: Point, r: Rect, m: number) => p.x > r.x + m && p.x < r.x + r.w - m && p.y > r.y + m && p.y < r.y + r.h - m;
const dist = (p: Point, q: Point) => Math.hypot(q.x - p.x, q.y - p.y);
/** How far along `s` a point on it lies (in px). */
const param = (s: Seg, p: Point) => ((p.x - s.a.x) * (s.b.x - s.a.x) + (p.y - s.a.y) * (s.b.y - s.a.y)) / dist(s.a, s.b);
const boxesApart = (s: Seg, t: Seg) =>
  Math.max(s.a.x, s.b.x) + EPS < Math.min(t.a.x, t.b.x) ||
  Math.max(t.a.x, t.b.x) + EPS < Math.min(s.a.x, s.b.x) ||
  Math.max(s.a.y, s.b.y) + EPS < Math.min(t.a.y, t.b.y) ||
  Math.max(t.a.y, t.b.y) + EPS < Math.min(s.a.y, s.b.y);

/** Learn a floor plan's walkways (routes over its network use them from then on). */
export function learnWalkways(L: Layout): void {
  const net = L.net;
  const raw: Seg[] = [];
  const walled = L.rooms.filter((r) => r.walls).map((r) => r.rect);
  const ys = new Map<number, number[]>();
  const onHall = (p: Point) => {
    if (!net.halls.includes(p.y)) return;
    const l = ys.get(p.y) ?? [];
    l.push(p.x);
    ys.set(p.y, l);
  };
  // Things you can click (a cooler, a plant…): a lane that runs through one
  // isn't a way through for everyone else.
  const things = L.pokeables.map((p) => p.rect);
  const through = (a: Point, b: Point, r: Rect) => {
    const n = Math.max(2, Math.ceil(dist(a, b) / 2));
    for (let k = 1; k < n; k++) if (inside({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n }, r, 2)) return true;
    return false;
  };
  for (const s of L.spots) {
    // Not through someone's seat (the last step), nor through a walled room:
    // nobody takes a shortcut through your office or the meeting room.
    for (let i = 0; i < s.path.length - 2; i++) {
      const a = s.path[i]!;
      const b = s.path[i + 1]!;
      if (walled.some((r) => inside(a, r, 2) || inside(b, r, 2))) break;
      if (things.some((r) => !inside(a, r, 0) && !inside(b, r, 0) && through(a, b, r))) continue;
      raw.push({ a, b });
    }
  }
  for (let i = 0; i < L.entrancePath.length - 1; i++) raw.push({ a: L.entrancePath[i]!, b: L.entrancePath[i + 1]! });
  for (const w of [L.entrancePath, ...L.spots.map((s) => s.path)]) for (const p of w) if (p.c) onHall(p);
  // Hallways, as far as anyone goes along them; aisles between the outermost hallways.
  for (const x of net.aisles) for (const y of net.halls) onHall({ x, y });
  for (const [y, list] of ys) raw.push({ a: { x: Math.min(...list), y }, b: { x: Math.max(...list), y } });
  if (net.halls.length > 1) {
    const top = Math.min(...net.halls);
    const bottom = Math.max(...net.halls);
    for (const x of net.aisles) raw.push({ a: { x, y: top }, b: { x, y: bottom } });
  }
  if (L.walls) raw.push(...acrossFloor(L, raw.filter((s) => dist(s.a, s.b) >= EPS), walled, L.walls));
  const segs = raw.filter((s) => dist(s.a, s.b) >= EPS);

  const pts: Point[] = [];
  const ids = new Map<string, number>();
  const adj: Edge[][] = [];
  const node = (p: Point) => {
    const k = key(p);
    let n = ids.get(k);
    if (n === undefined) {
      n = pts.length;
      ids.set(k, n);
      pts.push({ x: p.x, y: p.y });
      adj.push([]);
    }
    return n;
  };
  const hits: Point[][] = segs.map((s) => [s.a, s.b]);
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      if (boxesApart(segs[i]!, segs[j]!)) continue;
      const at: Point[] = [];
      meet(segs[i]!, segs[j]!, at);
      for (const p of at) {
        hits[i]!.push(p);
        hits[j]!.push(p);
      }
    }
  }
  const along = segs.map((s, i) => {
    const list = hits[i]!.map((p) => ({ t: param(s, p), n: node(p) })).sort((p, q) => p.t - q.t);
    const out = list.filter((e, k) => k === 0 || e.n !== list[k - 1]!.n);
    for (let k = 1; k < out.length; k++) link(adj, out[k - 1]!.n, out[k]!.n, out[k]!.t - out[k - 1]!.t);
    return out;
  });
  known.set(net, { segs, along, pts, ids, adj, halls: [...net.halls], walled });
}

// ------------------------------------------------------------------ across open floor

/** Furniture without a width of its own: about this wide (px). */
const PROP_W: Record<string, number> = {
  couch: 84,
  "coffee-table": 40,
  piano: 32,
  "fishtank-stand": 42,
  arcade: 26,
  reception: 36,
  printer: 30,
  fridge: 20,
  vending: 24,
  "meeting-table": 68,
  "boss-chair": 22,
  "library-shelf": 32,
  "dog-bed": 26,
  armchair: 28,
};

/** The longest cut across open floor (px). */
const REACH = 150;
/** How far apart the ways across are tried (px). */
const PITCH = 4;
/** Room the feet keep from furniture and walls (px). */
const CLEAR = 3;

/** Where the floor is taken: furniture, desks, seats, fixtures, walled rooms and walls. */
function takenFloor(L: Layout, walled: Rect[], walls: Rect[]): Rect[] {
  const out: Rect[] = [...walls, ...walled.map((r) => ({ x: r.x - 4, y: r.y - 4, w: r.w + 8, h: r.h + 8 }))];
  for (const p of L.props) if (p.z > p.y + 2) out.push({ x: p.x, y: p.y, w: p.w ?? PROP_W[p.kind] ?? 32, h: p.z - p.y });
  for (const p of L.plants) if (p.z > p.y + 2) out.push({ x: p.x, y: p.y, w: 20, h: p.z - p.y });
  for (const d of L.desks) out.push({ x: d.x - 2, y: d.y - 12, w: 52, h: 50 });
  // Where people sit or stand (their feet).
  for (const s of L.spots) out.push({ x: s.x - 7, y: s.y - 5, w: 14, h: 8 });
  for (const p of L.pokeables) out.push(p.rect);
  out.push(L.couch, L.fishtank, ...L.speakers);
  for (const r of [L.arcade, L.pingpong, L.server]) if (r) out.push(r);
  return out;
}

/**
 * Short straight ways across open floor between walkways that run side by
 * side: from a lane down to the one below it (or across to the next one over)
 * wherever the strip between them is clear. Only for floor plans that list
 * their walls (`L.walls`).
 */
function acrossFloor(L: Layout, segs: Seg[], walled: Rect[], walls: Rect[]): Seg[] {
  const taken = takenFloor(L, walled, walls);
  const clear = (x0: number, y0: number, x1: number, y1: number) => {
    const r = { x: Math.min(x0, x1) - CLEAR, y: Math.min(y0, y1) - CLEAR, w: Math.abs(x1 - x0) + 2 * CLEAR, h: Math.abs(y1 - y0) + 2 * CLEAR };
    if (r.x < 2 || r.y < 2 || r.x + r.w > L.W - 2 || r.y + r.h > L.H - 2) return false;
    return !taken.some((t) => r.x < t.x + t.w && t.x < r.x + r.w && r.y < t.y + t.h && t.y < r.y + r.h);
  };
  const flat = segs.filter((s) => s.a.y === s.b.y).map((s) => ({ y: s.a.y, x0: Math.min(s.a.x, s.b.x), x1: Math.max(s.a.x, s.b.x) }));
  const tall = segs.filter((s) => s.a.x === s.b.x).map((s) => ({ x: s.a.x, y0: Math.min(s.a.y, s.b.y), y1: Math.max(s.a.y, s.b.y) }));
  const out: Seg[] = [];
  const seen = new Set<string>();
  const add = (a: Point, b: Point) => {
    const k = `${a.x},${a.y},${b.x},${b.y}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ a, b, across: true });
  };
  /** Runs of clear ways side by side: one at each end and one in the middle. */
  const runs = (list: { at: number; from: number; to: number }[], make: (at: number, from: number, to: number) => void) => {
    let run: typeof list = [];
    const flush = () => {
      if (run.length === 0) return;
      const picks = new Set([run[0]!, run[Math.floor(run.length / 2)]!, run[run.length - 1]!]);
      for (const c of picks) make(c.at, c.from, c.to);
      run = [];
    };
    for (const c of list) {
      const last = run[run.length - 1];
      if (last && (c.at - last.at > PITCH + 0.5 || c.from !== last.from || c.to !== last.to)) flush();
      run.push(c);
    }
    flush();
  };
  // Down from each lane to the nearest one below it.
  for (const A of flat) {
    const found: { at: number; from: number; to: number }[] = [];
    for (let x = Math.ceil(A.x0); x <= A.x1; x += PITCH) {
      let below: number | null = null;
      for (const B of flat) if (B.y > A.y + 4 && B.y - A.y <= REACH && B.x0 <= x && x <= B.x1 && (below === null || B.y < below)) below = B.y;
      if (below === null) continue;
      // Not alongside a walkway that already goes there.
      if (tall.some((T) => Math.abs(T.x - x) < 6 && T.y0 <= A.y + 0.5 && T.y1 >= below! - 0.5)) continue;
      if (clear(x, A.y, x, below)) found.push({ at: x, from: A.y, to: below });
    }
    runs(found, (x, y0, y1) => add({ x, y: y0 }, { x, y: y1 }));
  }
  // Across from each upright walkway to the nearest one on its right.
  for (const A of tall) {
    const found: { at: number; from: number; to: number }[] = [];
    for (let y = Math.ceil(A.y0); y <= A.y1; y += PITCH) {
      let right: number | null = null;
      for (const B of tall) if (B.x > A.x + 4 && B.x - A.x <= REACH && B.y0 <= y && y <= B.y1 && (right === null || B.x < right)) right = B.x;
      if (right === null) continue;
      if (flat.some((F) => Math.abs(F.y - y) < 6 && F.x0 <= A.x + 0.5 && F.x1 >= right! - 0.5)) continue;
      if (clear(A.x, y, right, y)) found.push({ at: y, from: A.x, to: right });
    }
    runs(found, (y, x0, x1) => add({ x: x0, y }, { x: x1, y }));
  }
  return out;
}

function link(adj: Edge[][] | Map<number, Edge[]>, u: number, v: number, d: number): void {
  if (u === v) return;
  for (const [a, b] of [[u, v], [v, u]] as const) {
    if (Array.isArray(adj)) adj[a]!.push([b, d]);
    else {
      const l = adj.get(a) ?? [];
      l.push([b, d]);
      adj.set(a, l);
    }
  }
}

/** The floor plan's walkways (for a look at them), or null when they haven't been learned. */
export function walkwaysOf(net: Network): readonly { a: Point; b: Point; across?: boolean }[] | null {
  return known.get(net)?.segs ?? null;
}

/** The floor plan's walled rooms, or null when its walkways haven't been learned. */
export function wallsOf(net: Network): readonly Rect[] | null {
  return known.get(net)?.walled ?? null;
}

/** Where two legs meet: crossing points and the ends of overlapping stretches. */
function meet(s: Seg, t: Seg, out: Point[]): void {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const ex = t.b.x - t.a.x;
  const ey = t.b.y - t.a.y;
  const len = Math.hypot(dx, dy);
  const tlen = Math.hypot(ex, ey);
  const den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-9 * len * tlen) {
    // Parallel: on the same line, the ends of one that lie on the other.
    if (Math.abs((t.a.x - s.a.x) * dy - (t.a.y - s.a.y) * dx) / len > EPS) return;
    for (const p of [t.a, t.b, s.a, s.b]) if (onSeg(p, s) && onSeg(p, t)) out.push(p);
    return;
  }
  const u = ((t.a.x - s.a.x) * ey - (t.a.y - s.a.y) * ex) / den;
  const v = ((t.a.x - s.a.x) * dy - (t.a.y - s.a.y) * dx) / den;
  if (u < -EPS / len || u > 1 + EPS / len || v < -EPS / tlen || v > 1 + EPS / tlen) return;
  const k = Math.min(1, Math.max(0, u));
  out.push({ x: s.a.x + dx * k, y: s.a.y + dy * k });
}

function onSeg(p: Point, s: Seg): boolean {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len = Math.hypot(dx, dy);
  if (Math.abs((p.x - s.a.x) * dy - (p.y - s.a.y) * dx) / len > EPS) return false;
  const t = ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len;
  return t >= -EPS && t <= len + EPS;
}

/**
 * The shortest way from `from` to the end of `plain` (a route that works:
 * out to the hallway, along it and in) over the floor plan's walkways and
 * `plain` itself, or null when the floor plan's walkways aren't known.
 */
export function shortestWay(net: Network, from: Point, plain: readonly Point[]): Point[] | null {
  const ww = known.get(net);
  const end = plain[plain.length - 1];
  if (!ww || !end) return null;
  // This walk's own legs join the learned walkways for this one search.
  const own: Seg[] = [];
  let prev: Point = from;
  for (const p of plain) {
    if (dist(prev, p) >= EPS) own.push({ a: prev, b: p });
    prev = p;
  }
  const base = ww.pts.length;
  const extraPts: Point[] = [];
  const extraIds = new Map<string, number>();
  const extraAdj = new Map<number, Edge[]>();
  const node = (p: Point) => {
    const k = key(p);
    const n = ww.ids.get(k) ?? extraIds.get(k);
    if (n !== undefined) return n;
    extraIds.set(k, base + extraPts.length);
    extraPts.push({ x: p.x, y: p.y });
    return base + extraPts.length - 1;
  };
  const at = (n: number) => (n < base ? ww.pts[n]! : extraPts[n - base]!);
  const hits: Point[][] = own.map((s) => [s.a, s.b]);
  own.forEach((o, i) => {
    ww.segs.forEach((s, j) => {
      if (boxesApart(o, s)) return;
      const met: Point[] = [];
      meet(o, s, met);
      for (const p of met) {
        hits[i]!.push(p);
        // Joined into the walkway between its neighbours there.
        const n = node(p);
        const t = param(s, p);
        const list = ww.along[j]!;
        let k = 0;
        while (k < list.length && list[k]!.t < t) k++;
        for (const e of [list[k - 1], list[k]]) if (e) link(extraAdj, n, e.n, Math.abs(e.t - t));
      }
    });
    for (let j = i + 1; j < own.length; j++) {
      if (boxesApart(o, own[j]!)) continue;
      const met: Point[] = [];
      meet(o, own[j]!, met);
      for (const p of met) {
        hits[i]!.push(p);
        hits[j]!.push(p);
      }
    }
  });
  own.forEach((o, i) => {
    const list = hits[i]!.map((p) => ({ t: param(o, p), n: node(p) })).sort((p, q) => p.t - q.t);
    for (let k = 1; k < list.length; k++) link(extraAdj, list[k - 1]!.n, list[k]!.n, list[k]!.t - list[k - 1]!.t);
  });
  const src = node(from);
  const dst = node(end);
  if (src === dst) return [{ ...end }];

  // Dijkstra.
  const total = base + extraPts.length;
  const best = new Float64Array(total).fill(Infinity);
  const back = new Int32Array(total).fill(-1);
  best[src] = 0;
  const heap: [number, number][] = [[0, src]];
  while (heap.length > 0) {
    const [d, u] = pop(heap);
    if (d > best[u]!) continue;
    if (u === dst) break;
    const edges = u < base ? ww.adj[u]! : [];
    const more = extraAdj.get(u);
    for (const list of more ? [edges, more] : [edges]) {
      for (const [v, w] of list) {
        if (d + w < best[v]!) {
          best[v] = d + w;
          back[v] = u;
          push(heap, [d + w, v]);
        }
      }
    }
  }
  if (!Number.isFinite(best[dst]!)) return null;
  const chain: Point[] = [];
  for (let u = dst; u !== src; u = back[u]!) chain.push(at(u));
  chain.reverse();
  // Keep the turns, and a hallway point where a straight run on the hallways
  // starts (as in a spot's way in): there people keep their own lane, weave
  // and cut corners.
  const out: Point[] = [];
  let last: Point = from;
  for (let k = 0; k < chain.length; k++) {
    const p = chain[k]!;
    const q = chain[k + 1];
    const c = ww.halls.some((y) => Math.abs(p.y - y) < EPS);
    if (q && (!c || out[out.length - 1]?.c)) {
      const cross = (p.x - last.x) * (q.y - p.y) - (p.y - last.y) * (q.x - p.x);
      const ahead = (p.x - last.x) * (q.x - p.x) + (p.y - last.y) * (q.y - p.y);
      if (Math.abs(cross) <= 1e-6 * dist(p, q) * dist(last, p) && ahead > 0) continue;
    }
    out.push(k === chain.length - 1 ? { ...end } : c ? { x: p.x, y: p.y, c: true } : { x: p.x, y: p.y });
    last = p;
  }
  return out;
}

function push(heap: [number, number][], e: [number, number]): void {
  heap.push(e);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p]![0] <= heap[i]![0]) break;
    [heap[p], heap[i]] = [heap[i]!, heap[p]!];
    i = p;
  }
}

function pop(heap: [number, number][]): [number, number] {
  const top = heap[0]!;
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && heap[l]![0] < heap[m]![0]) m = l;
      if (r < heap.length && heap[r]![0] < heap[m]![0]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i]!, heap[m]!];
      i = m;
    }
  }
  return top;
}
