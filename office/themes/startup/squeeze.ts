// Startup House: squeezing in. The house has only as many desks as it can
// cram in; when they're all taken, the rest of the busy ones work wherever
// there's a seat: on the old futon behind the couch, on floor cushions and
// beanbags, on a kitchen stool, in a camping chair in the garage, on
// a pool lounger or out on the lawn. Those places are desk-group spots
// after the real desks (the desk group fills in order), with a kind other
// than "desk", so the office types away there with a laptop on the lap.
// Pure geometry (no canvas): the layout tests run it in Node.

import type { Layout, Point, Rect, Spot } from "../../layout.ts";

/** What someone squeezed in sits on. */
export type NookSeat = "futon" | "cushion" | "beanbag" | "camp" | "stool" | "lounger" | "towel";

/** A squeeze-in workplace: the spot's feet position and what's under them. */
export interface Nook {
  id: string;
  x: number;
  y: number;
  seat: NookSeat;
}

/** What they're up to there, by the seat. */
const ACTIVITY: Record<NookSeat, string> = {
  futon: "working on the old futon",
  cushion: "coding on a floor cushion",
  beanbag: "shipping from a beanbag",
  camp: "coding in a camping chair",
  stool: "on a kitchen stool, laptop open",
  lounger: "working from a pool lounger",
  towel: "coding on a beach towel",
};

/** How high each seat sits them up. */
export const LIFT: Record<NookSeat, number> = { futon: 3, cushion: 1, beanbag: 0, camp: 2, stool: 4, lounger: 2, towel: 0 };

/** Squeeze-in spot ids start with this (never `desk-`: those are the real desks). */
export const NOOK = "laptop-";

/** A place where a few can squeeze in. */
export interface Zone {
  /** Candidate feet positions, in the order they fill. */
  at: Point[];
  seat: (i: number) => NookSeat;
  /** Their activity in tooltips (default: by the seat). */
  activity?: string;
  /** Where people come in: a point on a hallway. */
  entry: Point;
  /** The lane they walk along to their seat (default: just below it). */
  lane?: number;
  /** At most this many here (default: as many as fit). */
  max?: number;
  /** Keep clear of these too. */
  avoid?: Rect[];
}

const WIDTH: Record<string, number> = {
  couch: 84,
  "coffee-table": 40,
  piano: 30,
  "fishtank-stand": 42,
  arcade: 28,
  reception: 34,
  printer: 30,
  fridge: 22,
  vending: 24,
  "meeting-table": 70,
  "boss-chair": 22,
  "library-shelf": 32,
  "dog-bed": 26,
  "beanbag-blue": 26,
  "beanbag-pink": 26,
};

const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The floor that's taken: furniture, desks, everyone's spots, the hallways, aisles and walled rooms. */
function blockers(L: Layout): Rect[] {
  const out: Rect[] = [];
  for (const p of L.props) if (p.z > p.y + 2) out.push({ x: p.x, y: p.y, w: p.w ?? WIDTH[p.kind] ?? 16, h: p.z - p.y });
  for (const pl of L.plants) if (pl.z > pl.y + 2) out.push({ x: pl.x, y: pl.y, w: 20, h: pl.z - pl.y });
  for (const d of L.desks) out.push({ x: d.x - 2, y: d.y - 12, w: 52, h: 50 });
  for (const s of L.spots) out.push({ x: s.x - 8, y: s.y - 24, w: 16, h: 26 });
  for (const r of L.rooms) if (r.walls) out.push({ x: r.rect.x - 4, y: r.rect.y - 10, w: r.rect.w + 8, h: r.rect.h + 14 });
  for (const hy of L.net.halls) out.push({ x: 0, y: hy - 11, w: L.W, h: 22 });
  for (const ax of L.net.aisles) out.push({ x: ax - 11, y: 0, w: 22, h: L.H });
  out.push(L.fishtank, ...L.speakers);
  return out;
}

/** Where someone sitting at (x, y) takes up floor (the seat under them too). */
export const footprint = (x: number, y: number): Rect => ({ x: x - 9, y: y - 23, w: 18, h: 25 });

/**
 * Add up to `need` squeeze-in spots to a finished plan, zone by zone, where
 * they fit. They go after every desk in `L.spots`, so the real desks fill first.
 */
export function squeezeIn(L: Layout, zones: Zone[], need: number): Nook[] {
  const out: Nook[] = [];
  if (need <= 0) return out;
  const taken = blockers(L);
  for (const z of zones) {
    let here = 0;
    for (const p of z.at) {
      if (out.length >= need || here >= (z.max ?? Infinity)) break;
      const f = footprint(p.x, p.y);
      if (f.x < 0 || f.y < 0 || f.x + f.w > L.W || f.y + f.h > L.H) continue;
      if (taken.some((r) => hit(f, r)) || (z.avoid ?? []).some((r) => hit(f, r))) continue;
      const seat = z.seat(here);
      const id = `${NOOK}${out.length}`;
      const lane = z.lane ?? p.y + 5;
      const path: Point[] = [{ x: z.entry.x, y: z.entry.y, c: true }];
      for (const q of [{ x: z.entry.x, y: lane }, { x: p.x, y: lane }, { x: p.x, y: p.y }]) {
        const last = path[path.length - 1]!;
        if (q.x !== last.x || q.y !== last.y) path.push(q);
      }
      const spot: Spot = { id, kind: seat === "beanbag" ? "beanbag" : "bench", group: "desk", x: p.x, y: p.y, facing: "front", pose: "sit-desk-front", path, activity: z.activity ?? ACTIVITY[seat] };
      if (LIFT[seat] > 0) spot.lift = LIFT[seat];
      L.spots.push(spot);
      L.byId.set(id, spot);
      taken.push(f);
      out.push({ id, x: p.x, y: p.y, seat });
      here++;
    }
  }
  return out;
}

/** Candidate points on rows (top to bottom) of a rect, `dx` apart. */
export function inRows(r: Rect, dx: number, dy: number): Point[] {
  const out: Point[] = [];
  for (let y = r.y; y <= r.y + r.h; y += dy) for (let x = r.x; x <= r.x + r.w; x += dx) out.push({ x, y });
  return out;
}

/** Candidate points in columns from the right (each top to bottom), `dx` apart. */
export function columnsFromRight(r: Rect, dx: number, dy: number): Point[] {
  const out: Point[] = [];
  for (let x = r.x + r.w; x >= r.x; x -= dx) for (let y = r.y; y <= r.y + r.h; y += dy) out.push({ x, y });
  return out;
}

/** Alternate seats. */
export const cycle = (...seats: NookSeat[]) => (i: number): NookSeat => seats[i % seats.length]!;
