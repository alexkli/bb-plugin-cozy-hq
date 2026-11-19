import { test } from "node:test";
import assert from "node:assert/strict";
import { lookFor } from "./characters.ts";
import { buildLayout } from "./layout.ts";
import { World, type WorldThread } from "./world.ts";

// Just enough of a canvas for the world to paint into nothing.
const ctx: object = new Proxy({}, {
  get: (_, k) => (k === "getImageData" || k === "createImageData" ? () => ({ data: new Uint8ClampedArray(4) }) : k === "measureText" ? () => ({ width: 0 }) : k === "canvas" ? undefined : () => ctx),
  set: () => true,
});
(globalThis as { document?: unknown }).document ??= {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
};

const thread = (i: number): WorldThread => ({
  id: `t${i}`,
  title: `Thread ${i}`,
  mood: "working",
  waitKind: null,
  spotId: `desk-${i}`,
  look: lookFor(`t${i}`, 0),
  isPinned: false,
  emblem: null,
  deskStyle: "classic" as WorldThread["deskStyle"],
  chairTone: "green" as WorldThread["chairTone"],
  visionPro: false,
  subagents: 0,
  family: null,
});

test("an archived thread walks out even when the floor plan shrinks behind it", () => {
  const world = new World(() => {});
  world.setLayout(buildLayout(900, 420, { threads: 8 }), "8");
  const five = [0, 1, 2, 3, 4].map(thread);
  world.sync(five, true);
  // t4 is archived: it heads for the door, and the head count drops to 4 desks.
  world.sync(five.slice(0, 4), false);
  world.setLayout(buildLayout(900, 420, { threads: 4 }), "4");
  for (let i = 0; i < 60 * 30; i++) world.update(1 / 60);
  const agents = (world as unknown as { agents: Map<string, unknown> }).agents;
  assert.deepEqual([...agents.keys()].sort(), ["t0", "t1", "t2", "t3"]);
});

test("they run to and from the desk; a stroll from the coffee to the couch is a walk", () => {
  const world = new World(() => {});
  world.setLayout(buildLayout(900, 420, { threads: 8 }), "8");
  const agents = (world as unknown as { agents: Map<string, { pace: number; path: unknown[] }> }).agents;
  // A newcomer who starts working walks in from the door at a run.
  world.sync([thread(0), thread(1)], false);
  assert.ok(agents.get("t0")!.path.length > 0 && agents.get("t0")!.pace > 2);
  world.sync([thread(0), thread(1)], true);
  // t0 needs you: off to the waiting room. t1 is done for now: a coffee. Both leave the desk at a run.
  world.sync([{ ...thread(0), mood: "needs-you", spotId: "wait-0-0-n0" }, { ...thread(1), mood: "idle", spotId: "coffee" }], false);
  assert.ok(agents.get("t0")!.path.length > 0 && agents.get("t0")!.pace > 2);
  assert.ok(agents.get("t1")!.path.length > 0 && agents.get("t1")!.pace > 2);
  // From the coffee to the couch: a stroll.
  world.sync([{ ...thread(0), mood: "needs-you", spotId: "wait-0-0-n0" }, { ...thread(1), mood: "idle", spotId: "coffee" }], true);
  world.sync([{ ...thread(0), mood: "needs-you", spotId: "wait-0-0-n0" }, { ...thread(1), mood: "idle", spotId: "couch-1" }], false);
  assert.ok(agents.get("t1")!.path.length > 0 && agents.get("t1")!.pace === 1);
  // You start writing to t1: it runs over to your office.
  world.sync([{ ...thread(0), mood: "needs-you", spotId: "wait-0-0-n0" }, { ...thread(1), mood: "idle", spotId: "couch-1" }], true);
  world.sync([{ ...thread(0), mood: "needs-you", spotId: "wait-0-0-n0" }, { ...thread(1), mood: "drafting", spotId: "boss-guest-0" }], false);
  assert.ok(agents.get("t1")!.path.length > 0 && agents.get("t1")!.pace > 2);
});

test("a show's spot can send them back another way: gliding fast along its points, then walking home", () => {
  const world = new World(() => {});
  const L = buildLayout(900, 420, { threads: 8 });
  world.setLayout(L, "8");
  world.sync([{ ...thread(0), mood: "idle", spotId: "couch-1" }], true);
  const w = world as unknown as {
    agents: Map<string, { x: number; y: number; pace: number; path: { x: number; y: number }[]; glide?: unknown; target: string | null }>;
    gather: (spots: unknown[], seconds: number, cues: unknown[], min: number) => { done: boolean; ids: string[] } | null;
  };
  const hall = L.net.halls[0]!;
  const spot = { x: 200, y: hall, facing: "front", pose: "stand", activity: "skiing", path: [{ x: 200, y: hall, c: true }] };
  const glide = [{ x: 240, y: hall }, { x: 280, y: hall }];
  const g = w.gather([{ ...spot, leave: { glide, pace: 2, walk: [{ x: 300, y: hall, c: true }] } }], 1, [], 1)!;
  assert.deepEqual(g.ids, ["t0"]);
  const a = w.agents.get("t0")!;
  for (let i = 0; i < 60 * 60 && !g.done; i++) world.update(1 / 60);
  assert.ok(g.done);
  // Off along the glide first, faster than a walk, then home to the couch.
  assert.deepEqual(a.path.slice(0, 2), glide);
  assert.ok(a.glide);
  assert.equal(a.target, "couch-1");
  const x0 = a.x;
  world.update(0.25);
  assert.ok(a.x - x0 > 32 * 0.25 * 1.4, "gliding faster than walking");
  for (let i = 0; i < 60 * 2; i++) world.update(1 / 60);
  assert.equal(a.glide, null);
});
