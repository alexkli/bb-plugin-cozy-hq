import { test } from "node:test";
import assert from "node:assert/strict";
import { npcLook } from "./characters.ts";
import { DEFAULT_YOU, readYou, withPronouns, youEmblem, youLook } from "./you.ts";

test("you start as the classic boss, and a bad save falls back to it", () => {
  assert.deepEqual(readYou(null), DEFAULT_YOU);
  assert.deepEqual(readYou({ figure: "robot", skin: "#00ff00", hairStyle: "mohawk", glasses: "yes" }), DEFAULT_YOU);
  const classic = npcLook("boss");
  const look = youLook(DEFAULT_YOU);
  assert.equal(look.key, classic.key, "the classic boss keeps its sprite");
  assert.equal(look.skin, classic.skin);
  assert.equal(youEmblem(DEFAULT_YOU), "tie");
});

test("your pick changes the look and its sprite key", () => {
  const you = readYou({ ...DEFAULT_YOU, figure: "woman", pronouns: "she", skin: "#6e4630", hair: "#f2f2f2", hairStyle: "bun", glasses: false });
  const look = youLook(you);
  assert.equal(look.skin, "#6e4630");
  assert.equal(look.hair, "#f2f2f2");
  assert.equal(look.hairStyle, "bun");
  assert.equal(look.accessory, "none");
  assert.equal(look.figure, "woman");
  assert.notEqual(look.key, npcLook("boss").key);
  assert.equal(youEmblem(you), null);
});

test("words about you use your pronouns", () => {
  assert.equal(withPronouns("Is the boss in? I need {their} sign-off.", "she"), "Is the boss in? I need her sign-off.");
  assert.equal(withPronouns("{They} sank it! Watch {them} go.", "he"), "He sank it! Watch him go.");
  assert.equal(withPronouns("Show the boss, {they}'ll love {their} new desk.", "they"), "Show the boss, they'll love their new desk.");
  assert.equal(withPronouns("No pronouns here.", "she"), "No pronouns here.");
});
