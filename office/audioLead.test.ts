import { test } from "node:test";
import assert from "node:assert/strict";
import { CLAIM_TTL_MS, mayPlay } from "./audioLead.ts";

const NOW = 1_800_000_000_000;

test("an office you can't see stays quiet, even holding the claim", () => {
  assert.equal(mayPlay(false, { id: "a", at: NOW }, "a", NOW), false);
  assert.equal(mayPlay(false, null, "a", NOW), false);
});

test("a visible office plays when nobody claims the sound, or it does", () => {
  assert.equal(mayPlay(true, null, "a", NOW), true);
  assert.equal(mayPlay(true, { id: "a", at: NOW - 1000 }, "a", NOW), true);
});

test("the office in the other window you looked at last wins", () => {
  assert.equal(mayPlay(true, { id: "b", at: NOW - 1000 }, "a", NOW), false);
});

test("a stale claim (its office closed) is up for grabs", () => {
  assert.equal(mayPlay(true, { id: "b", at: NOW - CLAIM_TTL_MS - 1 }, "a", NOW), true);
});
