// Mountain Cabin: squeezing in. The lodge has only as many desks as the head
// count needs (eight at most); when they're all taken, the rest of the busy
// ones work wherever there's a seat: on sheepskins on the hearth, the window
// seat, the boot bench in the mudroom, a kitchen stool, a knitted pouf in the
// reading loft or a log stump out on the deck. Those are desk-group spots
// after the real desks (the desk group fills in order), of another kind than
// "desk", so the office types away there with a laptop on the lap.
// Pure geometry (no canvas): the layout tests run it in Node.
import type { Layout, Point, Rect, Spot } from "../../layout.ts";

/** What someone squeezed in sits on. */
export type NookSeat = "sheepskin" | "seat" | "boots" | "stool" | "pouf" | "stump";

/** A squeeze-in workplace: the spot's feet position and what's under them. */
export interface Nook {
  id: string;
  x: number;
  y: number;
  seat: NookSeat;
}

const ACTIVITY: Record<NookSeat, string> = {
  sheepskin: "working by the fire on a sheepskin",
  seat: "on the window seat, laptop open",
  boots: "squeezed onto the boot bench with a laptop",
  stool: "on a kitchen stool, laptop open",
  pouf: "typing away on a knitted pouf",
  stump: "working on a log stump out in the snow",
};

/** How high each seat sits them up. */
export const LIFT: Record<NookSeat, number> = { sheepskin: 0, seat: 3, boots: 3, stool: 4, pouf: 1, stump: 3 };

/** Squeeze-in spot ids start with this (never `desk-`: those are the real desks). */
export const NOOK = "laptop-";

/** A place where a few can squeeze in. */
export interface Zone {
  /** Candidate feet positions, in the order they fill. */
  at: Point[];
  seat: NookSeat;
  /** Where people come in: a point on a hallway. */
  entry: Point;
  /** The lane they walk along to their seat (default: just below it). */
  lane?: number;
  /** At most this many here. */
  max?: number;
  /** Keep clear of these too. */
  avoid?: Rect[];
}

const WIDTH: Record<string, number> = {
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
  "beanbag-blue": 26,
  "beanbag-pink": 26,
  armchair: 28,
  "library-table": 32,
};

const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The floor that's taken: furniture, desks, everyone's spots and their last steps, hallways, aisles and walled rooms. */
function blockers(L: Layout, extra: Rect[]): Rect[] {
  const out: Rect[] = [...extra];
  for (const p of L.props) if (p.z > p.y + 2) out.push({ x: p.x, y: p.y, w: p.w ?? WIDTH[p.kind] ?? 16, h: p.z - p.y });
  for (const pl of L.plants) if (pl.z > pl.y + 2) out.push({ x: pl.x, y: pl.y, w: 20, h: pl.z - pl.y });
  for (const d of L.desks) out.push({ x: d.x - 2, y: d.y - 12, w: 52, h: 50 });
  for (const s of L.spots) out.push({ x: s.x - 8, y: s.y - 24, w: 16, h: 26 });
  for (const r of L.rooms) if (r.walls) out.push({ x: r.rect.x - 4, y: r.rect.y - 10, w: r.rect.w + 8, h: r.rect.h + 14 });
  for (const hy of L.net.halls) out.push({ x: 0, y: hy - 11, w: L.W, h: 22 });
  for (const ax of L.net.aisles) out.push({ x: ax - 11, y: 0, w: 22, h: L.H });
  out.push(L.fishtank, ...L.speakers, L.eventArea);
  if (L.arcade) out.push({ x: L.arcade.x - 2, y: L.arcade.y, w: L.arcade.w + 4, h: L.arcade.h + 16 });
  return out;
}

/** Whether a way in passes through a walled room (the cold room, the map room, your study). */
function crossesWalls(L: Layout, path: Point[]): boolean {
  const walled = L.rooms.filter((r) => r.walls).map((r) => r.rect);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (let k = 0; k <= n; k++) {
      const x = a.x + ((b.x - a.x) * k) / n;
      const y = a.y + ((b.y - a.y) * k) / n;
      if (walled.some((r) => x > r.x - 2 && x < r.x + r.w + 2 && y > r.y - 2 && y < r.y + r.h + 2)) return true;
    }
  }
  return false;
}

/** Where someone sitting at (x, y) takes up floor (the seat under them too). */
const footprint = (x: number, y: number): Rect => ({ x: x - 9, y: y - 23, w: 18, h: 25 });

/**
 * Add up to `need` squeeze-in spots to a finished plan, zone by zone, where
 * they fit. They go after every desk in `L.spots`, so the real desks fill first.
 */
export function squeezeIn(L: Layout, zones: Zone[], need: number, keepClear: Rect[] = []): Nook[] {
  const out: Nook[] = [];
  if (need <= 0) return out;
  const taken = blockers(L, keepClear);
  for (const z of zones) {
    let here = 0;
    for (const p of z.at) {
      if (out.length >= need || here >= (z.max ?? Infinity)) break;
      const f = footprint(p.x, p.y);
      if (f.x < 0 || f.y < 0 || f.x + f.w > L.W || f.y + f.h > L.H) continue;
      if (taken.some((r) => hit(f, r)) || (z.avoid ?? []).some((r) => hit(f, r))) continue;
      const id = `${NOOK}${out.length}`;
      const lane = z.lane ?? p.y + 5;
      const path: Point[] = [{ x: z.entry.x, y: z.entry.y, c: true }];
      for (const q of [{ x: z.entry.x, y: lane }, { x: p.x, y: lane }, { x: p.x, y: p.y }]) {
        const last = path[path.length - 1]!;
        if (q.x !== last.x || q.y !== last.y) path.push(q);
      }
      if (crossesWalls(L, path)) continue;
      const spot: Spot = { id, kind: "bench", group: "desk", x: p.x, y: p.y, facing: "front", pose: "sit-desk-front", path, activity: ACTIVITY[z.seat] };
      if (LIFT[z.seat] > 0) spot.lift = LIFT[z.seat];
      L.spots.push(spot);
      L.byId.set(id, spot);
      taken.push(f);
      out.push({ id, x: p.x, y: p.y, seat: z.seat });
      here++;
    }
  }
  return out;
}

/** Candidate points along a row, `dx` apart. */
export function row(x0: number, x1: number, y: number, dx = 21): Point[] {
  const out: Point[] = [];
  for (let x = x0; x <= x1; x += dx) out.push({ x, y });
  return out;
}
