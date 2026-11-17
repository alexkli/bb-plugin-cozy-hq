// What every floor plan must get right, classic or a scenery's own: the
// office (walking, seating, events, gags, visitors) relies on these.
// `node --test` runs this for every scenery at many panel sizes.

import type { Layout, Rect } from "./layout.ts";
import { route, step, type Walker } from "./life.ts";
import { learnWalkways } from "./walkways.ts";

const inside = (r: Rect, L: Layout, slack = 0) => r.x >= -slack && r.y >= -slack && r.x + r.w <= L.W + slack && r.y + r.h <= L.H + slack && r.w > 0 && r.h > 0;

/** Problems with a floor plan (empty when it's fine). */
export function checkLayout(L: Layout, opts: { threads: number }): string[] {
  const out: string[] = [];
  const bad = (msg: string) => out.length < 40 && out.push(msg);
  learnWalkways(L);

  // Fixtures the office draws or overlays at fixed rects.
  const rects: [string, Rect | undefined][] = [
    ["tv", L.tv],
    ["tvScreen", L.tvScreen],
    ["speaker 0", L.speakers[0]],
    ["speaker 1", L.speakers[1]],
    ["fishtank", L.fishtank],
    ["couch", L.couch],
    ["meeting", L.meeting],
    ["whiteboard", L.whiteboard],
    ["waiting", L.waiting],
    ["kitchen", L.kitchen],
    ["lounge", L.lounge],
    ["eventArea", L.eventArea],
    ["boss.room", L.boss?.room],
    ["boss.desk", L.boss?.desk],
    ["wall.pinboard", L.wall?.pinboard],
    ["wall.legendNote", L.wall?.legendNote],
    ["wall.calendar", L.wall?.calendar],
    ["wall.status", L.wall?.status],
    ["wall.door", L.wall?.door],
  ];
  for (const [name, r] of rects) {
    if (!r) bad(`missing ${name}`);
    else if (!inside(r, L, 2)) bad(`${name} is outside the panel: ${JSON.stringify(r)}`);
  }
  if (L.eventArea && (L.eventArea.w < 60 || L.eventArea.h < 26)) bad(`eventArea is too small for events: ${JSON.stringify(L.eventArea)}`);
  for (const w of L.wall?.windows ?? []) if (!inside(w, L)) bad(`window outside the panel: ${JSON.stringify(w)}`);
  const c = L.wall?.clock;
  if (!c || c.x < 0 || c.y < 0 || c.x > L.W || c.y > L.H) bad("clock missing or outside the panel");
  for (const [name, p] of [["boss.seat", L.boss?.seat], ["boss.dogBed", L.boss?.dogBed], ["boss.lamp", L.boss?.lamp], ["lamp", L.lamp], ["entrance", L.entrance]] as const) {
    if (!p || p.x < 0 || p.y < 0 || p.x > L.W || p.y > L.H) bad(`${name} missing or outside the panel`);
  }

  // The hallway network.
  const halls = new Set(L.net.halls);
  if (L.net.halls.length === 0) bad("no hallways (net.halls)");
  if (L.net.aisles.length === 0) bad("no aisles (net.aisles)");
  for (const y of L.net.halls) if (y <= 0 || y >= L.H) bad(`hallway at y ${y} is outside the panel`);
  for (const x of L.net.aisles) if (x <= 0 || x >= L.W) bad(`aisle at x ${x} is outside the panel`);
  const p0 = L.entrancePath[0];
  if (!p0?.c || !halls.has(p0.y)) bad("entrancePath must start on a hallway point ({ c: true, y: a hall })");

  // Spots: reachable from a hallway, inside the panel, ending on the spot.
  const ids = new Set<string>();
  for (const s of L.spots) {
    if (ids.has(s.id)) bad(`duplicate spot id ${s.id}`);
    ids.add(s.id);
    if (L.byId.get(s.id) !== s) bad(`byId is missing ${s.id}`);
    const first = s.path[0];
    if (!first?.c || !halls.has(first.y)) bad(`${s.id}: its path must start on a hallway point ({ c: true, y: a hall })`);
    const last = s.path[s.path.length - 1];
    if (!last || last.x !== s.x || last.y !== s.y) bad(`${s.id}: its path must end on the spot`);
    for (const q of [s, ...s.path]) if (q.x < 0 || q.y < 0 || q.x > L.W || q.y > L.H || !Number.isFinite(q.x + q.y)) bad(`${s.id}: point ${q.x},${q.y} is outside the panel`);
  }
  const count = (pred: (s: Layout["spots"][number]) => boolean) => L.spots.filter(pred).length;
  const need: [string, number, number][] = [
    ["desks", count((s) => s.kind === "desk"), Math.min(opts.threads, 8)],
    ["meeting seats or whiteboard spots (group meeting)", count((s) => s.group === "meeting"), 2],
    ["plan presenter spots (group present)", count((s) => s.group === "present"), 1],
    ["waiting seats (group review)", count((s) => s.group === "review"), 3],
    ["seats in your office (group boss)", count((s) => s.group === "boss"), 1],
    ["break spots (group break)", count((s) => s.group === "break"), 3],
    ["lounge spots (group lounge)", count((s) => s.group === "lounge"), 2],
    ["nap spots (group nap; optional, napping falls back to the lounge)", count((s) => s.group === "nap"), 0],
  ];
  for (const [what, have, min] of need) if (have < min) bad(`only ${have} ${what}, need at least ${min}`);
  if (L.desks.length !== count((s) => s.kind === "desk")) bad("L.desks and the desk spots don't match");
  if (L.seats.length < 3) bad("L.seats (waiting seats in fill order) needs at least 3");

  // Closed rooms don't overlap, and nobody's path cuts through one.
  const walled = L.rooms.filter((r) => r.walls).map((r) => r.rect);
  walled.forEach((a, i) =>
    walled.slice(i + 1).forEach((b) => {
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) bad(`walled rooms overlap: ${JSON.stringify(a)} and ${JSON.stringify(b)}`);
    }),
  );
  const within = (x: number, y: number, r: Rect, m: number) => x > r.x + m && x < r.x + r.w - m && y > r.y + m && y < r.y + r.h - m;
  const crosses = (ax: number, ay: number, bx: number, by: number, r: Rect) => {
    const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
    for (let i = 0; i <= n; i++) if (within(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, r, 4)) return true;
    return false;
  };
  for (const s of L.spots) {
    for (const r of walled) {
      if (within(s.x, s.y, r, 0)) continue;
      for (let i = 1; i < s.path.length; i++) {
        const a = s.path[i - 1]!;
        const b = s.path[i]!;
        if (crosses(a.x, a.y, b.x, b.y, r)) {
          bad(`${s.id}: its path cuts through the walled room at ${JSON.stringify(r)}`);
          break;
        }
      }
    }
  }

  // Walk between some spots the way people do: they arrive exactly, and
  // don't wander through walled rooms on the way.
  const open = L.spots.filter((s) => !walled.some((r) => within(s.x, s.y, r, 0)));
  for (let i = 0; i < open.length && out.length < 40; i += Math.max(1, Math.floor(open.length / 8))) {
    for (let j = 1; j < 6; j++) {
      const from = open[i]!;
      const to = open[(i + j * 7) % open.length]!;
      if (from === to) continue;
      const w: Walker = { x: from.x, y: from.y, path: [], approach: [...from.path], facing: "front", walked: 0, lane: { x: 3, y: -2 }, cut: 14, sway: 3 };
      w.path = route(w, L.net, to.path);
      let k = 0;
      for (; k < 8000 && w.path.length > 0; k++) {
        step(w, 1 / 30, 32);
        if (!Number.isFinite(w.x + w.y)) break;
        const hit = walled.find((r) => within(w.x, w.y, r, 4));
        if (hit) {
          bad(`walking ${from.id} → ${to.id} goes through the walled room at ${JSON.stringify(hit)} (near ${Math.round(w.x)},${Math.round(w.y)})`);
          break;
        }
      }
      if (w.path.length > 0 || w.x !== to.x || w.y !== to.y) bad(`walking ${from.id} → ${to.id} doesn't arrive`);
    }
  }

  // Your way out of your office: from a hallway to your chair, and walked to the arcade
  // and back you arrive, leave and enter your office only through its door and keep
  // out of the other walled rooms.
  const way = L.boss?.way;
  if (!way) bad("L.boss.way (your way out of the office) is missing: bossToys() sets it");
  else {
    if (!way[0]?.c || !halls.has(way[0].y)) bad("L.boss.way must start on a hallway point");
    const end = way[way.length - 1];
    if (!end || end.x !== L.boss.seat.x || end.y !== L.boss.seat.y) bad("L.boss.way must end at your chair");
    const arcade = L.byId.get("arcade");
    const room = L.boss.room;
    if (arcade && end) {
      const others = L.rooms.filter((r) => r.walls && r.kind !== "boss").map((r) => r.rect);
      const door = L.rooms.find((r) => r.kind === "boss")?.doorX ?? way[1]!.x;
      const w: Walker = { x: end.x, y: end.y, path: [], approach: [...way], facing: "front", walked: 0, cut: 10 };
      for (const [to, target] of [["the arcade", arcade.path], ["your chair", way]] as const) {
        w.path = route(w, L.net, target);
        let inside = within(w.x, w.y, room, 0);
        for (let k = 0; k < 8000 && w.path.length > 0; k++) {
          step(w, 1 / 30, 40);
          const hit = others.find((r) => within(w.x, w.y, r, 4));
          if (hit) {
            bad(`your walk to ${to} goes through the walled room at ${JSON.stringify(hit)} (near ${Math.round(w.x)},${Math.round(w.y)})`);
            break;
          }
          const now = within(w.x, w.y, room, 0);
          if (now !== inside && Math.abs(w.x - door) > 6) {
            bad(`on your walk to ${to} you go through the wall of your office at ${Math.round(w.x)},${Math.round(w.y)}, not the door`);
            break;
          }
          inside = now;
        }
        const goal = target[target.length - 1]!;
        if (w.path.length > 0 || w.x !== goal.x || w.y !== goal.y) bad(`your walk to ${to} doesn't arrive`);
      }
    }
  }

  // Your desk toys stay in your office, off the places people sit and stand.
  const toys = L.boss?.toys;
  const room = L.boss?.room;
  if (toys && room) {
    const g = toys.green;
    if (g) {
      const r = g.rect;
      if (r.x < room.x || r.y < room.y || r.x + r.w > room.x + room.w || r.y + r.h > room.y + room.h) bad(`the putting green is outside your office: ${JSON.stringify(r)}`);
      for (const q of [g.tee, g.cup, ...g.walk]) if (!within(q.x, q.y, room, 2)) bad(`the putting green's ${JSON.stringify(q)} is outside your office`);
      for (const s of L.spots) if (s.x > r.x - 4 && s.x < r.x + r.w + 4 && s.y > r.y - 2 && s.y < r.y + r.h + 2) bad(`${s.id} is on the putting green`);
    }
    if (toys.hoop && !within(toys.hoop.x, toys.hoop.y, room, 2)) bad(`the hoop is outside your office: ${JSON.stringify(toys.hoop)}`);
  }
  return out;
}
