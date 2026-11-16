import { test } from "node:test";
import assert from "node:assert/strict";
import { npcLook, type Look } from "./characters.ts";
import { DEFAULT_YOU, dressYou, readYou, toggleWear, withFigure, withPronouns, youEmblem, youLook } from "./you.ts";

test("you start as the classic boss, and a bad save falls back to it", () => {
  assert.deepEqual(readYou(null), DEFAULT_YOU);
  assert.deepEqual(readYou({ figure: "robot", skin: "#00ff00", hairStyle: "mohawk", top: "toga", hat: "crown", wear: ["cape"] }), { ...DEFAULT_YOU, wear: [] });
  const classic = npcLook("boss");
  const look = youLook(DEFAULT_YOU);
  assert.equal(look.key, classic.key, "the classic boss keeps its sprite");
  assert.equal(look.skin, classic.skin);
  assert.equal(look.shirt, classic.shirt);
  assert.equal(look.accessory, "glasses");
  assert.equal(youEmblem(DEFAULT_YOU), "tie");
});

test("an earlier save carries over: glasses, and the figure's neckline", () => {
  const old = readYou({ figure: "woman", pronouns: "she", skin: "#6e4630", hair: "#f2f2f2", hairStyle: "bun", glasses: false });
  assert.deepEqual(old.wear, []);
  assert.equal(old.top, "vneck");
  assert.deepEqual(readYou({ figure: "nonbinary", glasses: true }).wear, ["glasses"]);
  assert.equal(readYou({ figure: "nonbinary" }).top, "shirt");
});

test("a figure picks its pronouns and top; decorations toggle in a fixed order", () => {
  const you = withFigure(DEFAULT_YOU, "woman");
  assert.equal(you.pronouns, "she");
  assert.equal(you.top, "vneck");
  assert.equal(youEmblem(you), null);
  const dressed = toggleWear(toggleWear(you, "scarf"), "beard");
  assert.deepEqual(dressed.wear, ["glasses", "beard", "scarf"]);
  assert.deepEqual(toggleWear(dressed, "glasses").wear, ["beard", "scarf"]);
});

test("your pick changes the look and its sprite key", () => {
  const you = readYou({ ...DEFAULT_YOU, figure: "nonbinary", skin: "#6e4630", hair: "#f2f2f2", hairStyle: "bun", top: "hoodie", shirt: "#3f8f5a", pattern: "stripes", hat: "beret", wear: ["earrings"] });
  const look = youLook(you);
  assert.equal(look.skin, "#6e4630");
  assert.equal(look.hairStyle, "bun");
  assert.equal(look.accessory, "none");
  assert.equal(look.top, "hoodie");
  assert.equal(look.shirt, "#3f8f5a");
  assert.equal(look.ownShirt, true);
  assert.equal(look.hat, "beret");
  assert.notEqual(look.key, npcLook("boss").key);
  assert.notEqual(youLook({ ...you, hat: "cap" }).key, look.key, "every pick has its own sprite");
});

test("a scenery dresses you, but what you picked stays", () => {
  // A scenery that puts the boss in its own outfit (and would take your glasses off).
  const theme = { id: "beach" as const, npc: (_k: string, l: Look): Look => ({ ...l, shirt: "#efe6d2", accent: "#ff7a5c", accessory: "none", hairStyle: "cap" }) };
  const yours = dressYou({ ...DEFAULT_YOU, shirt: "#e5484d", hat: "sunhat" }, theme);
  assert.equal(yours.shirt, "#e5484d", "your shirt color wins");
  assert.equal(yours.accent, "#ff7a5c", "the scenery's accent when you left it");
  assert.equal(yours.accessory, "glasses");
  assert.equal(yours.hairStyle, DEFAULT_YOU.hairStyle);
  assert.equal(yours.hat, "sunhat");
  const sceneryShirt = dressYou(DEFAULT_YOU, theme);
  assert.equal(sceneryShirt.shirt, "#efe6d2", "no shirt color picked: the scenery's outfit");
  assert.equal(sceneryShirt.ownShirt, false);
  assert.notEqual(sceneryShirt.key, youLook(DEFAULT_YOU).key, "a dressed look has its own sprite");
  assert.equal(dressYou(DEFAULT_YOU, { id: "classic" }).key, npcLook("boss").key);
});

test("words about you use your pronouns", () => {
  assert.equal(withPronouns("Is the boss in? I need {their} sign-off.", "she"), "Is the boss in? I need her sign-off.");
  assert.equal(withPronouns("{They} sank it! Watch {them} go.", "he"), "He sank it! Watch him go.");
  assert.equal(withPronouns("Show the boss, {they}'ll love {their} new desk.", "they"), "Show the boss, they'll love their new desk.");
  assert.equal(withPronouns("No pronouns here.", "she"), "No pronouns here.");
});
