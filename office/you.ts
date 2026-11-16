// You, the boss: how you look in the office (picked in the settings, kept
// per browser) and the pronouns its words use for you. The defaults are the
// classic boss, so nothing changes until you pick something.

import { npcLook, type Figure, type HairStyle, type Look } from "./characters.ts";

export type Pronouns = "she" | "he" | "they";

export interface You {
  figure: Figure;
  pronouns: Pronouns;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  glasses: boolean;
}

/** Picking a figure picks its usual pronouns too; you can change them after. */
export const FIGURES: { id: Figure; label: string; pronouns: Pronouns }[] = [
  { id: "woman", label: "Woman", pronouns: "she" },
  { id: "man", label: "Man", pronouns: "he" },
  { id: "nonbinary", label: "Nonbinary", pronouns: "they" },
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

const CLASSIC = npcLook("boss");

/** The classic boss. Pronouns: "they" until you say otherwise. */
export const DEFAULT_YOU: You = {
  figure: "man",
  pronouns: "they",
  skin: CLASSIC.skin,
  hair: CLASSIC.hair,
  hairStyle: CLASSIC.hairStyle,
  glasses: CLASSIC.accessory === "glasses",
};

/** Your saved pick (anything unknown falls back to the classic boss). */
export function readYou(raw: unknown): You {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof You, unknown>>;
  const oneOf = <T>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
  return {
    figure: oneOf(o.figure, FIGURES.map((f) => f.id), DEFAULT_YOU.figure),
    pronouns: oneOf(o.pronouns, PRONOUNS.map((p) => p.id), DEFAULT_YOU.pronouns),
    skin: oneOf(o.skin, SKIN_TONES.map((c) => c.color), DEFAULT_YOU.skin),
    hair: oneOf(o.hair, HAIR_COLORS.map((c) => c.color), DEFAULT_YOU.hair),
    hairStyle: oneOf(o.hairStyle, HAIR_STYLES.map((h) => h.id), DEFAULT_YOU.hairStyle),
    glasses: typeof o.glasses === "boolean" ? o.glasses : DEFAULT_YOU.glasses,
  };
}

/** The classic boss with your pick applied (a scenery dresses this one). */
export function youLook(you: You): Look {
  const look: Look = { ...CLASSIC, skin: you.skin, hair: you.hair, hairStyle: you.hairStyle, accessory: you.glasses ? "glasses" : "none", figure: you.figure };
  const classic = look.skin === CLASSIC.skin && look.hair === CLASSIC.hair && look.hairStyle === CLASSIC.hairStyle && look.accessory === CLASSIC.accessory && you.figure === "man";
  // The key names the sprite in the character cache: the classic boss keeps its own.
  return classic ? look : { ...look, key: `${CLASSIC.key}|${you.figure}|${you.skin}|${you.hair}|${you.hairStyle}|${look.accessory}` };
}

/** The badge on your shirt: the classic tie, or none (the figure brings its own neckline). */
export function youEmblem(you: You): string | null {
  return you.figure === "man" ? "tie" : null;
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
