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
