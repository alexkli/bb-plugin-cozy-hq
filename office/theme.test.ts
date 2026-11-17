import { test } from "node:test";
import assert from "node:assert/strict";
import { relabel, withPets, type Theme } from "./theme.ts";
import { THEMES, themeById } from "./themes/index.ts";
import { layoutSize } from "./layout.ts";
import { assignSpots, type ThreadLike } from "./model.ts";

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
  assert.deepEqual([...ids].sort(), ["annex", "beach", "cabin", "cafe", "classic", "home", "lair", "neon", "redwoods", "school", "skyline", "spaceship", "startup"]);
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

test("Startup House: 28 busy threads all have a place to work at 666×474 and 390×844", () => {
  const theme = themeById("startup");
  const busy = Array.from({ length: 28 }, (_, i): ThreadLike => ({
    id: `t${i}`,
    displayTitle: `t${i}`,
    projectId: "p",
    providerId: "claude-code",
    status: "active",
    indicator: "none",
    hasPendingInteraction: false,
    isUnread: false,
    isPinned: false,
    isArchived: false,
    isHidden: false,
    parentThreadId: null,
    href: `/t/${i}`,
    activity: { workflows: 0, backgroundAgents: 0, backgroundCommands: 0, planMode: 0 },
    updatedAt: 1_800_000_000_000 - i * 60_000,
    lastReadAt: null,
    latestAttentionAt: 0,
  }));
  for (const [w, h] of [[666, 474], [390, 844]] as const) {
    const size = layoutSize(w, h);
    const L = theme.layout!(size.W, size.H, { threads: 28, portrait: size.portrait })!;
    const { spots, overflow } = assignSpots(busy, L.spots, new Map(), new Map(), 1_800_000_000_000);
    assert.deepEqual(overflow, [], `${w}×${h}: nobody's left out`);
    const at = busy.map((t) => L.byId.get(spots.get(t.id)!)!);
    assert.ok(at.every((s) => s.group === "desk"), `${w}×${h}: everyone works in the desk group`);
    // The real desks fill first; the rest squeeze in with laptops, typing away facing you.
    const desks = at.filter((s) => s.kind === "desk");
    assert.equal(desks.length, L.desks.length, `${w}×${h}: every desk is taken`);
    assert.ok(desks.length < 28, `${w}×${h}: fewer desks than the head count`);
    for (const s of at.filter((s) => s.kind !== "desk")) {
      assert.ok(!s.id.startsWith("desk-") && s.pose === "sit-desk-front", `${w}×${h}: ${s.id} is a squeeze-in`);
    }
  }
});

test("Mountain Cabin: 28 busy threads all have a place to work at 666×474 and 390×844", () => {
  const theme = themeById("cabin");
  const busy = Array.from({ length: 28 }, (_, i): ThreadLike => ({
    id: `t${i}`,
    displayTitle: `t${i}`,
    projectId: "p",
    providerId: "claude-code",
    status: "active",
    indicator: "none",
    hasPendingInteraction: false,
    isUnread: false,
    isPinned: false,
    isArchived: false,
    isHidden: false,
    parentThreadId: null,
    href: `/t/${i}`,
    activity: { workflows: 0, backgroundAgents: 0, backgroundCommands: 0, planMode: 0 },
    updatedAt: 1_800_000_000_000 - i * 60_000,
    lastReadAt: null,
    latestAttentionAt: 0,
  }));
  for (const [w, h] of [[666, 474], [390, 844]] as const) {
    const size = layoutSize(w, h);
    const L = theme.layout!(size.W, size.H, { threads: 28, portrait: size.portrait })!;
    const { spots, overflow } = assignSpots(busy, L.spots, new Map(), new Map(), 1_800_000_000_000);
    assert.deepEqual(overflow, [], `${w}×${h}: nobody's left out`);
    const at = busy.map((t) => L.byId.get(spots.get(t.id)!)!);
    assert.ok(at.every((s) => s.group === "desk"), `${w}×${h}: everyone works in the desk group`);
    // The real desks fill first; the rest squeeze in with laptops, typing away facing you.
    const desks = at.filter((s) => s.kind === "desk");
    assert.equal(desks.length, L.desks.length, `${w}×${h}: every desk is taken`);
    assert.ok(desks.length < 28, `${w}×${h}: fewer desks than the head count`);
    for (const s of at.filter((s) => s.kind !== "desk")) {
      assert.ok(!s.id.startsWith("desk-") && s.pose === "sit-desk-front", `${w}×${h}: ${s.id} is a squeeze-in`);
    }
  }
});
