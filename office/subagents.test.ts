import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLayout, layoutSize, type Layout, type Rect } from "./layout.ts";
import { route, step, type Walker } from "./life.ts";
import { familiesOf, HELPER_CAP, helperCount, helperSpots, lanyardOf, LANYARDS, subagentsOf } from "./subagents.ts";
import { THEMES } from "./themes/index.ts";

const activity = (backgroundAgents: number) => ({ activity: { workflows: 0, backgroundAgents, backgroundCommands: 0, planMode: 0 } });

test("a thread's subagents are bb's background agent count", () => {
  assert.equal(subagentsOf(activity(0)), 0);
  assert.equal(subagentsOf(activity(3)), 3);
  assert.equal(subagentsOf(activity(-1)), 0);
  assert.equal(subagentsOf(activity(Number.NaN)), 0);
});

test("a few helpers stand at the desk, the rest are a +n", () => {
  assert.deepEqual(helperCount(0, 3), { shown: 0, more: 0 });
  assert.deepEqual(helperCount(2, 3), { shown: 2, more: 0 });
  assert.deepEqual(helperCount(HELPER_CAP + 4, 3), { shown: HELPER_CAP, more: 4 });
  // Less room at the desk: fewer stand, more in the tag.
  assert.deepEqual(helperCount(3, 2), { shown: 2, more: 1 });
});

test("families: a thread and the threads it spawned, as far as they're in the office", () => {
  const t = (id: string, parentThreadId: string | null = null) => ({ id, parentThreadId });
  const fam = familiesOf([t("a"), t("b", "a"), t("c", "b"), t("d"), t("e", "gone"), t("f", "f")]);
  assert.equal(fam.get("a"), "a");
  assert.equal(fam.get("b"), "a");
  assert.equal(fam.get("c"), "a", "grandchildren join the family too");
  assert.equal(fam.has("d"), false, "on its own: no family");
  assert.equal(fam.has("e"), false, "its parent isn't in the office");
  assert.equal(fam.has("f"), false, "its own parent (a loop) doesn't count");
  // Loops don't hang.
  const loop = familiesOf([t("x", "y"), t("y", "x")]);
  assert.ok(loop.size <= 2);
  assert.ok(LANYARDS.includes(lanyardOf("a")));
  assert.equal(lanyardOf("a"), lanyardOf("a"));
});

const SIZES = [
  [600, 300],
  [666, 474],
  [900, 420],
  [1200, 520],
  [390, 844],
  [345, 640],
] as const;

function layouts(): [string, Layout][] {
  const out: [string, Layout][] = [];
  for (const theme of THEMES) {
    for (const [w, h] of SIZES) {
      for (const threads of [4, 28]) {
        const size = layoutSize(w, h);
        const L = theme.layout?.(size.W, size.H, { threads, portrait: size.portrait }) ?? buildLayout(w, h, { threads });
        out.push([`${theme.id} at ${w}×${h} with ${threads} threads`, L]);
      }
    }
  }
  return out;
}

const inRect = (x: number, y: number, r: Rect, m = 0) => x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m;

test("helpers stand next to their own desk in every scenery: in the pod, off the lane, clear of everyone else", () => {
  for (const [name, L] of layouts()) {
    const halls = new Set(L.net.halls);
    const seats = L.desks.map((d) => d.spot);
    const all: { x: number; y: number; desk: number }[] = [];
    for (const d of L.desks) {
      const spots = helperSpots(d);
      assert.equal(spots.length, d.side === "north" ? 3 : 2, `${name}: desk ${d.index} (${d.side})`);
      const pod = L.pods.find((p) => inRect(d.spot.x, d.spot.y, p, 1));
      assert.ok(pod, `${name}: desk ${d.index} is in a pod`);
      const lane = d.spot.path[d.spot.path.length - 2]!;
      for (const s of spots) {
        const where = `${name}: desk ${d.index} helper at ${s.x},${s.y}`;
        assert.ok(s.path[0]?.c && halls.has(s.path[0].y), `${where}: the path starts on a hallway`);
        const last = s.path[s.path.length - 1]!;
        assert.deepEqual([last.x, last.y], [s.x, s.y], `${where}: the path ends on the spot`);
        assert.ok(inRect(s.x, s.y, pod!), `${where}: inside the pod ${JSON.stringify(pod)}`);
        assert.ok(Math.abs(s.y - lane.y) >= 8, `${where}: off the lane at y ${lane.y}`);
        for (const seat of seats) {
          if (seat === d.spot) continue;
          assert.ok(Math.abs(seat.x - s.x) >= 14 || Math.abs(seat.y - s.y) >= 14, `${where}: clear of the seat at ${seat.x},${seat.y}`);
        }
        all.push({ x: s.x, y: s.y, desk: d.index });
      }
    }
    // Helpers at neighboring desks never stand on top of each other.
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]!;
        const b = all[j]!;
        if (a.desk === b.desk) continue;
        assert.ok(Math.abs(a.x - b.x) >= 14 || Math.abs(a.y - b.y) >= 10, `${name}: helpers of desks ${a.desk} and ${b.desk} overlap at ${a.x},${a.y} / ${b.x},${b.y}`);
      }
    }
  }
});

test("helpers walk in from the door and arrive, without cutting through walled rooms", () => {
  const within = (x: number, y: number, r: Rect) => x > r.x + 4 && x < r.x + r.w - 4 && y > r.y + 4 && y < r.y + r.h - 4;
  for (const [name, L] of layouts()) {
    const walled = L.rooms.filter((r) => r.walls).map((r) => r.rect);
    for (const d of L.desks.filter((_, i) => i % 3 === 0)) {
      for (const s of helperSpots(d)) {
        const w: Walker = { x: L.entrance.x, y: L.entrance.y, path: [], approach: [L.entrancePath[0]!, L.entrance], facing: "front", walked: 0, lane: { x: 3, y: -2 }, cut: 12, sway: 2 };
        w.path = route(w, L.net, s.path);
        for (let k = 0; k < 8000 && w.path.length > 0; k++) {
          step(w, 1 / 30, 30);
          const hit = walled.find((r) => within(w.x, w.y, r));
          assert.equal(hit, undefined, `${name}: walking to desk ${d.index}'s helper spot crosses a walled room near ${Math.round(w.x)},${Math.round(w.y)}`);
        }
        assert.deepEqual([w.path.length, w.x, w.y], [0, s.x, s.y], `${name}: arrives at desk ${d.index}'s helper spot`);
      }
    }
  }
});
