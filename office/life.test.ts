import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLayout } from "./layout.ts";
import { lunchTable, planEvent, route, step, type Walker } from "./life.ts";

test("walkers cut hallway corners and keep their own lane, but land on their spot", () => {
  // A phone held upright: several hallways, so the route turns corners.
  const L = buildLayout(390, 844, { threads: 12 });
  const from = L.byId.get("desk-0")!;
  const to = L.seats[0]!;
  const w: Walker = { x: from.x, y: from.y, path: [], approach: [...from.path], facing: "front", walked: 0, lane: { x: 4, y: -3 }, cut: 14, sway: 3 };
  w.path = route(w, L.net, to.path);
  let diagonal = 0;
  let prev = { x: w.x, y: w.y };
  for (let i = 0; i < 4000 && w.path.length > 0; i++) {
    step(w, 1 / 30, 32);
    if (Math.abs(w.x - prev.x) > 0.05 && Math.abs(w.y - prev.y) > 0.05) diagonal++;
    prev = { x: w.x, y: w.y };
  }
  assert.equal(w.path.length, 0, "arrives");
  assert.deepEqual([w.x, w.y], [to.x, to.y], "ends exactly on the spot");
  assert.ok(diagonal > 10, `walks some of the way diagonally (${diagonal} steps)`);
  // Walking back out still starts from a hallway point on the hallway.
  assert.ok(w.approach[0]?.c && L.net.halls.includes(w.approach[0].y), "remembers the hallway point it came from");
});

test("a team lunch seats people on both sides of a long table", () => {
  const L = buildLayout(600, 400, { threads: 12 });
  const plan = planEvent("lunch", L.eventArea, L.net, 7);
  assert.equal(plan.spots.length, 7);
  const table = lunchTable(plan);
  const front = plan.spots.filter((s) => s.facing === "front");
  const back = plan.spots.filter((s) => s.facing === "back");
  assert.ok(front.length >= 3 && back.length >= 3, "two rows");
  for (const s of front) assert.ok(s.y < table.y + table.h, "the far row sits behind the table");
  for (const s of back) assert.ok(s.y > table.y + table.h - 2, "the near row sits in front of it");
  const ids = new Set(plan.spots.map((s) => `${s.x},${s.y}`));
  assert.equal(ids.size, plan.spots.length, "no two people on one seat");
});

test("cutting corners never takes anyone through a walled room", () => {
  for (const [W, H] of [[600, 400], [666, 474], [900, 420], [390, 844]] as const) {
    const L = buildLayout(W, H, { threads: 16 });
    const walled = L.rooms.filter((r) => r.walls).map((r) => r.rect);
    const inside = (x: number, y: number, r: { x: number; y: number; w: number; h: number }, m = 4) => x > r.x + m && x < r.x + r.w - m && y > r.y + m && y < r.y + r.h - m;
    const open = L.spots.filter((s) => !walled.some((r) => inside(s.x, s.y, r, 0)));
    for (let i = 0; i < open.length; i += 3) {
      for (let j = 1; j < open.length; j += 5) {
        const from = open[i]!;
        const to = open[(i + j) % open.length]!;
        if (from === to) continue;
        const w: Walker = { x: from.x, y: from.y, path: [], approach: [...from.path], facing: "front", walked: 0, lane: { x: (i % 11) - 5, y: (j % 9) - 4 }, cut: 16, sway: 4 };
        w.path = route(w, L.net, to.path);
        for (let k = 0; k < 6000 && w.path.length > 0; k++) {
          step(w, 1 / 30, 32);
          const hit = walled.find((r) => inside(w.x, w.y, r));
          assert.ok(!hit, `${W}×${H}: ${from.id} → ${to.id} walks through a room at ${Math.round(w.x)},${Math.round(w.y)}`);
        }
      }
    }
  }
});
