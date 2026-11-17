import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLayout, layoutSize, type Point } from "./layout.ts";
import { route, step, type Walker } from "./life.ts";
import { THEMES } from "./themes/index.ts";
import { learnWalkways } from "./walkways.ts";

const length = (w: Point, path: readonly Point[]) => {
  let s = 0;
  let p = w;
  for (const q of path) {
    s += Math.hypot(q.x - p.x, q.y - p.y);
    p = q;
  }
  return s;
};

const walk = (w: Walker) => {
  for (let i = 0; i < 20000 && w.path.length > 0; i++) step(w, 1 / 30, 32);
  return w;
};

test("a newcomer walks from the door straight to a desk, not down to the hallway and back", () => {
  const L = buildLayout(1200, 520, { threads: 8 });
  learnWalkways(L);
  const desk = L.byId.get("desk-0")!;
  const w: Walker = { x: L.entrance.x, y: L.entrance.y, path: [], approach: [L.entrancePath[0]!, L.entrance], facing: "front", walked: 0 };
  w.path = route(w, L.net, desk.path);
  // The door and the desk lane are a few px apart; the hallway is far below both.
  const direct = Math.abs(desk.path[1]!.y - L.entrance.y) + Math.abs(desk.path[1]!.x - desk.x) + Math.abs(desk.y - desk.path[1]!.y);
  assert.ok(length(w, w.path) <= direct + 1, `walks ${Math.round(length(w, w.path))} px, ${Math.round(direct)} px will do`);
  walk(w);
  assert.deepEqual([w.x, w.y], [desk.x, desk.y]);
});

test("from the cabin sofa to the hearth is a few steps, not a lap of the lodge", () => {
  const cabin = THEMES.find((t) => t.id === "cabin")!;
  const size = layoutSize(1200, 520);
  const L = cabin.layout!(size.W, size.H, { threads: 8, portrait: size.portrait })!;
  learnWalkways(L);
  const sofa = L.byId.get("couch-2")!;
  const fire = (L.themeData as { fire: { hearth: { y: number }; box: { x: number; w: number } } }).fire;
  const y = fire.hearth.y + 15;
  const x = fire.box.x + fire.box.w + 10;
  const aisle = L.net.aisles.reduce((b, a) => (Math.abs(a - x) < Math.abs(b - x) ? a : b));
  const hall = L.net.halls.find((h) => h > sofa.y) ?? L.net.halls[0]!;
  const w: Walker = { x: sofa.x, y: sofa.y, path: [], approach: [...sofa.path], facing: "front", walked: 0 };
  w.path = route(w, L.net, [{ x: aisle, y: hall, c: true }, { x: aisle, y }, { x, y }]);
  const straight = Math.hypot(x - sofa.x, y - sofa.y);
  assert.ok(length(w, w.path) < straight * 1.6, `walks ${Math.round(length(w, w.path))} px for ${Math.round(straight)} px`);
  walk(w);
  assert.deepEqual([w.x, w.y], [x, y]);
});

test("walks over the learned walkways are never longer than over the hallways, and arrive", () => {
  for (const theme of THEMES) {
    const size = layoutSize(900, 420);
    const L = theme.layout?.(size.W, size.H, { threads: 12, portrait: size.portrait }) ?? buildLayout(900, 420, { threads: 12 });
    const pairs: [Walker, Point[]][] = [];
    const spots = L.spots;
    for (let i = 0; i < spots.length; i += 5) {
      const a = spots[i]!;
      const b = spots[(i * 7 + 3) % spots.length]!;
      if (a !== b) pairs.push([{ x: a.x, y: a.y, path: [], approach: [...a.path], facing: "front", walked: 0 }, b.path]);
    }
    const plain = pairs.map(([w, to]) => length(w, route({ ...w, approach: [...w.approach] }, L.net, to)));
    learnWalkways(L);
    pairs.forEach(([w, to], k) => {
      w.path = route(w, L.net, to);
      assert.ok(length(w, w.path) <= plain[k]! + 0.01, `${theme.id}: a walk got longer`);
      const goal = to[to.length - 1]!;
      walk(w);
      assert.deepEqual([w.x, w.y], [goal.x, goal.y], `${theme.id}: arrives`);
    });
  }
});
