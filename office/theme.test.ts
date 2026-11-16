import { test } from "node:test";
import assert from "node:assert/strict";
import { relabel, type Theme } from "./theme.ts";
import { THEMES, themeById } from "./themes/index.ts";

test("word swaps replace whole words and phrases, longest first", () => {
  const theme: Theme = {
    id: "school",
    name: "School",
    blurb: "",
    icon: "",
    labels: { words: { kitchen: "cafeteria", Kitchen: "Cafeteria", "water cooler": "water fountain", cooler: "fridge" } },
  };
  assert.equal(relabel(theme, "Kitchen · Idle under 20 min"), "Cafeteria · Idle under 20 min");
  assert.equal(relabel(theme, "chatting at the water cooler"), "chatting at the water fountain");
  assert.equal(relabel(theme, "kitchenette"), "kitchenette", "only whole words");
  assert.equal(relabel({ ...theme, labels: {} }, "kitchen"), "kitchen");
});

test("every scenery is registered once, and unknown ids fall back to classic", () => {
  const ids = THEMES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), ["annex", "beach", "classic", "neon", "redwoods", "school", "skyline"]);
  assert.equal(themeById("nope").id, "classic");
  assert.equal(themeById("neon").id, "neon");
  for (const t of THEMES) assert.ok(t.name && t.icon && t.blurb, `${t.id} has a name, icon and blurb`);
});
