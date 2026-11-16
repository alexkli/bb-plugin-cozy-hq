// Chibi office workers, built pixel by pixel. Every thread gets a stable look
// (skin, hair, outfit, accessory) from its id; the shirt follows its project.

import { Grid, hash, hsl, mix, parseColor, rng, shade, SpriteCache } from "./pixel.ts";
import type { Facing } from "./layout.ts";

export const OUTLINE = "#2a1e2e";

const SKINS = ["#ffdcc4", "#f6c7a4", "#e7b08a", "#c98a5e", "#9b6340", "#6e4630"];
const HAIRS = [
  "#2b1d16",
  "#4a2f22",
  "#6b4128",
  "#9a5f34",
  "#d7a24f",
  "#efd37f",
  "#b5432f",
  "#3a3a4c",
  "#8a5fd6",
  "#3f8ad8",
  "#e57aa8",
  "#f2f2f2",
];
const PANTS = ["#3d4a6b", "#4f5d7f", "#5b4a3c", "#3a3a44", "#6c7f5a", "#7a5f8f"];
const HAIR_STYLES = ["crop", "bob", "long", "spiky", "bun", "ponytail", "curly", "cap"] as const;
/** The styles threads get at random, plus a buzz cut and bald (only you pick those, in the settings). */
export type HairStyle = (typeof HAIR_STYLES)[number] | "buzz" | "bald";
type Accessory = "none" | "glasses" | "headphones" | "bow" | "beanie";
/** Only you have one (the settings): "woman" adds lashes; each figure suggests a top and pronouns. */
export type Figure = "woman" | "man" | "nonbinary";
/** Your top's cut ("tie": a shirt and tie, the classic boss; the tie itself is the emblem). */
export type Top = "tie" | "shirt" | "vneck" | "tee" | "polo" | "hoodie" | "turtleneck" | "sweater" | "blazer";
export type Pattern = "plain" | "stripes" | "check" | "dots";
export type Hat = "cap" | "beanie" | "sunhat" | "fedora" | "beret";
/** What else you wear, any number of them (glasses are drawn as the accessory). */
export type Wear = "glasses" | "freckles" | "beard" | "headphones" | "earrings" | "necklace" | "nosestud" | "scarf" | "lanyard" | "pin" | "bow" | "flower";

export interface Look {
  key: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  pants: string;
  accessory: Accessory;
  accent: string;
  /** You only, from the settings (sceneries keep these; see office/themes/README.md). */
  figure?: Figure;
  top?: Top;
  pattern?: Pattern;
  hat?: Hat;
  wear?: readonly Wear[];
  /** You picked the shirt's color yourself: a scenery's outfit extras stay off it. */
  ownShirt?: boolean;
}

/** You wear something at your neck: a scenery's lei or lanyard would hide it. */
export function wearsAtNeck(l: Look | undefined): boolean {
  return l?.wear?.some((w) => w === "necklace" || w === "scarf" || w === "lanyard") ?? false;
}

export function lookFor(threadId: string, projectHue: number): Look {
  const r = rng(hash(threadId) || 7);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
  const skin = pick(SKINS);
  // Mostly natural hair colors, sometimes fun ones.
  const hair = r() < 0.78 ? pick(HAIRS.slice(0, 8)) : pick(HAIRS.slice(8));
  const hairStyle = pick(HAIR_STYLES);
  const shirt = hsl((projectHue + (r() - 0.5) * 18 + 360) % 360, 58, 60);
  const pants = pick(PANTS);
  const roll = r();
  const accessory: Accessory =
    roll < 0.24 ? "glasses" : roll < 0.4 ? "headphones" : roll < 0.5 ? "bow" : roll < 0.56 ? "beanie" : "none";
  const accent = hsl(Math.floor(r() * 360), 70, 62);
  return {
    key: `${skin}${hair}${hairStyle}${shirt}${pants}${accessory}${accent}`,
    skin,
    hair,
    hairStyle,
    shirt,
    pants,
    accessory,
    accent,
  };
}

export type Expression = "open" | "blink" | "closed" | "happy" | "worried" | "surprised" | "focus";

export type CharPose =
  | "stand"
  | "walk0"
  | "walk1"
  | "walk2"
  | "walk3"
  | "type0"
  | "type1"
  | "raise"
  | "cheer"
  | "slump"
  | "sit-back"
  | "nap"
  | "paddle0"
  | "paddle1"
  | "cup"
  | "read"
  | "present"
  | "draw0"
  | "draw1"
  | "present-plan"
  | "putt0"
  | "putt1"
  /** At an arcade cabinet, seen from behind: hands on the stick and buttons, taking turns. */
  | "arcade0"
  | "arcade1"
  /** Standing with your head hung (you, after losing at the arcade). */
  | "mope";

export interface CharSpec {
  look: Look;
  facing: Facing;
  pose: CharPose;
  expr: Expression;
  /** A small topic badge on the shirt. */
  emblem?: string | null;
  /** Sitting on a chair facing out: knees and shoes show under the torso. */
  seated?: boolean;
  /** A shorter body under the same head (subagents helping out at a desk). */
  short?: boolean;
}

/** 5×5 shirt badges, one per topic. */
export const EMBLEMS: Record<string, string[]> = {
  game: [".....", "#####", "#.#.#", "#####", ".#.#."],
  auth: ["##...", "#.###", "##..#", ".....", "....."],
  security: ["#####", "#...#", "#...#", ".#.#.", "..#.."],
  bug: ["#...#", ".###.", "#####", ".###.", "#.#.#"],
  test: [".###.", "..#..", "..#..", ".#.#.", "#####"],
  review: [".##..", "#..#.", "#..#.", ".##..", "...##"],
  docs: ["####.", "#..##", "#.#.#", "#...#", "#####"],
  design: ["...##", "..##.", ".##..", "##...", "#...."],
  data: [".###.", "#...#", ".###.", "#...#", ".###."],
  deploy: ["..#..", ".###.", ".###.", "#####", "#.#.#"],
  speed: ["...#.", "..#..", ".###.", "..#..", ".#..."],
  map: [".###.", "#...#", "#...#", ".#.#.", "..#.."],
  chat: ["#####", "#...#", "#####", ".#...", "#...."],
  chart: ["....#", "...##", ".#.##", "##.##", "#####"],
  plugin: [".#.#.", "#####", "#####", ".###.", "..#.."],
  refactor: ["##..#", "#..##", ".###.", "##..#", "#..##"],
  music: ["..###", "..#.#", "..#..", "###..", "###.."],
  search: [".##..", "#..#.", "#..#.", ".##..", "...##"],
  ai: ["#.#.#", ".###.", "##.##", ".###.", "#.#.#"],
  api: ["#...#", "#####", ".###.", "..#..", "..#.."],
  tie: ["..#..", ".###.", "..#..", ".###.", ".###."],
  badge: [".###.", "#####", "##.##", "#####", ".###."],
  broom: ["....#", "...#.", "..#..", "####.", "####."],
  wrench: ["#.#..", "###..", ".##..", "..##.", "...##"],
  food: ["..#..", ".###.", "#####", ".....", "#####"],
  kid: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
};

/** Looks for the people who aren't threads: you, the guard, the cleaner. */
export function npcLook(kind: "boss" | "guard" | "janitor" | "technician" | "delivery"): Look {
  switch (kind) {
    case "boss":
      return { key: "npc-boss", skin: "#f1c7a4", hair: "#4a2f22", hairStyle: "crop", shirt: "#2f3a5a", pants: "#2a2a34", accessory: "glasses", accent: "#e5484d" };
    case "guard":
      return { key: "npc-guard", skin: "#c98a5e", hair: "#2b1d16", hairStyle: "cap", shirt: "#3a4a6b", pants: "#2a2f40", accessory: "none", accent: "#2a2f40" };
    case "janitor":
      return { key: "npc-janitor", skin: "#e7b08a", hair: "#6b4128", hairStyle: "cap", shirt: "#3e8e78", pants: "#2f6b5a", accessory: "none", accent: "#f2c14e" };
    case "delivery":
      // Cap and a bright courier jacket.
      return { key: "npc-delivery", skin: "#b9805a", hair: "#e5484d", hairStyle: "cap", shirt: "#e5484d", pants: "#2a2f40", accessory: "none", accent: "#ffcf4a" };
    case "technician":
      // Hard hat and overalls.
      return { key: "npc-technician", skin: "#d9a07a", hair: "#ffc83d", hairStyle: "cap", shirt: "#ff8a3d", pants: "#2f4f8f", accessory: "none", accent: "#ffc83d" };
  }
}

/**
 * A cartoon skeleton in the 20×28 character grid, arms up (the "cheer"
 * pose): drawn over a blue silhouette for the x-ray flash.
 */
export function skeletonSprite(): HTMLCanvasElement {
  return cache.get("skeleton", () => {
    const g = new Grid(CHAR_W, CHAR_H);
    const bone = "#f4f6ff";
    const dim = "#c9d2f0";
    const hole = "#101634";
    // Skull and jaw
    g.rect(7, 4, 6, 1, bone).rect(6, 5, 8, 5, bone).rect(7, 10, 6, 1, bone).rect(8, 11, 4, 1, dim);
    g.rect(7, 6, 2, 2, hole).rect(11, 6, 2, 2, hole).set(10, 8, hole);
    g.set(8, 10, hole).set(10, 10, hole).set(12, 10, hole);
    // Spine, ribs, pelvis
    g.rect(9, 12, 2, 9, dim);
    g.rect(6, 14, 8, 1, bone).rect(6, 16, 8, 1, bone).rect(7, 18, 6, 1, bone);
    g.rect(6, 20, 8, 1, bone).set(6, 21, bone).set(13, 21, bone);
    // Legs and feet
    g.rect(6, 22, 1, 4, bone).rect(12, 22, 1, 4, bone);
    g.rect(5, 26, 3, 1, bone).rect(11, 26, 3, 1, bone);
    // Arms up
    g.set(5, 14, bone).set(4, 14, bone).set(3, 13, bone).rect(2, 9, 1, 4, bone).rect(1, 8, 3, 1, dim);
    g.set(14, 14, bone).set(15, 14, bone).set(16, 13, bone).rect(17, 9, 1, 4, bone).rect(16, 8, 3, 1, dim);
    return g;
  });
}

/** Sprite canvas size; feet baseline sits at row ANCHOR_Y. */
export const CHAR_W = 20;
export const CHAR_H = 28;
export const ANCHOR_X = 10;
export const ANCHOR_Y = 27;

const cache = new SpriteCache();

export function charSprite(spec: CharSpec): HTMLCanvasElement {
  const key = `${spec.look.key}|${spec.facing}|${spec.pose}|${spec.expr}|${spec.emblem ?? ""}|${spec.seated ? 1 : 0}${spec.short ? "|s" : ""}`;
  return cache.get(key, () => buildChar(spec));
}

// Layout inside the 20×28 grid (x offset 1 from the 18-wide design).
const OX = 1;
const OY = 2;

function buildChar({ look, facing, pose, expr, emblem, seated: onChair, short }: CharSpec): Grid {
  const g = new Grid(CHAR_W, CHAR_H);
  const back = facing === "back";
  const side = facing === "left" || facing === "right";
  const skin = look.skin;
  const skinShade = shade(skin, -0.18);
  const hair = look.hair;
  const hairHi = shade(hair, 0.28);
  const hairLo = shade(hair, -0.22);
  const shirt = look.shirt;
  const shirtLo = shade(shirt, -0.2);
  const pants = look.pants;
  const shoe = "#3b2b2b";

  const seated = onChair === true || pose === "type0" || pose === "type1" || pose === "slump" || pose === "sit-back" || pose === "nap" || pose === "read";
  const bob = pose === "walk1" || pose === "walk3" ? -1 : 0;
  const slump = pose === "slump" ? 2 : 0;
  const napDrop = pose === "nap" || pose === "mope" ? 1 : 0;
  // Short: two rows less torso and two less leg, so everything above sits 4 rows lower.
  const drop = short ? 4 : 0;
  const torsoH = short ? 5 : 7;
  const legH = short ? 1 : 3;
  const y0 = OY + drop + bob + slump + napDrop; // head top row
  const x0 = OX;

  // Long hair falls behind the body.
  if (look.hairStyle === "long" && !back) {
    g.rect(x0 + 2, y0 + 5, 3, 11, hairLo);
    g.rect(x0 + 13, y0 + 5, 3, 11, hairLo);
  }
  if (look.hairStyle === "ponytail" && !back) {
    g.rect(x0 + 15, y0 + 3, 2, 7, hair);
    g.set(x0 + 16, y0 + 10, hair);
  }

  // ---- legs & body
  const bodyTop = OY + 12 + drop + bob;
  if (!seated) {
    const legY = bodyTop + torsoH;
    let lUp = 0;
    let rUp = 0;
    if (pose === "walk1") lUp = 1;
    if (pose === "walk3") rUp = 1;
    g.rect(x0 + 4, legY, 8, 2, pants);
    if (side) {
      // Legs scissor in profile.
      const a = pose === "walk1" ? -1 : pose === "walk3" ? 1 : 0;
      g.rect(x0 + 6 + a, legY + 2, 3, legH, pants);
      g.rect(x0 + 6 + a, legY + 2 + legH, 4, 1, shoe);
      g.rect(x0 + 9 - a, legY + 2, 3, legH, shade(pants, -0.15));
      g.rect(x0 + 9 - a, legY + 2 + legH, 4, 1, shoe);
    } else {
      g.rect(x0 + 4, legY + 2, 3, legH - lUp, pants);
      g.rect(x0 + 4, legY + 2 + legH - lUp, 3, 1, shoe);
      g.rect(x0 + 9, legY + 2, 3, legH - rUp, pants);
      g.rect(x0 + 9, legY + 2 + legH - rUp, 3, 1, shoe);
    }
  } else if (pose === "nap" || pose === "read" || (onChair && !back)) {
    // Sitting cross-legged on a beanbag / armchair, facing out.
    g.rect(x0 + 3, bodyTop + 6, 10, 3, pants);
    g.rect(x0 + 2, bodyTop + 8, 3, 1, shoe);
    g.rect(x0 + 11, bodyTop + 8, 3, 1, shoe);
  }

  // Torso
  const tw = 8;
  const tx = x0 + 4;
  g.rect(tx, bodyTop, tw, torsoH, shirt);
  g.rect(tx, bodyTop + torsoH - 1, tw, 1, shirtLo);
  if (look.pattern && look.pattern !== "plain") drawPattern(g, look.pattern, tx, bodyTop, tw, torsoH - 1, shirt);
  if (look.top && look.top !== "tie") drawTop(g, look.top, tx, bodyTop, torsoH, back, shirt, skin);
  else if (!back) {
    // Collar / neckline
    g.set(tx + 3, bodyTop, skinShade).set(tx + 4, bodyTop, skinShade);
    g.set(tx + 3, bodyTop + 1, shade(shirt, 0.25));
  }
  // Topic badge: light on dark shirts, dark on light ones.
  const glyph = emblem ? EMBLEMS[emblem] : undefined;
  if (glyph) {
    const [r, gg, b] = [1, 3, 5].map((i) => parseInt(shirt.slice(i, i + 2), 16));
    const light = r! * 0.3 + gg! * 0.59 + b! * 0.11 > 150;
    const ink = light ? shade(shirt, -0.55) : "#fff8e6";
    glyph.forEach((row, yy) => {
      for (let xx = 0; xx < 5; xx++) if (row[xx] === "#") g.set(tx + 2 + xx - (back ? 1 : 0) + 0, bodyTop + 1 + yy, ink);
    });
  }

  if (look.wear) drawNeckWear(g, look, tx, bodyTop, back);

  // ---- arms
  const armL = tx - 1;
  const armR = tx + tw;
  const sleeve = shirtLo;
  const drawArmDown = (ax: number) => {
    g.rect(ax, bodyTop + 1, 1, 3, sleeve);
    g.rect(ax, bodyTop + 4, 1, 2, skin);
  };
  const drawArmUp = (ax: number, dir: -1 | 1) => {
    g.rect(ax, bodyTop, 1, 2, sleeve);
    g.set(ax + dir, bodyTop - 1, sleeve);
    g.rect(ax + 2 * dir, bodyTop - 5, 1, 4, skin);
  };
  switch (pose) {
    case "type0":
    case "type1": {
      const lift = pose === "type0" ? 0 : 1;
      if (back) {
        // Seen from behind: elbows out, hands on the keyboard in front.
        g.rect(armL, bodyTop + 1, 1, 3, sleeve).set(armL, bodyTop + 4 - lift, sleeve);
        g.rect(armR, bodyTop + 1, 1, 3, sleeve).set(armR, bodyTop + 3 + lift, sleeve);
        break;
      }
      g.rect(armL, bodyTop + 1, 1, 3, sleeve);
      g.rect(armR, bodyTop + 1, 1, 3, sleeve);
      g.rect(armL + 1, bodyTop + 4 - lift, 2, 1, skin);
      g.rect(armR - 2, bodyTop + 3 + lift, 2, 1, skin);
      break;
    }
    case "raise":
      drawArmDown(armL);
      drawArmUp(armR, 1);
      break;
    case "cheer":
      drawArmUp(armL, -1);
      drawArmUp(armR, 1);
      break;
    case "present-plan": {
      // Holding up a blueprint: the plan they want you to approve.
      g.rect(armL, bodyTop + 1, 1, 2, sleeve);
      g.rect(armR, bodyTop + 1, 1, 2, sleeve);
      g.rect(tx - 1, bodyTop + 1, tw + 2, 6, "#3e7cc4");
      g.rect(tx, bodyTop + 2, 4, 1, "#cfe6ff").rect(tx, bodyTop + 4, 6, 1, "#cfe6ff").rect(tx + 5, bodyTop + 2, 2, 2, "#cfe6ff");
      g.set(armL, bodyTop + 3, skin).set(armR, bodyTop + 3, skin);
      break;
    }
    case "present": {
      // Holding up a finished page with a green check.
      g.rect(armL, bodyTop + 1, 1, 2, sleeve);
      g.rect(armR, bodyTop + 1, 1, 2, sleeve);
      g.rect(tx - 1, bodyTop + 1, tw + 2, 6, "#fbfaf5");
      g.rect(tx, bodyTop + 2, 3, 1, "#c9c3b8").rect(tx, bodyTop + 4, 2, 1, "#c9c3b8");
      g.set(tx + 4, bodyTop + 4, "#30a46c").set(tx + 5, bodyTop + 5, "#30a46c").set(tx + 6, bodyTop + 4, "#30a46c").set(tx + 7, bodyTop + 3, "#30a46c");
      g.set(armL, bodyTop + 3, skin).set(armR, bodyTop + 3, skin);
      break;
    }
    case "draw0":
    case "draw1": {
      // At the whiteboard: marker hand up, moving a little.
      const reach = pose === "draw1" ? 1 : 0;
      drawArmDown(armL);
      g.rect(armR, bodyTop, 1, 2, sleeve);
      g.set(armR + 1, bodyTop - 1, sleeve);
      g.rect(armR + 1 + reach, bodyTop - 5 + reach, 1, 4, skin);
      g.set(armR + 1 + reach, bodyTop - 6 + reach, "#3e8ed0");
      break;
    }
    case "putt0":
    case "putt1": {
      // Putting, side on: hands together low in front, the putter down to the ball
      // (putt1 is the follow-through).
      const through = pose === "putt1";
      g.rect(armR, bodyTop + 1, 1, 3, sleeve).set(armR + 1, bodyTop + 4, skin);
      g.rect(armL + 1, bodyTop + 1, 1, 2, shirtLo);
      const shaft = "#9aa3ad";
      if (through) {
        g.line(armR + 2, bodyTop + 4, armR + 5, bodyTop + 9, shaft);
        g.rect(armR + 5, bodyTop + 10, 2, 1, "#3b3b4a");
      } else {
        g.line(armR + 1, bodyTop + 5, armR + 3, bodyTop + 11, shaft);
        g.rect(armR + 2, bodyTop + 12, 3, 1, "#3b3b4a");
      }
      break;
    }
    case "slump":
      g.rect(armL - 1, bodyTop + 3, 3, 1, sleeve);
      g.rect(armR - 1, bodyTop + 3, 3, 1, sleeve);
      break;
    case "arcade0":
    case "arcade1": {
      // Elbows out to the controls, one hand on the stick and one on the buttons, in turn.
      const k = pose === "arcade1" ? 1 : 0;
      g.rect(armL, bodyTop + 1, 1, 2, sleeve).set(armL - 1, bodyTop + 2 + k, sleeve).set(armL, bodyTop + 3 + k, skin);
      g.rect(armR, bodyTop + 1, 1, 2, sleeve).set(armR + 1, bodyTop + 3 - k, sleeve).set(armR, bodyTop + 4 - k, skin);
      break;
    }
    case "cup": {
      drawArmDown(back ? armR : armL);
      const cx = back ? armL : armR;
      g.rect(cx, bodyTop + 1, 1, 2, sleeve);
      g.rect(cx - 1, bodyTop + 3, 2, 1, skin);
      // Mug
      g.rect(cx - 2, bodyTop + 1, 3, 3, "#f4efe6");
      g.set(cx - 2, bodyTop + 1, "#c9b9a0");
      break;
    }
    case "read": {
      g.rect(armL, bodyTop + 1, 1, 3, sleeve);
      g.rect(armR, bodyTop + 1, 1, 3, sleeve);
      // Book held up in front of the chest.
      g.rect(tx - 1, bodyTop + 2, tw + 2, 5, look.accent);
      g.vline(tx + 4, bodyTop + 2, 5, shade(look.accent, -0.3));
      g.rect(tx, bodyTop + 3, 3, 1, shade(look.accent, 0.35));
      g.set(armL, bodyTop + 4, skin).set(armR, bodyTop + 4, skin);
      break;
    }
    case "paddle0":
    case "paddle1": {
      const swing = pose === "paddle1" ? 1 : 0;
      drawArmDown(armL);
      g.rect(armR, bodyTop + 1, 1, 2, sleeve);
      g.rect(armR + 1, bodyTop + 2 - swing, 1, 2, skin);
      // Paddle: red disk on a little handle.
      g.rect(armR + 2, bodyTop - 1 - swing, 3, 3, "#d6453d");
      g.set(armR + 1, bodyTop + 1 - swing, "#8a5a34");
      break;
    }
    case "nap":
      g.rect(armL, bodyTop + 2, 1, 3, sleeve);
      g.rect(armR, bodyTop + 2, 1, 3, sleeve);
      g.rect(tx + 1, bodyTop + 5, tw - 2, 1, skin);
      break;
    case "sit-back":
      g.rect(armL, bodyTop + 1, 1, 4, sleeve);
      g.rect(armR, bodyTop + 1, 1, 4, sleeve);
      break;
    default: {
      // stand / walk
      const swing = pose === "walk1" ? 1 : pose === "walk3" ? -1 : 0;
      g.rect(armL, bodyTop + 1 + Math.max(0, swing), 1, 3, sleeve);
      g.rect(armL, bodyTop + 4 + Math.max(0, swing), 1, 1, skin);
      g.rect(armR, bodyTop + 1 + Math.max(0, -swing), 1, 3, sleeve);
      g.rect(armR, bodyTop + 4 + Math.max(0, -swing), 1, 1, skin);
    }
  }

  // ---- head
  const hx = x0 + 2;
  const hy = y0 + 1;
  g.rrect(hx, hy, 12, 10, skin, 2);
  // Ears
  if (!back) {
    g.set(hx - 1, hy + 5, skin).set(hx + 12, hy + 5, skin);
  }

  drawHair(g, look, hx, hy, back, side);
  if (look.hat) drawHat(g, look.hat, look.accent, hx, hy);
  drawAccessory(g, look, hx, hy, back);
  if (look.wear) drawHeadWear(g, look, hx, hy, back);
  if (!back) drawFace(g, look, hx, hy, expr, side, pose);

  g.outline(OUTLINE);
  return facing === "left" ? g.flipped() : g;

  function drawHair(gr: Grid, l: Look, x: number, y: number, isBack: boolean, isSide: boolean): void {
    void isSide;
    const style = l.hairStyle;
    // A buzz cut: hair so short the scalp shows through.
    const buzz = mix(hair, skin, 0.3);
    if (isBack) {
      if (style === "bald") {
        gr.rect(x + 3, y + 1, 3, 1, shade(skin, 0.3));
        return;
      }
      if (style === "buzz") {
        gr.rrect(x, y, 12, 8, buzz, 2);
        return;
      }
      // Back of the head is all hair (cap keeps its color).
      gr.rrect(x, y, 12, 10, style === "cap" ? l.accent : hair, 2);
      if (style === "cap") gr.rect(x, y + 4, 12, 6, hair);
      gr.rect(x + 3, y + 1, 4, 1, hairHi);
      if (style === "long" || style === "bob") gr.rect(x - 1, y + 4, 14, style === "long" ? 9 : 5, hair);
      if (style === "ponytail") gr.rect(x + 5, y + 9, 2, 5, hair);
      if (style === "bun") gr.ellipse(x + 5.5, y - 1, 2.2, 1.8, hair);
      if (style === "spiky") for (const sx of [1, 4, 7, 10]) gr.set(x + sx, y - 1, hair);
      if (style === "curly") gr.ellipse(x + 5.5, y + 4, 7, 6, hair);
      return;
    }
    switch (style) {
      case "bald":
        // A shine on top.
        gr.rect(x + 3, y + 1, 3, 1, shade(skin, 0.3)).set(x + 2, y + 2, shade(skin, 0.3));
        break;
      case "buzz":
        gr.rrect(x, y, 12, 3, buzz, 2);
        gr.rect(x, y + 2, 1, 3, buzz).rect(x + 11, y + 2, 1, 3, buzz);
        gr.rect(x + 3, y + 1, 3, 1, shade(buzz, 0.2));
        break;
      case "crop":
        gr.rrect(x, y, 12, 4, hair, 2);
        gr.rect(x, y + 3, 2, 3, hair).rect(x + 10, y + 3, 2, 3, hair);
        gr.rect(x + 3, y + 3, 5, 1, hair);
        gr.rect(x + 3, y + 1, 3, 1, hairHi);
        break;
      case "bob":
        gr.rrect(x - 1, y - 1, 14, 5, hair, 2);
        gr.rect(x - 1, y + 3, 3, 6, hair).rect(x + 10, y + 3, 3, 6, hair);
        gr.rect(x + 2, y + 3, 8, 1, hair);
        gr.set(x + 4, y + 4, hair).set(x + 7, y + 4, hair);
        gr.rect(x + 3, y, 3, 1, hairHi);
        break;
      case "long":
        gr.rrect(x - 1, y - 1, 14, 5, hair, 2);
        gr.rect(x - 1, y + 3, 2, 8, hair).rect(x + 11, y + 3, 2, 8, hair);
        gr.rect(x + 1, y + 3, 4, 1, hair);
        gr.rect(x + 3, y, 3, 1, hairHi);
        break;
      case "spiky":
        gr.rrect(x, y, 12, 4, hair, 1);
        for (const sx of [0, 3, 6, 9]) {
          gr.set(x + sx + 1, y - 1, hair).set(x + sx + 1, y - 2, hair).set(x + sx + 2, y - 1, hair);
        }
        gr.rect(x, y + 3, 2, 2, hair).rect(x + 10, y + 3, 2, 2, hair);
        gr.set(x + 4, y + 4, hair).set(x + 7, y + 4, hair);
        gr.rect(x + 3, y + 1, 3, 1, hairHi);
        break;
      case "bun":
        gr.ellipse(x + 5.5, y - 2, 2.4, 2, hair);
        gr.set(x + 5, y - 3, hairHi);
        gr.rrect(x, y, 12, 4, hair, 2);
        gr.rect(x, y + 3, 1, 4, hair).rect(x + 11, y + 3, 1, 4, hair);
        gr.rect(x + 2, y + 1, 3, 1, hairHi);
        break;
      case "ponytail":
        gr.rrect(x, y, 12, 4, hair, 2);
        gr.rect(x, y + 3, 1, 3, hair).rect(x + 11, y + 3, 1, 3, hair);
        gr.rect(x + 1, y + 3, 6, 1, hair);
        gr.set(x + 12, y + 2, look.accent).set(x + 12, y + 3, look.accent);
        gr.rect(x + 3, y + 1, 3, 1, hairHi);
        break;
      case "curly":
        gr.ellipse(x + 5.5, y + 2, 7.4, 4.2, hair);
        // Keep the face clear under the curls (dark eyes vanish on dark hair).
        gr.rect(x + 1, y + 5, 10, 2, skin);
        gr.rect(x - 2, y + 4, 3, 4, hair).rect(x + 11, y + 4, 3, 4, hair);
        gr.set(x + 2, y + 4, hair).set(x + 5, y + 4, hair).set(x + 8, y + 4, hair);
        gr.set(x + 1, y, hairHi).set(x + 4, y - 1, hairHi).set(x + 8, y, hairHi);
        gr.set(x, y + 5, hairLo).set(x + 11, y + 5, hairLo);
        break;
      case "cap":
        gr.rrect(x, y - 1, 12, 5, look.accent, 2);
        gr.rect(x - 1, y + 3, 14, 1, shade(look.accent, -0.25));
        gr.set(x + 5, y, shade(look.accent, 0.35));
        gr.rect(x, y + 4, 1, 2, hair).rect(x + 11, y + 4, 1, 2, hair);
        break;
    }
  }

  function drawAccessory(gr: Grid, l: Look, x: number, y: number, isBack: boolean): void {
    switch (l.accessory) {
      case "headphones":
        gr.rect(x + 1, y - 2, 10, 1, "#3b3b4a");
        gr.set(x, y - 1, "#3b3b4a").set(x + 11, y - 1, "#3b3b4a");
        gr.rect(x - 2, y + 3, 2, 4, l.accent).rect(x + 12, y + 3, 2, 4, l.accent);
        break;
      case "bow":
        if (!isBack) {
          gr.rect(x + 8, y - 2, 2, 2, "#ef6f8f").rect(x + 11, y - 2, 2, 2, "#ef6f8f");
          gr.set(x + 10, y - 1, "#d24c71");
        }
        break;
      case "beanie":
        if (l.hairStyle !== "cap") {
          gr.rrect(x, y - 2, 12, 5, l.accent, 2);
          gr.rect(x - 1, y + 2, 14, 1, shade(l.accent, -0.2));
          gr.set(x + 5, y - 3, "#ffffff").set(x + 6, y - 3, "#ffffff");
        }
        break;
      default:
        break;
    }
  }

  function drawFace(
    gr: Grid,
    l: Look,
    x: number,
    y: number,
    e: Expression,
    isSide: boolean,
    p: CharPose,
  ): void {
    const eye = "#2a1e2e";
    const shift = isSide ? 1 : 0;
    const lx = x + 3 + shift;
    const rx = x + 8 + shift;
    const ey = y + 5;
    const closedEyes = e === "closed" || e === "blink" || p === "nap";
    if (closedEyes) {
      gr.rect(lx - 1, ey + 1, 2, 1, eye).rect(rx, ey + 1, 2, 1, eye);
    } else if (e === "happy") {
      gr.set(lx - 1, ey + 1, eye).set(lx, ey, eye).set(lx + 1, ey + 1, eye);
      gr.set(rx - 1, ey + 1, eye).set(rx, ey, eye).set(rx + 1, ey + 1, eye);
    } else if (e === "surprised") {
      gr.rect(lx - 1, ey, 2, 2, eye).rect(rx, ey, 2, 2, eye);
      gr.set(lx - 1, ey, "#ffffff").set(rx, ey, "#ffffff");
    } else {
      gr.rect(lx, ey, 1, 2, eye).rect(rx, ey, 1, 2, eye);
      if (e === "focus") gr.set(lx, ey, "#4a3a55").set(rx, ey, "#4a3a55");
      // Lashes flick out at the outer corners.
      if (l.figure === "woman") gr.set(lx - 1, ey, eye).set(rx + 1, ey, eye);
    }
    if (e === "worried") {
      gr.set(lx - 1, ey - 2, eye).set(lx, ey - 1, eye);
      gr.set(rx + 1, ey - 2, eye).set(rx, ey - 1, eye);
    }
    // Glasses sit over the eyes.
    if (l.accessory === "glasses") {
      const f = "#3b3048";
      gr.rect(lx - 2, ey - 1, 4, 1, f).rect(lx - 2, ey + 2, 4, 1, f);
      gr.vline(lx - 2, ey - 1, 4, f).vline(lx + 1, ey - 1, 4, f);
      gr.rect(rx - 1, ey - 1, 4, 1, f).rect(rx - 1, ey + 2, 4, 1, f);
      gr.vline(rx - 1, ey - 1, 4, f).vline(rx + 2, ey - 1, 4, f);
      gr.rect(lx + 2, ey, rx - lx - 3, 1, f);
    }
    // Blush
    gr.set(lx - 1, ey + 3, "#f29a9a").set(rx + 1, ey + 3, "#f29a9a");
    const wear = l.wear ?? [];
    if (wear.includes("freckles")) {
      const dot = shade(l.skin, -0.3);
      gr.set(lx - 1, ey + 2, dot).set(lx + 1, ey + 3, dot).set(rx - 1, ey + 3, dot).set(rx + 1, ey + 2, dot);
    }
    if (wear.includes("beard")) {
      // Along the jaw and up to the ears, with room for the mouth.
      const h = l.hairStyle === "bald" ? shade(l.hair, -0.1) : l.hair;
      gr.rect(x + 1, ey + 3, 10, 1, h).rect(x + 2, ey + 4, 8, 1, h).rect(x, ey, 1, 3, h).rect(x + 11, ey, 1, 3, h);
      gr.rect(x + 4 + shift, ey + 2, 4, 1, h);
      gr.rect(x + 5 + shift, ey + 3, 2, 1, shade(l.skin, -0.25));
    }
    if (wear.includes("nosestud")) gr.set(x + 6 + shift, ey + 2, "#ffe27a");
    // Mouth
    const mx = x + 5 + shift;
    if (e === "happy" || p === "cheer") {
      gr.set(mx, ey + 3, "#b4485a").set(mx + 1, ey + 3, "#b4485a");
    } else if (e === "surprised") {
      gr.set(mx, ey + 3, "#7a2f3d").set(mx + 1, ey + 3, "#7a2f3d");
    } else if (e === "worried") {
      gr.set(mx, ey + 4, "#7a2f3d").set(mx + 1, ey + 4, "#7a2f3d");
    } else if (p === "nap") {
      gr.set(mx + 1, ey + 3, "#c97b84");
    }
  }
}

// ------------------------------------------------------------------ your outfit (the settings)

/** A print on the shirt: stripes, a check or dots, lighter on dark shirts and darker on light ones. */
function drawPattern(g: Grid, p: Pattern, x: number, y: number, w: number, h: number, shirt: string): void {
  const [r, gg, b] = parseColor(shirt);
  const pale = r * 0.3 + gg * 0.59 + b * 0.11 > 170;
  const light = pale ? shade(shirt, -0.16) : shade(shirt, 0.3);
  const dark = shade(shirt, pale ? -0.12 : -0.22);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (p === "stripes" && j % 2 === 1) g.set(x + i, y + j, light);
      else if (p === "check" && (i >> 1) % 2 !== (j >> 1) % 2) g.set(x + i, y + j, dark);
      else if (p === "dots" && j % 2 === 1 && (i + j) % 4 === 1) g.set(x + i, y + j, light);
    }
  }
}

/** The cut of your top, mostly the neckline (the shirt color is already on). */
function drawTop(g: Grid, top: Top, tx: number, by: number, h: number, back: boolean, shirt: string, skin: string): void {
  const hi = shade(shirt, 0.3);
  const lo = shade(shirt, -0.25);
  const neck = shade(skin, -0.18);
  const white = "#f4f1ea";
  if (back) {
    if (top === "hoodie") g.rect(tx + 1, by, 6, 2, lo);
    else if (top === "turtleneck") g.rect(tx + 2, by, 4, 1, hi);
    else if (top === "polo" || top === "shirt") g.rect(tx + 2, by, 4, 1, top === "shirt" ? white : hi);
    return;
  }
  switch (top) {
    case "tie":
      break;
    case "shirt":
      // Open-necked: white collar tips either side of the neck.
      g.set(tx + 2, by, white).set(tx + 5, by, white);
      g.rect(tx + 3, by, 2, 1, neck).rect(tx + 3, by + 1, 2, 1, skin);
      break;
    case "vneck":
      g.rect(tx + 2, by, 4, 1, skin).set(tx + 3, by + 1, neck).set(tx + 4, by + 1, neck);
      break;
    case "tee":
      g.rect(tx + 2, by, 4, 1, lo).rect(tx + 3, by, 2, 1, neck);
      break;
    case "polo":
      // Shirt-colored collar flaps and a buttoned placket.
      g.set(tx + 2, by, hi).set(tx + 5, by, hi).rect(tx + 3, by, 2, 1, neck);
      g.set(tx + 3, by + 1, lo).set(tx + 3, by + 2, white).set(tx + 3, by + 3, lo);
      break;
    case "hoodie":
      // The hood bunched round the neck, drawstrings and the front pocket.
      g.rect(tx + 1, by, 6, 1, lo).rect(tx + 3, by, 2, 1, neck);
      g.set(tx + 2, by + 1, white).set(tx + 5, by + 1, white).set(tx + 2, by + 2, white).set(tx + 5, by + 2, white);
      g.rect(tx + 2, by + h - 3, 4, 1, lo).set(tx + 2, by + h - 2, lo).set(tx + 5, by + h - 2, lo);
      break;
    case "turtleneck":
      g.rect(tx + 2, by, 4, 1, hi).rect(tx + 2, by + 1, 4, 1, shade(shirt, 0.12));
      break;
    case "sweater":
      // A ribbed crew neck and hem.
      g.rect(tx + 2, by, 4, 1, hi).rect(tx + 3, by, 2, 1, neck);
      for (let i = 0; i < 8; i += 2) g.set(tx + i, by + h - 1, hi);
      break;
    case "blazer":
      // Open lapels over a white tee.
      g.rect(tx + 3, by, 2, h - 2, white).set(tx + 3, by, neck).set(tx + 4, by, neck);
      g.rect(tx + 2, by, 1, 3, hi).rect(tx + 5, by, 1, 3, hi).set(tx + 2, by + h - 3, lo);
      break;
  }
}

/** What you wear at the neck and on the chest. */
function drawNeckWear(g: Grid, l: Look, tx: number, by: number, back: boolean): void {
  const wear = l.wear!;
  const gold = "#f2c14e";
  if (wear.includes("scarf")) {
    g.rect(tx + 1, by, 6, 2, l.accent).rect(tx + 1, by + 1, 6, 1, shade(l.accent, -0.2));
    if (!back) g.rect(tx + 5, by + 2, 1, 3, l.accent).set(tx + 5, by + 4, shade(l.accent, -0.2));
  }
  if (back) return;
  if (wear.includes("necklace")) g.set(tx + 2, by, gold).set(tx + 5, by, gold).set(tx + 3, by + 1, gold).set(tx + 4, by + 2, gold);
  if (wear.includes("lanyard")) {
    g.rect(tx + 2, by, 1, 2, l.accent).rect(tx + 5, by, 1, 2, l.accent).rect(tx + 3, by + 2, 2, 1, l.accent);
    g.rect(tx + 3, by + 3, 2, 2, "#ffffff").set(tx + 4, by + 4, "#9ec5ea");
  }
  if (wear.includes("pin")) g.rect(tx + 6, by + 2, 1, 2, l.accent).set(tx + 6, by + 2, shade(l.accent, 0.45));
}

/** A hat over the hair (whatever stood up above the brim is tucked under it). */
function drawHat(g: Grid, hat: Hat, color: string, x: number, y: number): void {
  for (let j = y - 6; j < y; j++) for (let i = x - 3; i < x + 15; i++) g.set(i, j, null);
  const lo = shade(color, -0.25);
  switch (hat) {
    case "cap":
      g.rrect(x, y - 1, 12, 5, color, 2).rect(x - 1, y + 3, 14, 1, lo).set(x + 5, y, shade(color, 0.35));
      break;
    case "beanie":
      g.rrect(x, y - 2, 12, 5, color, 2).rect(x - 1, y + 2, 14, 1, lo);
      for (let i = 1; i < 12; i += 2) g.set(x + i, y, lo);
      g.rect(x + 5, y - 3, 2, 1, "#ffffff");
      break;
    case "sunhat": {
      const straw = "#e8c77d";
      g.rrect(x + 1, y - 3, 10, 5, straw, 2).rect(x + 1, y, 10, 1, color);
      g.rect(x - 3, y + 1, 18, 1, straw).rect(x - 2, y + 2, 16, 1, shade(straw, -0.2));
      break;
    }
    case "fedora": {
      const felt = "#4a3f3a";
      g.rrect(x + 1, y - 3, 10, 4, felt, 1).set(x + 5, y - 3, null).set(x + 6, y - 3, null);
      g.rect(x + 1, y, 10, 1, color).rect(x - 2, y + 1, 16, 1, shade(felt, -0.2));
      break;
    }
    case "beret":
      g.ellipse(x + 5, y, 7, 2.2, color).rect(x - 1, y + 1, 13, 1, lo).set(x + 6, y - 3, color);
      break;
  }
}

/** Headphones, earrings, a bow or a flower in the hair. */
function drawHeadWear(g: Grid, l: Look, x: number, y: number, back: boolean): void {
  const wear = l.wear!;
  if (wear.includes("headphones")) {
    g.rect(x + 1, y - 2, 10, 1, "#3b3b4a").set(x, y - 1, "#3b3b4a").set(x + 11, y - 1, "#3b3b4a");
    g.rect(x - 2, y + 3, 2, 4, l.accent).rect(x + 12, y + 3, 2, 4, l.accent);
  }
  if (back) return;
  if (wear.includes("earrings")) g.set(x - 1, y + 6, "#f2c14e").set(x + 12, y + 6, "#f2c14e");
  if (wear.includes("bow")) g.rect(x + 8, y - 2, 2, 2, l.accent).rect(x + 11, y - 2, 2, 2, l.accent).set(x + 10, y - 1, shade(l.accent, -0.2));
  if (wear.includes("flower")) {
    g.set(x - 1, y + 1, "#ffd1e0").set(x - 2, y + 2, "#ffd1e0").set(x, y + 2, "#ffd1e0").set(x - 1, y + 3, "#ffd1e0");
    g.set(x - 1, y + 2, "#ffd84a");
  }
}

/** A small cat, the office pet. */
export type CatPose = "sit" | "walk0" | "walk1" | "loaf" | "groom" | "ride";

const catCache = new SpriteCache();
export const CAT_W = 16;
export const CAT_H = 13;

export function catSprite(pose: CatPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return catCache.get(`${pose}|${facing}|${blink}`, () => {
    const g = new Grid(CAT_W, CAT_H);
    const fur = "#f0a35a";
    const furLo = "#d27f3c";
    const stripe = "#c46a2c";
    const belly = "#fbe2c2";
    const eye = OUTLINE;
    if (pose === "loaf") {
      g.rrect(2, 6, 11, 5, fur, 2);
      g.rect(4, 10, 7, 1, furLo);
      g.rrect(9, 3, 6, 5, fur, 1);
      g.set(9, 2, fur).set(14, 2, fur).set(10, 2, "#f6b8b8");
      g.rect(10, 5, 1, 1, eye).rect(13, 5, 1, 1, eye);
      g.set(5, 7, stripe).set(7, 7, stripe);
      g.rect(1, 9, 2, 1, fur);
    } else if (pose === "sit" || pose === "groom") {
      g.rrect(4, 6, 7, 6, fur, 2);
      g.rect(5, 8, 3, 4, belly);
      g.rrect(5, 1, 7, 6, fur, 1);
      g.set(5, 0, fur).set(11, 0, fur).set(6, 1, "#f6b8b8").set(10, 1, "#f6b8b8");
      if (blink || pose === "groom") {
        g.rect(6, 3, 2, 1, eye).rect(9, 3, 2, 1, eye);
      } else {
        g.rect(7, 3, 1, 2, eye).rect(10, 3, 1, 2, eye);
      }
      g.set(8, 5, "#e07f8a").set(9, 5, "#e07f8a");
      g.set(6, 2, stripe).set(10, 2, stripe);
      g.rect(11, 10, 3, 1, fur).set(13, 9, fur).set(13, 8, furLo);
      if (pose === "groom") g.rect(6, 6, 2, 2, belly);
    } else {
      // walking / riding profile
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 10, 5, fur, 2);
      g.rect(3, 9, 8, 1, furLo);
      g.set(4, 5, stripe).set(6, 5, stripe).set(8, 5, stripe);
      g.rrect(9, 1, 6, 5, fur, 1);
      g.set(9, 0, fur).set(14, 0, fur).set(13, 1, "#f6b8b8");
      if (blink) g.rect(12, 3, 2, 1, eye);
      else g.rect(13, 2, 1, 2, eye);
      g.set(14, 4, "#e07f8a");
      if (pose !== "ride") {
        g.rect(3 + step, 10, 1, 2, furLo).rect(6 - step, 10, 1, 2, fur);
        g.rect(8 + step, 10, 1, 2, furLo).rect(10 - step, 10, 1, 2, fur);
      }
      g.rect(0, 3, 2, 1, fur).set(1, 4, fur).set(0, 2, furLo);
    }
    g.outline(OUTLINE);
    return facing === "left" ? g.flipped() : g;
  });
}


/** The office dog: a little corgi. */
export type DogPose = "sit" | "walk0" | "walk1" | "loaf" | "wag0" | "wag1";
const dogCache = new SpriteCache();

export function dogSprite(pose: DogPose, facing: "left" | "right", blink: boolean): HTMLCanvasElement {
  return dogCache.get(`${pose}|${facing}|${blink}`, () => {
    const g = new Grid(20, 15);
    const fur = "#e39a4f";
    const furLo = "#c47a35";
    const white = "#fbf3e6";
    const eye = OUTLINE;
    if (pose === "loaf") {
      g.rrect(2, 8, 14, 5, fur, 2);
      g.rect(4, 11, 10, 2, white);
      g.rrect(11, 4, 7, 6, fur, 1);
      g.rect(13, 7, 4, 3, white);
      g.set(12, 3, furLo).set(17, 3, furLo).set(12, 2, fur).set(17, 2, fur);
      g.rect(14, 6, 1, 1, eye).set(16, 8, eye);
      g.set(1, 10, fur);
    } else if (pose === "sit" || pose === "wag0" || pose === "wag1") {
      g.rrect(5, 6, 8, 7, fur, 2);
      g.rect(7, 8, 4, 5, white);
      g.rrect(5, 0, 9, 7, fur, 1);
      g.rect(7, 3, 5, 4, white);
      g.set(5, 0, furLo).set(13, 0, furLo).set(4, 0, fur).set(14, 0, fur);
      if (blink) g.rect(7, 3, 2, 1, eye).rect(10, 3, 2, 1, eye);
      else g.set(8, 3, eye).set(11, 3, eye);
      g.set(9, 5, eye).set(10, 5, eye);
      g.set(9, 6, "#e07f8a");
      g.rect(5, 13, 2, 1, furLo).rect(11, 13, 2, 1, furLo);
      const wag = pose === "wag1" ? -1 : pose === "wag0" ? 1 : 0;
      g.set(14, 10 + wag, fur).set(15, 9 + wag, fur);
    } else {
      const step = pose === "walk1" ? 1 : 0;
      g.rrect(2, 5, 13, 6, fur, 2);
      g.rect(4, 9, 9, 2, white);
      g.rrect(12, 1, 7, 6, fur, 1);
      g.rect(15, 4, 4, 3, white);
      g.set(13, 0, furLo).set(17, 0, furLo);
      if (blink) g.rect(15, 3, 2, 1, eye);
      else g.set(16, 3, eye);
      g.set(18, 4, eye);
      g.rect(3 + step, 11, 2, 2, furLo).rect(6 - step, 11, 2, 2, fur);
      g.rect(10 + step, 11, 2, 2, furLo).rect(13 - step, 11, 2, 2, fur);
      g.set(1, 5, fur).set(0, 4, fur);
    }
    g.outline(OUTLINE);
    return facing === "left" ? g.flipped() : g;
  });
}

/** A visiting kid: a smaller chibi built from the same look. */
const kidCache = new SpriteCache();
export const KID_W = 14;
export const KID_H = 20;

export function kidSprite(look: Look, frame: number, facing: "front" | "left" | "right"): HTMLCanvasElement {
  return kidCache.get(`${look.key}|${frame}|${facing}`, () => {
    const g = new Grid(KID_W, KID_H);
    const lift = frame % 2;
    // head
    g.rrect(2, 1, 10, 8, look.skin, 2);
    g.rrect(2, 0, 10, 4, look.hair, 2);
    g.rect(2, 3, 2, 2, look.hair).rect(10, 3, 2, 2, look.hair);
    const shift = facing === "front" ? 0 : 1;
    g.set(4 + shift, 5, OUTLINE).set(8 + shift, 5, OUTLINE);
    g.set(3 + shift, 7, "#f29a9a").set(9 + shift, 7, "#f29a9a");
    // body
    g.rect(4, 9, 6, 5, look.accent);
    g.rect(3, 10, 1, 3, look.accent).rect(10, 10, 1, 3, look.accent);
    g.set(3, 13, look.skin).set(10, 13, look.skin);
    // legs
    g.rect(4, 14, 2, 3 - lift, look.pants).rect(8, 14, 2, 3 - (1 - lift), look.pants);
    g.rect(4, 17 - lift, 2, 1, "#3b2b2b").rect(8, 16 + lift, 2, 1, "#3b2b2b");
    g.outline(OUTLINE);
    return facing === "left" ? g.flipped() : g;
  });
}
