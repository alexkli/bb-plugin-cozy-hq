import { test } from "node:test";
import assert from "node:assert/strict";
import { relabel, withPets, type Theme } from "./theme.ts";
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
  assert.deepEqual([...ids].sort(), ["annex", "beach", "classic", "lair", "neon", "redwoods", "school", "skyline", "spaceship"]);
  assert.equal(themeById("nope").id, "classic");
  assert.equal(themeById("neon").id, "neon");
  for (const t of THEMES) assert.ok(t.name && t.icon && t.blurb, `${t.id} has a name, icon and blurb`);
});

test("each scenery calls its pets by the same names everywhere", () => {
  for (const t of THEMES) {
    const dog = t.labels?.pets?.dog ?? "Biscuit";
    const cat = t.labels?.pets?.cat ?? "Pixel";
    assert.equal(withPets("whistle for {dog}, pet {cat}", t), `whistle for ${dog}, pet ${cat}`);
    if (t.labels?.npc?.dog) assert.ok(t.labels.npc.dog.startsWith(dog), `${t.id}: the dog's hover text names ${dog}`);
    if (t.labels?.npc?.cat) assert.ok(t.labels.npc.cat.startsWith(cat), `${t.id}: the cat's hover text names ${cat}`);
    const others = ["Biscuit", "Pixel"].filter((n) => n !== dog && n !== cat);
    const texts = [...Object.values(t.labels?.poke ?? {}), ...Object.values(t.labels?.npc ?? {}), ...Object.values(t.labels?.words ?? {})];
    for (const text of texts) for (const n of others) assert.ok(!new RegExp(`\\b${n}\\b`).test(text ?? ""), `${t.id}: "${text}" names ${n}, not this scenery's pet`);
  }
});
