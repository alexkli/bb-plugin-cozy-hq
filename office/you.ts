// You, the boss: how you look in the office (picked in the settings, kept
// per browser) and the pronouns its words use for you. The defaults are the
// classic boss, so nothing changes until you pick something.

import { npcLook, type Figure, type HairStyle, type Hat, type Look, type Pattern, type Top, type Wear } from "./characters.ts";
import type { Theme } from "./theme.ts";

export type Pronouns = "she" | "he" | "they";

export interface You {
  figure: Figure;
  pronouns: Pronouns;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: Top;
  /** The shirt's color; null: as the scenery dresses you (navy in the classic office). */
  shirt: string | null;
  pattern: Pattern;
  /** Hat, scarf, headphones, lanyard, pin and bow; null: the scenery's color. */
  accent: string | null;
  hat: Hat | null;
  wear: Wear[];
}

/** Picking a figure picks its usual pronouns and top too; you can change them after. */
export const FIGURES: { id: Figure; label: string; pronouns: Pronouns; top: Top }[] = [
  { id: "woman", label: "Woman", pronouns: "she", top: "vneck" },
  { id: "man", label: "Man", pronouns: "he", top: "tie" },
  { id: "nonbinary", label: "Nonbinary", pronouns: "they", top: "shirt" },
];

export const PRONOUNS: { id: Pronouns; label: string }[] = [
  { id: "she", label: "she/her" },
  { id: "he", label: "he/him" },
  { id: "they", label: "they/them" },
];

export const SKIN_TONES: { color: string; name: string }[] = [
  { color: "#ffdcc4", name: "Very light" },
  { color: "#f1c7a4", name: "Light" },
  { color: "#e7b08a", name: "Light medium" },
  { color: "#c98a5e", name: "Medium" },
  { color: "#9b6340", name: "Medium dark" },
  { color: "#6e4630", name: "Dark" },
  { color: "#583524", name: "Deep" },
];

export const HAIR_COLORS: { color: string; name: string }[] = [
  { color: "#2b1d16", name: "Black" },
  { color: "#4a2f22", name: "Dark brown" },
  { color: "#6b4128", name: "Brown" },
  { color: "#9a5f34", name: "Light brown" },
  { color: "#b5432f", name: "Red" },
  { color: "#d7a24f", name: "Blonde" },
  { color: "#efd37f", name: "Light blonde" },
  { color: "#9b98a4", name: "Grey" },
  { color: "#f2f2f2", name: "White" },
  { color: "#e57aa8", name: "Pink" },
  { color: "#3f8ad8", name: "Blue" },
  { color: "#8a5fd6", name: "Purple" },
];

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: "crop", label: "Short" },
  { id: "buzz", label: "Buzz cut" },
  { id: "bald", label: "Bald" },
  { id: "bob", label: "Bob" },
  { id: "long", label: "Long" },
  { id: "ponytail", label: "Ponytail" },
  { id: "bun", label: "Bun" },
  { id: "curly", label: "Curly" },
  { id: "spiky", label: "Spiky" },
];

export const TOPS: { id: Top; label: string }[] = [
  { id: "tie", label: "Shirt & tie" },
  { id: "shirt", label: "Open shirt" },
  { id: "vneck", label: "V-neck" },
  { id: "tee", label: "T-shirt" },
  { id: "polo", label: "Polo" },
  { id: "hoodie", label: "Hoodie" },
  { id: "turtleneck", label: "Turtleneck" },
  { id: "sweater", label: "Sweater" },
  { id: "blazer", label: "Blazer" },
];

export const SHIRT_COLORS: { color: string; name: string }[] = [
  { color: "#2f3a5a", name: "Navy" },
  { color: "#3a3a44", name: "Charcoal" },
  { color: "#f4f1ea", name: "White" },
  { color: "#c8bfae", name: "Beige" },
  { color: "#8a3b4a", name: "Burgundy" },
  { color: "#e5484d", name: "Red" },
  { color: "#f0913a", name: "Orange" },
  { color: "#f2c14e", name: "Mustard" },
  { color: "#3f8f5a", name: "Green" },
  { color: "#3e8ed0", name: "Blue" },
  { color: "#7d5fc4", name: "Purple" },
  { color: "#e58fb4", name: "Pink" },
];

export const PATTERNS: { id: Pattern; label: string }[] = [
  { id: "plain", label: "Plain" },
  { id: "stripes", label: "Stripes" },
  { id: "check", label: "Check" },
  { id: "dots", label: "Dots" },
];

export const ACCENTS: { color: string; name: string }[] = [
  { color: "#e5484d", name: "Red" },
  { color: "#f0913a", name: "Orange" },
  { color: "#f2c14e", name: "Yellow" },
  { color: "#3f8f5a", name: "Green" },
  { color: "#3e8ed0", name: "Blue" },
  { color: "#7d5fc4", name: "Purple" },
  { color: "#e58fb4", name: "Pink" },
  { color: "#3a3a44", name: "Black" },
  { color: "#f4f1ea", name: "White" },
];

export const HATS: { id: Hat | null; label: string }[] = [
  { id: null, label: "No hat" },
  { id: "cap", label: "Cap" },
  { id: "beanie", label: "Beanie" },
  { id: "sunhat", label: "Sun hat" },
  { id: "fedora", label: "Fedora" },
  { id: "beret", label: "Beret" },
];

/** Decorations, by where they go (any number at once). */
export const FACE_WEAR: { id: Wear; label: string }[] = [
  { id: "glasses", label: "Glasses" },
  { id: "freckles", label: "Freckles" },
  { id: "beard", label: "Beard" },
];
export const EXTRA_WEAR: { id: Wear; label: string }[] = [
  { id: "headphones", label: "Headphones" },
  { id: "earrings", label: "Earrings" },
  { id: "necklace", label: "Necklace" },
  { id: "nosestud", label: "Nose stud" },
  { id: "scarf", label: "Scarf" },
  { id: "lanyard", label: "Lanyard" },
  { id: "pin", label: "Pin" },
  { id: "bow", label: "Hair bow" },
  { id: "flower", label: "Flower" },
];

const CLASSIC = npcLook("boss");

/** The classic boss. Pronouns: "they" until you say otherwise. */
export const DEFAULT_YOU: You = {
  figure: "man",
  pronouns: "they",
  skin: CLASSIC.skin,
  hair: CLASSIC.hair,
  hairStyle: CLASSIC.hairStyle,
  top: "tie",
  shirt: null,
  pattern: "plain",
  accent: null,
  hat: null,
  wear: CLASSIC.accessory === "glasses" ? ["glasses"] : [],
};

const ALL_WEAR = [...FACE_WEAR, ...EXTRA_WEAR].map((w) => w.id);

/** Your saved pick (anything unknown falls back to the classic boss; an older `glasses` flag still counts). */
export function readYou(raw: unknown): You {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof You | "glasses", unknown>>;
  const oneOf = <T>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
  const figure = oneOf(o.figure, FIGURES.map((f) => f.id), DEFAULT_YOU.figure);
  let wear = Array.isArray(o.wear) ? ALL_WEAR.filter((w) => (o.wear as unknown[]).includes(w)) : DEFAULT_YOU.wear.filter((w) => w !== "glasses");
  if (!Array.isArray(o.wear) && (typeof o.glasses === "boolean" ? o.glasses : DEFAULT_YOU.wear.includes("glasses"))) wear = ["glasses", ...wear];
  return {
    figure,
    pronouns: oneOf(o.pronouns, PRONOUNS.map((p) => p.id), DEFAULT_YOU.pronouns),
    skin: oneOf(o.skin, SKIN_TONES.map((c) => c.color), DEFAULT_YOU.skin),
    hair: oneOf(o.hair, HAIR_COLORS.map((c) => c.color), DEFAULT_YOU.hair),
    hairStyle: oneOf(o.hairStyle, HAIR_STYLES.map((h) => h.id), DEFAULT_YOU.hairStyle),
    // Before tops were their own pick, the figure chose the neckline.
    top: oneOf(o.top, TOPS.map((t) => t.id), FIGURES.find((f) => f.id === figure)!.top),
    shirt: oneOf(o.shirt, [null, ...SHIRT_COLORS.map((c) => c.color)], DEFAULT_YOU.shirt),
    pattern: oneOf(o.pattern, PATTERNS.map((p) => p.id), DEFAULT_YOU.pattern),
    accent: oneOf(o.accent, [null, ...ACCENTS.map((c) => c.color)], DEFAULT_YOU.accent),
    hat: oneOf(o.hat, HATS.map((h) => h.id), DEFAULT_YOU.hat),
    wear,
  };
}

/** A figure with its usual pronouns and top. */
export function withFigure(you: You, figure: Figure): You {
  const f = FIGURES.find((x) => x.id === figure)!;
  return { ...you, figure, pronouns: f.pronouns, top: f.top };
}

/** Wear something, or take it off. */
export function toggleWear(you: You, w: Wear): You {
  return { ...you, wear: you.wear.includes(w) ? you.wear.filter((x) => x !== w) : ALL_WEAR.filter((x) => x === w || you.wear.includes(x)) };
}

/** True when this is the classic boss (the sprite stays exactly as it was). */
function isClassic(you: You): boolean {
  const d = DEFAULT_YOU;
  return (
    you.figure === d.figure &&
    you.skin === d.skin &&
    you.hair === d.hair &&
    you.hairStyle === d.hairStyle &&
    you.top === d.top &&
    you.shirt === d.shirt &&
    you.pattern === d.pattern &&
    you.accent === d.accent &&
    you.hat === d.hat &&
    you.wear.join() === d.wear.join()
  );
}

/** The classic boss with your pick applied (a scenery dresses this one, see `dressYou`). */
export function youLook(you: You): Look {
  const look: Look = {
    ...CLASSIC,
    skin: you.skin,
    hair: you.hair,
    hairStyle: you.hairStyle,
    shirt: you.shirt ?? CLASSIC.shirt,
    accent: you.accent ?? CLASSIC.accent,
    accessory: you.wear.includes("glasses") ? "glasses" : "none",
    figure: you.figure,
    top: you.top,
    pattern: you.pattern,
    hat: you.hat ?? undefined,
    wear: you.wear,
    ownShirt: you.shirt !== null,
  };
  if (isClassic(you)) return look;
  // The key names the sprite in the character cache: the classic boss keeps its own.
  const key = [CLASSIC.key, you.figure, you.skin, you.hair, you.hairStyle, you.top, you.shirt ?? "-", you.pattern, you.accent ?? "-", you.hat ?? "-", you.wear.join("+")].join("|");
  return { ...look, key };
}

/**
 * You as the scenery dresses you (its `npc("boss")` hook), with what you
 * picked yourself kept on top: skin, hair, top, hat and decorations always,
 * the shirt and accent colors when you chose them.
 */
export function dressYou(you: You, theme: Pick<Theme, "id" | "npc">): Look {
  const base = youLook(you);
  if (!theme.npc) return base;
  const l = theme.npc("boss", base);
  return {
    ...l,
    skin: base.skin,
    hair: base.hair,
    hairStyle: base.hairStyle,
    accessory: base.accessory,
    figure: base.figure,
    top: base.top,
    pattern: base.pattern,
    hat: base.hat,
    wear: base.wear,
    ownShirt: base.ownShirt,
    shirt: you.shirt ?? l.shirt,
    accent: you.accent ?? l.accent,
    key: `${base.key}|${theme.id}`,
  };
}

/** The badge on your shirt: the classic tie with a shirt and tie, else none. */
export function youEmblem(you: You): string | null {
  return you.top === "tie" ? "tie" : null;
}

const FORMS: Record<Pronouns, Record<"they" | "them" | "their", string>> = {
  she: { they: "she", them: "her", their: "her" },
  he: { they: "he", them: "him", their: "his" },
  they: { they: "they", them: "them", their: "their" },
};

/**
 * Text about you with your pronouns: "{they}", "{them}" and "{their}"
 * (capitalized for the start of a sentence). Write lines so the verb doesn't
 * change ("{they} sank it", "{they}'ll love it").
 */
export function withPronouns(text: string, p: Pronouns): string {
  if (!text.includes("{")) return text;
  return text.replace(/\{(they|them|their|They|Them|Their)\}/g, (_, w: string) => {
    const f = FORMS[p][w.toLowerCase() as "they" | "them" | "their"];
    return w[0] === "T" ? f[0]!.toUpperCase() + f.slice(1) : f;
  });
}
