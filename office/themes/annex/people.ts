// Dusty Annex: people. Drab cardigans, rumpled suits with loosened ties, the
// odd hoodie; everyone keeps their own face and hair, and their project still
// shows in the colour of what they wear, just faded.

import type { Theme, VisitorKind } from "../../theme.ts";
import type { CharPose } from "../../characters.ts";
import type { Facing } from "../../layout.ts";
import { hash, mix, rng, shade, type Look } from "../../themekit.ts";

type Outfit = "cardigan" | "suit" | "jumper" | "hoodie" | "shirt";

function outfitOf(seed: number): Outfit {
  const k = rng(seed ^ 0x5a17)();
  return k < 0.32 ? "cardigan" : k < 0.56 ? "suit" : k < 0.76 ? "jumper" : k < 0.9 ? "hoodie" : "shirt";
}

const PANTS = ["#3e3a34", "#4a4438", "#2f3238", "#55503f", "#3a3f4a", "#463c34"];
const SUITS = ["#3e3e42", "#4a4036", "#33394a", "#4a4a40"];
const TIES = ["#7a3a30", "#3e4a6a", "#8a6a2a", "#4a5a3a", "#6a3a4a"];
const UNDERSHIRT = ["#d8d2be", "#b8c2c8", "#d8ccb0"];

/** The tie and the shirt under the jumper, by seed (look and dress agree). */
function extras(seed: number): { tie: string; under: string } {
  const r = rng(seed ^ 0x7e11);
  return { tie: TIES[Math.floor(r() * TIES.length)]!, under: UNDERSHIRT[Math.floor(r() * UNDERSHIRT.length)]! };
}

function look(base: Look, threadId: string): Look {
  const seed = hash(threadId);
  const r = rng(seed ^ 0x2c3e);
  const outfit = outfitOf(seed);
  // The project colour, faded into something from a charity shop.
  const faded = mix(base.shirt, "#7a705c", 0.5);
  let shirt: string;
  switch (outfit) {
    case "suit":
      shirt = mix(SUITS[Math.floor(r() * SUITS.length)]!, base.shirt, 0.18);
      break;
    case "hoodie":
      shirt = shade(mix(base.shirt, "#5a5a56", 0.4), -0.1);
      break;
    case "shirt":
      shirt = mix(base.shirt, "#d8d2be", 0.55);
      break;
    case "jumper":
      shirt = shade(faded, -0.08);
      break;
    default:
      shirt = faded;
  }
  const pants = outfit === "suit" ? shade(shirt, -0.12) : PANTS[Math.floor(r() * PANTS.length)]!;
  let accessory = base.accessory;
  if (outfit === "hoodie" && accessory === "none" && r() < 0.5) accessory = "beanie";
  if (accessory === "none" && r() < 0.25) accessory = "glasses";
  return {
    ...base,
    shirt,
    pants,
    accessory,
    accent: mix(base.accent, "#6a6050", 0.45),
    key: `${base.key}|annex|${outfit}|${shirt}|${pants}|${accessory}`,
  };
}

function npc(kind: VisitorKind, classic: Look): Look {
  const k = `${classic.key}|annex`;
  switch (kind) {
    case "boss":
      // You, in a crumpled overcoat.
      return { ...classic, key: k, shirt: "#7a6a4e", pants: "#2f2f34", accent: "#6a3a30" };
    case "guard":
      // The night guard: a bobbled jumper and a cap that's seen better nights.
      return { ...classic, key: k, shirt: "#3e4250", pants: "#2a2c34", accent: "#26282e" };
    case "janitor":
      return { ...classic, key: k, shirt: "#5c6b78", pants: "#3a3f4a", accent: "#4a5560" };
    case "technician":
      // The handyman: brown dust coat, flat cap, in no hurry.
      return { ...classic, key: k, hair: "#7a7a72", shirt: "#7a6248", pants: "#3a3836", accent: "#5a4a3a" };
    case "delivery":
      // Takeaway rider, soaked: a dull hi-vis jacket and a dripping cap.
      return { ...classic, key: k, shirt: "#9aa83a", pants: "#2a2c30", accent: "#2f3a2a" };
  }
}

function dress(ctx: CanvasRenderingContext2D, a: { x: number; y: number; facing: Facing; pose: CharPose; seed: number; seated: boolean; look: Look }, t: number): void {
  void t;
  const w = { outfit: outfitOf(a.seed), shirt: a.look.shirt, ...extras(a.seed) };
  const bob = a.pose === "walk1" || a.pose === "walk3" ? -1 : 0;
  const top = a.y + 14 + bob;
  const x = a.x;
  const px = (dx: number, dy: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + dx, top + dy, 1, 1);
  };
  // Keep clear of the topic badge on the chest (x 7..11, rows 1..5): collars, cuffs and edges only.
  const nap = a.pose === "nap";
  if (a.facing === "back") {
    if (w.outfit === "hoodie") {
      // The hood, bunched at the back of the neck.
      ctx.fillStyle = shade(w.shirt, -0.18);
      ctx.fillRect(x + 6, top, 6, 2);
      ctx.fillStyle = shade(w.shirt, 0.08);
      ctx.fillRect(x + 7, top, 4, 1);
    } else if (w.outfit === "suit") {
      px(8, 0, w.under);
      px(9, 0, w.under);
    }
    return;
  }
  if (a.facing !== "front") return;
  switch (w.outfit) {
    case "suit":
      // A white collar and a tie, loosened hours ago.
      px(7, 0, w.under);
      px(10, 0, w.under);
      px(8, 0, w.tie);
      px(9, 0, shade(w.tie, -0.2));
      if (!nap) px(5, 1, shade(w.shirt, 0.15));
      break;
    case "cardigan":
      // Big buttons down one side, a shirt collar poking out.
      px(7, 0, w.under);
      px(10, 0, w.under);
      px(6, 2, shade(w.shirt, 0.35));
      if (!nap) px(6, 4, shade(w.shirt, 0.35));
      break;
    case "hoodie":
      // The hood bunched round the neck.
      ctx.fillStyle = shade(w.shirt, -0.2);
      ctx.fillRect(x + 5, top - 1, 2, 2);
      ctx.fillRect(x + 11, top - 1, 2, 2);
      px(6, 1, "#d8d2be");
      break;
    case "jumper":
      px(7, 0, w.under);
      px(10, 0, w.under);
      break;
    case "shirt":
      // Rolled-up sleeves.
      if (!nap) {
        px(4, 3, shade(w.shirt, 0.2));
        px(13, 3, shade(w.shirt, 0.2));
      }
      break;
  }
}

export const PEOPLE: Pick<Theme, "look" | "npc" | "dress"> = { look, npc, dress };
